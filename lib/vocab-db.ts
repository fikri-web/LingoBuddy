export interface VocabItem {
  id: string;
  language: string; // "English", "Japanese", "Korean", "Spanish", "French"
  category: "Hewan" | "Makanan" | "Perasaan" | "Sehari-hari";
  target: string;   // target word (e.g., "Neko")
  script?: string;  // original script if applicable (e.g., "猫")
  indo: string;     // Indonesian translation (e.g., "Kucing")
  explanation: string; // memory tip / explanation
}

export interface StorySegment {
  text?: string;
  wordId?: string;
  target?: string;
  script?: string;
  indo?: string;
  explanation?: string;
}

export const DEFAULT_VOCAB: VocabItem[] = [
  // --- ENGLISH (12 words) ---
  { id: "en-1", language: "English", category: "Hewan", target: "Cat", indo: "Kucing", explanation: "Kucing lucu mendengkur manis." },
  { id: "en-2", language: "English", category: "Hewan", target: "Dog", indo: "Anjing", explanation: "Anjing setia penjaga setia." },
  { id: "en-3", language: "English", category: "Hewan", target: "Lion", indo: "Singa", explanation: "Raja rimba berambut tebal." },
  { id: "en-4", language: "English", category: "Makanan", target: "Bread", indo: "Roti", explanation: "Roti panggang harum mengembang." },
  { id: "en-5", language: "English", category: "Makanan", target: "Cheese", indo: "Keju", explanation: "Keju gurih padat dari susu asli." },
  { id: "en-6", language: "English", category: "Makanan", target: "Apple", indo: "Apel", explanation: "Apel merah berair manis manis." },
  { id: "en-7", language: "English", category: "Perasaan", target: "Happy", indo: "Bahagia", explanation: "Rasa gembira tulus riang." },
  { id: "en-8", language: "English", category: "Perasaan", target: "Sad", indo: "Sedih", explanation: "Perasaan murung butuh dihibur." },
  { id: "en-9", language: "English", category: "Perasaan", target: "Angry", indo: "Marah", explanation: "Api emosi yang meluap menggebu." },
  { id: "en-10", language: "English", category: "Sehari-hari", target: "House", indo: "Rumah", explanation: "Tempat pulang berkumpul keluarga hangat." },
  { id: "en-11", language: "English", category: "Sehari-hari", target: "Key", indo: "Kunci", explanation: "Kunci kecil untuk membuka gembok pintu." },
  { id: "en-12", language: "English", category: "Sehari-hari", target: "Table", indo: "Meja", explanation: "Meja datar berkaki penyangga kuat." },

  // --- JAPANESE (12 words) ---
  { id: "ja-1", language: "Japanese", category: "Hewan", target: "Neko", script: "猫", indo: "Kucing", explanation: "Kucing manis hobi mengeong malas." },
  { id: "ja-2", language: "Japanese", category: "Hewan", target: "Inu", script: "犬", indo: "Anjing", explanation: "Anjing peliharaan yang penyayang." },
  { id: "ja-3", language: "Japanese", category: "Hewan", target: "Raion", script: "ライオン", indo: "Singa", explanation: "Singa liar tangguh penguasa wilayah." },
  { id: "ja-4", language: "Japanese", category: "Makanan", target: "Pan", script: "パン", indo: "Roti", explanation: "Roti bakar prancis yang empuk sekali." },
  { id: "ja-5", language: "Japanese", category: "Makanan", target: "Chizu", script: "チーズ", indo: "Keju", explanation: "Keju lezat asin di atas pizza." },
  { id: "ja-6", language: "Japanese", category: "Makanan", target: "Ringo", script: "リンゴ", indo: "Apel", explanation: "Buah apel renyah merah alami." },
  { id: "ja-7", language: "Japanese", category: "Perasaan", target: "Ureshii", script: "嬉しい", indo: "Bahagia", explanation: "Bahagia riang mendapatkan kejutan." },
  { id: "ja-8", language: "Japanese", category: "Perasaan", target: "Kanashii", script: "悲しい", indo: "Sedih", explanation: "Sedih meneteskan secangkir air mata duka." },
  { id: "ja-9", language: "Japanese", category: "Perasaan", target: "Okoru", script: "怒る", indo: "Marah", explanation: "Marah dengan mata melotot merah kesal." },
  { id: "ja-10", language: "Japanese", category: "Sehari-hari", target: "Ie", script: "家", indo: "Rumah", explanation: "Rumah tinggal yang tenang beratap kayu." },
  { id: "ja-11", language: "Japanese", category: "Sehari-hari", target: "Kagi", script: "鍵", indo: "Kunci", explanation: "Kunci pemutar silinder gembok baja." },
  { id: "ja-12", language: "Japanese", category: "Sehari-hari", target: "Teburu", script: "テーブル", indo: "Meja", explanation: "Meja bundar tempat meminum teh ocha." },

  // --- KOREAN (12 words) ---
  { id: "ko-1", language: "Korean", category: "Hewan", target: "Goyangi", script: "고양이", indo: "Kucing", explanation: "Kucing hias gemulai hobi bermanja." },
  { id: "ko-2", language: "Korean", category: "Hewan", target: "Gae", script: "개", indo: "Anjing", explanation: "Anjing bulu bersisir rapi." },
  { id: "ko-3", language: "Korean", category: "Hewan", target: "Saja", script: "사자", indo: "Singa", explanation: "Singa berlari mengejar mangsanya." },
  { id: "ko-4", language: "Korean", category: "Makanan", target: "Ppan", script: "빵", indo: "Roti", explanation: "Roti tawar tebal disantap hangat." },
  { id: "ko-5", language: "Korean", category: "Makanan", target: "Chijeu", script: "치즈", indo: "Keju", explanation: "Keju mulur gurih di atas tteokbokki." },
  { id: "ko-6", language: "Korean", category: "Makanan", target: "Sagwa", script: "사과", indo: "Apel", explanation: "Apel fuji wangi yang sangat manis." },
  { id: "ko-7", language: "Korean", category: "Perasaan", target: "Haengbok", script: "행복", indo: "Bahagia", explanation: "Kebahagiaan mendalam penuh tawa riang." },
  { id: "ko-8", language: "Korean", category: "Perasaan", target: "Seulpeum", script: "슬픔", indo: "Sedih", explanation: "Perasaan sedih berbalut sendu sepi." },
  { id: "ko-9", language: "Korean", category: "Perasaan", target: "Hwanam", script: "화남", indo: "Marah", explanation: "Wajah cemberut dahi mengkerut merah." },
  { id: "ko-10", language: "Korean", category: "Sehari-hari", target: "Jib", script: "집", indo: "Rumah", explanation: "Rumah tinggal tempat berteduh nyaman." },
  { id: "ko-11", language: "Korean", category: "Sehari-hari", target: "Yeolsoe", script: "열쇠", indo: "Kunci", explanation: "Kunci kuno berukir pembuka gerbang." },
  { id: "ko-12", language: "Korean", category: "Sehari-hari", target: "Taksja", script: "탁자", indo: "Meja", explanation: "Meja belajar sederhana di kamar tidur." },

  // --- SPANISH (12 words) ---
  { id: "es-1", language: "Spanish", category: "Hewan", target: "Gato", indo: "Kucing", explanation: "Kucing lincah mengejar bola benang." },
  { id: "es-2", language: "Spanish", category: "Hewan", target: "Perro", indo: "Anjing", explanation: "Anjing setia menjaga kebun halaman." },
  { id: "es-3", language: "Spanish", category: "Hewan", target: "León", indo: "Singa", explanation: "Singa jantan mengaum keras tangguh." },
  { id: "es-4", language: "Spanish", category: "Makanan", target: "Pan", indo: "Roti", explanation: "Roti panggang bundar lembut mengembang." },
  { id: "es-5", language: "Spanish", category: "Makanan", target: "Queso", indo: "Keju", explanation: "Keju lembaran gurih bumbu sandwich." },
  { id: "es-6", language: "Spanish", category: "Makanan", target: "Manzana", indo: "Apel", explanation: "Apel hijau manis asam penambah energi." },
  { id: "es-7", language: "Spanish", category: "Perasaan", target: "Feliz", indo: "Bahagia", explanation: "Bahagia melompat-lompat menari flamenco." },
  { id: "es-8", language: "Spanish", category: "Perasaan", target: "Triste", indo: "Sedih", explanation: "Sedih kehilangan mainan balon warna biru." },
  { id: "es-9", language: "Spanish", category: "Perasaan", target: "Enojado", indo: "Marah", explanation: "Marah melipat tangan dengan muka cemberut." },
  { id: "es-10", language: "Spanish", category: "Sehari-hari", target: "Casa", indo: "Rumah", explanation: "My casa es tu casa (Rumahku adalah rumahmu)." },
  { id: "es-11", language: "Spanish", category: "Sehari-hari", target: "Llave", indo: "Kunci", explanation: "Kunci pemutar gerbang garasi perkakas." },
  { id: "es-12", language: "Spanish", category: "Sehari-hari", target: "Mesa", indo: "Meja", explanation: "Meja besar kayu jati cokelat klasik." },

  // --- FRENCH (12 words) ---
  { id: "fr-1", language: "French", category: "Hewan", target: "Chat", indo: "Kucing", explanation: "Kucing anggun berbulu lebat abu-abu." },
  { id: "fr-2", language: "French", category: "Hewan", target: "Chien", indo: "Anjing", explanation: "Anjing pudel ceria penyayang anak kecil." },
  { id: "fr-3", language: "French", category: "Hewan", target: "Lion", indo: "Singa", explanation: "Singa berambut emas bertenaga perkasa." },
  { id: "fr-4", language: "French", category: "Makanan", target: "Pain", indo: "Roti", explanation: "Baguette prancis renyah luar lembut dalam." },
  { id: "fr-5", language: "French", category: "Makanan", target: "Fromage", indo: "Keju", explanation: "Remahan keju brie lembut khas kastia." },
  { id: "fr-6", language: "French", category: "Makanan", target: "Pomme", indo: "Apel", explanation: "Apel fuji ranum berkulit licin." },
  { id: "fr-7", language: "French", category: "Perasaan", target: "Heureux", indo: "Bahagia", explanation: "Bahagia tersenyum manis melihat indahnya kota Paris." },
  { id: "fr-8", language: "French", category: "Perasaan", target: "Triste", indo: "Sedih", explanation: "Sedih karena liburan berakhir telalu cepat." },
  { id: "fr-9", language: "French", category: "Perasaan", target: "En colère", indo: "Marah", explanation: "Marah membentak dengan intonasi tinggi." },
  { id: "fr-10", language: "French", category: "Sehari-hari", target: "Maison", indo: "Rumah", explanation: "Maison ku yang bersinar teduh asri." },
  { id: "fr-11", language: "French", category: "Sehari-hari", target: "Clé", indo: "Kunci", explanation: "Clé kecil pembuka kotak rasi bintang." },
  { id: "fr-12", language: "French", category: "Sehari-hari", target: "Table", indo: "Meja", explanation: "Table bundar berhias lilin menyala indah." }
];

