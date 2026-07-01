// src/utils/templateService.ts
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";
import { showToast } from "./helpers";
import { ShoppingItem } from "../types";

interface TemplateItem {
  name: string;
  category: string;
  target: number;
  unit: string;
}

/**
 */
export const saveCurrentListAsTemplate = async (
  userId: string,
  templateName: string,
  currentList: any[],
) => {
  if (!currentList || currentList.length === 0) {
    showToast("הרשימה הנוכחית ריקה, אין מה לשמור כתבנית", "error");
    return;
  }

  try {
    const items: TemplateItem[] = currentList.map((item) => ({
      name: item.name,
      category: item.category || "כללי",
      target: item.target || 1,
      unit: item.unit || "יח'",
    }));

    const templateData = {
      name: templateName,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      isPublic: false,
      items: items,
    };

    await addDoc(collection(db, "templates"), templateData);
    showToast(`🎉 התבנית "${templateName}" נשמרה בהצלחה!`, "success");
  } catch (error) {
    console.error("שגיאה בשמירת תבנית:", error);
    showToast("התרחשה שגיאה בשמירת התבנית", "error");
  }
};

/**
 */
export const importTemplateToList = async (
  userId: string,
  templateId: string,
  existingItems: any[],
) => {
  try {
    const templateRef = doc(db, "templates", templateId);
    const templateSnap = await getDoc(templateRef);
    if (!templateSnap.exists()) {
      showToast("התבנית לא נמצאה", "error");
      return;
    }

    const template = templateSnap.data();
    const batch = writeBatch(db);
    const groceriesRef = collection(db, "groceries");

    template.items.forEach((item: TemplateItem) => {
      const exists = existingItems.find(
        (existing) => existing.name.toLowerCase() === item.name.toLowerCase(),
      );

      if (exists) {
        const itemRef = doc(db, "groceries", exists.id);
        batch.update(itemRef, {
          target: Math.max(exists.target || 1, item.target),
          isBought: false,
        });
      } else {
        const newDocRef = doc(groceriesRef);
        batch.set(newDocRef, {
          name: item.name,
          category: item.category,
          target: item.target,
          current: 0,
          unit: item.unit,
          isBought: false,
          listId: userId,
          createdAt: new Date().toISOString(),
          order: Date.now(),
        });
      }
    });

    await batch.commit();
    showToast("🎉 כל פריטי התבנית יובאו בהצלחה!", "success");
  } catch (error: any) {
    console.error("שגיאה ביבוא תבנית:", error);
    showToast("לא הצלחנו לייבא את התבנית", "error");
  }
};
