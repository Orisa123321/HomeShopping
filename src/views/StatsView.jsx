import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

// אמוג'י קטגוריות
const CAT_EMOJI = {
  "מוצרי חלב וביצים": "🥛",
  "מאפייה ולחמים": "🥖",
  "בשר ודגים": "🥩",
  "פירות וירקות": "🥗",
  "חטיפים ומתוקים": "🍫",
  "שתייה ואלכוהול": "🥤",
  "פארם וניקיון": "🧻",
  "מזווה ושימורים": "🥫",
  כללי: "🛒",
};

// צבעים לגרף קטגוריות
const CAT_COLORS = [
  "#7c3aed",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

// אנימציית כניסה לכרטיסים
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" },
  }),
};

export function StatsView({ stats, items = [] }) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // --- 1. הגדרת תקציב חודשי (נשמר ב-LocalStorage) ---
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    return Number(localStorage.getItem("monthly_budget")) || 1500;
  });
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(monthlyBudget);

  // --- 2. חישוב "האם חסכתם?" בהשוואה לממוצע הגלובלי ---
  const [savingsData, setSavingsData] = useState({
    totalSaved: 0,
    matchedCount: 0,
    isLoading: true,
  });

  useEffect(() => {
    const calculateSavings = async () => {
      const monthlyPurchases = [];
      items.forEach((item) => {
        if (item.priceHistory) {
          item.priceHistory.forEach((entry) => {
            if (entry.timestamp) {
              const d = new Date(entry.timestamp);
              if (
                d.getMonth() === currentMonth &&
                d.getFullYear() === currentYear
              ) {
                monthlyPurchases.push({
                  name: item.name,
                  paidPrice: entry.price,
                });
              }
            }
          });
        }
      });

      if (monthlyPurchases.length === 0) {
        setSavingsData({ totalSaved: 0, matchedCount: 0, isLoading: false });
        return;
      }

      try {
        const uniqueNames = [
          ...new Set(monthlyPurchases.map((p) => p.name.toLowerCase().trim())),
        ];

        const pricePromises = uniqueNames.map(async (name) => {
          const docRef = doc(db, "global_prices", name);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            let storePricesSum = 0;
            let storeCount = 0;
            Object.entries(data).forEach(([key, val]) => {
              if (
                key !== "lastUpdated" &&
                Array.isArray(val) &&
                val.length > 0
              ) {
                storePricesSum += val[0].price;
                storeCount++;
              }
            });
            if (storeCount > 0) {
              return { name, avgGlobalPrice: storePricesSum / storeCount };
            }
          }
          return { name, avgGlobalPrice: null };
        });

        const results = await Promise.all(pricePromises);
        const avgPriceMap = {};
        results.forEach((res) => {
          if (res.avgGlobalPrice !== null) {
            avgPriceMap[res.name] = res.avgGlobalPrice;
          }
        });

        let totalSavings = 0;
        let matchedCount = 0;

        monthlyPurchases.forEach((p) => {
          const key = p.name.toLowerCase().trim();
          if (avgPriceMap[key] !== undefined) {
            totalSavings += avgPriceMap[key] - p.paidPrice;
            matchedCount++;
          }
        });

        setSavingsData({
          totalSaved: totalSavings,
          matchedCount,
          isLoading: false,
        });
      } catch (err) {
        console.error("Error fetching global average prices:", err);
        setSavingsData((prev) => ({ ...prev, isLoading: false }));
      }
    };

    calculateSavings();
  }, [items, currentMonth, currentYear]);

  const handleSaveBudget = () => {
    const val = Number(budgetInput);
    if (!isNaN(val) && val > 0) {
      setMonthlyBudget(val);
      localStorage.setItem("monthly_budget", val);
      setIsEditingBudget(false);
    }
  };

  // --- 3. גרף מגמות חודשי (6 חודשים אחורה) ---
  const monthlyTrends = useMemo(() => {
    const trends = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trends.push({
        monthName: d.toLocaleDateString("he-IL", { month: "short" }),
        monthNum: d.getMonth(),
        year: d.getFullYear(),
        total: 0,
      });
    }

    items.forEach((item) => {
      if (item.priceHistory) {
        item.priceHistory.forEach((entry) => {
          if (entry.timestamp) {
            const entryDate = new Date(entry.timestamp);
            const m = entryDate.getMonth();
            const y = entryDate.getFullYear();
            const trend = trends.find((t) => t.monthNum === m && t.year === y);
            if (trend) trend.total += entry.price;
          }
        });
      }
    });

    const maxAmount = Math.max(...trends.map((t) => t.total), 1);
    return trends.map((t) => ({
      ...t,
      percentage: (t.total / maxAmount) * 100,
    }));
  }, [items]);

  // --- 4. פילוח לפי קטגוריות ---
  const categoryBreakdown = useMemo(() => {
    const totals = {};
    let totalSpentThisMonth = 0;

    items.forEach((item) => {
      if (item.priceHistory) {
        item.priceHistory.forEach((entry) => {
          if (entry.timestamp) {
            const d = new Date(entry.timestamp);
            if (
              d.getMonth() === currentMonth &&
              d.getFullYear() === currentYear
            ) {
              const cat = item.category || "כללי";
              totals[cat] = (totals[cat] || 0) + entry.price;
              totalSpentThisMonth += entry.price;
            }
          }
        });
      }
    });

    return Object.entries(totals)
      .map(([name, total]) => ({
        name,
        total,
        percentage:
          totalSpentThisMonth > 0 ? (total / totalSpentThisMonth) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [items, currentMonth, currentYear]);

  // --- 5. טופ 5 מוצרים יקרים ---
  const topExpensiveProducts = useMemo(() => {
    const productTotals = {};

    items.forEach((item) => {
      if (item.priceHistory) {
        item.priceHistory.forEach((entry) => {
          if (entry.timestamp) {
            const d = new Date(entry.timestamp);
            if (
              d.getMonth() === currentMonth &&
              d.getFullYear() === currentYear
            ) {
              if (!productTotals[item.name])
                productTotals[item.name] = { total: 0, count: 0 };
              productTotals[item.name].total += entry.price;
              productTotals[item.name].count += 1;
            }
          }
        });
      }
    });

    return Object.entries(productTotals)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        avg: data.total / data.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [items, currentMonth, currentYear]);

  // חישובי תקציב
  const totalSpent = stats.totalSpent;
  const budgetUtilization = (totalSpent / monthlyBudget) * 100;
  const isOverBudget = budgetUtilization > 100;
  const isNearBudget = budgetUtilization >= 80 && !isOverBudget;

  // שם החודש בעברית
  const currentMonthName = new Date().toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  // סה"כ הוצאות קטגוריות (לחישוב stacked bar)
  const totalCatSpent = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);

  return (
    <section className="stats-dashboard modern-stats">
      <style>{`
        .modern-stats {
          font-family: 'Assistant', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 10px 5px;
        }
        .stats-section-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--primary);
          margin: 0 0 15px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .premium-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .premium-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
        }

        /* --- Budget --- */
        .budget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .budget-amount {
          font-size: 1.6rem;
          font-weight: 900;
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .budget-amount span {
          font-size: 0.9rem;
          color: var(--text-light);
          text-decoration: underline;
        }
        .budget-edit-form {
          display: flex;
          gap: 8px;
          align-items: center;
          overflow: hidden;
        }
        .budget-input {
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          width: 90px;
          font-size: 1rem;
          font-weight: bold;
          outline: none;
          transition: border-color 0.2s;
        }
        .budget-input:focus {
          border-color: var(--primary);
        }
        .save-btn {
          background: var(--primary);
          color: white;
          border: none;
          padding: 6px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: bold;
          font-size: 0.85rem;
          transition: transform 0.2s;
        }
        .save-btn:hover { transform: scale(1.05); }

        .utilization-wrapper { margin-top: 15px; }
        .utilization-text {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          font-weight: bold;
          margin-bottom: 6px;
        }
        .progress-bar-container {
          height: 14px;
          background: var(--bg);
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 8px;
        }
        .fill-normal { background: linear-gradient(90deg, var(--primary), #6366f1); }
        .fill-near { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
        .fill-over { background: linear-gradient(90deg, #ef233c, #ff6b6b); box-shadow: 0 0 10px rgba(239, 35, 60, 0.3); }

        .budget-alert {
          margin-top: 12px;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 0.85rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .budget-alert.near {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          color: #d97706;
        }
        .budget-alert.over {
          background: rgba(239, 35, 60, 0.08);
          border: 1px solid rgba(239, 35, 60, 0.2);
          color: #ef233c;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.95; }
          50% { opacity: 1; transform: scale(1.01); }
          100% { opacity: 0.95; }
        }

        /* --- Trends --- */
        .trends-graph {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          height: 170px;
          padding: 10px 0;
          margin-top: 10px;
        }
        .trend-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          height: 100%;
          justify-content: flex-end;
          min-width: 0;
        }
        .trend-value {
          font-size: 0.7rem;
          font-weight: bold;
          margin-bottom: 4px;
          color: var(--text);
          white-space: nowrap;
        }
        .trend-bar-track {
          width: 100%;
          max-width: 36px;
          height: 100px;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }
        .trend-bar-fill {
          width: 100%;
          background: linear-gradient(180deg, var(--primary), rgba(67, 97, 238, 0.4));
          border-radius: 8px 8px 4px 4px;
          min-height: 4px;
        }
        .trend-month-name {
          font-size: 0.75rem;
          font-weight: bold;
          color: var(--text-light);
          margin-top: 8px;
        }

        /* --- Stacked Category Bar --- */
        .cat-stacked-bar {
          display: flex;
          height: 16px;
          border-radius: 10px;
          overflow: hidden;
          gap: 2px;
          margin-bottom: 16px;
        }
        .cat-stacked-segment { min-width: 4px; }
        .cat-breakdown-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }
        .cat-breakdown-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }
        .cat-color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cat-breakdown-values {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cat-pct {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-light);
          min-width: 34px;
          text-align: left;
        }
        .cat-amount {
          font-size: 13px;
          font-weight: 700;
          color: var(--primary);
          min-width: 60px;
          text-align: left;
        }

        /* --- Savings --- */
        .savings-card-positive {
          background: linear-gradient(135deg, #10b981, #059669);
          border: none; color: white;
        }
        .savings-card-negative {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none; color: white;
        }
        .savings-card-neutral {
          background: linear-gradient(135deg, #6b7280, #4b5563);
          border: none; color: white;
        }
        .savings-card-positive .stats-section-title,
        .savings-card-negative .stats-section-title,
        .savings-card-neutral .stats-section-title { color: white; }
        .savings-value {
          font-size: 2.2rem;
          font-weight: 900;
          margin: 10px 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .savings-desc {
          font-size: 0.85rem;
          opacity: 0.9;
          font-weight: 500;
          line-height: 1.4;
        }

        /* --- Top 5 --- */
        .top-products-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .top-product-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 8px;
          border-radius: 12px;
          transition: background 0.2s;
        }
        .top-product-row:hover { background: var(--bg); }
        .top-product-rank {
          font-size: 20px;
          min-width: 30px;
          text-align: center;
        }
        .top-product-info { flex: 1; min-width: 0; }
        .top-product-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .top-product-meta {
          font-size: 11px;
          color: var(--text-light);
          margin-top: 2px;
        }
        .top-product-total {
          font-size: 15px;
          font-weight: 800;
          color: var(--primary);
          white-space: nowrap;
        }
      `}</style>

      <h2 style={{ margin: "0 0 4px", fontSize: "1.3rem" }}>
        📊 סיכום — {currentMonthName}
      </h2>

      {/* ====== כרטיס תקציב חודשי ====== */}
      <motion.div
        className="premium-card"
        custom={0}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <div className="budget-header">
          <span
            className="stat-title"
            style={{ margin: 0, fontWeight: "bold" }}
          >
            תקציב החודש שלי
          </span>

          <AnimatePresence mode="wait">
            {isEditingBudget ? (
              <motion.div
                className="budget-edit-form"
                key="edit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <input
                  type="number"
                  className="budget-input"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveBudget()}
                  autoFocus
                />
                <button className="save-btn" onClick={handleSaveBudget}>
                  שמור
                </button>
                <button
                  className="save-btn"
                  style={{ background: "var(--text-light)" }}
                  onClick={() => setIsEditingBudget(false)}
                >
                  ✕
                </button>
              </motion.div>
            ) : (
              <motion.div
                className="budget-amount"
                key="display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  setIsEditingBudget(true);
                  setBudgetInput(monthlyBudget);
                }}
              >
                ₪{monthlyBudget} <span>[ערוך ✏️]</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className="stat-card"
          style={{
            boxShadow: "none",
            padding: "10px 0 0 0",
            background: "transparent",
            border: "none",
          }}
        >
          <div className="stat-title" style={{ fontSize: "0.85rem" }}>
            הוצאות מתועדות בפועל
          </div>
          <div className="stat-value" style={{ fontSize: "2.5rem" }}>
            ₪{totalSpent.toFixed(2)}
          </div>
        </div>

        <div className="utilization-wrapper">
          <div className="utilization-text">
            <span
              style={{
                color: isOverBudget
                  ? "#ef233c"
                  : isNearBudget
                    ? "#d97706"
                    : "var(--primary)",
              }}
            >
              ניצול: {budgetUtilization.toFixed(1)}%
            </span>
            <span style={{ color: "var(--text-light)" }}>
              נותרו: ₪{Math.max(0, monthlyBudget - totalSpent).toFixed(0)}
            </span>
          </div>
          <div className="progress-bar-container">
            <motion.div
              className={`progress-bar-fill ${isOverBudget ? "fill-over" : isNearBudget ? "fill-near" : "fill-normal"}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, budgetUtilization)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        <AnimatePresence>
          {isOverBudget && (
            <motion.div
              className="budget-alert over"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span>🚨</span>
              <span>
                חרגתם מהתקציב ב-₪{(totalSpent - monthlyBudget).toFixed(0)}!
              </span>
            </motion.div>
          )}
          {isNearBudget && (
            <motion.div
              className="budget-alert near"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span>⚡</span>
              <span>
                הגעתם ל-{budgetUtilization.toFixed(0)}% מהתקציב — נשארו ₪
                {(monthlyBudget - totalSpent).toFixed(0)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ====== גרף מגמות חודשי ====== */}
      <motion.div
        className="premium-card"
        custom={1}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <h3 className="stats-section-title">📈 מגמות הוצאה חודשיות</h3>
        <div className="trends-graph">
          {monthlyTrends.map((t, i) => (
            <div className="trend-col" key={i}>
              <span className="trend-value">₪{t.total.toFixed(0)}</span>
              <div className="trend-bar-track">
                <motion.div
                  className="trend-bar-fill"
                  initial={{ height: 0 }}
                  animate={{ height: `${t.percentage}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                />
              </div>
              <span className="trend-month-name">{t.monthName}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ====== פילוח קטגוריות — Stacked Bar + רשימה ====== */}
      <motion.div
        className="premium-card"
        custom={2}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <h3 className="stats-section-title">🏷️ פילוח לפי קטגוריות</h3>
        {categoryBreakdown.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-light)",
              padding: "10px",
            }}
          >
            אין רכישות מתועדות החודש.
          </div>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="cat-stacked-bar">
              {categoryBreakdown.map((cat, i) => {
                const pct =
                  totalCatSpent > 0 ? (cat.total / totalCatSpent) * 100 : 0;
                return (
                  <motion.div
                    key={cat.name}
                    className="cat-stacked-segment"
                    style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    title={`${cat.name}: ₪${cat.total.toFixed(2)}`}
                  />
                );
              })}
            </div>

            {/* רשימה מפורטת */}
            {categoryBreakdown.map((cat, i) => (
              <div key={cat.name} className="cat-breakdown-row">
                <div className="cat-breakdown-info">
                  <span
                    className="cat-color-dot"
                    style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
                  />
                  <span>
                    {CAT_EMOJI[cat.name] || "📦"} {cat.name}
                  </span>
                </div>
                <div className="cat-breakdown-values">
                  <span className="cat-pct">{cat.percentage.toFixed(0)}%</span>
                  <span className="cat-amount">₪{cat.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </motion.div>

      {/* ====== האם חסכתם? ====== */}
      <motion.div
        className={`premium-card ${
          savingsData.isLoading
            ? "savings-card-neutral"
            : savingsData.totalSaved > 0
              ? "savings-card-positive"
              : savingsData.totalSaved < 0
                ? "savings-card-negative"
                : "savings-card-neutral"
        }`}
        custom={3}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <h3 className="stats-section-title">
          {savingsData.totalSaved > 0
            ? "🎉"
            : savingsData.totalSaved < 0
              ? "📉"
              : "📊"}{" "}
          חוכמת ההמונים: האם חסכתם?
        </h3>
        {savingsData.isLoading ? (
          <div
            style={{ textAlign: "center", padding: "15px", fontSize: "0.9rem" }}
          >
            מחשב נתוני חיסכון קהילתיים... ⏳
          </div>
        ) : (
          <div>
            <div className="savings-value">
              {savingsData.totalSaved > 0
                ? `+₪${savingsData.totalSaved.toFixed(1)}`
                : savingsData.totalSaved < 0
                  ? `-₪${Math.abs(savingsData.totalSaved).toFixed(1)}`
                  : "₪0.0"}
            </div>
            <p className="savings-desc">
              {savingsData.totalSaved > 0
                ? `שילמתם ₪${savingsData.totalSaved.toFixed(1)} פחות מהמחיר הממוצע הארצי על ${savingsData.matchedCount} מוצרים. אלופים! 🏆`
                : savingsData.totalSaved < 0
                  ? `שילמתם ₪${Math.abs(savingsData.totalSaved).toFixed(1)} מעל הממוצע הארצי. נסו את הפיצול החכם לפני הקנייה הבאה! 🛒`
                  : `אין מספיק השוואות מחיר החודש. המשיכו לתעד מחירים! 🌱`}
            </p>
          </div>
        )}
      </motion.div>

      {/* ====== Top 5 מוצרים יקרים ====== */}
      <motion.div
        className="premium-card"
        custom={4}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <h3 className="stats-section-title">🔥 Top 5 — לאן הלך הכסף</h3>
        {topExpensiveProducts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-light)",
              padding: "10px",
            }}
          >
            אין רכישות מתועדות החודש.
          </div>
        ) : (
          <div className="top-products-list">
            {topExpensiveProducts.map((prod, i) => (
              <motion.div
                key={prod.name}
                className="top-product-row"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
              >
                <div className="top-product-rank">
                  {i === 0
                    ? "🥇"
                    : i === 1
                      ? "🥈"
                      : i === 2
                        ? "🥉"
                        : `${i + 1}.`}
                </div>
                <div className="top-product-info">
                  <div className="top-product-name">{prod.name}</div>
                  <div className="top-product-meta">
                    {prod.count} קניות · ממוצע ₪{prod.avg.toFixed(2)}
                  </div>
                </div>
                <div className="top-product-total">
                  ₪{prod.total.toFixed(2)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ====== הוצאות לפי רשתות ====== */}
      <motion.div
        className="premium-card"
        custom={5}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <h3 className="stats-section-title">🏪 הוצאות לפי רשתות שיווק</h3>
        {Object.keys(stats.storeTotals).length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-light)",
              padding: "10px",
            }}
          >
            אין רכישות מתועדות החודש.
          </div>
        ) : (
          <div className="bar-chart-container" style={{ marginTop: 0 }}>
            {Object.entries(stats.storeTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([store, total]) => {
                const percentage =
                  totalSpent > 0 ? (total / totalSpent) * 100 : 0;
                return (
                  <div key={store} className="bar-row">
                    <div className="bar-label">
                      <span>{store}</span>
                      <span>₪{total.toFixed(2)}</span>
                    </div>
                    <div className="bar-track">
                      <motion.div
                        className="bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6 }}
                        style={{
                          background:
                            "linear-gradient(90deg, #ec4899, #f472b6)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </motion.div>

      <div style={{ height: 80 }} />
    </section>
  );
}
