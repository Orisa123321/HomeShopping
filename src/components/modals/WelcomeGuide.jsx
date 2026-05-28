import React, { useState } from "react";

const steps = [
  {
    icon: "🛒",
    title: "ברוכים הבאים!",
    desc: "האפליקציה שתעשה לכם סדר בקניות ובמזווה. אפשר לנהל רשימה משותפת לכל בני הבית, בזמן אמת.",
  },
  {
    icon: "🪄",
    title: "השף החכם",
    desc: "נתקעתם בלי רעיון לארוחת ערב? לחצו על 'השף החכם' בלשונית המתכונים, והוא ימציא לכם מתכון בדיוק ממה שנשאר כרגע במזווה!",
  },
  {
    icon: "💡",
    title: "פיצול עגלות חסכוני",
    desc: "סיימתם להרכיב רשימה? לחצו על 'פיצול חסכוני' והמערכת תבדוק בחוכמת ההמונים איפה הכי זול לקנות הכל, או אם שווה לפצל את הקנייה.",
  },
  {
    icon: "🧾",
    title: "סורק הקבלות",
    desc: "חזרתם מהסופר? צלמו את הקבלה! ה-AI יסרוק אותה, יעדכן את המלאי בבית אוטומטית ויתרום את המחירים למאגר הקהילתי.",
  },
  {
    icon: "📱",
    title: "התקינו על מסך הבית",
    desc: "כדי שהאפליקציה תעבוד הכי טוב:\n🍎 באייפון: לחצו למטה על כפתור השיתוף (מרובע עם חץ) ובחרו 'הוסף למסך הבית ➕'.\n🤖 באנדרואיד: היכנסו להגדרות ⚙️ באפליקציה ולחצו על 'התקן אפליקציה למכשיר'.",
  },
];

const WelcomeGuide = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("hasSeenGuide", "true");
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10001 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: "400px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "30px 20px",
        }}
      >
        <div style={{ fontSize: "50px", marginBottom: "15px" }}>
          {steps[currentStep].icon}
        </div>
        <h2 style={{ margin: "0 0 15px 0", color: "var(--primary)" }}>
          {steps[currentStep].title}
        </h2>
        {/* שימוש ב-whiteSpace כדי לכבד ירידות שורה (כמו בהוראות האייפון/אנדרואיד) */}
        <p
          style={{
            fontSize: "15px",
            color: "var(--text-main)",
            lineHeight: "1.5",
            minHeight: "90px",
            whiteSpace: "pre-line",
          }}
        >
          {steps[currentStep].desc}
        </p>

        {/* נקודות התקדמות */}
        <div style={{ display: "flex", gap: "8px", margin: "20px 0" }}>
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background:
                  index === currentStep ? "var(--primary)" : "var(--border)",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* כפתורי ניווט */}
        <div
          style={{
            display: "flex",
            width: "100%",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          {currentStep > 0 && (
            <button
              className="store-tab"
              style={{ flex: 1 }}
              onClick={handlePrev}
            >
              הקודם
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              className="store-tab active"
              style={{ flex: 2 }}
              onClick={handleNext}
            >
              הבא
            </button>
          ) : (
            <button
              className="store-tab active"
              style={{
                flex: 2,
                background: "var(--success)",
                borderColor: "var(--success)",
              }}
              onClick={handleFinish}
            >
              הבנתי, בואו נתחיל! ✅
            </button>
          )}
        </div>

        <button
          onClick={handleFinish}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-light)",
            fontSize: "12px",
            marginTop: "20px",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          דלג על המדריך ואל תציג שוב
        </button>
      </div>
    </div>
  );
};

export default WelcomeGuide;
