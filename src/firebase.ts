/// <reference types="vite/client" />

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, limit, query, getDocs, doc, getDoc, setDoc, where } from "firebase/firestore";
import firebaseConfigJson from "../firebase-applet-config.json";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId || ""
};

// If the configured projectId is "tathkeer-reminders" or is different from the original sandbox project, 
// always connect to the '(default)' database of that project.
export const databaseId = (firebaseConfig.projectId === "tathkeer-reminders" || (firebaseConfig.projectId && firebaseConfig.projectId !== "gen-lang-client-0171705870"))
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

  const seedTestEvent = async (uid: string) => {
    try {
      const q = query(collection(db!, "events"), where("userId", "==", uid), limit(10));
      const eventsSnap = await getDocs(q);
      const exists = eventsSnap.docs.some(doc => doc.data().title === "اختبار تذكير تيليجرام من المجدول");
      
      if (!exists) {
        const testEventRef = doc(collection(db!, "events"));
        await setDoc(testEventRef, {
          userId: uid,
          title: "اختبار تذكير تيليجرام من المجدول",
          eventTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: "active",
          notes: "تنبيه تلقائي مجدول للاختبار الفعلي لنظام الإشعارات عبر تيليجرام",
          link: "https://t.me/MySchedulerReminder_Bot",
          createdAt: new Date().toISOString(),
          reminderRules: [
            {
              type: "minutes_before",
              minutesBefore: 30,
              channels: ["telegram"]
            }
          ]
        });
        console.log("🎉 [Firebase Debug] Seeded test reminder event for testadmin!");
      } else {
        console.log("[Firebase Debug] Test event already exists. No need to seed.");
      }
    } catch (e) {
      console.error("[Firebase Debug] Failed to seed test event:", e);
    }
  };

  const attemptTestUserCreation = async () => {
    try {
      console.log("[Firebase Debug] Checking / creating test user:", testEmail);
      
      const usernameDocRef = doc(db, "usernames", testUsername);
      const usernameSnapshot = await getDoc(usernameDocRef);
      
      if (usernameSnapshot.exists()) {
        console.log("🎉 [Firebase Debug] Test user 'testadmin' already exists in Firestore! Attempting test login to verify Firestore & Auth together...");
        const userCred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        const uid = userCred.user.uid;
        console.log("🎉 [Firebase Debug] Test login success! User UID:", uid);
        
        // Ensure user document has all required fields (telegramToken, subEndDate, subType)
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const ud = userDoc.data();
          if (!ud.telegramToken || !ud.subEndDate) {
            await setDoc(userDocRef, {
              ...ud,
              telegramToken: ud.telegramToken || "testadmin_tg_token_2026",
              subEndDate: ud.subEndDate || "2030-01-01T00:00:00Z",
              subType: ud.subType || "free_trial",
              referralCode: ud.referralCode || "TA2026",
              updatedAt: new Date().toISOString()
            }, { merge: true });
            console.log("🎉 [Firebase Debug] Updated existing test user with required fields (token, subscription).");
          }
        }
        
        await seedTestEvent(uid);
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
        subEndDate: "2030-01-01T00:00:00Z",
        timezone: "Asia/Riyadh",
        telegramToken: "testadmin_tg_token_2026",
        referralCode: "TA2026"
      });
      console.log("🎉 [Firebase Debug] Test User document created in Firestore 'users'!");

      // Create username reservation
      await setDoc(usernameDocRef, {
        uid: uid,
        email: testEmail
      });
      console.log("🎉 [Firebase Debug] Username 'testadmin' registered in Firestore 'usernames'!");

      await seedTestEvent(uid);

    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        console.log("🎉 [Firebase Debug] Auth account already exists. Signing in to verify credentials and ensure Firestore DB sync...");
        try {
          const userCred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
          const uid = userCred.user.uid;
          console.log("🎉 [Firebase Debug] Test login success! User UID:", uid);
          
          const userDocRef = doc(db, "users", uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              username: testUsername,
              email: testEmail,
              createdAt: new Date().toISOString(),
              subType: "free_trial",
              subStartDate: new Date().toISOString(),
              subEndDate: "2030-01-01T00:00:00Z",
              timezone: "Asia/Riyadh",
              telegramToken: "testadmin_tg_token_2026",
              referralCode: "TA2026"
            });
            console.log("🎉 [Firebase Debug] Created missing users document for test account!");
          } else {
            const ud = userDoc.data();
            if (!ud.telegramToken || !ud.subEndDate) {
              await setDoc(userDocRef, {
                telegramToken: "testadmin_tg_token_2026",
                subEndDate: "2030-01-01T00:00:00Z",
                referralCode: "TA2026"
              }, { merge: true });
              console.log("🎉 [Firebase Debug] Merged required fields into test user document.");
            }
          }
          await seedTestEvent(uid);
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
