import React, { useState } from "react";
import { db } from "../firebaseConfig";
import {
  doc,
  deleteDoc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { ItemCard } from "../components/ItemCard";
import CatalogModal from "../components/modals/CatalogModal";
import { showToast, showPrompt, showConfirm } from "../utils/helpers";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import { SortableItemCard } from "./SortableItemCard";

const syncExistingPricesToCatalog = async () => {
  const isConfirmed = await showConfirm(
    "האם לסנכרן את כל המחירים הקיימים לתוך הקטלוג?",
    "כן",
  );

  if (isConfirmed) {
    return;
  }

  try {
    console.log("מתחיל סנכרון מחירים לקטלוג...");

    // 1. שולפים את כל המוצרים מקולקציית המחירים הגלובלית
    const pricesSnapshot = await getDocs(collection(db, "global_prices"));
    const priceDocs = pricesSnapshot.docs;

    console.log(`נמצאו ${priceDocs.length} מוצרים עם מחירים בשרת.`);

    const chunkSize = 400; // פיירבייס מגביל Batch ל-500 פעולות

    // 2. עוברים עליהם בקבוצות של 400
    for (let i = 0; i < priceDocs.length; i += chunkSize) {
      const chunk = priceDocs.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      chunk.forEach((priceDoc) => {
        const productName = priceDoc.id; // השם של המסמך במחירים זה בדרך כלל שם המוצר
        const catalogRef = doc(db, "product_catalog", productName);

        // אומרים לפיירבייס: סמן את המוצר הזה כבעל מחיר, ואל תדרוס נתונים אחרים (merge)
        batch.set(catalogRef, { hasPrice: true }, { merge: true });
      });

      await batch.commit(); // משגרים את הקבוצה לשרת
      console.log(`עודכנו ${chunk.length} מוצרים...`);
    }

    showToast(
      "🎉 הסנכרון הסתיים בהצלחה! כל המחירים הישנים עודכנו בקטלוג.",
      "success",
    );
  } catch (error) {
    console.error("שגיאה בסנכרון המחירים:", error);
    showToast("הייתה שגיאה, אנא בדוק את הקונסול (F12).", "error");
  }
};

const getCategoryIcon = (category) => {
  if (!category) return "🛒";
  const cat = category.toLowerCase();
  if (
    cat.includes("חלב") ||
    cat.includes("גבינה") ||
    cat.includes("יוגורט") ||
    cat.includes("חמאה")
  )
    return "🥛";
  if (
    cat.includes("לחם") ||
    cat.includes("מאפייה") ||
    cat.includes("פיתות") ||
    cat.includes("בורקס")
  )
    return "🥖";
  if (
    cat.includes("בשר") ||
    cat.includes("עוף") ||
    cat.includes("דגים") ||
    cat.includes("טונה")
  )
    return "🥩";
  if (
    cat.includes("פירות") ||
    cat.includes("ירקות") ||
    cat.includes("עגבני") ||
    cat.includes("מלפפון") ||
    cat.includes("תפוח")
  )
    return "🥗";
  if (
    cat.includes("ניקיון") ||
    cat.includes("טואלט") ||
    cat.includes("סבון") ||
    cat.includes("שמפו")
  )
    return "🧻";
  if (
    cat.includes("חטיפים") ||
    cat.includes("מתוקים") ||
    cat.includes("שוקולד") ||
    cat.includes("במבה") ||
    cat.includes("ביסקוויט")
  )
    return "🍫";
  if (
    cat.includes("שתיה") ||
    cat.includes("משקאות") ||
    cat.includes("מים") ||
    cat.includes("קולה") ||
    cat.includes("מיץ")
  )
    return "🥤";
  if (
    cat.includes("פסטה") ||
    cat.includes("אורז") ||
    cat.includes("קפה") ||
    cat.includes("תה") ||
    cat.includes("שמן")
  )
    return "🥫";
  return "🛒";
};

export function ShoppingView({
  uniqueStores,
  activeStore,
  setActiveStore,
  handleAddStore,
  isSettingsOpen,
  deferredPrompt,
  handleInstallApp,
  user,
  joinCodeInput,
  setJoinCodeInput,
  joinFamilyList,
  leaveFamilyList,
  sharedListId,
  stores,
  deleteStore,
  displayOrder,
  moveCategory,
  searchTerm,
  setSearchTerm,
  setIsPlannerModalOpen,
  setPlannerStep,
  setAiRecommendations,
  hasOpenCats,
  closeAllCategories,
  shoppingList,
  shopTotal,
  setIsSmartSplitOpen,
  groupItems,
  sortCategories,
  toggleCat,
  collapsedCats,
  inCart,
  cartTotal,
  updateItemStatus,
  inStock,
  changeCategory,
  toggleRecurring,
  logPrice,
  deletePriceEntry,
  updateQuantity,
  deleteItem,
  addItem,
  activeSuggestions,
  newItemName,
  setNewItemName,
  newItemCategory,
  setNewItemCategory,
  setShowSuggestions,
  startListening,
  isListening,
  setIsScannerOpen,
  handleReceiptScan,
  newItemTarget,
  setNewItemTarget,
  ultimateCartData,
  isUltimateCartLoading,
  calculateUltimateCart,
  predictions,
  isPredicting,
  generatePredictions,
  setPredictions,
  isScanningReceipt,
  generateRescueRecipe,
  setIsLeaderboardOpen,
  handleDeleteAccount,
  catalog,
  addItemToCartFromRec,
  shareListToWhatsApp,
  setIsNutritionModalOpen,
  fixAllCategories,
  isAiLoading,
  triggerAiCategorization,
  triggerMergeDuplicates,
  categoryModalData,
  setCategoryModalData,
  applyCategoryChanges,
  mergeModalData,
  setMergeModalData,
  applyMergeChanges,
  newItemUnit,
  setNewItemUnit,
  coveragePercentage,
  productsWithPrice,
  totalProducts,
  fastAddProduct,
  getSmartDefaults,
}) {
  const [isCatalogOpen, setIsCatalogOpen] = React.useState(false);
  const [priceCompareData, setPriceCompareData] = useState(null);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  // (וודא ש-doc ו-getDoc מיובאים מ-firebase/firestore למעלה)

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false); // כברירת מחדל, התפריט סגור
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // גרירה רק לאחר תנועה של 8 פיקסלים למניעת התנגשות עם לחיצות
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // מונע בעיות גלילה במובייל - לחיצה ארוכה מתחילה גרירה
        tolerance: 5,
      },
    }),
  );
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = shoppingList.findIndex((item) => item.id === active.id);
    const newIndex = shoppingList.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const updatedList = arrayMove(shoppingList, oldIndex, newIndex);
    try {
      const batch = writeBatch(db);
      updatedList.forEach((item, index) => {
        const itemRef = doc(db, "groceries", item.id);
        batch.update(itemRef, { order: index });
      });
      await batch.commit();
      console.log("הסדר החדש נשמר ב-Firestore!");
    } catch (error) {
      console.error("שגיאה בשמירת סדר הגרירה:", error);
      showToast("לא הצלחנו לשמור את הסדר החדש בענן 😢", "error");
    }
  };

  const fetchGlobalPrices = async (itemName) => {
    try {
      const docRef = doc(db, "global_prices", itemName);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setPriceCompareData({ name: itemName, prices: data });
        setIsPriceModalOpen(true);
      } else {
        showToast(
          "עדיין אין מספיק נתונים עבור המוצר הזה. הרובוט שלנו הוקפץ וינסה לחפש לו מחירים בחצי שעה הקרובה!",
          "error",
        );
      }
    } catch (error) {
      console.error("שגיאה במשיכת מחירים גלובליים:", error);
    }
  };

  return (
    <>
      {isSettingsOpen && (
        <div
          className="item-card"
          style={{ flexDirection: "column", alignItems: "stretch" }}
        >
          {deferredPrompt && (
            <button
              onClick={handleInstallApp}
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontWeight: "bold",
                fontSize: "16px",
                marginBottom: "15px",
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <i className="fas fa-download"></i> התקן אפליקציה למכשיר
            </button>
          )}

          {/* כפתור הפעלת התראות Push */}
          <button
            onClick={async () => {
              if (!("Notification" in window)) {
                showToast("הדפדפן שלך אינו תומך בהתראות Push 🔔", "error");
                return;
              }

              const permission = await Notification.requestPermission();
              if (permission === "granted") {
                showToast(
                  "🔔 ההתראות הופעלו בהצלחה! משפחת שרעבי מסונכרנת.",
                  "success",
                );
                // בדיקה מיידית שהכל תקין
                if (typeof triggerPushNotification === "function") {
                  triggerPushNotification(
                    "מזל טוב! 🎉",
                    "הפעלת בהצלחה את התראות הקניות החכמות.",
                  );
                } else {
                  // במקרה והפונקציה אינה מונגשת ישירות כפרופ
                  const reg = await navigator.serviceWorker.ready;
                  reg.showNotification("מזל טוב! 🎉", {
                    body: "הפעלת בהצלחה את התראות הקניות החכמות.",
                    icon: "/icon-192x192.png",
                  });
                }
              } else {
                showToast("לא ניתן אישור להציג התראות במכשיר ❌", "error");
              }
            }}
            style={{
              width: "100%",
              padding: "12px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "bold",
              fontSize: "16px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
            }}
          >
            <i className="fas fa-bell"></i> הפעל התראות Push בנייד
          </button>

          <h4 style={{ margin: "10px 0 10px" }}>👨‍👩‍👧‍👦 שיתוף משפחתי</h4>

          <button
            onClick={() =>
              showPrompt(
                `ה-UID שלי:\n${user?.uid}\n\nמזהה הרשימה שאני מחובר אליה (ListID):\n${sharedListId}\n\nמספר מוצרים שנטענו:\n${items.length}`,
              )
            }
            style={{
              background: "red",
              color: "white",
              padding: "5px",
              borderRadius: "5px",
            }}
          >
            🔍 בדיקת סנכרון
          </button>
          <div
            style={{
              background: "var(--bg)",
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
            }}
          >
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: 13,
                fontWeight: "bold",
              }}
            >
              הקוד שלך לשיתוף:
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 15 }}>
              <input
                className="f-input"
                readOnly
                value={user.uid}
                style={{ fontSize: 11, padding: 8 }}
              />
              <button
                className="add-price-btn"
                onClick={() => {
                  navigator.clipboard.writeText(user.uid);
                  showToast("הקוד הועתק!", "success");
                }}
              >
                העתק
              </button>
            </div>

            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: 13,
                fontWeight: "bold",
              }}
            >
              הצטרף לרשימה של מישהו אחר:
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="f-input"
                placeholder="הדבק קוד שותף..."
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                style={{ fontSize: 12, padding: 8 }}
              />
              <button className="add-price-btn" onClick={joinFamilyList}>
                הצטרף
              </button>
            </div>

            {sharedListId !== user.uid && (
              <button
                style={{
                  marginTop: 15,
                  width: "100%",
                  color: "var(--danger)",
                  background: "none",
                  border: "1px solid var(--danger)",
                  borderRadius: 8,
                  padding: 8,
                  cursor: "pointer",
                }}
                onClick={leaveFamilyList}
              >
                נתק שיתוף וחזור לרשימה הפרטית שלי
              </button>
            )}
          </div>

          <h4 style={{ margin: "20px 0 10px" }}>🤖 הבוט החכם בוואטסאפ</h4>
          <div
            style={{
              background: "var(--bg)",
              borderRadius: 12,
              padding: 15,
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 13,
                margin: "0 0 15px",
                color: "var(--text-light)",
              }}
            >
              שלח הודעה לבוט כדי להוסיף מצרכים, לעדכן מלאי ולייבא מתכונים ישירות
              מהוואטסאפ!
            </p>
            <button
              onClick={() => {
                const botNumber = "14155238886";
                const initialMessage = encodeURIComponent(
                  "join mark-particles",
                );
                window.open(
                  `https://wa.me/${botNumber}?text=${initialMessage}`,
                  "_blank",
                );
              }}
              style={{
                width: "100%",
                padding: "12px",
                background: "#25D366",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i className="fab fa-whatsapp" style={{ fontSize: "20px" }}></i>{" "}
              התחל שיחה עם הבוט
            </button>
          </div>

          <h4 style={{ margin: "20px 0 10px" }}>🔄 סדר קטגוריות בסופר</h4>
          <div
            style={{
              background: "var(--bg)",
              borderRadius: 12,
              padding: 10,
            }}
          >
            {displayOrder.map((cat, idx) => (
              <div
                key={cat}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ fontWeight: "bold" }}>{cat}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn-mini"
                    disabled={idx === 0}
                    onClick={() => moveCategory(idx, "up")}
                  >
                    <i className="fas fa-arrow-up"></i>
                  </button>
                  <button
                    className="btn-mini"
                    disabled={idx === displayOrder.length - 1}
                    onClick={() => moveCategory(idx, "down")}
                  >
                    <i className="fas fa-arrow-down"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            className="premium-card"
            style={{
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              color: "white",
              border: "none",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold" }}>
              📊 כיסוי מחירים קהילתי
            </h3>
            <div
              style={{ fontSize: "2rem", fontWeight: "900", margin: "15px 0" }}
            >
              {coveragePercentage}%
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>
              {productsWithPrice.toLocaleString()} מתוך{" "}
              {totalProducts.toLocaleString()} מוצרים במאגר מעודכנים עם מחירים
              ברשתות השיווק.
            </p>
          </div>

          <div
            style={{
              marginTop: "30px",
              borderTop: "1px solid var(--border)",
              paddingTop: "15px",
              textAlign: "center",
            }}
          >
            <button
              onClick={handleDeleteAccount}
              style={{
                background: "none",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                width: "100%",
              }}
            >
              ❌ מחק את החשבון והמידע שלי לצמיתות
            </button>
          </div>

          {/* <button
            onClick={syncExistingPricesToCatalog}
            style={{
              background: "#f59e0b",
              color: "white",
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              width: "100%",
              fontWeight: "bold",
              cursor: "pointer",
              marginBottom: "15px",
            }}
          >
            🔄 סנכרן מחירי עבר לקטלוג
          </button> */}

          <div
            style={{
              textAlign: "center",
              marginTop: "30px",
              paddingBottom: "10px",
              fontSize: "11px",
              color: "var(--text-light)",
            }}
          >
            <a
              href="https://www.flaticon.com/free-icons/supermarket"
              title="supermarket icons"
              target="_blank"
              rel="noreferrer"
              style={{ color: "inherit" }}
            >
              Supermarket icon by justicon - Flaticon
            </a>
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "12px",
          alignItems: "center",
        }}
      >
        <input
          className="f-input"
          style={{ width: "100%", boxSizing: "border-box", marginBottom: 0 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`🔍 חפש ב${activeStore}...`}
        />
      </div>{" "}
      {/* תפריט פעולות חכמות בעיצוב קומפקטי ומודרני */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          marginBottom: "15px",
        }}
      >
        {/* כפתור איחוד כפילויות */}
        <button
          onClick={triggerMergeDuplicates}
          disabled={isAiLoading}
          style={{
            background: "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)",
            color: "#be123c",
            border: "1px solid #fda4af",
            padding: "8px 6px",
            borderRadius: "20px",
            fontWeight: "bold",
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all 0.2s ease",
          }}
        >
          <i className="fas fa-object-group" style={{ fontSize: "14px" }}></i>
          <span>{isAiLoading ? "בודק..." : "אחד כפילויות"}</span>
        </button>

        {/* כפתור סדר קטגוריות חכם */}
        <button
          onClick={triggerAiCategorization}
          disabled={isAiLoading}
          style={{
            background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
            color: "#065f46",
            border: "1px solid #6ee7b7",
            padding: "8px 6px",
            borderRadius: "20px",
            fontWeight: "bold",
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all 0.2s ease",
          }}
        >
          <i className="fas fa-magic" style={{ fontSize: "14px" }}></i>
          <span>{isAiLoading ? "מסדר..." : "סדר קטגוריות"}</span>
        </button>

        {/* כפתור רשימה חכמה */}
        <button
          onClick={() => {
            setPlannerStep(1);
            setAiRecommendations(null);
            setIsPlannerModalOpen(true);
          }}
          disabled={isAiLoading}
          style={{
            background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)",
            color: "#3730a3",
            border: "1px solid #a5b4fc",
            padding: "8px 6px",
            borderRadius: "20px",
            fontWeight: "bold",
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all 0.2s ease",
          }}
        >
          <i className="fas fa-hat-wizard" style={{ fontSize: "14px" }}></i>
          <span>רשימה מאפס</span>
        </button>
      </div>{" "}
      {/* -------------------- חלוניות אישור (Modals) -------------------- */}
      {/* חלונית אישור סידור קטגוריות */}
      <AnimatePresence>
        {categoryModalData && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-content"
              style={{ maxHeight: "80vh", overflowY: "auto" }}
            >
              <h3>✨ הצעת סידור קטגוריות</h3>
              <p style={{ fontSize: "13px", color: "var(--text-light)" }}>
                הבינה המלאכותית מציעה את הסידור הבא. להחיל שינויים?
              </p>
              <div style={{ margin: "15px 0", textAlign: "right" }}>
                {categoryModalData.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "5px 0",
                      borderBottom: "1px solid var(--border)",
                      fontSize: "14px",
                    }}
                  >
                    <strong>{item.name}</strong> ➡️ {item.category}
                  </div>
                ))}
              </div>
              <div
                className="modal-actions"
                style={{ display: "flex", gap: "10px" }}
              >
                <button
                  className="secondary-btn"
                  onClick={() => setCategoryModalData(null)}
                >
                  ביטול
                </button>
                <button className="primary-btn" onClick={applyCategoryChanges}>
                  כן, סדר הכל!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* חלונית אישור איחוד כפילויות */}
      <AnimatePresence>
        {mergeModalData && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-content"
              style={{ maxHeight: "80vh", overflowY: "auto" }}
            >
              <h3>🔗 נמצאו כפילויות חכמות</h3>
              <p style={{ fontSize: "13px", color: "var(--text-light)" }}>
                האם לאחד את המוצרים הבאים לרשומה אחת ולחבר את הכמויות שלהם?
              </p>
              <div style={{ margin: "15px 0", textAlign: "right" }}>
                {mergeModalData.map((group, idx) => {
                  const namesToMerge = shoppingList
                    .filter((i) => group.mergeIds.includes(i.id))
                    .map((i) => i.name)
                    .join(" + ");
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "10px",
                        background: "var(--bg-body)",
                        borderRadius: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{ fontSize: "12px", color: "var(--text-light)" }}
                      >
                        נאחד את: {namesToMerge}
                      </div>
                      <div style={{ fontWeight: "bold", marginTop: "5px" }}>
                        👈 לשם אחיד: {group.keepName}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className="modal-actions"
                style={{ display: "flex", gap: "10px" }}
              >
                <button
                  className="secondary-btn"
                  onClick={() => setMergeModalData(null)}
                >
                  ביטול
                </button>
                <button
                  className="primary-btn"
                  style={{ background: "var(--danger)" }}
                  onClick={applyMergeChanges}
                >
                  מזג הכל!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>{" "}
      {/* כפתור טבלת אלופים */}
      {/* <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={() => setIsLeaderboardOpen(true)}
          style={{
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "25px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 10px rgba(245, 158, 11, 0.4)",
            fontSize: "16px",
          }}
        >
          <span>🏆</span> טבלת אלופים
        </button>
      </div> */}
      {hasOpenCats && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "10px",
          }}
        >
          <button className="collapse-all-btn" onClick={closeAllCategories}>
            <i className="fas fa-angle-double-up"></i> סגור הכל
          </button>
        </div>
      )}
      <section>
        {/* --- בלוק 1: העוזר החכם (בעיצוב פרימיום קומפקטי) --- */}
        <div
          style={{
            marginBottom: "20px",
            background:
              "linear-gradient(to bottom, var(--bg) 0%, rgba(139, 92, 246, 0.02) 100%)",
            padding: predictions.length > 0 ? "15px" : "10px 14px",
            borderRadius: "16px",
            border: "1px solid rgba(139, 92, 246, 0.15)",
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: predictions.length > 0 ? "12px" : "0px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🔮</span> מה חסר במלאי?
            </h3>
            <button
              onClick={generatePredictions}
              disabled={isPredicting}
              style={{
                padding: "6px 14px",
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                color: "white",
                border: "none",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                fontSize: "12px",
                boxShadow: "0 2px 6px rgba(124, 58, 237, 0.2)",
                transition: "all 0.2s ease",
              }}
            >
              {isPredicting ? "בודק..." : "נתח מלאי"}
            </button>
          </div>
          {predictions.length > 0 && (
            <div
              style={{
                marginTop: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-light)",
                  margin: 0,
                }}
              >
                מבוסס על קצב הקניות הקודם שלכם:
              </p>
              {predictions.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--bg-body)",
                    padding: "10px",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                      {p.name}
                    </span>
                    <div style={{ fontSize: "11px", color: "var(--danger)" }}>
                      נקנה לאחרונה לפני {p.daysPassed} ימים (נגמר כל כ-
                      {p.predictedDays} ימים)
                    </div>
                  </div>
                  <button
                    className="btn-mini"
                    onClick={() => {
                      updateQuantity(p.id, p.target, "target", 1);
                      setPredictions((prev) =>
                        prev.filter((x) => x.id !== p.id),
                      );
                    }}
                    style={{
                      background: "var(--success)",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    + להוסיף
                  </button>
                </div>
              ))}
              <button
                onClick={() => setPredictions([])}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-light)",
                  fontSize: "12px",
                  cursor: "pointer",
                  marginTop: "5px",
                }}
              >
                התעלם מההצעות
              </button>
            </div>
          )}
        </div>

        {/* --- בלוק 2: כותרת הקניות המקורית --- */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            margin: "10px 0 10px",
          }}
        >
          <div>
            <h2 style={{ fontSize: 20, margin: "0 0 8px 0" }}>
              📝 צריך לקנות ({shoppingList.length})
            </h2>
            {/* מד התקדמות של הקניה */}
            {(shoppingList.length > 0 || inCart.length > 0) && (
              <div
                style={{
                  width: "100%",
                  marginTop: "10px",
                  marginBottom: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "var(--text-light)",
                    marginBottom: "4px",
                  }}
                >
                  <span>התקדמות קנייה</span>
                  <span>
                    {Math.round(
                      (inCart.length / (shoppingList.length + inCart.length)) *
                        100,
                    ) || 0}
                    %
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#e2e8f0",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(inCart.length / (shoppingList.length + inCart.length)) * 100}%`,
                      height: "100%",
                      background: "var(--success)",
                      transition: "width 0.4s ease-out",
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* כפתורי פעולה לרשימת הקניות */}
            {shoppingList.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginTop: "8px",
                }}
              >
                {/* כפתור שיתוף ב-WhatsApp */}
                <button
                  id="whatsapp-share-btn"
                  onClick={shareListToWhatsApp}
                  style={{
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    border: "none",
                    color: "white",
                    borderRadius: "20px",
                    padding: "6px 14px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(37, 211, 102, 0.4)",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 14px rgba(37, 211, 102, 0.55)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(37, 211, 102, 0.4)";
                  }}
                >
                  <i
                    className="fab fa-whatsapp"
                    style={{ fontSize: "16px" }}
                  ></i>
                  שתף ב-WhatsApp
                </button>

                <button
                  className="action-btn"
                  onClick={() => setIsNutritionModalOpen(true)}
                  style={{
                    background:
                      "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
                    color: "#333",
                    fontWeight: "bold",
                  }}
                >
                  <i className="fas fa-heartbeat"></i> מנתח תזונה AI
                </button>

                {/* כפתור מחיקת כל רשימת הקניות */}
                <button
                  onClick={async () => {
                    // <--- הוספנו פה async
                    const isConfirmed = await showConfirm(
                      "האם אתה בטוח שברצונך למחוק את כל רשימת הקניות?",
                      "מחק",
                    );
                    if (isConfirmed) {
                      shoppingList.forEach((item) =>
                        deleteDoc(doc(db, "groceries", item.id)),
                      );
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                    borderRadius: "20px",
                    padding: "6px 14px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  🗑️ רוקן רשימה
                </button>
              </div>
            )}
          </div>

          {shopTotal > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 14, color: "var(--text-light)" }}>
                צפי: ₪{shopTotal.toFixed(2)}
              </span>
              <button
                className="smart-split-btn"
                onClick={calculateUltimateCart}
              >
                💡 פיצול חסכוני
              </button>
            </div>
          )}
        </div>

        {/* עטיפת ה-DndContext סביב הרשימה הפעילה בלבד */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToFirstScrollableAncestor]}
        >
          {Object.entries(groupItems(shoppingList))
            .sort((a, b) => sortCategories(a[0], b[0]))
            .map(([cat, list]) => {
              // מיון הרשימה המקומית לפי ה-order החדש
              const sortedList = [...list].sort(
                (a, b) => (a.order || 0) - (b.order || 0),
              );
              const catId = `shop_${cat}`;

              return (
                <div key={cat}>
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") toggleCat(catId);
                    }}
                    className="category-header"
                    onClick={() => toggleCat(catId)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "linear-gradient(to left, #f8fafc, #f1f5f9)",
                      borderRight: "4px solid #5c6bc0",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                      marginTop: "20px",
                      marginBottom: "15px",
                      position: "sticky",
                      top: "10px",
                      zIndex: 10,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "16px",
                        color: "#1e293b",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>
                        {getCategoryIcon(cat)}
                      </span>
                      {cat} ({list.length})
                    </span>
                    <i
                      className={`fas fa-chevron-${
                        collapsedCats[catId] ? "down" : "left"
                      }`}
                      style={{ color: "#94a3b8" }}
                    ></i>
                  </div>

                  <AnimatePresence>
                    {collapsedCats[catId] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: "hidden" }}
                      >
                        <SortableContext
                          items={sortedList.map((i) => i.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(220px, 1fr))",
                              gap: "12px",
                              paddingBottom: "10px",
                            }}
                          >
                            {sortedList.map((item) => (
                              <SortableItemCard
                                key={item.id}
                                item={item}
                                changeCategory={changeCategory}
                                toggleRecurring={toggleRecurring}
                                logPrice={logPrice}
                                deletePriceEntry={deletePriceEntry}
                                updateQuantity={updateQuantity}
                                deleteItem={deleteItem}
                                updateItemStatus={updateItemStatus}
                                fetchGlobalPrices={fetchGlobalPrices}
                                categoryExpanded={!!collapsedCats[catId]}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
        </DndContext>

        {inCart.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <h2
              style={{
                fontSize: 20,
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>🛒 בעגלה ({inCart.length})</span>
              {cartTotal > 0 && (
                <span
                  style={{
                    color: "var(--success)",
                    fontSize: 18,
                    fontWeight: "900",
                  }}
                >
                  ₪{cartTotal.toFixed(2)}
                </span>
              )}
            </h2>
            <AnimatePresence>
              {/* התחלת עטיפת גריד למוצרים שבעגלה */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "12px",
                  marginTop: "10px",
                }}
              >
                {inCart.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    changeCategory={changeCategory}
                    toggleRecurring={toggleRecurring}
                    logPrice={logPrice}
                    deletePriceEntry={deletePriceEntry}
                    updateQuantity={updateQuantity}
                    deleteItem={deleteItem}
                    updateItemStatus={updateItemStatus}
                    fetchGlobalPrices={fetchGlobalPrices}
                  />
                ))}
              </div>
              {/* סוף עטיפת גריד */}
            </AnimatePresence>
            <button
              className="store-tab active"
              style={{
                width: "100%",
                marginTop: 10,
                borderRadius: 12,
                padding: 12,
              }}
              onClick={() =>
                inCart.forEach((i) =>
                  updateItemStatus(i.id, Math.max(i.current, i.target), false),
                )
              }
            >
              עדכן מלאי סופי ✅
            </button>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 40,
            marginBottom: 10,
          }}
        >
          <h2 style={{ fontSize: 20, margin: 0, opacity: 0.4 }}>
            📦 במזווה ({inStock.length})
          </h2>
          <div style={{ display: "flex", gap: "8px" }}>
            {/* כפתור מחיקת המזווה */}
            {inStock.length > 0 && (
              <button
                onClick={async () => {
                  // <--- הוספנו פה async
                  const isConfirmed = await showConfirm(
                    "האם אתה בטוח שברצונך לרוקן את כל המזווה? פעולה זו אינה הפיכה!",
                    "מחק",
                  );
                  if (isConfirmed) {
                    // מוחקים ישירות מהמסד
                    inStock.forEach((item) =>
                      deleteDoc(doc(db, "groceries", item.id)),
                    );
                  }
                }}
                style={{
                  background: "transparent",
                  border: "1px solid #ef4444",
                  color: "#ef4444",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                🗑️ רוקן
              </button>
            )}
            <button
              className="smart-split-btn"
              onClick={generateRescueRecipe}
              style={{
                background: "#f59e0b",
                color: "white",
                padding: "8px 12px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              🧑‍🍳 להציל אוכל!
            </button>
          </div>
        </div>
        {Object.entries(groupItems(inStock))
          .sort((a, b) => sortCategories(a[0], b[0]))
          .map(([cat, list]) => {
            const catId = `pantry_${cat}`;
            return (
              <div key={cat}>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") toggleCat(catId);
                  }}
                  className="category-header"
                  onClick={() => toggleCat(catId)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "linear-gradient(to left, #f8fafc, #f1f5f9)",
                    borderRight: "4px solid #5c6bc0",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                    marginTop: "20px",
                    marginBottom: "15px",
                    position: "sticky",
                    top: "10px", // המרחק מהקצה העליון של המסך
                    zIndex: 10, // מוודא שהכותרת מרחפת מעל המוצרים
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "16px",
                      color: "#1e293b",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>
                      {getCategoryIcon(cat)}
                    </span>
                    {cat} ({list.length})
                  </span>
                  <i
                    className={`fas fa-chevron-${
                      collapsedCats[catId] ? "down" : "left"
                    }`}
                    style={{ color: "#94a3b8" }}
                  ></i>
                </div>
                <AnimatePresence>
                  {collapsedCats[catId] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: "hidden", opacity: 0.7 }}
                    >
                      {/* ה-div החדש שעושה את הקסם של הסידור לרוחב! */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(220px, 1fr))",
                          gap: "12px",
                          paddingBottom: "10px",
                        }}
                      >
                        {list.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            changeCategory={changeCategory}
                            toggleRecurring={toggleRecurring}
                            logPrice={logPrice}
                            deletePriceEntry={deletePriceEntry}
                            updateQuantity={updateQuantity}
                            deleteItem={deleteItem}
                            updateItemStatus={updateItemStatus}
                            fetchGlobalPrices={fetchGlobalPrices}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
      </section>
      {/* --- אזור הוספת מוצרים צף (Floating Action Sheet) --- */}
      <div
        style={{
          position: "fixed",
          bottom: "80px",
          left: "5%",
          right: "5%",
          width: "90%",
          background: "#ffffff",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.18)", // צל עמוק ויוקרתי
          zIndex: 1100,
          borderRadius: "24px", // פינות עגולות רכות יותר
          padding: isAddMenuOpen ? "20px" : "12px", // ריווח משתנה
          direction: "rtl",
          boxSizing: "border-box",
          border: "1px solid rgba(0,0,0,0.05)", // גבול עדין מאוד
          transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)", // אנימציה חלקה לפתיחה
        }}
      >
        {!isAddMenuOpen ? (
          // ---- מצב סגור: כפתור Pill מודרני ----
          <button
            onClick={() => {
              // לוגיקה חכמה: בודקים איזו קטגוריה פתוחה עכשיו ברשימת הקניות
              const activeShopCats = Object.keys(groupItems(shoppingList));
              const openCats = activeShopCats.filter(
                (cat) => !collapsedCats[`shop_${cat}`],
              );

              // אם בדיוק קטגוריה אחת פתוחה, נמלא אותה אוטומטית!
              if (openCats.length === 1) {
                setNewItemCategory(openCats[0]);
              } else {
                setNewItemCategory(""); // נאפס במקרה של כמה פתוחות
              }

              setIsAddMenuOpen(true);
            }}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "16px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
            }}
          >
            <i className="fas fa-plus" style={{ fontSize: "14px" }}></i>
            הוסף מוצר חדש
          </button>
        ) : (
          // ---- מצב פתוח: פאנל הוספה מתקדם ----
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* שורת כותרת עליונה קבועה שמבטיחה שכפתור הסגירה תמיד יופיע ויעבוד */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "12px",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    background: "#eef2ff",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    color: "#5c6bc0",
                  }}
                >
                  <i className="fas fa-shopping-basket"></i>
                </div>
                <span
                  style={{
                    fontWeight: "700",
                    fontSize: "16px",
                    color: "#1f2937",
                  }}
                >
                  מה חסר בבית?
                </span>
              </div>

              {/* כפתור מזער קומפקטי */}
              <button
                type="button"
                onClick={() => setIsAddMenuOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#6b7280",
                  padding: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f3f4f6")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <i className="fas fa-times" style={{ fontSize: "16px" }}></i>
              </button>
            </div>

            {/* ה-form שלך: אנחנו כופים עליו הגדרות מיקום רגילות כדי לבטל לחלוטין את ה-CSS הישן ששבר אותו */}
            <form
              className="floating-form"
              onSubmit={(e) => {
                addItem(e);
                // בחרתי להשאיר אותו פתוח אחרי הוספה כמו שביקשת קודם
              }}
              style={{
                position: "relative",
                bottom: "auto",
                left: "auto",
                right: "auto",
                width: "100%",
                height: "auto",
                background: "transparent",
                boxShadow: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* כפתור בחר מוצר מהקטלוג */}
              <button
                type="button"
                onClick={() => setIsCatalogOpen(true)}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  color: "#334155",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#94a3b8")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#cbd5e1")
                }
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "18px" }}>📚</span>
                  <span>חיפוש מהיר בקטלוג</span>
                </div>
                <i
                  className="fas fa-chevron-left"
                  style={{ color: "#94a3b8" }}
                ></i>
              </button>

              {/* --- הצעות חכמות מתוך הקטלוג --- */}
              {activeSuggestions.length > 0 && (
                <div
                  className="suggestions-popup"
                  style={{
                    background: "var(--card)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                    maxHeight: "200px",
                    overflowY: "auto",
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    marginBottom: "5px",
                  }}
                >
                  {activeSuggestions.map((s) => {
                    // חיפוש האם יש היסטוריית מחירים למוצר אצל המשתמש
                    const matchingItem = shoppingList
                      .concat(inCart)
                      .find((i) => i.name === s.name);
                    const avgPrice =
                      matchingItem &&
                      matchingItem.priceHistory &&
                      matchingItem.priceHistory.length > 0
                        ? matchingItem.priceHistory[0].price
                        : null;

                    return (
                      <div
                        key={s.name}
                        className="suggestion-item"
                        onClick={() => {
                          setNewItemName(s.name);
                          setNewItemCategory(s.category);

                          // השמה מיידית של ברירות המחדל החכמות של המוצר הנבחר
                          const defaults = getSmartDefaults(s.name);
                          setNewItemTarget(defaults.target);
                          setNewItemUnit(defaults.unit);

                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid rgba(0,0,0,0.04)",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.2s ease",
                          background: "#ffffff",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f5f7ff")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#ffffff")
                        }
                      >
                        {/* צד ימין: אימוג'י + שם מוצר + קטגוריה */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <span style={{ fontSize: "20px" }}>
                            {getCategoryIcon(s.category)}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "700",
                                color: "#1f2937",
                                fontSize: "14px",
                              }}
                            >
                              {s.name}
                            </span>
                            <span
                              style={{ fontSize: "11px", color: "#9ca3af" }}
                            >
                              🏷️ {s.category}{" "}
                              {s.barcode ? `| 🔢 ${s.barcode}` : ""}
                            </span>
                          </div>
                        </div>

                        {/* צד שמאל: תג מחיר היסטורי (אם קיים) */}
                        {avgPrice ? (
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "800",
                              color: "#10b981",
                              background: "#e6fbf3",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              border: "1px solid rgba(16, 185, 129, 0.15)",
                            }}
                          >
                            ₪{avgPrice.toFixed(2)}
                          </span>
                        ) : s.hasPrice ? (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#3b82f6",
                              background: "#eff6ff",
                              padding: "4px 8px",
                              borderRadius: "20px",
                              fontWeight: "600",
                            }}
                          >
                            יש מחירים 📈
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* מוצרים תכופים (Favorites) */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                  paddingBottom: "10px",
                }}
                className="scrollbar-hide"
              >
                {catalog
                  // סינון זריז (למשל כאלו שקנינו יותר מ-2 פעמים)
                  .sort(
                    (a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0),
                  )
                  .slice(0, 5) // ניקח רק את ה-5 המובילים
                  .map((product) => (
                    <button
                      key={product.id || product.name}
                      type="button"
                      onClick={() => fastAddProduct(product.name)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#eef2ff",
                        color: "#5c6bc0",
                        border: "1px solid #c7d2fe",
                        borderRadius: "20px",
                        padding: "6px 14px",
                        fontSize: "13px",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                    >
                      <span>➕</span>
                      {product.name}
                    </button>
                  ))}
              </div>

              {/* --- אינפוט החיפוש החכם --- */}
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  value={newItemName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewItemName(val);

                    // זיהוי חכם בזמן אמת של קטגוריה, יחידת מידה וכמות מומלצת
                    if (val.trim().length > 0) {
                      const defaults = getSmartDefaults(val);
                      setNewItemCategory(defaults.category);
                      setNewItemTarget(defaults.target);
                      setNewItemUnit(defaults.unit);
                    }

                    if (val.trim().length >= 2) {
                      setShowSuggestions(true);
                    } else {
                      setShowSuggestions(false);
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData("Text");
                    if (pastedText.includes("\n")) {
                      e.preventDefault(); // מונע הדבקה רגילה
                      const lines = pastedText
                        .split("\n")
                        .map((l) => l.trim())
                        .filter((l) => l.length > 0);

                      // קורא להוספה מהירה על כל שורה מודבקת
                      lines.forEach((line) => fastAddProduct(line));
                      showToast(
                        `⚡ ${lines.length} מוצרים מהרשימה התווספו בהצלחה!`,
                        "success",
                      );
                      setNewItemName(""); // מאפס את השדה
                    }
                  }}
                  placeholder="התחל להקליד מוצר (לדוג: חלב, לחם)..."
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "14px",
                    outline: "none",
                    background: "#f9fafb",
                    transition: "border 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#5c6bc0")}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    setTimeout(() => setShowSuggestions(false), 250);
                  }}
                />
                {/* השדה של הקטגוריה עם רשימה נפתחת (datalist) */}
                <div style={{ width: "35%", position: "relative" }}>
                  <input
                    list="categories-datalist"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "14px",
                      outline: "none",
                      background: "#f9fafb",
                      transition: "border 0.2s",
                      boxSizing: "border-box",
                    }}
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    placeholder="קטגוריה"
                    onFocus={(e) => (e.target.style.borderColor = "#5c6bc0")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                  <datalist id="categories-datalist">
                    {displayOrder.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* שורת הפעולות התחתונה */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "4px",
                }}
              >
                {/* כפתורי סריקה צד ימין */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={startListening}
                    title="הוספה קולית"
                    style={{
                      color: isListening ? "#ef4444" : "#6b7280",
                      background: "#f3f4f6",
                      border: "none",
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <i
                      className="fas fa-microphone"
                      style={{
                        animation: isListening ? "cook 1s infinite" : "none",
                      }}
                    ></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    title="סרוק ברקוד"
                    style={{
                      color: "#6b7280",
                      background: "#f3f4f6",
                      border: "none",
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <i className="fas fa-barcode"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      showToast(
                        "בקרוב: ה-AI יזהה לבד מה חסר במקרר שלך!",
                        "success",
                      );
                      // כאן תוכל להדביק את הקוד לשליחת התמונה מול שרת ה-Firebase שלך כמו בקבלות
                    }}
                    title="צלם מזווה (זיהוי AI)"
                    style={{
                      color: "#6b7280",
                      background: "#f3f4f6",
                      border: "none",
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <i className="fas fa-camera"></i>
                  </button>
                  {/* כפתור סריקת קבלה חדש */}
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("receipt-upload").click()
                    }
                    title="סרוק או העלה קבלה"
                    disabled={isScanningReceipt}
                    style={{
                      color: isScanningReceipt ? "#3b82f6" : "#6b7280",
                      background: "#f3f4f6",
                      border: "none",
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    {isScanningReceipt ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-receipt"></i>
                    )}
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    id="receipt-upload"
                    style={{ display: "none" }}
                    onChange={handleReceiptScan}
                  />
                </div>
                {/* כמות, יחידה וכפתור הוספה צד שמאל */}
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  {/* בורר יחידות מידה מודרני */}
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    style={{
                      padding: "10px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      background: "#f3f4f6",
                      fontWeight: "700",
                      color: "#374151",
                      outline: "none",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "border 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#5c6bc0")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  >
                    <option value="יח'">יח'</option>
                    <option value='ק"ג'>ק"ג</option>
                    <option value="ליטר">ליטר</option>
                    <option value="חבילה">חבילה</option>
                    <option value="תבנית">תבנית</option>
                    <option value="מארז">מארז</option>
                  </select>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "#f3f4f6",
                      borderRadius: "10px",
                      padding: "2px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <input
                      type="number"
                      value={newItemTarget}
                      onChange={(e) => setNewItemTarget(Number(e.target.value))}
                      style={{
                        width: "40px",
                        padding: "8px 0",
                        textAlign: "center",
                        border: "none",
                        background: "transparent",
                        outline: "none",
                        fontWeight: "600",
                        color: "#1f2937",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      padding: "10px 20px",
                      background: "#5c6bc0",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: "600",
                      fontSize: "15px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 4px rgba(92, 107, 192, 0.2)",
                    }}
                  >
                    <span>הוסף</span>
                    <i
                      className="fas fa-paper-plane"
                      style={{ fontSize: "12px" }}
                    ></i>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
      <CatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        catalog={catalog}
        onAddItem={addItemToCartFromRec}
      />
      {/* חלון השוואת מחירים חוצה רשתות */}
      {isPriceModalOpen && priceCompareData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            direction: "rtl",
          }}
        >
          <div
            style={{
              background: "var(--bg)",
              width: "90%",
              maxWidth: "400px",
              borderRadius: "15px",
              padding: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "var(--primary)",
                textAlign: "center",
                borderBottom: "2px solid var(--border)",
                paddingBottom: "10px",
              }}
            >
              השוואת מחירים
            </h2>
            <h3 style={{ textAlign: "center", margin: "10px 0" }}>
              {priceCompareData.name}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              {/* עוברים על כל הרשתות שחזרו מפיירבייס, מתעלמים משדה התאריך lastUpdated */}
              {Object.keys(priceCompareData.prices)
                .filter((key) => key !== "lastUpdated")
                .sort(
                  (a, b) =>
                    priceCompareData.prices[a][0].price -
                    priceCompareData.prices[b][0].price,
                ) // ממיין מהזול ליקר!
                .map((store) => {
                  const storeData = priceCompareData.prices[store][0];
                  return (
                    <div
                      key={store}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "var(--card-bg)",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>{store}</span>
                      <span
                        style={{
                          color: "var(--success)",
                          fontWeight: "bold",
                          fontSize: "1.1rem",
                        }}
                      >
                        ₪{storeData.price.toFixed(2)}
                      </span>
                    </div>
                  );
                })}

              {Object.keys(priceCompareData.prices).filter(
                (k) => k !== "lastUpdated",
              ).length === 0 && (
                <div
                  style={{ textAlign: "center", color: "var(--text-light)" }}
                >
                  לא נמצאו מחירים ברשתות כרגע.
                </div>
              )}
            </div>

            <button
              onClick={() => setIsPriceModalOpen(false)}
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--text-light)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                marginTop: "20px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              סגור חלון
            </button>
          </div>
        </div>
      )}
    </>
  );
}