export const LOCAL_STORIES: Record<string, StorySegment[]> = {
  English: [
    { text: "Di sebuah " },
    { wordId: "en-10", target: "House", indo: "rumah", explanation: "Rumah tinggal yang hangat" },
    { text: " pinggir taman, hiduplah seekor " },
    { wordId: "en-1", target: "Cat", indo: "kucing", explanation: "Kucing manja bermata bulat" },
    { text: " bernama Leo. Ia sedang melompat malas di atas " },
    { wordId: "en-12", target: "Table", indo: "meja", explanation: "Meja kayu berkaki kokoh" },
    { text: " dekat jendela kaca. Leo sangat menyukai harum " },
    { wordId: "en-4", target: "Bread", indo: "roti", explanation: "Roti tawar panggang mentega" },
    { text: " dan taburan parutan " },
    { wordId: "en-5", target: "Cheese", indo: "keju", explanation: "Keju cheddar kuning harum" },
    { text: ". Setiap kali mendapatkan cemilan itu, si kucing merasa sangat " },
    { wordId: "en-7", target: "Happy", indo: "bahagia", explanation: "Perasaan gembira riang" },
    { text: " sepanjang hari!" }
  ],
  Japanese: [
    { text: "Di sebuah " },
    { wordId: "ja-10", target: "Ie", script: "家", indo: "rumah", explanation: "Rumah tinggal beratap merah" },
    { text: " pedesaan Kyoto yang asri, ada seekor " },
    { wordId: "ja-1", target: "Neko", script: "猫", indo: "kucing", explanation: "Kucing belang berbulu lebat" },
    { text: " yang gemar bersembunyi di kolong " },
    { wordId: "ja-12", target: "Teburu", script: "テーブル", indo: "meja", explanation: "Meja kayu ruang tamu" },
    { text: ". Pemiliknya selalu meletakkan seiris " },
    { wordId: "ja-4", target: "Pan", script: "パン", indo: "roti", explanation: "Roti panggang jepang lezat" },
    { text: " hangat bertabur cokelat dan " },
    { wordId: "ja-5", target: "Chizu", script: "チーズ", indo: "keju", explanation: "Keju leleh yang asin gurih" },
    { text: " di sisinya. Neko imut itu pun terlihat luar biasa " },
    { wordId: "ja-7", target: "Ureshii", script: "嬉しい", indo: "bahagia", explanation: "Ekspresi gembira mendalam" },
    { text: " sambil mendengkur ramah." }
  ],
  Korean: [
    { text: "Mari kunjungi sebuah " },
    { wordId: "ko-10", target: "Jib", script: "집", indo: "rumah", explanation: "Rumah peneduh impian hangat" },
    { text: " bergaya tradisional Hanok. Di sana, seekor " },
    { wordId: "ko-1", target: "Goyangi", script: "고양이", indo: "kucing", explanation: "Kucing berpita sutra" },
    { text: " putih pemalas kerap tertidur pulas menghadap " },
    { wordId: "ko-12", target: "Taksja", script: "탁자", indo: "meja", explanation: "Meja tulis kayu cokelat" },
    { text: " makan. Saat sore hari, ia gemar mencuri gigitan kecil " },
    { wordId: "ko-4", target: "Ppan", script: "빵", indo: "roti", explanation: "Roti tawar lembut kaya susu" },
    { text: " sereal gandum bertaburkan potongan " },
    { wordId: "ko-5", target: "Chijeu", script: "치즈", indo: "keju", explanation: "Keju mozarella mulur gurih" },
    { text: ". Goyangi manis pun bernyanyi bersenandung penuh " },
    { wordId: "ko-7", target: "Haengbok", script: "행복", indo: "bahagia", explanation: "Perasaan bersyukur tiada tara" },
    { text: " menyambut senja." }
  ],
  Spanish: [
    { text: "Enak sekali bersantai di dalam " },
    { wordId: "es-10", target: "Casa", indo: "rumah", explanation: "Rumah teduh bergaya Spanyol" },
    { text: " pedesaan Andalusia. Di sana, seekor " },
    { wordId: "es-1", target: "Gato", indo: "kucing", explanation: "Kucing hitam yang sangat gesit" },
    { text: " suka bermain-main naik ke atas " },
    { wordId: "es-12", target: "Mesa", indo: "meja", explanation: "Meja kayu bulat tempat bersenda gurau" },
    { text: ". Ibuku kerap menaruh piring berisi " },
    { wordId: "es-4", target: "Pan", indo: "roti", explanation: "Roti khas pedesaan beraroma gandum" },
    { text: " dipanggang bersama parutan lezat " },
    { wordId: "es-5", target: "Queso", indo: "keju", explanation: "Keju kambing gurih pelengkap" },
    { text: ". Kami semua senantiasa merasa teramat " },
    { wordId: "es-7", target: "Feliz", indo: "bahagia", explanation: "Rasa gembira berkecamuk ceria" },
    { text: " menghabiskan waktu bersama." }
  ],
  French: [
    { text: "Cerita hari ini bermula di sebuah " },
    { wordId: "fr-10", target: "Maison", indo: "rumah", explanation: "Maison tinggal yang asri berpintu kaca" },
    { text: " di kota Paris yang romantis. Ada seekor " },
    { wordId: "fr-1", target: "Chat", indo: "kucing", explanation: "Kucing bermata biru pualam" },
    { text: " anggun yang sedang bersandar di samping kaki " },
    { wordId: "fr-12", target: "Table", indo: "meja", explanation: "Table rias antik berukir dedaunan" },
    { text: ". Baunya sungguh lezat karena aroma adonan " },
    { wordId: "fr-4", target: "Pain", indo: "roti", explanation: "Baguette prancis ikonik renyah" },
    { text: " hangat dikombinasikan dengan " },
    { wordId: "fr-5", target: "Fromage", indo: "keju", explanation: "Keju brie potong yang begitu nikmat" },
    { text: ". Pertemuan kecil ini menciptakan suasana penuh " },
    { wordId: "fr-7", target: "Heureux", indo: "bahagia", explanation: "Kebahagiaan mendalam penuh kehangatan" },
    { text: " untuk seisi keluarga." }
  ]
};

