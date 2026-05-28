import React, { useState } from "react";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { showToast, showPrompt } from "../utils/helpers";

export function ComparePricesView({ catalog }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    const cleanVal = val.trim();

    if (cleanVal.length >= 2) {
      const searchWords = cleanVal.toLowerCase().split(/\s+/);

      // 1. מסננים
      let matches = catalog.filter((c) => {
        const productName = c.name.toLowerCase();
        // return searchWords.every((word) => productName.includes(word));
        return (
          searchWords.every((word) => productName.includes(word)) && c.hasPrice
        );
      });

      // 2. ממיינים בדיוק כמו שעשינו בעמוד הקניות (שמות קצרים שמתחילים במילה ראשונים)
      matches.sort((a, b) => {
        const aStarts = a.name.startsWith(cleanVal);
        const bStarts = b.name.startsWith(cleanVal);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.length - b.name.length;
      });

      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const fetchProductPrices = async (productName) => {
    setSelectedProduct(productName);
    setSearchTerm(productName);
    setSuggestions([]);
    setIsLoading(true);
    try {
      // שאילתה ישירה למאגר המחירים הגלובלי
      const docRef = doc(db, "global_prices", productName);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPriceData(docSnap.data());
      } else {
        setPriceData({}); // אין נתונים
      }
    } catch (error) {
      console.error("שגיאה במשיכת מחירים:", error);
    }
    setIsLoading(false);
  };

  const requestPriorityUpdate = async () => {
    if (!selectedProduct) return;
    try {
      // 1. חיפוש חכם בקטלוג הקיים כדי למצוא ברקוד למוצר החיפוש החופשי
      const matchedCatalogItem = catalog.find(
        (c) =>
          c.name.toLowerCase().includes(selectedProduct.toLowerCase()) ||
          selectedProduct.toLowerCase().includes(c.name.toLowerCase()),
      );

      // אם מצאנו מוצר דומה בקטלוג, ניקח את הברקוד שלו
      const matchedBarcode = matchedCatalogItem
        ? matchedCatalogItem.barcode
        : "";

      // 2. עדכון הקטלוג ב-Firestore גם עם ברקוד וגם עם עדיפות VIP
      await setDoc(
        doc(db, "product_catalog", selectedProduct),
        {
          barcode: matchedBarcode ? matchedBarcode.toString() : "",
          priorityUpdate: true,
        },
        { merge: true },
      );

      showToast(
        "✅ הבקשה נשלחה בהצלחה! הרובוט יסרוק את המוצר הזה בעדיפות עליונה בחצי שעה הקרובה.",
        "success",
      );
    } catch (error) {
      console.error("שגיאה בבקשת עדכון:", error);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        paddingBottom: "100px",
        maxWidth: "800px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h2
          style={{
            fontSize: "24px",
            color: "var(--primary)",
            margin: "0 0 10px",
          }}
        >
          ⚖️ השוואת מחירים
        </h2>
        <p style={{ color: "var(--text-light)", fontSize: "14px", margin: 0 }}>
          חפש מוצר וגלה איפה הכי זול לקנות אותו
        </p>
      </div>

      {/* שורת החיפוש עם הכפתור */}
      <div
        style={{ position: "relative", marginBottom: "40px", width: "100%" }}
      >
        <div style={{ display: "flex", gap: "10px", width: "100%" }}>
          <input
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="איזה מוצר לחפש? (לדוגמה: חלב 3%)"
            style={{
              flex: 1 /* נותן לתיבת הטקסט לתפוס את שאר המקום הפנוי בשורה */,
              padding: "18px 25px" /* ריווח פנימי גדול יותר */,
              border: "2px solid var(--border)",
              borderRadius: "50px" /* פינות עגולות ויפות כמו של גוגל */,
              fontSize: "18px" /* פונט גדול וברור */,
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.3s",
              boxShadow:
                "0 6px 20px rgba(0,0,0,0.06)" /* צללית עדינה למראה פרימיום */,
              textAlign: "right" /* מוודא שהטקסט מתחיל תמיד מימין */,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--primary)";
              e.target.style.boxShadow = "0 8px 25px rgba(99, 102, 241, 0.2)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.06)";
              setTimeout(() => setSuggestions([]), 200);
            }}
          />
          <button
            onClick={() => {
              if (searchTerm.trim().length > 0)
                fetchProductPrices(searchTerm.trim());
            }}
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "white",
              border: "none",
              borderRadius: "50px",
              padding: "0 30px",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(99, 102, 241, 0.3)",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            חפש 🔎
          </button>
        </div>

        {/* הצעות חכמות מהקטלוג */}
        {suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              marginTop: "5px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              zIndex: 10,
              maxHeight: "300px" /* 🌟 מגביל את גובה החלונית */,
              overflowY: "auto" /* 🌟 מאפשר גלילה פנימית כשיש הרבה תוצאות */,
            }}
          >
            {suggestions.map((s) => (
              <div
                key={s.name}
                onClick={() => fetchProductPrices(s.name)}
                style={{
                  padding: "12px 15px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--card)")
                }
              >
                {/* הוספנו את הנקודה לפני השם של המוצר */}
                <span
                  title={
                    s.hasPrice
                      ? "יש נתוני מחירים למוצר זה"
                      : "עדיין אין מחירים למוצר זה"
                  }
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: s.hasPrice ? "#22c55e" : "#ef4444",
                    display: "inline-block",
                    flexShrink: 0, // מונע מהנקודה להתכווץ אם השם של המוצר ארוך
                  }}
                />
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "var(--text)",
                  }}
                >
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* אזור התוצאות */}
      {isLoading ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            fontSize: "18px",
            color: "var(--primary)",
          }}
        >
          <i className="fas fa-spinner fa-spin"></i> מחפש במאגר...
        </div>
      ) : selectedProduct && priceData ? (
        <div
          style={{
            background: "var(--card)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            style={{
              margin: "0 0 20px",
              textAlign: "center",
              color: "var(--text)",
            }}
          >
            תוצאות עבור:{" "}
            <span style={{ color: "var(--primary)" }}>{selectedProduct}</span>
          </h3>
          {Object.keys(priceData).filter((k) => k !== "lastUpdated").length ===
          0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-light)",
                padding: "30px 0",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>🕵️‍♂️</div>
              עדיין אין נתונים קהילתיים למוצר זה.
              <button
                onClick={requestPriorityUpdate}
                style={{
                  display: "block",
                  margin: "20px auto 0",
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 4px 10px rgba(59, 130, 246, 0.3)",
                }}
              >
                🤖 בקש מהרובוט לחפש עכשיו
              </button>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {Object.entries(priceData)
                .filter(([key]) => key !== "lastUpdated")
                .sort((a, b) => a[1][0].price - b[1][0].price) // מיון מהזול ליקר
                .sort((a, b) => {
                  // רשימת רשתות גדולות שיופיעו ראשונות (לפי סדר עדיפות)
                  const MAJOR_CHAINS = [
                    "שופרסל",
                    "רמי לוי",
                    "חצי חינם",
                    "מחסני השוק",
                    "ויקטורי",
                    "אושר עד",
                    "יוחננוף",
                    "טיב טעם",
                  ];
                  const aIdx = MAJOR_CHAINS.indexOf(a[0]);
                  const bIdx = MAJOR_CHAINS.indexOf(b[0]);
                  const aIsMajor = aIdx !== -1;
                  const bIsMajor = bIdx !== -1;

                  // אם שתיהן רשתות גדולות - מיון לפי מחיר
                  if (aIsMajor && bIsMajor)
                    return a[1][0].price - b[1][0].price;
                  // רשת גדולה תמיד לפני רשת קטנה
                  if (aIsMajor && !bIsMajor) return -1;
                  if (!aIsMajor && bIsMajor) return 1;
                  // שתיהן קטנות - מיון לפי מחיר
                  return a[1][0].price - b[1][0].price;
                })
                .map(([store, prices], index) => (
                  <div
                    key={store}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "15px",
                      background: index === 0 ? "var(--bg)" : "var(--card)",
                      borderRadius: "10px",
                      border:
                        index === 0
                          ? "2px solid var(--success)"
                          : "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "16px",
                        color: "var(--text)",
                      }}
                    >
                      {index === 0 && "🏆 "} {store}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                      }}
                    >
                      <span
                        style={{
                          color: index === 0 ? "#059669" : "var(--success)",
                          fontWeight: "900",
                          fontSize: "18px",
                        }}
                      >
                        ₪{prices[0].price.toFixed(2)}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        עודכן: {prices[0].date}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
