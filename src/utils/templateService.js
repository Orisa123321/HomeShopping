// src/utils/templateService.js
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";
import { showToast } from "./helpers";

/**
 * שמירת הרשימה הנוכחית כתבנית חדשה
 */
export const saveCurrentListAsTemplate = async (
  userId,
  templateName,
  currentList,
) => {
  if (!currentList || currentList.length === 0) {
    showToast("הרשימה הנוכחית ריקה, אין מה לשמור כתבנית", "error");
    return;
  }

  try {
    // מסננים רק את הנתונים ההכרחיים לשמירה בתבנית (שם, קטגוריה, כמות יעד, יחידה)
    const items = currentList.map((item) => ({
      name: item.name,
      category: item.category || "כללי",
      target: item.target || 1,
      unit: item.unit || "יח'",
    }));

    const templateData = {
      name: templateName,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      isPublic: false, // לשיתוף קהילתי בעתיד
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
 * יבוא תבנית לרשימה הפעילה של המשתמש
 */
export const importTemplateToList = async (
  userId,
  templateId,
  existingItems,
) => {
  try {
    // 1. קריאת נתוני התבנית
    const templateRef = doc(db, "templates", templateId);
    const templateSnap = await getDoc(templateRef);
    if (!templateSnap.exists()) {
      showToast("התבנית לא נמצאה", "error");
      return;
    }

    const template = templateSnap.data();
    const batch = writeBatch(db);
    const groceriesRef = collection(db, "groceries");

    // 2. הוספת המוצרים מהתבנית לרשימה הנוכחית
    template.items.forEach((item) => {
      // בדיקה האם המוצר כבר קיים ברשימה למניעת כפילויות
      const exists = existingItems.find(
        (existing) => existing.name.toLowerCase() === item.name.toLowerCase(),
      );

      if (exists) {
        // אם המוצר קיים, נעדכן את כמות היעד (נוסיף עליה או נשנה לגבוהה מביניהן)
        const itemRef = doc(db, "groceries", exists.id);
        batch.update(itemRef, {
          target: Math.max(exists.target, item.target),
          isBought: false, // מחזיר לקנייה
        });
      } else {
        // אם מוצר חדש, נוסיף אותו
        const newDocRef = doc(groceriesRef);
        batch.set(newDocRef, {
          name: item.name,
          category: item.category,
          target: item.target,
          current: 0,
          unit: item.unit,
          isBought: false,
          listId: userId, // הרשימה המשפחתית / אישית
          createdAt: new Date().toISOString(),
          order: Date.now(),
        });
      }
    });

    await batch.commit();
    showToast("🎉 כל פריטי התבנית יובאו בהצלחה!", "success");
  } catch (error) {
    console.error("שגיאה ביבוא תבנית:", error);
    showToast("לא הצלחנו לייבא את התבנית", "error");
  }
};
