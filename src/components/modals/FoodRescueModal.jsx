import React from "react";

const FoodRescueModal = ({ rescueRecipe, isRescuing, onClose }) => {
  if (!rescueRecipe && !isRescuing) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px", maxHeight: "80vh", overflowY: "auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0 }}>🧑‍🍳 שף הצלת המזון</h3>
          {!isRescuing && (
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
          )}
        </div>

        {isRescuing ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div
              className="cooking-loader"
              style={{ fontSize: "40px", marginBottom: "15px" }}
            >
              🥘
            </div>
            <p>מסתכל מה עומד להתקלקל וממציא מתכון...</p>
          </div>
        ) : (
          <div>
            <div
              style={{
                background: "#fffbeb",
                border: "1px dashed #f59e0b",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "15px",
                fontSize: "13px",
                color: "#b45309",
              }}
            >
              <strong>הצלחנו להציל:</strong>{" "}
              {rescueRecipe?.ingredients?.join(", ")}
            </div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: "1.6",
                color: "var(--text-main)",
              }}
            >
              {rescueRecipe?.recipeText}
            </div>

            <button
              className="store-tab active"
              style={{
                width: "100%",
                marginTop: 20,
                padding: 12,
                background: "var(--primary)",
                color: "white",
              }}
              onClick={onClose}
            >
              הבנתי, הולך לבשל!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodRescueModal;
