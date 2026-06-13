const admin = require('firebase-admin');

let app;

function getFirebaseAdmin() {
  if (app) return app;

  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey ||
      projectId === 'your-firebase-project-id') {
    // Firebase not yet configured — return a stub so the app still starts
    console.warn('[Firebase] ⚠ Firebase Admin not configured. Auth will fall back to JWT.');
    return null;
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  console.log('[Firebase] ✓ Admin SDK initialised for project:', projectId);
  return app;
}

module.exports = { getFirebaseAdmin, admin };
