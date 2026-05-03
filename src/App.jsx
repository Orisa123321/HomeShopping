import React, { useState, useEffect, useMemo } from "react";
import { db, auth, googleProvider } from "./firebaseConfig";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  orderBy,
  getDoc,
  where,
} from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Html5QrcodeScanner } from "html5-qrcode";
import "./App.css";

const getExpStatus = (dateStr) => {
  if (!dateStr) return "";
  const diffDays = Math.ceil(
    (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "expired";
  if (diffDays <= 3) return "danger";
  if (diffDays <= 7) return "warning";
  return "";
};
const getExpText = (dateStr) => {
  if (!dateStr) return "";
  const diffDays = Math.ceil(
    (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "פג תוקף!";
  if (diffDays === 0) return "פג היום!";
  if (diffDays <= 3) return `נותרו ${diffDays} ימים`;
  return "";
};

const DAYS_HEB = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // זיהוי הרשימה המשותפת
  const [sharedListId, setSharedListId] = useState(null);

  const [currentView, setCurrentView] = useState("shopping");
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [activeStore, setActiveStore] = useState("סופרמרקט");

  const [categoryOrder, setCategoryOrder] = useState([]);
  const [collapsedCats, setCollapsedCats] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSmartSplitOpen, setIsSmartSplitOpen] = useState(false);

  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemTarget, setNewItemTarget] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");

  // אתחול הגדרות PWA (אפליקציה למכשיר) ו-Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
    }
  };

  // אתחול משתמש מחובר
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // שלב 1: שליפת ה-ID של הרשימה שהמשתמש שייך אליה
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().listId) {
        setSharedListId(docSnap.data().listId);
      } else {
        // אם אין לו רשימה, הרשימה היא ה-UID שלו כברירת מחדל
        setSharedListId(user.uid);
        setDoc(userRef, { listId: user.uid }, { merge: true });
      }
    });
    return () => unsub();
  }, [user]);

  // מנגנון נוכחות (Multiplayer) - רק מי שבאותה רשימה!
  useEffect(() => {
    if (!user || !sharedListId) return;
    const presenceRef = doc(db, "presence", user.uid);
    const updatePresence = async () => {
      await setDoc(
        presenceRef,
        {
          uid: user.uid,
          name: user.displayName,
          photoURL: user.photoURL,
          lastActive: Date.now(),
          listId: sharedListId,
        },
        { merge: true },
      );
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000);

    const qPresence = query(
      collection(db, "presence"),
      where("listId", "==", sharedListId),
    );
    const unsubPresence = onSnapshot(qPresence, (snap) => {
      const now = Date.now();
      const usersOnline = [];
      snap.forEach((d) => {
        if (now - d.data().lastActive < 120000) usersOnline.push(d.data());
      });
      setActiveUsers(usersOnline);
    });

    return () => {
      clearInterval(interval);
      unsubPresence();
    };
  }, [user, sharedListId]);

  // שלב 2: שליפת כל הנתונים לפי ה-sharedListId (הקוד המשותף)
  useEffect(() => {
    if (!user || !sharedListId) return;

    const qGroceries = query(
      collection(db, "groceries"),
      where("listId", "==", sharedListId),
    );
    const unsubGroceries = onSnapshot(qGroceries, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(
        data.sort(
          (a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis() || 0,
        ),
      );
    });

    const qStores = query(
      collection(db, "stores"),
      where("listId", "==", sharedListId),
    );
    const unsubStores = onSnapshot(qStores, (snap) => {
      const sData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const hasSupermarket = sData.some((s) => s.name === "סופרמרקט");
      if (!hasSupermarket && sData.length === 0) {
        addDoc(collection(db, "stores"), {
          name: "סופרמרקט",
          createdAt: new Date(),
          listId: sharedListId,
        });
      } else
        setStores(
          sData.sort(
            (a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis() || 0,
          ),
        );
    });

    const unsubSettings = onSnapshot(
      doc(db, "settings", `category_order_${sharedListId}`),
      (docSnap) => {
        if (docSnap.exists()) setCategoryOrder(docSnap.data().order || []);
      },
    );

    const qRecipes = query(
      collection(db, "recipes"),
      where("listId", "==", sharedListId),
    );
    const unsubRecipes = onSnapshot(qRecipes, (snap) =>
      setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    return () => {
      unsubGroceries();
      unsubStores();
      unsubSettings();
      unsubRecipes();
    };
  }, [user, sharedListId]);

  // אוטומציה שבועית
  useEffect(() => {
    if (items.length === 0) return;
    const today = new Date();
    const todayDay = today.getDay();
    const todayStr = today.toDateString();
    items.forEach(async (item) => {
      if (
        item.recurringDay !== undefined &&
        item.recurringDay === todayDay &&
        item.lastAutoAdd !== todayStr
      ) {
        await updateDoc(doc(db, "groceries", item.id), {
          target: item.current + 1,
          isBought: false,
          lastAutoAdd: todayStr,
        });
      }
    });
  }, [items.length]);

  const joinFamilyList = async () => {
    if (!joinCodeInput.trim() || joinCodeInput.trim() === user.uid)
      return alert("קוד לא תקין או שזה הקוד שלך.");
    await setDoc(
      doc(db, "users", user.uid),
      { listId: joinCodeInput.trim() },
      { merge: true },
    );
    alert("הצטרפת בהצלחה לרשימה המשותפת!");
    setJoinCodeInput("");
  };

  const leaveFamilyList = async () => {
    if (window.confirm("להתנתק מהרשימה המשותפת ולחזור לרשימה הפרטית שלך?")) {
      await setDoc(
        doc(db, "users", user.uid),
        { listId: user.uid },
        { merge: true },
      );
    }
  };

  const toggleRecurring = async (item) => {
    const day = prompt(
      "באיזה יום להוסיף אוטומטית? (0=ראשון, 1=שני... 6=שבת. השאר ריק לביטול)",
    );
    if (day === null) return;
    if (day.trim() === "")
      await updateDoc(doc(db, "groceries", item.id), { recurringDay: null });
    else {
      const d = parseInt(day);
      if (d >= 0 && d <= 6) {
        await updateDoc(doc(db, "groceries", item.id), { recurringDay: d });
        alert(`מעולה. המוצר יתווסף לרשימה בכל יום ${DAYS_HEB[d]}.`);
      } else alert("נא להזין מספר בין 0 ל-6.");
    }
  };

  useEffect(() => {
    if (isScannerOpen) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { qrbox: { width: 250, height: 250 }, fps: 10 },
        false,
      );
      scanner.render(
        async (text) => {
          scanner.clear();
          setIsScannerOpen(false);
          handleBarcodeScanned(text);
        },
        (err) => {},
      );
      return () => {
        scanner.clear().catch((e) => console.log(e));
      };
    }
  }, [isScannerOpen]);

  const handleBarcodeScanned = async (barcode) => {
    const docRef = doc(db, "barcodes", barcode);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setNewItemName(data.name);
      setNewItemCategory(data.category);
      alert(`זוהה: ${data.name}! לחץ פלוס כדי להוסיף.`);
    } else {
      const newName = prompt(`ברקוד חדש זוהה (${barcode}). מה שם המוצר?`);
      if (newName && newName.trim()) {
        const catObj = catalog.find((c) => c.name === newName.trim());
        const newCat = prompt(
          "איזו קטגוריה?",
          catObj ? catObj.category : "כללי",
        );
        await setDoc(docRef, {
          name: newName.trim(),
          category: newCat || "כללי",
        });
        setNewItemName(newName.trim());
        setNewItemCategory(newCat || "כללי");
      }
    }
  };

  const uniqueStores = useMemo(
    () => [...new Set(stores.map((s) => s.name.trim()))],
    [stores],
  );

  const catalog = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      if (!map.has(i.name.trim())) map.set(i.name.trim(), i.category);
    });
    return Array.from(map.entries()).map(([name, category]) => ({
      name,
      category,
    }));
  }, [items]);

  const activeSuggestions = useMemo(() => {
    if (!newItemName.trim() || !showSuggestions) return [];
    return catalog
      .filter(
        (c) =>
          c.name.toLowerCase().includes(newItemName.toLowerCase()) &&
          c.name !== newItemName.trim(),
      )
      .slice(0, 4);
  }, [newItemName, catalog, showSuggestions]);

  const toggleCat = (catId) =>
    setCollapsedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));

  const addItem = async (e) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) return;
    const finalCat = newItemCategory.trim() || "כללי";
    try {
      await addDoc(collection(db, "groceries"), {
        name: newItemName.trim(),
        category: finalCat,
        store: activeStore,
        current: 0,
        target: newItemTarget,
        note: "",
        isBought: false,
        createdAt: new Date(),
        priceHistory: [],
        expirationDate: "",
        listId: sharedListId, // מוסיף את מזהה המשפחה למוצר
      });
      setNewItemName("");
      setNewItemCategory("");
      setNewItemTarget(1);
      setShowSuggestions(false);
    } catch (e) {
      console.error(e);
    }
  };

  const updateQuantity = async (id, val, field, diff) =>
    await updateDoc(doc(db, "groceries", id), {
      [field]: Math.max(0, val + diff),
    });
  const changeCategory = async (id, currentCat) => {
    const newCat = prompt("לאיזו קטגוריה להעביר?", currentCat);
    if (newCat && newCat.trim() !== "")
      await updateDoc(doc(db, "groceries", id), { category: newCat.trim() });
  };

  const logPrice = async (item) => {
    const priceStr = prompt(`כמה עלה "${item.name}"? (מספר)`);
    if (!priceStr || isNaN(priceStr)) return;
    const specificStore = prompt(`באיזו רשת?`, activeStore);
    if (!specificStore) return;
    const newEntry = {
      price: parseFloat(priceStr),
      store: specificStore.trim(),
      date: new Date().toLocaleDateString("he-IL"),
      timestamp: Date.now(),
    };
    const updatedHistory = [newEntry, ...(item.priceHistory || [])].slice(
      0,
      10,
    );
    await updateDoc(doc(db, "groceries", item.id), {
      priceHistory: updatedHistory,
    });
  };

  const deletePriceEntry = async (item, indexToDelete) => {
    if (window.confirm("למחוק את המחיר?")) {
      const updatedHistory = item.priceHistory.filter(
        (_, index) => index !== indexToDelete,
      );
      await updateDoc(doc(db, "groceries", item.id), {
        priceHistory: updatedHistory,
      });
    }
  };

  const createNewRecipe = async () => {
    const name = prompt("שם הארוחה/מתכון:");
    if (name && name.trim())
      await addDoc(collection(db, "recipes"), {
        name: name.trim(),
        ingredients: [],
        createdAt: new Date(),
        listId: sharedListId,
      });
  };

  const addIngredientToRecipe = async (recipeId, currentIngredients) => {
    const ingredient = prompt("איזה מצרך להוסיף?");
    if (ingredient && ingredient.trim())
      await updateDoc(doc(db, "recipes", recipeId), {
        ingredients: [...currentIngredients, ingredient.trim()],
      });
  };

  const checkRecipeStatus = (recipe) => {
    if (!recipe.ingredients || recipe.ingredients.length === 0)
      return { status: "empty", missing: [] };
    const missing = [];
    recipe.ingredients.forEach((ing) => {
      const hasItem = items.some((i) => i.name === ing && i.current > 0);
      if (!hasItem) missing.push(ing);
    });
    if (missing.length === 0) return { status: "ready", missing };
    if (missing.length <= 2) return { status: "almost", missing };
    return { status: "missing", missing };
  };

  const pushMissingToCart = async (missingIngs, recipeName) => {
    if (
      !window.confirm(
        `להוסיף את המצרכים החסרים לרשימה? (${missingIngs.join(", ")})`,
      )
    )
      return;
    for (const ing of missingIngs) {
      const existingItem = items.find(
        (i) => i.store === activeStore && i.name === ing,
      );
      if (existingItem) {
        await updateDoc(doc(db, "groceries", existingItem.id), {
          target: existingItem.current + 1,
          isBought: false,
        });
      } else {
        const catObj = catalog.find((c) => c.name === ing);
        const cat = catObj ? catObj.category : "כללי";
        await addDoc(collection(db, "groceries"), {
          name: ing,
          category: cat,
          store: activeStore,
          current: 0,
          target: 1,
          note: `חסר עבור ${recipeName}`,
          isBought: false,
          createdAt: new Date(),
          priceHistory: [],
          expirationDate: "",
          listId: sharedListId,
        });
      }
    }
    alert("המצרכים החסרים נוספו לרשימה בהצלחה!");
    setCurrentView("shopping");
  };

  const pushRecipeToCart = async (recipe) => {
    if (!window.confirm(`להוסיף הכל לרשימת הקניות של ${activeStore}?`)) return;
    for (const ing of recipe.ingredients) {
      const existingItem = items.find(
        (i) => i.store === activeStore && i.name === ing,
      );
      if (existingItem) {
        if (existingItem.target <= existingItem.current)
          await updateDoc(doc(db, "groceries", existingItem.id), {
            target: existingItem.current + 1,
            isBought: false,
          });
      } else {
        const catObj = catalog.find((c) => c.name === ing);
        const cat = catObj ? catObj.category : "כללי";
        await addDoc(collection(db, "groceries"), {
          name: ing,
          category: cat,
          store: activeStore,
          current: 0,
          target: 1,
          note: `עבור ${recipe.name}`,
          isBought: false,
          createdAt: new Date(),
          priceHistory: [],
          expirationDate: "",
          listId: sharedListId,
        });
      }
    }
    alert("המוצרים נוספו לרשימה!");
    setCurrentView("shopping");
  };

  const renderItem = (item) => {
    const expStatus = getExpStatus(item.expirationDate);
    const expText = getExpText(item.expirationDate);

    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        key={item.id}
        className="item-card"
      >
        {item.recurringDay !== undefined && item.recurringDay !== null && (
          <div className="recurring-badge">
            כל יום {DAYS_HEB[item.recurringDay]}
          </div>
        )}
        <div className="item-main">
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              className="item-name"
              style={{
                marginTop:
                  item.recurringDay !== undefined && item.recurringDay !== null
                    ? "15px"
                    : "0",
              }}
            >
              {item.name}
            </span>
            <button
              className="edit-cat-btn"
              onClick={() => changeCategory(item.id, item.category)}
            >
              ✎
            </button>
            <button
              className="edit-cat-btn"
              onClick={() => toggleRecurring(item)}
              title="הגדרת מחזוריות"
            >
              <i className="fas fa-sync"></i>
            </button>
          </div>
          <input
            type="text"
            className="item-note"
            placeholder="הוסף הערה..."
            defaultValue={item.note}
            onBlur={(e) =>
              updateDoc(doc(db, "groceries", item.id), { note: e.target.value })
            }
          />

          <div className="item-actions-row">
            <button className="add-price-btn" onClick={() => logPrice(item)}>
              + תעד מחיר
            </button>
            <div className="exp-wrap">
              <input
                type="date"
                className={`exp-date-input ${expStatus}`}
                value={item.expirationDate || ""}
                onChange={(e) =>
                  updateDoc(doc(db, "groceries", item.id), {
                    expirationDate: e.target.value,
                  })
                }
              />
              {expStatus && <span className="exp-alert-text">{expText}</span>}
            </div>
          </div>

          {item.priceHistory && item.priceHistory.length > 0 && (
            <div className="price-history-container">
              {item.priceHistory.map((h, index) => (
                <div key={index} className="history-item">
                  <span className="history-store">{h.store}</span>
                  <span className="history-price">₪{h.price}</span>
                  <span className="history-date">{h.date}</span>
                  <button
                    className="delete-price-btn"
                    onClick={() => deletePriceEntry(item, index)}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="controls-wrap">
          <div className="qty-stack">
            <div className="qty-row">
              <span className="qty-label">בבית</span>
              <button
                onClick={() =>
                  updateQuantity(item.id, item.current, "current", -1)
                }
                className="btn-mini"
              >
                <i className="fas fa-minus"></i>
              </button>
              <span className="qty-val">{item.current}</span>
              <button
                onClick={() =>
                  updateQuantity(item.id, item.current, "current", 1)
                }
                className="btn-mini"
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
            <div className="qty-row">
              <span className="qty-label">צריך</span>
              <button
                onClick={() =>
                  updateQuantity(item.id, item.target, "target", -1)
                }
                className="btn-mini"
              >
                <i className="fas fa-minus"></i>
              </button>
              <span className="qty-val">{item.target}</span>
              <button
                onClick={() =>
                  updateQuantity(item.id, item.target, "target", 1)
                }
                className="btn-mini"
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>
          <button
            onClick={() =>
              updateDoc(doc(db, "groceries", item.id), {
                isBought: !item.isBought,
              })
            }
            className={`cart-btn ${item.isBought ? "active" : ""}`}
          >
            <i
              className={
                item.isBought ? "fas fa-check" : "fas fa-shopping-basket"
              }
            ></i>
          </button>
          <button
            onClick={() =>
              window.confirm("למחוק?") &&
              deleteDoc(doc(db, "groceries", item.id))
            }
            style={{
              background: "none",
              border: "none",
              color: "#ccc",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </motion.div>
    );
  };

  const filtered = items.filter(
    (i) =>
      i.store === activeStore &&
      (i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.category.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const shoppingList = filtered.filter(
    (i) => i.current < i.target && !i.isBought,
  );
  const inCart = filtered.filter((i) => i.isBought);
  const inStock = filtered.filter((i) => i.current >= i.target && !i.isBought);

  const getEstimatedPrice = (item) => {
    if (item.priceHistory && item.priceHistory.length > 0)
      return (
        item.priceHistory[0].price *
        (item.target > item.current ? item.target - item.current : 1)
      );
    return 0;
  };
  const shopTotal = shoppingList.reduce(
    (sum, item) => sum + getEstimatedPrice(item),
    0,
  );
  const cartTotal = inCart.reduce(
    (sum, item) => sum + getEstimatedPrice(item),
    0,
  );

  const groupItems = (list) =>
    list.reduce((acc, i) => {
      if (!acc[i.category]) acc[i.category] = [];
      acc[i.category].push(i);
      return acc;
    }, {});

  const allUniqueCategories = useMemo(
    () => [...new Set(items.map((i) => i.category))],
    [items],
  );
  const displayOrder = useMemo(
    () => [...new Set([...categoryOrder, ...allUniqueCategories])],
    [categoryOrder, allUniqueCategories],
  );

  const moveCategory = async (index, direction) => {
    const newOrder = [...displayOrder];
    if (direction === "up" && index > 0) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[index - 1];
      newOrder[index - 1] = temp;
    } else if (direction === "down" && index < newOrder.length - 1) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[index + 1];
      newOrder[index + 1] = temp;
    }
    await setDoc(
      doc(db, "settings", `category_order_${sharedListId}`),
      { order: newOrder },
      { merge: true },
    );
  };

  const sortCategories = (catA, catB) => {
    let idxA = displayOrder.indexOf(catA);
    let idxB = displayOrder.indexOf(catB);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    if (idxA !== idxB) return idxA - idxB;
    return catA.localeCompare(catB);
  };

  const activeCatIds = useMemo(() => {
    const shopIds = Object.keys(groupItems(shoppingList)).map(
      (c) => `shop_${c}`,
    );
    const pantryIds = Object.keys(groupItems(inStock)).map(
      (c) => `pantry_${c}`,
    );
    return [...shopIds, ...pantryIds];
  }, [shoppingList, inStock]);

  const hasOpenCats = activeCatIds.some((id) => !collapsedCats[id]);
  const closeAllCategories = () => {
    const newState = { ...collapsedCats };
    activeCatIds.forEach((id) => {
      newState[id] = true;
    });
    setCollapsedCats(newState);
  };

  const smartSplitData = useMemo(() => {
    if (!isSmartSplitOpen) return null;
    const split = {};
    let bestTotal = 0;
    let currentTotal = 0;
    shoppingList.forEach((item) => {
      const qty = item.target > item.current ? item.target - item.current : 1;
      let currentPrice =
        item.priceHistory && item.priceHistory.length > 0
          ? item.priceHistory[0].price
          : 0;
      let bestStore = activeStore;
      let bestPrice = currentPrice;
      if (item.priceHistory && item.priceHistory.length > 0) {
        item.priceHistory.forEach((h) => {
          if (h.price < bestPrice) {
            bestPrice = h.price;
            bestStore = h.store;
          }
        });
      }
      if (!split[bestStore]) split[bestStore] = { items: [], total: 0 };
      split[bestStore].items.push({ ...item, suggestedPrice: bestPrice, qty });
      split[bestStore].total += bestPrice * qty;
      bestTotal += bestPrice * qty;
      currentTotal += currentPrice * qty;
    });
    return {
      split,
      bestTotal,
      currentTotal,
      savings: currentTotal - bestTotal,
    };
  }, [isSmartSplitOpen, shoppingList, activeStore]);

  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let totalSpent = 0;
    const storeTotals = {};
    items.forEach((item) => {
      if (item.priceHistory) {
        item.priceHistory.forEach((entry) => {
          if (entry.timestamp) {
            const d = new Date(entry.timestamp);
            if (
              d.getMonth() === currentMonth &&
              d.getFullYear() === currentYear
            ) {
              totalSpent += entry.price;
              storeTotals[entry.store] =
                (storeTotals[entry.store] || 0) + entry.price;
            }
          }
        });
      }
    });
    return { totalSpent, storeTotals };
  }, [items]);

  if (loadingAuth) return <div className="app-container">טוען...</div>;
  if (!user)
    return (
      <div
        className="app-container"
        style={{ textAlign: "center", marginTop: 100 }}
      >
        <button
          className="store-tab active"
          onClick={() => signInWithPopup(auth, googleProvider)}
        >
          התחבר עם גוגל
        </button>
      </div>
    );

  return (
    <div className="app-container">
      <header className="user-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src={user.photoURL}
            className="user-avatar"
            alt="p"
            referrerPolicy="no-referrer"
          />

          <div className="active-users-container">
            {activeUsers
              .filter((u) => u.uid !== user.uid)
              .map((u) => (
                <div
                  key={u.uid}
                  className="active-user-wrap"
                  title={`${u.name} מחובר/ת עכשיו`}
                >
                  <img
                    src={u.photoURL}
                    className="active-user-avatar"
                    alt={u.name}
                    referrerPolicy="no-referrer"
                  />
                  <div className="online-indicator"></div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ⚙️
          </button>
          <button
            onClick={() => signOut(auth)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-light)",
              fontSize: 12,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            התנתק
          </button>
        </div>
      </header>

      {isScannerOpen && (
        <div className="modal-overlay" onClick={() => setIsScannerOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 10 }}
          >
            <h3 style={{ margin: "0 0 10px", textAlign: "center" }}>
              📷 סורק ברקוד
            </h3>
            <div id="reader"></div>
            <button
              className="store-tab active"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() => setIsScannerOpen(false)}
            >
              ביטול סריקה
            </button>
          </div>
        </div>
      )}

      {currentView === "shopping" && (
        <>
          <nav className="store-tabs">
            {uniqueStores.map((s) => (
              <button
                key={s}
                className={`store-tab ${activeStore === s ? "active" : ""}`}
                onClick={() => setActiveStore(s)}
              >
                {s}
              </button>
            ))}
            <button
              className="store-tab"
              onClick={() => {
                const n = prompt("חנות חדשה:");
                if (n)
                  addDoc(collection(db, "stores"), {
                    name: n,
                    createdAt: new Date(),
                    listId: sharedListId,
                  });
              }}
            >
              +
            </button>
          </nav>

          {isSettingsOpen && (
            <div
              className="item-card"
              style={{ flexDirection: "column", alignItems: "stretch" }}
            >
              {deferredPrompt && (
                <button
                  onClick={handleInstallApp}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "var(--primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    fontSize: "16px",
                    marginBottom: "15px",
                    display: "flex",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <i className="fas fa-download"></i> התקן אפליקציה למכשיר
                </button>
              )}

              {/* --- אזור השיתוף המשפחתי (הפיצ'ר החדש!) --- */}
              <h4 style={{ margin: "10px 0 10px" }}>👨‍👩‍👧‍👦 שיתוף משפחתי</h4>
              <div
                style={{
                  background: "var(--bg)",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 20,
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: 13,
                    fontWeight: "bold",
                  }}
                >
                  הקוד שלך לשיתוף:
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 15 }}>
                  <input
                    className="f-input"
                    readOnly
                    value={user.uid}
                    style={{ fontSize: 11, padding: 8 }}
                  />
                  <button
                    className="add-price-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(user.uid);
                      alert("הקוד הועתק!");
                    }}
                  >
                    העתק
                  </button>
                </div>

                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: 13,
                    fontWeight: "bold",
                  }}
                >
                  הצטרף לרשימה של מישהו אחר:
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="f-input"
                    placeholder="הדבק קוד שותף..."
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    style={{ fontSize: 12, padding: 8 }}
                  />
                  <button className="add-price-btn" onClick={joinFamilyList}>
                    הצטרף
                  </button>
                </div>

                {sharedListId !== user.uid && (
                  <button
                    style={{
                      marginTop: 15,
                      width: "100%",
                      color: "var(--danger)",
                      background: "none",
                      border: "1px solid var(--danger)",
                      borderRadius: 8,
                      padding: 8,
                      cursor: "pointer",
                    }}
                    onClick={leaveFamilyList}
                  >
                    נתק שיתוף וחזור לרשימה הפרטית שלי
                  </button>
                )}
              </div>

              <h4 style={{ margin: "0 0 10px" }}>⚙️ ניהול חנויות</h4>
              {uniqueStores.map((storeName) => {
                const storeDoc = stores.find((s) => s.name === storeName);
                return (
                  <div
                    key={storeName}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span>{storeName}</span>
                    {storeName !== "סופרמרקט" && storeDoc && (
                      <button
                        onClick={() =>
                          deleteDoc(doc(db, "stores", storeDoc.id))
                        }
                        style={{
                          color: "red",
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                        }}
                      >
                        מחק
                      </button>
                    )}
                  </div>
                );
              })}

              <h4 style={{ margin: "20px 0 10px" }}>🔄 סדר קטגוריות בסופר</h4>
              <div
                style={{
                  background: "var(--bg)",
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                {displayOrder.map((cat, idx) => (
                  <div
                    key={cat}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>{cat}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn-mini"
                        disabled={idx === 0}
                        onClick={() => moveCategory(idx, "up")}
                      >
                        <i className="fas fa-arrow-up"></i>
                      </button>
                      <button
                        className="btn-mini"
                        disabled={idx === displayOrder.length - 1}
                        onClick={() => moveCategory(idx, "down")}
                      >
                        <i className="fas fa-arrow-down"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            className="f-input"
            style={{ width: "100%", boxSizing: "border-box", marginBottom: 15 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`🔍 חפש ב${activeStore}...`}
          />

          {hasOpenCats && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "10px",
              }}
            >
              <button className="collapse-all-btn" onClick={closeAllCategories}>
                <i className="fas fa-angle-double-up"></i> סגור הכל
              </button>
            </div>
          )}

          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                margin: "10px 0 10px",
              }}
            >
              <h2 style={{ fontSize: 20, margin: 0 }}>
                📝 צריך לקנות ({shoppingList.length})
              </h2>
              {shopTotal > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 14, color: "var(--text-light)" }}>
                    צפי: ₪{shopTotal.toFixed(2)}
                  </span>
                  <button
                    className="smart-split-btn"
                    onClick={() => setIsSmartSplitOpen(true)}
                  >
                    💡 פיצול חסכוני
                  </button>
                </div>
              )}
            </div>

            {Object.entries(groupItems(shoppingList))
              .sort((a, b) => sortCategories(a[0], b[0]))
              .map(([cat, list]) => {
                const catId = `shop_${cat}`;
                return (
                  <div key={cat}>
                    <div
                      className="category-header"
                      onClick={() => toggleCat(catId)}
                    >
                      <span>
                        {cat} ({list.length})
                      </span>
                      <i
                        className={`fas fa-chevron-${collapsedCats[catId] ? "left" : "down"}`}
                      ></i>
                    </div>
                    <AnimatePresence>
                      {!collapsedCats[catId] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: "hidden" }}
                        >
                          {list.map(renderItem)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

            {inCart.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <h2
                  style={{
                    fontSize: 20,
                    marginBottom: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>🛒 בעגלה ({inCart.length})</span>
                  {cartTotal > 0 && (
                    <span
                      style={{
                        color: "var(--success)",
                        fontSize: 18,
                        fontWeight: "900",
                      }}
                    >
                      ₪{cartTotal.toFixed(2)}
                    </span>
                  )}
                </h2>
                <AnimatePresence>{inCart.map(renderItem)}</AnimatePresence>
                <button
                  className="store-tab active"
                  style={{
                    width: "100%",
                    marginTop: 10,
                    borderRadius: 12,
                    padding: 12,
                  }}
                  onClick={() =>
                    inCart.forEach((i) =>
                      updateDoc(doc(db, "groceries", i.id), {
                        current: i.target,
                        isBought: false,
                      }),
                    )
                  }
                >
                  עדכן מלאי סופי ✅
                </button>
              </div>
            )}

            <h2
              style={{
                fontSize: 20,
                marginTop: 40,
                opacity: 0.4,
                marginBottom: 10,
              }}
            >
              📦 במזווה ({inStock.length})
            </h2>
            {Object.entries(groupItems(inStock))
              .sort((a, b) => sortCategories(a[0], b[0]))
              .map(([cat, list]) => {
                const catId = `pantry_${cat}`;
                return (
                  <div key={cat}>
                    <div
                      className="category-header"
                      onClick={() => toggleCat(catId)}
                    >
                      <span>
                        {cat} ({list.length})
                      </span>
                      <i
                        className={`fas fa-chevron-${collapsedCats[catId] ? "left" : "down"}`}
                      ></i>
                    </div>
                    <AnimatePresence>
                      {!collapsedCats[catId] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: "hidden", opacity: 0.7 }}
                        >
                          {list.map(renderItem)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
          </section>

          <form className="floating-form" onSubmit={addItem}>
            {activeSuggestions.length > 0 && (
              <div className="suggestions-popup">
                {activeSuggestions.map((s) => (
                  <div
                    key={s.name}
                    className="suggestion-item"
                    onClick={() => {
                      setNewItemName(s.name);
                      setNewItemCategory(s.category);
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="sugg-name">{s.name}</span>
                    <span className="sugg-cat">{s.category}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="scan-btn"
              onClick={() => setIsScannerOpen(true)}
              title="סרוק ברקוד"
            >
              <i className="fas fa-barcode"></i>
            </button>
            <input
              className="f-input"
              value={newItemName}
              onChange={(e) => {
                setNewItemName(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder="מה להוסיף?"
            />
            <input
              className="f-input"
              style={{ flex: 0.6 }}
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              placeholder="קטגוריה"
            />
            <input
              className="f-input qty-add-input"
              type="number"
              value={newItemTarget}
              onChange={(e) => setNewItemTarget(Number(e.target.value))}
            />
            <button className="f-btn" type="submit">
              <i className="fas fa-plus"></i>
            </button>
          </form>
        </>
      )}

      {currentView === "recipes" && (
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <h2 style={{ margin: 0 }}>🍳 הארוחות שלנו</h2>
            <button className="store-tab active" onClick={createNewRecipe}>
              + מתכון חדש
            </button>
          </div>
          {recipes.map((recipe) => {
            const { status, missing } = checkRecipeStatus(recipe);
            return (
              <div key={recipe.id} className="recipe-card">
                <div className="recipe-header">
                  <span className="recipe-title">{recipe.name}</span>
                  <div>
                    <button
                      onClick={() =>
                        addIngredientToRecipe(
                          recipe.id,
                          recipe.ingredients || [],
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary)",
                        cursor: "pointer",
                        fontWeight: "bold",
                        marginLeft: 10,
                      }}
                    >
                      + מצרך
                    </button>
                    <button
                      onClick={() =>
                        window.confirm("למחוק את המתכון?") &&
                        deleteDoc(doc(db, "recipes", recipe.id))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--danger)",
                        cursor: "pointer",
                      }}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    {status === "ready" && (
                      <span className="status-badge ready">
                        🟢 אפשר להכין! הכל בבית
                      </span>
                    )}
                    {status === "almost" && (
                      <>
                        <span className="status-badge almost">
                          🟠 חסרים {missing.length} מצרכים
                        </span>
                        <button
                          className="add-missing-btn"
                          onClick={() =>
                            pushMissingToCart(missing, recipe.name)
                          }
                        >
                          הוסף חסרים לרשימה
                        </button>
                      </>
                    )}
                    {status === "missing" && (
                      <>
                        <span className="status-badge missing">
                          🔴 חסר הרבה ({missing.length} מצרכים)
                        </span>
                        <button
                          className="add-missing-btn"
                          onClick={() =>
                            pushMissingToCart(missing, recipe.name)
                          }
                        >
                          הוסף חסרים לרשימה
                        </button>
                      </>
                    )}
                  </div>
                )}
                <div className="ingredients-list">
                  {(recipe.ingredients || []).map((ing, idx) => (
                    <span key={idx} className="ingredient-chip">
                      {ing}{" "}
                      <i
                        className="fas fa-times"
                        style={{
                          marginLeft: 5,
                          cursor: "pointer",
                          opacity: 0.5,
                        }}
                        onClick={async () => {
                          const updated = recipe.ingredients.filter(
                            (_, i) => i !== idx,
                          );
                          await updateDoc(doc(db, "recipes", recipe.id), {
                            ingredients: updated,
                          });
                        }}
                      ></i>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {currentView === "stats" && (
        <section className="stats-dashboard">
          <h2 style={{ margin: "0 0 20px" }}>📊 סיכום החודש הנוכחי</h2>
          <div className="stat-card">
            <div className="stat-title">סה"כ הוצאות מתועדות החודש</div>
            <div className="stat-value">₪{stats.totalSpent.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title" style={{ marginBottom: 15 }}>
              הוצאות לפי רשתות
            </div>
            <div className="bar-chart-container">
              {Object.entries(stats.storeTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([store, total]) => {
                  const percentage =
                    stats.totalSpent > 0 ? (total / stats.totalSpent) * 100 : 0;
                  return (
                    <div key={store} className="bar-row">
                      <div className="bar-label">
                        <span>{store}</span>
                        <span>₪{total.toFixed(2)}</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {isSmartSplitOpen && smartSplitData && (
        <div
          className="modal-overlay"
          onClick={() => setIsSmartSplitOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0 }}>💡 המלצת פיצול קניות</h3>
              <button
                onClick={() => setIsSmartSplitOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            {smartSplitData.savings > 0 ? (
              <div
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: 10,
                  borderRadius: 12,
                  marginBottom: 16,
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                אם תפצל את הקנייה תוכל לחסוך ₪
                {smartSplitData.savings.toFixed(2)}!
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg)",
                  color: "var(--text-light)",
                  padding: 10,
                  borderRadius: 12,
                  marginBottom: 16,
                  textAlign: "center",
                  fontSize: 13,
                }}
              >
                לא נמצאו פערים משמעותיים - אפשר לקנות הכל כאן.
              </div>
            )}
            {Object.entries(smartSplitData.split).map(([storeName, data]) => (
              <div key={storeName} className="smart-split-store">
                <div className="split-store-title">
                  <span>{storeName}</span>
                  <span>₪{data.total.toFixed(2)}</span>
                </div>
                {data.items.map((item, idx) => (
                  <div key={idx} className="split-item">
                    <span>
                      {item.qty}x {item.name}
                    </span>
                    <span style={{ fontWeight: "bold" }}>
                      ₪{item.suggestedPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <div
              style={{
                marginTop: 20,
                textAlign: "center",
                fontSize: 18,
                fontWeight: "900",
              }}
            >
              סה"כ משוער: ₪{smartSplitData.bestTotal.toFixed(2)}
            </div>
            <button
              className="store-tab active"
              style={{ width: "100%", marginTop: 15, padding: 12 }}
              onClick={() => setIsSmartSplitOpen(false)}
            >
              הבנתי, תודה!
            </button>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <div
          className={`nav-item ${currentView === "shopping" ? "active" : ""}`}
          onClick={() => setCurrentView("shopping")}
        >
          <i className="fas fa-shopping-cart nav-icon"></i>
          <span>קניות</span>
        </div>
        <div
          className={`nav-item ${currentView === "recipes" ? "active" : ""}`}
          onClick={() => setCurrentView("recipes")}
        >
          <i className="fas fa-utensils nav-icon"></i>
          <span>מתכונים</span>
        </div>
        <div
          className={`nav-item ${currentView === "stats" ? "active" : ""}`}
          onClick={() => setCurrentView("stats")}
        >
          <i className="fas fa-chart-pie nav-icon"></i>
          <span>תקציב</span>
        </div>
      </nav>
    </div>
  );
}

export default App;
