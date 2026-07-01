import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeCartNutritionally } from "../../utils/helpers";

const NutritionalAnalysisModal = ({ isOpen, onClose, items }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setData(null);
            setError("");
            analyzeCart();
        }
    }, [isOpen]);

    const analyzeCart = async () => {
        if (!items || items.length === 0) {
            setError("העגלה ריקה, אין מה לנתח! 🛒");
            return;
        }

        setLoading(true);
        const itemsToAnalyze = items.filter(item => item.target > 0);

        const result = await analyzeCartNutritionally(itemsToAnalyze);
        if (result.error) {
            setError(result.error);
        } else {
            setData(result);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="modal-overlay" onClick={onClose}>
                <motion.div
                    className="modal-content"
                    style={{ textAlign: "center" }}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>

                    <h2 style={{ marginBottom: "20px", color: "var(--primary-color)" }}>
                        <i className="fas fa-heartbeat" style={{ marginRight: "10px" }}></i>
                        ניתוח תזונתי חכם
                    </h2>

                    {loading ? (
                        <div style={{ padding: "40px 0" }}>
                            <i className="fas fa-spinner fa-spin fa-3x" style={{ color: "var(--primary-color)", marginBottom: "15px" }}></i>
                            <p>ה-AI מנתח את העגלה שלך...</p>
                        </div>
                    ) : error ? (
                        <div className="error-alert">
                            <i className="fas fa-exclamation-triangle"></i> {error}
                        </div>
                    ) : data ? (
                        <div className="nutrition-results">
                            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "20px", gap: "10px", flexWrap: "wrap" }}>
                                <div style={{ background: "var(--surface-color)", padding: "15px", borderRadius: "12px", flex: 1, minWidth: "100px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                                    <i className="fas fa-fire" style={{ color: "#ff6b6b", fontSize: "24px", marginBottom: "10px" }}></i>
                                    <h3 style={{ margin: "0", fontSize: "22px" }}>{data.calories.toLocaleString()}</h3>
                                    <p style={{ margin: "5px 0 0", fontSize: "14px", opacity: 0.8 }}>קלוריות</p>
                                </div>
                                <div style={{ background: "var(--surface-color)", padding: "15px", borderRadius: "12px", flex: 1, minWidth: "100px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                                    <i className="fas fa-dumbbell" style={{ color: "#4ecdc4", fontSize: "24px", marginBottom: "10px" }}></i>
                                    <h3 style={{ margin: "0", fontSize: "22px" }}>{data.protein}g</h3>
                                    <p style={{ margin: "5px 0 0", fontSize: "14px", opacity: 0.8 }}>חלבון</p>
                                </div>
                                <div style={{ background: "var(--surface-color)", padding: "15px", borderRadius: "12px", flex: 1, minWidth: "100px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                                    <i className="fas fa-star" style={{ color: "#feca57", fontSize: "24px", marginBottom: "10px" }}></i>
                                    <h3 style={{ margin: "0", fontSize: "22px" }}>{data.healthScore}/10</h3>
                                    <p style={{ margin: "5px 0 0", fontSize: "14px", opacity: 0.8 }}>ציון בריאות</p>
                                </div>
                            </div>

                            <div style={{ background: "rgba(78, 205, 196, 0.1)", padding: "15px", borderRadius: "12px", borderLeft: "4px solid #4ecdc4", textAlign: "right", marginBottom: "15px" }}>
                                <strong>סיכום: </strong> {data.summary}
                            </div>

                            <div style={{ background: "rgba(255, 107, 107, 0.1)", padding: "15px", borderRadius: "12px", borderLeft: "4px solid #ff6b6b", textAlign: "right" }}>
                                <strong>💡 טיפ לשיפור: </strong> {data.tip}
                            </div>
                        </div>
                    ) : null}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NutritionalAnalysisModal;