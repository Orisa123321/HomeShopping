import React, { useState, useMemo } from 'react';
import './App.css'; 


function ShoppingList() {
  // רשימת המוצרים עכשיו כוללת גם "קטגוריה"
  const [items, setItems] = useState([
    { id: 1, name: 'חלב', category: 'מוצרי חלב', current: 1, target: 3 },
    { id: 2, name: 'גבינה צהובה', category: 'מוצרי חלב', current: 0, target: 1 },
    { id: 3, name: 'לחם אחיד', category: 'מאפייה', current: 0, target: 1 },
    { id: 4, name: 'פיתות', category: 'מאפייה', current: 5, target: 10 },
    { id: 5, name: 'ביצים', category: 'כללי', current: 12, target: 12 },
  ]);
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  
  // ניהול מצב הפתיחה/סגירה של הקטגוריות (ריק = הכל סגור כברירת מחדל)
  const [expandedCats, setExpandedCats] = useState({});

  // חילוץ כל הקטגוריות הקיימות כדי להציע אותן בהשלמה אוטומטית
  const existingCategories = useMemo(() => {
    const cats = items.map(item => item.category);
    return [...new Set(cats)]; // מחזיר רשימה ייחודית ללא כפילויות
  }, [items]);

  // פונקציה לפתיחה/סגירה של קטגוריה ספציפית
  const toggleCategory = (category) => {
    setExpandedCats(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const updateQuantity = (id, amount, fieldType) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newValue = Math.max(0, item[fieldType] + amount);
        return { ...item, [fieldType]: newValue };
      }
      return item;
    }));
  };

  const addItem = (e) => {
    e.preventDefault();
    if (newItemName.trim() === '') return;
    
    // אם המשתמש לא הזין קטגוריה, נכניס תחת "כללי"
    const finalCategory = newItemCategory.trim() || 'כללי';

    const newItem = {
      id: Date.now(),
      name: newItemName,
      category: finalCategory,
      current: 0,
      target: 1
    };
    
    setItems([...items, newItem]);
    setNewItemName('');
    
    // פותח אוטומטית את הקטגוריה שאליה הוספנו הרגע את המוצר
    setExpandedCats(prev => ({ ...prev, [finalCategory]: true }));
  };

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  // פונקציה שקובעת את מצב הצבע של המוצר
  const getItemStatusClass = (item) => {
    if (item.current === 0) return 'missing'; // חסר לגמרי -> אדום
    if (item.current < item.target) return 'partial'; // יש אבל לא מספיק -> צהוב
    return 'instock'; // יש מספיק (שווה או גדול מהיעד) -> ירוק
  };

  // קיבוץ המוצרים לפי קטגוריות
  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <div className="app-container">
      <h2 className="title">🛒 הרשימה של הבית</h2>
      
      {/* טופס הוספת מוצר */}
      <form onSubmit={addItem} className="add-form">
        <input 
          type="text" 
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="שם המוצר..."
          className="add-input"
        />
        
        {/* שדה הזנת/בחירת קטגוריה עם datalist להשלמה אוטומטית */}
        <input 
          type="text" 
          list="categories-list"
          value={newItemCategory}
          onChange={(e) => setNewItemCategory(e.target.value)}
          placeholder="קטגוריה (אופציונלי)"
          className="add-input"
        />
        <datalist id="categories-list">
          {existingCategories.map(cat => (
            <option key={cat} value={cat} />
          ))}
        </datalist>

        <button type="submit" className="add-btn">הוסף</button>

        {/* טקסט ההסבר שהוספנו */}
        <div className="help-text">
          💡 <strong>טיפ:</strong> כדי ליצור קטגוריה חדשה, פשוט הקלד את השם שלה בתיבת הקטגוריה.
        </div>
      </form>
      
      {/* תצוגת הקטגוריות והמוצרים */}
      <div className="categories-list">
        {Object.keys(groupedItems).map(category => {
          const isExpanded = expandedCats[category];
          const categoryItems = groupedItems[category];

          return (
            <div key={category} className="category-section">
              {/* כפתור פתיחה/סגירה לקטגוריה */}
              <button 
                className="category-header" 
                onClick={() => toggleCategory(category)}
              >
                <span>{category} ({categoryItems.length})</span>
                <span>{isExpanded ? '▼' : '◄'}</span>
              </button>
              
              {/* רשימת המוצרים בקטגוריה (מוצגת רק אם הקטגוריה פתוחה) */}
              {isExpanded && (
                <div className="category-items">
                  {categoryItems.map(item => (
                    <div 
                      key={item.id} 
                      className={`item-row ${getItemStatusClass(item)}`}
                    >
                      <span className="item-name">{item.name}</span>
                      
                      <div className="controls-wrapper">
                        {/* כמות בבית */}
                        <div className="control-group">
                          <span className="control-label">בבית:</span>
                          <div className="buttons-row">
                            <button type="button" onClick={() => updateQuantity(item.id, 1, 'current')} className="qty-btn">+</button>
                            <span className="qty-display">{item.current}</span>
                            <button type="button" onClick={() => updateQuantity(item.id, -1, 'current')} className="qty-btn">-</button>
                          </div>
                        </div>

                        <div className="divider"></div>

                        {/* כמות רצויה */}
                        <div className="control-group">
                          <span className="control-label">צריך:</span>
                          <div className="buttons-row">
                            <button type="button" onClick={() => updateQuantity(item.id, 1, 'target')} className="qty-btn">+</button>
                            <span className="qty-display">{item.target}</span>
                            <button type="button" onClick={() => updateQuantity(item.id, -1, 'target')} className="qty-btn">-</button>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => deleteItem(item.id)}
                        className="delete-btn"
                        title="מחק מוצר"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ShoppingList;