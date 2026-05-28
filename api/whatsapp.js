import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const incomingMsg = req.body.Body || "";
  const sender = req.body.From || "";

  try {
    const phoneDoc = await db.collection("phones").doc(sender).get();

    if (!phoneDoc.exists) {
      const appUrl = "https://home-shopping-xi.vercel.app";
      const magicLink = `${appUrl}?phone=${encodeURIComponent(sender)}`;
      const twiml = `<Response><Message>היי! 👋 חבר את החשבון בקישור:\n${magicLink}</Message></Response>`;
      res.setHeader("Content-Type", "text/xml");
      return res.status(200).send(twiml);
    }

    const LIST_ID = phoneDoc.data().listId;
    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // --- הקסם: זיהוי אתרים (מתכונים) ---
    let websiteContent = "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = incomingMsg.match(urlRegex);

    if (urls && urls.length > 0) {
      try {
        console.log("מוריד תוכן מהאתר:", urls[0]);
        const response = await fetch(urls[0]);
        const html = await response.text();
        websiteContent = html.substring(0, 15000);
      } catch (e) {
        console.error("שגיאה בקריאת הקישור:", e);
      }
    }

    // --- הפרומפט המשודרג הכולל ניתוב לחנויות ---
    const prompt = `
      אתה מנהל רשימת קניות חכם. המשתמש שלח: "${incomingMsg}".
      ${websiteContent ? `שים לב! המשתמש שלח קישור למתכון. הנה קוד האתר של המתכון:\n${websiteContent}\nקרא אותו וחלץ ממנו את המצרכים האמיתיים!` : ""}
      
      משימות:
      1. קבע כוונה (intent) מתוך: "add", "read", "bought", "delete", "update_stock", "import_recipe".
      2. לכל מוצר שצריך להוסיף, קבע את החנות הכי הגיונית לקנות אותו. אם לא צוין אחרת, השתמש בהיגיון בריא (למשל: עגבנייה -> "סופרמרקט", אקמול -> "פארם", פטיש -> "טמבוריה", לחם -> "מאפייה").
      
      קטגוריות מותרות: [מוצרי חלב, ירקות ופירות, בשר ודגים, מאפייה, קפואים, ניקיון, יבשים ושימורים, משקאות, חטיפים, פארם, אחר].
      
      החזר אך ורק JSON טהור:
      {
        "intent": "add" | "read" | "bought" | "delete" | "update_stock" | "import_recipe",
        "recipeName": "שם המנה (רק אם זה import_recipe)",
        "items": [{"name": "שם המוצר", "qty": מספר, "category": "הקטגוריה", "store": "שם החנות המומלצת"}]
      }
    `;

    const result = await model.generateContent(prompt);
    const aiData = JSON.parse(result.response.text().match(/\{[\s\S]*\}/)[0]);

    if (aiData.intent === "read") {
      const snapshot = await db
        .collection("groceries")
        .where("listId", "==", LIST_ID)
        .where("isBought", "==", false)
        .get();
      if (snapshot.empty)
        return res
          .status(200)
          .send(
            `<Response><Message>🛒 הכל קנוי! הרשימה ריקה.</Message></Response>`,
          );
      let list = [];
      snapshot.forEach((doc) =>
        list.push(
          `• ${doc.data().name} (${doc.data().target}) - ${doc.data().store}`,
        ),
      );
      res.setHeader("Content-Type", "text/xml");
      return res
        .status(200)
        .send(
          `<Response><Message>🛒 *צריך לקנות:*\n\n${list.join("\n")}</Message></Response>`,
        );
    }

    // הוספת מוצרים או מתכונים (עם תמיכה בחנויות מרובות!)
    if (aiData.intent === "add" || aiData.intent === "import_recipe") {
      // 1. נשלוף את החנויות הקיימות של המשתמש כדי לא ליצור כפילויות
      const storesSnapshot = await db
        .collection("stores")
        .where("listId", "==", LIST_ID)
        .get();
      const existingStores = storesSnapshot.docs.map((d) => d.data().name);

      let addedNames = [];
      let usedStores = new Set();

      for (const item of aiData.items) {
        const targetStore = item.store || "סופרמרקט";

        // אם החנות לא קיימת ברשימה, האפליקציה תיצור אותה אוטומטית!
        if (!existingStores.includes(targetStore)) {
          await db.collection("stores").add({
            name: targetStore,
            listId: LIST_ID,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          existingStores.push(targetStore);
        }

        await db.collection("groceries").add({
          name: item.name,
          category: item.category,
          store: targetStore,
          current: 0,
          target: item.qty || 1,
          isBought: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          listId: LIST_ID,
          note:
            aiData.intent === "import_recipe"
              ? `מתכון: ${aiData.recipeName || "מהרשת"}`
              : "נוסף מוואטסאפ 🤖",
        });

        addedNames.push(item.name);
        usedStores.add(targetStore);
      }

      const storesListStr = Array.from(usedStores).join(", ");
      const msgPrefix =
        aiData.intent === "import_recipe"
          ? `🍳 זיהיתי מתכון ל-${aiData.recipeName}! `
          : `✅ מעולה. `;

      res.setHeader("Content-Type", "text/xml");
      return res
        .status(200)
        .send(
          `<Response><Message>${msgPrefix}הוספתי ${addedNames.length} מצרכים לחנויות: ${storesListStr}.</Message></Response>`,
        );
    }

    // --- שאר הפעולות (נשאר ללא שינוי, תומך בעדכון מחיקה לפי שם) ---
    if (aiData.intent === "update_stock") {
      const snapshot = await db
        .collection("groceries")
        .where("listId", "==", LIST_ID)
        .get();
      let updated = [];
      for (const aiItem of aiData.items) {
        for (const doc of snapshot.docs) {
          const data = doc.data();
          if (
            data.name.includes(aiItem.name) ||
            aiItem.name.includes(data.name)
          ) {
            await db
              .collection("groceries")
              .doc(doc.id)
              .update({ current: aiItem.qty, target: 0, isBought: false });
            updated.push(data.name);
          }
        }
      }
      const reply =
        updated.length > 0
          ? `📦 המלאי עודכן ל-${aiData.items[0].qty} והמוצר עבר למזווה.`
          : "לא מצאתי מוצר כזה לעדכון.";
      res.setHeader("Content-Type", "text/xml");
      return res
        .status(200)
        .send(`<Response><Message>${reply}</Message></Response>`);
    }

    if (aiData.intent === "bought") {
      const snapshot = await db
        .collection("groceries")
        .where("listId", "==", LIST_ID)
        .where("isBought", "==", false)
        .get();
      let bought = [];
      for (const aiItem of aiData.items) {
        for (const doc of snapshot.docs) {
          if (
            doc.data().name.includes(aiItem.name) ||
            aiItem.name.includes(doc.data().name)
          ) {
            await db
              .collection("groceries")
              .doc(doc.id)
              .update({ isBought: true });
            bought.push(doc.data().name);
          }
        }
      }
      res.setHeader("Content-Type", "text/xml");
      return res
        .status(200)
        .send(
          `<Response><Message>🛒 ${bought.join(", ")} הוכנסו לעגלה.</Message></Response>`,
        );
    }

    if (aiData.intent === "delete") {
      const snapshot = await db
        .collection("groceries")
        .where("listId", "==", LIST_ID)
        .get();
      for (const aiItem of aiData.items) {
        for (const doc of snapshot.docs) {
          if (
            doc.data().name.includes(aiItem.name) ||
            aiItem.name.includes(doc.data().name)
          ) {
            await db.collection("groceries").doc(doc.id).delete();
          }
        }
      }
      res.setHeader("Content-Type", "text/xml");
      return res
        .status(200)
        .send(`<Response><Message>🗑️ המוצר נמחק מהמערכת.</Message></Response>`);
    }
  } catch (error) {
    console.error(error);
    res.setHeader("Content-Type", "text/xml");
    res
      .status(200)
      .send(`<Response><Message>תקלה בשרת 🤕</Message></Response>`);
  }
}
