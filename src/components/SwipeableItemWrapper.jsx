// src/components/SwipeableItemWrapper.jsx
import React, { useState, useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import "./SwipeableItem.css"; // עיצוב נלווה (מופיע בהמשך)

export function SwipeableItemWrapper({
  children,
  onDelete,
  onMarkBought,
  onOpenActions,
  isBought,
}) {
  const containerRef = useRef(null);
  const x = useMotionValue(0);

  // חישוב צבעי רקע דינמיים לפי כיוון הגרירה
  // גרירה ימינה (חיובי) -> ירוק (רכישה)
  // גרירה שמאלה (שלילי) -> אדום/כתום (מחיקה/פעולות)
  const background = useTransform(
    x,
    [-150, 0, 150],
    [
      "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)", // אדום עז למחיקה
      "rgba(255, 255, 255, 0)", // שקוף באמצע
      "linear-gradient(135deg, #10b981 0%, #059669 100%)", // ירוק לרכישה
    ],
  );

  const handleDragEnd = (event, info) => {
    const swipeThreshold = 100;
    const longSwipeThreshold = 220;
    const offset = info.offset.x;

    if (offset > swipeThreshold) {
      // 1. סווייפ ימינה -> סימון כנרכש ✓
      onMarkBought();
    } else if (offset < -longSwipeThreshold) {
      // 2. סווייפ ארוך שמאלה -> מחיקה ישירה 🗑️
      onDelete();
    } else if (offset < -swipeThreshold) {
      // 3. סווייפ קצר שמאלה -> פתיחת תפריט פעולות
      onOpenActions();
    }
  };

  return (
    <div
      className="swipe-container"
      ref={containerRef}
      style={{ position: "relative", overflow: "hidden", borderRadius: "12px" }}
    >
      {/* רקע פעולה דינמי מאחורי הכרטיס הנגרר */}
      <motion.div
        className="swipe-background"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background,
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          color: "white",
          fontWeight: "bold",
          fontSize: "14px",
        }}
      >
        {/* תוכן בצד ימין (כשגוררים ימינה) */}
        <motion.div
          style={{ opacity: useTransform(x, [0, 50], [0, 1]) }}
          className="swipe-action-label right"
        >
          {isBought ? "↩ להחזיר לרשימה" : "✓ נקנה!"}
        </motion.div>

        {/* תוכן בצד שמאל (כשגוררים שמאלה) */}
        <motion.div
          style={{ opacity: useTransform(x, [-50, 0], [1, 0]) }}
          className="swipe-action-label left"
        >
          {x.get() < -200 ? "🗑️ שחרר למחיקה מהירה" : "⚙️ אפשרויות"}
        </motion.div>
      </motion.div>

      {/* הכרטיס עצמו שניתן לגרירה */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -250, right: 150 }}
        dragElastic={{ left: 0.1, right: 0.2 }}
        onDragEnd={handleDragEnd}
        style={{ x, zIndex: 2, position: "relative" }}
        className="swipeable-front-card"
      >
        {children}
      </motion.div>
    </div>
  );
}
