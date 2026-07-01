import React, { useState, useMemo } from "react";

const DEFAULT_CATALOG = {
  "🥛 מוצרי חלב וביצים": [
    "חלב 3%",
    "חלב 1%",
    "חלב שיבולת שועל",
    "חלב סויה",
    "גבינה לבנה 5%",
    "קוטג' 5%",
    "ביצים L",
    "ביצים M",
    "חמאה",
    "גבינה צהובה",
    "שמנת לבישול",
    "שמנת מתוקה",
    "מעדן",
    "יוגורט טבעי",
    "יוגורט חלבון",
    "גבינה בולגרית",
    "גבינה צפתית",
    "שוקו",
  ],
  "🍅 ירקות ופירות": [
    "עגבניה",
    "עגבניות שרי",
    "מלפפון",
    "בצל יבש",
    "בצל סגול",
    "תפוח אדמה",
    "בטטה",
    "פלפל אדום",
    "פלפל ירוק",
    "גזר",
    "כרוב",
    "חסה",
    "פטרוזיליה",
    "כוסברה",
    "שום",
    "לימון",
    "בננה",
    "תפוח עץ",
    "אגס",
    "תפוז",
    "קלמנטינה",
    "אבוקדו",
    "קישוא",
    "חציל",
    "פטריות",
  ],
  "🥖 לחם ומאפים": [
    "לחם אחיד פרוס",
    "פיתות",
    "לחמניות",
    "לחם מלא",
    "לחם כוסמין",
    "חלות",
    "פירורי לחם",
    "טורטיות",
    "פריכיות",
  ],
  "🥩 בשר ודגים": [
    "חזה עוף",
    "עוף שלם",
    "בשר בקר טחון",
    "שניצל תירס",
    "נקניקיות",
    "פסטרמה",
    "סלמון קפוא",
    "סלמון טרי",
    "טונה בשמן",
    "טונה במים",
    "דג אמנון",
    "קבב",
  ],
  "🥫 מזווה ויבשים": [
    "פסטה",
    "ספגטי",
    "מקרוני",
    "אורז פרסי",
    "אורז בסמטי",
    "פתיתים",
    "שמן קנולה",
    "שמן זית",
    "קמח לבן",
    "קמח תופח",
    "סוכר לבן",
    "סוכר חום",
    "קפה שחור",
    "נס קפה",
    "תה",
    "מלח",
    "פלפל שחור",
    "פפריקה",
    "כורכום",
    "כמון",
    "קטשופ",
    "מיונז",
    "חרדל",
    "טחינה גולמית",
    "רסק עגבניות",
    "שימורי תירס",
    "שימורי פטריות",
    "זיתים",
    "מלפפונים חמוצים",
    "דגני בוקר",
    "גרנולה",
  ],
  "🧻 ניקיון ופארם": [
    "נייר טואלט",
    "נוזל כלים",
    "אבקת כביסה",
    "ג'ל כביסה",
    "מרכך כביסה",
    "שמפו",
    "מרכך שיער",
    "סבון גוף",
    "משחת שיניים",
    "מברשת שיניים",
    "מגבונים לחים",
    "שקיות אשפה",
    "שקיות אוכל",
    "רדיד אלומיניום",
    "ניילון נצמד",
    "נייר אפייה",
    "מטליות לחות",
    "ספוג הפלא",
    "אקונומיקה",
    "נוזל רצפות",
    "מטהר אוויר",
    "דאודורנט",
    "סכיני גילוח",
    "קצף גילוח",
  ],
  "🥤 שתייה ונשנושים": [
    "מים מינרלים",
    "שישיית מים",
    "קולה",
    "קולה זירו",
    "מיץ פטל",
    "סודה",
    "מיץ תפוזים",
    "במבה",
    "ביסלי",
    "תפוצ'יפס",
    "דוריתוס",
    "אפרופו",
    "שוקולד פרה",
    "שוקולד מריר",
    "עוגיות",
    "וופלים",
    "מסטיקים",
    "סוכריות",
    "פיצוחים",
  ],
  "❄️ קפואים": [
    "אפונה קפואה",
    "שעועית ירוקה קפואה",
    "לקט ירקות קפוא",
    "צ'יפס קפוא",
    "בצק עלים",
    "בצק פריך",
    "מלוואח",
    "בורקס",
    "גלידה",
    "ארטיקים",
    "פיצה קפואה",
  ],
  "👶 תינוקות": [
    "טיטולים",
    "תחליף חלב (תמ״ל)",
    "מגבונים לתינוק",
    "משחה להחתלה",
    "מחית לתינוק",
    "מוצץ",
    "סבון תינוקות",
  ],
  "🐶 חיות מחמד": [
    "אוכל לכלבים",
    "אוכל לחתולים",
    "חול לחתולים",
    "חטיפים לכלב",
    "שקיות לאיסוף צואה",
  ],
};

