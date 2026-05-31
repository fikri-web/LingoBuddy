import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_VOCAB } from "@/lib/vocab-db";

export async function POST(req: NextRequest) {
  let language = "English";
  let words: any[] = [];
  try {
    const body = await req.json();
    language = body.language || "English";
    const inputWords = body.words || [];
    const { displayMode, percentage } = body;

    if (!language) {
      return NextResponse.json(
        { error: "Parameter language diperlukan." },
        { status: 400 }
      );
    }

    // Dynamic robust fallback if words is empty or not an array
    if (!Array.isArray(inputWords) || inputWords.length === 0) {
      words = DEFAULT_VOCAB.filter((v) => v.language === language).slice(0, 5);
    } else {
      words = inputWords;
    }

    if (words.length === 0) {
      // Complete backup fallback in case language selection has no defaults
      words = DEFAULT_VOCAB.filter((v) => v.language === "English").slice(0, 5);
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback if API key is not configured or placeholder
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return NextResponse.json({
        isFallback: true,
        data: getLocalFallbackStory(language, words),
        message: "Menggunakan generator simulasi lokal karena kunci API Gemini belum dikonfigurasi.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const wordsDetailsStr = words
      .map((w: any) => `- ID: "${w.id}", Target Language: "${w.target}", Indonesian: "${w.indo}", Category: "${w.category}"${w.script ? `, Script: "${w.script}"` : ""}`)
      .join("\n");

    const prompt = `
Kamu adalah LingoBuddy, asisten pengajar bahasa asing yang ceria dan playful untuk anak-anak dan pemula.
Buatlah sebuah cerita pendek fiksi kreatif di dalam bahasa Indonesia dengan menyisipkan kosakata dwi-bahasa secara natural (woven).
Kamu harus menggunakan daftar kata berikut:
${wordsDetailsStr}

Format cerita harus interaktif. Cerita harus ditulis dalam bentuk beralur menarik (maksimal 3-4 paragraf kecil).
Hasil akhir harus berupa serangkaian segmen berurutan ('segments') agar pembaca dapat membaca satu cerita utuh dalam Bahasa Indonesia namun kata-kata kunci di atas ditenun ke dalam bahasa target ${language} atau bahasa Indonesia tergantung pengaturan bahasa.

Berikan respons dalam format JSON dengan struktur yang tepat seperti didefinisikan dalam schema.

Kriteria cerita:
1. "title": Judul certia ceria dan lucu dalam Bahasa Indonesia.
2. "segments": Daftar segmen berurutan yang jika digabungkan akan membentuk seluruh isi cerita.
   Setiap segmen HARUS memiliki salah satu dari dua format berikut:
   a. Segmen teks biasa: Cukup berisi properti "text" (misal: { "text": "Pada sore hari yang indah, " }).
   b. Segmen kosakata target: Berisi properti "wordId" yang diisi dengan ID dari kosakata aslinya, serta "target", "script", "indo", dan "explanation". Isikan kata bahasa target di properti "target" (misal: "Neko").
3. "fullIndoStory": Paragraf cerita utuh yang ditulis murni dalam Bahasa Indonesia (tanpa any target words) untuk rujukan santai pembaca.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Kamu adalah asisten pengajar bahasa asing LingoBuddy yang gemar bercerita kreatif dengan membagi cerita ke dalam segmen-segmen narasi teka-teki bahasa.",
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "segments", "fullIndoStory"],
          properties: {
            title: {
              type: Type.STRING,
              description: "Judul cerita yang unik dan ceria.",
            },
            fullIndoStory: {
              type: Type.STRING,
              description: "Cerita lengkap murni dalam Bahasa Indonesia saja sebagai rujukan.",
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: {
                    type: Type.STRING,
                    description: "Teks cerita biasa dalam Bahasa Indonesia.",
                  },
                  wordId: {
                    type: Type.STRING,
                    description: "Id dari kata kosakata yang sesuai (isikan persis ID dari kata masukan, e.g. 'en-1', 'ja-2', dsb).",
                  },
                  target: {
                    type: Type.STRING,
                    description: "Kata target (e.g., 'Cat', 'Neko').",
                  },
                  script: {
                    type: Type.STRING,
                    description: "Aksara asli jika ada (e.g., '猫' untuk Jepang/Korea).",
                  },
                  indo: {
                    type: Type.STRING,
                    description: "Arti kata dalam Bahasa Indonesia.",
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Tips menghafal ceria bersahabat khas LingoBuddy untuk kata ini.",
                  }
                }
              },
              description: "Daftar segmen berurutan untuk membentuk satu narasi utuh bumbu jembatan keledai.",
            }
          }
        },
      },
    });

    const contentText = response.text;
    if (!contentText) {
      throw new Error("Respons kosong dari model Gemini.");
    }

    const parsedData = JSON.parse(contentText.trim());
    return NextResponse.json({
      isFallback: false,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Kesalahan pembuatan cerita Gemini API:", error);
    // Graceful fallback simulation so user keeps experiencing polished UI
    return NextResponse.json({
      isFallback: true,
      data: getLocalFallbackStory(language || "English", words || []),
      message: "Terjadi gangguan koneksi. Mengaktifkan cerita simulasi interaktif.",
    });
  }
}

function getLocalFallbackStory(language: string, words: any[]) {
  const segments: any[] = [];
  segments.push({
    text: `Wah, LingoBuddy sedang beruntung sekali hari ini! Saat menyusuri jalanan yang indah, ia melihat sekelilingnya penuh warna baru. Pertama-tama ia melihat `
  });

  const listWords = words.length > 0 ? words : [
    { id: "demo-1", target: "Neko", script: "猫", indo: "Kucing" },
    { id: "demo-2", target: "Pan", script: "パン", indo: "Roti" }
  ];

  listWords.forEach((w, idx) => {
    segments.push({
      wordId: w.id || `fallback-${idx}`,
      target: w.target,
      script: w.script,
      indo: w.indo,
      explanation: `Cara asyik menghafal "${w.target}": "${w.indo}" adalah kata yang sangat penting untuk obrolan sehari-hari!`
    });
    
    if (idx < listWords.length - 1) {
      segments.push({ text: ` serta menemani piring berisi ` });
    }
  });

  segments.push({
    text: `. Kisah seru ini mengajarkan kita bahwa kata-kata baru itu sangat asyik untuk dihafalkan bersama teman-teman!`
  });

  const fullIndo = `Wah, LingoBuddy sedang beruntung sekali hari ini! Saat menyusuri jalanan yang indah, ia melihat sekelilingnya penuh warna baru. Pertama-tama ia melihat ` +
    listWords.map(w => w.indo).join(" serta menemani piring berisi ") +
    `. Kisah seru ini mengajarkan kita bahwa kata-kata baru itu sangat asyik untuk dihafalkan bersama teman-teman!`;

  return {
    title: `Petualangan Istimewa LingoBuddy ${language} ✨`,
    segments,
    fullIndoStory: fullIndo
  };
}
