import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebaseConfig'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import './App.css';

function ShoppingList() {
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [expandedCats, setExpandedCats] = useState({ pantry_all: false });

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
        current: 1,
        target: 1,
        isBought: false,
        createdAt: new Date()
      });
      setNewItemName('');
      setNewItemCategory('');
      setExpandedCats(prev => ({ ...prev, [finalCategory]: true }));
    } catch (error) {
      console.error("שגיאה בהוספה:", error);
    }
  };

  const updateQuantity = async (id, currentVal, fieldType, amountChange) => {
    const newValue = Math.max(0, currentVal + amountChange);
    try {
      await updateDoc(doc(db, 'groceries', id), { [fieldType]: newValue });
    } catch (error) {}
  };

  const toggleInCart = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'groceries', id), { isBought: !currentStatus });
    } catch (error) {}
  };

  const completeShopping = async () => {
    const itemsInCart = items.filter(item => item.isBought);
    if (itemsInCart.length === 0) return;

    if (window.confirm(`לעדכן את המלאי בבית עבור ${itemsInCart.length} מוצרים שנקנו?`)) {
      try {
        await Promise.all(
          itemsInCart.map(item => 
            updateDoc(doc(db, 'groceries', item.id), {
              current: item.target,
              isBought: false
            })
          )
        );
      } catch (error) {}
    }
  };

  const deleteItem = async (id) => {
    if (window.confirm('למחוק את המוצר מהמערכת לצמיתות?')) {
      try { await deleteDoc(doc(db, 'groceries', id)); } catch (error) {}
    }
  };

  // --- לוגיקת המיון והקיבוץ ---
  
  const shoppingListItems = items.filter(item => item.current < item.target && !item.isBought);
  const inCartItems = items.filter(item => item.isBought);
  const inStockItems = items.filter(item => item.current >= item.target && !item.isBought);

  // קיבוץ עבור רשימת הקניות
  const groupedShopping = useMemo(() => {
    return shoppingListItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [shoppingListItems]);

  // קיבוץ עבור המזווה (המלאי הקיים)
  const groupedInStock = useMemo(() => {
    return inStockItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [inStockItems]);

  const renderItemCard = (item) => (
    <div key={item.id} className={`item-row ${item.isBought ? 'bought' : (item.current === 0 ? 'missing' : 'partial')}`}>
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
        <button 
          onClick={() => toggleInCart(item.id, item.isBought)} 
          className={`check-btn ${item.isBought ? 'active-check' : ''}`}
        >
          {item.isBought ? '✓' : '🛒'}
        </button>
        <button onClick={() => deleteItem(item.id)} className="delete-btn">🗑️</button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <h2 className="title">🏠 המזווה החכם שלי</h2>
      
      <form onSubmit={addItem} className="add-form">
        <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="מוצר חדש למזווה..." className="add-input" />
        <input type="text" list="categories-list" value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)} placeholder="קטגוריה..." className="add-input" />
        <datalist id="categories-list">
          {existingCategories.map(cat => <option key={cat} value={cat} />)}
        </datalist>
        <button type="submit" className="add-btn">הוסף למלאי</button>
      </form>

      {/* --- צריך לקנות --- */}
      <h3 className="section-subtitle">📝 צריך לקנות</h3>
      <div className="categories-list">
        {Object.keys(groupedShopping).map(category => {
          const isExpanded = expandedCats[category] !== false;
          return (
            <div key={category} className="category-section">
              <button className="category-header" onClick={() => toggleCategory(category)}>
                <span>{category} ({groupedShopping[category].length})</span>
                <span>{isExpanded ? '▼' : '◄'}</span>
              </button>
              {isExpanded && <div className="category-items">{groupedShopping[category].map(item => renderItemCard(item))}</div>}
            </div>
          );
        })}
      </div>

      {/* --- העגלה בסופר --- */}
      {inCartItems.length > 0 && (
        <>
          <div className="cart-header">
            <h3 className="cart-title">🛒 כבר בעגלה ({inCartItems.length})</h3>
            <button onClick={completeShopping} className="empty-cart-btn">עדכן מלאי ✅</button>
          </div>
          <div className="category-items">{inCartItems.map(item => renderItemCard(item))}</div>
        </>
      )}

      {/* --- המזווה (מלאי קיים) בחלוקה לקטגוריות --- */}
      <div className="pantry-section">
        <button className="category-header pantry-toggle" onClick={() => toggleCategory('pantry_all')}>
          <span>📦 מוצרים שבמלאי ({inStockItems.length})</span>
          <span>{expandedCats['pantry_all'] ? '▼' : '◄'}</span>
        </button>
        
        {expandedCats['pantry_all'] && (
          <div className="pantry-content">
            {Object.keys(groupedInStock).map(category => (
              <div key={`pantry-${category}`} className="pantry-sub-category">
                <h4 className="pantry-sub-title">{category}</h4>
                <div className="category-items">
                  {groupedInStock[category].map(item => (
                    <div key={item.id} className="item-row instock">
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
                      </div>
                      <button onClick={() => deleteItem(item.id)} className="delete-btn">🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ShoppingList;
