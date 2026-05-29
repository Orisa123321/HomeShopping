import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getExpStatus, getExpText, DAYS_HEB } from "../utils/helpers";

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
    cat.includes("במבה")
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

export function ItemCard({
  item,
  changeCategory,
  toggleRecurring,
  logPrice,
  deletePriceEntry,
  updateQuantity,
  deleteItem,
  updateItemStatus,
  fetchGlobalPrices,
  categoryExpanded,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expStatus = getExpStatus(item.expirationDate);
  const expText = getExpText(item.expirationDate);
  // סנכרון מצב מורחב בהתאם לפתיחת/סגירת הקטגוריה
  useEffect(() => {
    if (categoryExpanded !== undefined) {
      setIsExpanded(categoryExpanded);
    }
  }, [categoryExpanded]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isExpanded) {
          e.preventDefault();
          setIsExpanded(true);
        }
      }}
      className={`item-card ${isExpanded ? "expanded" : "compact"}`}
      // לחיצה על כל הכרטיס המכווץ רק תפתח אותו
      onClick={() => {
        if (!isExpanded) setIsExpanded(true);
      }}
    >
      {/* שורה ראשית — תמיד נראית */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && isExpanded) {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(false);
          }
        }}
        className="item-compact-row"
        // לחיצה על השורה הראשית כשהכרטיס פתוח - תסגור אותו
        onClick={(e) => {
          if (isExpanded) {
            e.stopPropagation();
            setIsExpanded(false);
          }
        }}
        style={{ cursor: "pointer" }}
      >
        <span className="item-cat-icon">{getCategoryIcon(item.category)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="item-name">{item.name}</span>
          {item.recurringDay !== undefined && item.recurringDay !== null && (
            <span className="recurring-inline">
              🔄 {DAYS_HEB[item.recurringDay]}
            </span>
          )}
        </div>
        <span className="item-qty-badge">
          {item.current}/{item.target} {item.unit || "יח'"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation(); // מונע לחלוטין השפעה על פתיחת/סגירת הכרטיס!
            updateItemStatus(item.id, item.current, !item.isBought);
          }}
          className={`cart-btn-mini ${item.isBought ? "active" : ""}`}
        >
          <i className={item.isBought ? "fas fa-check" : "far fa-circle"}></i>
        </button>
      </div>

      {/* תוכן מורחב — נראה רק בלחיצה */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="item-expanded"
            style={{ overflow: "hidden" }}
          >
            {/* הערה */}
            <input
              type="text"
              className="item-note"
              placeholder="הוסף הערה..."
              defaultValue={item.note}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) =>
                updateDoc(doc(db, "groceries", item.id), {
                  note: e.target.value,
                })
              }
            />

            {/* כמויות */}
            <div className="controls-wrap">
              <div className="qty-stack">
                <div className="qty-row">
                  <span className="qty-label">בבית</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(item.id, item.current, "current", -1);
                    }}
                    className="btn-mini"
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <span className="qty-val">{item.current}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(item.id, item.current, "current", 1);
                    }}
                    className="btn-mini"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
                <div className="qty-row">
                  <span className="qty-label">צריך</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(item.id, item.target, "target", -1);
                    }}
                    className="btn-mini"
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <span className="qty-val">{item.target}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(item.id, item.target, "target", 1);
                    }}
                    className="btn-mini"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* כפתורי פעולה */}
            <div className="item-actions-row">
              <button
                className="add-price-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  logPrice(item);
                }}
              >
                + תעד מחיר
              </button>
              <button
                className="add-price-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchGlobalPrices(item.name);
                }}
                style={{ background: "var(--primary)", color: "white" }}
              >
                🌍 מחירים
              </button>
              <button
                className="edit-cat-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  changeCategory(item.id, item.category);
                }}
              >
                ✎ קטגוריה
              </button>
              <button
                className="edit-cat-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRecurring(item);
                }}
                title="הגדרת מחזוריות"
              >
                <i className="fas fa-sync"></i>
              </button>
            </div>

            {/* תוקף */}
            <div className="exp-wrap">
              <input
                type="date"
                className={`exp-date-input ${expStatus}`}
                value={item.expirationDate || ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  updateDoc(doc(db, "groceries", item.id), {
                    expirationDate: e.target.value,
                  })
                }
              />
              {expStatus && <span className="exp-alert-text">{expText}</span>}
            </div>

            {/* היסטוריית מחירים */}
            {item.priceHistory && item.priceHistory.length > 0 && (
              <div className="price-history-container">
                {item.priceHistory.map((h, index) => (
                  <div key={index} className="history-item">
                    <span className="history-store">{h.store}</span>
                    <span className="history-price">₪{h.price}</span>
                    <span className="history-date">{h.date}</span>
                    <button
                      className="delete-price-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePriceEntry(item, index);
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* כפתורי מחיקה וסגירה */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem(item.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ccc",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <i className="fas fa-trash-alt"></i> מחק
              </button>
              <button
                className="collapse-item-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <i className="fas fa-chevron-up"></i> סגור
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
