import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const AppGuide = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // בודק האם המשתמש כבר ביקש לא לראות את המדריך בעבר
    const hideGuide = localStorage.getItem("hideAppGuide");
    if (!hideGuide) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem("hideAppGuide", "true");
    setIsVisible(false);
  };

  // כאן אפשר לערוך את הטקסטים וההסברים שמופיעים במדריך
  const steps = [
    {
      title: "ברוכים הבאים לרשימת הקניות! 🎉",
      content:
        "כמה טיפים קצרים שיעזרו לכם לקנות חכם, לארגן את הרשימה ולחסוך זמן בסופר.",
      icon: "🛒",
    },
    {
      title: "איך מוסיפים מוצרים?",
      content:
        "פשוט מקלידים את שם המוצר בשורת ההוספה. האפליקציה כבר תדע לאיזו קטגוריה לשייך אותו!",
      icon: "✍️",
    },
    {
      title: "סדר וארגון",
      content:
        'לחצו על "סדר קטגוריות" כדי לארגן את הרשימה לפי מחלקות בסופר, ועל "אחד כפילויות" כדי שלא תקנו מוצר פעמיים.',
      icon: "🪄",
    },
    {
      title: "מה חסר במלאי?",
      content:
        'מציץ במקרר ורואה שחסר חלב? אזור "מה חסר במלאי" יעזור לכם להוסיף מוצרים שנגמרו בלחיצת כפתור.',
      icon: "🔍",
    },
    {
      title: "סריקת קבלות",
      content: "חזרתם מהקניות? סרקו את הקבלה כדי לעדכן אוטומטית את המלאי בבית!",
      icon: "🧾",
    },
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="guide-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={overlayStyle}
      >
        <motion.div
          className="guide-modal"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={modalStyle}
        >
          <div style={headerStyle}>
            <span style={iconStyle}>{steps[currentStep].icon}</span>
            <h2 style={titleStyle}>{steps[currentStep].title}</h2>
          </div>

          <p style={contentStyle}>{steps[currentStep].content}</p>

          <div style={dotsContainerStyle}>
            {steps.map((_, index) => (
              <div
                key={index}
                style={{
                  ...dotStyle,
                  backgroundColor: currentStep === index ? "#4CAF50" : "#ddd",
                }}
              />
            ))}
          </div>

          <div style={actionsStyle}>
            {currentStep > 0 && (
              <button
                style={btnSecondary}
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                הקודם
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                style={btnPrimary}
                onClick={() => setCurrentStep((prev) => prev + 1)}
              >
                הבא
              </button>
            ) : (
              <button style={btnPrimary} onClick={handleClose}>
                הבנתי, בואו נתחיל!
              </button>
            )}
          </div>

          <div style={footerStyle}>
            <button style={btnText} onClick={handleDontShowAgain}>
              אל תראה זאת שוב
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- עיצוב פנימי (Inline Styles) לנוחות ---
// אפשר להעביר את זה ל-App.css או index.css אם תעדיף
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "20px",
};
const modalStyle = {
  backgroundColor: "#fff",
  borderRadius: "16px",
  padding: "24px",
  maxWidth: "400px",
  width: "100%",
  textAlign: "center",
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  direction: "rtl",
};
const headerStyle = { marginBottom: "16px" };
const iconStyle = { fontSize: "48px", display: "block", marginBottom: "10px" };
const titleStyle = {
  margin: 0,
  fontSize: "20px",
  color: "#333",
  fontWeight: "bold",
};
const contentStyle = {
  fontSize: "16px",
  color: "#555",
  lineHeight: "1.5",
  minHeight: "70px",
  margin: "0",
};
const dotsContainerStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
  margin: "20px 0",
};
const dotStyle = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  transition: "background-color 0.3s",
};
const actionsStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "12px",
  marginTop: "10px",
};
const btnPrimary = {
  backgroundColor: "#4CAF50",
  color: "white",
  border: "none",
  padding: "10px 24px",
  borderRadius: "8px",
  fontSize: "16px",
  cursor: "pointer",
  flex: 1,
  fontWeight: "bold",
};
const btnSecondary = {
  backgroundColor: "#f1f1f1",
  color: "#333",
  border: "none",
  padding: "10px 24px",
  borderRadius: "8px",
  fontSize: "16px",
  cursor: "pointer",
  flex: 1,
  fontWeight: "bold",
};
const footerStyle = {
  marginTop: "20px",
  borderTop: "1px solid #eee",
  paddingTop: "15px",
};
const btnText = {
  background: "none",
  border: "none",
  color: "#888",
  textDecoration: "underline",
  cursor: "pointer",
  fontSize: "14px",
};

export default AppGuide;
