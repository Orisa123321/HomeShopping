const admin = require('firebase-admin');
const serviceAccount = require('./home-shopping-sharabi-firebase-adminsdk-fbsvc-65677bf361.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUsers() {
  console.log("Fetching users from Firestore...");
  const snapshot = await db.collection('users').get();
  if (snapshot.empty) {
    console.log('No users found in "users" collection.');
    return;
  }
  
  snapshot.forEach(doc => {
    console.log(`User UID: ${doc.id}`);
    console.log(`Data:`, doc.data());
    console.log('------------------------------------');
  });
}

checkUsers().catch(err => {
  console.error('Error running script:', err);
});
