import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { generateAiRecipe, showToast, DAYS_HEB } from "../utils/helpers";

export function PantryView({ items = [], user, sharedListId }) {
  const [inStockItems, setInStockItems] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiRecipe, setAiRecipe] = useState(null);

  const [savingSuggestions, setSavingSuggestions] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    const active = items.filter((item) => item.current > 0);
    setInStockItems(active);
    setSelectedIngredients(active.map((i) => i.name));
  }, [items]);

  const toggleIngredient = (name) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name],
    );
  };

  const handleGenerateRecipe = async () => {
    if (selectedIngredients.length === 0) {
      showToast("נא לבחור לפחות מצרך אחד מהמזווה!", "error");
      return;
    }
    setIsAiLoading(true);
    setAiRecipe(null);
    try {
      const recipe = await generateAiRecipe(selectedIngredients, false);
      if (recipe.error) {
        showToast(recipe.error, "error");
      } else {
        setAiRecipe(recipe);
        showToast("השף מצא מתכון מושלם!", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("שגיאה בחיבור לשף החכם.", "error");
    }
    setIsAiLoading(false);
  };

  const costForecast = useMemo(() => {
    let predictedTotal = 0;
    let missingItemsCount = 0;

    items.forEach((item) => {
      if (item.current < item.target && !item.isBought) {
        missingItemsCount++;
        let avgPrice = 12;
        if (item.priceHistory && item.priceHistory.length > 0) {
          const sum = item.priceHistory.reduce((a, b) => a + b.price, 0);
          avgPrice = sum / item.priceHistory.length;
        }
        const gap = item.target - item.current;
        predictedTotal += avgPrice * gap;
      }
    });

    return {
      amount: Math.round(predictedTotal),
      count: missingItemsCount,
    };
  }, [items]);

  useEffect(() => {
    const analyzePantryIntelligence = async () => {
      setIsCalculating(true);
      const newPatterns = [];
      const newSavings = [];

      items.forEach((item) => {
        const purchaseCount = item.priceHistory ? item.priceHistory.length : 0;
        if (purchaseCount >= 3 && !item.recurringDay) {
          newPatterns.push({
            id: item.id,
            name: item.name,
            count: purchaseCount,
            item,
          });
        }
      });
      setPatterns(newPatterns.slice(0, 3));

      try {
        const savingsPromises = items
          .filter((item) => item.priceHistory && item.priceHistory.length > 0)
          .map(async (item) => {
            const normalizedName = item.name.toLowerCase().trim();
            const docRef = doc(db, "global_prices", normalizedName);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
              const globalData = snap.data();
              let cheapestStore = "";
              let cheapestPrice = Infinity;
              let userStore = item.store || "";
              let userPaidPrice = 0;

              if (item.priceHistory && item.priceHistory.length > 0) {
                userPaidPrice = item.priceHistory[0].price;
                if (!userStore) userStore = item.priceHistory[0].store || "";
              }

              Object.entries(globalData).forEach(([storeName, history]) => {
                if (
                  storeName !== "lastUpdated" &&
                  Array.isArray(history) &&
                  history.length > 0
                ) {
                  const currentPrice = history[0].price;
                  if (currentPrice < cheapestPrice) {
                    cheapestPrice = currentPrice;
                    cheapestStore = storeName;
                  }
                }
              });

              if (
                cheapestStore &&
                userStore &&
                cheapestStore !== userStore &&
                userPaidPrice > cheapestPrice
              ) {
                const yearlyUsage = 26;
                const singleSaving = userPaidPrice - cheapestPrice;
                const yearlySaving = singleSaving * yearlyUsage;

                if (yearlySaving > 15) {
                  return {
                    name: item.name,
                    userStore,
                    cheapestStore,
                    cheapestPrice,
                    userPaidPrice,
                    yearlySaving: Math.round(yearlySaving),
                  };
                }
              }
            }
            return null;
          });

        const savingsResults = await Promise.all(savingsPromises);
        setSavingSuggestions(savingsResults.filter(Boolean).slice(0, 3));
      } catch (err) {
        console.error("Error analyzing savings:", err);
      }
      setIsCalculating(false);
    };

    if (items.length > 0) {
      analyzePantryIntelligence();
    }
  }, [items]);

  const handleSetRecurring = async (item, day) => {
    try {
      await updateDoc(doc(db, "groceries", item.id), {
        recurringDay: day,
      });
      showToast(
        `מעולה! הוגדר חידוש אוטומטי לכל יום ${DAYS_HEB[day]} עבור ${item.name}`,
        "success",
      );
      setPatterns((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err) {
      console.error(err);
      showToast("שגיאה בעדכון החידוש האוטומטי", "error");
    }
  };

  return (
    <div className="pantry-dashboard modern-pantry">
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h2
          style={{
            fontSize: "24px",
            color: "var(--primary)",
            margin: "0 0 10px",
          }}
        >
          🧠 המזווה החכם שלי
        </h2>
        <p style={{ color: "var(--text-light)", fontSize: "14px", margin: 0 }}>
          בינה מלאכותית ותובנות חכמות מבוססות על המלאי והקניות שלכם
        </p>
      </div>

      <motion.div
        className="premium-card cost-forecast-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="forecast-icon">🔮</div>
        <div className="forecast-info">
          <h4 style={{ margin: "0 0 5px 0", color: "var(--text-light)" }}>
            חיזוי עלות הקניות הבאה
          </h4>
          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: "900",
              color: "var(--text)",
            }}
          >
            ₪{costForecast.amount}
          </div>
          <p
            style={{
              margin: "5px 0 0 0",
              fontSize: "0.85rem",
              color: "var(--text-light)",
            }}
          >
            מבוסס על {costForecast.count} מוצרים שחסרים לכם ברשימה ועל ההיסטוריה
            שלכם.
          </p>
        </div>
      </motion.div>

      <div className="premium-card">
        <h3 className="stats-section-title">🍳 מה לבשל הערב?</h3>
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--text-light)",
            marginTop: 0,
          }}
        >
          סמנו את המצרכים שיש לכם בבית והשף ימציא לכם מתכון מיידי:
        </p>

        {inStockItems.length === 0 ? (
          <div className="empty-pantry-notice">
            אין כרגע מוצרים במלאי המזווה. עדכנו כמויות (מלאי נוכחי) במסך הקניות!
          </div>
        ) : (
          <>
            <div className="pantry-chips-container">
              {inStockItems.map((item) => {
                const isSelected = selectedIngredients.includes(item.name);
                return (
                  <span
                    key={item.id}
                    className={`pantry-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleIngredient(item.name)}
                  >
                    {item.name} {isSelected ? "✓" : "+"}
                  </span>
                );
              })}
            </div>

            <button
              className="generate-list-btn"
              onClick={handleGenerateRecipe}
              disabled={isAiLoading}
              style={{
                width: "100%",
                marginTop: "15px",
                display: "flex",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isAiLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> השף רוקח משהו...
                </>
              ) : (
                <>
                  <span>🪄</span> שאל את השף מה לבשל
                </>
              )}
            </button>
          </>
        )}

        <AnimatePresence>
          {aiRecipe && (
            <motion.div
              className="ai-generated-recipe-card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h4>✨ {aiRecipe.title}</h4>
              <div className="recipe-meta-pill">
                🕒 זמן הכנה: {aiRecipe.time}
              </div>

              <h5>מצרכים נדרשים:</h5>
              <ul className="recipe-ing-list">
                {aiRecipe.ingredients.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>

              <h5>שלבי הכנה:</h5>
              <ol className="recipe-steps-list">
                {aiRecipe.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="premium-card">
        <h3 className="stats-section-title">📊 זיהוי דפוסי קנייה</h3>
        {patterns.length === 0 ? (
          <div
            style={{
              fontSize: "0.9rem",
              color: "var(--text-light)",
              textAlign: "center",
              padding: "10px",
            }}
          >
            עדיין לא זיהינו דפוסים חדשים. המשיכו לקנות ולתעד מחירים!
          </div>
        ) : (
          <div className="patterns-list">
            {patterns.map((p) => (
              <div key={p.id} className="pattern-row">
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                    {p.name}
                  </div>
                  <div
                    style={{ fontSize: "0.8rem", color: "var(--text-light)" }}
                  >
                    קניתם מוצר זה {p.count} פעמים לאחרונה.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  <button
                    className="mini-action-btn"
                    onClick={() => handleSetRecurring(p.item, 4)}
                  >
                    חידוש בחמישי 🛒
                  </button>
                  <button
                    className="mini-action-btn"
                    onClick={() => handleSetRecurring(p.item, 0)}
                  >
                    בראשון 🛒
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="premium-card">
        <h3 className="stats-section-title">💡 הצעות חיסכון חכמות</h3>
        {isCalculating ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-light)",
              padding: "15px",
            }}
          >
            <i className="fas fa-spinner fa-spin"></i> מנתח את סל הקניות שלכם
            מול רשתות אחרות...
          </div>
        ) : savingSuggestions.length === 0 ? (
          <div
            style={{
              fontSize: "0.9rem",
              color: "var(--text-light)",
              textAlign: "center",
              padding: "10px",
            }}
          >
            מעולה! אתם קונים את המוצרים שלכם במקומות הזולים ביותר שיש כרגע
            במאגר.
          </div>
        ) : (
          <div className="savings-list">
            {savingSuggestions.map((s, idx) => (
              <div key={idx} className="saving-box-item">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "var(--primary)" }}>
                    {s.name}
                  </span>
                  <span className="saving-badge-highlight">
                    חיסכון שנתי צפוי: ₪{s.yearlySaving}
                  </span>
                </div>
                <div
                  style={{ fontSize: "0.85rem", color: "var(--text-light)" }}
                >
                  שילמתם ₪{s.userPaidPrice.toFixed(2)} ב-
                  <strong>{s.userStore}</strong>. במעבר ל-
                  <strong>{s.cheapestStore}</strong> (₪
                  {s.cheapestPrice.toFixed(2)}) תחסכו בכל קנייה!
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
