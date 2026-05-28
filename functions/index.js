const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const firebaseAdmin = require("firebase-admin");
const axios = require("axios");

if (firebaseAdmin.apps.length === 0) {
  firebaseAdmin.initializeApp();
}
const db = firebaseAdmin.firestore();

// הרשתות שאנחנו מחפשים
const TARGET_CHAINS = [
  "רמי לוי",
  "שופרסל",
  "מחסני השוק",
  "אושר עד",
  "חצי חינם",
  "ויקטורי",
  "קרפור",
  "יוחננוף",
  "טיב טעם",
  "יש חסד",
];

exports.dailysupermarketscraper = onSchedule(
  {
    schedule: "0,30 * * * *", // רץ כל חצי שעה
    timeZone: "Asia/Jerusalem",
    region: "europe-west1",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (event) => {
    logger.log("🚀 מתחיל סבב שאיבת מחירים חסכוני ומתקדם (עד 150 מוצרים)...");

    try {
      const API_TOKEN = "d20a152b-22cd-4503-a439-2e0e8bb6d052"; // <--- ⚠️ הטוקן שלך ⚠️
      const timestamp = Date.now();
      const dateStr = new Date().toLocaleDateString("he-IL");

      let allProducts = [];
      let batch = db.batch();
      let operationCount = 0;
      let totalUpdated = 0;

      const flushBatchIfNeeded = async () => {
        if (operationCount >= 400) {
          await batch.commit();
          batch = db.batch();
          operationCount = 0;
        }
      };

      // --- 1. שולפים מוצרי VIP דחופים (מקסימום 50) ---
      const prioritySnapshot = await db
        .collection("product_catalog")
        .where("priorityUpdate", "==", true)
        .limit(50)
        .get();

      prioritySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.barcode) {
          allProducts.push({
            name: doc.id,
            barcode: data.barcode,
            isPriority: true,
          });
        }
      });

      // --- 2. שולפים מוצרים רגילים עם "סמן" כדי לחסוך קריאות! ---
      const limitCount = 150 - allProducts.length;
      if (limitCount > 0) {
        const stateDocRef = db.collection("system").doc("crawlerState");
        const stateDoc = await stateDocRef.get();
        let lastId = stateDoc.exists ? stateDoc.data().lastId : null;

        let query = db
          .collection("product_catalog")
          .orderBy(firebaseAdmin.firestore.FieldPath.documentId())
          .limit(limitCount);

        if (lastId) {
          query = query.startAfter(lastId);
        }

        let regularSnapshot = await query.get();

        // אם הגענו לסוף הקטלוג, מתחילים שוב מההתחלה
        if (regularSnapshot.empty) {
          logger.log("🔄 הגענו לסוף הקטלוג, מתחילים סבב חדש מההתחלה!");
          query = db
            .collection("product_catalog")
            .orderBy(firebaseAdmin.firestore.FieldPath.documentId())
            .limit(limitCount);
          regularSnapshot = await query.get();
        }

        regularSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.barcode && !allProducts.some((p) => p.name === doc.id)) {
            allProducts.push({
              name: doc.id,
              barcode: data.barcode,
              isPriority: false,
            });
          }
        });

        // שומרים את מיקום הסמן לפעם הבאה (חוסך לנו 9000 קריאות!)
        if (regularSnapshot.docs.length > 0) {
          const newLastId =
            regularSnapshot.docs[regularSnapshot.docs.length - 1].id;
          batch.set(stateDocRef, { lastId: newLastId }, { merge: true });
          operationCount++;
        }
      }

      logger.log(`נבחרו ${allProducts.length} מוצרים לסבב הנוכחי.`);

      // --- 3. בקשות למשיכת המחירים מול ה-API ---
      const chunkSize = 10;
      for (let i = 0; i < allProducts.length; i += chunkSize) {
        const chunk = allProducts.slice(i, i + chunkSize);

        const promises = chunk.map((product) => {
          const API_URL = `https://data.openisraelisupermarkets.co.il/analytics/price-comparison/cross-chain/${product.barcode}`;
          return axios
            .get(API_URL, {
              headers: {
                Authorization: `Bearer ${API_TOKEN}`,
                Accept: "application/json",
              },
              validateStatus: () => true, // מאפשר לנו לטפל בשגיאות 404 בעצמנו ללא קריסת הקוד
            })
            .then((res) => ({ product, status: res.status, data: res.data }));
        });

        const results = await Promise.allSettled(promises);

        // --- 4. ניתוח התוצאות וכתיבה למסד ---
        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const currentProduct = chunk[j];

          let hasPrices = false;
          let storeUpdates = { lastUpdated: timestamp };

          if (
            result.status === "fulfilled" &&
            result.value.status === 200 &&
            result.value.data
          ) {
            const data = result.value.data;
            let chainList = [];

            // זיהוי מבנה הנתונים
            if (data && Array.isArray(data.chainComparison)) {
              chainList = data.chainComparison;
            } else if (Array.isArray(data)) {
              chainList = data;
            } else if (typeof data === "object" && data !== null) {
              const chainKey = Object.keys(data).find((k) =>
                k.toLowerCase().includes("chain"),
              );
              if (chainKey && Array.isArray(data[chainKey]))
                chainList = data[chainKey];
            }

            const CHAIN_NORMALIZE = {
              "שופרסל שלי": "שופרסל",
              "שופרסל דיל": "שופרסל",
              "שופרסל אקסטרא": "שופרסל",
              "שופרסל אונליין": "שופרסל",
              "שופרסל Be": "שופרסל",
              "יש חסד": "חצי חינם",
              "חצי חינם (יש חסד)": "חצי חינם",
              "רמי לוי שיווק השקמה": "רמי לוי",
              "רמי לוי (חסר בקובץ)": "רמי לוי",
              "מחסני השוק (יש חסד)": "מחסני השוק",
              ויקטורי: "ויקטורי",
              "טיב טעם": "טיב טעם",
              "אושר עד": "אושר עד",
            };

            const normalizeChainName = (name) => {
              if (!name) return name;
              const trimmed = name.trim();
              return CHAIN_NORMALIZE[trimmed] || trimmed;
            };

            if (chainList.length > 0) {
              for (const chain of chainList) {
                const storeName = normalizeChainName(
                  chain.chainName || chain.chain_name || chain.chain,
                );
                const currentPrice = parseFloat(
                  chain.minPrice ??
                    chain.avgPrice ??
                    chain.price ??
                    chain.min_price,
                );

                if (storeName && !isNaN(currentPrice)) {
                  if (storeUpdates[storeName]) {
                    if (currentPrice < storeUpdates[storeName][0].price) {
                      storeUpdates[storeName] = [
                        {
                          price: currentPrice,
                          date: dateStr,
                          timestamp: timestamp,
                        },
                      ];
                    }
                  } else {
                    storeUpdates[storeName] = [
                      {
                        price: currentPrice,
                        date: dateStr,
                        timestamp: timestamp,
                      },
                    ];
                  }
                  hasPrices = true;
                }
              }
            }
          }

          // רישום המחירים לאוסף הכללי
          if (hasPrices) {
            const globalDocRef = db
              .collection("global_prices")
              .doc(currentProduct.name);
            batch.set(globalDocRef, storeUpdates, { merge: true });
            operationCount++;
            totalUpdated++;
          }

          // התיקון הקריטי: עדכון הקטלוג גם בהצלחה וגם בכישלון, תוך הסרת דגל ה-VIP במידת הצורך
          let catalogUpdates = {
            hasPrice: hasPrices,
            lastScraped: timestamp,
          };

          if (currentProduct.isPriority) {
            catalogUpdates.priorityUpdate = false;
          }

          const catalogRef = db
            .collection("product_catalog")
            .doc(currentProduct.name);
          batch.update(catalogRef, catalogUpdates);
          operationCount++;

          await flushBatchIfNeeded();
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (operationCount > 0) {
        await batch.commit();
      }

      logger.log(
        `✅ הסתיים סבב הטפטוף החכם! נסרקו ${allProducts.length} מוצרים, נמצאו/עודכנו מחירים עבור ${totalUpdated} מוצרים.`,
      );
    } catch (error) {
      logger.error("❌ שגיאה קריטית:", error.message);
    }
  },
);
const { onRequest } = require("firebase-functions/v2/https");

