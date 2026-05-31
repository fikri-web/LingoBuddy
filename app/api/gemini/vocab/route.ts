import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let text = "";
  let targetLanguage = "Japanese";
  try {
    const body = await req.json();
    text = body.text || "";
    targetLanguage = body.targetLanguage || "Japanese";

    if (!text || !text.trim() || !targetLanguage) {
      return NextResponse.json(
        { error: "Parameter 'text' dan 'targetLanguage' diperlukan." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Check if API key is not configured or placeholder
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return NextResponse.json({
        isFallback: true,
        data: getLocalFallbackVocab(text, targetLanguage),
        message: "Menggunakan deteksi kata simulasi karena API Key Gemini belum diatur.",
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

    const prompt = `
Temukan kata/konsep utama dari masukan pengguna berkut: "${text}".
Deteksi bahasa asal masukan tersebut secara otomatis.
Terjemahkan konsep kata tersebut ke dalam bahasa target: "${targetLanguage}".

Hasilkan detail kosakata lengkap dalam format JSON yang sesuai dengan skema:
1. "target": Terjemahan dalam bahasa target dalam bentuk Latin/Romaji (misal untuk Jepang: "Usagi", Spanyol: "Conejo", Korea: "Tokki").
2. "script": Untuk Bahasa Jepang (gunakan Kanji/Kana jika ada, e.g. "兎 / うさぎ") atau Bahasa Korea (gunakan Hangul, e.g. "토끼"). Untuk bahasa berhuruf Latin lainnya (Inggris, Spanyol, Prancis), kosongkan atau hilangkan properti ini.
3. "indo": Arti bahasa target tersebut dalam Bahasa Indonesia (misal: "Kelinci").
4. "category": Harus berupa tepat salah satu dari 4 kategori berikut: "Hewan", "Makanan", "Perasaan", or "Sehari-hari". Pilih kategori paling cocok dengan kata tersebut.
5. "explanation": Penjelasan singkat, lucu, bersahabat, bergaya LingoBuddy tentang bagaimana mengingat kata tersebut dalam bahasa target, ditulis sepenuhnya dalam Bahasa Indonesia.

Pastikan data mematuhi skema JSON yang didefinisikan secara ketat.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Kamu adalah asisten pengajar bahasa LingoBuddy yang jenius mengolah kata, menerjemahkan bahasa secara otomatis, dan memberikan tips jembatan keledai (mnemonic) yang lucu dan ceria.",
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["target", "indo", "category", "explanation"],
          properties: {
            target: {
              type: Type.STRING,
              description: "Kata terjemahan utama dalam ejaan Latin (e.g. 'Neko' atau 'Gato').",
            },
            script: {
              type: Type.STRING,
              description: "Aksara asli (Kanji/Kana atau Hangul) untuk bahasa Jepang/Korea saja.",
            },
            indo: {
              type: Type.STRING,
              description: "Artinya dalam ejaan Bahasa Indonesia.",
            },
            category: {
              type: Type.STRING,
              description: "Kategori kata wajib salah satu dari: Hewan, Makanan, Perasaan, Sehari-hari.",
            },
            explanation: {
              type: Type.STRING,
              description: "Tips menghafal ceria bersahabat dalam Bahasa Indonesia.",
            },
          },
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
    console.error("Kesalahan pembuatan kosa kata otomatis Gemini API:", error);
    // Graceful fallback values for user in case of rate limits or service down to keep UI super smooth!
    return NextResponse.json({
      isFallback: true,
      data: getLocalFallbackVocab(text || "Halo", targetLanguage || "Japanese"),
      message: "Terjadi kesalahan. Mengalihkan ke generator kata simulasi.",
    });
  }
}

// Simple fallback translation mock database to guarantee a functioning offline experience
function getLocalFallbackVocab(text: string, targetLanguage: string) {
  const norm = text.toLowerCase().trim();
  
  // Default values
  let target = "Ami";
  let script = undefined;
  let indo = text;
  let category: "Hewan" | "Makanan" | "Perasaan" | "Sehari-hari" = "Sehari-hari";
  let explanation = `Menambahkan kata "${text}" yang asyik ke kamus belajarmu!`;

  if (norm.includes("kelinci")) {
    category = "Hewan";
    indo = "Kelinci";
    if (targetLanguage === "Japanese") {
      target = "Usagi";
      script = "兎 / うさぎ";
      explanation = "Kelinci lompat lucu, usagi melompat tinggi!";
    } else if (targetLanguage === "English") {
      target = "Rabbit";
      explanation = "Kelinci berlari kencang bagai rabbit yang lincah!";
    } else if (targetLanguage === "Korean") {
      target = "Tokki";
      script = "토끼";
      explanation = "Tokki adalah kelinci dalam drama-drama Korea!";
    } else if (targetLanguage === "Spanish") {
      target = "Conejo";
      explanation = "Conejo adalah kelinci berambut cokelat di Spanyol!";
    } else if (targetLanguage === "French") {
      target = "Lapin";
      explanation = "Kelinci mewah ala Prancis dipanggil lapin!";
    }
  } else if (norm.includes("kucing") || norm.includes("cat")) {
    category = "Hewan";
    indo = "Kucing";
    if (targetLanguage === "Japanese") {
      target = "Neko";
      script = "猫";
      explanation = "Kucing di kuil Jepang mengeong Neko-Neko!";
    } else if (targetLanguage === "English") {
      target = "Cat";
      explanation = "Kucing kesayangan mengeong halus Meow-Cat!";
    } else if (targetLanguage === "Korean") {
      target = "Goyangi";
      script = "고양이";
      explanation = "Goyangi bergoyang ekornya saat dielus manja!";
    } else {
      target = "Gato";
      explanation = "Si meong berjemur di atap rumah dipanggil gato!";
    }
  } else if (norm.includes("roti") || norm.includes("bread") || norm.includes("pan")) {
    category = "Makanan";
    indo = "Roti";
    if (targetLanguage === "Japanese") {
      target = "Pan";
      script = "パン";
      explanation = "Ingat pan dari wajan pemanggang roti enak!";
    } else if (targetLanguage === "English") {
      target = "Bread";
      explanation = "Oleskan mentega di atas hangatnya selembar bread!";
    } else if (targetLanguage === "Korean") {
      target = "Ppan";
      script = "빵";
      explanation = "Ppan disemburkan aroma ragi hangat penuh gairah!";
    } else {
      target = "Pan";
      explanation = "Pan panggang wangi lezat dinikmati dengan teh!";
    }
  } else if (norm.includes("lapar") || norm.includes(" hungry")) {
    category = "Perasaan";
    indo = "Lapar";
    if (targetLanguage === "Japanese") {
      target = "Onaka ga suita";
      script = "お腹が空いた";
      explanation = "Perut berbunyi krucuk-krucuk tanda onaka ga suita!";
    } else if (targetLanguage === "English") {
      target = "Hungry";
      explanation = "Ayo makan besar saat cacing perut berteriak hungry!";
    } else if (targetLanguage === "Korean") {
      target = "Baegopa";
      script = "배고파";
      explanation = "Oppa, baegopa! Aku lapar butuh tteokbokki hangat sekarang!";
    } else {
      target = "Hambre";
      explanation = "Hambre beraroma cita rasa masakan Spanyol!";
    }
  } else {
    // General fallback generator
    indo = text.charAt(0).toUpperCase() + text.slice(1);
    
    // Create fictional or simple translated lookalikes
    if (targetLanguage === "Japanese") {
      target = norm.replace(/[aiueo]/g, '$&k') + "o";
      target = target.charAt(0).toUpperCase() + target.slice(1);
      script = "単語";
      explanation = `Kata "${indo}" dalam Bahasa Jepang terdengar seperti ${target}. Sungguh anggung!`;
    } else if (targetLanguage === "English") {
      target = norm + "-ly";
      target = target.charAt(0).toUpperCase() + target.slice(1);
      explanation = `Belajar kata "${indo}" dalam Bahasa Inggris memberi warna baru untukmu!`;
    } else if (targetLanguage === "Korean") {
      target = norm.replace(/[aiueo]/g, 'u') + "yeo";
      target = target.charAt(0).toUpperCase() + target.slice(1);
      script = "단어";
      explanation = `Aksen lucu Korea untuk "${indo}" terdengar berkilau bagai ${target}!`;
    } else {
      target = norm + "o";
      target = target.charAt(0).toUpperCase() + target.slice(1);
      explanation = `Terdengar sangat indah dalam bahasa ${targetLanguage}!`;
    }
  }

  return {
    target,
    script,
    indo,
    category,
    explanation,
  };
}
