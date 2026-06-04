// src/components/SwipeableItemWrapper.tsx
import React, { useRef } from "react";
// 1. ייבוא PanInfo מ-framer-motion כדי שהפונקציה שלנו תדע איזה סוג מידע חוזר מהגרירה
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import "./SwipeableItem.css";

// 2. הגדרת הממשק (Interface) - אומר ל-React בדיוק איזה Props הקומפוננטה מקבלת
interface SwipeableItemWrapperProps {
  children: React.ReactNode; // טיפוס סטנדרטי ב-React עבור אלמנטים פנימיים
  onDelete: () => void; // פונקציה שלא מקבלת כלום ולא מחזירה כלום
  onMarkBought: () => void;
  onOpenActions: () => void;
  isBought: boolean; // משתנה בוליאני פשוט
}

// 3. הוספת הממשק שלנו לשורת ההגדרה של הקומפוננטה
export function SwipeableItemWrapper({
  children,
  onDelete,
  onMarkBought,
  onOpenActions,
  isBought,
}: SwipeableItemWrapperProps) {
  // 4. הגדרת סוג הרפרנס (HTMLDivElement) כדי שנדע שזה אלמנט דיב
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  const background = useTransform(
    x,
    [-150, 0, 150],
    [
      "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
      "rgba(255, 255, 255, 0)",
      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    ],
  );

  // 5. הגדרת הטיפוסים של האירוע ושל נתוני הגרירה (info מצופה להיות מסוג PanInfo)
  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const swipeThreshold = 100;
    const longSwipeThreshold = 220;
    const offset = info.offset.x;

    if (offset > swipeThreshold) {
      onMarkBought();
    } else if (offset < -longSwipeThreshold) {
      onDelete();
    } else if (offset < -swipeThreshold) {
      onOpenActions();
    }
  };

  return (
    <div
      className="swipe-container"
      ref={containerRef}
      style={{ position: "relative", overflow: "hidden", borderRadius: "12px" }}
    >
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
        <motion.div
          style={{ opacity: useTransform(x, [0, 50], [0, 1]) }}
          className="swipe-action-label right"
        >
          {isBought ? "↩ להחזיר לרשימה" : "✓ נקנה!"}
        </motion.div>

        <motion.div
          style={{ opacity: useTransform(x, [-50, 0], [1, 0]) }}
          className="swipe-action-label left"
        >
          {x.get() < -200 ? "🗑️ שחרר למחיקה מהירה" : "⚙️ אפשרויות"}
        </motion.div>
      </motion.div>

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
