import { GoogleGenerativeAI } from "@google/generative-ai";
import { showToast } from "./helpers.js";

// שליפת מפתחות API
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// אתחול Gemini במידה וקיים מפתח
export const genAI = GEMINI_API_KEY
  ? new GoogleGenerativeAI(GEMINI_API_KEY)
  : null;

/**
 * פונקציית עזר לחילוץ ופירסום אמין של JSON מטקסט ה-AI
 */
function parseJsonSafely(text) {
  try {
    const startIndex = text.indexOf("{");
    const endIndex = text.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("לא נמצאו סוגריים מסולסלים בטקסט");
    }
    const cleanJson = text.substring(startIndex, endIndex + 1);
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("JSON parsing failed for text:", text, err);
    throw new Error("התקבלה תשובה במבנה לא תקין מהשרת");
  }
}

/**
 * מנגנון גיבוי היררכי עבור קריאות טקסט (Gemini -> Groq -> Local Fallback)
 */
let geminiDisabledUntil = 0; // timestamp שאחריו ננסה Gemini שוב

async function callTextAiWithFallback(prompt, expectJson, localFallbackFn) {
  const now = Date.now();
  // --- שלב 1: ניסיון עם GEMINI (רק אם לא חסום זמנית) ---
  if (genAI && now > geminiDisabledUntil) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const responseText = await result.response.text();
      return expectJson ? parseJsonSafely(responseText) : responseText;
    } catch (geminiError) {
      console.warn("Gemini failed, disabling for 5 minutes...", geminiError);
      geminiDisabledUntil = now + 5 * 60 * 1000; // חסום ל-5 דקות
      if (GROQ_API_KEY) {
        showToast("מכסת Gemini הסתיימה. עובר ל-Groq AI רזרבי! 🔄", "info");
      }
    }
  }

  // --- שלב 2: ניסיון עם GROQ ---
  if (GROQ_API_KEY) {
    try {
      const body = {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      };
      if (expectJson) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        throw new Error(`Groq responded with status ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.choices[0].message.content;

      if (expectJson) {
        return parseJsonSafely(responseText);
      }
      return responseText;
    } catch (groqError) {
      console.error("Groq failed, running local fallback...", groqError);
      showToast("שרתי ה-AI עמוסים. מפעיל עוזר קול קומי מקומי! 🧠", "info");
    }
  } else if (genAI) {
    // אם Gemini נכשל ואין מפתח Groq בכלל
    showToast("שרת ה-AI אינו זמין. מפעיל עוזר מקומי חלופי! 🧠", "info");
  }

  // --- שלב 3: הפעלת ה-FALLBACK המקומי (ללא תלות ברשת) ---
  return localFallbackFn();
}

/* ==========================================
   הגדרת הפונקציות הציבוריות עבור האפליקציה
   ========================================== */

/**
 * 1. יצירת מתכון ממצרכים או קישור
 */
export const getAiRecipe = async (inputData, isUrl = false) => {
  let prompt = "";
  if (isUrl) {
    prompt = `קרא את המתכון מהקישור הבא: ${inputData}. 
    חלץ את הנתונים והחזר את התשובה בפורמט JSON בלבד, בעברית, ללא שום טקסט נוסף, עם המפתחות הבאים:
    "title": שם המנה
    "ingredients": מערך של מצרכים
    "instructions": מערך של שלבי הכנה
    "time": זמן הכנה מוערך`;
  } else {
    prompt = `אתה שף מקצועי. יש לי במזווה את המצרכים הבאים: ${inputData.join(", ")}. 
    תמציא לי מתכון אחד יצירתי וטעים שאפשר להכין מהם (מותר להניח שיש מוצרי יסוד כמו שמן ותבלינים).
    חובה להחזיר את התשובה בפורמט JSON בלבד, בעברית, ללא שום טקסט נוסף, עם המפתחות:
    "title": שם המנה
    "ingredients": מערך של מצרכים
    "instructions": מערך של שלבי הכנה
    "time": זמן הכנה מוערך`;
  }

  // לוגיקת נסיגה מקומית עבור מתכונים
  const localRecipeFallback = () => {
    if (isUrl) {
      return {
        title: "מתכון מותאם מהקישור",
        ingredients: ["מצרכי בסיס (לפי הקישור)", "תוספות לבחירה"],
        instructions: [
          "יש לעיין בקישור המקור לקבלת הוראות מפורטות",
          "לבשל או לאפות בהתאם",
          "להגיש חם בתיאבון!",
        ],
        time: "30 דקות",
      };
    }

    const ingStr = inputData.join(" ").toLowerCase();
    if (ingStr.includes("ביצ") || ingStr.includes("עגבני")) {
      return {
        title: "שקשוקה ביתית מהירה (גיבוי מקומי)",
        ingredients: [...inputData, "בצל", "שום", "שמן זית", "תבלינים"],
        instructions: [
          "קוצצים את הבצל והעגבניות ומטגנים במחבת עם שמן זית ושום",
          "מוסיפים תבלינים ומבשלים 10 דקות לקבלת רוטב סמיך",
          "יוצרים גומחות ברוטב ושוברים פנימה את הביצים",
          "מבשלים על אש נמוכה עד למידת העשייה הרצויה",
        ],
        time: "20 דקות",
      };
    }

    if (
      ingStr.includes("עוף") ||
      ingStr.includes("בשר") ||
      ingStr.includes("פרגית")
    ) {
      return {
        title: "מוקפץ עוף מהיר של הבית (גיבוי מקומי)",
        ingredients: [...inputData, "בצל", "שמן", "פפריקה ומלח"],
        instructions: [
          "חותכים את העוף לקוביות ומטגנים במחבת חמה עם מעט שמן ותבלינים",
          "מוסיפים ירקות שיש בבית ומקפיצים 5-10 דקות נוספות",
          "מגישים חם וטרי בתיאבון!",
        ],
        time: "20 דקות",
      };
    }

    return {
      title: "תבשיל השף המהיר ממצרכי הבית (גיבוי מקומי)",
      ingredients: [...inputData, "שמן זית", "תבליני בית בסיסיים"],
      instructions: [
        "חותכים את המצרכים לקוביות קטנות",
        "מטגנים קלות בסיר או מחבת עם שמן זית",
        "מוסיפים מעט מים ותבלינים, מכסים ומבשלים על אש בינונית עד לריכוך",
      ],
      time: "15 דקות",
    };
  };

  return callTextAiWithFallback(prompt, true, localRecipeFallback);
};

/**
 * 2. ניתוח תזונתי של העגלה
 */
export const getCartNutrition = async (itemsList) => {
  const itemsString = itemsList
    .map((item) => `${item.target} ${item.name}`)
    .join(", ");
  const prompt = `אתה תזונאי מומחה. הנה רשימת קניות של משפחה ישראלית: ${itemsString}.
  אנא נתח את הרשימה והחזר הערכה גסה של הערכים התזונתיים עבור *כל הסל כולו*.
  חובה להחזיר את התשובה בפורמט JSON בלבד, בעברית, ללא שום טקסט נוסף או סימוני Markdown (כמו \`\`\`json), עם המפתחות הבאים בדיוק:
  "calories": מספר (הערכת קלוריות כוללת, למשל 15000),
  "protein": מספר (הערכת גרם חלבון כולל, למשל 450),
  "healthScore": ציון מ-1 עד 10 עד כמה הסל בריא,
  "summary": משפט סיכום קצר וקולע (עד 15 מילים) על בריאות הסל,
  "tip": טיפ אחד קצר לשיפור הבריאות של הסל הזה ספציפית.`;

  // לוגיקת נסיגה מקומית עבור ניתוח תזונתי
  const localNutritionFallback = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    let healthyCount = 0;
    const totalCount = itemsList.length || 1;

    itemsList.forEach((item) => {
      const name = item.name.toLowerCase();
      const qty = item.qty || item.target || 1;

      if (
        name.includes("שמן") ||
        name.includes("חמאה") ||
        name.includes("טחינה")
      ) {
        totalCalories += 900 * qty;
      } else if (
        name.includes("בשר") ||
        name.includes("עוף") ||
        name.includes("דג") ||
        name.includes("טונה")
      ) {
        totalCalories += 250 * qty;
        totalProtein += 25 * qty;
        healthyCount += 1;
      } else if (
        name.includes("גבינ") ||
        name.includes("חלב") ||
        name.includes("קוטג'") ||
        name.includes("יוגורט")
      ) {
        totalCalories += 150 * qty;
        totalProtein += 8 * qty;
        healthyCount += 1;
      } else if (
        name.includes("לחם") ||
        name.includes("פסטה") ||
        name.includes("אורז")
      ) {
        totalCalories += 350 * qty;
        totalProtein += 6 * qty;
      } else if (
        name.includes("ירק") ||
        name.includes("עגבני") ||
        name.includes("מלפפון") ||
        name.includes("בצל") ||
        name.includes("פרי")
      ) {
        totalCalories += 50 * qty;
        totalProtein += 1 * qty;
        healthyCount += 2;
      } else if (
        name.includes("שוקולד") ||
        name.includes("חטיף") ||
        name.includes("מתוק") ||
        name.includes("קולה")
      ) {
        totalCalories += 450 * qty;
        healthyCount -= 1;
      } else {
        totalCalories += 120 * qty;
        totalProtein += 3 * qty;
        healthyCount += 0.5;
      }
    });

    if (totalCalories < 1000) totalCalories = Math.max(1200, totalCount * 180);
    if (totalProtein < 20) totalProtein = Math.max(30, totalCount * 5);

    const rawScore = 5 + (healthyCount / totalCount) * 5;
    const healthScore = Math.max(1, Math.min(10, Math.round(rawScore)));

    let summary =
      "סל קניות מגוון ומאוזן המכיל את אבות המזון הבסיסיים המומלצים.";
    let tip =
      "מומלץ להוסיף ירקות ירוקים נוספים לשיפור כמות הסיבים התזונתיים בסל.";

    if (healthScore >= 8) {
      summary =
        "סל בריא ומצוין! מכיל המון חלבונים רזים, ירקות טריים ודגנים מזינים.";
      tip = "הסל מושלם. ניתן להוסיף אגוזים וזרעים לשומנים בריאים מן הצומח.";
    } else if (healthScore <= 4) {
      summary = "הסל מכיל אחוז גבוה של פחמימות פשוטות ומזונות מעובדים.";
      tip =
        "מומלץ להחליף חלק מהחטיפים בפירות טריים, יוגורט חלבון או ירקות חתוכים.";
    }

    return {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      healthScore,
      summary,
      tip,
    };
  };

  return callTextAiWithFallback(prompt, true, localNutritionFallback);
};

/**
 * 3. מתכון "הצלת מזון" מהמזווה
 */

/**
 * 3. מתכון "הצלת מזון" מהמזווה
 */
export const getRescueRecipe = async (expiringItems) => {
  // הגדרת הפרומפט מחוץ ללוגיקת הגיבוי כדי שיהיה זמין
  const prompt = `
    אתה שף מומחה ב"הצלת מזון" (Zero Waste).
    במזווה של המשתמש יש את המצרכים הבאים שעומדים לפוג תוקף ממש בקרוב: ${expiringItems.join(", ")}.
    הצע מתכון אחד יצירתי, טעים וקל להכנה שמשתמש בכמה שיותר מהמצרכים האלה כדי שלא ייזרקו לפח.
    אל תמציא בשר/דגים/חלב אם אין ברשימה, אבל אתה יכול להניח שיש מצרכי בסיס בבית כמו תבלינים, שמן ומלח.
    
    החזר את התשובה מעוצבת יפה:
    🌟 [שם המנה הקליט]
    
    🛒 מצרכים להצלה: [רשימת המצרכים מהמזווה שלנו]
    
    👨‍🍳 אופן הכנה:
    [שלבים קצרים]
  `;

  const localRescueFallback = () => {
    const title = "פשטידת 'הצלת המזון' המהירה";
    return `🌟 ${title}

🛒 מצרכים להצלה: ${expiringItems.join(", ")}

👨‍🍳 אופן הכנה:
1. קוצצים את כל המצרכים לקוביות קטנות או מגרדים בפומפייה גסה.
2. בקערה נפרדת טורפים 2-3 ביצים עם גבינה לבנה, קוטג' או יוגורט שיש במקרר, מלח ופלפל.
3. מערבבים את המצרכים יחד עם תערובת הביצים והגבינה ויוצקים לתבנית משומנת.
4. אופים בתנור שחומם מראש ל-180 מעלות במשך 30-35 דקות עד להזהבה יפה.
5. מגישים חם ומונעים זריקת אוכל לפח!`;
  };

  const responseText = await callTextAiWithFallback(
    prompt,
    false,
    localRescueFallback,
  );
  return {
    ingredients: expiringItems,
    recipeText: responseText,
  };
};

/**
 * 4. בניית רשימת קניות ותפריט שבועי חכם
 */
export const getSmartGroceryList = async (answers) => {
  const prompt = `
    אתה שף ועוזר קניות חכם. המשתמש רוצה לבנות רשימת קניות ותפריט מאפס, בלחיצת כפתור.
    
    הנה הפרופיל שלו לשבוע הקרוב:
    - הרכב סועדים: ${answers.adults} מבוגרים, ${answers.kids} ילדים.
    - הגבלות/העדפות תזונה: ${answers.diets.length > 0 ? answers.diets.join(", ") : "אוכלים הכל (אין הגבלות)"}.
    - סגנון בישול מבוקש: ${answers.vibes.length > 0 ? answers.vibes.join(", ") : "בישול ביתי רגיל"}.
    - ארוחות שצריך לתכנן עבורן: ${answers.meals.length > 0 ? answers.meals.join(", ") : "ארוחות ערב כלליות"}.
    - האם לכלול מוצרי יסוד (חלב, לחם, ביצים)? ${answers.needsBasics ? "כן" : "לא"}.

    המשימה שלך:
    1. הצע 5-8 מוצרי יסוד ונשנושים שמתאימים למשפחה בהרכב הזה (אם ביקש מוצרי יסוד).
    2. הצע 3 עד 4 ארוחות/תבשילים מדויקים שקולעים בול לסגנון (Vibe) ולארוחות (Meals) שהוא בחר. התאם את האוכל לילדים אם צוין שיש ילדים.
    3. פרק כל תבשיל למצרכים, עם כמויות הגיוניות עבור ${answers.adults + answers.kids} סועדים.
    
    החזר אך ורק JSON טהור במבנה הבא:
    {
      "basics": [{"name": "מוצר", "qty": 1, "category": "קטגוריה"}],
      "dishes": [
        {
          "dishName": "שם התבשיל",
          "ingredients": [{"name": "מצרך", "qty": 1, "category": "קטגוריה"}],
          "recipeLink": "הסבר קצר להכנה (עד 2 משפטים)"
        }
      ]
    }
  `;

  // לוגיקת נסיגה מקומית עבור תכנון קניות שבועי
  const localSmartListFallback = () => {
    const adultCount = parseInt(answers.adults) || 2;
    const kidCount = parseInt(answers.kids) || 0;
    const totalPeople = adultCount + kidCount;

    const basics = [];
    if (answers.needsBasics) {
      basics.push(
        {
          name: "חלב 3%",
          qty: Math.max(1, Math.ceil(totalPeople / 2)),
          category: "מוצרי חלב",
        },
        {
          name: "לחם פרוס טרי",
          qty: Math.max(1, Math.ceil(totalPeople / 3)),
          category: "לחם ומאפים",
        },
        {
          name: "ביצים L",
          qty: totalPeople > 3 ? 2 : 1,
          category: "ביצים וסלטים",
        },
        { name: "גבינה צהובה", qty: 1, category: "מוצרי חלב" },
        {
          name: "עגבניות ומלפפונים",
          qty: Math.max(1, Math.ceil(totalPeople / 2)),
          category: "פירות וירקות",
        },
      );
    }

    const dietsStr = answers.diets.join(" ").toLowerCase();
    const dishes = [];

    if (dietsStr.includes("טבעוני") || dietsStr.includes("צמחוני")) {
      dishes.push(
        {
          dishName: "קארי גרגירי חומוס וירקות עשיר",
          ingredients: [
            {
              name: "גרגירי חומוס מבושלים",
              qty: Math.max(1, Math.ceil(totalPeople / 4)),
              category: "שימורים ויבש",
            },
            { name: "קרם קוקוס", qty: 1, category: "שימורים ויבש" },
            { name: "לקט ירקות קפוא לקארי", qty: 1, category: "קפואים" },
            { name: "אורז בסמטי", qty: 1, category: "שימורים ויבש" },
          ],
          recipeLink:
            "מטגנים בצל ומוסיפים ירקות וקרם קוקוס. מגישים על אורז לבן חם.",
        },
        {
          dishName: "פסטה ברוטב עגבניות ועדשים אדומות",
          ingredients: [
            {
              name: "פסטה",
              qty: Math.max(1, Math.ceil(totalPeople / 3)),
              category: "שימורים ויבש",
            },
            { name: "רוטב עגבניות מוכן", qty: 1, category: "שימורים ויבש" },
            { name: "עדשים אדומות", qty: 1, category: "שימורים ויבש" },
          ],
          recipeLink:
            "מבשלים עדשים בתוך רוטב עגבניות ומאחדים עם הפסטה המבושלת.",
        },
      );
    } else {
      dishes.push(
        {
          dishName: "פסטה בולונז בשרית עשירה",
          ingredients: [
            {
              name: "בשר בקר טחון טרי",
              qty: Math.max(1, Math.ceil(totalPeople * 0.15)),
              category: "בשר ודגים",
            },
            {
              name: "פסטה ספגטי",
              qty: Math.max(1, Math.ceil(totalPeople / 3)),
              category: "שימורים ויבש",
            },
            { name: "רסק עגבניות מוכן", qty: 2, category: "שימורים ויבש" },
          ],
          recipeLink:
            "מטגנים בצל ובשר, מוסיפים את רוטב העגבניות ומבשלים שעה. מגישים על פסטה חמה.",
        },
        {
          dishName: "שניצל ביתי פריך ופירה תפוחי אדמה",
          ingredients: [
            {
              name: "חזה עוף פרוס לשניצל",
              qty: Math.max(1, Math.ceil(totalPeople * 0.25)),
              category: "בשר ודגים",
            },
            {
              name: "תפוחי אדמה",
              qty: Math.max(2, Math.ceil(totalPeople * 1.5)),
              category: "פירות וירקות",
            },
            { name: "פירורי לחם ושומשום", qty: 1, category: "שימורים ויבש" },
          ],
          recipeLink:
            "מצפים שניצלים בביצה ופירורי לחם ומטגנים. מכינים פירה נימוח מתפוחי אדמה מבושלים.",
        },
      );
    }

    if (kidCount > 0) {
      dishes.push({
        dishName: "פיצה פיתה משפחתית מהירה",
        ingredients: [
          {
            name: "פיתות טריות",
            qty: Math.max(1, Math.ceil(totalPeople)),
            category: "לחם ומאפים",
          },
          { name: "רוטב פיצה מוכן", qty: 1, category: "שימורים ויבש" },
          { name: "גבינת מוצרלה צהובה", qty: 1, category: "מוצרי חלב" },
        ],
        recipeLink:
          "מורחים רוטב וגבינה על פיתות חצויות ואופים בטוסטר אובן או תנור כ-8 דקות.",
      });
    }

    return { basics, dishes };
  };

  return callTextAiWithFallback(prompt, true, localSmartListFallback);
};

/**
 * 5. סריקת קבלה חכמה (Gemini Vision -> Groq Vision -> Error message)
 */
export const getReceiptScan = async (base64data, mimeType) => {
  const prompt = `
    אתה קורא קבלות ישראליות מומחה של סופרמרקטים. קרא את הקבלה המצורפת.
    חלץ את שם הרשת (אם לא רשום, תנחש לפי הלוגו או שתכתוב "סופרמרקט"), ואת כל המוצרים שנקנו.
    עבור כל מוצר חלץ: שם (נקה קיצורים מוזרים של קופות לשם מובן וקצר), כמות (אם לא צוין אז 1), מחיר כולל של השורה (המחיר ששולם בפועל על כמות זו), וקטגוריה הגיונית.
    החזר אך ורק JSON טהור במבנה הזה (בלי טקסט נוסף ובלי Markdown):
    {
      "store": "שם הרשת",
      "items": [
        { "name": "שם המוצר", "qty": 1, "price": 15.90, "category": "מוצרי חלב" }
      ]
    }
  `;

  const now = Date.now();

  // --- שלב 1: ניסיון עם GEMINI (מולטימודל) ---
  if (genAI && now > geminiDisabledUntil) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const imagePart = {
        inlineData: { data: base64data, mimeType },
      };

      // שליחת הפרומפט יחד עם חלקי התמונה כראוי
      const result = await model.generateContent([prompt, imagePart]);
      const responseText = await result.response.text();
      return parseJsonSafely(responseText);
    } catch (geminiError) {
      console.warn(
        "Gemini Vision failed, disabling for 5 minutes...",
        geminiError,
      );
      geminiDisabledUntil = now + 5 * 60 * 1000; // חסום ל-5 דקות
      if (GROQ_API_KEY) {
        showToast("מכסת Gemini הסתיימה. עובר ל-Groq Vision רזרבי! 📸", "info");
      }
    }
  }

  // --- שלב 2: ניסיון עם GROQ (מולטימודל LLaMA 3.2) ---
  if (GROQ_API_KEY) {
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.2-11b-vision-preview",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64data}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.1,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Groq Vision returned status ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.choices[0].message.content;
      return parseJsonSafely(responseText);
    } catch (err) {
      console.error("Groq Vision failed as well:", err);
    }
  }

  // --- שלב 3: כשלון מוחלט (תצוגת הודעת נפילה חיננית ללא קריסה) ---
  showToast(
    "שירות סריקת הקבלות ב-AI לא זמין כרגע. אנא הזן את המוצרים ידנית.",
    "error",
  );
  throw new Error("AI receipt scanning services are offline");
};

