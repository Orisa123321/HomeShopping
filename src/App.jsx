import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, googleProvider } from './firebaseConfig'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
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
  
  // ניהול קטגוריות סגורות
  const [collapsedCats, setCollapsedCats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // טופס
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
    onSnapshot(collection(db, 'stores'), (snap) => {
      const sData = snap.docs.map(d => ({id: d.id, ...d.data()}));
      if (sData.length === 0) {
        addDoc(collection(db, 'stores'), { name: 'סופרמרקט', createdAt: new Date() });
      } else {
        setStores(sData.sort((a, b) => a.createdAt - b.createdAt));
      }
    });
  }, [user]);

  const toggleCat = (catId) => {
    setCollapsedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const addItem = async (e) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) return;
    const finalCat = newItemCategory.trim() || 'כללי';
    try {
      await addDoc(collection(db, 'groceries'), {
        name: newItemName, category: finalCat, store: activeStore,
        current: 0, target: newItemTarget,
        note: '', isBought: false, createdAt: new Date()
      });
      setNewItemName(''); setNewItemCategory(''); setNewItemTarget(1);
    } catch (e) { console.error(e); }
  };

  const updateQuantity = async (id, val, field, diff) => {
    await updateDoc(doc(db, 'groceries', id), { [field]: Math.max(0, val + diff) });
  };

  const renderItem = (item) => (
    <motion.div layout initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} key={item.id} className="item-card">
      <div className="item-main">
        <span className="item-name">{item.name}</span>
        <input 
          type="text" className="item-note" placeholder="הוסף הערה..." 
          defaultValue={item.note} onBlur={e => updateDoc(doc(db, 'groceries', item.id), { note: e.target.value })} 
        />
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

      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <button onClick={() => updateDoc(doc(db, 'groceries', item.id), { isBought: !item.isBought })} className={`cart-btn ${item.isBought ? 'active' : ''}`}>
          <i className={item.isBought ? "fas fa-check" : "fas fa-shopping-basket"}></i>
        </button>
        <button onClick={() => window.confirm('למחוק?') && deleteDoc(doc(db, 'groceries', item.id))} style={{background:'none', border:'none', color:'#ccc', cursor:'pointer', padding:5}}>
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
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} style={{background:'none', border:'none', fontSize:18, cursor:'pointer'}}>{theme === 'light' ? '🌙' : '☀️'}</button>
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={{background:'none', border:'none', fontSize:18, cursor:'pointer'}}>⚙️</button>
          <button onClick={() => signOut(auth)} style={{background:'none', border:'none', color:'var(--text-light)', fontSize:12, fontWeight:'bold', cursor:'pointer'}}>התנתק</button>
        </div>
      </header>

      <nav className="store-tabs">
        {stores.map(s => (
          <button key={s.id} className={`store-tab ${activeStore === s.name ? 'active' : ''}`} onClick={() => setActiveStore(s.name)}>{s.name}</button>
        ))}
        <button className="store-tab" onClick={() => {const n = prompt("חנות חדשה:"); if (n) addDoc(collection(db, 'stores'), { name: n, createdAt: new Date() });}}>+</button>
      </nav>

      {isSettingsOpen && (
        <div className="item-card" style={{flexDirection:'column', alignItems:'flex-start'}}>
          <h4 style={{margin:'0 0 10px'}}>⚙️ ניהול חנויות</h4>
          {stores.map(s => <div key={s.id} style={{display:'flex', justifyContent:'space-between', width:'100%', marginBottom:8}}><span>{s.name}</span>{s.name !== 'סופרמרקט' && <button onClick={() => deleteDoc(doc(db, 'stores', s.id))} style={{color:'red', border:'none', background:'none', cursor:'pointer'}}>מחק</button>}</div>)}
        </div>
      )}

      <input className="f-input" style={{width:'100%', boxSizing:'border-box', marginBottom:15}} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={`🔍 חפש ב${activeStore}...`} />

      <section>
        <h2 style={{fontSize:20, margin:'20px 0 10px'}}>📝 צריך לקנות ({shoppingList.length})</h2>
        {Object.entries(groupItems(shoppingList)).map(([cat, list]) => {
          const catId = `shop_${cat}`;
          return (
            <div key={cat}>
              <div className="category-header" onClick={() => toggleCat(catId)}>
                <span>{cat} ({list.length})</span>
                <i className={`fas fa-chevron-${collapsedCats[catId] ? 'left' : 'down'}`}></i>
              </div>
              <AnimatePresence>
                {!collapsedCats[catId] && (
                  <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} style={{overflow:'hidden'}}>
                    {list.map(renderItem)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {inCart.length > 0 && (
          <div style={{marginTop:30}}>
            <h2 style={{fontSize:20, marginBottom:10}}>🛒 בעגלה ({inCart.length})</h2>
            <AnimatePresence>{inCart.map(renderItem)}</AnimatePresence>
            <button className="store-tab active" style={{width:'100%', marginTop:10, borderRadius:12, padding:12}} onClick={() => inCart.forEach(i => updateDoc(doc(db, 'groceries', i.id), { current: i.target, isBought: false }))}>עדכן מלאי סופי ✅</button>
          </div>
        )}

        <h2 style={{fontSize:20, marginTop:40, opacity:0.4, marginBottom:10}}>📦 במזווה ({inStock.length})</h2>
        {Object.entries(groupItems(inStock)).map(([cat, list]) => {
          const catId = `pantry_${cat}`;
          return (
            <div key={cat}>
              <div className="category-header" onClick={() => toggleCat(catId)}>
                <span>{cat} ({list.length})</span>
                <i className={`fas fa-chevron-${collapsedCats[catId] ? 'left' : 'down'}`}></i>
              </div>
              <AnimatePresence>
                {!collapsedCats[catId] && (
                  <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} style={{overflow:'hidden', opacity:0.7}}>
                    {list.map(renderItem)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </section>

      {/* טופס הוספה צף - יישור סופי */}
      <form className="floating-form" onSubmit={addItem}>
        <input className="f-input" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="מה להוסיף?" />
        <input className="f-input" style={{flex:0.6}} value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} placeholder="קטגוריה" />
        <input className="f-input qty-add-input" type="number" value={newItemTarget} onChange={e => setNewItemTarget(Number(e.target.value))} />
        <button className="f-btn" type="submit"><i className="fas fa-plus"></i></button>
      </form>
    </div>
  );
}

export default App;