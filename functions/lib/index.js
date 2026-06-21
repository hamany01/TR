"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desktopApi = exports.telegramBotWebhook = exports.triggerSchedulerManual = exports.runReminderScheduler = void 0;
const admin = require("firebase-admin");
// تهيئة Firebase Admin SDK لخدمة كافة الدوال والاتصالات في Firestore بقوة كاملة
admin.initializeApp();
// تصدير الدوال المختلفة ومجدول التذكير الديناميكي
var scheduler_1 = require("./scheduler");
Object.defineProperty(exports, "runReminderScheduler", { enumerable: true, get: function () { return scheduler_1.runReminderScheduler; } });
Object.defineProperty(exports, "triggerSchedulerManual", { enumerable: true, get: function () { return scheduler_1.triggerSchedulerManual; } });
var telegram_1 = require("./telegram");
Object.defineProperty(exports, "telegramBotWebhook", { enumerable: true, get: function () { return telegram_1.telegramBotWebhook; } });
var desktopApi_1 = require("./desktopApi");
Object.defineProperty(exports, "desktopApi", { enumerable: true, get: function () { return desktopApi_1.desktopApi; } });
//# sourceMappingURL=index.js.map