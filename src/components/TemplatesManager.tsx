// src/components/TemplatesManager.tsx
import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  saveCurrentListAsTemplate,
  importTemplateToList,
} from "../utils/templateService";
import { showToast } from "../utils/helpers";

interface Template {
  id: string;
  name: string;
  items: any[];
  createdBy?: string;
  createdAt?: string;
}

interface TemplatesManagerProps {
  userId: string;
  currentList: any[];
}

export function TemplatesManager({
  userId,
  currentList,
}: TemplatesManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const fetchTemplates = async () => {
    try {
      const q = query(
        collection(db, "templates"),
        where("createdBy", "==", userId),
      );
      const querySnapshot = await getDocs(q);

      const list: Template[] = [];

      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Template);
      });

      setTemplates(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) fetchTemplates();
  }, [isOpen]);

  const handleSave = async () => {
    if (!newTemplateName.trim()) {
      showToast("אנא הזן שם לתבנית", "error");
      return;
    }
    await saveCurrentListAsTemplate(userId, newTemplateName, currentList);
    setNewTemplateName("");
    fetchTemplates();
  };

  return (
    <div style={{ margin: "15px 0" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "12px",
          background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
          color: "white",
          border: "none",
          borderRadius: "15px",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 4px 10px rgba(99, 102, 241, 0.2)",
        }}
      >
        📂 ניהול ויבוא תבניות רשימה
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: "10px",
            padding: "15px",
            background: "var(--bg-card, #fff)",
            borderRadius: "15px",
            border: "1px solid var(--border)",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
          }}
        >
          <h4 style={{ margin: "0 0 10px" }}>
            💾 שמור את הרשימה הנוכחית כתבנית
          </h4>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="مثל: ארוחת שישי משפחתית"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                fontSize: "14px",
              }}
            />
            <button
              onClick={handleSave}
              style={{
                padding: "10px 15px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              שמור תבנית
            </button>
          </div>

          <h4 style={{ margin: "0 0 10px" }}>📋 התבניות שלי</h4>
          {templates.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#666" }}>
              אין לך עדיין תבניות שמורות. שמור את הראשונה שלך למעלה!
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    background: "var(--bg-body, #f9fafb)",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                      {tpl.name}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        display: "block",
                      }}
                    >
                      {tpl.items.length} מוצרים בתבנית
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      importTemplateToList(userId, tpl.id, currentList)
                    }
                    style={{
                      padding: "6px 12px",
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    📥 יבוא לרשימה
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
