import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sendTelegramReminder } from "./telegram";


/**
 * دالة دقيقة وموثوقة لاسترداد تفاصيل التاريخ والوقت في منطقة زمنية معينة باستخدام Intl.DateTimeFormat
 */
function formatInTimeZone(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return {
      year: parseInt(partMap.year, 10),
      month: parseInt(partMap.month, 10),
      day: parseInt(partMap.day, 10),
      hour: parseInt(partMap.hour, 10),
      minute: parseInt(partMap.minute, 10),
      second: parseInt(partMap.second, 10),
    };
  } catch (error) {
    // في حال وجود خطأ بالـ timezone، نرجع لـ UTC كخيار احتياطي ومستقر لمنع توقف الخدمة
    functions.logger.warn(`فشل تنسيق التوقيت لـ ${timeZone}، تم التراجع لـ UTC.`, error);
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    };
  }
}

/**
 * دالة مجدولة (Scheduled Cloud Function) يتم استدعاؤها تلقائياً كل دقيقة.
 */
export const runReminderScheduler = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context: any) => {
    const nowUTC = new Date();
    functions.logger.info(`بدء تشغيل جدولة التنبيهات الديناميكية (runReminderScheduler) عند: ${nowUTC.toISOString()}`);

    const db = admin.firestore();

    try {
      // 1. جلب كافة الأحداث النشطة فقط
      const eventsSnapshot = await db
        .collection("events")
        .where("status", "==", "active")
        .get();

      if (eventsSnapshot.empty) {
        functions.logger.info("لا توجد أحداث نشطة حالياً للمعالجة.");
        return null;
      }

      functions.logger.info(`تم العثور على ${eventsSnapshot.size} حدث نشط لمعالجته.`);

      // نجمع معلومات المستخدمين دفعة واحدة لتوفير استعلامات قراءة Firestore وتطبيق أداء ممتاز
      const userCache: { [uid: string]: any } = {};

      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id;
        const eventData = eventDoc.data();
        const userId = eventData.userId;

        if (!userId) continue;

        // 2. جلب وتخزين بيانات المستخدم مؤقتاً
        if (!userCache[userId]) {
          const userSnap = await db.collection("users").doc(userId).get();
          if (userSnap.exists()) {
            userCache[userId] = userSnap.data();
          } else {
            userCache[userId] = null;
          }
        }

        const userProfile = userCache[userId];
        if (!userProfile) {
          functions.logger.warn(`تخطّي الحدث ${eventId} لأن مستخدمه ${userId} غير موجود بالمنصة.`);
          continue;
        }

        // 3. التحقق من صلاحية اشتراك المستخدم
        const subEndDate = new Date(userProfile.subEndDate);
        if (subEndDate < nowUTC) {
          functions.logger.warn(`تخطّي الحدث ${eventId} لأن اشتراك المستخدم ${userId} منتهي الصلاحية (${userProfile.subEndDate}).`);
          continue;
        }

        const userTimezone = userProfile.timezone || "Asia/Riyadh";
        const eventTimeUTC = new Date(eventData.eventTime);

        // 4. مراجعة كل قاعدة تذكير (ReminderRule)
        const rules = eventData.reminderRules || [];
        for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
          const rule = rules[ruleIndex];
          const channels = rule.channels || ["telegram", "desktop", "browser"];

          let isTriggered = false;
          let timeKey = "";

          // أ) حساب وتطبيق قواعد الأيام الشاملة لمنطقة المستخدم (days_before)
          if (rule.type === "days_before") {
            const daysBefore = rule.daysBefore || 0;
            const targetTimes = rule.times || ["09:00"];

            // تحويل الآن ووقت الحدث بدقة لكل مستخدم حسب منطقته
            const nowLocal = formatInTimeZone(nowUTC, userTimezone);
            const eventLocal = formatInTimeZone(eventTimeUTC, userTimezone);

            const dateNowEpoch = Date.UTC(nowLocal.year, nowLocal.month - 1, nowLocal.day);
            const dateEventEpoch = Date.UTC(eventLocal.year, eventLocal.month - 1, eventLocal.day);

            // الفارق الحسابي الفعلي بالأيام
            const diffDays = Math.round((dateEventEpoch - dateNowEpoch) / (1000 * 60 * 60 * 24));

            if (diffDays === daysBefore) {
              // التحقق من توافق الساعة والدقيقة للمستخدم المحلي الآن
              const formatDigit = (num: number) => String(num).padStart(2, "0");
              const currentLocalHHMM = `${formatDigit(nowLocal.hour)}:${formatDigit(nowLocal.minute)}`;

              for (const targetTime of targetTimes) {
                if (currentLocalHHMM === targetTime) {
                  isTriggered = true;
                  // timeKey الفريد يسجل اليوم المستهدف والساعات
                  const targetDayStr = `${nowLocal.year}-${formatDigit(nowLocal.month)}-${formatDigit(nowLocal.day)}`;
                  timeKey = `days_${daysBefore}_${targetDayStr}_${targetTime}`;
                  break;
                }
              }
            }
          } 
          // ب) حساب قواعد الدقائق الطارئة (minutes_before)
          else if (rule.type === "minutes_before") {
            const minutesBefore = rule.minutesBefore || 0;
            const targetTriggerTime = new Date(eventTimeUTC.getTime() - minutesBefore * 60 * 1000);

            // مقارنة دقيقة لوقت الدقيقة الحالي مع المحددة
            const nowMin = Math.floor(nowUTC.getTime() / (60 * 1000));
            const targetMin = Math.floor(targetTriggerTime.getTime() / (60 * 1000));

            if (nowMin === targetMin) {
              isTriggered = true;
              timeKey = `minutes_${minutesBefore}_${targetTriggerTime.toISOString().substring(0, 16)}`;
            }
          } 
          // ج) حساب قواعد الساعات (hours_before)
          else if (rule.type === "hours_before") {
            const hoursBefore = rule.hoursBefore || 0;
            const targetTriggerTime = new Date(eventTimeUTC.getTime() - hoursBefore * 60 * 60 * 1000);

            const nowMin = Math.floor(nowUTC.getTime() / (60 * 1000));
            const targetMin = Math.floor(targetTriggerTime.getTime() / (60 * 1000));

            if (nowMin === targetMin) {
              isTriggered = true;
              timeKey = `hours_${hoursBefore}_${targetTriggerTime.toISOString().substring(0, 16)}`;
            }
          } 
          // د) تذكير فوري بوقت الحدث التام (at_time)
          else if (rule.type === "at_time") {
            const nowMin = Math.floor(nowUTC.getTime() / (60 * 1000));
            const targetMin = Math.floor(eventTimeUTC.getTime() / (60 * 1000));

            if (nowMin === targetMin) {
              isTriggered = true;
              timeKey = `at_time_${eventTimeUTC.toISOString().substring(0, 16)}`;
            }
          }

          // 5. إذا تقرر إرسال التنبيه، نمنع التكرار ونقوم بالقنوات المحددة
          if (isTriggered && timeKey) {
            for (const ch of channels) {
              // تكوين الـ ID الفريد الصارم
              const logId = `${eventId}_${ruleIndex}_${ch}_${timeKey}`;
              const logDocRef = db.collection("reminder_logs").doc(logId);

              // التحقق من تسجيله مسبقاً لمنع التكرار
              const logDocSnap = await logDocRef.get();
              if (logDocSnap.exists()) {
                functions.logger.info(`تنبيه مكرر ومسجل بالفعل: [${logId}] - تخطي الإرسال.`);
                continue;
              }

              // معالجة وبث الإرسال الفعلي لتيليجرام أو سطح المكتب
              let realSent = false;
              let realError = "";

              if (ch === "telegram") {
                if (userProfile.telegramChatId && userProfile.channelsConfig?.telegram === true) {
                  try {
                    const success = await sendTelegramReminder(userProfile, eventData, rule, eventId);
                    if (success) {
                      realSent = true;
                    } else {
                      realError = "بوابة الإرسال في تلغرام أرجعت استجابة غير صالحة.";
                    }
                  } catch (err: any) {
                    realError = err.message || "فشل إرسال طلب Webhook لتيليجرام.";
                  }
                } else {
                  realError = "قناة تيليجرام غير مفعّلة في إعدادات المستخدم أو لم يتم ربط الحساب بنجاح بعد.";
                }
              } else if (ch === "desktop") {
                try {
                  // كتابة التذكير بداخل طابور إشعارات سطح المكتب (desktop_queue)
                  await db.collection("desktop_queue").add({
                    userId,
                    eventId,
                    title: eventData.title,
                    eventTime: eventData.eventTime,
                    notes: eventData.notes || "",
                    link: eventData.link || "",
                    ruleType: rule.type,
                    timeKey,
                    sentAt: nowUTC.toISOString(),
                    read: false
                  });
                  realSent = true;
                  functions.logger.info(`✅ تمت كتابة التذكير بنجاح لسطح المكتب في الـ queue لحدث: "${eventData.title}" للمستخدم ${userId}`);
                } catch (err: any) {
                  realError = err.message || "فشلت كتابة التذكير لسطح مكتب المستخدم.";
                }
              }

              // تدوين لوق النجاح الصارم
              await logDocRef.set({
                eventId,
                userId,
                channel: ch,
                ruleIndex,
                timeKey,
                sentAt: nowUTC.toISOString(),
                success: (ch === "telegram" || ch === "desktop") ? realSent : true,
                error: realError || null
              });

              // كتابة سجل تفصيلي في مجموعة debug_notifications لمراقبة الدقة الفورية والربط
              let notificationStatus = "simulated";
              let notificationMessage = `تنبيه محاكاة لقناة [${ch}] لحدث: "${eventData.title}"`;

              if (ch === "telegram") {
                notificationStatus = realSent ? "success" : "failed";
                notificationMessage = realSent
                  ? `✅ تم إرسال تذكير حقيقي بنجاح إلى تلغرام المشترك: ${userProfile.telegramChatId}`
                  : `⚠️ فشلت محاولة إرسال تنبيه تلغرام للمستلم: ${realError}`;
              } else if (ch === "desktop") {
                notificationStatus = realSent ? "success" : "failed";
                notificationMessage = realSent
                  ? `💻 تم وضع التنبيه بنجاح في قائمة طابور سطح المكتب لجلبه دورياً`
                  : `⚠️ فشل تسجيل التنبيه بطابور سطح المكتب: ${realError}`;
              }

              await db.collection("debug_notifications").add({
                userId,
                eventId,
                eventTitle: eventData.title,
                ruleType: rule.type,
                channel: ch,
                timeKey,
                computedSendTime: nowUTC.toISOString(),
                userTimezone,
                status: notificationStatus,
                error: realError || null,
                message: notificationMessage
              });

              functions.logger.info(`✅ [تنبيه تم إطلاقه]: حدث "${eventData.title}" للمستخدم ${userProfile.username} عبر قناة [${ch}]. الحالة: ${(ch === "telegram" || ch === "desktop") ? (realSent ? "تم الإرسال الحقيقي" : `فشل: ${realError}`) : "محاكاة"}`);
            }
          }
        }
      }

    } catch (error) {
      functions.logger.error("خطأ مجهول في تشغيل دالة runReminderScheduler:", error);
    }

    functions.logger.info("انتهى فحص الجدولة بنجاح.");
    return null;
  });

