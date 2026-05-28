import React, { useState, useEffect, useMemo } from "react";
import { db, auth, googleProvider } from "./firebaseConfig";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  orderBy,
  getDoc,
  where,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  deleteUser,
} from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Html5QrcodeScanner } from "html5-qrcode";
import "./App.css";
import {
  genAI,
  generateAiRecipe,
  getExpStatus,
  getExpText,
  DAYS_HEB,
  DAYS_KEYS,
  ISRAELI_SUPERMARKETS,
} from "./utils/helpers";
import { StatsView } from "./views/StatsView";
import { ShoppingView } from "./views/ShoppingView";
import LeaderboardModal from "./components/modals/LeaderboardModal";
import FoodRescueModal from "./components/modals/FoodRescueModal";
import SmartSplitModal from "./components/modals/SmartSplitModal";
import WelcomeGuide from "./components/modals/WelcomeGuide";
import SUPERMARKET_STARTER_PACK from "./my_new_products.json";
import { ComparePricesView } from "./views/ComparePricesView";
import NutritionalAnalysisModal from "./components/modals/NutritionalAnalysisModal";
import { showToast, showPrompt, showConfirm } from "./utils/helpers";
import {
  getRescueRecipe,
  getSmartGroceryList,
  getReceiptScan,
} from "./utils/aiService";
import { PantryView } from "./views/PantryView";
import { getAiCategorization, getAiMergeSuggestions } from "./utils/aiService";
import AppGuide from "./components/modals/AppGuide";
import LandingPage from "./components/LandingPage";

// מכונת הכביסה של שמות המוצרים מה-API
const cleanProductName = (name) => {
  if (!name) return "";
  let cleaned = name;
  // מסיר תווים מוזרים בהתחלה או בסוף כמו + * | -
  cleaned = cleaned.replace(/^[+*|\-\s]+|[+*|\-\s]+$/g, "");
  // מסיר מספרים בסוגריים בתחילת השם (כמו "(20)")
  cleaned = cleaned.replace(/^\(\d+\)\s*/, "");
  // מסיר מילים מערכתיות מוזרות מה-API
  cleaned = cleaned.replace(/\(מלקפול\)/g, "");
  // הופך "גר'" או "ג'" ל-"גרם" שייראה מקצועי
  cleaned = cleaned.replace(/ גר'| ג'/g, " גרם");
  // מנקה רווחים כפולים
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned;
};

const seedCatalogDatabase = async () => {
  const isConfirmed = await showConfirm(
    "האם להעלות את כל 1,000 המוצרים לקטלוג ב-Firestore?",
    "התחל לזרוע",
  );

  if (!isConfirmed) return;

  try {
    console.log("מתחיל לזרוע 1,000 מוצרים בקבוצות חכמות...");

    const chunkSize = 400; // מעלים בקבוצות של 400 כדי לא לעבור את המגבלה של 500

    for (let i = 0; i < SUPERMARKET_STARTER_PACK.length; i += chunkSize) {
      const chunk = SUPERMARKET_STARTER_PACK.slice(i, i + chunkSize);
      const batch = writeBatch(db); // פותחים ארגז משלוח חדש לכל קבוצה

      chunk.forEach((product) => {
        // מנקים את השם מלוכסנים כדי שפיירבייס לא יחשוב שזה נתיב מסובך
        const safeId = product.name.replace(/\//g, "-");

        const docRef = doc(db, "product_catalog", safeId);
        batch.set(
          docRef,
          {
            name: product.name, // נשמור את השם המקורי והנקי בפנים ליתר ביטחון
            barcode: product.barcode,
            addedAt: Date.now(),
            isSeeded: true,
          },
          { merge: true },
        );
      });

      await batch.commit(); // משגרים את הקבוצה הנוכחית לשרת
      console.log(`עודכן בהצלחה מטח של ${chunk.length} מוצרים...`);
    }

    showToast("🎉 כל 1,000 המוצרים הועלו בהצלחה לקטלוג המרכזי!", "success"); // ירוק
  } catch (error) {
    console.error("שגיאה בזריעת הקטלוג ההמוני:", error);
  }
};

export const guessCategory = (name) => {
  if (!name) return "כללי";
  const n = name.toLowerCase();
  if (
    n.includes("חלב") ||
    n.includes("גבינה") ||
    n.includes("יוגורט") ||
    n.includes("שוקו") ||
    n.includes("קוטג") ||
    n.includes("חמאה")
  )
    return "מוצרי חלב וביצים";
  if (
    n.includes("לחם") ||
    n.includes("פיתה") ||
    n.includes("פיתות") ||
    n.includes("לחמני") ||
    n.includes("חלה") ||
    n.includes("בורקס")
  )
    return "מאפייה ולחמים";
  if (
    n.includes("עגבני") ||
    n.includes("מלפפון") ||
    n.includes("בצל") ||
    n.includes("תפוח") ||
    n.includes("בננה") ||
    n.includes("פלפל") ||
    n.includes("אבוקדו")
  )
    return "פירות וירקות";
  if (
    n.includes("בשר") ||
    n.includes("עוף") ||
    n.includes("דג") ||
    n.includes("שניצל") ||
    n.includes("טונה") ||
    n.includes("נקניקיות") ||
    n.includes("המבורגר")
  )
    return "בשר ודגים";
  if (
    n.includes("במבה") ||
    n.includes("ביסלי") ||
    n.includes("שוקולד") ||
    n.includes("עוגי") ||
    n.includes("חטיף") ||
    n.includes("גלידה")
  )
    return "חטיפים ומתוקים";
  if (
    n.includes("מים") ||
    n.includes("קולה") ||
    n.includes("מיץ") ||
    n.includes("סודה") ||
    n.includes("בירה") ||
    n.includes("יין")
  )
    return "שתייה ואלכוהול";
  if (
    n.includes("סבון") ||
    n.includes("שמפו") ||
    n.includes("נייר טואלט") ||
    n.includes("משחת שיניים") ||
    n.includes("ניקיון") ||
    n.includes("מרכך")
  )
    return "פארם וניקיון";
  if (
    n.includes("פסטה") ||
    n.includes("אורז") ||
    n.includes("שמן") ||
    n.includes("קפה") ||
    n.includes("תה") ||
    n.includes("סוכר") ||
    n.includes("מלח") ||
    n.includes("רוטב") ||
    n.includes("קטשופ")
  )
    return "מזווה ושימורים";
  return "כללי";
};

// 1. מילון מילים נרדפות חכם בעברית לשיפור ה-Autocomplete
const SYNONYMS = {
  "קוטג'": ["גבינת קוטג'", "קוטג"],
  קוטג: ["גבינת קוטג'", "קוטג'"],
  "גבינת קוטג'": ["קוטג'", "קוטג"],
  גבנצ: ["גבינה צהובה", 'גבנ"צ'],
  'גבנ"צ': ["גבינה צהובה", "גבנצ"],
  "גבינה צהובה": ["גבנצ", 'גבנ"צ'],
  תפוד: ["תפוח אדמה", "תפוחי אדמה"],
  "תפוח אדמה": ["תפוחי אדמה", "תפוד"],
  "תפוחי אדמה": ["תפוח אדמה", "תפוד"],
  פיתה: ["פיתות"],
  פיתות: ["פיתה"],
  לחמניה: ["לחמניות"],
  לחמניות: ["לחמניה"],
  עגבניה: ["עגבניות", "עגבנייה"],
  עגבנייה: ["עגבניות", "עגבניה"],
  עגבניות: ["עגבניה", "עגבנייה"],
  מלפפון: ["מלפפונים"],
  מלפפונים: ["מלפפון"],
  חלב: ["חלב טרי", "חלב עמיד"],
  ביצה: ["ביצים", "תבנית ביצים"],
  ביצים: ["ביצה", "תבנית ביצים"],
};

// 2. פונקציית מרחק לוינשטיין (Levenshtein Distance) לזיהוי ותיקון שגיאות כתיב
const getLevenshteinDistance = (a, b) => {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) tmp[i] = [i];
  for (j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return tmp[a.length][b.length];
};

// 3. אלגוריתם דירוג רלוונטיות (Fuzzy Relevance Scoring)
const calculateFuzzyScore = (query, target) => {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (q === t) return 1000; // התאמה מדויקת מושלמת
  if (t.startsWith(q)) return 800 - t.length; // מתחיל במילת החיפוש (דירוג גבוה יותר לקצרים)
  if (t.includes(q)) return 500 - t.length; // מכיל את מילת החיפוש

  // בדיקת מילים נרדפות
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (q.includes(key) || key.includes(q)) {
      for (const syn of synonyms) {
        if (t.includes(syn) || syn.includes(t)) {
          return 400 - t.length; // בוסט למילים נרדפות
        }
      }
    }
  }

  // תיקון שגיאות כתיב (מאפשר שגיאה אחת למילים קצרות, ושתיים למילים ארוכות)
  const distance = getLevenshteinDistance(q, t);
  const maxAllowedDistance = q.length > 4 ? 2 : 1;
  if (distance <= maxAllowedDistance && q.length >= 3) {
    return 300 - distance * 50; // ציון תיקון שגיאת כתיב
  }

  return 0; // אין התאמה
};

