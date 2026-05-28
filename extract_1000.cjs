const fs = require("fs");
const zlib = require("zlib");
const xml2js = require("xml2js");

// נתיב הקובץ שהורדת
const gzFilePath = "./hatzi_hinam.gz";
const outputFilePath = "./my_new_products.json";

console.log("מתחיל לפתוח את הקובץ הדחוס...");

// קריאה ופתיחת הכיווץ בזמן אמת
const fileContents = fs.readFileSync(gzFilePath);
const unzipped = zlib.gunzipSync(fileContents);
const xmlData = unzipped.toString("utf-8");

console.log(
  "הקובץ נפתח בהצלחה! מתחיל לפענח את ה-XML (זה עשוי לקחת חצי דקה)...",
);

const parser = new xml2js.Parser({ explicitArray: false });

parser.parseString(xmlData, (err, result) => {
  if (err) {
    console.error("שגיאה בפענוח ה-XML:", err);
    return;
  }

  // ניווט לתוך מערך המוצרים (מבנה התקן הישראלי)
  const items = result.Root?.Items?.Item || [];
  console.log(`נמצאו סך הכל ${items.length} מוצרים בקובץ.`);

  const extractedProducts = [];
  let count = 0;

  for (const item of items) {
    const name = item.ItemName;
    const barcode = item.ItemCode;

    // סינון: נוודא שיש שם, יש ברקוד, ושזה לא סתם שקית ניילון או קוד פנימי קצר מדי
    if (name && barcode && barcode.length >= 10 && !name.includes("שקית")) {
      // ניקוי השם מרווחים מיותרים
      extractedProducts.push({
        name: name.trim().replace(/"/g, ""), // מסיר מרכאות כפולות שעושות בעיות
        barcode: barcode.trim(),
      });
      count++;
    }

  }

  // שמירת התוצאה לקובץ JSON חדש על המחשב
  fs.writeFileSync(
    outputFilePath,
    JSON.stringify(extractedProducts, null, 2),
    "utf-8",
  );

  console.log(
    `🎉 הושלם! ${extractedProducts.length} מוצרים נשמרו בהצלחה לקובץ: ${outputFilePath}`,
  );
});
