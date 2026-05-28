const admin = require('firebase-admin');
const serviceAccount = require('./home-shopping-sharabi-firebase-adminsdk-fbsvc-65677bf361.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  console.log("Analyzing catalog deeply...");
  const catalogRef = db.collection('product_catalog');
  const snapshot = await catalogRef.get();
  
  let total = 0;
  let withPrice = 0;
  let withoutPrice = 0;
  let withBarcode = 0;
  let withoutBarcode = 0;
  let scrapedOnce = 0;
  let scrapedButNoPrice = 0;
  
  snapshot.forEach(doc => {
    total++;
    const data = doc.data();
    if (data.hasPrice) withPrice++;
    else withoutPrice++;
    
    if (data.barcode && String(data.barcode).trim().length > 0) withBarcode++;
    else withoutBarcode++;
    
    if (data.lastScraped && data.lastScraped > 0) {
      scrapedOnce++;
      if (!data.hasPrice) {
        scrapedButNoPrice++;
      }
    }
  });
  
  console.log(`\n=== CATALOG DEEP DIVE ===`);
  console.log(`Total: ${total}`);
  console.log(`With Price: ${withPrice}`);
  console.log(`Without Price: ${withoutPrice}`);
  console.log(`With Barcode: ${withBarcode}`);
  console.log(`Without Barcode: ${withoutBarcode}`);
  console.log(`Scraped at least once: ${scrapedOnce}`);
  console.log(`Scraped but no price found (404): ${scrapedButNoPrice}`);
  console.log(`Not scraped yet: ${total - scrapedOnce}`);
  console.log(`===========================\n`);
}

run().catch(console.error);