export const MASCOT_SPEECHES: Record<string, string[]> = {
  English: [
    "You are doing an awesome job today! Let's conquer more foreign words! 🦊",
    "Stay curious! Learning a language is like growing a beautiful hidden garden! 🦊",
    "Wow, look at those vocabulary numbers! You are becoming a true language champion! 🦊"
  ],
  Japanese: [
    "Ganbatte kudasai! (がんばってください - Tetap semangat belajarnya ya!) 🐱",
    "Sugoii! Kemajuanmu sungguh luar biasa hari ini! Keren! (すごい！) 🐱",
    "Kyou mo issho ni ganbarimashou! (今日も一緒にがんばりましょう - Hari ini mari kita bersemangat bersama!) 🐱"
  ],
  Korean: [
    "Haiting! (화이팅! - Semangat ya, kamu pasti bisa!) 🐻",
    "Aju jalhaesseoyo! (아жу 잘했어요! - Pekerjaanmu sungguh luar biasa bagus!) 🐻",
    "Kkeutkkaji pogihaji maseyo! (끝까지 포기하지 마세요 - Jangan menyerah sampai garis akhir ya!) 🐻"
  ],
  Spanish: [
    "¡Excelente trabajo! Sigue así y conquistarás el mundo. 💃",
    "¡Tú puedes hacerlo! Todo logro comienza con la decisión de intentarlo. 💃",
    "¡Maravilloso! Cada palabra nueva es una llave dorada al conocimiento. 💃"
  ],
  French: [
    "Bon travail ! Tu progresses à pas de géant aujourd'hui ! 🥖",
    "Magnifique ! Continue comme ça dan la joie d'apprendre ! 🥖",
    "Tout est possible ! Un mot après l'autre, et te voilà bilingue ! 🥖"
  ]
};
