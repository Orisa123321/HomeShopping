const admin = require('firebase-admin');
const serviceAccount = require('./home-shopping-sharabi-firebase-adminsdk-fbsvc-65677bf361.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  console.log("מתחבר ל-Firestore ומחשב נתונים...");
  const catalogRef = db.collection('product_catalog');
  
  // ספירת סך הכל
  const totalSnapshot = await catalogRef.count().get();
  const totalCount = totalSnapshot.data().count;
  
  // ספירת אלו שיש להם מחיר
  const priceSnapshot = await catalogRef.where('hasPrice', '==', true).count().get();
  const priceCount = priceSnapshot.data().count;
  
  console.log(`\n=== נתוני קטלוג המוצרים ===`);
  console.log(`סך הכל מוצרים בקטלוג: ${totalCount}`);
  console.log(`מוצרים עם מחיר מעודכן: ${priceCount}`);
  const pct = totalCount > 0 ? (priceCount / totalCount * 100) : 0;
  console.log(`אחוז כיסוי מחירים: ${pct.toFixed(2)}%`);
  console.log(`===========================\n`);
}

run().catch(console.error);
