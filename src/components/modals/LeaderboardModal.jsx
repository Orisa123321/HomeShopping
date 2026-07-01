import React from "react";

const LeaderboardModal = ({ isOpen, onClose, items }) => {
  if (!isOpen) return null;

  const stats = {};
  items.forEach((item) => {
    const adder = item.addedBy || "משפחה (ישן)";
    if (!stats[adder]) stats[adder] = { added: 0, bought: 0, score: 0 };
    stats[adder].added += 1;
    stats[adder].score += 5;

    if (item.isBought) {
      const buyer = item.boughtBy || item.addedBy || "משפחה (ישן)";
      if (!stats[buyer]) stats[buyer] = { added: 0, bought: 0, score: 0 };
      stats[buyer].bought += 1;
      stats[buyer].score += 15;
    }
  });

  const sortedPlayers = Object.entries(stats).sort(
    (a, b) => b[1].score - a[1].score,
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "400px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3 style={{ margin: 0, fontSize: "22px" }}>🏆 אליפות הקניות</h3>
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

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {sortedPlayers.map(([playerName, data], index) => {
            let medal = "🏅";
            if (index === 0) medal = "👑";
            else if (index === 1) medal = "🥈";
            else if (index === 2) medal = "🥉";

            return (
              <div
                key={playerName}
                style={{
                  background:
                    index === 0
                      ? "linear-gradient(135deg, #fef08a 0%, #fef9c3 100%)"
                      : "var(--bg)",
                  padding: "15px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  border:
                    index === 0
                      ? "2px solid #facc15"
                      : "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: "30px" }}>{medal}</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>
                    {playerName}
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      fontSize: "12px",
                      color: "var(--text-light)",
                    }}
                  >
                    <span>🛒 קנה: {data.bought}</span>
                    <span>📝 הוסיף: {data.added}</span>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "900",
                      color: "var(--primary)",
                    }}
                  >
                    {data.score}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-light)" }}>
                    נק'
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "20px",
            fontSize: "12px",
            textAlign: "center",
            color: "var(--text-light)",
          }}
        >
          * 5 נק' על כל הוספת מוצר לרשימה, 15 נק' על קנייה בפועל. צאו לשבור
          שיאים!
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;
