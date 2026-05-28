import { getAiRecipe, getCartNutrition } from "./aiService";
export { genAI } from "./aiService";
// הפונקציה לקריאה ל-AI (מתכונים) עם מנגנון גיבוי
export const generateAiRecipe = async (inputData, isUrl = false) => {
  return getAiRecipe(inputData, isUrl);
};
// פונקציות חישוב פג תוקף
export const getExpStatus = (dateStr) => {
  if (!dateStr) return "";
  const diffDays = Math.ceil(
    (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "expired";
  if (diffDays <= 3) return "danger";
  if (diffDays <= 7) return "warning";
  return "";
};

export const getExpText = (dateStr) => {
  if (!dateStr) return "";
  const diffDays = Math.ceil(
    (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "פג תוקף!";
  if (diffDays === 0) return "פג היום!";
  if (diffDays <= 3) return `נותרו ${diffDays} ימים`;
  return "";
};

// קבועים של ימים
export const DAYS_HEB = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];
export const DAYS_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const ISRAELI_SUPERMARKETS = [
  "שופרסל",
  "רמי לוי",
  "יוחננוף",
  "חצי חינם",
  "ויקטורי",
  "מחסני השוק",
  "אושר עד",
  "טיב טעם",
  "קרפור",
  "קשת טעמים",
  "סופר יודה",
  "AM:PM",
  "סטופ מרקט",
  "סופר דוש",
  "פרשמרקט",
  "מגה",
  "City Market",
  "קינג סטור",
  "מעדני מניה",
  "סופר פארם",
  "Be",
  "אחר",
];

// פונקציה לניתוח תזונתי של העגלה באמצעות AI עם מנגנון גיבוי
export const analyzeCartNutritionally = async (itemsList) => {
  return getCartNutrition(itemsList);
};
export /**
 * Toast Notification במקום alert()
 * @param {string} message - ההודעה להצגה
 * @param {string} type - 'success', 'error', או 'info'
 * @param {number} duration - זמן הצגה באלפיות שנייה
 */
function showToast(message, type = "success", duration = 3000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;

  container.appendChild(toast);

  // העלמת הטוסט אחרי הזמן שהוגדר
  setTimeout(() => {
    toast.classList.add("hide");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

/**
 * Bottom Sheet Prompt במקום prompt()
 * מופעל בצורה אסינכרונית ומחזיר Promise
 * @param {string} title - כותרת החלון (למשל: "הכנס שם פריט")
 * @param {string} defaultValue - ערך התחלתי לתיבת הטקסט (אופציונלי)
 * @returns {Promise<string|null>} - מחזיר את הטקסט או null אם בוטל
 */
export function showPrompt(title, defaultValue = "") {
  return new Promise((resolve) => {
    let overlay = document.getElementById("bottom-sheet-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "bottom-sheet-overlay";
      overlay.className = "bottom-sheet-overlay";
      overlay.innerHTML = `
        <div class="bottom-sheet">
          <div class="bottom-sheet-header">
            <h3 id="bottom-sheet-title"></h3>
            <button class="bottom-sheet-close" id="bottom-sheet-close">&times;</button>
          </div>
          <div class="bottom-sheet-body">
            <input type="text" id="bottom-sheet-input" class="bottom-sheet-input" autocomplete="off" />
          </div>
          <div class="bottom-sheet-footer">
            <button class="btn-cancel" id="bottom-sheet-cancel">ביטול</button>
            <button class="btn-confirm" id="bottom-sheet-confirm">אישור</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const titleEl = document.getElementById("bottom-sheet-title");
    const inputEl = document.getElementById("bottom-sheet-input");
    const closeBtn = document.getElementById("bottom-sheet-close");
    const cancelBtn = document.getElementById("bottom-sheet-cancel");
    const confirmBtn = document.getElementById("bottom-sheet-confirm");

    // אתחול נתונים
    titleEl.innerText = title;
    inputEl.value = defaultValue;

    // הצגת ה-BottomSheet
    overlay.classList.add("active");
    setTimeout(() => inputEl.focus(), 100); // מיקוד אוטומטי על תיבת הטקסט

    // פונקציה לסגירה
    const closeSheet = (returnValue) => {
      overlay.classList.remove("active");
      cleanup();
      resolve(returnValue);
    };

    // ניקוי מאזיני אירועים כדי למנוע כפילויות בפעמים הבאות
    const cleanup = () => {
      closeBtn.removeEventListener("click", onCancel);
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
      inputEl.removeEventListener("keypress", onKeyPress);
    };

    const onCancel = () => closeSheet(null);
    const onConfirm = () => {
      // אם לא הוקלד כלום - אל תחזיר מחרוזת ריקה (התנהגות דומה לביטול/הגנה)
      const val = inputEl.value.trim();
      closeSheet(val || null);
    };
    const onKeyPress = (e) => {
      if (e.key === "Enter") onConfirm();
    };

    // חיבור המאזינים
    closeBtn.addEventListener("click", onCancel);
    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
    inputEl.addEventListener("keypress", onKeyPress);
  });
}

/**
 * Bottom Sheet Confirm במקום confirm()
 * מופעל בצורה אסינכרונית ומחזיר Promise עם true/false
 * @param {string} title - השאלה למשתמש (למשל: "האם אתה בטוח שברצונך למחוק?")
 * @param {string} confirmText - טקסט לכפתור האישור (ברירת מחדל: "אישור")
 * @returns {Promise<boolean>} - מחזיר true אם אישר, false אם ביטל
 */
export function showConfirm(title, confirmText = "אישור") {
  return new Promise((resolve) => {
    let overlay = document.getElementById("bottom-sheet-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "bottom-sheet-overlay";
      overlay.className = "bottom-sheet-overlay";
      document.body.appendChild(overlay);
    }

    // מזריקים את ה-HTML (ללא ה-input שהיה בפרומפט)
    // הוספנו צבע אדום לכפתור האישור למקרה של מחיקה (אפשר לשנות ל-var(--primary) אם זה לא מחיקה)
    overlay.innerHTML = `
      <div class="bottom-sheet">
        <div class="bottom-sheet-header">
          <h3 id="bottom-sheet-title" style="font-size: 18px; margin-bottom: 10px;"></h3>
          <button class="bottom-sheet-close" id="bottom-sheet-close">&times;</button>
        </div>
        <div class="bottom-sheet-footer" style="margin-top: 20px;">
          <button class="btn-cancel" id="bottom-sheet-cancel">ביטול</button>
          <button class="btn-confirm" id="bottom-sheet-confirm" style="background: #ef4444;">${confirmText}</button>
        </div>
      </div>
    `;

    const titleEl = document.getElementById("bottom-sheet-title");
    const closeBtn = document.getElementById("bottom-sheet-close");
    const cancelBtn = document.getElementById("bottom-sheet-cancel");
    const confirmBtn = document.getElementById("bottom-sheet-confirm");

    titleEl.innerText = title;

    // הצגת ה-BottomSheet
    overlay.classList.add("active");

    // פונקציה לסגירה
    const closeSheet = (returnValue) => {
      overlay.classList.remove("active");
      cleanup();
      resolve(returnValue);
    };

    // ניקוי מאזינים
    const cleanup = () => {
      closeBtn.removeEventListener("click", onCancel);
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
    };

    const onCancel = () => closeSheet(false);
    const onConfirm = () => closeSheet(true);

    // חיבור המאזינים
    closeBtn.addEventListener("click", onCancel);
    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
  });
}
