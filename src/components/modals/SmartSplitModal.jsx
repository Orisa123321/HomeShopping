import React from "react";

const SmartSplitModal = ({ isOpen, onClose, ultimateCartData, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0 }}>💡 האסטרטגיות המנצחות שלך</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {isLoading || !ultimateCartData ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div className="cooking-loader">🧮</div>
            <p>מחשב עגלות מול קהילת המשתמשים...</p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div
              style={{
                background: "var(--bg)",
                padding: "15px",
                borderRadius: "12px",
                border: "2px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "10px",
                  marginBottom: "10px",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "18px" }}>🥇 סל במקום אחד</h4>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: "900",
                    color: "var(--text-main)",
                  }}
                >
                  ₪{ultimateCartData.oneStop?.total.toFixed(2)}
                </span>
              </div>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: "14px",
                  color: "var(--text-light)",
                }}
              >
                לקנות הכל ב-
                <strong>{ultimateCartData.oneStop?.store}</strong> (ללא נסיעות
                מיותרות).
              </p>
            </div>

            {ultimateCartData.twoStops ? (
              <div
                style={{
                  background: "#f0fdf4",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "2px solid #4ade80",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #bbf7d0",
                    paddingBottom: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "18px",
                      color: "#166534",
                    }}
                  >
                    ⚖️ שביל הזהב (2 תחנות)
                  </h4>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "900",
                      color: "#166534",
                    }}
                  >
                    ₪{ultimateCartData.twoStops.rawTotal.toFixed(2)}
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: "13px",
                    color: "#166534",
                    background: "#dcfce7",
                    padding: "8px",
                    borderRadius: "8px",
                  }}
                >
                  💡 <strong>משתלם!</strong> החיסכון בסל מכסה את קנס הנסיעה
                  (מוערך ב-{ultimateCartData.penaltyRate}₪).
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  {ultimateCartData.twoStops.stores.map((st) => (
                    <div
                      key={st}
                      style={{
                        flex: 1,
                        background: "white",
                        padding: "8px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <strong>{st}</strong>
                      <br />
                      <span style={{ color: "var(--text-light)" }}>
                        {ultimateCartData.twoStops.groups[st].items.length}{" "}
                        מוצרים
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "15px",
                  borderRadius: "12px",
                  border: "1px dashed var(--border)",
                  textAlign: "center",
                  color: "var(--text-light)",
                }}
              >
                ⚖️ <strong>שביל הזהב:</strong> לא נמצא פיצול ל-2 חנויות שהחיסכון
                בו שווה את הנסיעה (מעל {ultimateCartData?.penaltyRate || 20}₪).
                שווה להישאר בחנות אחת!
              </div>
            )}

            {ultimateCartData.extreme ? (
              <div
                style={{
                  background: "#fff1f2",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "2px solid #fb7185",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #fecdd3",
                    paddingBottom: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "18px",
                      color: "#9f1239",
                    }}
                  >
                    🎯 אקסטרים (הכי זול!)
                  </h4>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "900",
                      color: "#9f1239",
                    }}
                  >
                    ₪{ultimateCartData.extreme.rawTotal.toFixed(2)}
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: "13px",
                    color: "#9f1239",
                    background: "#ffe4e6",
                    padding: "8px",
                    borderRadius: "8px",
                  }}
                >
                  💡 אפילו אחרי קנס של{" "}
                  <strong>₪{ultimateCartData.extreme.penalty}</strong> על נסיעות
                  ל-
                  {Object.keys(ultimateCartData.extreme.groups).length} חנויות
                  שונות, זה הפיצול הזול ביותר!
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {Object.keys(ultimateCartData.extreme.groups).map((st) => (
                    <span
                      key={st}
                      style={{
                        background: "white",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        border: "1px solid #fecdd3",
                      }}
                    >
                      {st}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <button
          className="store-tab active"
          style={{ width: "100%", marginTop: 20, padding: 12 }}
          onClick={onClose}
        >
          סגור
        </button>
      </div>
    </div>
  );
};

export default SmartSplitModal;
