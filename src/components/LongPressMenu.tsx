// src/components/LongPressMenu.tsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingItem } from "../types"; // ייבוא הטיפוס של הפריט שלנו

// 1. הוספת טיפוסים ל-Hook:
// callback היא פונקציה שלא מקבלת כלום ומחזירה כלום (void)
// ms הוא מספר (number)
export function useLongPress(callback: () => void, ms: number = 500) {
  const [startLongPress, setStartLongPress] = useState(false);

  useEffect(() => {
    // השתמשנו ב-any כאן כפתרון מהיר כדי למנוע התנגשויות בין מערכת הטיימר של Node לזו של הדפדפן
    let timerId: any;
    if (startLongPress) {
      timerId = setTimeout(callback, ms);
    } else {
      clearTimeout(timerId);
    }
    return () => clearTimeout(timerId);
  }, [startLongPress, callback, ms]);

  return {
    onMouseDown: () => setStartLongPress(true),
    onMouseUp: () => setStartLongPress(false),
    onMouseLeave: () => setStartLongPress(false),
    onTouchStart: () => setStartLongPress(true),
    onTouchEnd: () => setStartLongPress(false),
  };
}

// 2. הגדרת ממשק הקומפוננטה:
// שימו לב איך אנחנו מגדירים בדיוק כל פעולה באובייקט ה-actions ומצהירים שהיא מקבלת item תקני.
interface QuickActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShoppingItem;
  actions: {
    duplicate: (item: ShoppingItem) => void;
    moveCategory: (item: ShoppingItem) => void;
    setReminder: (item: ShoppingItem) => void;
    pinToTop: (item: ShoppingItem) => void;
    share: (item: ShoppingItem) => void;
  };
}

// 3. החלת הממשק על הקומפוננטה שלנו
export function QuickActionsMenu({
  isOpen,
  onClose,
  item,
  actions,
}: QuickActionsMenuProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        style={{ zIndex: 999 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="quick-menu-content"
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            right: "20px",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            padding: "20px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
            direction: "rtl",
          }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          // 4. ציון סוג אירוע הלחיצה ליתר ביטחון
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div style={{ textAlign: "center", marginBottom: "15px" }}>
            <span style={{ fontSize: "28px" }}>⚙️</span>
            <h3
              style={{
                margin: "5px 0 0",
                fontSize: "18px",
                fontWeight: "bold",
              }}
            >
              {item.name}
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
              פעולות מהירות על הפריט
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <button
              className="menu-action-btn"
              onClick={() => {
                actions.duplicate(item);
                onClose();
              }}
            >
              📋 שכפל פריט
            </button>
            <button
              className="menu-action-btn"
              onClick={() => {
                actions.moveCategory(item);
                onClose();
              }}
            >
              📂 העבר קטגוריה
            </button>
            <button
              className="menu-action-btn"
              onClick={() => {
                actions.setReminder(item);
                onClose();
              }}
            >
              🔔 הגדר תזכורת
            </button>
            <button
              className="menu-action-btn"
              onClick={() => {
                actions.pinToTop(item);
                onClose();
              }}
            >
              📌 הצמד למעלה
            </button>
            <button
              className="menu-action-btn"
              onClick={() => {
                actions.share(item);
                onClose();
              }}
              style={{ gridColumn: "span 2" }}
            >
              🔗 שתף מוצר ספציפי
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              marginTop: "15px",
              padding: "12px",
              background: "#eee",
              border: "none",
              borderRadius: "12px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ביטול
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