// פונקציה חד-פעמית למילוי הקטלוג הראשוני
exports.seedCatalog = onRequest(
  { timeoutSeconds: 540, memory: "512MiB", region: "europe-west1" },
  async (req, res) => {
    logger.log("🛠️ מתחיל שאיבת קטלוג מוצרים מסיבית...");

    try {
      const API_TOKEN = "d20a152b-22cd-4503-a439-2e0e8bb6d052"; // <--- ⚠️ שים את הטוקן שלך כאן שוב! ⚠️

      const searchTerms = [
        "חלב",
        "גבינה",
        "יוגורט",
        "שמנת",
        "חמאה",
        "קוטג",
        "מעדן",
        "ביצים",
        "שוקו",
        "אשל",
        "לחם",
        "פיתות",
        "לחמניות",
        "חלה",
        "בגט",
        "בורקס",
        "מלוואח",
        "ג'חנון",
        "בצק",
        "פריכיות",
        "בשר",
        "בקר",
        "עוף",
        "פרגיות",
        "שניצל",
        "נקניק",
        "פסטרמה",
        "קבאב",
        "הודו",
        "דג",
        "סלמון",
        "טונה",
        "עגבניה",
        "מלפפון",
        "בצל",
        "שום",
        "תפוח אדמה",
        "גזר",
        "פלפל",
        "חסה",
        "כרוב",
        "בטטה",
        "אבוקדו",
        "פטריות",
        "תפוח",
        "בננה",
        "אגס",
        "תפוז",
        "קלמנטינה",
        "אבטיח",
        "מלון",
        "ענבים",
        "מנגו",
        "לימון",
        "פסטה",
        "פתיתים",
        "אורז",
        "מקרוני",
        "ספגטי",
        "קוסקוס",
        "קינואה",
        "עדשים",
        "שעועית",
        "חומוס",
        "שמן",
        "זית",
        "קנולה",
        "חומץ",
        "מלח",
        "סוכר",
        "קמח",
        "שמרים",
        "קקאו",
        "קפה",
        "תה",
        "דבש",
        "סילאן",
        "במבה",
        "ביסלי",
        "תפוצ'יפס",
        "דוריתוס",
        "אפרופו",
        "שוקולד",
        "וופלים",
        "עוגיות",
        "סוכריות",
        "מסטיק",
        "חטיף",
        "מים",
        "קולה",
        "ספרייט",
        "מיץ",
        "סודה",
        "בירה",
        "יין",
        "וודקה",
        "ויסקי",
        "סירופ",
        "נייר טואלט",
        "מגבונים",
        "חיתולים",
        "מטרנה",
        "סימילאק",
        "מוצץ",
        "שמפו",
        "מרכך",
        "סבון",
        "משחת שיניים",
        "דאודורנט",
        "אבקת כביסה",
        "מרכך כביסה",
        "אקונומיקה",
        "נוזל כלים",
        "מטליות",
        "ספוג",
        "שקיות אשפה",
        "ניילון נצמד",
        "רדיד אלומיניום",
        "אוכל לכלבים",
        "אוכל לחתולים",
        "שימורים",
        "רסק עגבניות",
        "קטשופ",
        "מיונז",
        "חרדל",
        "טחינה",
        "זיתים",
        "חמוצים",
      ];
      let totalAdded = 0;

      for (const term of searchTerms) {
        logger.log(`🔍 מחפש מוצרים עבור: ${term}...`);

        const API_URL = `https://data.openisraelisupermarkets.co.il/products/search?query=${encodeURIComponent(term)}&limit=100`;
        try {
          const response = await axios.get(API_URL, {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
              Accept: "application/json",
            },
          });

          let productsList = [];
          if (Array.isArray(response.data)) {
            productsList = response.data;
          } else if (response.data && Array.isArray(response.data.products)) {
            productsList = response.data.products;
          } else if (typeof response.data === "object") {
            const itemsKey = Object.keys(response.data).find((k) =>
              Array.isArray(response.data[k]),
            );
            if (itemsKey) productsList = response.data[itemsKey];
          }

          if (productsList.length > 0) {
            let batch = db.batch();
            let batchCount = 0;

            for (const item of productsList) {
              const barcode = item.productBarcode || item.barcode;
              const name = item.productName || item.name;
              const manufacturer = item.manufacturer || "";

              if (barcode && name) {
                const cleanName = name.replace(/\|/g, "").trim();
                const docRef = db.collection("product_catalog").doc(cleanName);

                batch.set(
                  docRef,
                  {
                    barcode: barcode.toString(),
                    category: term,
                    manufacturer: manufacturer,
                    addedAt: Date.now(),
                  },
                  { merge: true },
                );

                batchCount++;
                totalAdded++;

                if (batchCount === 450) {
                  await batch.commit();
                  batch = db.batch();
                  batchCount = 0;
                }
              }
            }

            if (batchCount > 0) {
              await batch.commit();
            }
            logger.log(`✅ נוספו ${productsList.length} מוצרים תחת "${term}"`);
          } else {
            logger.log(`🤷‍♂️ לא נמצאו תוצאות עבור "${term}"`);
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (err) {
          logger.warn(`⚠️ שגיאה בשאיבת "${term}": ${err.message}`);
        }
      }

      const successMsg = `🎉 המבצע הושלם בהצלחה! התווספו/עודכנו ${totalAdded} מוצרים לקטלוג שלך.`;
      logger.log(successMsg);
      res
        .status(200)
        .send(
          `<h1>${successMsg}</h1><p>אתה יכול לסגור את החלון הזה עכשיו, ולבדוק את הפיירבייס שלך!</p>`,
        );
    } catch (error) {
      logger.error("❌ שגיאה קריטית:", error.message);
      res
        .status(500)
        .send(`<h1>אוי, משהו השתבש...</h1><p>${error.message}</p>`);
    }
  },
);