// 4. זיהוי אוטומטי של יחידות מידה, כמויות וקטגוריות מומלצות על פי שם המוצר
export const getSmartDefaults = (name) => {
  const n = name.toLowerCase().trim();
  let target = 1;
  let unit = "יח'";

  if (n.includes("חלב") || n.includes("שוקו") || n.includes("משקה")) {
    unit = "ליטר";
    target = 1;
  } else if (n.includes("ביצים") || n.includes("ביצה")) {
    unit = "תבנית";
    target = 1;
  } else if (
    n.includes("עגבני") ||
    n.includes("מלפפון") ||
    n.includes("בצל") ||
    n.includes("תפוח") ||
    n.includes("בננה") ||
    n.includes("פלפל") ||
    n.includes("אבוקדו") ||
    n.includes("בטטה") ||
    n.includes("גזר") ||
    n.includes("קישוא") ||
    n.includes("לימון") ||
    n.includes("תפוחי אדמה")
  ) {
    unit = 'ק"ג';
    target = 1;
  } else if (
    n.includes("בשר") ||
    n.includes("עוף") ||
    n.includes("פרגיות") ||
    n.includes("סטייק") ||
    n.includes("בקר") ||
    n.includes("טחון")
  ) {
    unit = 'ק"ג';
    target = 1;
  } else if (
    n.includes("קולה") ||
    n.includes("סודה") ||
    n.includes("בירה") ||
    n.includes("פחית")
  ) {
    unit = "יח'";
    target = 6; // שישייה כברירת מחדל
  } else if (
    n.includes("חמאה") ||
    n.includes("שוקולד") ||
    n.includes("במבה") ||
    n.includes("חטיף")
  ) {
    unit = "יח'";
    target = 2; // כי תמיד צריך עוד אחד
  }

  return { target, unit, category: guessCategory(name) };
};

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [catalog, setCatalog] = useState([]);
  const [sharedListId, setSharedListId] = useState(null);
  const [currentView, setCurrentView] = useState("home");
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [weeklyPlan, setWeeklyPlan] = useState({});
  const [activeStore, setActiveStore] = useState("סופרמרקט");
  // מצבים לבאנר קוקיז ולחלונות המשפטיים
  const [showCookieBanner, setShowCookieBanner] = useState(
    localStorage.getItem("cookieConsent") !== "true",
  );
  const [activeLegalModal, setActiveLegalModal] = useState(null); // יכול להיות: 'terms', 'privacy', 'accessibility'

  const [categoryOrder, setCategoryOrder] = useState([]);
  const [collapsedCats, setCollapsedCats] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSmartSplitOpen, setIsSmartSplitOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemTarget, setNewItemTarget] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newItemUnit, setNewItemUnit] = useState("יח'");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const [isListening, setIsListening] = useState(false);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);

  const [categoryModalData, setCategoryModalData] = useState(null); // חלונית סידור קטגוריות
  const [mergeModalData, setMergeModalData] = useState(null); // חלונית כפילויות

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  // --- מצבים עבור המתכנן החכם המשודרג ---
  const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);
  const [plannerStep, setPlannerStep] = useState(1);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [plannerAnswers, setPlannerAnswers] = useState({
    adults: 2,
    kids: 0,
    diets: [],
    vibes: [],
    meals: [],
    needsBasics: true,
  });
  const [globalPriceModal, setGlobalPriceModal] = useState({
    isOpen: false,
    itemName: "",
    data: null,
    isLoading: false,
  });

  // --- מנוע התראות Push מקומיות ---
  const triggerPushNotification = async (title, body) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
          body: body,
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          vibrate: [200, 100, 200],
          tag: "shopping-reminder", // מונע כפילויות של התראות זהות
          renotify: true,
        });
      } catch (err) {
        console.error("שגיאה בהפעלת התראת פוש:", err);
      }
    }
  };

  // בדיקה והתראה על מצרכים שעלולים להיגמר (לפי חיזוי)
  const checkPredictionReminders = (loadedItems) => {
    const now = Date.now();
    const todayKey = new Date().toDateString();
    const notifiedToday = JSON.parse(
      localStorage.getItem("notified_predictions") || "[]",
    );
    const itemsToRenew = [];

    loadedItems.forEach((item) => {
      if (
        item.priceHistory &&
        item.priceHistory.length >= 2 &&
        item.current >= item.target
      ) {
        const timestamps = item.priceHistory
          .map((h) => h.timestamp)
          .filter((t) => t !== undefined)
          .sort((a, b) => b - a);

        if (timestamps.length < 2) return;

        const diffs = [];
        for (let i = 0; i < timestamps.length - 1; i++) {
          diffs.push(timestamps[i] - timestamps[i + 1]);
        }

        const avgDiffMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const avgDiffDays = avgDiffMs / (1000 * 60 * 60 * 24);
        const msSinceLastPurchase = now - timestamps[0];
        const daysSinceLastPurchase =
          msSinceLastPurchase / (1000 * 60 * 60 * 24);

        // אם עבר זמן החידוש הצפוי והמוצר במלאי, ולא הודענו עליו היום
        if (
          daysSinceLastPurchase >= avgDiffDays &&
          !notifiedToday.includes(item.id)
        ) {
          itemsToRenew.push(item);
        }
      }
    });

    if (itemsToRenew.length > 0) {
      const names = itemsToRenew
        .map((i) => i.name)
        .slice(0, 3)
        .join(", ");
      const suffix = itemsToRenew.length > 3 ? " ועוד..." : "";
      triggerPushNotification(
        "⏰ זמן לחדש מצרכים!",
        `לפי קצב הקניות שלכם, ייתכן שנגמר לכם: ${names}${suffix}.`,
      );

      const newNotified = [...notifiedToday, ...itemsToRenew.map((i) => i.id)];
      localStorage.setItem("notified_predictions", JSON.stringify(newNotified));
    }
  };

  // תזכורת יום חמישי בצהריים לקראת שבת
  const checkShabbatReminder = (loadedItems) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 4 = יום חמישי
    const hour = today.getHours();
    const lastShabbatNotify = localStorage.getItem("last_shabbat_notify");

    // יצירת מפתח ייחודי לשבוע הנוכחי
    const currentWeekKey = `${today.getFullYear()}-W${Math.ceil(today.getDate() / 7)}`;

    // אם יום חמישי, בין 12:00 ל-18:00, ולא נשלחה התראה השבוע
    if (
      dayOfWeek === 4 &&
      hour >= 12 &&
      hour <= 18 &&
      lastShabbatNotify !== currentWeekKey
    ) {
      const shoppingCount = loadedItems.filter(
        (i) => i.current < i.target && !i.isBought,
      ).length;
      if (shoppingCount > 0) {
        triggerPushNotification(
          "🕯️ השבת מתקרבת!",
          `יש לך ${shoppingCount} פריטים שממתינים ברשימת הקניות שלך לקראת שישי.`,
        );
        localStorage.setItem("last_shabbat_notify", currentWeekKey);
      }
    }
  };

  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false);
  // פונקציית עזר להדלקה/כיבוי של כפתורי הבחירה (Chips)
  const togglePlannerChip = (category, value) => {
    setPlannerAnswers((prev) => {
      const currentList = prev[category];
      if (currentList.includes(value)) {
        return {
          ...prev,
          [category]: currentList.filter((item) => item !== value),
        };
      } else {
        return { ...prev, [category]: [...currentList, value] };
      }
    });
  };

  const triggerAiCategorization = async () => {
    setIsAiLoading(true);
    try {
      const result = await getAiCategorization(items);
      if (
        result &&
        result.categorizedItems &&
        result.categorizedItems.length > 0
      ) {
        // מציגים למשתמש את הצעת הסידור לאישור לפני הביצוע
        setCategoryModalData(result.categorizedItems);
      } else {
        // Fallback אופליין: נפעיל את הלוגיקה הישנה שמסדרת אוטומטית לפי מילים (guessCategory)
        fixAllCategoriesOffline();
      }
    } catch (e) {
      showToast("שגיאה בסיווג. מפעיל סיווג רגיל...", "error");
      fixAllCategoriesOffline();
    }
    setIsAiLoading(false);
  };

  const totalProducts = catalog.length;
  const productsWithPrice = catalog.filter((item) => item.hasPrice).length;
  const coveragePercentage =
    totalProducts > 0
      ? ((productsWithPrice / totalProducts) * 100).toFixed(1)
      : 0;

  const fixAllCategoriesOffline = async () => {
    let fixedCount = 0;
    for (const item of items) {
      const correctCat = guessCategory(item.name);
      if (item.category !== correctCat) {
        await updateDoc(doc(db, "groceries", item.id), {
          category: correctCat,
        });
        fixedCount++;
      }
    }
    showToast(
      fixedCount > 0 ? `סודרו ${fixedCount} מוצרים.` : "הכל מסודר!",
      "success",
    );
  };

  const applyCategoryChanges = async () => {
    if (!categoryModalData) return;
    let count = 0;

    // בונים מפה מהירה של השמות והקטגוריות החדשות
    const catMap = {};
    categoryModalData.forEach((c) => {
      catMap[c.name] = c.category;
    });

    const batch = writeBatch(db);
    items.forEach((item) => {
      if (catMap[item.name] && item.category !== catMap[item.name]) {
        const docRef = doc(db, "groceries", item.id);
        batch.update(docRef, { category: catMap[item.name] });
        count++;
      }
    });

    await batch.commit();
    setCategoryModalData(null);
    showToast(`איזה יופי! ${count} מוצרים סודרו מחדש לפי קטגוריות.`, "success");
  };

  const triggerMergeDuplicates = async () => {
    setIsAiLoading(true);
    try {
      const result = await getAiMergeSuggestions(items);
      if (result && result.merges && result.merges.length > 0) {
        setMergeModalData(result.merges);
      } else {
        showToast("לא נמצאו כפילויות חכמות ברשימה שלך!", "success");
      }
    } catch (e) {
      showToast("הייתה שגיאה בבדיקת הכפילויות.", "error");
    }
    setIsAiLoading(false);
  };

  const applyMergeChanges = async () => {
    if (!mergeModalData) return;
    const batch = writeBatch(db);
    let mergeCount = 0;

    for (const mergeGroup of mergeModalData) {
      if (!mergeGroup.mergeIds || mergeGroup.mergeIds.length < 2) continue;

      const itemsToMerge = items.filter((i) =>
        mergeGroup.mergeIds.includes(i.id),
      );
      if (itemsToMerge.length < 2) continue;

      // חישוב כמות כוללת למוצר הממוזג
      const totalTarget = itemsToMerge.reduce(
        (sum, item) => sum + (item.target || 1),
        0,
      );
      const totalCurrent = itemsToMerge.reduce(
        (sum, item) => sum + (item.current || 0),
        0,
      );

      // נבחר מוצר אחד שיישאר (למשל הראשון) ואותו נעדכן
      const primaryItem = itemsToMerge[0];
      const primaryRef = doc(db, "groceries", primaryItem.id);

      batch.update(primaryRef, {
        name: mergeGroup.keepName,
        target: totalTarget,
        current: totalCurrent,
      });

      // נמחק את שאר הכפילויות
      for (let i = 1; i < itemsToMerge.length; i++) {
        const duplicateRef = doc(db, "groceries", itemsToMerge[i].id);
        batch.delete(duplicateRef);
      }
      mergeCount++;
    }

    await batch.commit();
    setMergeModalData(null);
    showToast(`בוצע בהצלחה! ${mergeCount} קבוצות מוצרים אוחדו.`, "success");
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  // תיקון memory leak: רשום את ה-listener פעם אחת בלבד (בביצוע הקוד הייתה מתוסף מחדש בכל סריקת קבלה)
  useEffect(() => {
    const handleChunkError = (e) => {
      if (
        e.message &&
        (e.message.includes("Failed to fetch dynamically imported module") ||
          e.message.includes("chunk"))
      ) {
        window.location.reload();
      }
    };
    window.addEventListener("error", handleChunkError);
    return () => window.removeEventListener("error", handleChunkError);
  }, []);

  // // שים כאן את רשימת המיילים המדויקת של 5 החברים שלך (באותיות קטנות)
  // const ALLOWED_EMAILS = [
  //   "ori.shar10@gmail.com", // אורי
  //   "hnweinberg@gmail.com", // נועם
  //   "veredsha12@gmail.com", // אמא
  //   "avners2014@gmail.com", // אבא
  //   "arielleserwatien@gmail.com", // אריאל
  //   "rwysrby970@gmail.com", // רועי
  //   "reutozer050@gmail.com", // רעות
  //   "itay20711@gmail.com", // איתי
  //   "Idosha2002@gmail.com", // עידו
  //   "Stav.noyb@gmail.com", // סתיו
  //   "naamash1212@gmail.com", // נעמה
  //   "orishar1000@gmail.com",
  // ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setLoadingAuth(false);
      } else {
        setUser(null);
        setLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().listId) {
        setSharedListId(docSnap.data().listId);
      } else {
        setSharedListId(user.uid);
        setDoc(userRef, { listId: user.uid }, { merge: true });
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !sharedListId) return;
    const presenceRef = doc(db, "presence", user.uid);
    const updatePresence = async () => {
      await setDoc(
        presenceRef,
        {
          uid: user.uid,
          name: user.displayName,
          photoURL: user.photoURL,
          lastActive: Date.now(),
          listId: sharedListId,
        },
        { merge: true },
      );
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000);

    const qPresence = query(
      collection(db, "presence"),
      where("listId", "==", sharedListId),
    );
    const unsubPresence = onSnapshot(qPresence, (snap) => {
      const now = Date.now();
      const usersOnline = [];
      snap.forEach((d) => {
        if (now - d.data().lastActive < 120000) usersOnline.push(d.data());
      });
      setActiveUsers(usersOnline);
    });

    return () => {
      clearInterval(interval);
      unsubPresence();
    };
  }, [user, sharedListId]);

  useEffect(() => {
    if (!user || !sharedListId) return;

    let isFirstLoad = true; // משתנה שימנע התראות ספאם על ההתחלה של כל המוצרים הקיימים

    const qGroceries = query(
      collection(db, "groceries"),
      where("listId", "==", sharedListId),
    );
    const unsubGroceries = onSnapshot(qGroceries, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // מיון ראשוני של המוצרים
      const sortedData = data.sort(
        (a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis() || 0,
      );

      // מאזין לשינויים בזמן אמת (רק אחרי טעינה ראשונית של הדף)
      if (!isFirstLoad) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const itemData = change.doc.data();
            const currentUserName =
              auth.currentUser?.displayName ||
              auth.currentUser?.email?.split("@")[0] ||
              "";
            const addedBy = itemData.addedBy || "";

            // התראה כשמישהו אחר מהמשפחה מוסיף מוצר לרשימה!
            if (addedBy && addedBy !== currentUserName) {
              triggerPushNotification(
                "🛒 מוצר חדש התווסף!",
                `"${itemData.name}" נוסף לרשימה על ידי ${addedBy}.`,
              );
            }
          }
        });
      } else {
        // בדיקות תקופתיות בריצה ראשונה של האפליקציה (שלוש שניות אחרי הטעינה כדי לא להעמיס)
        setTimeout(() => {
          checkPredictionReminders(sortedData);
          checkShabbatReminder(sortedData);
        }, 3000);
      }

      isFirstLoad = false;
      setItems(sortedData);
    });
    const qStores = query(
      collection(db, "stores"),
      where("listId", "==", sharedListId),
    );
    const unsubStores = onSnapshot(qStores, (snap) => {
      const sData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const hasSupermarket = sData.some((s) => s.name === "סופרמרקט");
      if (!hasSupermarket && sData.length === 0) {
        addDoc(collection(db, "stores"), {
          name: "סופרמרקט",
          createdAt: new Date(),
          listId: sharedListId,
        });
      } else
        setStores(
          sData.sort(
            (a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis() || 0,
          ),
        );
    });

    const unsubSettings = onSnapshot(
      doc(db, "settings", `category_order_${sharedListId}`),
      (docSnap) => {
        if (docSnap.exists()) setCategoryOrder(docSnap.data().order || []);
      },
    );

    const qRecipes = query(
      collection(db, "recipes"),
      where("listId", "==", sharedListId),
    );
    const unsubRecipes = onSnapshot(qRecipes, (snap) =>
      setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    const unsubWeeklyPlan = onSnapshot(
      doc(db, "weekly_plans", sharedListId),
      (docSnap) => {
        if (docSnap.exists()) setWeeklyPlan(docSnap.data().plan || {});
        else setWeeklyPlan({});
      },
    );

    return () => {
      unsubGroceries();
      unsubStores();
      unsubSettings();
      unsubRecipes();
      unsubWeeklyPlan();
    };
  }, [user, sharedListId]);

  useEffect(() => {
    if (items.length === 0) return;
    const today = new Date();
    const todayDay = today.getDay();
    const todayStr = today.toDateString();
    items.forEach(async (item) => {
      if (
        item.recurringDay !== undefined &&
        item.recurringDay === todayDay &&
        item.lastAutoAdd !== todayStr
      ) {
        await updateDoc(doc(db, "groceries", item.id), {
          target: item.current + 1,
          isBought: false,
          lastAutoAdd: todayStr,
        });
      }
    });
  }, [items.length]);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
    }
  };

  const [showWelcomeGuide, setShowWelcomeGuide] = useState(
    !localStorage.getItem("hasSeenGuide"),
  );

  const joinFamilyList = async () => {
    if (!joinCodeInput.trim() || joinCodeInput.trim() === user.uid)
      return showToast("קוד לא תקין או שזה הקוד שלך.", "error");
    await setDoc(
      doc(db, "users", user.uid),
      { listId: joinCodeInput.trim() },
      { merge: true },
    );
    showToast("הצטרפת בהצלחה לרשימה המשותפת!", "success"); // ירוק

    setJoinCodeInput("");
  };

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    // בודק אם האפליקציה כבר מותקנת כ-PWA
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;

    if (isApple && !isStandalone) {
      setIsIOS(true);
    }
  }, []);

  const leaveFamilyList = async () => {
    const isConfirmed = await showConfirm(
      "להתנתק מהרשימה המשותפת ולחזור לרשימה הפרטית שלך?",
      "כן",
    );

    if (isConfirmed) {
      await setDoc(
        doc(db, "users", user.uid),
        { listId: user.uid },
        { merge: true },
      );
    }
  };

  const handleDeleteAccount = async () => {
    const isConfirmed = await showConfirm(
      "האם אתה בטוח שברצונך למחוק את החשבון ואת כל המידע שלך לצמיתות? פעולה זו אינה הפיכה!",
      "כן",
    );

    if (isConfirmed) {
      try {
        // 1. מחיקת מסמך המשתמש מחנות Firestore
        await deleteDoc(doc(db, "users", user.uid));
        // 2. מחיקת המשתמש עצמו ממערכת ה-Authentication
        await deleteUser(auth.currentUser);
        showToast("החשבון והנתונים נמחקו לצמיתות מהמערכת.", "success"); // ירוק
      } catch (error) {
        console.error(error);
        showToast(
          "מטעמי אבטחה, כדי למחוק חשבון עליך להתנתק, להתחבר מחדש, וללחוץ על המחיקה מיד.",
          "error",
        ); // אדום
      }
    }
  };

  const toggleRecurring = async (item) => {
    const day = await showPrompt(
      "באיזה יום להוסיף אוטומטית? (0=ראשון, 1=שני... 6=שבת. השאר ריק לביטול)",
    );
    if (day === null) return;
    if (day.trim() === "")
      await updateDoc(doc(db, "groceries", item.id), { recurringDay: null });
    else {
      const d = parseInt(day);
      if (d >= 0 && d <= 6) {
        await updateDoc(doc(db, "groceries", item.id), { recurringDay: d });
        showToast(
          `מעולה. המוצר יתווסף לרשימה בכל יום ${DAYS_HEB[d]}.`,
          "success",
        ); // ירוק
      } else showToast("נא להזין מספר בין 0 ל-6.", "error"); // אדום
    }
  };

  useEffect(() => {
    if (isScannerOpen) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { qrbox: { width: 250, height: 250 }, fps: 10 },
        false,
      );
      scanner.render(
        async (text) => {
          scanner.clear();
          setIsScannerOpen(false);
          handleBarcodeScanned(text);
        },
        (err) => {},
      );
      return () => {
        scanner.clear().catch((e) => console.log(e));
      };
    }
  }, [isScannerOpen]);

  // --- חיבור מספר טלפון מוואטסאפ לחשבון ---
  useEffect(() => {
    if (!user || !sharedListId) return;

    const urlParams = new URLSearchParams(window.location.search);
    const phoneToLink = urlParams.get("phone");

    if (phoneToLink) {
      const linkPhone = async () => {
        try {
          // שומרים בטבלה נפרדת את החיבור בין הטלפון לרשימה
          await setDoc(doc(db, "phones", phoneToLink), {
            listId: sharedListId,
            linkedAt: new Date(),
          });
          showToast(
            "🎉 וואטסאפ חובר בהצלחה! מעכשיו אפשר להוסיף מוצרים בהודעה.",
            "success",
          ); // ירוק
          window.history.replaceState(null, "", window.location.pathname);
        } catch (e) {
          console.error("Link error:", e);
        }
      };
      linkPhone();
    }
  }, [user, sharedListId]);

  const handleBarcodeScanned = async (barcode) => {
    const docRef = doc(db, "barcodes", barcode);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setNewItemName(data.name);
      setNewItemCategory(data.category);
      showToast(`זוהה: ${data.name}! לחץ פלוס כדי להוסיף.`, "success"); // ירוק
    } else {
      const newName = await showPrompt(
        `ברקוד חדש זוהה (${barcode}). מה שם המוצר?`,
      );
      if (newName && newName.trim()) {
        const catObj = catalog.find((c) => c.name === newName.trim());
        const newCat = await showPrompt(
          "איזו קטגוריה?",
          catObj ? catObj.category : "כללי",
        );
        await setDoc(docRef, {
          name: newName.trim(),
          category: newCat || "כללי",
        });
        setNewItemName(newName.trim());
        setNewItemCategory(newCat || "כללי");
      }
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast(
        "הדפדפן שלך לא תומך בזיהוי קולי. נסה להשתמש ב-Chrome באנדרואיד או Safari באייפון.",
        "error",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "he-IL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const cleanTranscript = transcript.replace(/\.$/, "");

      // מחליף את "ו" (כמו "ולחם") ואת המילה "פסיק" כדי לזהות רשימה
      const items = cleanTranscript
        .replace(/ ו/g, ",")
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      if (items.length > 1) {
        items.forEach((item) => fastAddProduct(item));
        showToast(`🎤 נוספו ${items.length} מוצרים מההקלטה`, "success");
      } else {
        setNewItemName(items[0]);
        setShowSuggestions(true);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const uniqueStores = useMemo(
    () => [...new Set(stores.map((s) => s.name.trim()))],
    [stores],
  );

  // 1. חישוב תדירות השימוש האישית של המשתמש בכל מוצר מההיסטוריה
  const productFrequencies = useMemo(() => {
    const counts = {};
    items.forEach((item) => {
      const name = item.name.trim();
      counts[name] = (counts[name] || 0) + 1;
      if (item.priceHistory) {
        counts[name] += item.priceHistory.length; // בוסט נוסף אם תועד לו מחיר בעבר
      }
    });
    return counts;
  }, [items]);

  // 2. סינון ודירוג חכם של הצעות ה-Autocomplete
  const activeSuggestions = useMemo(() => {
    if (!newItemName.trim() || !showSuggestions) return [];
    const search = newItemName.trim();

    return catalog
      .map((c) => {
        const score = calculateFuzzyScore(search, c.name);
        const frequency = productFrequencies[c.name] || 0;

        // שקלול סופי: ציון ה-Fuzzy + תוספת של 15 נקודות לכל שימוש היסטורי
        const finalScore = score > 0 ? score + frequency * 15 : 0;

        return { ...c, matchScore: finalScore };
      })
      .filter((c) => c.matchScore > 0 && c.name !== search)
      .sort((a, b) => b.matchScore - a.matchScore) // מיון מההתאמה הטובה ביותר לפחות טובה
      .slice(0, 10); // החזרת 10 התוצאות הרלוונטיות ביותר
  }, [newItemName, catalog, showSuggestions, productFrequencies]);

  const toggleCat = (catId) => {
    setCollapsedCats((prev) => {
      const isCurrentlyOpen = prev[catId];
      if (isCurrentlyOpen) {
        return {}; // אם היא פתוחה, לחיצה תסגור אותה (והכל יהיה סגור)
      } else {
        return { [catId]: true }; // פותח רק את הנוכחית וסוגר את השאר
      }
    });
  };
  const fastAddProduct = async (name, targetQty = 1, forceUnit = null) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const defaults = getSmartDefaults(cleanName);

    try {
      await addDoc(collection(db, "groceries"), {
        name: cleanName,
        category: defaults.category,
        store: activeStore,
        current: 0,
        target: targetQty || defaults.target,
        unit: forceUnit || defaults.unit,
        note: "הוספה מהירה ⚡",
        isBought: false,
        createdAt: new Date(),
        priceHistory: [],
        listId: sharedListId,
        addedBy: user?.displayName || user?.email?.split("@")[0] || "מערכת",
      });
    } catch (error) {
      console.error("שגיאה בהוספה מהירה:", error);
    }
  };

  const addItem = async (e) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) return;

    const cleanName = newItemName.trim();
    // שליפת ברירת מחדל חכמה במידה והמשתמש לא הגדיר קטגוריה/יחידת מידה ידנית
    const defaults = getSmartDefaults(cleanName);
    const finalCat = newItemCategory.trim() || defaults.category;
    const finalUnit = newItemUnit || defaults.unit;

    try {
      // 1. שמירת הפריט החדש עם שדה ה-unit ב-groceries
      await addDoc(collection(db, "groceries"), {
        name: cleanName,
        category: finalCat,
        store: activeStore,
        current: 0,
        target: newItemTarget,
        unit: finalUnit, // <--- השדה החדש!
        note: "",
        isBought: false,
        createdAt: new Date(),
        priceHistory: [],
        expirationDate: "",
        listId: sharedListId,
        addedBy: user?.displayName || user?.email?.split("@")[0] || "אנונימי",
      });

      // 2. עדכון הקטלוג הכללי
      const catalogDocRef = doc(db, "product_catalog", cleanName);
      const catalogSnapshot = await getDoc(catalogDocRef);

      if (!catalogSnapshot.exists()) {
        const matchedCatalogItem = catalog.find(
          (c) =>
            c.name.toLowerCase().includes(cleanName.toLowerCase()) ||
            cleanName.toLowerCase().includes(c.name.toLowerCase()),
        );

        const matchedBarcode = matchedCatalogItem
          ? matchedCatalogItem.barcode
          : "";

        await setDoc(catalogDocRef, {
          barcode: matchedBarcode.toString(),
          addedAt: new Date(),
          priorityUpdate: true,
        });
      } else {
        await updateDoc(catalogDocRef, {
          priorityUpdate: true,
        });
      }

      // 3. איפוס הטופס וחזרה לברירת המחדל
      setNewItemName("");
      setNewItemCategory("");
      setNewItemTarget(1);
      setNewItemUnit("יח'");
      setShowSuggestions(false);
    } catch (e) {
      console.error("שגיאה בהוספת פריט:", e);
    }
  };

  const updateQuantity = async (id, val, field, diff) =>
    await updateDoc(doc(db, "groceries", id), {
      [field]: Math.max(0, val + diff),
    });
  const changeCategory = async (id, currentCat) => {
    const newCat = await showPrompt("לאיזו קטגוריה להעביר?", currentCat);
    if (newCat && newCat.trim() !== "")
      await updateDoc(doc(db, "groceries", id), { category: newCat.trim() });
  };

  const logPrice = async (item) => {
    const priceStr = await showPrompt(`כמה עלה "${item.name}"? (הזן מספר)`);
    if (!priceStr || isNaN(priceStr)) return;

    // בואו ניתן למשתמש לבחור מתוך הרשימה המוגדרת מראש
    let storesListStr = ISRAELI_SUPERMARKETS.map(
      (s, i) => `${i + 1}. ${s}`,
    ).join("\n");
    const storeIndexStr = await showPrompt(
      `באיזו רשת קנית? בחר מספר:\n${storesListStr}`,
    );

    let specificStore = activeStore; // ברירת המחדל
    if (storeIndexStr) {
      const idx = parseInt(storeIndexStr) - 1;
      if (idx >= 0 && idx < ISRAELI_SUPERMARKETS.length) {
        specificStore = ISRAELI_SUPERMARKETS[idx];
      } else {
        specificStore = (await showPrompt("שם הרשת:")) || activeStore;
      }
    }

    const priceNum = parseFloat(priceStr);
    // --- התחלת קוד התראת מבצע ---
    if (item.priceHistory && item.priceHistory.length > 0) {
      // מחשבים את ממוצע המחירים ההיסטורי של המוצר הזה
      const pastPrices = item.priceHistory.map((h) => h.price);
      const avgPastPrice =
        pastPrices.reduce((a, b) => a + b, 0) / pastPrices.length;

      // אם המחיר החדש קטן או שווה ל-70% מהמחיר הממוצע (כלומר, ירידה של 30% או יותר)
      if (priceNum <= avgPastPrice * 0.7) {
        showToast(
          `🎉 איזה יופי! המחיר של "${item.name}" שכרגע הזנת (₪${priceNum}) נמוך ביותר מ-30% מהמחיר הרגיל שבו קנית אותו בעבר (ממוצע ₪${avgPastPrice.toFixed(2)}). אחלה דיל!`,
          "success",
        ); // ירוק
      }
    }
    // --- סוף קוד התראת מבצע ---
    const dateStr = new Date().toLocaleDateString("he-IL");
    const timestamp = Date.now();

    const newEntry = {
      price: priceNum,
      store: specificStore,
      date: dateStr,
      timestamp,
    };

    // --- 1. עדכון ברשימה הפרטית של המשתמש ---
    const updatedHistory = [newEntry, ...(item.priceHistory || [])].slice(
      0,
      10,
    );
    await updateDoc(doc(db, "groceries", item.id), {
      priceHistory: updatedHistory,
    });

    // --- 2. עדכון במאגר הגלובלי (חוכמת ההמונים) ---
    try {
      const normalizedName = item.name.toLowerCase().trim();
      const globalDocRef = doc(db, "global_prices", normalizedName);
      const globalDocSnap = await getDoc(globalDocRef);

      let currentGlobalData = {};
      if (globalDocSnap.exists()) {
        currentGlobalData = globalDocSnap.data();
      }

      // שולפים את היסטוריית המחירים עבור הרשת הספציפית הזו
      let storeHistory = currentGlobalData[specificStore] || [];

      // מוסיפים את המחיר החדש להתחלה, ושומרים רק את 3 האחרונים
      storeHistory = [
        { price: priceNum, date: dateStr, timestamp },
        ...storeHistory,
      ].slice(0, 3);

      // מעדכנים את המסמך הגלובלי
      await setDoc(
        globalDocRef,
        {
          [specificStore]: storeHistory,
          lastUpdated: timestamp, // תאריך העדכון האחרון של כל מוצר
        },
        { merge: true },
      ); // merge: true שומר על נתונים של רשתות אחרות באותו מסמך

      try {
        const catalogDocRef = doc(db, "product_catalog", item.name.trim());
        await setDoc(
          catalogDocRef,
          { hasPrice: true },
          { merge: true }, // merge אומר: אל תדרוס נתונים אחרים כמו ברקוד, רק תוסיף/תעדכן את hasPrice
        );
      } catch (catalogErr) {
        console.error("שגיאה בעדכון חיווי המחיר בקטלוג:", catalogErr);
      }

      showToast("המחיר תועד בהצלחה! 📈 תרמת למאגר המחירים הקהילתי.", "success"); // ירוק
    } catch (e) {
      console.error("Error updating global prices:", e);
    }
  };

  const deletePriceEntry = async (item, indexToDelete) => {
    const isConfirmed = await showConfirm("למחוק את המחיר?", "כן");

    if (isConfirmed) {
      const updatedHistory = item.priceHistory.filter(
        (_, index) => index !== indexToDelete,
      );
      await updateDoc(doc(db, "groceries", item.id), {
        priceHistory: updatedHistory,
      });
    }
  };

  const createNewRecipe = async () => {
    const name = await showPrompt("שם הארוחה/מתכון:");
    if (name && name.trim())
      await addDoc(collection(db, "recipes"), {
        name: name.trim(),
        ingredients: [],
        createdAt: new Date(),
        listId: sharedListId,
      });
  };

  const addIngredientToRecipe = async (recipeId, currentIngredients) => {
    const ingredient = await showPrompt("איזה מצרך להוסיף?");
    if (ingredient && ingredient.trim())
      await updateDoc(doc(db, "recipes", recipeId), {
        ingredients: [...currentIngredients, ingredient.trim()],
      });
  };

  const checkRecipeStatus = (recipe) => {
    if (!recipe.ingredients || recipe.ingredients.length === 0)
      return { status: "empty", missing: [] };
    const missing = [];
    recipe.ingredients.forEach((ing) => {
      const hasItem = items.some((i) => i.name === ing && i.current > 0);
      if (!hasItem) missing.push(ing);
    });
    if (missing.length === 0) return { status: "ready", missing };
    if (missing.length <= 2) return { status: "almost", missing };
    return { status: "missing", missing };
  };

  const pushMissingToCart = async (missingIngs, recipeName) => {
    const isConfirmed = await showConfirm(
      `להוסיף את המצרכים החסרים לרשימה? (${missingIngs.join(", ")})`,
      "כן",
    );

    if (!isConfirmed) return;

    for (const ing of missingIngs) {
      const existingItem = items.find(
        (i) => i.store === activeStore && i.name === ing,
      );
      if (existingItem) {
        await updateDoc(doc(db, "groceries", existingItem.id), {
          target: existingItem.current + 1,
          isBought: false,
        });
      } else {
        const catObj = catalog.find((c) => c.name === ing);
        const cat = catObj ? catObj.category : "כללי";
        await addDoc(collection(db, "groceries"), {
          name: ing,
          category: cat,
          store: activeStore,
          current: 0,
          target: 1,
          note: `חסר עבור ${recipeName}`,
          isBought: false,
          createdAt: new Date(),
          priceHistory: [],
          expirationDate: "",
          listId: sharedListId,
        });
      }
    }
    showToast("המצרכים החסרים נוספו לרשימה בהצלחה!", "success"); // ירוק
    setCurrentView("shopping");
  };

  const pushRecipeToCart = async (recipe) => {
    const isConfirmed = await showConfirm(
      `להוסיף את כל המרכיבים של "${recipe.name}" לרשימה של ${activeStore}?`,
      "כן",
    );

    if (!isConfirmed) return;

    for (const ing of recipe.ingredients) {
      const existingItem = items.find(
        (i) => i.store === activeStore && i.name === ing,
      );
      if (existingItem) {
        if (existingItem.target <= existingItem.current)
          await updateDoc(doc(db, "groceries", existingItem.id), {
            target: existingItem.current + 1,
            isBought: false,
          });
      } else {
        const catObj = catalog.find((c) => c.name === ing);
        const cat = catObj ? catObj.category : "כללי";
        await addDoc(collection(db, "groceries"), {
          name: ing,
          category: cat,
          store: activeStore,
          current: 0,
          target: 1,
          note: `עבור ${recipe.name}`,
          isBought: false,
          createdAt: new Date(),
          priceHistory: [],
          expirationDate: "",
          listId: sharedListId,
        });
      }
    }
    showToast("המוצרים נוספו לרשימה!", "success"); // ירוק
    setCurrentView("shopping");
  };

  const addMealToDay = async (dayKey) => {
    if (recipes.length === 0)
      return showToast("קודם תוסיף מתכונים במסך המתכונים!", "error");
    const recipeNames = recipes.map((r, i) => `${i + 1}. ${r.name}`).join("\n");
    const choice = await showPrompt(
      `בחר מספר ארוחה להוסיף ליום זה:\n\n${recipeNames}`,
    );
    if (!choice) return;
    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= recipes.length)
      return "מספר לא חוקי.";

    const selectedRecipe = recipes[index];
    const updatedPlan = { ...weeklyPlan };
    if (!updatedPlan[dayKey]) updatedPlan[dayKey] = [];
    updatedPlan[dayKey].push({
      id: selectedRecipe.id,
      name: selectedRecipe.name,
      ingredients: selectedRecipe.ingredients,
    });

    await setDoc(
      doc(db, "weekly_plans", sharedListId),
      { plan: updatedPlan },
      { merge: true },
    );
  };

  const removeMealFromDay = async (dayKey, mealIndex) => {
    const updatedPlan = { ...weeklyPlan };
    updatedPlan[dayKey].splice(mealIndex, 1);
    await setDoc(
      doc(db, "weekly_plans", sharedListId),
      { plan: updatedPlan },
      { merge: true },
    );
  };

  const generateWeeklyList = async () => {
    const allRequiredIngredients = {};

    Object.values(weeklyPlan).forEach((dayMeals) => {
      dayMeals.forEach((meal) => {
        (meal.ingredients || []).forEach((ing) => {
          if (!allRequiredIngredients[ing]) allRequiredIngredients[ing] = 0;
          allRequiredIngredients[ing] += 1;
        });
      });
    });

    const ingredientsNames = Object.keys(allRequiredIngredients);
    if (ingredientsNames.length === 0)
      return showToast("התפריט שלך ריק. אין מה להוסיף לרשימה.", "error");

    const isConfirmed = await showConfirm(
      "פעולה זו תסרוק את התפריט השבועי, תבדוק מה חסר במזווה שלך, ותוסיף לעגלה רק את מה שחסר. להמשיך?",
      "כן",
    );

    if (!isConfirmed) return;

    let itemsAdded = 0;

    for (const ing of ingredientsNames) {
      const requiredQty = allRequiredIngredients[ing];
      const existingItem = items.find(
        (i) => i.store === activeStore && i.name === ing,
      );

      if (existingItem) {
        if (existingItem.current < requiredQty) {
          const needed = requiredQty - existingItem.current;
          const currentTarget = existingItem.target;
          if (currentTarget - existingItem.current < needed) {
            await updateDoc(doc(db, "groceries", existingItem.id), {
              target: existingItem.current + needed,
              isBought: false,
            });
            itemsAdded++;
          }
        }
      } else {
        const catObj = catalog.find((c) => c.name === ing);
        const cat = catObj ? catObj.category : "כללי";
        await addDoc(collection(db, "groceries"), {
          name: ing,
          category: cat,
          store: activeStore,
          current: 0,
          target: requiredQty,
          note: `תפריט שבועי`,
          isBought: false,
          createdAt: new Date(),
          priceHistory: [],
          expirationDate: "",
          listId: sharedListId,
        });
        itemsAdded++;
      }
    }

    if (itemsAdded > 0) {
      showToast(
        `מעולה! הוספנו/עדכנו ${itemsAdded} מצרכים לעגלה שלך עבור כל השבוע.`,
      );
      setCurrentView("shopping");
    } else {
      showToast(
        "נראה שיש לך את כל המצרכים הדרושים לשבוע הקרוב בבית! אין צורך לקנות כלום.",
      );
    }
  };

  const clearWeeklyPlan = async () => {
    const isConfirmed = await showConfirm("למחוק את כל התפריט השבועי?", "כן");

    if (isConfirmed) {
      await setDoc(
        doc(db, "weekly_plans", sharedListId),
        { plan: {} },
        { merge: true },
      );
    }
  };

  useEffect(() => {
    // קריטי: מושכים נתונים רק אחרי שפיירבייס אישר שהמשתמש מחובר!
    if (!user) return;
    const fetchCatalog = async () => {
      try {
        const snapshot = await getDocs(collection(db, "product_catalog"));
        const catalogData = snapshot.docs.map((doc) => {
          const rawName = doc.id;
          const cleanedName = cleanProductName(rawName); // מעבירים במכונת הכביסה

          return {
            name: cleanedName, // השם היפה שיוצג למשתמש
            originalId: rawName, // למקרה שנצטרך לעדכן אותו בפיירבייס בעתיד
            barcode: doc.data().barcode,
            // משתמשים בפונקציה מהשלב הקודם כדי שכל המוצרים יכנסו לקטגוריות גדולות והגיוניות!
            category: guessCategory(cleanedName),
            hasPrice: doc.data().hasPrice || false, // <--- השורה החדשה שחסרה!
          };
        });

        // ממיינים אלפביתית שיהיה קל למצוא
        catalogData.sort((a, b) => a.name.localeCompare(b.name));
        setCatalog(catalogData);
      } catch (error) {
        console.error("שגיאה בטעינת הקטלוג:", error);
      }
    };

    fetchCatalog();
  }, [user]); // <--- כאן השינוי (הוספנו את user)

  const deleteStore = async (storeId) => {
    await deleteDoc(doc(db, "stores", storeId));
  };

  const handleAddStore = async () => {
    const n = await showPrompt("חנות חדשה:");
    if (n) {
      addDoc(collection(db, "stores"), {
        name: n,
        createdAt: new Date(),
        listId: sharedListId,
      });
    }
  };

  const deleteItem = async (itemId) => {
    const isConfirmed = await showConfirm("למחוק?", "כן");

    if (isConfirmed) {
      await deleteDoc(doc(db, "groceries", itemId));
    }
  };

  const fixAllCategories = async () => {
    const isConfirmed = await showConfirm(
      "האם אתה בטוח שברצונך לסדר מחדש את כל המוצרים לקטגוריות הנכונות?",
      "כן, סדר הכל",
    );
    if (!isConfirmed) return;

    let fixedCount = 0;
    for (const item of items) {
      const correctCat = guessCategory(item.name);
      // אם הקטגוריה הנוכחית שגויה, נעדכן אותה
      if (item.category !== correctCat) {
        await updateDoc(doc(db, "groceries", item.id), {
          category: correctCat,
        });
        fixedCount++;
      }
    }

    if (fixedCount > 0) {
      showToast(
        `מעולה! סודרו מחדש ${fixedCount} מוצרים לקטגוריות הנכונות.`,
        "success",
      );
    } else {
      showToast("כל המוצרים כבר מסודרים בקטגוריות הנכונות!", "success");
    }
  };

  const updateItemStatus = async (itemId, targetQty, isBought) => {
    await updateDoc(doc(db, "groceries", itemId), {
      current: targetQty,
      isBought: isBought,
      boughtBy: isBought
        ? user?.displayName || user?.email?.split("@")[0] || "אנונימי"
        : null,
    });
  };

  const inStockItemsForAi = items.filter(
    (i) => i.current >= i.target && i.current > 0,
  );

  const handleAiAsk = async () => {
    const pantryNames = inStockItemsForAi.map((i) => i.name);
    if (pantryNames.length < 3)
      return showToast(
        "צריך לפחות 3 מוצרים במזווה כדי שהשף יבשל משהו טעים!",
        "error",
      );

    setIsAiLoading(true);
    const result = await generateAiRecipe(pantryNames);
    setIsAiLoading(false);

    if (result.error) showToast(result.error, "error");
    else setAiResult(result);
  };

  const handleImportRecipe = async () => {
    if (!importUrl || !importUrl.trim().startsWith("http")) {
      return showToast("נא להזין קישור חוקי שמתחיל ב-http.", "error");
    }
    setIsAiLoading(true);
    setIsImportModalOpen(false);

    const result = await generateAiRecipe(importUrl.trim(), true);
    setIsAiLoading(false);

    if (result.error) showToast(result.error, "error");
    else setAiResult(result);
    setImportUrl("");
  };

  const saveAiRecipe = async () => {
    if (!aiResult) return;
    await addDoc(collection(db, "recipes"), {
      name: aiResult.title,
      ingredients: aiResult.ingredients,
      instructions: aiResult.instructions || [],
      createdAt: new Date(),
      listId: sharedListId,
    });
    setAiResult(null);
    showToast("המתכון נשמר בספר המתכונים שלך!", "success");
  };

  const filtered = items.filter(
    (i) =>
      i.store === activeStore &&
      (i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.category.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const shoppingList = filtered.filter(
    (i) => i.current < i.target && !i.isBought,
  );
  const inCart = filtered.filter((i) => i.isBought);
  const inStock = filtered.filter((i) => i.current >= i.target && !i.isBought);

  const getEstimatedPrice = (item) => {
    if (item.priceHistory && item.priceHistory.length > 0)
      return (
        item.priceHistory[0].price *
        (item.target > item.current ? item.target - item.current : 1)
      );
    return 0;
  };
  const shopTotal = shoppingList.reduce(
    (sum, item) => sum + getEstimatedPrice(item),
    0,
  );
  const cartTotal = inCart.reduce(
    (sum, item) => sum + getEstimatedPrice(item),
    0,
  );

  const groupItems = (list) =>
    list.reduce((acc, i) => {
      if (!acc[i.category]) acc[i.category] = [];
      acc[i.category].push(i);
      return acc;
    }, {});

  const allUniqueCategories = useMemo(
    () => [...new Set(items.map((i) => i.category))],
    [items],
  );
  const displayOrder = useMemo(
    () => [...new Set([...categoryOrder, ...allUniqueCategories])],
    [categoryOrder, allUniqueCategories],
  );

  const handleEmailClick = () => {
    const emailAddress = "orishar1000@gmail.com";
    const subject = "הצעת ייעול לאפליקציית הקניות";
    const body = "היי, יש לי הצעת ייעול לאפליקציית הקניות:\n\n";
    window.open(
      `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };

  // ✅ פונקציה חדשה: ייצוא רשימת הקניות כהודעת WhatsApp מעוצבת
  const shareListToWhatsApp = () => {
    if (shoppingList.length === 0) {
      showToast("הרשימה ריקה - אין מה לשתף! 🛒", "error");
      return;
    }

    // קיבוץ המוצרים לפי קטגוריות
    const grouped = shoppingList.reduce((acc, item) => {
      const cat = item.category || "כללי";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    const today = new Date().toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    let message = `🛒 *רשימת קניות - ${activeStore}*\n`;
    message += `📅 ${today}\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;

    // אמוג'י לכל קטגוריה
    const catEmoji = {
      "מוצרי חלב וביצים": "🥛",
      "מאפייה ולחמים": "🥖",
      "בשר ודגים": "🥩",
      "פירות וירקות": "🥗",
      "חטיפים ומתוקים": "🍫",
      "שתייה ואלכוהול": "🥤",
      "פארם וניקיון": "🧻",
      "מזווה ושימורים": "🥫",
      כללי: "🛒",
    };

    // מיון הקטגוריות לפי סדר displayOrder אם קיים
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const idxA = displayOrder.indexOf(a);
      const idxB = displayOrder.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    sortedCategories.forEach((cat) => {
      const emoji = catEmoji[cat] || "🛒";
      message += `${emoji} *${cat}:*\n`;
      grouped[cat].forEach((item) => {
        const qty = item.target - item.current;
        const qtyText = qty > 1 ? ` (×${qty})` : "";
        const priceText =
          item.priceHistory?.length > 0
            ? ` ~₪${item.priceHistory[0].price.toFixed(2)}`
            : "";
        message += `  ☐ ${item.name}${qtyText}${priceText}\n`;
      });
      message += "\n";
    });

    // סיכום מחיר
    if (shopTotal > 0) {
      message += `━━━━━━━━━━━━━━━━\n`;
      message += `💰 *צפי עלות: ₪${shopTotal.toFixed(2)}*\n`;
    }

    message += `\n_נשלח מ-Home Shopping Sharabi_ 🏠`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const moveCategory = async (index, direction) => {
    const newOrder = [...displayOrder];
    if (direction === "up" && index > 0) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[index - 1];
      newOrder[index - 1] = temp;
    } else if (direction === "down" && index < newOrder.length - 1) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[index + 1];
      newOrder[index + 1] = temp;
    }
    await setDoc(
      doc(db, "settings", `category_order_${sharedListId}`),
      { order: newOrder },
      { merge: true },
    );
  };

  const sortCategories = (catA, catB) => {
    let idxA = displayOrder.indexOf(catA);
    let idxB = displayOrder.indexOf(catB);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    if (idxA !== idxB) return idxA - idxB;
    return catA.localeCompare(catB);
  };

  const activeCatIds = useMemo(() => {
    const shopIds = Object.keys(groupItems(shoppingList)).map(
      (c) => `shop_${c}`,
    );
    const pantryIds = Object.keys(groupItems(inStock)).map(
      (c) => `pantry_${c}`,
    );
    return [...shopIds, ...pantryIds];
  }, [shoppingList, inStock]);

  const hasOpenCats = activeCatIds.some((id) => collapsedCats[id]);
  const closeAllCategories = () => {
    setCollapsedCats({}); // סוגר את כל הקטגוריות בבת אחת
  };

  const [ultimateCartData, setUltimateCartData] = useState(null);
  const [isUltimateCartLoading, setIsUltimateCartLoading] = useState(false);

  const calculateUltimateCart = async () => {
    if (shoppingList.length === 0) return showToast("הרשימה ריקה!", "error");

    setIsSmartSplitOpen(true);
    setIsUltimateCartLoading(true);

    try {
      const listToCalc = shoppingList.map((i) => ({
        ...i,
        qty: i.target > i.current ? i.target - i.current : 1,
      }));

      const pricePromises = listToCalc.map(async (item) => {
        const normalizedName = item.name.toLowerCase().trim();
        const docRef = doc(db, "global_prices", normalizedName);
        const docSnap = await getDoc(docRef);

        let pricesByStore = {};
        if (docSnap.exists()) {
          const data = docSnap.data();
          for (const store of Object.keys(data)) {
            if (store !== "lastUpdated" && data[store].length > 0) {
              pricesByStore[store] = data[store][0].price;
            }
          }
        }

        const localBest =
          item.priceHistory?.length > 0 ? item.priceHistory[0].price : 0;
        return { item, qty: item.qty, pricesByStore, localBest };
      });

      const fetchedItems = await Promise.all(pricePromises);

      const activeStoresSet = new Set();
      fetchedItems.forEach((fi) => {
        const prices = Object.values(fi.pricesByStore);
        fi.avgPrice =
          prices.length > 0
            ? prices.reduce((a, b) => a + b, 0) / prices.length
            : fi.localBest > 0
              ? fi.localBest
              : 10;
        Object.keys(fi.pricesByStore).forEach((s) => activeStoresSet.add(s));
      });

      const storesToEvaluate = Array.from(activeStoresSet);
      if (storesToEvaluate.length === 0) storesToEvaluate.push("סופרמרקט");

      // --- הגדרת הקנס המציאותי ---
      const TRAVEL_PENALTY = 20; // 20 שקלים "קנס" על כל חנות נוספת שעוצרים בה

      // 1. עצלנים (מקום אחד - ללא קנס)
      const oneStopOptions = storesToEvaluate
        .map((store) => {
          let total = 0;
          const items = fetchedItems.map((fi) => {
            const p = fi.pricesByStore[store] || fi.avgPrice;
            total += p * fi.qty;
            return { name: fi.item.name, price: p, qty: fi.qty, store };
          });
          return { store, total, items };
        })
        .sort((a, b) => a.total - b.total);
      const bestOneStop = oneStopOptions[0];

      // 2. אקסטרים חיסכון (עם קנס על כל חנות החל מהשנייה)
      let extremeRawTotal = 0;
      const extremeGroups = {};
      fetchedItems.forEach((fi) => {
        let bestStore = storesToEvaluate[0] || "סופרמרקט";
        let bestPrice = fi.avgPrice;
        for (const [store, price] of Object.entries(fi.pricesByStore)) {
          if (price < bestPrice) {
            bestPrice = price;
            bestStore = store;
          }
        }
        extremeRawTotal += bestPrice * fi.qty;
        if (!extremeGroups[bestStore])
          extremeGroups[bestStore] = { total: 0, items: [] };
        extremeGroups[bestStore].items.push({
          name: fi.item.name,
          price: bestPrice,
          qty: fi.qty,
        });
        extremeGroups[bestStore].total += bestPrice * fi.qty;
      });

      const extremeStoreCount = Object.keys(extremeGroups).length;
      const extremePenalty =
        extremeStoreCount > 1 ? (extremeStoreCount - 1) * TRAVEL_PENALTY : 0;
      const extremeNetTotal = extremeRawTotal + extremePenalty; // הסכום כולל הוצאות הדלק/זמן

      // 3. שביל הזהב (2 חנויות בדיוק -> קנס אחד)
      let bestTwoStop = null;
      let bestTwoStopNetTotal = Infinity;

      for (let i = 0; i < storesToEvaluate.length; i++) {
        for (let j = i + 1; j < storesToEvaluate.length; j++) {
          const storeA = storesToEvaluate[i];
          const storeB = storesToEvaluate[j];
          let currentRawTotal = 0;
          let itemsA = [],
            itemsB = [];

          fetchedItems.forEach((fi) => {
            const priceA = fi.pricesByStore[storeA] || fi.avgPrice;
            const priceB = fi.pricesByStore[storeB] || fi.avgPrice;
            if (priceA <= priceB) {
              currentRawTotal += priceA * fi.qty;
              itemsA.push({ name: fi.item.name, price: priceA, qty: fi.qty });
            } else {
              currentRawTotal += priceB * fi.qty;
              itemsB.push({ name: fi.item.name, price: priceB, qty: fi.qty });
            }
          });

          const currentNetTotal = currentRawTotal + TRAVEL_PENALTY; // הוספת הקנס

          if (
            currentNetTotal < bestTwoStopNetTotal &&
            itemsA.length > 0 &&
            itemsB.length > 0
          ) {
            bestTwoStopNetTotal = currentNetTotal;
            bestTwoStop = {
              stores: [storeA, storeB],
              rawTotal: currentRawTotal, // עלות המצרכים בלבד
              netTotal: currentNetTotal, // עלות כולל קנס זמן נסיעה
              groups: {
                [storeA]: { items: itemsA },
                [storeB]: { items: itemsB },
              },
            };
          }
        }
      }

      // מחליטים מה כדאי להציג: מציגים פיצולים רק אם הם זולים יותר מקנייה במקום אחד *אחרי* הקנס
      const isTwoStopWorthIt =
        bestTwoStop && bestTwoStop.netTotal < bestOneStop.total;
      const isExtremeWorthIt =
        extremeStoreCount > 1 && extremeNetTotal < bestOneStop.total;

      setUltimateCartData({
        oneStop: bestOneStop,
        twoStops: isTwoStopWorthIt ? bestTwoStop : null,
        extreme: isExtremeWorthIt
          ? {
              rawTotal: extremeRawTotal,
              netTotal: extremeNetTotal,
              groups: extremeGroups,
              penalty: extremePenalty,
            }
          : null,
        penaltyRate: TRAVEL_PENALTY,
      });
    } catch (err) {
      console.error(err);
      showToast("שגיאה בחישוב העגלות.", "error");
    }
    setIsUltimateCartLoading(false);
  };

  const [predictions, setPredictions] = useState([]);
  const [isPredicting, setIsPredicting] = useState(false);

  const generatePredictions = async () => {
    setIsPredicting(true);
    const now = Date.now();
    const suggestions = [];

    items.forEach((item) => {
      // אנחנו מנבאים רק למוצרים שיש להם היסטוריה של לפחות 2 קניות
      if (item.priceHistory && item.priceHistory.length >= 2) {
        // חישוב המרווח הממוצע בימים בין הקניות
        const timestamps = item.priceHistory
          .map((h) => h.timestamp)
          .filter((t) => t !== undefined)
          .sort((a, b) => b - a); // מהחדש לישן

        if (timestamps.length < 2) return;

        const diffs = [];
        for (let i = 0; i < timestamps.length - 1; i++) {
          diffs.push(timestamps[i] - timestamps[i + 1]);
        }

        const avgDiffMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const avgDiffDays = avgDiffMs / (1000 * 60 * 60 * 24);

        const msSinceLastPurchase = now - timestamps[0];
        const daysSinceLastPurchase =
          msSinceLastPurchase / (1000 * 60 * 60 * 24);

        // אם עבר יותר מ-80% מהזמן הממוצע, והמוצר לא כרגע ברשימת הקניות
        if (
          daysSinceLastPurchase >= avgDiffDays * 0.8 &&
          item.current >= item.target
        ) {
          suggestions.push({
            ...item,
            predictedDays: Math.round(avgDiffDays),
            daysPassed: Math.round(daysSinceLastPurchase),
          });
        }
      }
    });

    if (suggestions.length === 0) {
      showToast(
        "המלאי נראה מצוין! 🤩 אין מצרכים שדורשים חידוש כרגע לפי קצב הצריכה שלכם.",
        "success",
      );
    } else {
      showToast(`מצאנו ${suggestions.length} מצרכים שאולי חסרים!`, "success");
    }

    setPredictions(suggestions);
    setIsPredicting(false);
  };

  const [rescueRecipe, setRescueRecipe] = useState(null);
  const [isRescuing, setIsRescuing] = useState(false);

  const generateRescueRecipe = async () => {
    setIsRescuing(true);
    setRescueRecipe(null);

    try {
      // מחפשים במזווה מוצרים שהתוקף שלהם פג או עומד לפוג (4 ימים או פחות)
      const expiringItems = inStock
        .filter((item) => {
          if (!item.expirationDate) return false;

          const today = new Date();
          const exp = new Date(item.expirationDate);
          const diffTime = exp - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return diffDays <= 4;
        })
        .map((i) => i.name);

      if (expiringItems.length === 0) {
        showToast(
          "איזה יופי! 🎉 אין לכם מוצרים שעומדים לפוג תוקף במזווה.",
          "success",
        );
        setIsRescuing(false);
        return;
      }

      // קריאה לשירות ה-AI המגובה
      const result = await getRescueRecipe(expiringItems);
      setRescueRecipe(result);
    } catch (e) {
      console.error(e);
      showToast("שגיאה ביצירת המתכון להצלה.", "error");
    }
    setIsRescuing(false);
  };
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let totalSpent = 0;
    const storeTotals = {};
    items.forEach((item) => {
      if (item.priceHistory) {
        item.priceHistory.forEach((entry) => {
          if (entry.timestamp) {
            const d = new Date(entry.timestamp);
            if (
              d.getMonth() === currentMonth &&
              d.getFullYear() === currentYear
            ) {
              totalSpent += entry.price;
              storeTotals[entry.store] =
                (storeTotals[entry.store] || 0) + entry.price;
            }
          }
        });
      }
    });
    return { totalSpent, storeTotals };
  }, [items]);

  const addItemToCartFromRec = async (rec) => {
    const cleanName = rec.name.trim();

    try {
      // 1. הוספה רגילה לעגלה מההמלצה
      await addDoc(collection(db, "groceries"), {
        name: cleanName,
        category: rec.category || "כללי",
        store: activeStore,
        current: 0,
        target: rec.qty || 1,
        note: "המלצת AI ✨",
        isBought: false,
        createdAt: new Date(),
        listId: sharedListId,
      });

      // 2. עדכון הקטלוג הכללי עבור הרובוט השואב
      const safeId = cleanName.replace(/\//g, "-");
      const catalogDocRef = doc(db, "product_catalog", safeId);
      const catalogSnapshot = await getDoc(catalogDocRef);

      if (!catalogSnapshot.exists()) {
        // חיפוש חכם בקטלוג הקיים למוצר שמכיל את השם שהוקלד (או שהשם שהוקלד מכיל אותו)
        const matchedCatalogItem = catalog.find(
          (c) =>
            c.name.toLowerCase().includes(cleanName.toLowerCase()) ||
            cleanName.toLowerCase().includes(c.name.toLowerCase()),
        );

        // אם מצאנו מוצר דומה, ניקח את הברקוד שלו. אחרת, יישאר ריק
        const matchedBarcode = matchedCatalogItem
          ? matchedCatalogItem.barcode
          : "";

        await setDoc(catalogDocRef, {
          barcode: matchedBarcode.toString(),
          addedAt: new Date(),
          priorityUpdate: true, // 🌟 מסמן לרובוט לעדכן את זה בסבב הבא בהקדם!
        });
      } else {
        // אם המוצר כבר קיים בקטלוג, נסמן אותו לעדכון דחוף בשרת
        await updateDoc(catalogDocRef, {
          priorityUpdate: true,
        });
      }
    } catch (e) {
      console.error("שגיאה בהוספה מהמלצה:", e);
    }
  };

  const generateSmartGroceryList = async (answers) => {
    setIsAiLoading(true);
    try {
      // קריאה לשירות ה-AI המגובה
      const result = await getSmartGroceryList(answers);
      setAiRecommendations(result);
      setPlannerStep(2);
    } catch (e) {
      console.error(e);
      showToast(
        "השף נתקל בבעיה. אולי בחרת יותר מדי אפשרויות? נסה שוב.",
        "error",
      );
    }
    setIsAiLoading(false);
  };
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);

  const handleReceiptScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanningReceipt(true);
    setIsReceiptLoading(true); // מפעיל את מסך ההמתנה של ה-AI
    try {
      // ממירים את התמונה לפורמט שה-AI מבין (Base64)
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onloadend = async () => {
        const base64data = reader.result.split(",")[1];

        // קריאה לשירות פענוח קבלות המגובה
        const receiptData = await getReceiptScan(base64data, file.type);
        const storeName = "סופרמרקט";
        let addedCount = 0;
        let updatedCount = 0;
        let totalSavings = 0;

        // עוברים על כל המוצרים שה-AI מצא בקבלה
        for (const receiptItem of receiptData.items) {
          const timestamp = Date.now();
          const dateStr = new Date().toLocaleDateString("he-IL");

          const itemPriceTotal = parseFloat(receiptItem.price) || 0;
          const itemQty = parseInt(receiptItem.qty) || 1;
          const unitPrice = itemPriceTotal / itemQty; // מחיר ליחידה אחת

          // נחפש מוצר קיים עם שם דומה או זהה (בהתעלם מרווחים ואותיות גדולות/קטנות)
          const cleanReceiptName = receiptItem.name.trim().toLowerCase();
          const existingItem = items.find((existing) => {
            const existingName = existing.name.trim().toLowerCase();
            return (
              existingName === cleanReceiptName ||
              existingName.includes(cleanReceiptName) ||
              cleanReceiptName.includes(existingName)
            );
          });

          // חישוב מחיר היסטורי ממוצע לבדיקת מבצעים
          let usualPrice = null;
          if (
            existingItem &&
            existingItem.priceHistory &&
            existingItem.priceHistory.length > 0
          ) {
            const pastPrices = existingItem.priceHistory.map((h) => h.price);
            usualPrice =
              pastPrices.reduce((a, b) => a + b, 0) / pastPrices.length;
          }

          // אם המחיר הנוכחי זול מהמחיר הרגיל - נחשב את החיסכון!
          if (usualPrice && unitPrice < usualPrice) {
            const savingsPerUnit = usualPrice - unitPrice;
            totalSavings += savingsPerUnit * itemQty;
          }

          const priceEntry = {
            price: unitPrice,
            store: storeName,
            date: dateStr,
            timestamp,
          };

          if (existingItem) {
            // 2א. עדכון מוצר קיים ברשימה - סימון כנקנה והוספת המחיר להיסטוריה
            const updatedHistory = [
              priceEntry,
              ...(existingItem.priceHistory || []),
            ].slice(0, 10);

            await updateDoc(doc(db, "groceries", existingItem.id), {
              current: Math.max(
                existingItem.target,
                existingItem.current + itemQty,
              ),
              isBought: false, // false כדי שייכנס ישירות למזווה
              boughtBy:
                user?.displayName || user?.email?.split("@")[0] || "אנונימי",
              priceHistory: updatedHistory,
              store: storeName, // מעדכן לחנות ממנה נקנה
              note: "עודכן מקבלה 📸",
            });
            updatedCount++;
          } else {
            // 2ב. הוספת מוצר חדש למזווה (במידה ולא היה ברשימה המקורית)
            await addDoc(collection(db, "groceries"), {
              name: receiptItem.name,
              category: receiptItem.category || "כללי",
              store: storeName,
              current: itemQty, // מעדכן מלאי נוכחי
              target: 0,
              isBought: false, // false כדי שייכנס ישירות למזווה
              priceHistory: [priceEntry],
              createdAt: new Date(),
              listId: sharedListId || user.uid,
              note: "נסרק מקבלה 📸",
              addedBy:
                user?.displayName || user?.email?.split("@")[0] || "אנונימי",
            });
            addedCount++;
          }

          // 3. עדכון מאגר המחירים הגלובלי (חוכמת ההמונים)
          try {
            const normalizedName = receiptItem.name.toLowerCase().trim();
            const globalDocRef = doc(db, "global_prices", normalizedName);
            const globalDocSnap = await getDoc(globalDocRef);

            let currentGlobalData = {};
            if (globalDocSnap.exists()) {
              currentGlobalData = globalDocSnap.data();
            }

            let storeHistory = currentGlobalData[storeName] || [];
            storeHistory = [
              { price: unitPrice, date: dateStr, timestamp },
              ...storeHistory,
            ].slice(0, 3);

            await setDoc(
              globalDocRef,
              {
                [storeName]: storeHistory,
                lastUpdated: timestamp,
              },
              { merge: true },
            );

            // סימון בקטלוג המרכזי שיש למוצר מחיר
            const catalogDocRef = doc(
              db,
              "product_catalog",
              receiptItem.name.trim(),
            );
            await setDoc(catalogDocRef, { hasPrice: true }, { merge: true });
          } catch (err) {
            console.error("שגיאה בעדכון מחיר גלובלי:", err);
          }
        }

        // הצגת סיכום הסריקה
        let summaryMessage = `✅ קבלה נסרקה מ-${storeName}! `;
        if (updatedCount > 0)
          summaryMessage += `סימנו ${updatedCount} מוצרים כנקנו. `;
        if (addedCount > 0)
          summaryMessage += `נוספו ${addedCount} חדשים למזווה.`;

        showToast(summaryMessage, "success");

        // 4. במידה וזוהו מבצעים וחיסכון - מקפיצים הודעה ייעודית!
        if (totalSavings > 0) {
          setTimeout(() => {
            showToast(
              `🎉 איתרנו מבצעים בקבלה! חסכת ₪${totalSavings.toFixed(2)} בהשוואה למחיר הרגיל שבו קנית בעבר!`,
              "success",
            );
          }, 1500);
        }

        setActiveStore(storeName); // מעביר אוטומטית לטאב של החנות שנסרקה!
        setIsScanningReceipt(false);
        setIsReceiptLoading(false);
      };
    } catch (error) {
      console.error("Receipt scan error:", error);
      showToast("שגיאה בסריקת הקבלה. ודא שהתמונה ברורה.", "error");
      setIsScanningReceipt(false);
      setIsReceiptLoading(false);
    }
  };

  if (loadingAuth) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "var(--bg-body)",
          textAlign: "center",
        }}
      >
        <motion.div
          animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          style={{
            fontSize: "60px",
            marginBottom: "15px",
            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))",
          }}
        >
          🛒
        </motion.div>
        <h2
          style={{
            color: "var(--primary)",
            margin: "0 0 10px",
            fontSize: "24px",
          }}
        >
          מכין את הסופרמרקט...
        </h2>
        <p style={{ color: "var(--text-light)", margin: 0, fontSize: "15px" }}>
          מסדר את המדפים וטוען נתונים 📦
        </p>
      </div>
    );
  }
  if (!user) {
    return (
      <LandingPage onLoginClick={() => signInWithPopup(auth, googleProvider)} />
    );
  }

  // חישוב התקדמות קניות מותאם לחנות הפעילה בלבד ולמוצרים שברשימת הקניות
  const activeInCartCount = items.filter(
    (i) =>
      (i.store === activeStore || (!i.store && activeStore === "סופרמרקט")) &&
      i.isBought,
  ).length;
  const activeToBuyCount = items.filter(
    (i) =>
      (i.store === activeStore || (!i.store && activeStore === "סופרמרקט")) &&
      i.current < i.target &&
      !i.isBought,
  ).length;
  const activeTotalCount = activeInCartCount + activeToBuyCount;
  const activeProgressPercent =
    activeTotalCount > 0
      ? Math.round((activeInCartCount / activeTotalCount) * 100)
      : 0;
  return (
    <div className="app-container">
      {/* {/* הכפתור בראש העמוד כדי שלא יתחבא מאחורי שום תנאי */}
      {/* <button
        onClick={seedCatalogDatabase}
        style={{
          background: "#e74c3c",
          color: "white",
          padding: "15px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "16px",
          width: "100%",
          marginBottom: "20px",
          zIndex: 9999, // מבטיח שהוא יהיה מעל אלמנטים אחרים
        }}
      >
        ⚙️ (מנהל) לחץ כאן לטעינת 1,000 מוצרים ל-Firebase
      </button> */}
      <AppGuide />
      {/* --- ההודעה למשתמשי אייפון --- */}
      {isIOS && (
        <div
          style={{
            background: "#3b82f6",
            color: "white",
            padding: "15px",
            textAlign: "center",
            fontSize: "14px",
            zIndex: 9999,
            position: "relative",
          }}
        >
          🍎 משתמש אייפון? לחץ על <b>שתף ⍐</b> ובחר <b>'הוסף למסך הבית'</b>{" "}
          לחוויה מלאה!
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={() => setIsIOS(false)}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "white",
                padding: "5px 15px",
                borderRadius: "15px",
                cursor: "pointer",
              }}
            >
              הבנתי, סגור
            </button>
          </div>
        </div>
      )}
      {isReceiptLoading && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: "center" }}>
            <div className="cooking-loader">🧾</div>
            <h3>ה-AI קורא את הקבלה...</h3>
            <p>זה ייקח כמה שניות. מנתח מחירים ומכניס למערכת</p>
          </div>
        </div>
      )}
      {isAiLoading && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: "center" }}>
            <div className="cooking-loader">👨‍🍳</div>
            <h3>השף עובד...</h3>
            <p>אנא המתן</p>
          </div>
        </div>
      )}
      {isImportModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 15px" }}>🔗 ייבוא מתכון מקישור</h3>
            <p style={{ fontSize: 13, marginBottom: 15 }}>
              הדבק קישור לאתר מתכונים, וה-AI יחלץ את המצרכים ואת שלבי ההכנה
              עבורך.
            </p>
            <input
              className="f-input"
              style={{
                width: "100%",
                marginBottom: 15,
                boxSizing: "border-box",
              }}
              placeholder="https://www.example.com/recipe"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="generate-list-btn"
                onClick={handleImportRecipe}
              >
                חלץ מתכון
              </button>
              <button
                className="store-tab"
                onClick={() => setIsImportModalOpen(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
      {aiResult && (
        <div className="modal-overlay" onClick={() => setAiResult(null)}>
          <div
            className="modal-content ai-recipe-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>✨ {aiResult.title}</h2>
            <p>
              <strong>🕒 זמן הכנה:</strong> {aiResult.time}
            </p>
            <h4>מצרכים:</h4>
            <ul>
              {aiResult.ingredients.map((ing, i) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
            <h4>הוראות:</h4>
            <ol>
              {(aiResult.instructions || []).map((inst, i) => (
                <li key={i}>{inst}</li>
              ))}
            </ol>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="generate-list-btn" onClick={saveAiRecipe}>
                שמור בספר המתכונים
              </button>
              <button className="store-tab" onClick={() => setAiResult(null)}>
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
      {isPlannerModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsPlannerModalOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "550px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3 style={{ margin: 0 }}>🪄 מה בא לכם לאכול השבוע?</h3>
              <button
                onClick={() => setIsPlannerModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {plannerStep === 1 ? (
              <div
                className="planner-wizard"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {/* 1. מי אוכל? */}
                <div className="wizard-section">
                  <h4 style={{ margin: "0 0 10px" }}>
                    👥 עבור מי אנחנו קונים?
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>מבוגרים:</span>
                      <button
                        className="btn-mini"
                        onClick={() =>
                          setPlannerAnswers((p) => ({
                            ...p,
                            adults: Math.max(1, p.adults - 1),
                          }))
                        }
                      >
                        -
                      </button>
                      <span style={{ fontWeight: "bold" }}>
                        {plannerAnswers.adults}
                      </span>
                      <button
                        className="btn-mini"
                        onClick={() =>
                          setPlannerAnswers((p) => ({
                            ...p,
                            adults: p.adults + 1,
                          }))
                        }
                      >
                        +
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>ילדים:</span>
                      <button
                        className="btn-mini"
                        onClick={() =>
                          setPlannerAnswers((p) => ({
                            ...p,
                            kids: Math.max(0, p.kids - 1),
                          }))
                        }
                      >
                        -
                      </button>
                      <span style={{ fontWeight: "bold" }}>
                        {plannerAnswers.kids}
                      </span>
                      <button
                        className="btn-mini"
                        onClick={() =>
                          setPlannerAnswers((p) => ({ ...p, kids: p.kids + 1 }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. תזונה והעדפות */}
                <div className="wizard-section">
                  <h4 style={{ margin: "0 0 10px" }}>🥗 סגנון תזונה</h4>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {[
                      "צמחוני",
                      "טבעוני",
                      "ללא גלוטן",
                      "רגישות ללקטוז",
                      "אוכל מותאם לילדים קטנים",
                      "דיאטטי / דל קלוריות",
                    ].map((diet) => (
                      <button
                        key={diet}
                        className={`chip-btn ${plannerAnswers.diets.includes(diet) ? "active" : ""}`}
                        onClick={() => togglePlannerChip("diets", diet)}
                      >
                        {diet}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. סגנון ארוחות */}
                <div className="wizard-section">
                  <h4 style={{ margin: "0 0 10px" }}>👨‍🍳 איזה אוכל בא לכם?</h4>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {[
                      "ארוחות ב-10 דקות",
                      "אוכל מנחם ומושחת",
                      "בריא וקליל",
                      "מטבח איטלקי 🍝",
                      "מטבח אסייתי 🥢",
                      "על האש / בשרים 🥩",
                      "פשטידות ומאפים",
                    ].map((vibe) => (
                      <button
                        key={vibe}
                        className={`chip-btn ${plannerAnswers.vibes.includes(vibe) ? "active" : ""}`}
                        onClick={() => togglePlannerChip("vibes", vibe)}
                      >
                        {vibe}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. סוגי ארוחות */}
                <div className="wizard-section">
                  <h4 style={{ margin: "0 0 10px" }}>🍽️ למה צריך לדאוג?</h4>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {[
                      "ארוחות בוקר",
                      'צהריים לעבודה/בי"ס',
                      "ארוחות ערב חמות",
                      "נשנושים בין לבין",
                      'מארחים השבוע בסופ"ש',
                    ].map((meal) => (
                      <button
                        key={meal}
                        className={`chip-btn ${plannerAnswers.meals.includes(meal) ? "active" : ""}`}
                        onClick={() => togglePlannerChip("meals", meal)}
                      >
                        {meal}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className="wizard-section"
                  style={{
                    background: "var(--bg)",
                    padding: "10px",
                    borderRadius: "10px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                      cursor: "pointer",
                      margin: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{ width: "18px", height: "18px" }}
                      checked={plannerAnswers.needsBasics}
                      onChange={(e) =>
                        setPlannerAnswers({
                          ...plannerAnswers,
                          needsBasics: e.target.checked,
                        })
                      }
                    />
                    <span style={{ fontWeight: "bold" }}>
                      להוסיף גם מוצרי יסוד קבועים (חלב, לחם וכו')?
                    </span>
                  </label>
                </div>

                <button
                  className="smart-split-btn"
                  style={{
                    background: "var(--primary)",
                    color: "white",
                    padding: "15px",
                    fontSize: "16px",
                  }}
                  onClick={() => generateSmartGroceryList(plannerAnswers)}
                >
                  ✨ קסם! בנה לי רשימה לפי הבחירות
                </button>
              </div>
            ) : (
              <div
                className="planner-results"
                style={{
                  maxHeight: "70vh",
                  overflowY: "auto",
                  paddingRight: "5px",
                }}
              >
                {aiRecommendations?.basics?.length > 0 && (
                  <div
                    style={{
                      background: "var(--bg)",
                      padding: "15px",
                      borderRadius: "12px",
                      marginBottom: "20px",
                    }}
                  >
                    <h4 style={{ margin: "0 0 15px", fontSize: "16px" }}>
                      🏠 השלמות למזווה:
                    </h4>
                    {aiRecommendations.basics.map((item, i) => (
                      <div
                        key={i}
                        className="rec-row"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ fontSize: "15px" }}>
                          {item.name} ({item.qty})
                        </span>
                        <button
                          className="add-price-btn"
                          onClick={() => addItemToCartFromRec(item)}
                        >
                          + הוסף
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <h4 style={{ margin: "0 0 15px", fontSize: "18px" }}>
                  🥘 ההמלצות שלי לתפריט:
                </h4>
                {aiRecommendations?.dishes?.map((dish, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: "20px",
                      padding: "15px",
                      background: "var(--bg-body)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 5px",
                        color: "var(--primary)",
                        fontSize: "17px",
                      }}
                    >
                      {dish.dishName}
                    </h4>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--text-light)",
                        margin: "0 0 15px",
                      }}
                    >
                      {dish.recipeLink}
                    </p>

                    <div
                      style={{
                        background: "var(--bg)",
                        padding: "10px",
                        borderRadius: "8px",
                        marginBottom: "15px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: "bold",
                          margin: "0 0 8px",
                        }}
                      >
                        מצרכים לקנייה:
                      </p>
                      {dish.ingredients.map((ing, j) => (
                        <div
                          key={j}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "13px",
                            marginBottom: "6px",
                          }}
                        >
                          <span>
                            • {ing.name} ({ing.qty})
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      className="smart-split-btn"
                      style={{
                        width: "100%",
                        background: "var(--primary)",
                        color: "white",
                      }}
                      onClick={async () => {
                        for (let ing of dish.ingredients)
                          await addItemToCartFromRec(ing);
                        await addDoc(collection(db, "recipes"), {
                          name: dish.dishName,
                          ingredients: dish.ingredients.map((ing) => ing.name),
                          instructions: [dish.recipeLink],
                          createdAt: new Date(),
                          listId: sharedListId,
                        });
                        showToast(
                          "✅ התבשיל הועבר לרשימת הקניות ולספר המתכונים שלך!",
                          "success",
                        );
                      }}
                    >
                      הוסף הכל לעגלה ולמתכונים
                    </button>
                  </div>
                ))}

                <button
                  className="store-tab active"
                  style={{ width: "100%", marginTop: 20, padding: "12px" }}
                  onClick={() => setPlannerStep(1)}
                >
                  <i className="fas fa-undo"></i> חזור ושנה בחירות
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {globalPriceModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() =>
            setGlobalPriceModal({
              isOpen: false,
              itemName: "",
              data: null,
              isLoading: false,
            })
          }
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px", maxHeight: "80vh", overflowY: "auto" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3 style={{ margin: 0 }}>
                🌍 חוכמת ההמונים: {globalPriceModal.itemName}
              </h3>
              <button
                onClick={() =>
                  setGlobalPriceModal({
                    isOpen: false,
                    itemName: "",
                    data: null,
                    isLoading: false,
                  })
                }
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {globalPriceModal.isLoading ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                מחפש נתונים בקהילה... 🔍
              </div>
            ) : !globalPriceModal.data ||
              Object.keys(globalPriceModal.data).length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "var(--text-light)",
                }}
              >
                עדיין אין נתונים קהילתיים למוצר זה. <br /> היה הראשון לתעד מחיר!
                🥇
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                {Object.entries(globalPriceModal.data)
                  .sort((a, b) => {
                    // מיון רשתות מהזולה ליקרה (לפי המחיר האחרון המעודכן בכל רשת)
                    const priceA = a[1][0]?.price || 0;
                    const priceB = b[1][0]?.price || 0;
                    return priceA - priceB;
                  })
                  .map(([store, prices]) => (
                    <div
                      key={store}
                      style={{
                        background: "var(--bg)",
                        padding: "10px",
                        borderRadius: "8px",
                        borderLeft: "4px solid var(--primary)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span style={{ fontWeight: "bold", fontSize: "15px" }}>
                          {store}
                        </span>
                        {prices.length > 0 && (
                          <span
                            style={{
                              fontWeight: "900",
                              color: "var(--success)",
                            }}
                          >
                            ₪{prices[0].price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-light)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {prices.map((p, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              opacity: idx === 0 ? 1 : 0.6,
                            }}
                          >
                            <span>
                              {idx === 0 ? "מחיר אחרון" : `עדכון קודם`} (
                              {p.date})
                            </span>
                            <span>₪{p.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
      <header className="user-header">
        <h2 className="header-title">
          {currentView === "home"
            ? ""
            : currentView === "shopping"
              ? `🛒 ${activeStore}`
              : currentView === "insights" || currentView === "stats"
                ? "📊 תובנות"
                : currentView === "recipes"
                  ? "🍳 מתכונים"
                  : currentView === "planner"
                    ? "📅 תפריט שבועי"
                    : currentView === "pantry"
                      ? "🧊 מזווה חכם"
                      : currentView === "compare"
                        ? "💰 השוואת מחירים"
                        : currentView === "profile"
                          ? "⚙️ פרופיל"
                          : ""}
        </h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="theme-toggle"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button
            onClick={() => signOut(auth)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-light)",
              fontSize: 12,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            התנתק
          </button>
        </div>
      </header>
      {isScannerOpen && (
        <div className="modal-overlay" onClick={() => setIsScannerOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 10 }}
          >
            <h3 style={{ margin: "0 0 10px", textAlign: "center" }}>
              📷 סורק ברקוד
            </h3>
            <div id="reader"></div>
            <button
              className="store-tab active"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() => setIsScannerOpen(false)}
            >
              ביטול סריקה
            </button>
          </div>
        </div>
      )}
      {currentView === "home" && (
        <section className="dashboard">
          {/* ברכת שלום */}
          <div className="greeting-card">
            <div>
              <h1 className="greeting-title">
                {new Date().getHours() < 12 && new Date().getHours() > 6
                  ? "☀️ בוקר טוב"
                  : new Date().getHours() < 17 && new Date().getHours() > 12
                    ? "🌤️ צהריים טובים"
                    : "🌙 ערב טוב"}
                , {user.displayName?.split(" ")[0]}
              </h1>
              <p className="greeting-subtitle">
                {new Date().toLocaleDateString("he-IL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
            <img
              src={user.photoURL}
              className="greeting-avatar"
              alt=""
              referrerPolicy="no-referrer"
            />
          </div>
          {/* כרטיס התקדמות קניות */}
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setCurrentView("shopping");
            }}
            className="progress-card"
            onClick={() => setCurrentView("shopping")}
          >
            <div className="progress-header">
              <span className="progress-emoji">🛒</span>
              <div>
                <h3 className="progress-title">רשימת קניות</h3>
                <p className="progress-sub">
                  {activeInCartCount} מתוך {activeTotalCount} פריטים
                </p>
              </div>
              <i className="fas fa-chevron-left progress-arrow"></i>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${activeProgressPercent}%`,
                }}
              />
            </div>
            <span className="progress-percent">
              {activeProgressPercent}% הושלמו
            </span>
          </div>

          {/* קיצורים חכמים */}
          <h3 className="section-title">⚡ קיצורים</h3>
          <div className="quick-actions-grid">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  setCurrentView("recipes");
              }}
              className="quick-action"
              onClick={() => setCurrentView("recipes")}
            >
              <span className="qa-icon">🍳</span>
              <span className="qa-label">מתכונים</span>
            </div>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  setCurrentView("planner");
              }}
              className="quick-action"
              onClick={() => setCurrentView("planner")}
            >
              <span className="qa-icon">📅</span>
              <span className="qa-label">לו"ז שבועי</span>
            </div>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  setCurrentView("pantry");
              }}
              className="quick-action"
              onClick={() => setCurrentView("pantry")}
            >
              <span className="qa-icon">🧊</span>
              <span className="qa-label">מזווה</span>
            </div>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  setCurrentView("compare");
              }}
              className="quick-action"
              onClick={() => setCurrentView("compare")}
            >
              <span className="qa-icon">💰</span>
              <span className="qa-label">מחירים</span>
            </div>
          </div>

          {/* בני בית מחוברים */}
          {activeUsers.length > 1 && (
            <div className="family-online-card">
              <div className="family-avatars">
                {activeUsers
                  .filter((u) => u.uid !== user.uid)
                  .map((u) => (
                    <img
                      key={u.uid}
                      src={u.photoURL}
                      className="family-avatar"
                      alt={u.name}
                      referrerPolicy="no-referrer"
                    />
                  ))}
              </div>
              <span className="family-text">
                {activeUsers.length - 1}{" "}
                {activeUsers.length - 1 === 1
                  ? "בן בית מחובר"
                  : "בני בית מחוברים"}{" "}
                עכשיו
              </span>
            </div>
          )}

          {/* כפתור הגדרות */}
          <button
            className="quick-action"
            onClick={() => {
              setCurrentView("shopping");
              setIsSettingsOpen(true);
            }}
            style={{
              flexDirection: "row",
              gap: 10,
              justifyContent: "center",
              width: "100%",
              padding: "14px",
            }}
          >
            <span>⚙️</span>
            <span className="qa-label" style={{ fontSize: 14 }}>
              הגדרות ושיתוף משפחתי
            </span>
          </button>
        </section>
      )}
      {currentView === "shopping" && (
        <ShoppingView
          uniqueStores={uniqueStores}
          activeStore={activeStore}
          setActiveStore={setActiveStore}
          handleAddStore={handleAddStore}
          isSettingsOpen={isSettingsOpen}
          deferredPrompt={deferredPrompt}
          handleInstallApp={handleInstallApp}
          user={user}
          joinCodeInput={joinCodeInput}
          setJoinCodeInput={setJoinCodeInput}
          joinFamilyList={joinFamilyList}
          leaveFamilyList={leaveFamilyList}
          sharedListId={sharedListId}
          stores={stores}
          deleteStore={deleteStore}
          displayOrder={displayOrder}
          moveCategory={moveCategory}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setIsPlannerModalOpen={setIsPlannerModalOpen}
          setPlannerStep={setPlannerStep}
          setAiRecommendations={setAiRecommendations}
          hasOpenCats={hasOpenCats}
          closeAllCategories={closeAllCategories}
          shoppingList={shoppingList}
          shopTotal={shopTotal}
          setIsSmartSplitOpen={setIsSmartSplitOpen}
          groupItems={groupItems}
          sortCategories={sortCategories}
          toggleCat={toggleCat}
          collapsedCats={collapsedCats}
          inCart={inCart}
          cartTotal={cartTotal}
          updateItemStatus={updateItemStatus}
          inStock={inStock}
          changeCategory={changeCategory}
          toggleRecurring={toggleRecurring}
          logPrice={logPrice}
          deletePriceEntry={deletePriceEntry}
          updateQuantity={updateQuantity}
          deleteItem={deleteItem}
          addItem={addItem}
          activeSuggestions={activeSuggestions}
          newItemName={newItemName}
          setNewItemName={setNewItemName}
          newItemCategory={newItemCategory}
          setNewItemCategory={setNewItemCategory}
          setShowSuggestions={setShowSuggestions}
          startListening={startListening}
          isListening={isListening}
          setIsScannerOpen={setIsScannerOpen}
          handleReceiptScan={handleReceiptScan}
          newItemTarget={newItemTarget}
          setNewItemTarget={setNewItemTarget}
          ultimateCartData={ultimateCartData}
          isUltimateCartLoading={isUltimateCartLoading}
          calculateUltimateCart={calculateUltimateCart}
          predictions={predictions}
          isPredicting={isPredicting}
          generatePredictions={generatePredictions}
          setPredictions={setPredictions}
          isScanningReceipt={isScanningReceipt}
          generateRescueRecipe={generateRescueRecipe}
          setIsLeaderboardOpen={setIsLeaderboardOpen}
          handleDeleteAccount={handleDeleteAccount}
          catalog={catalog}
          addItemToCartFromRec={addItemToCartFromRec}
          shareListToWhatsApp={shareListToWhatsApp}
          setIsNutritionModalOpen={setIsNutritionModalOpen}
          fixAllCategories={fixAllCategories}
          isAiLoading={isAiLoading}
          triggerAiCategorization={triggerAiCategorization}
          triggerMergeDuplicates={triggerMergeDuplicates}
          categoryModalData={categoryModalData}
          setCategoryModalData={setCategoryModalData}
          applyCategoryChanges={applyCategoryChanges}
          mergeModalData={mergeModalData}
          setMergeModalData={setMergeModalData}
          applyMergeChanges={applyMergeChanges}
          coveragePercentage={coveragePercentage}
          productsWithPrice={productsWithPrice}
          totalProducts={totalProducts}
          fastAddProduct={fastAddProduct}
        />
      )}
      {/* חלון לוח המובילים (Gamification) */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        items={items}
      />

      <NutritionalAnalysisModal
        isOpen={isNutritionModalOpen}
        onClose={() => setIsNutritionModalOpen(false)}
        items={items}
      />

      {currentView === "compare" && <ComparePricesView catalog={catalog} />}
      {currentView === "recipes" && (
        <section>
          <div className="ai-chef-banner" onClick={handleAiAsk}>
            <div style={{ fontSize: 30 }}>🪄</div>
            <div>
              <h3 style={{ margin: 0 }}>השף החכם</h3>
              <p style={{ margin: 0, fontSize: 12 }}>
                המצא מתכון ממה שיש במזווה
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              marginTop: 20,
            }}
          >
            <h2 style={{ margin: 0 }}>🍳 הארוחות שלנו</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="store-tab"
                style={{
                  background: "var(--bg-body)",
                  border: "1px solid var(--border)",
                }}
                onClick={() => setIsImportModalOpen(true)}
              >
                🔗 ייבוא מקישור
              </button>
              <button className="store-tab active" onClick={createNewRecipe}>
                + מתכון חדש
              </button>
            </div>
          </div>
          {recipes.map((recipe) => {
            const { status, missing } = checkRecipeStatus(recipe);
            return (
              <div key={recipe.id} className="recipe-card">
                <div className="recipe-header">
                  <span className="recipe-title">{recipe.name}</span>
                  <div>
                    <button
                      onClick={() =>
                        addIngredientToRecipe(
                          recipe.id,
                          recipe.ingredients || [],
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary)",
                        cursor: "pointer",
                        fontWeight: "bold",
                        marginLeft: 10,
                      }}
                    >
                      + מצרך
                    </button>
                    <button
                      onClick={async () => {
                        const isConfirmed = await showConfirm(
                          "למחוק את המתכון?",
                          "מחק",
                        );

                        if (isConfirmed) {
                          await deleteDoc(doc(db, "recipes", recipe.id));
                        }
                      }} // <--- פה הוספנו סגירה נכונה של הפונקציה ושל ה-onClick
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--danger)",
                        cursor: "pointer",
                      }}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    {status === "ready" && (
                      <span className="status-badge ready">
                        🟢 אפשר להכין! הכל בבית
                      </span>
                    )}
                    {status === "almost" && (
                      <>
                        <span className="status-badge almost">
                          🟠 חסרים {missing.length} מצרכים
                        </span>
                        <button
                          className="add-missing-btn"
                          onClick={() =>
                            pushMissingToCart(missing, recipe.name)
                          }
                        >
                          הוסף חסרים לרשימה
                        </button>
                      </>
                    )}
                    {status === "missing" && (
                      <>
                        <span className="status-badge missing">
                          🔴 חסר הרבה ({missing.length} מצרכים)
                        </span>
                        <button
                          className="add-missing-btn"
                          onClick={() =>
                            pushMissingToCart(missing, recipe.name)
                          }
                        >
                          הוסף חסרים לרשימה
                        </button>
                      </>
                    )}
                  </div>
                )}
                <div className="ingredients-list">
                  {(recipe.ingredients || []).map((ing, idx) => (
                    <span key={idx} className="ingredient-chip">
                      {ing}{" "}
                      <i
                        className="fas fa-times"
                        style={{
                          marginLeft: 5,
                          cursor: "pointer",
                          opacity: 0.5,
                        }}
                        onClick={async () => {
                          const updated = recipe.ingredients.filter(
                            (_, i) => i !== idx,
                          );
                          await updateDoc(doc(db, "recipes", recipe.id), {
                            ingredients: updated,
                          });
                        }}
                      ></i>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
      {currentView === "planner" && (
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.5rem" }}>📅 תפריט שבועי</h2>
            {Object.keys(weeklyPlan).length > 0 && (
              <button className="clear-plan-btn" onClick={clearWeeklyPlan}>
                נקה הכל
              </button>
            )}
          </div>

          <button className="generate-list-btn" onClick={generateWeeklyList}>
            <i className="fas fa-magic"></i> צור רשימת קניות לשבוע
          </button>

          <div className="planner-grid">
            {DAYS_KEYS.map((key, index) => (
              <div key={key} className="day-card">
                <div className="day-title">
                  <span>{DAYS_HEB[index]}</span>
                </div>

                <div className="meals-list">
                  {(weeklyPlan[key] || []).map((meal, mealIdx) => (
                    <div key={mealIdx} className="planned-recipe">
                      <span>{meal.name}</span>
                      <i
                        className="fas fa-times"
                        style={{
                          color: "var(--danger)",
                          cursor: "pointer",
                          opacity: 0.5,
                        }}
                        onClick={() => removeMealFromDay(key, mealIdx)}
                      ></i>
                    </div>
                  ))}
                </div>

                <button
                  className="add-meal-btn"
                  onClick={() => addMealToDay(key)}
                >
                  + הוסף ארוחה
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {currentView === "pantry" && (
        <PantryView items={items} user={user} sharedListId={sharedListId} />
      )}
      {currentView === "stats" && <StatsView stats={stats} items={items} />}
      {/* חלון הפיצול החכם (העגלה האולטימטיבית) */}
      <SmartSplitModal
        isOpen={isSmartSplitOpen}
        onClose={() => setIsSmartSplitOpen(false)}
        ultimateCartData={ultimateCartData}
        isLoading={isUltimateCartLoading}
      />
      {/* חלון השף להצלת מזון */}
      <FoodRescueModal
        rescueRecipe={rescueRecipe}
        isRescuing={isRescuing}
        onClose={() => setRescueRecipe(null)}
      />
      {/* כפתור FAB צף
      {currentView === "shopping" && (
        <button className="fab-add" onClick={() => setIsSettingsOpen(false)}>
          <i className="fas fa-plus"></i>
        </button>
      )} */}
      <nav className="bottom-nav">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsSettingsOpen(false);
              setCurrentView("home");
            }
          }}
          className={`nav-item ${currentView === "home" ? "active" : ""}`}
          onClick={() => {
            setIsSettingsOpen(false);
            setCurrentView("home");
          }}
        >
          <i className="fas fa-home nav-icon"></i>
          <span>בית</span>
        </div>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsSettingsOpen(false);
              setCurrentView("shopping");
            }
          }}
          className={`nav-item ${currentView === "shopping" ? "active" : ""}`}
          onClick={() => {
            setIsSettingsOpen(false);
            setCurrentView("shopping");
          }}
          style={{ position: "relative" }}
        >
          <i className="fas fa-shopping-cart nav-icon"></i>
          <span>קניות</span>
          {items.filter((i) => i.current < i.target && !i.isBought).length >
            0 && (
            <span className="nav-badge">
              {items.filter((i) => i.current < i.target && !i.isBought).length}
            </span>
          )}
        </div>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsSettingsOpen(false);
              setCurrentView("stats");
            }
          }}
          className={`nav-item ${currentView === "stats" || currentView === "insights" ? "active" : ""}`}
          onClick={() => {
            setIsSettingsOpen(false);
            setCurrentView("stats");
          }}
        >
          <i className="fas fa-chart-line nav-icon"></i>
          <span>תובנות</span>
        </div>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              if (isSettingsOpen) {
                setIsSettingsOpen(false);
              } else {
                setCurrentView("shopping");
                setIsSettingsOpen(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }
          }}
          className={`nav-item ${isSettingsOpen ? "active" : ""}`}
          onClick={() => {
            if (isSettingsOpen) {
              setIsSettingsOpen(false);
            } else {
              setCurrentView("shopping");
              setIsSettingsOpen(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          <img
            src={user.photoURL}
            className="nav-avatar"
            alt=""
            referrerPolicy="no-referrer"
          />
          <span>פרופיל</span>
        </div>
      </nav>
      <button
        onClick={handleEmailClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          color: "white",
          padding: "12px 20px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "16px",
          width: "100%",
          marginTop: "20px",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
        }}
      >
        <i className="fas fa-envelope"></i> הצעות לשיפור? כתבו לי במייל
      </button>

      {/* --- באנר הסכמת קוקיז (Cookies) --- */}
      {showCookieBanner && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#1e293b",
            color: "white",
            padding: "15px",
            textDirection: "rtl",
            textAlign: "center",
            zIndex: 10000,
            fontSize: "13px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <span>
            אתר זה משתמש בעוגיות (Cookies) ובניתוח נתונים בסיסי כדי להבטיח את
            פעילות האפליקציה ושמירת הרשימות שלך.
          </span>
          <button
            onClick={() => {
              localStorage.setItem("cookieConsent", "true");
              setShowCookieBanner(false);
            }}
            style={{
              background: "#22c55e",
              color: "white",
              border: "none",
              padding: "6px 15px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            אני מאשר/ת
          </button>
        </div>
      )}
      {/* --- פוטר משפטי מעודכן עם פתיחת חלונות --- */}
      <div
        style={{
          textAlign: "center",
          padding: "20px",
          fontSize: "11px",
          color: "var(--text-light)",
          marginBottom: "8px",
        }}
      >
        <p style={{ margin: "0 0 5px 0" }}>
          * מחירי הקהילה והמתכונים החכמים מבוססים על נתוני משתמשים ובינה
          מלאכותית. יש להפעיל שיקול דעת אישי.
        </p>
        <div>
          <span
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setActiveLegalModal("terms");
            }}
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => setActiveLegalModal("terms")}
          >
            תקנון ותנאי שימוש
          </span>{" "}
          |
          <span
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setActiveLegalModal("privacy");
            }}
            style={{
              cursor: "pointer",
              textDecoration: "underline",
              marginLeft: "5px",
              marginRight: "5px",
            }}
            onClick={() => setActiveLegalModal("privacy")}
          >
            מדיניות פרטיות
          </span>{" "}
          |
          <span
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setActiveLegalModal("accessibility");
            }}
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => setActiveLegalModal("accessibility")}
          >
            הצהרת נגישות
          </span>
        </div>
      </div>
      {/* --- חלון מודאל משפטי דינמי --- */}
      {activeLegalModal && (
        <div
          className="modal-overlay"
          onClick={() => setActiveLegalModal(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "500px",
              maxHeight: "70vh",
              overflowY: "auto",
              textDirection: "rtl",
              textAlign: "right",
            }}
          >
            {activeLegalModal === "terms" && (
              <div>
                <h3>📜 תקנון ותנאי שימוש</h3>
                <p>
                  ברוכים הבאים לאפליקציית רשימת הקניות הביתית. השימוש באפליקציה
                  מהווה הסכמה לתנאים אלו.
                </p>
                <p>
                  <strong>1. הגבלת אחריות:</strong> השירות ניתן לשימוש כפי שהוא
                  (As-Is). המפתח אינו נושא באחריות לכל נזק, אובדן נתונים, שגיאה
                  במערכת, עוגמת נפש או אי-התאמה של מידע שייגרמו כתוצאה משימוש
                  באפליקציה.
                </p>
                <p>
                  <strong>2. תוכן משתמשים:</strong> המשתמש נושא באחריות המלאה
                  לכל תוכן, טקסט, מתכון או מוצר שהוא מזין למערכת. הנהלת
                  האפליקציה לא תישא באחריות לתוכן פוגעני, שגוי או כזה המפר
                  זכויות יוצרים שיוזן על ידי המשתמשים.
                </p>
                <p>
                  <strong>3. מידע קהילתי ובינה מלאכותית:</strong> כל הנתונים
                  המוצגים, לרבות מחירי קהילה (שמוזנים על ידי משתמשים אחרים)
                  והמלצות השף המופקות על ידי בינה מלאכותית (AI), הם בגדר הצעה או
                  הערכה בלבד. אין להסתמך עליהם כמידע רשמי, רפואי, או מחייב.
                </p>
              </div>
            )}

            {activeLegalModal === "privacy" && (
              <div>
                <h3>🔒 מדיניות פרטיות</h3>
                <p>אנו מכבדים את הפרטיות שלך ומתחייבים לשמור עליה.</p>
                <p>
                  <strong>איסוף ושימוש במידע:</strong> האפליקציה אוספת מידע
                  בסיסי הכולל את שמך, כתובת האימייל שלך, תמונת פרופיל (אם סופקה
                  דרך התחברות) ונתוני רשימות הקניות שאתה מזין. המידע משמש אך ורק
                  לצורך תפעול תקין של האפליקציה, סנכרון בין מכשירים ושיתוף
                  רשימות עם בני ביתך.
                </p>
                <p>
                  <strong>עיבוד מידע צד ג':</strong> אנו עשויים להיעזר בשירותי
                  בינה מלאכותית (כגון מודלי שפה של ספקי צד שלישי) לעיבוד שמות
                  מוצרים ומתכונים שאתה מזין, במטרה לשפר את חווית המשתמש ולקטלג
                  מוצרים.
                </p>
                <p>
                  <strong>אבטחה ושמירת מידע:</strong> הנתונים נשמרים באופן
                  מאובטח בשרתי Google Firebase. המידע האישי שלך אינו מועבר, נמכר
                  או משותף עם שום גורם צד שלישי מסחרי לצרכי שיווק.
                </p>
                <p>
                  <strong>זכות המחיקה:</strong> לכל משתמש עומדת הזכות המלאה
                  למחוק את חשבונו בכל עת דרך הגדרות האפליקציה ("מחק חשבון"). עם
                  מחיקת החשבון, כל המידע האישי המקושר אליו נמחק לצמיתות מהשרתים
                  שלנו, למעט נתונים אנונימיים לחלוטין.
                </p>
              </div>
            )}

            {activeLegalModal === "accessibility" && (
              <div>
                <h3>♿ הצהרת נגישות</h3>
                <p>
                  אנו רואים חשיבות עליונה בהנגשת האפליקציה והאתר לאנשים עם
                  מוגבלויות, ומשקיעים מאמצים כדי לאפשר גלישה ושימוש נוחים לכלל
                  המשתמשים, לרבות משתמשי קוראי מסך וניווט מקלדת.
                </p>
                <p>
                  <strong>אמצעי הנגישות באפליקציה:</strong>
                  <ul>
                    <li>
                      תמיכה בניווט באמצעות המקלדת (מקשי Tab, Enter, חצים).
                    </li>
                    <li>
                      הוספת תגיות מזהות (ARIA) ו-Roles לאלמנטים אינטראקטיביים.
                    </li>
                    <li>שימוש בצבעים בעלי ניגודיות גבוהה.</li>
                  </ul>
                </p>
                <p>
                  <strong>פניות בנושא נגישות:</strong>
                  במידה ונתקלתם בקושי בנגישות, ברכיב שאינו מונגש כראוי או שיש
                  לכם הצעות לשיפור, נשמח לשמוע מכם. אנו נעשה את מירב המאמצים
                  לטפל בכל פניה בתוך זמן סביר.
                  <br />
                  ניתן לפנות אלינו באמצעות כפתור הפידבק (ווטסאפ) שמופיע בתחתית
                  עמוד ההגדרות, או באמצעות פניה ישירה למפתח (אנא ציינו באיזה
                  מכשיר/דפדפן נתקלתם בבעיה).
                </p>
                <p>[orishar1000@gmail.com]</p>
              </div>
            )}

            <button
              className="store-tab active"
              style={{ width: "100%", marginTop: "20px", padding: "10px" }}
              onClick={() => setActiveLegalModal(null)}
            >
              סגור חלון
            </button>
          </div>
        </div>
      )}

      {/* --- מדריך קבלת פנים --- */}
      {showWelcomeGuide && (
        <WelcomeGuide onClose={() => setShowWelcomeGuide(false)} />
      )}
    </div>
  );
}

export default App;
