/// <reference types="vite/client" />

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, limit, query, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import firebaseConfigJson from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId || ""
};

// If the configured projectId is different from the sandbox (e.g., custom tathkeer-reminders), 
// always connect to the '(default)' database of that project.
const databaseId = (firebaseConfig.projectId && firebaseConfig.projectId !== firebaseConfigJson.projectId)
  ? undefined
  : (firebaseConfigJson.firestoreDatabaseId || undefined);

// Check if credentials are set
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

const app = isFirebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? (databaseId ? getFirestore(app, databaseId) : getFirestore(app)) : null;

// Immediate connection test as requested
if (isFirebaseConfigured && db) {
  console.log("[Firebase Debug] Starting Firestore connectivity test to project:", firebaseConfig.projectId, "with databaseId:", databaseId || "(default)");
  
  getDocs(query(collection(db, "usernames"), limit(1)))
    .then((snap) => {
      console.log("🎉 [Firebase Debug] Firestore connection OK! Successfully accessed 'usernames' collection on project:", firebaseConfig.projectId);
    })
    .catch((err) => {
      console.error("❌ [Firebase Debug] Firestore connection FAILED:", {
        code: err.code,
        message: err.message,
        name: err.name,
        stack: err.stack
      });
    });
} else {
  console.log("[Firebase Debug] Firebase is not fully configured yet. Credentials missing in Secrets.");
}

// Programmatic test user registration sequence on start
if (isFirebaseConfigured && auth && db) {
  const testEmail = "testadmin@example.com";
  const testPassword = "AdminTest123456!";
  const testUsername = "testadmin";

  const attemptTestUserCreation = async () => {
    try {
      console.log("[Firebase Debug] Checking / creating test user:", testEmail);
      
      const usernameDocRef = doc(db, "usernames", testUsername);
      const usernameSnapshot = await getDoc(usernameDocRef);
      
      if (usernameSnapshot.exists()) {
        console.log("🎉 [Firebase Debug] Test user 'testadmin' already exists in Firestore! Attempting test login to verify Firestore & Auth together...");
        const userCred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        console.log("🎉 [Firebase Debug] Test login success! User UID:", userCred.user.uid);
        return;
      }
      
      // Attempt creation
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      const uid = userCredential.user.uid;
      console.log("🎉 [Firebase Debug] Test User Auth registered successfully! UID:", uid);
      
      // Create users document
      await setDoc(doc(db, "users", uid), {
        username: testUsername,
        email: testEmail,
        createdAt: new Date().toISOString(),
        subType: "free_trial",
        subStartDate: new Date().toISOString(),
        timezone: "Asia/Riyadh"
      });
      console.log("🎉 [Firebase Debug] Test User document created in Firestore 'users'!");

      // Create username reservation
      await setDoc(usernameDocRef, {
        uid: uid,
        email: testEmail
      });
      console.log("🎉 [Firebase Debug] Username 'testadmin' registered in Firestore 'usernames'!");

    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        console.log("🎉 [Firebase Debug] Auth account already exists. Signing in to verify credentials and ensure Firestore DB sync...");
        try {
          const userCred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
          const uid = userCred.user.uid;
          console.log("🎉 [Firebase Debug] Test login success! User UID:", uid);
          
          const userDoc = await getDoc(doc(db, "users", uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, "users", uid), {
              username: testUsername,
              email: testEmail,
              createdAt: new Date().toISOString(),
              subType: "free_trial",
              subStartDate: new Date().toISOString(),
              timezone: "Asia/Riyadh"
            });
            console.log("🎉 [Firebase Debug] Created missing users document for test account!");
          }
        } catch (loginErr: any) {
          console.error("❌ [Firebase Debug] Login verification failed:", loginErr.code, loginErr.message);
        }
      } else {
        if (err.code === "permission-denied") {
          console.warn("⚠️ [Firebase Debug] Firestore rules currently deny access. To enable initial checks and registration, make sure to deploy the security rules defined in firestore.rules onto your project (tathkeer-reminders).");
        } else if (err.code === "auth/operation-not-allowed") {
          console.warn("⚠️ [Firebase Debug] Email/Password Authentication is not enabled. Go to your Firebase Console -> Authentication -> Sign-in Method, and Enable 'Email/Password' to resolve auth/operation-not-allowed.");
        } else {
          console.error("❌ [Firebase Debug] Unexpected test user creation error:", err.code, err.message);
        }
      }
    }
  };

  // Run with 3 second delay to wait for bundle to fully bootstrap
  setTimeout(attemptTestUserCreation, 3000);
}

export function getFirebaseAuth() {
  if (!auth) {
    throw new Error("خطأ: لم يتم تهيئة Firebase. يرجى إضافة مفاتيح الإعداد في ملف الـ Secrets.");
  }
  return auth;
}

export function getFirebaseDb() {
  if (!db) {
    throw new Error("خطأ: لم يتم تهيئة قاعدة بيانات Firestore. يرجى إضافة مفاتيح الإعداد في الـ Secrets.");
  }
  return db;
}
