import admin from "firebase-admin";

const hasAdminCredentials = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY,
);

if (!admin.apps.length && hasAdminCredentials) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminApp = admin.apps[0] ?? null;

export const adminDb = adminApp ? admin.firestore(adminApp) : null;
export const adminAuth = adminApp ? admin.auth(adminApp) : null;
export const hasFirebaseAdmin = Boolean(adminApp);

