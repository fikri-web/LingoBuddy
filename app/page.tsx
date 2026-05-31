"use client";

if (typeof window !== "undefined") {
  // 1. Setup early absolute error swallowers at the earliest execution step
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = (message || (error && error.message) || "").toString();
    if (
      msg.includes("fetch of #<Window>") || 
      msg.includes("only a getter") || 
      msg.includes("fetch' of #<Window>") ||
      msg.includes("fetch of '#<Window>'")
    ) {
      return true; // Completely prevent standard browser logging and propagation
    }
  };

  // Swallowing the browser/extension-specific fetch getter/setter uncaught exception
  window.addEventListener("error", (event) => {
    const msg = event.message || (event.error && event.error.message);
    if (msg && (msg.includes("fetch of #<Window>") || msg.includes("only a getter") || msg.includes("fetch' of #<Window>"))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason && event.reason.message;
    if (msg && (msg.includes("fetch of #<Window>") || msg.includes("only a getter") || msg.includes("fetch' of #<Window>"))) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // 2. Best-effort patch of window.fetch to support extension/client code that attempts to set it
  try {
    const originalFetch = window.fetch;
    let currentFetch = originalFetch;

    // Delete existing properties first to clear any own-property read-only locks if configurable
    try {
      delete (window as any).fetch;
    } catch (e) {}
    try {
      delete (Window.prototype as any).fetch;
    } catch (e) {}
    try {
      delete (self as any).fetch;
    } catch (e) {}

    // Define on Window.prototype first as fallback if window itself blocks modification
    try {
      Object.defineProperty(Window.prototype, "fetch", {
        configurable: true,
        enumerable: true,
        get() {
          return currentFetch;
        },
        set(value) {
          currentFetch = value;
        }
      });
    } catch (e) {}

    // Try defining directly on window
    try {
      Object.defineProperty(window, "fetch", {
        configurable: true,
        enumerable: true,
        get() {
          return currentFetch;
        },
        set(value) {
          currentFetch = value;
        }
      });
    } catch (e) {}

    // Try defining on self
    if (typeof self !== "undefined") {
      try {
        Object.defineProperty(self, "fetch", {
          configurable: true,
          enumerable: true,
          get() {
            return currentFetch;
          },
          set(value) {
            currentFetch = value;
          }
        });
      } catch (e) {}
    }
  } catch (err) {
    console.warn("Failed to apply robust fetch patch:", err);
  }
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  Trash,
  BookOpen,
  Award,
  Sparkles,
  RotateCcw,
  Check,
  ChevronRight,
  Flame,
  Globe,
  Info,
  Volume2,
  Languages,
  LayoutGrid,
  Gamepad2,
  Map,
  Trophy,
  Star,
  Compass,
  HelpCircle,
  Target,
  GraduationCap
} from "lucide-react";
import {
  DEFAULT_VOCAB,
  LOCAL_STORIES,
  MASCOT_SPEECHES,
  VocabItem,
  StorySegment
} from "@/lib/vocab-db";

const SCRAMBLE_DATA: Record<string, { indo: string; correct: string[] }[]> = {
  Japanese: [
    { indo: "Kucing ini sangat manis/imut", correct: ["この", "猫は", "とても", "可愛いです"] },
    { indo: "Saya suka makan sushi lezat", correct: ["私は", "美味しい", "寿司を", "食べるのが", "好きです"] },
    { indo: "Selamat pagi, apakah Anda sehat?", correct: ["おはよう", "ございます", "お元気", "ですか"] },
    { indo: "Di mana stasiun kereta?", correct: ["駅は", "どこに", "ありますか"] },
    { indo: "Hari ini cuaca sangat bagus ya", correct: ["今日は", "天気が", "とても", "良いですね"] }
  ],
  Korean: [
    { indo: "Kucing ini sangat lucu/imut", correct: ["이", "고양이는", "정말", "귀엽습니다"] },
    { indo: "Saya suka makan mie ramyeon pedas", correct: ["나는", "매운", "라면을", "먹는", "것을", "좋아합니다"] },
    { indo: "Halo, senang bertemu denganmu", correct: ["안녕하세요", "만나서", "반갑습니다"] },
    { indo: "Dimanakah letak toiletnya?", correct: ["화장실이", "어디에", "있습니까"] },
    { indo: "Hari ini hari yang indah", correct: ["오늘은", "아름다운", "날입니다"] }
  ],
  Arabic: [
    { indo: "Kucing ini sangat cantik", correct: ["هذا", "القط", "جميل", "جداً"] },
    { indo: "Saya suka belajar bahasa Arab", correct: ["أنا", "أحب", "تعلم", "اللغة", "العربية"] },
    { indo: "Selamat pagi, bagaimana kabarmu?", correct: ["صباح", "الخير", "كيف", "حالك"] },
    { indo: "Di mana letak sekolah?", correct: ["أين", "تقع", "المدرسة"] },
    { indo: "Makanan ini sangat lezat sekali", correct: ["هذا", "الطعام", "لذيذ", "للغاية"] }
  ],
  Spanish: [
    { indo: "Kucing ini sangat cantik/imut", correct: ["Este", "gato", "es", "muy", "bonito"] },
    { indo: "Saya suka makan apel merah", correct: ["Me", "gusta", "comer", "manzanas", "rojas"] },
    { indo: "Halo, bagaimana kabar kalian teman-teman?", correct: ["Hola", "cómo", "están", "amigos"] },
    { indo: "Di mana letak perpustakaan?", correct: ["Dónde", "está", "la", "biblioteca"] },
    { indo: "Hari ini cuaca sangat panas sekali", correct: ["Hoy", "hace", "mucho", "calor"] }
  ],
  French: [
    { indo: "Kucing ini sangat manis/imut", correct: ["Ce", "chat", "est", "très", "mignon"] },
    { indo: "Saya suka makan croissant hangat", correct: ["J'aime", "manger", "des", "croissants", "chauds"] },
    { indo: "Halo, selamat pagi semuanya", correct: ["Bonjour", "bonjour", "à", "tous"] },
    { indo: "Di mana stasiun kereta terdekat?", correct: ["Où", "est", "la", "gare", "la", "plus", "proche"] },
    { indo: "Hari ini cuaca luar biasa indah", correct: ["Aujourd'hui", "il", "fait", "très", "beau"] }
  ],
  German: [
    { indo: "Kucing ini sangat lucu", correct: ["Diese", "Katze", "ist", "sehr", "süß"] },
    { indo: "Saya suka minum susu dingin", correct: ["Ich", "trinke", "gerne", "kalte", "Milch"] },
    { indo: "Di mana stasiun terdekat?", correct: ["Wo", "ist", "der", "nächste", "Bahnhof"] },
    { indo: "Hari ini indah sekali", correct: ["Heute", "ist", "es", "sehr", "schön"] }
  ],
  English: [
    { indo: "Kucing ini sangat menggemaskan", correct: ["This", "cat", "is", "extremely", "adorable"] },
    { indo: "Saya senang belajar bahasa asing baru", correct: ["I", "love", "learning", "new", "foreign", "languages"] },
    { indo: "Di mana letak restoran terdekat?", correct: ["Where", "is", "the", "nearest", "restaurant"] },
    { indo: "Hari ini adalah hari tercantik yang cerah", correct: ["Today", "is", "a", "beautiful", "sunny", "day"] }
  ]
};

export default function LingoBuddyPage() {
  // --- STATE SYSTEM ---
  const [activeLang, setActiveLang] = useState<string>("Japanese");
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTabCategory, setActiveTabCategory] = useState<string>("Semua");
  const [displayModes, setDisplayModes] = useState<Record<string, string>>({
    English: "Latin saja",
    Japanese: "Hiragana + Romaji",
    Korean: "Hangul + Arti",
    Spanish: "Latin + Arti",
    French: "Latin + Arti",
  });

  // --- AUTH/USER STATE SYSTEM ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🐱");
  const [authError, setAuthError] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<"stats" | "activities">("stats");

  // Streaks & Badges
  const [streak, setStreak] = useState(1);

  // Coins & Hint System
  const [guestCoins, setGuestCoins] = useState(50);
  const [showAdventureHint, setShowAdventureHint] = useState(false);

  // Form Inputs
  const [inputTarget, setInputTarget] = useState("");
  const [inputScript, setInputScript] = useState("");
  const [inputIndo, setInputIndo] = useState("");
  const [inputCategory, setInputCategory] = useState<"Hewan" | "Makanan" | "Perasaan" | "Sehari-hari">("Hewan");

  // AI Auto Vocab States
  const [vocabInputMode, setVocabInputMode] = useState<"ai" | "manual">("ai");
  const [aiInputText, setAiInputText] = useState("");
  const [isGeneratingVocab, setIsGeneratingVocab] = useState(false);
  const [lastAiGeneratedWord, setLastAiGeneratedWord] = useState<VocabItem | null>(null);

  // Flipped Vocab Cards
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // Bilingual Story & Slider Pelan-pelan
  const [slidePercent, setSlidePercent] = useState<number>(50);
  const [selectedWordPopup, setSelectedWordPopup] = useState<any>(null);
  const [customStory, setCustomStory] = useState<any>(null);
  const [loadingStory, setLoadingStory] = useState(false);

  // Branching Game
  const [gameStep, setGameStep] = useState(0); // 0: Start, 1: Q1, 2: Q2, 3: Q3, 4: Result
  const [gameScore, setGameScore] = useState(0);
  const [gameAnswers, setGameAnswers] = useState<string[]>([]);
  const [currentGameQuestions, setCurrentGameQuestions] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mini-Game Type Selector
  const [activeMiniGame, setActiveMiniGame] = useState<"adventure" | "connect" | "scramble">("adventure");

  // Scramble Sentence Builder Game States
  const [scrambleRound, setScrambleRound] = useState(0); 
  const [scrambleSelected, setScrambleSelected] = useState<string[]>([]);
  const [scramblePool, setScramblePool] = useState<string[]>([]);
  const [scrambleChallenges, setScrambleChallenges] = useState<any[]>([]);
  const [scrambleWin, setScrambleWin] = useState(false);
  const [scrambleWrong, setScrambleWrong] = useState(false);
  const [scrambleScore, setScrambleScore] = useState(0);

  // Connect Matching Word Drag & Drop / Click Game State
  const [connectSources, setConnectSources] = useState<any[]>([]);
  const [connectTargets, setConnectTargets] = useState<any[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [connectedPairs, setConnectedPairs] = useState<string[]>([]); // list of correct word IDs
  const [connectWrongId, setConnectWrongId] = useState<string | null>(null); // for shaking animation on error
  const [draggedSourceId, setDraggedSourceId] = useState<string | null>(null);
  const [connectWin, setConnectWin] = useState(false);
  const [connectScore, setConnectScore] = useState(0);

  // Mascot Speeches
  const [mascotBubble, setMascotBubble] = useState<string | null>(null);

  // Success Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- LOCALSTORAGE & RECOVERY ENGINE ---
  useEffect(() => {
    Promise.resolve().then(() => {
      // 1. Initial Load Database
      const savedVocab = localStorage.getItem("lingobuddy_vocab_v1");
      if (savedVocab) {
        setVocabList(JSON.parse(savedVocab));
      } else {
        setVocabList(DEFAULT_VOCAB);
        localStorage.setItem("lingobuddy_vocab_v1", JSON.stringify(DEFAULT_VOCAB));
      }

      // 2. Daily Streak Calculation
      const savedStreak = localStorage.getItem("lingobuddy_streak_v1");
      const lastActive = localStorage.getItem("lingobuddy_lastactive_v1");
      const todayStr = new Date().toISOString().split("T")[0];

      if (savedStreak) {
        const streakVal = parseInt(savedStreak, 10);
        if (lastActive) {
          if (lastActive === todayStr) {
            setStreak(streakVal);
          } else {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split("T")[0];

            if (lastActive === yesterdayStr) {
              const nextStreak = streakVal + 1;
              setStreak(nextStreak);
              localStorage.setItem("lingobuddy_streak_v1", nextStreak.toString());
            } else {
              setStreak(1);
              localStorage.setItem("lingobuddy_streak_v1", "1");
            }
          }
        }
      } else {
        setStreak(1);
        localStorage.setItem("lingobuddy_streak_v1", "1");
      }
      localStorage.setItem("lingobuddy_lastactive_v1", todayStr);

      // 3. User Session Restore
      const savedSession = localStorage.getItem("lingobuddy_user_session_v1");
      if (savedSession) {
        try {
          setCurrentUser(JSON.parse(savedSession));
        } catch (e) {}
      }
    });
  }, []);

  // --- SOUND EFFECTS (Web Audio API Synthesizer) ---
  const playSFX = useCallback((type: "correct" | "wrong" | "victory" | "click") => {
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, typeOsc: OscillatorType, duration: number, startTime: number, volume: number = 0.2) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = typeOsc;
        osc.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      
      if (type === "correct") {
        playTone(523.25, "triangle", 0.15, now, 0.25); // C5
        playTone(659.25, "triangle", 0.15, now + 0.08, 0.25); // E5
        playTone(783.99, "triangle", 0.25, now + 0.16, 0.25); // G5
        playTone(1046.50, "sine", 0.4, now + 0.24, 0.3); // C6
      } else if (type === "wrong") {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.35);
        
        gainNode.gain.setValueAtTime(0.18, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 0.35);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === "victory") {
        const duration = 0.25;
        playTone(523.25, "triangle", duration, now, 0.18); // C5
        playTone(659.25, "triangle", duration, now + 0.1, 0.18); // E5
        playTone(783.99, "triangle", duration, now + 0.2, 0.18); // G5
        playTone(1046.50, "sine", duration * 2, now + 0.3, 0.25); // C6
        playTone(1318.51, "sine", duration * 3, now + 0.45, 0.3); // E6
      } else if (type === "click") {
        playTone(600, "sine", 0.08, now, 0.12);
      }
    } catch (error) {
      console.warn("AudioContext block/error:", error);
    }
  }, []);

  // --- XP Level Calculator ---
  const getXPLevel = useCallback((xp: number) => {
    if (xp >= 600) return "Ahli Kosakata 👑";
    if (xp >= 300) return "Penjelajah Bahasa 🧭";
    if (xp >= 100) return "Pembelajar Berbakat 🔥";
    return "Pemula 🐣";
  }, []);

  // --- EARN XP FUNCTION WITH ACTIVITY LOGGING & COINS REWARD ---
  const earnXP = useCallback((amount: number, activityDetails?: { type: string; title: string; description: string }, coinReward: number = 0) => {
    if (currentUser) {
      setCurrentUser((prev: any) => {
        if (!prev) return prev;
        const nextXP = prev.xp + amount;
        const prevCoins = prev.coins !== undefined ? prev.coins : 50;
        const nextCoins = prevCoins + coinReward;
        
        let updatedHistory = prev.history || [];
        if (activityDetails) {
          const newAct = {
            id: "act-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
            type: activityDetails.type,
            title: activityDetails.title,
            description: activityDetails.description,
            timestamp: new Date().toLocaleDateString("id-ID") + " " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            xpEarned: amount,
            coinEarned: coinReward
          };
          updatedHistory = [newAct, ...updatedHistory];
        }

        const updatedUser = {
          ...prev,
          xp: nextXP,
          coins: nextCoins,
          history: updatedHistory,
        };

        // Set session
        localStorage.setItem("lingobuddy_user_session_v1", JSON.stringify(updatedUser));

        // Set user db list
        try {
          const savedUsers = localStorage.getItem("lingobuddy_users_list_v1");
          const users = savedUsers ? JSON.parse(savedUsers) : [];
          const index = users.findIndex((u: any) => u.id === prev.id || u.username === prev.username);
          if (index !== -1) {
            users[index] = { ...users[index], xp: nextXP, coins: nextCoins, history: updatedHistory };
            localStorage.setItem("lingobuddy_users_list_v1", JSON.stringify(users));
          }
        } catch (e) {
          console.error("Error storing XP & history in user list:", e);
        }

        if (coinReward > 0) {
          setToastMessage(`Kamu mendapat +${amount} XP ⭐ & +${coinReward} Koin 🪙!`);
        } else {
          setToastMessage(`Kamu mendapat +${amount} XP! ⭐`);
        }
        return updatedUser;
      });
    } else {
      // Guest
      if (coinReward > 0) {
        setGuestCoins((prev) => prev + coinReward);
        setToastMessage(`Kamu mendapat +${amount} XP ⭐ & +${coinReward} Koin 🪙!`);
      } else {
        setToastMessage(`Kamu mendapat +${amount} XP! ⭐`);
      }
    }
  }, [currentUser]);

  // --- AUTH SUBMISSION HANDLERS ---
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    if (!usernameInput.trim()) {
      setAuthError("Nama Panggilan wajib diisi!");
      playSFX("wrong");
      return;
    }
    if (!emailInput.trim() || !emailInput.includes("@")) {
      setAuthError("Email tidak valid!");
      playSFX("wrong");
      return;
    }
    if (passwordInput.length < 4) {
      setAuthError("Password minimal 4 karakter!");
      playSFX("wrong");
      return;
    }

    try {
      const savedUsersStr = localStorage.getItem("lingobuddy_users_list_v1");
      const usersList = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      
      const checkDup = usersList.find(
        (u: any) => u.email.toLowerCase() === emailInput.trim().toLowerCase() ||
                    u.username.toLowerCase() === usernameInput.trim().toLowerCase()
      );
      if (checkDup) {
        setAuthError("Nama panggilan atau email sudah terdaftar!");
        playSFX("wrong");
        return;
      }

      const newUser = {
        id: "user-" + Date.now(),
        username: usernameInput.trim(),
        email: emailInput.trim().toLowerCase(),
        password: passwordInput,
        avatar: selectedAvatar,
        xp: 0,
        coins: 50,
        createdAt: new Date().toLocaleDateString("id-ID"),
        streak: streak
      };

      const updatedUsersList = [...usersList, newUser];
      localStorage.setItem("lingobuddy_users_list_v1", JSON.stringify(updatedUsersList));
      localStorage.setItem("lingobuddy_user_session_v1", JSON.stringify(newUser));
      
      setCurrentUser(newUser);
      setShowAuthModal(false);
      
      // Clear inputs
      setUsernameInput("");
      setEmailInput("");
      setPasswordInput("");
      
      playSFX("victory");
      setToastMessage(`Selamat mendaftar, ${newUser.username}! 🎉`);
    } catch (err) {
      setAuthError("Gagal mendaftar akun. Coba beberapa saat lagi.");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!emailInput.trim()) {
      setAuthError("Email atau Username harus diisi!");
      playSFX("wrong");
      return;
    }
    if (!passwordInput) {
      setAuthError("Password harus diisi!");
      playSFX("wrong");
      return;
    }

    try {
      const savedUsersStr = localStorage.getItem("lingobuddy_users_list_v1");
      const usersList = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      
      const found = usersList.find(
        (u: any) => (u.email.toLowerCase() === emailInput.trim().toLowerCase() || 
                     u.username.toLowerCase() === emailInput.trim().toLowerCase()) &&
                    u.password === passwordInput
      );

      if (!found) {
        setAuthError("Kredensial salah! Periksa email/password.");
        playSFX("wrong");
        return;
      }

      localStorage.setItem("lingobuddy_user_session_v1", JSON.stringify(found));
      setCurrentUser(found);
      setShowAuthModal(false);
      
      // Clear inputs
      setEmailInput("");
      setPasswordInput("");
      
      playSFX("victory");
      setToastMessage(`Selamat datang kembali, ${found.username}! 👋`);
    } catch (err) {
      setAuthError("Terjadi kesalahan sistem login.");
    }
  };

  const handleLogout = () => {
    playSFX("click");
    localStorage.removeItem("lingobuddy_user_session_v1");
    setCurrentUser(null);
    setShowProfileModal(false);
    setToastMessage("Berhasil keluar akun. Sampai jumpa lagi! 👋");
  };

  // Compute Badge dynamically from list count
  const activeCount = vocabList.filter(v => v.language === activeLang).length;
  const badge = currentUser ? getXPLevel(currentUser.xp) : (activeCount <= 5 ? "Pemula 🐣" : activeCount <= 15 ? "Semangat 🔥" : "Hebat! 👑");

  // Support Coins balance
  const coinsCount = currentUser ? (currentUser.coins !== undefined ? currentUser.coins : 50) : guestCoins;

  const spendCoins = useCallback((amount: number) => {
    if (currentUser) {
      const currentCoins = currentUser.coins !== undefined ? currentUser.coins : 50;
      if (currentCoins < amount) {
        setToastMessage("Koin Pintar tidak cukup! 🪙❌");
        playSFX("wrong");
        return false;
      }
      const nextCoins = currentCoins - amount;
      const updatedUser = {
        ...currentUser,
        coins: nextCoins
      };
      setCurrentUser(updatedUser);
      localStorage.setItem("lingobuddy_user_session_v1", JSON.stringify(updatedUser));
      try {
        const savedUsers = localStorage.getItem("lingobuddy_users_list_v1");
        const users = savedUsers ? JSON.parse(savedUsers) : [];
        const index = users.findIndex((u: any) => u.id === currentUser.id || u.username === currentUser.username);
        if (index !== -1) {
          users[index] = { ...users[index], coins: nextCoins };
          localStorage.setItem("lingobuddy_users_list_v1", JSON.stringify(users));
        }
      } catch (e) {
        console.error("Error storing coins in user list:", e);
      }
      playSFX("click");
      return true;
    } else {
      // Guest
      if (guestCoins < amount) {
        setToastMessage("Koin Pintar tidak cukup! 🪙❌");
        playSFX("wrong");
        return false;
      }
      setGuestCoins((prev) => prev - amount);
      playSFX("click");
      return true;
    }
  }, [currentUser, guestCoins, playSFX]);

  // Toast auto-closer
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);


  // Mascot bubble auto-closer
  useEffect(() => {
    if (mascotBubble) {
      const t = setTimeout(() => setMascotBubble(null), 7000);
      return () => clearTimeout(t);
    }
  }, [mascotBubble]);

  // --- GAME CONFETTI EMITTER ---
  useEffect(() => {
    const isVictory = (gameStep === 4 && gameScore === 3) || connectWin || scrambleWin;
    if (isVictory && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = canvas.parentElement?.clientWidth || 500;
      canvas.height = canvas.parentElement?.clientHeight || 400;

      const colors = ["#8B5CF6", "#F472B6", "#FBBF24", "#34D399", "#60A5FA"];
      const particles: any[] = [];

      for (let i = 0; i < 75; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * -120 - 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 6,
          speedX: Math.random() * 4 - 2,
          speedY: Math.random() * 4 + 3,
          rotation: Math.random() * 360,
          rotationSpeed: Math.random() * 6 - 3,
        });
      }

      let animId: number;
      const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;

        particles.forEach((p) => {
          p.x += p.speedX;
          p.y += p.speedY;
          p.rotation += p.rotationSpeed;

          if (p.y < canvas.height) {
            active = true;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });

        if (active) {
          animId = requestAnimationFrame(tick);
        }
      };

      tick();
      return () => cancelAnimationFrame(animId);
    }
  }, [gameStep, gameScore, connectWin, scrambleWin]);

  // --- INTERACTION HELPER FUNCTIONS ---
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  const changeDisplayMode = (lang: string, mode: string) => {
    setDisplayModes(prev => ({ ...prev, [lang]: mode }));
    triggerToast(`Tampilan ${lang} diubah ke "${mode}"`);
  };

  const handleAutoGenerateVocab = async () => {
    if (!aiInputText.trim()) {
      triggerToast("Mohon masukkan kata atau frasa terlebih dahulu!");
      return;
    }
    setIsGeneratingVocab(true);
    setLastAiGeneratedWord(null);

    try {
      const response = await fetch("/api/gemini/vocab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: aiInputText.trim(),
          targetLanguage: activeLang,
        }),
      });

      const result = await response.json();
      if (result && result.data) {
        const wordData = result.data;
        const newItem: VocabItem = {
          id: "ai-" + Date.now(),
          language: activeLang,
          category: wordData.category || "Sehari-hari",
          target: wordData.target,
          script: wordData.script || undefined,
          indo: wordData.indo,
          explanation: wordData.explanation || `Kosakata hasil deteksi otomatis LingoBuddy AI!`,
        };

        const updated = [newItem, ...vocabList];
        setVocabList(updated);
        localStorage.setItem("lingobuddy_vocab_v1", JSON.stringify(updated));
        setLastAiGeneratedWord(newItem);
        setAiInputText(""); // clear input
        playSFX("correct");
        if (currentUser) {
          earnXP(20, {
            type: "vocab_ai",
            title: "Mendeteksi Kata AI 🪄",
            description: `Berhasil mendeteksi "${newItem.target}" (${newItem.indo}) via LingoBuddy AI`
          });
        }
        triggerToast(`Berhasil mendeteksi "${newItem.indo}" -> "${newItem.target}"! Added to dictionary 🎉`);
      } else {
        playSFX("wrong");
        triggerToast("Gagal mendeteksi kosa kata otomatis. Coba lagi!");
      }
    } catch (err) {
      console.error(err);
      playSFX("wrong");
      triggerToast("Terjadi hambatan koneksi saat memproses kosa kata.");
    } finally {
      setIsGeneratingVocab(false);
    }
  };

  // Add vocabulary word
  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTarget.trim() || !inputIndo.trim()) {
      playSFX("wrong");
      triggerToast("Mohon lengkapi Kata Asing dan Arti Bahasa Indonesia!");
      return;
    }

    const newItem: VocabItem = {
      id: "custom-" + Date.now(),
      language: activeLang,
      category: inputCategory,
      target: inputTarget.trim(),
      script: inputScript.trim() || undefined,
      indo: inputIndo.trim(),
      explanation: `Kata kosakata buatanmu sendiri dari kategori ${inputCategory}!`,
    };

    const updated = [newItem, ...vocabList];
    setVocabList(updated);
    localStorage.setItem("lingobuddy_vocab_v1", JSON.stringify(updated));

    // Reset Form
    setInputTarget("");
    setInputScript("");
    setInputIndo("");
    playSFX("correct");
    if (currentUser) {
      earnXP(15, {
        type: "vocab_manual",
        title: "Tambah Kamus Mandiri ✍️",
        description: `Menambahkan kata "${newItem.target}" (${newItem.indo}) ke kamus ${activeLang}`
      });
    }
    triggerToast(`Berhasil menambahkan "${newItem.target}" ke kamus! 🎉`);
  };

  // Delete vocab item
  const handleDeleteWord = (id: string, name: string) => {
    const updated = vocabList.filter(item => item.id !== id);
    setVocabList(updated);
    localStorage.setItem("lingobuddy_vocab_v1", JSON.stringify(updated));
    triggerToast(`Menghapus kata "${name}"`);
  };

  const toggleCard = (id: string) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getMascotEmoji = () => {
    switch (activeLang) {
      case "English": return "🦊";
      case "Japanese": return "🐱";
      case "Korean": return "🐻";
      case "Spanish": return "💃";
      case "French": return "🥖";
      default: return "🦊";
    }
  };

  const getLanguageFlag = (lang: string) => {
    switch (lang) {
      case "English": return "🇬🇧";
      case "Japanese": return "🇯🇵";
      case "Korean": return "🇰🇷";
      case "Spanish": return "🇪🇸";
      case "French": return "🇫🇷";
      default: return "🌐";
    }
  };

  // Click mascot motivation messages generator
  const triggerMascotSpeech = () => {
    const quotes = MASCOT_SPEECHES[activeLang] || MASCOT_SPEECHES["English"];
    const randomIdx = Math.floor(Math.random() * quotes.length);
    setMascotBubble(quotes[randomIdx]);
  };

  // Text-to-speech simulation (speaks aloud)
  const speakWord = (text: string, langCode: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      switch (langCode) {
        case "English": utterance.lang = "en-US"; break;
        case "Japanese": utterance.lang = "ja-JP"; break;
        case "Korean": utterance.lang = "ko-KR"; break;
        case "Spanish": utterance.lang = "es-ES"; break;
        case "French": utterance.lang = "fr-FR"; break;
        default: utterance.lang = "en-US";
      }
      window.speechSynthesis.speak(utterance);
      triggerToast(`Menyuarakan: "${text}" 🔊`);
      if (currentUser) {
        earnXP(5, {
          type: "speak",
          title: "Latihan Pengucapan 🔊",
          description: `Melatih pelafalan kata "${text}" (${langCode})`
        });
      }
    } else {
      triggerToast("Perangkat Anda tidak mendukung fitur Suara.");
    }
  };

  // Formatting display text according to target settings
  const formatWordText = (item: VocabItem) => {
    const currMode = displayModes[item.language] || "Latin";
    if (item.language === "Japanese") {
      if (currMode === "Romaji") return item.target;
      if (currMode === "Hiragana + Romaji") return item.script ? `${item.script} (${item.target})` : item.target;
      // Lengkap
      return item.script ? `${item.script} [${item.target}]` : item.target;
    }
    if (item.language === "Korean") {
      if (currMode === "Romanisasi") return item.target;
      if (currMode === "Hangul") return item.script || item.target;
      return item.script ? `${item.script} (${item.target})` : item.target;
    }
    if (item.language === "Spanish" || item.language === "French") {
      if (currMode === "Latin") return item.target;
      return `${item.target} (art: ${item.indo})`;
    }
    return item.target;
  };

  // --- RECONSTRUCT STORIES INTEGRATIVE SYSTEM ---
  const baseStorySegments: StorySegment[] = LOCAL_STORIES[activeLang] || LOCAL_STORIES["English"];

  // Sort and filter glossary list
  const currentLangWords = vocabList.filter(w => w.language === activeLang);
  const filteredWords = currentLangWords.filter((w) => {
    const matchesSearch = w.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          w.indo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTabCategory === "Semua" || w.category === activeTabCategory;
    return matchesSearch && matchesTab;
  });

  // Dynamic Story Weaving Logic with custom thresholds based on Slider percent (0 - 100)
  const renderedStorySegments = baseStorySegments.map((seg, idx) => {
    if (!seg.wordId) return <span key={idx}>{seg.text}</span>;

    // We calculate threshold. If index of this element in story relative to length is lower than ratio, translate it!
    const matchingVocab = vocabList.find(v => v.id === seg.wordId);
    if (!matchingVocab) return <span key={idx}>{seg.indo || seg.target}</span>;

    // Use slide index threshold
    const wordIndex = baseStorySegments.filter(s => s.wordId).findIndex(s => s.wordId === seg.wordId);
    const totalWeavable = baseStorySegments.filter(s => s.wordId).length;
    const activeThreshold = (wordIndex / totalWeavable) * 100;

    const useTargetLanguage = slidePercent >= activeThreshold;

    return (
      <span
        key={idx}
        onClick={() => setSelectedWordPopup(matchingVocab)}
        className={`inline-block px-1.5 py-0.5 mx-1 font-bold rounded cursor-pointer border border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B] transition-transform hover:scale-105 active:translate-y-0.5 ${
          useTargetLanguage
            ? "bg-[#FBBF24] text-[#1E293B]" // Yellow Target Word
            : "bg-[#F472B6] text-white"     // Pink Indo Word
        }`}
        title="Klik untuk lihat arti"
      >
        {useTargetLanguage ? (matchingVocab.script ? `${matchingVocab.script} (${matchingVocab.target})` : matchingVocab.target) : matchingVocab.indo}
      </span>
    );
  });

  // Dynamic Custom Story Weaving Logic with custom thresholds based on Slider percent (0 - 100)
  const renderedCustomStorySegments = customStory?.segments?.map((seg: any, idx: number) => {
    if (!seg.wordId) return <span key={idx}>{seg.text}</span>;

    const existingVocab = vocabList.find(v => v.id === seg.wordId);
    const matchingVocab = {
      id: seg.wordId,
      language: activeLang,
      target: existingVocab?.target || seg.target || "",
      script: existingVocab?.script || seg.script,
      indo: existingVocab?.indo || seg.indo || "",
      explanation: existingVocab?.explanation || seg.explanation || "Kosakata cerita asyik LingoBuddy!",
    };

    // Calculate active threshold dynamically based on index in segments list
    const totalWeavableSegments = customStory.segments.filter((s: any) => s.wordId);
    const wordIndex = totalWeavableSegments.findIndex((s: any) => s.wordId === seg.wordId);
    const totalWeavable = totalWeavableSegments.length;
    const activeThreshold = (wordIndex / (totalWeavable || 1)) * 100;

    const useTargetLanguage = slidePercent >= activeThreshold;

    return (
      <span
        key={idx}
        onClick={() => setSelectedWordPopup(matchingVocab)}
        className={`inline-block px-1.5 py-0.5 mx-1 font-bold rounded cursor-pointer border border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B] transition-transform hover:scale-105 active:translate-y-0.5 ${
          useTargetLanguage
            ? "bg-[#FBBF24] text-[#1E293B]" // Yellow Target Word
            : "bg-[#F472B6] text-white"     // Pink Indo Word
        }`}
        title="Klik untuk lihat arti"
      >
        {useTargetLanguage ? (matchingVocab.script ? `${matchingVocab.script} (${matchingVocab.target})` : matchingVocab.target) : matchingVocab.indo}
      </span>
    );
  });

  const getLocalClientFallbackStory = (lang: string, words: any[]) => {
    const segments: any[] = [];
    segments.push({
      text: `Wah, petualangan seru LingoBuddy di kelas belajar ${lang} dimulai! Hari ini, ia melihat `
    });

    const listWords = words && words.length > 0 ? words : [
      { id: "demo-1", target: "Neko", script: "猫", indo: "Kucing", category: "Hewan" },
      { id: "demo-2", target: "Pan", script: "パン", indo: "Roti", category: "Makanan" }
    ];

    listWords.forEach((w: any, idx: number) => {
      segments.push({
        wordId: w.id || `fallback-${idx}`,
        target: w.target,
        script: w.script,
        indo: w.indo,
        explanation: `Cara asyik mengingat: "${w.target}" itu berarti sangat penting dalam bahasa ${lang}!`
      });
      
      if (idx < listWords.length - 1) {
        segments.push({ text: ` serta menikmati hidangan ` });
      }
    });

    segments.push({
      text: `. Ayo gerakkan slider untuk melatih ingatanmu terhadap kosa-kata baru ini secara seru!`
    });

    const fullIndo = `Wah, petualangan seru LingoBuddy di kelas belajar ${lang} dimulai! Hari ini, ia melihat ` +
      listWords.map((w: any) => w.indo).join(" serta menikmati hidangan ") +
      `. Ayo gerakkan slider untuk melatih ingatanmu terhadap kosa-kata baru ini secara seru!`;

    return {
      title: `Petualangan Seru LingoBuddy ${lang} 🌟`,
      segments,
      fullIndoStory: fullIndo
    };
  };

  // --- API CALL FOR CUSTOM STORY GENERATOR (GEMINI) ---
  const handleGenerateStoryGemini = async () => {
    setLoadingStory(true);
    setCustomStory(null);
    triggerToast("Menghubungi AI LingoBuddy untuk mengarang cerita... 🪄");

    const activeVocabsShort = currentLangWords.slice(0, 5).map(v => ({
      id: v.id,
      target: v.target,
      script: v.script,
      indo: v.indo,
      category: v.category
    }));

    try {
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: activeLang,
          words: activeVocabsShort,
          displayMode: displayModes[activeLang],
          percentage: slidePercent,
        }),
      });

      const body = await res.json();
      if (body.data) {
        setCustomStory(body.data);
        if (body.isFallback) {
          triggerToast("Menggunakan cerita simulasi interaktif LingoBuddy! ✨");
        } else {
          triggerToast("Cerita AI hasil kustomisasi Gemini berhasil dimuat! ✨");
        }
        if (currentUser) {
          earnXP(25, {
            type: "story_ai",
            title: "Mengarang Cerita AI 📚",
            description: `Membaca cerita interaktif bilingual kecerdasan buatan (${activeLang})`
          });
        }
      } else {
        console.warn("Server API returned empty data, using local fallback generator");
        const fallback = getLocalClientFallbackStory(activeLang, activeVocabsShort);
        setCustomStory(fallback);
        triggerToast("Cerita edukatif LingoBuddy berhasil disiapkan! 📚✨");
        if (currentUser) {
          earnXP(25, {
            type: "story_ai",
            title: "Membaca Cerita LingoBuddy 📚",
            description: `Membaca cerita edukatif bilingual bahasa ${activeLang}`
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch custom story, falling back silently:", e);
      const fallback = getLocalClientFallbackStory(activeLang, activeVocabsShort);
      setCustomStory(fallback);
      triggerToast("Cerita edukatif LingoBuddy berhasil disiapkan! 📚✨");
      if (currentUser) {
        earnXP(25, {
          type: "story_ai",
          title: "Membaca Cerita LingoBuddy 📚",
          description: `Membaca cerita edukatif bilingual bahasa ${activeLang}`
        });
      }
    } finally {
      setLoadingStory(false);
    }
  };

  // --- DYNAMIC BRANCHING CHOCES GAME ENGINE ---
  const generateQuestions = (lang: string, list: VocabItem[]): any[] => {
    const langVocabs = list.filter((w) => w.language === lang);
    const pool = langVocabs.length >= 3 ? langVocabs : DEFAULT_VOCAB.filter((w) => w.language === lang);

    // Shuffle helper
    const shuffle = (array: any[]) => {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const shuffledPool = shuffle(pool);
    const selectedWords = shuffledPool.slice(0, 3);
    const generated: any[] = [];

    selectedWords.forEach((word) => {
      const r = Math.random();
      const otherWords = pool.filter((w) => w.id !== word.id);
      const shuffledOthers = shuffle(otherWords);
      
      const wrong1 = shuffledOthers[0] || { target: "Batu", script: "", indo: "Batu", category: "Sehari-hari" };
      const wrong2 = shuffledOthers[1] || { target: "Air", script: "", indo: "Air", category: "Sehari-hari" };

      if (r < 0.34) {
        // Type A: Translate foreign word to Indonesian
        const wordText = word.script ? `${word.target} (${word.script})` : word.target;
        generated.push({
          type: "translate-id",
          question: `Bagaimana LingoBuddy menerjemahkan kosakata "${wordText}" dari bahasa ${lang} ke dalam Bahasa Indonesia?`,
          choices: shuffle([
            { text: word.indo, correct: true },
            { text: wrong1.indo, correct: false },
            { text: wrong2.indo, correct: false }
          ])
        });
      } else if (r < 0.67) {
        // Type B: Translate Indonesian to foreign word
        const correctText = word.script ? `${word.target} (${word.script})` : word.target;
        const wrong1Text = wrong1.script ? `${wrong1.target} (${wrong1.script})` : wrong1.target;
        const wrong2Text = wrong2.script ? `${wrong2.target} (${wrong2.script})` : wrong2.target;

        generated.push({
          type: "translate-lang",
          question: `LingoBuddy ingin tahu bagaimana mengucapkan kata "${word.indo}" dalam bahasa ${lang}. Pilihan manakah yang tepat?`,
          choices: shuffle([
            { text: correctText, correct: true },
            { text: wrong1Text, correct: false },
            { text: wrong2Text, correct: false }
          ])
        });
      } else {
        // Type C: Memory petunjuk / Explanation riddle
        const wordText = word.script ? `${word.target} (${word.script})` : word.target;
        generated.push({
          type: "riddle",
          question: `LingoBuddy sedang memikirkan kosakata dengan penjelasan: "${word.explanation}". Kata manakah yang sedang ia cari?`,
          choices: shuffle([
            { text: `${wordText} (Arti: ${word.indo})`, correct: true },
            { text: `${wrong1.target} (Arti: ${wrong1.indo})`, correct: false },
            { text: `${wrong2.target} (Arti: ${wrong2.indo})`, correct: false }
          ])
        });
      }
    });

    return generated;
  };


  const handleSelectGameAnswer = (choiceText: string, isCorrect: boolean) => {
    const nextScore = gameScore + (isCorrect ? 1 : 0);
    if (isCorrect) {
      setGameScore((prev) => prev + 1);
      playSFX("correct");
      earnXP(15, {
        type: "jawaban_benar",
        title: "Jawaban Kuis Benar 🧭",
        description: `Sukses menebak pilihan "${choiceText}" di Kuis Petualangan`
      }, 2);
    } else {
      playSFX("wrong");
    }
    setGameAnswers((prev) => [...prev, choiceText]);

    // Reset adventure hint for next step
    setShowAdventureHint(false);

    if (gameStep < 3) {
      setGameStep((prev) => prev + 1);
    } else {
      setGameStep(4); // Result
      if (nextScore === 3) {
        playSFX("victory");
        earnXP(40, {
          type: "kuis_petualangan",
          title: "Skor Petualangan Sempurna! 👑",
          description: `Menyelesaikan kuis bahasa ${activeLang} dengan nilai 3/3`
        }, 15);
      } else if (nextScore > 0) {
        playSFX("victory");
        earnXP(15, {
          type: "kuis_petualangan",
          title: "Petualangan Kuis Selesai 🧭",
          description: `Menyelesaikan kuis bahasa ${activeLang} dengan skor ${nextScore}/3`
        }, 5);
      } else {
        playSFX("wrong");
      }
    }
  };

  const startGame = () => {
    setCurrentGameQuestions(generateQuestions(activeLang, vocabList));
    setGameStep(1);
    setGameScore(0);
    setGameAnswers([]);
  };

  const restartGame = () => {
    setGameStep(0);
    setGameScore(0);
    setGameAnswers([]);
  };

  const startConnectGame = useCallback(() => {
    const langVocabs = vocabList.filter((w) => w.language === activeLang);
    const pool = langVocabs.length >= 4 ? langVocabs : DEFAULT_VOCAB.filter((w) => w.language === activeLang);

    // Dynamic select 4 random items
    const shuffle = (array: any[]) => {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const shuffledPool = shuffle(pool);
    const selected = shuffledPool.slice(0, 4);

    setConnectSources(shuffle(selected)); // Shuffled list of sources
    setConnectTargets(shuffle(selected.map((w) => ({ id: w.id, indo: w.indo })))); // Shuffled list of targets
    setSelectedSourceId(null);
    setConnectedPairs([]);
    setConnectWrongId(null);
    setConnectWin(false);
    setConnectScore(0);
  }, [vocabList, activeLang]);

  const handleDragStartConnect = (id: string) => {
    setDraggedSourceId(id);
  };

  const handleDropConnect = (targetId: string) => {
    const sourceId = draggedSourceId || selectedSourceId;
    if (!sourceId) return;

    if (sourceId === targetId) {
      // Correct Match!
      if (!connectedPairs.includes(sourceId)) {
        const updated = [...connectedPairs, sourceId];
        setConnectedPairs(updated);
        setConnectScore(updated.length);
        
        const matchedWord = vocabList.find(w => w.id === sourceId);
        const wordLabel = matchedWord ? `"${matchedWord.target}" (${matchedWord.indo})` : "";

        // If all 4 correct
        if (updated.length === connectSources.length) {
          setConnectWin(true);
          playSFX("victory");
          earnXP(35, {
            type: "sambung_kata",
            title: "Menang Sambung Kata! 🏆",
            description: `Berhasil mencocokkan semua kata dan memenangkan game (${activeLang})`
          }, 10);
          triggerToast("Luar biasa! Semua pasangan kata telah terhubung! 🏆");
        } else {
          playSFX("correct");
          earnXP(10, {
            type: "sambung_kata",
            title: "Sambungan Kata Cocok 🧩",
            description: `Menghubungkan kata ${wordLabel} dalam bahasa ${activeLang}`
          }, 2);
          triggerToast("Hore! Pasangan kata cocok! 🌟");
        }
      }
    } else {
      // Mismatch! Trigger shake animation
      setConnectWrongId(targetId);
      playSFX("wrong");
      triggerToast("Aduh, kurang tepat. Coba sambungan lain! ❌");
      setTimeout(() => {
        setConnectWrongId(null);
      }, 800);
    }

    setDraggedSourceId(null);
    setSelectedSourceId(null);
  };

  // Connect Game automatic helper clue/hint using Coins
  const triggerConnectHint = () => {
    // Find first unconnected source ID
    const unconnected = connectSources.find(s => !connectedPairs.includes(s.id));
    if (!unconnected) return;

    if (spendCoins(8)) {
      const sourceId = unconnected.id;
      const updated = [...connectedPairs, sourceId];
      setConnectedPairs(updated);
      setConnectScore(updated.length);
      playSFX("correct");
      
      const matchedWord = vocabList.find(w => w.id === sourceId);
      const wordLabel = matchedWord ? `"${matchedWord.target}"` : "";
      
      if (updated.length === connectSources.length) {
        setConnectWin(true);
        playSFX("victory");
        earnXP(35, {
          type: "sambung_kata",
          title: "Menang Sambung Kata! 🏆",
          description: `Berhasil mencocokkan semua kata dan memenangkan game (${activeLang})`
        }, 10);
        triggerToast(`Kunci jawaban dipakai! Semua kata terhubung sempurna! 🏆`);
      } else {
        triggerToast(`Kunci jawaban dipakai! Terhubung otomatis: ${wordLabel} 💡`);
      }
    }
  };

  const handleSourceClick = (id: string) => {
    if (connectedPairs.includes(id)) return;
    if (selectedSourceId === id) {
      setSelectedSourceId(null);
    } else {
      setSelectedSourceId(id);
    }
  };

  // --- GAME 3: SUSUN KALIMAT (SCRAMBLE SENTENCE BUILDER GAME ENGINE) ---
  const startScrambleGame = useCallback(() => {
    const shuffle = (array: string[]) => {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const targetLangData = SCRAMBLE_DATA[activeLang] || SCRAMBLE_DATA["English"];
    const copyChallenges = [...targetLangData];
    // Shuffle the items
    for (let i = copyChallenges.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copyChallenges[i], copyChallenges[j]] = [copyChallenges[j], copyChallenges[i]];
    }

    const finalChallenges = copyChallenges.slice(0, 3).map((ch, index) => ({
      ...ch,
      id: `scramble-${index}`,
      shuffledWords: shuffle(ch.correct)
    }));

    setScrambleChallenges(finalChallenges);
    setScrambleRound(0);
    setScrambleScore(0);
    setScrambleSelected([]);
    if (finalChallenges.length > 0) {
      setScramblePool(finalChallenges[0].shuffledWords);
    }
    setScrambleWin(false);
    setScrambleWrong(false);
  }, [activeLang]);

  // Handle clicking word in choice pool
  const selectScrambleWord = (word: string, index: number) => {
    playSFX("click");
    // Add to selected words
    setScrambleSelected((prev) => [...prev, word]);
    // Remove from choices
    setScramblePool((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setScrambleWrong(false);
  };

  // Handle clicking word in selected list to return it
  const deselectScrambleWord = (word: string, index: number) => {
    playSFX("click");
    setScrambleSelected((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setScramblePool((prev) => [...prev, word]);
    setScrambleWrong(false);
  };

  // Handle clear / reset current sentence
  const resetScrambleSentence = () => {
    playSFX("click");
    const currentChallenge = scrambleChallenges[scrambleRound];
    if (currentChallenge) {
      setScrambleSelected([]);
      setScramblePool(currentChallenge.shuffledWords);
    }
    setScrambleWrong(false);
  };

  // Check current round answer
  const checkScrambleAnswer = () => {
    const currentChallenge = scrambleChallenges[scrambleRound];
    if (!currentChallenge) return;

    const isCorrect = JSON.stringify(scrambleSelected) === JSON.stringify(currentChallenge.correct);
    if (isCorrect) {
      playSFX("correct");
      const nextRound = scrambleRound + 1;
      const nextScore = scrambleScore + 1;
      setScrambleScore(nextScore);

      earnXP(20, {
        type: "sambung_kata",
        title: "Susun Kalimat Benar! ⭐",
        description: `Berhasil merangkai kalimat: "${scrambleSelected.join(" ")}"`
      }, 5);

      if (nextRound < scrambleChallenges.length) {
        setTimeout(() => {
          setScrambleRound(nextRound);
          setScrambleSelected([]);
          setScramblePool(scrambleChallenges[nextRound].shuffledWords);
        }, 1200);
        triggerToast("Keren sekali! Kalimatmu 100% tepat! 🎉");
      } else {
        // Finished all rounds!
        setScrambleWin(true);
        playSFX("victory");
        earnXP(40, {
          type: "sambung_kata",
          title: "Raja Susun Kalimat! 👑",
          description: `Menyelesaikan semua tantangan Susun Kalimat bahasa ${activeLang} sempurna!`
        }, 15);
        triggerToast("Luar biasa! Kamu menyelesaikan semua tantangan Susun Kalimat! 🏆");
      }
    } else {
      playSFX("wrong");
      setScrambleWrong(true);
      triggerToast("Aduh, urutan kata masih keliru. Coba lagi! ❌");
      setTimeout(() => {
        setScrambleWrong(false);
      }, 1000);
    }
  };

  // Scramble Game automatic helper clue/hint using Coins
  const triggerScrambleHint = () => {
    const currentChallenge = scrambleChallenges[scrambleRound];
    if (!currentChallenge) return;

    const nextWordIndex = scrambleSelected.length;
    if (nextWordIndex >= currentChallenge.correct.length) {
      triggerToast("Kalimat sudah lengkap disusun! Silakan periksa jawabanmu. 😉");
      return;
    }

    const nextWord = currentChallenge.correct[nextWordIndex];
    // Find index of this word in scramblePool
    const poolIndex = scramblePool.indexOf(nextWord);
    if (poolIndex === -1) {
      triggerToast("Kembalikan kata yang salah ke kotak pilihan terlebih dahulu! 💡");
      playSFX("wrong");
      return;
    }

    if (spendCoins(5)) {
      // Add nextWord to selected
      setScrambleSelected((prev) => [...prev, nextWord]);
      // Remove from pool
      setScramblePool((prev) => {
        const updated = [...prev];
        updated.splice(poolIndex, 1);
        return updated;
      });
      playSFX("click");
      triggerToast(`Bocoran kata berikutnya dibuka: "${nextWord}" 💡`);
    }
  };

  // Pre-populate connecting and scrambling game safely
  useEffect(() => {
    if (vocabList && vocabList.length > 0) {
      const timer = setTimeout(() => {
        startConnectGame();
        startScrambleGame();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLang, vocabList.length > 0, startConnectGame, startScrambleGame]);

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-[#FFFDF5] text-[#1E293B] px-4 py-8 md:py-16 flex flex-col justify-center items-center relative overflow-hidden font-jakarta select-none">
        {/* Background decorative patterns */}
        <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: "radial-gradient(#1E293B 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
        <div className="absolute top-[-50px] left-[-50px] w-80 h-80 rounded-full bg-[#8B5CF6] opacity-10 pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-50px] w-96 h-96 rounded-[80px] rotate-12 bg-[#34D399] opacity-15 pointer-events-none" />
        
        {/* Dynamic toast inside landing */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#8B5CF6] text-white font-black uppercase tracking-wider px-6 py-3.5 rounded-full border-3 border-[#1E293B] shadow-[6px_6px_0px_0px_#1E293B] flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-md z-10">
          <div className="text-center mb-8 bg-[#FFFDF5] p-3 rounded-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#8B5CF6] border-3 border-[#1E293B] rounded-2xl shadow-[5px_5px_0px_0px_#1E293B] mb-4">
              <span className="text-white font-black text-4xl font-outfit">L</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter uppercase text-[#1E293B]">LingoBuddy</h1>
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-1">Edukasi Bahasa Asing Tanpa Batas 🚀</p>
          </div>

          <div className="bg-white border-3 border-[#1E293B] rounded-[32px] p-6 md:p-8 shadow-[10px_10px_0px_0px_#1E293B] relative">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-outfit font-black uppercase text-[#1E293B]">
                {authTab === "login" ? "Selamat Datang!" : "Daftar Akun Baru"}
              </h3>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1">
                {authTab === "login"
                  ? "Masuk untuk menyelamatkan streak & mengumpulkan XP"
                  : "Mulai petualangan bahasa barumu hari ini!"}
              </p>
            </div>

            {/* Tabs inside landing */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#FFFDF5] border-2 border-[#1E293B] rounded-xl mb-6 shadow-[2px_2px_0px_0px_#1E293B]">
              <button
                type="button"
                onClick={() => {
                  playSFX("click");
                  setAuthTab("login");
                  setAuthError("");
                }}
                className={`py-2 px-4 text-xs font-black uppercase rounded-lg transition-colors cursor-pointer ${
                  authTab === "login"
                    ? "bg-[#8B5CF6] text-white"
                    : "text-[#1E293B] hover:bg-[#FFFDF5]"
                }`}
              >
                Masuk (Login)
              </button>
              <button
                type="button"
                onClick={() => {
                  playSFX("click");
                  setAuthTab("register");
                  setAuthError("");
                }}
                className={`py-2 px-4 text-xs font-black uppercase rounded-lg transition-colors cursor-pointer ${
                  authTab === "register"
                    ? "bg-[#8B5CF6] text-white"
                    : "text-[#1E293B] hover:bg-[#FFFDF5]"
                }`}
              >
                Daftar Baru
              </button>
            </div>

            {authError && (
              <div className="bg-red-100 border-2 border-red-500 text-red-700 text-xs font-bold p-3 rounded-xl mb-4 text-center animate-bounce">
                ⚠️ {authError}
              </div>
            )}

            {authTab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Email / Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan email atau nama panggilan..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-[#FFFDF5] border-2 border-[#1E293B] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow-[2px_2px_0px_0px_#1E293B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan sandi rahasia..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-[#FFFDF5] border-2 border-[#1E293B] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow-[2px_2px_0px_0px_#1E293B]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#34D399] hover:bg-[#2bc28a] text-[#1E293B] py-3.5 border-2 border-[#1E293B] rounded-xl font-outfit font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#1E293B] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none text-xs cursor-pointer"
                >
                  Masuk Sekarang 🔓
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Nama Panggilan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mushoffal"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    maxLength={15}
                    className="w-full bg-[#FFFDF5] border-2 border-[#1E293B] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow-[2px_2px_0px_0px_#1E293B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="Contoh: mushoffal@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-[#FFFDF5] border-2 border-[#1E293B] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow-[2px_2px_0px_0px_#1E293B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Password (Min. 4 Karakter)</label>
                  <input
                    type="password"
                    required
                    placeholder="Sandi minimal 4 karakter..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-[#FFFDF5] border-2 border-[#1E293B] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow-[2px_2px_0px_0px_#1E293B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-2">Pilih Avatar Guru Kece</label>
                  <div className="grid grid-cols-6 gap-2">
                    {["🐱", "🦊", "🐼", "🦉", "🦁", "🥑"].map((av) => (
                      <button
                        type="button"
                        key={av}
                        onClick={() => {
                          playSFX("click");
                          setSelectedAvatar(av);
                        }}
                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg cursor-pointer transition-all ${
                          selectedAvatar === av
                            ? "bg-[#FFFDF5] border-[#8B5CF6] shadow-[2px_2px_0px_0px_#8B5CF6] scale-105"
                            : "bg-white border-[#1E293B] hover:bg-[#FFFDF5]"
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#fcd34d] hover:bg-[#f59e0b] text-[#1E293B] py-3.5 border-2 border-[#1E293B] rounded-xl font-outfit font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#1E293B] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none text-xs cursor-pointer"
                >
                  Daftar Sekarang 🎉
                </button>
              </form>
            )}
          </div>

          {/* Quick Mascot Welcome Speech Bubble */}
          <div className="mt-8 bg-[#fcd34d]/20 border-3 border-[#1E293B] rounded-2xl p-4 shadow-[4px_4px_0px_0px_#1E293B] relative">
            <div className="flex gap-4 items-center">
              <span className="text-4xl animate-bounce">🦉</span>
              <p className="text-xs font-bold text-[#1E293B] leading-relaxed">
                {"\""}Halo kawan! Aku LingoBuddy. Masuk atau buat akun baru sekarang untuk mengakses semua modul mini-game interaktif, kamus pintar bertenaga AI Gemini, dan mengoleksi poin XP prestasi!{"\""}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFDF5] text-[#1E293B] px-4 py-8 md:py-12 select-none relative overflow-x-hidden font-jakarta">
      
      {/* BACKGROUND FLOATING ELEMENTS / DECORATIONS (Bold Typography Theme) */}
      <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: "radial-gradient(#1E293B 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
      <div className="absolute top-[-40px] left-[-40px] w-64 h-64 rounded-full bg-[#FBBF24] opacity-15 pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-50px] w-96 h-96 rounded-[80px] rotate-12 bg-[#34D399] opacity-15 pointer-events-none" />
      <div className="absolute top-1/4 right-10 w-0 h-0 border-l-[40px] border-l-transparent border-b-[60px] border-b-[#F472B6] border-r-[40px] border-r-transparent rotate-45 opacity-20 pointer-events-none" />

      {/* DYNAMIC SUCCESS TOAST NOTIFIER */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#8B5CF6] text-white font-black uppercase tracking-wider px-6 py-3.5 rounded-full border-3 border-[#1E293B] shadow-[6px_6px_0px_0px_#1E293B] flex items-center gap-2 text-sm"
          >
            <Sparkles className="w-5 h-5 animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto z-10 relative">
        
        {/* --- BRAND HEADER (BOLD TYPOGRAPHY LOGO STYLE) --- */}
        <header className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 mb-8 pb-6 border-b-3 border-[#1E293B]" id="main-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#8B5CF6] border-2 border-[#1E293B] rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_#1E293B]">
              <span className="text-white font-black text-2xl font-outfit">L</span>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tighter uppercase font-outfit text-[#1E293B]">LingoBuddy</h1>
              <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">System Ver. 2.0 // Learning Core</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <div className="bg-white px-4 py-2 border-2 border-[#1E293B] rounded-full shadow-[4px_4px_0px_0px_#1E293B] flex items-center gap-2" title="Koin Lingo Pintar kamu untuk membeli petunjuk / bantuan">
              <span className="text-xl">🪙</span>
              <span className="font-extrabold text-[#1E293B] text-sm">{coinsCount} Koin</span>
            </div>
            <div className="bg-white px-4 py-2 border-2 border-[#1E293B] rounded-full shadow-[4px_4px_0px_0px_#1E293B] flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <span className="font-extrabold text-[#1E293B] text-sm">{streak} Hari Streak</span>
            </div>
            <div className="bg-white px-4 py-2 border-2 border-[#1E293B] rounded-full shadow-[4px_4px_0px_0px_#1E293B] flex items-center gap-2">
              <span className="text-[#FBBF24] font-black">★</span>
              <span className="font-extrabold text-[#8B5CF6] text-sm">{badge}</span>
            </div>

            {currentUser ? (
              <button
                onClick={() => {
                  playSFX("click");
                  setShowProfileModal(true);
                }}
                className="cursor-pointer bg-[#F472B6] hover:bg-[#e05ea0] text-white pl-2 pr-4 py-2 border-2 border-[#1E293B] rounded-full shadow-[4px_4px_0px_0px_#1E293B] flex items-center gap-2 hover:-translate-y-0.5 transition-transform"
                title="Lihat Profil & Statistikmu"
              >
                <div className="w-8 h-8 rounded-full bg-white border border-[#1E293B] flex items-center justify-center text-lg shadow-[1px_1px_0px_0px_#1E293B]">
                  {currentUser.avatar}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-outfit font-black text-xs text-white leading-none tracking-tight">{currentUser.username}</span>
                  <span className="text-[9px] text-[#FFFDF5] font-extrabold leading-none mt-1 uppercase tracking-wider">{currentUser.xp} XP • {currentUser.coins !== undefined ? currentUser.coins : 50} 🪙</span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  playSFX("click");
                  setShowAuthModal(true);
                  setAuthTab("login");
                  setAuthError("");
                }}
                className="cursor-pointer bg-[#F472B6] hover:bg-[#e05ea0] text-white px-4.5 py-2 border-2 border-[#1E293B] rounded-full shadow-[4px_4px_0px_0px_#1E293B] flex items-center gap-1.5 hover:-translate-y-0.5 transition-transform text-xs font-black uppercase tracking-widest"
              >
                <span>👤</span> Masuk / Daftar
              </button>
            )}
          </div>
        </header>

        {/* --- HERO STICKER BLOCK --- */}
        <div className="mb-10 text-center max-w-3xl mx-auto bg-white p-6 md:p-8 border-3 border-[#1E293B] rounded-[32px] shadow-[8px_8px_0px_0px_#1E293B] relative hover:scale-[1.01] transition-all">
          <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-4 h-4 rounded-full bg-[#1E293B] hidden md:block" />
          <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-4 h-4 rounded-full bg-[#1E293B] hidden md:block" />
          
          <div className="inline-block bg-[#FBBF24] text-[#1E293B] font-outfit text-xs uppercase tracking-widest font-black px-6 py-2 rounded-full border-2 border-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B] mb-4 hover:rotate-1 transition-transform">
            ⚡ Platform Belajar Bahasa Interaktif & Asyik ⚡
          </div>

          <h2 className="text-xl md:text-2xl font-outfit font-black text-[#1E293B] uppercase tracking-tight mb-3">
            Kuasai Bahasa Asing Lebih Cepat Tanpa Bosan!
          </h2>
          
          <p className="text-sm md:text-base text-[#64748B] font-bold leading-relaxed px-4 mb-6">
            LingoBuddy membantu Anda mempelajari kosakata baru lewat <span className="text-[#8B5CF6] font-black underline decoration-2 decoration-[#FBBF24]">Cerita Interaktif Dua Bahasa</span>, dukungan kecerdasan buatan Gemini AI, serta tantangan petualangan seru yang interaktif!
          </p>

          {/* Fully Professional Icon Feature Badges Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-2 mt-2">
            <div className="bg-[#FFFDF5] border-2 border-[#1E293B] rounded-2xl p-4 flex flex-col items-center text-center shadow-[3px_3px_0px_0px_#1E293B] hover:-translate-y-0.5 transition-transform">
              <div className="bg-[#8B5CF6] text-white p-2.5 rounded-xl border border-[#1E293B] mb-2.5 shadow-[2px_2px_0px_0px_#1E293B]">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black uppercase text-[#1E293B] tracking-wider mb-1">Grid Kosakata</h4>
              <p className="text-[10px] text-[#64748B] font-bold leading-relaxed">Penyajian terstruktur, rapi, dan mudah diingat</p>
            </div>

            <div className="bg-[#FFFDF5] border-2 border-[#1E293B] rounded-2xl p-4 flex flex-col items-center text-center shadow-[3px_3px_0px_0px_#1E293B] hover:-translate-y-0.5 transition-transform">
              <div className="bg-[#F472B6] text-white p-2.5 rounded-xl border border-[#1E293B] mb-2.5 shadow-[2px_2px_0px_0px_#1E293B]">
                <Languages className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black uppercase text-[#1E293B] tracking-wider mb-1">Kisah Dua Bahasa</h4>
              <p className="text-[10px] text-[#64748B] font-bold leading-relaxed">Peleburan kosa kata secara alami di dalam cerita</p>
            </div>

            <div className="bg-[#FFFDF5] border-2 border-[#1E293B] rounded-2xl p-4 flex flex-col items-center text-center shadow-[3px_3px_0px_0px_#1E293B] hover:-translate-y-0.5 transition-transform">
              <div className="bg-[#34D399] text-white p-2.5 rounded-xl border border-[#1E293B] mb-2.5 shadow-[2px_2px_0px_0px_#1E293B]">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black uppercase text-[#1E293B] tracking-wider mb-1">Tantangan Seru</h4>
              <p className="text-[10px] text-[#64748B] font-bold leading-relaxed">Kuis dinamis, acak, & interaktif bebas jenuh</p>
            </div>
          </div>
        </div>

        {/* --- STATS & BADGE STRIP --- */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10" id="stats-section">
          {/* Streak Stat */}
          <div className="bg-white border-3 border-[#1E293B] rounded-3xl p-5 shadow-[6px_6px_0px_0px_#1E293B] flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-[#64748B] uppercase tracking-wider mb-1">Daily Streak</p>
              <h4 className="text-2xl font-outfit font-black">{streak} Hari</h4>
            </div>
            <div className="bg-[#F472B6] p-3 rounded-full border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B] text-white animate-emoji-bounce">
              <Flame className="w-6 h-6 fill-current" />
            </div>
          </div>

          {/* Badge Stat */}
          <div className="bg-[#34D399] border-3 border-[#1E293B] rounded-3xl p-5 shadow-[6px_6px_0px_0px_#1E293B] flex items-center justify-between">
            <div>
              <p className="text-white/90 text-xs font-black uppercase tracking-wider mb-1">Badge Terbaru</p>
              <h4 className="text-2xl font-outfit font-black text-white">{badge}</h4>
            </div>
            <div className="bg-white text-[#34D399] p-3 rounded-full border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]">
              <Award className="w-6 h-6" />
            </div>
          </div>

          {/* Total Words Tracked */}
          <div className="bg-white border-3 border-[#1E293B] rounded-3xl p-5 shadow-[6px_6px_0px_0px_#1E293B] flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-[#64748B] uppercase tracking-wider mb-1">Total Kosakata ({activeLang})</p>
              <h4 className="text-xl font-outfit font-black tracking-tight">{currentLangWords.length} Kata Dimuat</h4>
            </div>
            <div className="bg-[#8B5CF6] p-3 rounded-full border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B] text-white">
              <Globe className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* --- FITUR 1: LANGUAGE SELECTOR & FITUR 2: DISPLAY MODE SETTINGS --- */}
        <section className="bg-white border-3 border-[#1E293B] rounded-[32px] p-6 md:p-8 shadow-[12px_12px_0px_0px_#1E293B] mb-10" id="language-and-modes">
          <h2 className="text-2xl font-outfit font-black uppercase tracking-tight text-[#1E293B] flex items-center gap-2 mb-6">
            <Globe className="w-6 h-6 text-[#8B5CF6]" /> 1. Pilih Bahasa Target Belajar
          </h2>

          {/* Flag select grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {["English", "Japanese", "Korean", "Spanish", "French"].map((lang) => {
              const active = activeLang === lang;
              return (
                <button
                  key={lang}
                  id={`btn-lang-${lang.toLowerCase()}`}
                  onClick={() => {
                    playSFX("click");
                    setActiveLang(lang);
                    triggerToast(`Bahasa target beralih ke ${lang} ${getLanguageFlag(lang)}`);
                  }}
                  className={`flex items-center gap-3 justify-center py-4 px-4 font-black uppercase tracking-wider rounded-2xl border-2 border-[#1E293B] transition-all duration-100 active:translate-y-0.5 cursor-pointer text-sm md:text-base ${
                    active
                      ? "bg-[#8B5CF6] text-white shadow-[4px_4px_0px_0px_#1E293B] -translate-y-0.5"
                      : "bg-[#FFFDF5] text-[#1E293B] hover:bg-[#FBBF24] hover:shadow-[4px_4px_0px_0px_#1E293B] hover:-translate-y-0.5"
                  }`}
                >
                  <span className="text-2xl">{getLanguageFlag(lang)}</span>
                  <span>{lang}</span>
                </button>
              );
            })}
          </div>

          <hr className="border-[#1E293B] border-2 my-6" />

          {/* Display options configuration tab */}
          <div>
            <h3 className="text-lg font-outfit font-black uppercase tracking-wider mb-3 flex items-center gap-2 text-[#1E293B]">
              🎨 2. Mode Tampilan Kosakata untuk Bahasa {activeLang}
            </h3>
            <p className="text-sm font-bold text-[#64748B] mb-4">
              Konfigurasikan kedalaman pembacaan script atau aksara asli berdasarkan ketersediaan:
            </p>

            <div className="flex flex-wrap gap-3">
              {activeLang === "English" && (
                <button
                  onClick={() => changeDisplayMode("English", "Latin saja")}
                  className="bg-[#34D399] text-white font-black uppercase tracking-wider text-sm px-5 py-2.5 rounded-full border-2 border-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B]"
                >
                  Only Latin
                </button>
              )}

              {activeLang === "Japanese" &&
                ["Romaji", "Hiragana + Romaji", "Lengkap"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => changeDisplayMode("Japanese", mode)}
                    className={`font-black uppercase tracking-wider text-xs md:text-sm px-5 py-2.5 rounded-full border-2 border-[#1E293B] transition-transform duration-100 cursor-pointer ${
                      displayModes["Japanese"] === mode
                        ? "bg-[#8B5CF6] text-white shadow-[4px_4px_0px_0px_#1E293B] -translate-y-0.5"
                        : "bg-[#FFFDF5] text-[#1E293B] hover:bg-[#FBBF24] hover:shadow-[3px_3px_0px_0px_#1E293B]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}

              {activeLang === "Korean" &&
                ["Romanisasi", "Hangul", "Hangul + Arti"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => changeDisplayMode("Korean", mode)}
                    className={`font-black uppercase tracking-wider text-xs md:text-sm px-5 py-2.5 rounded-full border-2 border-[#1E293B] transition-transform duration-100 cursor-pointer ${
                      displayModes["Korean"] === mode
                        ? "bg-[#8B5CF6] text-white shadow-[4px_4px_0px_0px_#1E293B] -translate-y-0.5"
                        : "bg-[#FFFDF5] text-[#1E293B] hover:bg-[#FBBF24] hover:shadow-[3px_3px_0px_0px_#1E293B]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}

              {(activeLang === "Spanish" || activeLang === "French") &&
                ["Latin", "Latin + Arti"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => changeDisplayMode(activeLang, mode)}
                    className={`font-black uppercase tracking-wider text-xs md:text-sm px-5 py-2.5 rounded-full border-2 border-[#1E293B] transition-transform duration-100 cursor-pointer ${
                      displayModes[activeLang] === mode
                        ? "bg-[#8B5CF6] text-white shadow-[4px_4px_0px_0px_#1E293B] -translate-y-0.5"
                        : "bg-[#FFFDF5] text-[#1E293B] hover:bg-[#FBBF24] hover:shadow-[3px_3px_0px_0px_#1E293B]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
            </div>
          </div>
        </section>

        {/* --- CENTER AREA: BILINGUAL STORIES & HARMONIC SLIDER --- */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10" id="story-area-section">
          
          {/* Left Column: Story reader */}
          <div className="lg:col-span-8 bg-white border-3 border-[#1E293B] rounded-[32px] p-6 md:p-8 shadow-[12px_12px_0px_0px_#F472B6] relative">
            {/* Top-left Retro-tech decorative dots exactly as in the design HTML */}
            <div className="absolute top-6 left-6 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#1E293B]"></div>
              <div className="w-3 h-3 rounded-full bg-[#1E293B]"></div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-[#1E293B] pt-4 md:pt-0">
              <div>
                <h2 className="text-xl md:text-2xl font-outfit font-black uppercase tracking-tight flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-[#F472B6]" /> 3. Cerita Pendek Dua Bahasa
                </h2>
                <p className="text-xs font-bold text-[#64748B] mt-1">
                  Gunakan slider di bawah untuk meluruhkan bahasa Indonesia ke bahasa {activeLang}!
                </p>
              </div>

              {/* API Story Generator Trigger */}
              <button
                id="btn-gemini-story"
                disabled={loadingStory}
                onClick={handleGenerateStoryGemini}
                className="bg-[#8B5CF6] text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full border-2 border-[#1E293B] shadow-[4px_4px_0px_0px_#1E293B] hover:shadow-[5px_5px_0px_0px_#1E293B] hover:-translate-y-0.5 transition-all cursor-pointer inline-flex items-center gap-2 active:translate-y-0"
              >
                <Sparkles className={`w-4 h-4 ${loadingStory ? "animate-spin" : ""}`} />
                {loadingStory ? "Mengarang..." : "Karang Cerita AI Gemini ✨"}
              </button>
            </div>

            {/* SLIDER CONTROLLER ("Slider Pelan-pelan" 🐢 - 🐇) */}
            <div className="bg-[#FFFDF5] border-2 border-[#1E293B] rounded-2xl p-5 mb-6 shadow-[6px_6px_0px_0px_#1E293B]">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🐢</span>
                  <p className="text-xs font-black uppercase tracking-wider text-[#1E293B]">Mode Peleburan</p>
                </div>
                <div className="bg-[#34D399] px-4 py-1 rounded-full border-2 border-[#1E293B] text-white font-black text-xs shadow-[2px_2px_0px_0px_#1E293B]">
                  PELEBURAN: {slidePercent}%
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-2xl">🐇</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={slidePercent}
                onChange={(e) => setSlidePercent(parseInt(e.target.value, 10))}
                className="w-full h-3 bg-white border-2 border-[#1E293B] rounded-full appearance-none cursor-pointer accent-[#8B5CF6]"
              />
            </div>

            {/* STORY TEXT DISPLAY DISPLAY PANELS */}
            {customStory ? (
              <div className="space-y-6">
                {/* Header Banner for AI Story */}
                <div className="bg-[#8B5CF6]/10 p-5 rounded-2xl border-2 border-[#8B5CF6] flex justify-between items-center">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[#8B5CF6]">🤖 Karangan AI Gemini x LingoBuddy</h4>
                    <p className="font-outfit font-black text-2xl text-[#1E293B]">{customStory.title}</p>
                  </div>
                  <span className="text-3xl">✨</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  {/* Left side: custom target text */}
                  <div className="md:col-span-8 bg-white border-2 border-[#1E293B] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1E293B] flex flex-col justify-between relative">
                    <div>
                      <h4 className="text-xs uppercase font-black tracking-widest text-[#8B5CF6] mb-3 flex items-center gap-1">
                        📖 Teks Campuran AI ({slidePercent}% {activeLang})
                      </h4>
                      <p className="text-lg md:text-xl font-bold font-jakarta text-[#1E293B] leading-loose">
                        {renderedCustomStorySegments}
                      </p>
                    </div>
                    <p className="text-[10px] font-bold text-[#64748B] mt-6 border-t border-[#1E293B] pt-2.5 italic">
                      💡 Tips: Klik kata berwarna untuk memunculkan cara baca & penjelasannya!
                    </p>
                  </div>

                  {/* Right side: custom indonesian reference translation */}
                  <div className="md:col-span-4 bg-[#FFFDF5] border-2 border-[#1E293B] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1E293B]">
                    <h4 className="text-xs uppercase font-black tracking-widest text-[#64748B] mb-3">
                      🇮🇩 Rujukan Indonesia (Murni)
                    </h4>
                    <p className="text-sm text-[#64748B] font-bold leading-relaxed">
                      {customStory.fullIndoStory}
                    </p>
                  </div>
                </div>

                {/* Return button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setCustomStory(null)}
                    className="text-xs font-black uppercase bg-[#FFFDF5] hover:bg-[#8B5CF6] hover:text-white border-2 border-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B] px-4 py-2.5 rounded-full flex items-center gap-1.5 transition-all text-[#8B5CF6]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Kembali ke cerita standar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                
                {/* Left side: target text */}
                <div className="md:col-span-8 bg-white border-2 border-[#1E293B] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1E293B] flex flex-col justify-between relative">
                  <div>
                    <h4 className="text-xs uppercase font-black tracking-widest text-[#8B5CF6] mb-3 flex items-center gap-1">
                      📖 Teks Campuran ({slidePercent}% {activeLang})
                    </h4>
                    <p className="text-lg md:text-xl font-bold font-jakarta text-[#1E293B] leading-loose">
                      {renderedStorySegments}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-[#64748B] mt-6 border-t border-[#1E293B] pt-2.5 italic">
                    💡 Tips: Klik kata berwarna untuk memunculkan cara baca & penjelasannya!
                  </p>
                </div>

                {/* Right side: indonesian reference translation */}
                <div className="md:col-span-4 bg-[#FFFDF5] border-2 border-[#1E293B] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1E293B]">
                  <h4 className="text-xs uppercase font-black tracking-widest text-[#64748B] mb-3">
                    🇮🇩 Rujukan Indonesia
                  </h4>
                  <p className="text-sm text-[#64748B] font-bold leading-relaxed">
                    {baseStorySegments.map(s => s.indo || s.text).join("")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Mini Popup metadata and Custom Word Input (Fitur 4) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* WORD POPUP DETAILS PANEL */}
            <AnimatePresence>
              {selectedWordPopup && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="bg-white border-3 border-[#1E293B] rounded-[24px] p-6 shadow-[8px_8px_0px_0px_#F472B6] relative hover:rotate-[1deg] transition-transform"
                >
                  <button
                    onClick={() => setSelectedWordPopup(null)}
                    className="absolute top-4 right-4 w-7 h-7 bg-[#FFFDF5] hover:bg-[#F472B6] hover:text-white border-2 border-[#1E293B] rounded-full flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-black uppercase tracking-wider bg-[#34D399] text-white px-2.5 py-1 rounded border-2 border-[#1E293B]">
                      Kamus Pintar
                    </span>
                  </div>

                  <h3 className="text-2xl font-outfit font-black text-[#8B5CF6] mb-1 flex flex-wrap items-center gap-2">
                    <span>{selectedWordPopup.target} {selectedWordPopup.script && `(${selectedWordPopup.script})`}</span>
                    <button
                      onClick={() => speakWord(selectedWordPopup.target, selectedWordPopup.language)}
                      className="bg-[#FFFDF5] hover:bg-[#FBBF24] border-2 border-[#1E293B] rounded-full p-1.5 cursor-pointer transition-colors inline-flex items-center justify-center shadow-[2px_2px_0px_0px_#1E293B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      title="Suarakan kata"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </h3>
                  <div className="text-sm font-bold text-[#1E293B] mb-2 flex items-center gap-1.5">
                    Arti: <span className="bg-[#FBBF24] px-1.5 py-0.5 rounded border border-[#1E293B] font-black">{selectedWordPopup.indo}</span>
                  </div>
                  <p className="text-xs text-[#64748B] font-bold leading-relaxed bg-[#FFFDF5] p-3 rounded-lg border-2 border-[#1E293B]">
                    {selectedWordPopup.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* INPUT KOSAKATA BARU (Fitur 4) - AI + MANUAL TABS */}
            <div className="bg-white border-3 border-[#1E293B] rounded-[24px] p-6 shadow-[8px_8px_0px_0px_#8B5CF6]">
              <h3 className="text-lg font-outfit font-black uppercase tracking-tight flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-[#8B5CF6]" /> 4. Tambah Kamus ({activeLang})
              </h3>

              {/* Mode Selector Tabs */}
              <div className="flex border-2 border-[#1E293B] rounded-xl overflow-hidden mb-5 bg-[#FFFDF5]">
                <button
                  type="button"
                  onClick={() => setVocabInputMode("ai")}
                  className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    vocabInputMode === "ai"
                      ? "bg-[#8B5CF6] text-white border-r-2 border-[#1E293B]"
                      : "text-[#1E293B] hover:bg-[#F1F5F9] border-r-2 border-[#1E293B]"
                  }`}
                >
                  ✨ AI Otomatis
                </button>
                <button
                  type="button"
                  onClick={() => setVocabInputMode("manual")}
                  className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    vocabInputMode === "manual"
                      ? "bg-[#8B5CF6] text-white"
                      : "text-[#1E293B] hover:bg-[#F1F5F9]"
                  }`}
                >
                  ✍️ Input Mandiri
                </button>
              </div>

              {/* TAB 1: AI AUTO VOCAB GENERATOR */}
              {vocabInputMode === "ai" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black tracking-wider text-[#1E293B] uppercase mb-1.5 flex items-center gap-1">
                      Ketik Frasa / Kata Bebas <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Kelinci, makan roti, lapar gila, rumah"
                        value={aiInputText}
                        onChange={(e) => setAiInputText(e.target.value)}
                        disabled={isGeneratingVocab}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAutoGenerateVocab();
                          }
                        }}
                        className="w-full bg-[#FFFDF5] border-2 border-[#1E293B] rounded-xl focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#8B5CF6] px-4 py-3 text-sm font-bold tracking-wide transition-all disabled:opacity-65"
                      />
                    </div>
                    <p className="text-[10px] font-bold text-[#64748B] mt-1.5 leading-normal">
                      Kirim kata dari bahasa asal (misal: Indonesia/Sunda/Jawa/dsb) maka LingoBuddy AI otomatis mendeteksi bahasa asal dan langsung membikinkan kosakata & tips mengingat lucu dalam bahasa <span className="text-[#8B5CF6] font-black underline">{activeLang}</span>!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoGenerateVocab}
                    disabled={isGeneratingVocab || !aiInputText.trim()}
                    className="w-full bg-[#8B5CF6] hover:bg-[#7c4df2] text-white font-black uppercase tracking-wider rounded-full border-2 border-[#1E293B] shadow-[4px_4px_0px_0px_#1E293B] hover:shadow-[5px_5px_0px_0px_#1E293B] hover:-translate-x-0.5 hover:-translate-y-0.5 py-3.5 px-4 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 flex items-center justify-center gap-2"
                  >
                    {isGeneratingVocab ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span>
                        Menerjemahkan & Membuat...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white" /> Deteksi & Buat Otomatis ✨
                      </>
                    )}
                  </button>

                  {/* PREVIEW OF LAST AI REQUISITION */}
                  {lastAiGeneratedWord && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#34D399]/10 border-2 border-[#34D399] rounded-2xl p-4 mt-4 shadow-[4px_4px_0px_0px_#34D399] relative"
                    >
                      <span className="absolute -top-3 -right-2 bg-[#34D399] text-white text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-[#1E293B] uppercase tracking-wide">
                        Ditambahkan! ✅
                      </span>
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-[#2bc48b] mb-1">
                        Dideteksi & Dibuat AI:
                      </h4>
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-base font-black text-[#1E293B]">
                          {lastAiGeneratedWord.target}
                        </span>
                        {lastAiGeneratedWord.script && (
                          <span className="text-[10px] font-black text-[#8B5CF6] bg-white px-2 py-0.5 rounded-full border-2 border-[#1E293B]">
                            {lastAiGeneratedWord.script}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#1E293B] mb-2">
                        Arti: <span className="bg-[#FBBF24] px-1.5 py-0.5 rounded border border-[#1E293B] font-black text-xs">{lastAiGeneratedWord.indo}</span>
                      </p>
                      <p className="text-[11px] font-bold text-[#64748B] leading-snug bg-[#FFFDF5] p-2.5 rounded-xl border border-[#34D399]/30 italic shadow-[2px_2px_0px_0px_#34D399]">
                        💡 Tips: {lastAiGeneratedWord.explanation}
                      </p>
                    </motion.div>
                  )}
                </div>
              )}

              {/* TAB 2: ORIGINAL MANUAL INPUT FORM */}
              {vocabInputMode === "manual" && (
                <form onSubmit={handleAddWord} className="space-y-4">
                  {/* Kata Asing */}
                  <div>
                    <label className="block text-xs font-black tracking-wider text-[#1E293B] uppercase mb-1.5">
                      Kata Target (Latin) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Neko / Dog / Gato"
                      value={inputTarget}
                      onChange={(e) => setInputTarget(e.target.value)}
                      className="w-full bg-[#FFFDF5] border-2 border-[#1E293B] rounded-xl focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#8B5CF6] px-4 py-3 text-sm font-bold tracking-wide transition-all"
                    />
                  </div>

                  {/* Script aksara asli */}
                  {(activeLang === "Japanese" || activeLang === "Korean") && (
                    <div>
                      <label className="block text-xs font-black tracking-wider text-[#1E293B] uppercase mb-1.5">
                        Aksara Asli ({activeLang === "Japanese" ? "Kanji/Kana" : "Hangul"})
                      </label>
                      <input
                        type="text"
                        placeholder={activeLang === "Japanese" ? "猫 / ねこ" : "고양이"}
                        value={inputScript}
                        onChange={(e) => setInputScript(e.target.value)}
                        className="w-full bg-[#FFFDF5] border-2 border-[#1E293B] rounded-xl focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#8B5CF6] px-4 py-3 text-sm font-bold tracking-wide transition-all"
                      />
                    </div>
                  )}

                  {/* Arti */}
                  <div>
                    <label className="block text-xs font-black tracking-wider text-[#1E293B] uppercase mb-1.5">
                      Arti Indonesia *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kucing"
                      value={inputIndo}
                      onChange={(e) => setInputIndo(e.target.value)}
                      className="w-full bg-[#FFFDF5] border-2 border-[#1E293B] rounded-xl focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#8B5CF6] px-4 py-3 text-sm font-bold tracking-wide transition-all"
                    />
                  </div>

                  {/* Kategori Selector */}
                  <div>
                    <label className="block text-xs font-black tracking-wider text-[#1E293B] uppercase mb-2">
                      Kategori Kosakata
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: "Hewan", label: "Hewan 🐱" },
                        { name: "Makanan", label: "Makanan 🍣" },
                        { name: "Perasaan", label: "Perasaan 😊" },
                        { name: "Sehari-hari", label: "Sehari🏠" }
                      ].map((cat) => (
                        <button
                          type="button"
                          key={cat.name}
                          onClick={() => setInputCategory(cat.name as any)}
                          className={`text-xs font-black uppercase py-2 px-1 rounded-lg border-2 border-[#1E293B] cursor-pointer transition-all ${
                            inputCategory === cat.name
                              ? "bg-[#FBBF24] text-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]"
                              : "bg-[#FFFDF5] text-[#1E293B] hover:bg-[#F1F5F9]"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="w-full bg-[#8B5CF6] hover:bg-[#7c4df2] text-white font-black uppercase tracking-wider rounded-full border-2 border-[#1E293B] shadow-[4px_4px_0px_0px_#1E293B] hover:shadow-[5px_5px_0px_0px_#1E293B] hover:-translate-x-0.5 hover:-translate-y-0.5 py-3.5 px-4 transition-all cursor-pointer"
                  >
                    Tambahkan Kosakata 📝
                  </button>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* --- FITUR 5: VOCAB FLASH CARDS VIEW --- */}
        <section className="bg-white border-3 border-[#1E293B] rounded-[32px] p-6 md:p-8 shadow-[12px_12px_0px_0px_#FBBF24] mb-10" id="cards-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
            <div>
              <h2 className="text-2xl font-outfit font-black uppercase tracking-tight flex items-center gap-2">
                📂 4. Galeri Kartu Kosakata ({activeLang})
              </h2>
              <p className="text-xs font-bold text-[#64748B] mt-1">
                Klik kartu untuk memutarnya dan melihat arti rahasia di baliknya!
              </p>
            </div>

            {/* Filter tags tab selector */}
            <div className="flex flex-wrap gap-2">
              {["Semua", "Hewan", "Makanan", "Perasaan", "Sehari-hari"].map((catName) => (
                <button
                  key={catName}
                  onClick={() => setActiveTabCategory(catName)}
                  className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full border-2 border-[#1E293B] cursor-pointer transition-all duration-100 ${
                    activeTabCategory === catName
                      ? "bg-[#FBBF24] text-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B] -translate-y-0.5"
                      : "bg-[#FFFDF5] text-[#1E293B] hover:bg-[#F1F5F9]"
                  }`}
                >
                  {catName}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar helper */}
          <div className="bg-[#FFFDF5] border-2 border-[#1E293B] rounded-2xl px-5 py-3.5 flex items-center gap-3 mb-6 shadow-[4px_4px_0px_0px_#1E293B]">
            <Search className="w-5 h-5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Cari kata target atau terjemahannya di sini..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent focus:outline-none w-full text-base font-bold placeholder-[#64748B] text-[#1E293B]"
            />
          </div>

          {/* Cards grid */}
          {filteredWords.length === 0 ? (
            <div className="text-center py-12 bg-[#FFFDF5] border-3 border-[#1E293B] border-dashed rounded-[32px]">
              <span className="text-4xl block mb-2 animate-bounce">🤷‍♂️</span>
              <p className="font-extrabold text-[#1E293B] text-lg">Opps, kosakata tidak ditemukan.</p>
              <p className="font-bold text-[#64748B] text-sm mt-1">Coba tambahkan kosakata baru atau ganti filter!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {filteredWords.map((word) => {
                const isFlipped = !!flippedCards[word.id];
                return (
                  <div
                    key={word.id}
                    onClick={() => toggleCard(word.id)}
                    className="relative h-48 cursor-pointer perspective-1000 group"
                  >
                    <div
                      className={`relative w-full h-full duration-500 transform-style-3d ${
                        isFlipped ? "rotate-y-180" : ""
                      }`}
                    >
                      {/* FRONT CARD (Target / Kanji / Script) */}
                      <div className="absolute w-full h-full backface-hidden bg-white border-3 border-[#1E293B] rounded-2xl shadow-[6px_6px_0px_0px_#1E293B] group-hover:shadow-[8px_8px_0px_0px_#1E293B] p-5 flex flex-col justify-between transition-all">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border-2 border-[#1E293B] bg-[#FFF3CD]">
                            {word.category}
                          </span>
                          <span className="text-xl">
                            {word.category === "Hewan" ? "🐱" : word.category === "Makanan" ? "🍣" : word.category === "Perasaan" ? "😊" : "🏠"}
                          </span>
                        </div>
                        <div className="text-center pb-2">
                          <h4 className="text-2xl font-outfit font-black text-[#1E293B] tracking-tight truncate">
                            {formatWordText(word)}
                          </h4>
                          {word.script && word.language !== "Japanese" && (
                            <p className="text-xs font-bold text-[#8B5CF6] uppercase tracking-wide mt-1 bg-[#8B5CF6]/10 px-2 py-0.5 rounded-full inline-block border border-[#8B5CF6]/20">{word.script}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-black text-[#64748B] border-t-2 border-[#1E293B] pt-2 mb-1">
                          <span className="tracking-widest uppercase text-[#8B5CF6]">CLICK TO FLIP</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              speakWord(word.target, word.language);
                            }}
                            className="p-1 hover:bg-[#F1F5F9] rounded border border-transparent hover:border-[#1E293B] transition-colors"
                            title="Suarakan kata"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* BACK CARD (Indonesian meaning & tips) */}
                      <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-[#FFFDF5] border-3 border-[#1E293B] rounded-2xl shadow-[6px_6px_0px_0px_#F472B6] p-5 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-[10px] font-black">
                          <span className="text-pink-600 tracking-wide uppercase">ARTI / PENJELASAN</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWord(word.id, word.target);
                            }}
                            className="bg-red-50 hover:bg-red-100 border-2 border-red-300 hover:border-red-600 text-red-600 rounded p-1 cursor-pointer transition-colors"
                            title="Hapus kata dari kamus"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-center my-auto px-1">
                          <h4 className="font-outfit font-black text-xl text-pink-600 truncate mb-1">
                            {word.indo}
                          </h4>
                          <p className="text-[11px] font-bold text-[#64748B] leading-snug line-clamp-3">
                            {word.explanation}
                          </p>
                        </div>
                        <span className="text-[9px] font-black tracking-widest text-[#64748B] text-center border-t-2 border-[#1E293B] pt-1">
                          LingoBuddy Premium
                        </span>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* --- FITUR 8: INTERACTIVE MULTI-MODE MINI-GAME ARENA --- */}
        <section className="bg-white border-3 border-[#1E293B] rounded-[32px] p-6 md:p-8 shadow-[12px_12px_0px_0px_#34D399] relative overflow-hidden mb-10" id="adventure-game">
          
          {/* Confetti canvas */}
          {((activeMiniGame === "adventure" && gameStep === 4 && gameScore === 3) || (activeMiniGame === "connect" && connectWin) || (activeMiniGame === "scramble" && scrambleWin)) && (
            <canvas ref={canvasRef} className="absolute inset-0 z-20 pointer-events-none" />
          )}

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-[#1E293B]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#34D399] text-white py-1.5 px-4 rounded-full font-black text-xs border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B] w-max uppercase tracking-wider">
                Mini-Game Seru
              </span>
              <h2 className="text-xl md:text-2xl font-outfit font-black text-[#1E293B] uppercase tracking-tight flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-[#8B5CF6]" />
                Arena Bermain LingoBuddy
              </h2>
            </div>

            {/* NEOPUTALIST GAME SELECTOR TABS */}
            <div className="flex flex-wrap bg-[#F1F5F9] border-2 border-[#1E293B] rounded-2xl p-1 gap-1 w-full xl:w-auto shadow-[3px_3px_0px_0px_#1E293B]">
              <button
                onClick={() => {
                  setActiveMiniGame("adventure");
                  restartGame();
                }}
                className={`flex-1 xl:flex-initial px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                  activeMiniGame === "adventure"
                    ? "bg-[#8B5CF6] text-white border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B] -translate-y-0.5"
                    : "text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                🎮 Adventure
              </button>
              <button
                onClick={() => {
                  setActiveMiniGame("connect");
                  startConnectGame();
                }}
                className={`flex-1 xl:flex-initial px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                  activeMiniGame === "connect"
                    ? "bg-[#F472B6] text-white border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B] -translate-y-0.5"
                    : "text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                🔗 Sambung Kata
              </button>
              <button
                onClick={() => {
                  setActiveMiniGame("scramble");
                  startScrambleGame();
                }}
                className={`flex-1 xl:flex-initial px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                  activeMiniGame === "scramble"
                    ? "bg-amber-400 text-[#1E293B] border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B] -translate-y-0.5"
                    : "text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                🧩 Susun Kalimat
              </button>
            </div>
          </div>

          {/* GAME 1: BRANCHING ADVENTURE */}
          {activeMiniGame === "adventure" && (
            <div>
              {gameStep === 0 && (
                <div className="text-center py-6">
                  <div className="flex justify-center mb-5 animate-emoji-bounce">
                    <div className="bg-[#8B5CF6] text-white p-5 rounded-full border-3 border-[#1E293B] shadow-[4px_4px_0px_0px_#1E293B]">
                      <Map className="w-12 h-12" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-outfit font-black uppercase mb-3 text-[#1E293B]">Tantangan Petualangan LingoBuddy!</h3>
                  <p className="max-w-xl mx-auto text-sm font-bold text-[#64748B] mb-6 leading-relaxed">
                    Ikuti kisah petualangan LingoBuddy dan pilih jawaban yang tepat untuk membantunya keluar selamat. Bisakah kamu melampaui rintangan dengan skor sempurna 3/3?
                  </p>
                  <button
                    onClick={startGame}
                    className="bg-[#34D399] hover:bg-[#28b37f] text-white font-black uppercase tracking-wider rounded-full border-2 border-[#1E293B] shadow-[5px_5px_0px_0px_#1E293B] hover:shadow-[6px_6px_0px_0px_#1E293B] hover:-translate-x-0.5 hover:-translate-y-0.5 py-3.5 px-10 transition-all cursor-pointer"
                  >
                    Mulai Petualangan 🚀
                  </button>
                </div>
              )}

              {gameStep >= 1 && gameStep <= 3 && (
                <div>
                  <div className="flex justify-between items-center text-xs font-black text-[#64748B] mb-3 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-[#1E293B]">
                      <Target className="w-4 h-4 text-[#8B5CF6]" />
                      Rintangan Ke-{gameStep} dari 3
                    </span>
                    <span className="bg-[#8B5CF6] text-white px-3.5 py-1.5 rounded-full border-2 border-[#1E293B] font-black text-xs shadow-[2px_2px_0px_0px_#1E293B] flex items-center gap-1.5">
                      ⭐ Skor Kamu: {gameScore}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-4 border-2 border-[#1E293B] rounded-full mb-6">
                    <div
                      className="bg-[#34D399] h-full rounded-full border-r-2 border-[#1E293B]"
                      style={{ width: `${(gameStep / 3) * 100}%` }}
                    />
                  </div>

                  {(() => {
                    const activeQuestion = currentGameQuestions && currentGameQuestions[gameStep - 1]
                      ? currentGameQuestions[gameStep - 1]
                      : { type: "translate-id", question: "Mengacak kembali rintangan untukmu...", choices: [] };
                    return (
                      <>
                        <div className="flex flex-col mb-4">
                          {activeQuestion.type === "translate-id" && (
                            <span className="flex items-center gap-1.5 bg-[#8B5CF6]/10 text-[#8B5CF6] border-2 border-[#8B5CF6]/30 px-3.5 py-1 rounded-full text-xs font-black uppercase w-max tracking-wider">
                              <Compass className="w-3.5 h-3.5" /> Terjemahan Bahasa Indonesia
                            </span>
                          )}
                          {activeQuestion.type === "translate-lang" && (
                            <span className="flex items-center gap-1.5 bg-[#F472B6]/10 text-pink-600 border-2 border-[#F472B6]/30 px-3.5 py-1 rounded-full text-xs font-black uppercase w-max tracking-wider">
                              <Languages className="w-3.5 h-3.5" /> Terjemahan Kata Asing
                            </span>
                          )}
                          {activeQuestion.type === "riddle" && (
                            <span className="flex items-center gap-1.5 bg-[#FBBF24]/10 text-yellow-700 border-2 border-[#FBBF24]/30 px-3.5 py-1 rounded-full text-xs font-black uppercase w-max tracking-wider font-outfit">
                              <HelpCircle className="w-3.5 h-3.5" /> Kuis Tebak Deskripsi LingoBuddy
                            </span>
                          )}
                        </div>

                        <div className="bg-[#FFFDF5] border-2 border-[#1E293B] rounded-[24px] p-6 mb-4 shadow-[5px_5px_0px_0px_#1E293B]">
                          <h4 className="text-base md:text-lg font-bold leading-relaxed text-[#1E293B]">
                            {activeQuestion.question}
                          </h4>
                        </div>

                        {/* HINT BUTTON FOR ADVENTURE GAME */}
                        <div className="flex justify-end mb-4">
                          <button
                            onClick={() => {
                              if (showAdventureHint) {
                                triggerToast("Kunci jawaban sudah dibocorkan! 😉");
                                return;
                              }
                              if (spendCoins(10)) {
                                setShowAdventureHint(true);
                                triggerToast("Bocoran diaktifkan! Cari tombol hijau bercahaya ✨");
                              }
                            }}
                            className={`flex items-center gap-1.5 py-1.5 px-4.5 rounded-xl border-2 border-[#1E293B] font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                              showAdventureHint
                                ? "bg-slate-200 text-slate-500 border-slate-300 shadow-none cursor-default"
                                : "bg-[#FBBF24] hover:bg-[#FCD34D] text-[#1E293B] shadow-[2.5px_2.5px_0px_0px_#1E293B] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                            }`}
                          >
                            <span>💡 Kunci Jawaban (10 Koin)</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {activeQuestion.choices.map((choice: any, i: number) => {
                            const isHinted = showAdventureHint && choice.correct;
                            return (
                              <button
                                key={i}
                                onClick={() => handleSelectGameAnswer(choice.text, choice.correct)}
                                className={`border-2 border-[#1E293B] rounded-2xl py-4.5 px-4 font-black text-center transition-all cursor-pointer text-sm md:text-base active:translate-y-0.5 text-[#1E293B] ${
                                  isHinted
                                    ? "bg-emerald-100 border-[#10B981] text-emerald-900 shadow-[4px_4px_0px_0px_#10B981] scale-[1.03] ring-4 ring-emerald-300/30 animate-pulse"
                                    : "bg-white hover:bg-[#FBBF24] hover:shadow-[4px_4px_0px_0px_#1E293B] hover:-translate-y-0.5"
                                }`}
                              >
                                {isHinted ? `✨ ${choice.text} ✨` : choice.text}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {gameStep === 4 && (
                <div className="text-center py-6 relative z-30">
                  {gameScore === 3 ? (
                    <div className="flex justify-center mb-5">
                      <div className="bg-[#34D399] text-white p-5 rounded-full border-3 border-[#1E293B] shadow-[5px_5px_0px_0px_#1E293B] relative animate-emoji-bounce">
                        <Trophy className="w-14 h-14 text-yellow-300 fill-yellow-300" />
                        <div className="absolute -top-1 -right-1 bg-yellow-400 border border-black p-1 rounded-full">
                          <Star className="w-4.5 h-4.5 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center mb-5">
                      <div className="bg-[#8B5CF6] text-white p-5 rounded-full border-3 border-[#1E293B] shadow-[5px_5px_0px_0px_#1E293B] relative animate-emoji-bounce">
                        <GraduationCap className="w-14 h-14 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <h3 className="text-3xl font-outfit font-black uppercase mb-2">Petualangan Berakhir!</h3>
                  <p className="text-lg font-bold text-[#1E293B] mb-4">
                    Kamu menjawab dengan benar <span className="text-[#8B5CF6] text-2xl font-black">{gameScore}</span> dari 3 pertanyaan!
                  </p>

                  {gameScore === 3 ? (
                    <div className="bg-[#34D399]/10 border-2 border-[#34D399] rounded-2xl p-5 max-w-md mx-auto mb-6 shadow-[4px_4px_0px_0px_#34D399]">
                      <p className="text-sm font-black text-[#34D399] uppercase tracking-wide mb-1 flex items-center justify-center gap-1.5">
                        <Star className="w-4 h-4 fill-[#34D399]" /> LUAR BIASA PERFECT! <Star className="w-4 h-4 fill-[#34D399]" />
                      </p>
                      <p className="text-xs text-[#1E293B] font-bold leading-relaxed">
                        LingoBuddy menari-nari gembira karena jawaban cerdasmu! Anda mendapatkan Badge Kehormatan Mingguan!
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B] font-bold mb-6">
                      Ayo coba lagi untuk melatih kefasihan kosakata barumu! Setiap percobaan membuat ingatanmu makin kuat.
                    </p>
                  )}

                  <div className="flex justify-center gap-3">
                    <button
                      onClick={startGame}
                      className="bg-[#34D399] text-white font-black uppercase tracking-wider rounded-full border-2 border-[#1E293B] shadow-[4px_4px_0px_0px_#1E293B] hover:shadow-[5px_5px_0px_0px_#1E293B] hover:-translate-x-0.5 hover:-translate-y-0.5 py-3.5 px-8 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Ulangi Main Game
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GAME 2: DRAG & DROP CONNECT MATCHING */}
          {activeMiniGame === "connect" && (
            <div>
              {connectWin ? (
                <div className="text-center py-8 relative z-30">
                  <div className="flex justify-center mb-5">
                    <div className="bg-[#F472B6] text-white p-5 rounded-full border-3 border-[#1E293B] shadow-[5px_5px_0px_0px_#1E293B] relative animate-emoji-bounce">
                      <Trophy className="w-14 h-14 text-yellow-300 fill-yellow-300" />
                      <div className="absolute -top-1 -right-1 bg-yellow-400 border border-black p-1 rounded-full">
                        <Star className="w-4.5 h-4.5 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-3xl font-outfit font-black uppercase mb-2 text-[#1E293B]">Sempurna Terhubung!</h3>
                  <p className="text-lg font-bold text-[#1E293B] mb-5">
                    Kamu berhasil menyambungkan seluruh kosakata bahasa <span className="text-[#8B5CF6] font-black underline decoration-4 decoration-[#FBBF24]">{activeLang}</span> dengan sempurna! 🌟
                  </p>

                  <div className="bg-[#F472B6]/10 border-2 border-[#F472B6] rounded-2xl p-5 max-w-md mx-auto mb-6 shadow-[4px_4px_0px_0px_#F472B6]">
                    <p className="text-sm font-black text-pink-600 uppercase tracking-wide mb-1">🔥 MAESTRO KOSAKATA! 🔥</p>
                    <p className="text-xs text-[#1E293B] font-bold leading-relaxed">
                      Luar biasa, kemampuan visualisasi spasial dan ingatan bahasa asingmu teruji sangat kuat!
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={startConnectGame}
                      className="bg-[#F472B6] hover:bg-[#e05697] text-white font-black uppercase tracking-wider rounded-full border-2 border-[#1E293B] shadow-[4px_4px_0px_0px_#1E293B] hover:shadow-[5px_5px_0px_0px_#1E293B] hover:-translate-x-0.5 hover:-translate-y-0.5 py-3.5 px-8 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Main Lagi (Kocok Ulang)
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-[#FFFDF5] border-2 border-[#1E293B] rounded-[24px] p-5 mb-6 shadow-[4px_4px_0px_0px_#1E293B]">
                    <h4 className="text-sm md:text-base font-black text-[#1E293B] mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                      <Compass className="w-4.5 h-4.5 text-[#8B5CF6]" />
                      Instruksi Bermain:
                    </h4>
                    <p className="text-xs md:text-sm text-[#64748B] font-bold leading-relaxed">
                      Hubungkan kata asing di bagian kiri dengan arti Indonesianya yang tepat di sebelah kanan! Caranya:
                      <br /> 
                      1. <span className="text-[#8B5CF6] font-black">Seret & Jatuhkan (Drag & Drop)</span> kartu kata kiri menuju slot kosong kanan yang sesuai, ATAU
                      <br />
                      2. <span className="text-[#F472B6] font-black">Klik kartu kiri</span> hingga menyala, lalu <span className="text-[#F472B6] font-black">klik slot kosong kanan</span> untuk menyambungkannya!
                    </p>
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-black text-[#64748B] uppercase mb-4 tracking-wider gap-2">
                    <span>Kemajuan Sambungan</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={triggerConnectHint}
                        className="bg-[#FCD34D] hover:bg-yellow-400 text-[#1E293B] font-black uppercase text-[10px] tracking-wider px-3.5 py-1.5 rounded-xl border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer mr-1"
                        title="Buka 1 sambungan benar secara acak menggunakan koin"
                      >
                        💡 Sambungkan 1 Kata (8 Koin)
                      </button>
                      <span className="bg-[#F472B6] text-white px-3 py-1.5 rounded-full border-2 border-[#1E293B] font-black shadow-[2px_2px_0px_0px_#1E293B]">
                        Tersambung: {connectedPairs.length} / 4
                      </span>
                    </div>
                  </div>

                  {/* Columns Matching Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    
                    {/* LEFT COLUMN: SOURCES (Foreign Words) */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-[#64748B] tracking-wider px-1">Kosakata ({activeLang})</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {connectSources.map((word) => {
                          const isMatched = connectedPairs.includes(word.id);
                          const isClicked = selectedSourceId === word.id;
                          
                          return (
                            <div
                              key={word.id}
                              draggable={!isMatched}
                              onDragStart={() => handleDragStartConnect(word.id)}
                              onClick={() => handleSourceClick(word.id)}
                              className={`border-3 rounded-2xl p-4.5 flex items-center justify-between transition-all select-none relative ${
                                isMatched
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 opacity-60 cursor-default"
                                  : isClicked
                                  ? "bg-[#F3E8FF] border-[#8B5CF6] text-[#8B5CF6] translate-x-1 shadow-[3px_3px_0px_0px_#1E293B] cursor-pointer animate-pulse-soft"
                                  : "bg-white border-[#1E293B] hover:bg-[#FFFDF5] hover:shadow-[4px_4px_0px_0px_#1E293B] active:translate-y-0.5 cursor-grab"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">
                                  {isMatched ? "✓" : "⚡"}
                                </span>
                                <div>
                                  <h5 className="font-outfit font-black text-base text-[#1E293B]">
                                    {word.target} {word.script && `(${word.script})`}
                                  </h5>
                                </div>
                              </div>
                              
                              {isMatched ? (
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded border border-emerald-300">Cocok</span>
                              ) : (
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded inline-flex items-center gap-1">
                                  {isClicked ? "MEMILIH" : "DRAG / KLIK"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: TARGET DROP ZONES (Indonesian Artises) */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-[#64748B] tracking-wider px-1">Arti (Indonesian)</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {connectTargets.map((target) => {
                          const isMatched = connectedPairs.includes(target.id);
                          const isWrongMatch = connectWrongId === target.id;
                          const matchedWord = connectSources.find((s) => s.id === target.id);

                          return (
                            <div
                              key={target.id}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDropConnect(target.id)}
                              onClick={() => handleDropConnect(target.id)}
                              className={`border-3 rounded-2xl p-4.5 transition-all relative flex flex-col justify-center min-h-[72px] cursor-pointer ${
                                isMatched
                                  ? "bg-emerald-50 border-emerald-500 shadow-[2px_2px_0px_0px_#10B981]"
                                  : isWrongMatch
                                  ? "bg-red-50 border-red-500 text-red-700 animate-shake shadow-[2px_2px_0px_0px_#EF4444]"
                                  : selectedSourceId
                                  ? "bg-pink-50/50 border-dashed border-[#F472B6] hover:bg-pink-50 shadow-[3px_3px_0px_0px_#1E293B]"
                                  : "bg-white border-[#1E293B] hover:bg-slate-50 shadow-[2px_2px_0px_0px_#1E293B]"
                              }`}
                            >
                              {isMatched ? (
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <span className="text-[10px] font-black tracking-wider uppercase text-emerald-600 block mb-0.5">TERHUBUNG</span>
                                    <h5 className="font-outfit font-black text-base text-emerald-800">{target.indo}</h5>
                                  </div>
                                  <div className="bg-[#1E293B] text-emerald-400 font-extrabold text-xs px-3 py-1.5 rounded-lg border border-emerald-500 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#1E293B]">
                                    <span>{matchedWord?.target}</span>
                                    {matchedWord?.script && <span className="opacity-75">({matchedWord?.script})</span>}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <h5 className="font-outfit font-black text-base text-[#1E293B]">{target.indo}</h5>
                                    <p className="text-[10px] text-[#64748B] font-bold">
                                      {isWrongMatch ? "❌ Kurang tepat!" : selectedSourceId ? "🎯 Klik di sini untuk mencocokkan!" : "Drop kosa kata yang cocok ke sini"}
                                    </p>
                                  </div>
                                  
                                  {isWrongMatch && (
                                    <span className="text-xs font-black bg-red-100 text-red-600 border border-red-300 px-2 py-0.5 rounded animate-bounce">Salah</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* GAME 3: SUSUN KALIMAT (SCRAMBLE SENTENCE BUILDER) */}
          {activeMiniGame === "scramble" && (
            <div>
              {scrambleWin ? (
                <div className="text-center py-8 relative z-30">
                  <div className="flex justify-center mb-5">
                    <div className="bg-amber-400 text-[#1E293B] p-5 rounded-full border-3 border-[#1E293B] shadow-[5px_5px_0px_0px_#1E293B] relative animate-emoji-bounce">
                      <Trophy className="w-14 h-14 text-[#1E293B] fill-[#1E293B]" />
                      <div className="absolute -top-1 -right-1 bg-emerald-400 border border-black p-1 rounded-full animate-pulse">
                        <Check className="w-4.5 h-4.5 text-white" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-outfit font-black uppercase text-[#1E293B] mb-2 leading-none">Raja Susun Kalimat! 👑</h3>
                  <p className="text-sm font-bold text-[#64748B] max-w-md mx-auto mb-6 uppercase tracking-wide leading-relaxed">
                    Kamu berhasil menyusun seluruh materi kalimat bahasa <span className="text-[#8B5CF6] font-black underline decoration-4 decoration-[#FBBF24]">{activeLang}</span> dengan sempurna! 🎉
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <button
                      onClick={startScrambleGame}
                      className="bg-[#34D399] hover:bg-[#2bc28a] text-[#1E293B] font-black uppercase tracking-wider py-3.5 px-8 rounded-2xl border-2 border-[#1E293B] shadow-[4px_4px_0px_0px_#1E293B] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer text-xs font-bold"
                    >
                      Bermain Lagi 🔁
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Score & Progress */}
                  <div className="flex justify-between items-center bg-[#FFFDF5] border-2 border-[#1E293B] px-5 py-3 rounded-2xl shadow-[3px_3px_0px_0px_#1E293B]">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-[#1E293B] tracking-wider uppercase">Tantangan:</span>
                      <span className="font-extrabold text-[#8B5CF6] text-xs bg-[#8B5CF6]/10 px-2.5 py-0.5 border border-[#8B5CF6]/20 rounded-full">
                        {scrambleRound + 1} dari {scrambleChallenges.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-[#1E293B] tracking-wider uppercase">Skor:</span>
                      <span className="font-black text-emerald-600 text-xs md:text-sm">{scrambleScore * 20} XP ⭐</span>
                    </div>
                  </div>

                  {scrambleChallenges[scrambleRound] && (
                    <div className="space-y-6">
                      {/* Indonesian Guide translation phrase */}
                      <div className="bg-[#8B5CF6] border-3 border-[#1E293B] rounded-2xl p-5 shadow-[4px_4px_0px_0px_#1E293B] text-white">
                        <span className="text-[9px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded border border-white/30 block mb-2 w-max">Terjemahkan Kalimat Ini:</span>
                        <h4 className="font-outfit font-black text-base md:text-lg leading-snug">
                          &ldquo;{scrambleChallenges[scrambleRound].indo}&rdquo;
                        </h4>
                      </div>

                      {/* User's assembled Sentence (Target Field) */}
                      <div className={`bg-[#FFFDF5] border-3 border-dashed rounded-3xl p-5 min-h-[96px] relative flex flex-wrap gap-2 items-center transition-colors ${
                        scrambleWrong 
                          ? "border-red-500 bg-red-50/50 animate-shake" 
                          : scrambleSelected.length > 0 
                          ? "border-[#8B5CF6] bg-white transition-all shadow-[inner_3px_3px_0px_rgba(0,0,0,0.05)]" 
                          : "border-slate-300"
                      }`}>
                        {scrambleSelected.length === 0 && (
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mx-auto text-center pointer-events-none select-none py-2 px-4 leading-relaxed">
                            Pilih kata-kata dari kolam di bawah dengan urutan yang benar untuk merangkai kalimat!
                          </p>
                        )}

                        {scrambleSelected.map((word, index) => (
                          <button
                            key={`${word}-${index}`}
                            onClick={() => deselectScrambleWord(word, index)}
                            className="bg-white hover:bg-slate-50 border-2 border-[#1E293B] font-bold text-xs px-3 py-2 rounded-xl shadow-[2px_2px_0px_0px_#1E293B] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer text-[#1E293B]"
                          >
                            {word}
                          </button>
                        ))}
                      </div>

                      {/* Scrambled Pool of choices */}
                      <div className="space-y-2.5">
                        <h5 className="text-[11px] font-black uppercase text-[#64748B] tracking-wider px-1">Kolam Kata:</h5>
                        <div className="flex flex-wrap gap-2 min-h-[80px] bg-[#FFFDF5] border-2 border-dashed border-[#CBD5E1] p-4 rounded-2xl items-center justify-center">
                          {scramblePool.length === 0 && scrambleSelected.length > 0 && (
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest mx-auto my-auto animate-pulse flex items-center gap-1.5">
                              <Check className="w-4 h-4 bg-emerald-100 border border-emerald-300 p-0.5 rounded-full" /> Kalimat Terangkai! Klik Periksa Jawaban 🚀
                            </span>
                          )}

                          {scramblePool.map((word, index) => (
                            <button
                              key={`${word}-${index}`}
                              onClick={() => selectScrambleWord(word, index)}
                              className="bg-white hover:bg-amber-100 border-2 border-[#1E293B] font-bold text-xs px-3 py-2 rounded-xl shadow-[2px_2px_0px_0px_#1E293B] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer text-[#1E293B]"
                            >
                              {word}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Hint & Controls Row */}
                      <div className="flex flex-col sm:flex-row justify-between items-center bg-[#FFFDF5] border-2 border-dashed border-[#CBD5E1] p-3.5 rounded-2xl gap-3">
                        <span className="text-[10px] font-black uppercase text-[#64748B] flex items-center gap-1.5 leading-none">
                          🔑 Terjebak dalam urutan kata?
                        </span>
                        <button
                          onClick={triggerScrambleHint}
                          className="bg-[#FCD34D] hover:bg-yellow-400 text-[#1E293B] font-black uppercase text-[10px] tracking-wider px-4 py-2 rounded-xl border-2 border-[#1E293B] shadow-[2.5px_2.5px_0px_0px_#1E293B] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
                          title="Buka bocoran kata berikutnya secara terurut menggunakan koin"
                        >
                          <span>💡 Bocorkan Kata Berikutnya (5 Koin)</span>
                        </button>
                      </div>

                      {/* Controls toolbar */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={resetScrambleSentence}
                          disabled={scrambleSelected.length === 0}
                          className={`py-3.5 px-4 font-black uppercase tracking-wider text-xs border-2 border-[#1E293B] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            scrambleSelected.length === 0
                              ? "bg-slate-100 text-slate-400 border-slate-300 shadow-none cursor-not-allowed"
                              : "bg-[#F472B6] text-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                          }`}
                        >
                          <RotateCcw className="w-4 h-4" /> Ulangi Kalimat
                        </button>
                        <button
                          onClick={checkScrambleAnswer}
                          disabled={scrambleSelected.length === 0}
                          className={`py-3.5 px-4 font-black uppercase tracking-wider text-xs border-2 border-[#1E293B] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            scrambleSelected.length === 0
                              ? "bg-slate-100 text-slate-400 border-slate-300 shadow-none cursor-not-allowed"
                              : "bg-[#34D399] text-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                          }`}
                        >
                          <Check className="w-4 h-4" /> Periksa Jawaban
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

      </div>

      {/* --- EXTRA: GAME-RELATED AUTHENTICATION & PROFILE MANAGERS --- */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 bg-[#1E293B]/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="bg-[#FFFDF5] border-3 border-[#1E293B] rounded-[32px] p-6 md:p-8 w-full max-w-md shadow-[10px_10px_0px_0px_#1E293B] relative"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  playSFX("click");
                  setShowAuthModal(false);
                }}
                className="absolute top-4 right-4 w-8 h-8 bg-white hover:bg-red-500 hover:text-white border-2 border-[#1E293B] rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition-colors shadow-[2px_2px_0px_0px_#1E293B] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
              >
                ✕
              </button>

              <div className="text-center mb-6">
                <div className="inline-block bg-[#8B5CF6] text-white p-2.5 rounded-2xl border-2 border-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B] mb-2.5">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-outfit font-black uppercase text-[#1E293B]">Akun LingoBuddy</h3>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1">Simpan perkembangamu & dapatkan XP!</p>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-white border-2 border-[#1E293B] rounded-xl mb-6 shadow-[2px_2px_0px_0px_#1E293B]">
                <button
                  type="button"
                  onClick={() => {
                    playSFX("click");
                    setAuthTab("login");
                    setAuthError("");
                  }}
                  className={`py-2 text-xs font-black uppercase rounded-lg transition-colors cursor-pointer ${
                    authTab === "login"
                      ? "bg-[#8B5CF6] text-white"
                      : "text-[#1E293B] hover:bg-[#FFFDF5]"
                  }`}
                >
                  Masuk (Login)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSFX("click");
                    setAuthTab("register");
                    setAuthError("");
                  }}
                  className={`py-2 text-xs font-black uppercase rounded-lg transition-colors cursor-pointer ${
                    authTab === "register"
                      ? "bg-[#8B5CF6] text-white"
                      : "text-[#1E293B] hover:bg-[#FFFDF5]"
                  }`}
                >
                  Daftar Baru
                </button>
              </div>

              {authError && (
                <div className="bg-red-100 border-2 border-red-500 text-red-700 text-xs font-bold p-3 rounded-xl mb-4 text-center animate-bounce">
                  ⚠️ {authError}
                </div>
              )}

              {authTab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Email / Username</label>
                    <input
                      type="text"
                      placeholder="Masukkan email atau nama panggilan..."
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-white border-2 border-[#1E293B] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow-[2px_2px_0px_0px_#1E293B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="Masukkan sandi..."
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-white border-2 border-[#1E293B] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow-[2px_2px_0px_0px_#1E293B]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#34D399] hover:bg-[#2bc28a] text-[#1E293B] py-3 border-2 border-[#1E293B] rounded-xl font-outfit font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#1E293B] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none text-xs cursor-pointer bt-neobrutal"
                  >
                    Masuk Sekarang 🔓
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Nama Panggilan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Mushoffal"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      maxLength={15}
                      className="w-full bg-white border-2 border-[#1E293B] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow-[2px_2px_0px_0px_#1E293B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="Contoh: mushoffal@gmail.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-white border-2 border-[#1E293B] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow-[2px_2px_0px_0px_#1E293B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-1">Password (Min. 4 Karakter)</label>
                    <input
                      type="password"
                      placeholder="Sandi rahasia..."
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-white border-2 border-[#1E293B] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow-[2px_2px_0px_0px_#1E293B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#1E293B] uppercase tracking-wider mb-2">Pilih Avatar Kece</label>
                    <div className="grid grid-cols-6 gap-2">
                      {["🐱", "🦊", "🐼", "owl", "🦁", "🥑"].map((av) => {
                        const avatarChar = av === "owl" ? "🦉" : av;
                        return (
                          <button
                            type="button"
                            key={av}
                            onClick={() => {
                              playSFX("click");
                              setSelectedAvatar(avatarChar);
                            }}
                            className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg cursor-pointer transition-all ${
                              selectedAvatar === avatarChar
                                ? "bg-[#FFFDF5] border-[#8B5CF6] shadow-[2px_2px_0px_0px_#8B5CF6] scale-105"
                                : "bg-white border-[#1E293B] hover:bg-[#FFFDF5]"
                            }`}
                          >
                            {avatarChar}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#fcd34d] hover:bg-[#f59e0b] text-[#1E293B] py-3 border-2 border-[#1E293B] rounded-xl font-outfit font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#1E293B] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none text-xs cursor-pointer bt-neobrutal"
                  >
                    Daftar Sekarang 🎉
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileModal && currentUser && (
          <div className="fixed inset-0 bg-[#1E293B]/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="bg-[#FFFDF5] border-3 border-[#1E293B] rounded-[32px] p-6 w-full max-w-md shadow-[10px_10px_0px_0px_#1E293B] relative flex flex-col max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  playSFX("click");
                  setShowProfileModal(false);
                }}
                className="absolute top-4 right-4 w-8 h-8 bg-white hover:bg-pink-500 hover:text-white border-2 border-[#1E293B] rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition-colors shadow-[2px_2px_0px_0px_#1E293B] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
              >
                ✕
              </button>

              <div className="text-center mb-5 shrink-0">
                <div className="relative inline-block mb-2">
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-[#1E293B] flex items-center justify-center text-4xl shadow-[3px_3px_0px_0px_#1E293B] hover:rotate-6 transition-transform">
                    {currentUser.avatar}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-[#8B5CF6] text-white text-[9px] font-black uppercase px-2 py-0.5 border-2 border-[#1E293B] rounded-full shadow-[1px_1px_0px_0px_#1E293B]">
                    LVL {currentUser.xp >= 600 ? "4" : currentUser.xp >= 300 ? "3" : currentUser.xp >= 100 ? "2" : "1"}
                  </div>
                </div>
                <h4 className="text-lg font-outfit font-black text-[#1E293B] tracking-tight leading-none">{currentUser.username}</h4>
                <div className="inline-block bg-[#FBBF24] text-[#1E293B] font-extrabold text-[9px] uppercase tracking-wider px-3 py-0.5 border border-[#1E293B] rounded-full mt-1.5 shadow-[1px_1px_0px_0px_#1E293B]">
                  {getXPLevel(currentUser.xp)}
                </div>
              </div>

              {/* Subtabs for Statistik vs Riwayat Belajar */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-white border-2 border-[#1E293B] rounded-xl mb-5 shadow-[2px_2px_0px_0px_#1E293B] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playSFX("click");
                    setProfileTab("stats");
                  }}
                  className={`py-2 text-[11px] font-black uppercase rounded-lg transition-colors cursor-pointer ${
                    profileTab === "stats"
                      ? "bg-[#8B5CF6] text-white"
                      : "text-[#1E293B] hover:bg-[#FFFDF5]"
                  }`}
                >
                  📊 Statistik
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSFX("click");
                    setProfileTab("activities");
                  }}
                  className={`py-2 text-[11px] font-black uppercase rounded-lg transition-colors cursor-pointer ${
                    profileTab === "activities"
                      ? "bg-[#8B5CF6] text-white"
                      : "text-[#1E293B] hover:bg-[#FFFDF5]"
                  }`}
                >
                  🚀 Riwayat ({currentUser.history?.length || 0})
                </button>
              </div>

              {/* Tab Contents (Scrollable Container) */}
              <div className="flex-1 overflow-y-auto pr-1 min-h-[220px] max-h-[355px] mb-5">
                {profileTab === "stats" ? (
                  <div className="space-y-4">
                    {/* Stats Box */}
                    <div className="bg-white border-2 border-[#1E293B] rounded-2xl p-4 shadow-[2px_2px_0px_0px_#1E293B] space-y-2.5">
                      <div className="flex justify-between items-center text-xs border-b border-[#E2E8F0] pb-2">
                        <span className="font-bold text-[#64748B] uppercase tracking-wider">Total Skor</span>
                        <span className="font-black text-[#8B5CF6] text-xs md:text-sm">{currentUser.xp} XP ⭐</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-[#E2E8F0] pb-2">
                        <span className="font-bold text-[#64748B] uppercase tracking-wider">Hari Belajar</span>
                        <span className="font-black text-rose-500 text-xs md:text-sm">{streak} Hari Streak 🔥</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-[#E2E8F0] pb-2">
                        <span className="font-bold text-[#64748B] uppercase tracking-wider">Koin Pintar</span>
                        <span className="font-black text-amber-500 text-xs md:text-sm">{(currentUser.coins !== undefined ? currentUser.coins : 50)} Koin 🪙</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#64748B] uppercase tracking-wider">Daftar Sejak</span>
                        <span className="font-bold text-[#1E293B] text-xs">{currentUser.createdAt || "Baru saja"}</span>
                      </div>
                    </div>

                    {/* XP Target Progress */}
                    <div>
                      <div className="flex justify-between text-[9px] font-black uppercase text-[#64748B] mb-1">
                        <span>Progres XP Level</span>
                        <span>{currentUser.xp} XP</span>
                      </div>
                      <div className="w-full bg-[#FFFDF5] border-2 border-[#1E293B] h-3 rounded-full overflow-hidden relative shadow-[1px_1px_0px_0px_#1E293B]">
                        <div
                          className="bg-[#34D399] h-full border-r-2 border-[#1E293B]"
                          style={{ width: `${Math.min(100, (currentUser.xp / 600) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-center font-bold text-[#64748B] mt-1.5 uppercase">
                        Target: 600 XP menuju mahkota ahli! 👑
                      </p>
                    </div>

                    {/* Speech Speech */}
                    <div className="bg-[#FFFDF5] border-2 border-[#1E293B] rounded-2xl p-3.5 shadow-[2px_2px_0px_0px_#1E293B] relative">
                      <p className="text-[10px] font-bold text-[#1E293B] leading-relaxed">
                        {"\""}Terus melangkah, {currentUser.username}! Setiap tantangan permainan dan penambahan kamus akan mendewasakan kemampuan bahasa asingmu!{"\""} 🚀
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentUser.history && currentUser.history.length > 0 ? (
                      currentUser.history.map((act: any) => {
                        let icon = "📝";
                        if (act.type === "vocab_ai") icon = "🪄";
                        if (act.type === "vocab_manual") icon = "✍️";
                        if (act.type === "speak") icon = "🔊";
                        if (act.type === "story_ai") icon = "📚";
                        if (act.type === "kuis_petualangan") icon = "🧭";
                        if (act.type === "sambung_kata") icon = "🧩";

                        return (
                          <div
                            key={act.id}
                            className="bg-white border-2 border-[#1E293B] p-3 rounded-xl shadow-[2px_2px_0px_0px_#1E293B] flex gap-3 items-start"
                          >
                            <span className="text-xl bg-[#FFFDF5] border border-[#1E293B] w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#1E293B]">
                              {icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-1">
                                <h5 className="font-black text-xs text-[#1E293B] truncate leading-tight uppercase tracking-tight">
                                  {act.title}
                                </h5>
                                <span className="bg-[#34D399] text-[#1E293B] font-black text-[9px] px-1.5 py-0.5 rounded border border-[#1E293B] shrink-0">
                                  +{act.xpEarned || 0} XP
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-[#64748B] leading-snug mt-1 text-left">
                                {act.description}
                              </p>
                              <span className="text-[8px] font-bold text-[#94A3B8] uppercase block mt-1 text-left">
                                {act.timestamp}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 px-4 bg-white border-2 border-dashed border-[#CBD5E1] rounded-2xl">
                        <span className="text-3xl mb-2 block">🐣</span>
                        <p className="text-xs font-black text-[#64748B] uppercase tracking-wider leading-relaxed">
                          Belum Ada Riwayat
                        </p>
                        <p className="text-[10px] font-bold text-[#94A3B8] leading-normal uppercase mt-1">
                          Yuk, jawab kuis, sambungkan kata, atau tambah kosakata baru untuk mencatat progres belajarmu!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-[#F472B6] hover:bg-rose-500 hover:text-white text-[#1E293B] py-3 border-2 border-[#1E293B] rounded-xl font-outfit font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_#1E293B] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none text-xs cursor-pointer bt-neobrutal shrink-0"
              >
                Keluar Dari Akun (Logout)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FITUR 11: STATIC MASCOT CORNER SPEAK OVERLAY (FLOATING ELEMENT BOT-RIGHT) --- */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        
        {/* Animated mascot dialogue speech bubble */}
        <AnimatePresence>
          {mascotBubble && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-white border-3 border-[#1E293B] rounded-2xl p-4.5 shadow-[6px_6px_0px_0px_#1E293B] max-w-xs mb-3 text-xs font-extrabold leading-relaxed text-[#1E293B] relative"
            >
              {/* Triangle tip pointing down right */}
              <div className="absolute w-4 h-4 bg-white border-r-3 border-b-3 border-[#1E293B] rotate-45 -bottom-2 right-6" />
              <span>{mascotBubble}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mascot Interactive Button */}
        <button
          onClick={triggerMascotSpeech}
          className="bg-[#FBBF24] hover:bg-[#8B5CF6] hover:text-white text-3xl w-15 h-15 rounded-full border-3 border-[#1E293B] shadow-[5px_5px_0px_0px_#1E293B] hover:shadow-[6px_6px_0px_0px_#1E293B] active:shadow-[2px_2px_0px_0px_#1E293B] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center cursor-pointer transition-all animate-emoji-bounce"
          title="Klik si Maskot untuk kata-kata semangat!"
        >
          {getMascotEmoji()}
        </button>
      </div>

      {/* FOOTER METADATA MARKUP */}
      <footer className="mt-16 text-center border-t-3 border-[#1E293B] pt-6 max-w-6xl mx-auto pb-12">
        <p className="text-xs font-black text-[#1E293B] uppercase tracking-wider">
          LingoBuddy © 2026 • Bold Typography Theme • Powered by Google AI Studio
        </p>
      </footer>

    </main>
  );
}
