import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebaseConfig'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import './App.css';

function ShoppingList() {
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [expandedCats, setExpandedCats] = useState({});

  useEffect(() => {
    const q = query(collection(db, 'groceries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(itemsData);
    });
    return () => unsubscribe();
  }, []);

  const existingCategories = useMemo(() => {
    const cats = items.map(item => item.category);
    return [...new Set(cats)];
  }, [items]);

  const toggleCategory = (category) => {
    setExpandedCats(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (newItemName.trim() === '') return;
    const finalCategory = newItemCategory.trim() || 'כללי';

    try {
      await addDoc(collection(db, 'groceries'), {
        name: newItemName,
        category: finalCategory,
        current: 0,
        target: 1,
        isBought: false, // שדה חדש! מסמן שזה עדיין לא בעגלה
        createdAt: new Date()
      });
      setNewItemName('');
      setNewItemCategory('');
      setExpandedCats(prev => ({ ...prev, [finalCategory]: true }));
    } catch (error) {
      console.error("שגיאה: ", error);
    }
  };

  const updateQuantity = async (id, currentVal, fieldType, amountChange) => {
    const newValue = Math.max(0, currentVal + amountChange);
    try {
      await updateDoc(doc(db, 'groceries', id), { [fieldType]: newValue });
    } catch (error) {}
  };

  // פונקציה חדשה - מסמנת אם המוצר נלקח
  const toggleBought = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'groceries', id), { isBought: !currentStatus });
    } catch (error) {}
  };

  const deleteItem = async (id) => {
    if (window.confirm('האם למחוק את המוצר?')) {
      try { await deleteDoc(doc(db, 'groceries', id)); } catch (error) {}
    }
  };

  const getItemStatusClass = (item) => {
    if (item.isBought) return 'bought'; // אם נקנה - עיצוב אפור וקו מחיקה
    if (item.current === 0) return 'missing';
    if (item.current < item.target) return 'partial';
    return 'instock';
  };

  // מפרידים בין מה שפעיל למה שכבר בעגלה
  const activeItems = items.filter(item => !item.isBought);
  const boughtItems = items.filter(item => item.isBought);

  // מקבצים רק את המוצרים שעדיין חסרים (לא בעגלה)
  const groupedActiveItems = useMemo(() => {
    return activeItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [activeItems]);

  // רכיב פנימי כדי לא לשכפל קוד (מצייר שורה של מוצר)
  const renderItemCard = (item) => (
    <div key={item.id} className={`item-row ${getItemStatusClass(item)}`}>
      <span className="item-name">{item.name}</span>
      
      <div className="controls-wrapper">
        <div className="control-group">
          <span className="control-label">בבית</span>
          <div className="buttons-row">
            <button onClick={() => updateQuantity(item.id, item.current, 'current', 1)} className="qty-btn">+</button>
            <span className="qty-display">{item.current}</span>
            <button onClick={() => updateQuantity(item.id, item.current, 'current', -1)} className="qty-btn">-</button>
          </div>
        </div>
        <div className="divider"></div>
        <div className="control-group">
          <span className="control-label">צריך</span>
          <div className="buttons-row">
            <button onClick={() => updateQuantity(item.id, item.target, 'target', 1)} className="qty-btn">+</button>
            <span className="qty-display">{item.target}</span>
            <button onClick={() => updateQuantity(item.id, item.target, 'target', -1)} className="qty-btn">-</button>
          </div>
        </div>
      </div>

      <div className="action-btns">
        {/* כפתור הוי החדש */}
        <button 
          onClick={() => toggleBought(item.id, item.isBought)} 
          className={`check-btn ${item.isBought ? 'active-check' : ''}`}
        >
          ✓
        </button>
        {/* השארתי את הפח קטן למטה רק למקרה שרוצים למחוק לגמרי */}
        <button onClick={() => deleteItem(item.id)} className="delete-btn">🗑️</button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <h2 className="title">🛒 הרשימה של הבית</h2>
      
      <form onSubmit={addItem} className="add-form">
        <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="שם המוצר..." className="add-input" />
        <input type="text" list="categories-list" value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)} placeholder="קטגוריה..." className="add-input" />
        <datalist id="categories-list">
          {existingCategories.map(cat => <option key={cat} value={cat} />)}
        </datalist>
        <button type="submit" className="add-btn">הוסף</button>
      </form>

      {/* --- רשימת המוצרים שצריך לקנות --- */}
      <div className="categories-list">
        {Object.keys(groupedActiveItems).map(category => {
          const isExpanded = expandedCats[category];
          const categoryItems = groupedActiveItems[category];

          return (
            <div key={category} className="category-section">
              <button className="category-header" onClick={() => toggleCategory(category)}>
                <span>{category} ({categoryItems.length})</span>
                <span>{isExpanded ? '▼' : '◄'}</span>
              </button>
              
              {isExpanded && (
                <div className="category-items">
                  {categoryItems.map(item => renderItemCard(item))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- אזור העגלה (רק אם יש מוצרים שנקנו) --- */}
      {boughtItems.length > 0 && (
        <>
          <h3 className="cart-title">✅ כבר בעגלה ({boughtItems.length})</h3>
          <div className="category-items">
            {boughtItems.map(item => renderItemCard(item))}
          </div>
        </>
      )}
      
    </div>
  );
}

export default ShoppingList;
