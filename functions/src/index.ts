import * as admin from "firebase-admin";

// تهيئة Firebase Admin SDK لخدمة كافة الدوال والاتصالات في Firestore بقوة كاملة
admin.initializeApp();

// تصدير الدوال المختلفة ومجدول التذكير الديناميكي
export { runReminderScheduler, triggerSchedulerManual } from "./scheduler";
export { telegramBotWebhook } from "./telegram";
export { desktopApi } from "./desktopApi";
