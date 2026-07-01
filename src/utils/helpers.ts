// src/utils/helpers.ts
import { getAiRecipe, getCartNutrition } from "./aiService";
export { genAI } from "./aiService";

export const generateAiRecipe = async (
  inputData: string,
  isUrl: boolean = false,
) => {
  return getAiRecipe(inputData, isUrl);
};

export const getExpStatus = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  const diffDays = Math.ceil(
    (new Date(dateStr).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "expired";
  if (diffDays <= 3) return "danger";
  if (diffDays <= 7) return "warning";
  return "";
};

export const getExpText = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  const diffDays = Math.ceil(
    (new Date(dateStr).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "פג תוקף!";
  if (diffDays === 0) return "פג היום!";
  if (diffDays <= 3) return `נותרו ${diffDays} ימים`;
  return "";
};

export const DAYS_HEB: string[] = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];
export const DAYS_KEYS: string[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export const ISRAELI_SUPERMARKETS: string[] = [
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

export const analyzeCartNutritionally = async (itemsList: any[]) => {
  return getCartNutrition(itemsList);
};

export function showToast(
  message: string,
  type: "success" | "error" | "info" | string = "success",
  duration: number = 3000,
) {
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

  setTimeout(() => {
    toast.classList.add("hide");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

/**
 */
export function showPrompt(
  title: string,
  defaultValue: string = "",
): Promise<string | null> {
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

    const titleEl = document.getElementById(
      "bottom-sheet-title",
    ) as HTMLElement;
    const inputEl = document.getElementById(
      "bottom-sheet-input",
    ) as HTMLInputElement;
    const closeBtn = document.getElementById(
      "bottom-sheet-close",
    ) as HTMLElement;
    const cancelBtn = document.getElementById(
      "bottom-sheet-cancel",
    ) as HTMLElement;
    const confirmBtn = document.getElementById(
      "bottom-sheet-confirm",
    ) as HTMLElement;

    titleEl.innerText = title;
    inputEl.value = defaultValue;

    overlay.classList.add("active");
    setTimeout(() => inputEl.focus(), 100);

    const closeSheet = (returnValue: string | null) => {
      overlay!.classList.remove("active");
      cleanup();
      resolve(returnValue);
    };

    const cleanup = () => {
      closeBtn.removeEventListener("click", onCancel);
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
      inputEl.removeEventListener("keypress", onKeyPress);
    };

    const onCancel = () => closeSheet(null);
    const onConfirm = () => {
      const val = inputEl.value.trim();
      closeSheet(val || null);
    };

    const onKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter") onConfirm();
    };

    closeBtn.addEventListener("click", onCancel);
    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
    inputEl.addEventListener("keypress", onKeyPress);
  });
}

/**
 */
export function showConfirm(
  title: string,
  confirmText: string = "אישור",
): Promise<boolean> {
  return new Promise((resolve) => {
    let overlay = document.getElementById("bottom-sheet-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "bottom-sheet-overlay";
      overlay.className = "bottom-sheet-overlay";
      document.body.appendChild(overlay);
    }

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

    const titleEl = document.getElementById(
      "bottom-sheet-title",
    ) as HTMLElement;
    const closeBtn = document.getElementById(
      "bottom-sheet-close",
    ) as HTMLElement;
    const cancelBtn = document.getElementById(
      "bottom-sheet-cancel",
    ) as HTMLElement;
    const confirmBtn = document.getElementById(
      "bottom-sheet-confirm",
    ) as HTMLElement;

    titleEl.innerText = title;
    overlay.classList.add("active");

    const closeSheet = (returnValue: boolean) => {
      overlay!.classList.remove("active");
      cleanup();
      resolve(returnValue);
    };

    const cleanup = () => {
      closeBtn.removeEventListener("click", onCancel);
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
    };

    const onCancel = () => closeSheet(false);
    const onConfirm = () => closeSheet(true);

    closeBtn.addEventListener("click", onCancel);
    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
  });
}