const mapToEmojiCategory = (rawCategory) => {
  if (!rawCategory) return "📦 כללי";
  const cat = rawCategory.toLowerCase();

  if (cat.includes("חלב") || cat.includes("גבינ") || cat.includes("ביצי"))
    return "🥛 מוצרי חלב וביצים";
  if (cat.includes("פירות") || cat.includes("ירקות")) return "🍅 ירקות ופירות";
  if (cat.includes("לחם") || cat.includes("מאפיי") || cat.includes("בצק"))
    return "🥖 לחם ומאפים";
  if (cat.includes("בשר") || cat.includes("עוף") || cat.includes("דג"))
    return "🥩 בשר ודגים";
  if (
    cat.includes("מזווה") ||
    cat.includes("שימורים") ||
    cat.includes("בישול") ||
    cat.includes("אפיה")
  )
    return "🥫 מזווה ויבשים";
  if (cat.includes("נקיון") || cat.includes("פארם") || cat.includes("טואלט"))
    return "🧻 ניקיון ופארם";
  if (
    cat.includes("שתיה") ||
    cat.includes("חטיפ") ||
    cat.includes("מתוק") ||
    cat.includes("משקאות")
  )
    return "🥤 שתייה ונשנושים";
  if (cat.includes("קפוא")) return "❄️ קפואים";
  if (cat.includes("תינוק")) return "👶 תינוקות";
  if (cat.includes("חיות") || cat.includes("כלב") || cat.includes("חתול"))
    return "🐶 חיות מחמד";

  return "📦 כללי";
};

const CatalogModal = ({ isOpen, onClose, catalog, onAddItem }) => {
  const [expandedCat, setExpandedCat] = useState(null);

  const mergedCatalog = useMemo(() => {
    const grouped = JSON.parse(JSON.stringify(DEFAULT_CATALOG));
    grouped["📦 כללי"] = [];

    if (catalog) {
      catalog.forEach((item) => {
        const mappedCategory = mapToEmojiCategory(item.category);

        if (!grouped[mappedCategory]) {
          grouped[mappedCategory] = [];
        }

        if (!grouped[mappedCategory].includes(item.name)) {
          grouped[mappedCategory].push(item.name);
        }
      });
    }

    Object.keys(grouped).forEach((cat) => {
      if (grouped[cat].length === 0) {
        delete grouped[cat];
      } else {
        grouped[cat].sort((a, b) => a.localeCompare(b));
      }
    });

    return grouped;
  }, [catalog]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "550px",
          height: "85vh",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px",
            background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "20px", color: "#1e293b" }}>
              📚 קטלוג מוצרים
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                margin: "5px 0 0 0",
              }}
            >
              לחץ על מוצר כדי להוסיף לעגלה
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#e2e8f0",
              border: "none",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              fontSize: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "#f8fafc",
          }}
        >
          {Object.keys(mergedCatalog)
            .sort()
            .map((cat) => (
              <div
                key={cat}
                style={{
                  marginBottom: "15px",
                  background: "white",
                  borderRadius: "12px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() =>
                    setExpandedCat(expandedCat === cat ? null : cat)
                  }
                  style={{
                    padding: "16px",
                    fontWeight: "bold",
                    display: "flex",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    color: expandedCat === cat ? "#4f46e5" : "#334155",
                    background: expandedCat === cat ? "#e0e7ff" : "white",
                    transition: "all 0.2s",
                  }}
                >
                  <span>
                    {cat}{" "}
                    <span
                      style={{
                        opacity: 0.5,
                        fontSize: "13px",
                        fontWeight: "normal",
                      }}
                    >
                      ({mergedCatalog[cat].length})
                    </span>
                  </span>
                  <i
                    className={`fas fa-chevron-${expandedCat === cat ? "up" : "down"}`}
                  ></i>
                </div>

                {expandedCat === cat && (
                  <div
                    style={{
                      padding: "16px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    {mergedCatalog[cat].map((itemName, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          const cleanCatName = cat
                            .replace(/[^\u0590-\u05FF\s]/g, "")
                            .trim();
                          onAddItem({
                            name: itemName,
                            category: cleanCatName,
                            qty: 1,
                          });

                          const btn = e.currentTarget;
                          btn.style.background = "#22c55e";
                          btn.style.color = "white";
                          btn.style.borderColor = "#22c55e";
                          btn.innerText = "✓ הוסף";
                          setTimeout(() => {
                            btn.style.background = "white";
                            btn.style.color = "#475569";
                            btn.style.borderColor = "#cbd5e1";
                            btn.innerText = `+ ${itemName}`;
                          }, 800);
                        }}
                        style={{
                          background: "white",
                          border: "1px solid #cbd5e1",
                          color: "#475569",
                          padding: "8px 14px",
                          borderRadius: "20px",
                          fontSize: "14px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          fontWeight: "500",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor = "#94a3b8")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = "#cbd5e1")
                        }
                      >
                        + {itemName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        <div
          style={{
            padding: "15px 20px",
            background: "white",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <button
            style={{
              width: "100%",
              background: "#4f46e5",
              color: "white",
              padding: "14px",
              border: "none",
              borderRadius: "12px",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer",
            }}
            onClick={onClose}
          >
            סיום וסגירה
          </button>
        </div>
      </div>
    </div>
  );
};

export default CatalogModal;