/**
 * 6. סידור קטגוריות חכם (AI)
 */
export const getAiCategorization = async (itemsList) => {
  // שולחים ל-AI רק את השמות כדי לחסוך טוקנים
  const itemsString = itemsList.map((i) => i.name).join(", ");

  const prompt = `
    אתה מנהל סופרמרקט מסודר. הנה רשימת מצרכים: ${itemsString}.
    אנא סווג כל מוצר לאחת מהקטגוריות הבאות בלבד: 
    "מוצרי חלב וביצים", "מאפייה ולחמים", "פירות וירקות", "בשר ודגים", "חטיפים ומתוקים", "שתייה ואלכוהול", "פארם וניקיון", "מזווה ושימורים", "כללי".
    החזר אך ורק JSON טהור במבנה הבא (בלי טקסט נוסף):
    {
      "categorizedItems": [
        { "name": "שם המוצר", "category": "הקטגוריה הנבחרת" }
      ]
    }
  `;

  // גיבוי אופליין קליל - פשוט מחזיר מערך ריק ואנחנו נטפל בזה באפליקציה ונשתמש בפונקציה הרגילה guessCategory
  const localFallback = () => ({ categorizedItems: [] });

  return callTextAiWithFallback(prompt, true, localFallback);
};

/**
 * 7. איחוד כפילויות חכם (AI)
 */
export const getAiMergeSuggestions = async (itemsList) => {
  // שולחים מזהים ושמות כדי שה-AI יגיד לנו את מי לאחד
  const itemsString = itemsList
    .map((i) => `{id: "${i.id}", name: "${i.name}"}`)
    .join(", ");

  const prompt = `
    אתה עוזר ארגון רשימות קניות. מצא ברשימה הבאה כפילויות של מוצרים דומים (למשל "עגבניה" ו-"עגבניות", או "חלב 3%" ו-"חלב").
    רשימה: ${itemsString}
    החזר רק את הקבוצות של המוצרים הכפולים (התעלם ממוצרים תקינים שאין להם כפילות).
    לכל קבוצה כפולה בחר שם אחד מוביל ואת ה-IDs של המוצרים שימוזגו אליו.
    החזר אך ורק JSON טהור במבנה הבא:
    {
      "merges": [
        { "keepName": "השם המוביל שנבחר", "mergeIds": ["id1", "id2"] }
      ]
    }
  `;

  // גיבוי אופליין - כרגע נחזיר ריק (קשה לזהות כפילויות חכמות אופליין בלי אלגוריתם מורכב)
  const localFallback = () => ({ merges: [] });

  return callTextAiWithFallback(prompt, true, localFallback);
};
