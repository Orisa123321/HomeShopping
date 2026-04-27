import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, googleProvider } from './firebaseConfig'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [activeStore, setActiveStore] = useState('סופרמרקט');
  
  const [collapsedCats, setCollapsedCats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemTarget, setNewItemTarget] = useState(1);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    onSnapshot(query(collection(db, 'groceries'), orderBy('createdAt', 'desc')), (snap) => {
      setItems(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    // ניהול חנויות - מביא רק מה-DB ומסנן כפילויות
    onSnapshot(collection(db, 'stores'), (snap) => {
      const sData = snap.docs.map(d => ({id: d.id, ...d.data()}));
      if (sData.length === 0) {
        addDoc(collection(db, 'stores'), { name: 'סופרמרקט', createdAt: new Date() });
      } else {
        setStores(sData.sort((a, b) => a.createdAt - b.createdAt));
      }
    });
  }, [user]);

  const toggleCat = (catName) => {
    setCollapsedCats(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  const addItem = async () => {
    if (!newItemName.trim()) return;
    const finalCat = newItemCategory.trim() || 'כללי';
    try {
      await addDoc(collection(db, 'groceries'), {
        name: newItemName, category: finalCat, store: activeStore,
        current: 0, target: newItemTarget,
        note: '', isBought: false, createdAt: new Date(),
        priceHistory: [] // מערך חדש למחירים
      });
      setNewItemName(''); setNewItemCategory(''); setNewItemTarget(1);
    } catch (e) { console.error(e); }
  };

  const updateQuantity = async (id, val, field, diff) => {
    await updateDoc(doc(db, 'groceries', id), { [field]: Math.max(0, val + diff) });
  };

  // --- פיצ'ר חדש: שינוי קטגוריה ---
  const changeCategory = async (id, currentCat) => {
    const newCat = prompt("שנה קטגוריה ל:", currentCat);
    if (newCat && newCat.trim() !== "") {
      await updateDoc(doc(db, 'groceries', id), { category: newCat.trim() });
    }
  };

  // --- פיצ'ר חדש: תיעוד מחיר ---
  const logPrice = async (item) => {
    const price = prompt(`כמה עלה "${item.name}" ב${activeStore}?`);
    if (price && !isNaN(price)) {
      const newEntry = {
        price: parseFloat(price),
        store: activeStore,
        date: new Date().toLocaleDateString('he-IL')
      };
      const updatedHistory = [newEntry, ...(item.priceHistory || [])].slice(0, 5); // שומרים 5 אחרונים
      await updateDoc(doc(db, 'groceries', item.id), { priceHistory: updatedHistory });
    }
  };

  const renderItem = (item) => (
    <motion.div layout key={item.id} className="item-card">
      <div className="item-main">
        <div style={{display:'flex', alignItems:'center'}}>
          <span className="item-name">{item.name}</span>
          <button className="edit-cat-btn" onClick={() => changeCategory(item.id, item.category)}>✎</button>
        </div>
        
        <input 
          type="text" className="item-note" placeholder="הוסף הערה..." 
          defaultValue={item.note} onBlur={e => updateDoc(doc(db, 'groceries', item.id), { note: e.target.value })} 
        />

        {/* תצוגת מחיר אחרון */}
        <div className="price-tag" onClick={() => logPrice(item)}>
          {item.priceHistory && item.priceHistory.length > 0 
            ? `₪${item.priceHistory[0].price} (${item.priceHistory[0].date})` 
            : "➕ תעד מחיר"}
        </div>

        {/* היסטוריית מחירים (מוצגת רק אם יש) */}
        {item.priceHistory && item.priceHistory.length > 1 && (
          <div className="price-history-list">
            {item.priceHistory.slice(1, 3).map((h, index) => (
              <div key={index} className="history-item">
                <span>{h.store}</span>
                <span>₪{h.price}</span>
                <span>{h.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="qty-stack">
        <div className="qty-row">
          <span className="qty-label">בבית</span>
          <button onClick={() => updateQuantity(item.id, item.current, 'current', -1)} className="btn-mini"><i className="fas fa-minus"></i></button>
          <span className="qty-val">{item.current}</span>
          <button onClick={() => updateQuantity(item.id, item.current, 'current', 1)} className="btn-mini"><i className="fas fa-plus"></i></button>
        </div>
        <div className="qty-row">
          <span className="qty-label">צריך</span>
          <button onClick={() => updateQuantity(item.id, item.target, 'target', -1)} className="btn-mini"><i className="fas fa-minus"></i></button>
          <span className="qty-val">{item.target}</span>
          <button onClick={() => updateQuantity(item.id, item.target, 'target', 1)} className="btn-mini"><i className="fas fa-plus"></i></button>
        </div>
      </div>

      <div className="action-btns">
        <button onClick={() => updateDoc(doc(db, 'groceries', item.id), { isBought: !item.isBought })} className={`cart-btn ${item.isBought ? 'active' : ''}`}>
          <i className={item.isBought ? "fas fa-check" : "fas fa-shopping-basket"}></i>
        </button>
        <button onClick={() => window.confirm('למחוק?') && deleteDoc(doc(db, 'groceries', item.id))} style={{background:'none', border:'none', color:'#ccc', cursor:'pointer'}}>
          <i className="fas fa-trash-alt"></i>
        </button>
      </div>
    </motion.div>
  );

  const filtered = items.filter(i => (i.store === activeStore) && 
    (i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.category.toLowerCase().includes(searchTerm.toLowerCase())));

  const shoppingList = filtered.filter(i => i.current < i.target && !i.isBought);
  const inCart = filtered.filter(i => i.isBought);
  const inStock = filtered.filter(i => i.current >= i.target && !i.isBought);

  const groupItems = (list) => list.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  if (loadingAuth) return <div className="app-container">טוען...</div>;
  if (!user) return <div className="app-container" style={{textAlign:'center', marginTop:100}}><button className="store-tab active" onClick={() => signInWithPopup(auth, googleProvider)}>התחבר עם גוגל</button></div>;

  return (
    <div className="app-container">
      <header className="user-header">
        <img src={user.photoURL} className="user-avatar" alt="p" referrerPolicy="no-referrer" />
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} style={{background:'none', border:'none', fontSize:18}}>{theme === 'light' ? '🌙' : '☀️'}</button>
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={{background:'none', border:'none', fontSize:18}}>⚙️</button>
          <button onClick={() => signOut(auth)} style={{background:'none', border:'none', color:'var(--text-light)', fontSize:12, fontWeight:'bold'}}>התנתק</button>
        </div>
      </header>

      <nav className="store-tabs">
        {stores.map(s => (
          <button key={s.id} className={`store-tab ${activeStore === s.name ? 'active' : ''}`} onClick={() => setActiveStore(s.name)}>{s.name}</button>
        ))}
        <button className="store-tab" onClick={() => {const n = prompt("חנות חדשה:"); if (n) addDoc(collection(db, 'stores'), { name: n, createdAt: new Date() });}}>+</button>
      </nav>

      <div className="search-bar">
        <input className="f-input" style={{width:'100%', boxSizing:'border-box', marginBottom:10}} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={`🔍 חפש ב${activeStore}...`} />
      </div>

      <section>
        <h2 style={{fontSize:22, marginBottom:10}}>📝 צריך לקנות ({shoppingList.length})</h2>
        {Object.entries(groupItems(shoppingList)).map(([cat, list]) => (
          <div key={cat}>
            <div className="category-header" onClick={() => toggleCat(`shop_${cat}`)}>
              <span>{cat} ({list.length})</span>
              <i className={`fas fa-chevron-${collapsedCats[`shop_${cat}`] ? 'left' : 'down'}`}></i>
            </div>
            {!collapsedCats[`shop_${cat}`] && <AnimatePresence>{list.map(renderItem)}</AnimatePresence>}
          </div>
        ))}

        {inCart.length > 0 && (
          <>
            <h2 style={{fontSize:22, marginTop:30}}>🛒 בעגלה ({inCart.length})</h2>
            <AnimatePresence>{inCart.map(renderItem)}</AnimatePresence>
            <button className="store-tab active" style={{width:'100%', marginTop:10, borderRadius:12}} onClick={() => inCart.forEach(i => updateDoc(doc(db, 'groceries', i.id), { current: i.target, isBought: false }))}>עדכן מלאי ✅</button>
          </>
        )}

        <h2 style={{fontSize:22, marginTop:40, opacity:0.4}}>📦 במזווה</h2>
        {Object.entries(groupItems(inStock)).map(([cat, list]) => (
          <div key={cat} style={{opacity:0.7}}>
            <div className="category-header" onClick={() => toggleCat(`pantry_${cat}`)}>
              <span>{cat} ({list.length})</span>
              <i className={`fas fa-chevron-${collapsedCats[`pantry_${cat}`] ? 'left' : 'down'}`}></i>
            </div>
            {!collapsedCats[`pantry_${cat}`] && list.map(renderItem)}
          </div>
        ))}
      </section>

      <form className="floating-form" onSubmit={e => { e.preventDefault(); addItem(); }}>
        <input className="f-input" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="מוצר..." />
        <input className="f-input" style={{flex:0.7}} value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} placeholder="קטגוריה" />
        <input className="f-input" style={{flex:0.4}} type="number" value={newItemTarget} onChange={e => setNewItemTarget(Number(e.target.value))} />
        <button className="f-btn" type="submit"><i className="fas fa-plus"></i></button>
      </form>
    </div>
  );
}

export default App;
