const admin = require('firebase-admin');
const serviceAccount = require('./home-shopping-sharabi-firebase-adminsdk-fbsvc-65677bf361.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// רשימת ה-UIDs שברצוננו להפריד ולהחזיר לרשימה פרטית
const uidsToReset = [
  'shzIRAykh4M4AnlGLximHKwp51O2',
  'tNigawQ0ETZX0O9N6EHeItED2TH3',
  'UUJvEtU7kScwmcnYW5kWFJSSXTH2'
];

async function resetUsers() {
  console.log("Resetting list IDs to individual UIDs...");
  for (const uid of uidsToReset) {
    const userRef = db.collection('users').doc(uid);
    await userRef.update({ listId: uid });
    console.log(`Successfully reset listId for UID: ${uid} to its own UID.`);
  }
  console.log("Done!");
}

resetUsers().catch(err => {
  console.error('Error running script:', err);
});
