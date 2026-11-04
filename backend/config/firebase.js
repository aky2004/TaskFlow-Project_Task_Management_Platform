const path = require('path');
const fs = require('fs');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

/**
 * Firebase Admin SDK Initialization
 * Priority order:
 * 1. backend/config/serviceAccountKey.json file if present
 * 2. FIREBASE_SERVICE_ACCOUNT (JSON string in .env)
 * 3. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (.env)
 * 4. FIREBASE_PROJECT_ID (Public certificate validation)
 */
let firebaseApp = null;
let firebaseAuth = null;

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    firebaseAuth = getAuth(firebaseApp);
    return { app: firebaseApp, auth: firebaseAuth };
  }

  const localKeyPath = path.join(__dirname, 'serviceAccountKey.json');
  const projectId = process.env.FIREBASE_PROJECT_ID || 'taskflowprojectmanagement';

  try {
    if (fs.existsSync(localKeyPath)) {
      const serviceAccount = require('./serviceAccountKey.json');
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK initialized with local serviceAccountKey.json');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : process.env.FIREBASE_SERVICE_ACCOUNT;

      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK initialized with Service Account JSON from env');
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      firebaseApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase Admin SDK initialized with credentials from .env');
    } else {
      firebaseApp = initializeApp({
        projectId,
      });
      console.log(`✅ Firebase Admin SDK initialized with Project ID: ${projectId}`);
    }

    firebaseAuth = getAuth(firebaseApp);
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  }

  return { app: firebaseApp, auth: firebaseAuth };
};

// Initialize on module load
const { app, auth } = initializeFirebaseAdmin();

module.exports = {
  app,
  auth: () => firebaseAuth || getAuth(getApps()[0]),
  initializeFirebaseAdmin,
  isFirebaseConfigured: () => Boolean(getApps().length > 0),
};
