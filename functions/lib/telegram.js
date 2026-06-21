"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramBotWebhook = void 0;
exports.sendTelegramMessage = sendTelegramMessage;
exports.sendTelegramReminder = sendTelegramReminder;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
/**
 * الـ Webhook الخاص بـ Telegram Bot لاستقبال الرسائل والتفاعلات من خوادم تيليجرام.
 *
 * الميزات المخطط لتنفيذها:
 * 1. الربط الآمن (Deep Linking):
 *    - عندما يضغط المستخدم على رابط البوت: https://t.me/OurBot?start=tg_TOKEN
 *    - يرسل تيليجرام رسالة `/start tg_TOKEN` للبوت.
 *    - تبحث هذه الدالة في Firestore عن مستند في مجموعة `users` له حقل `telegramToken == tg_TOKEN`.
 *    - عند العثور عليه، يتم حفظ `telegramChatId` للمستخدم في قاعدة البيانات وتفعيل قناة تيليجرام له تلقائياً.
 *    - نقوم بالرد على المستخدم برسالة نجاح باللغة العربية: "تم ربط حسابك بمنصة تذكير بنجاح! ستصلك التنبيهات هنا."
 *
 * 2. زر "تم الإنجاز" التفاعلي (Inline Buttons):
 *    - عندما نرسل تذكير بحدث ما لتيليجرام، نرفق معه زر Inline مكتوب عليه "تم الإنجاز" ومسار تفاعلي (callback_data) يحتوي على `${eventId}`.
 *    - عند ضغط المستخدم على الزر، تستقبل هذه الدالة callback_query، وتقوم بتحديث حالة الحدث في Firestore إلى status = 'completed'.
 *    - يتوقف المجدول تلقائياً عن إرسال أي تذكير قادم لهذا الحدث.
 *    - نرسل تحديثاً يؤكد نجاح الإنجاز: "رائع! تم تدوين إنجاز المهمة وإيقاف التذكيرات."
 */
/**
 * دالة مساعدة لإرسال رسائل نصية عبر تيليجرام مع دعم التنسيقات والأزرار التفاعلية
 */
async function sendTelegramMessage(chatId, text, replyMarkup) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        functions.logger.error("⚠️ لم يتم العثور على TELEGRAM_BOT_TOKEN في المتغيرات البيئية لعملية الإرسال.");
        return false;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: "Markdown",
                reply_markup: replyMarkup
            })
        });
        const resData = await response.json();
        if (!resData.ok) {
            functions.logger.error("فشل إرسال رسالة من سيرفر تيليجرام:", resData);
            return false;
        }
        return true;
    }
    catch (error) {
        functions.logger.error("فشل استدعاء API تيليجرام للرسائل:", error);
        return false;
    }
}
/**
 * دالة مساعدة لتعديل الرسائل السابقة وتحديث محتواها بشكل تفاعلي سريع
 */
async function editTelegramMessage(chatId, messageId, text) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token)
        return;
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text,
                parse_mode: "Markdown"
            })
        });
    }
    catch (error) {
        functions.logger.error("فشل تعديل رسالة تيليجرام القديمة:", error);
    }
}
/**
 * دالة مساعدة لتأكيد استجابة الـ callback_query لتيليجرام لإيقاف مؤشر الانتظار الدوار
 */
async function answerCallbackQuery(callbackQueryId) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token)
        return;
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                callback_query_id: callbackQueryId
            })
        });
    }
    catch (error) {
        functions.logger.error("فشل تأكيد callback_query لتيليجرام:", error);
    }
}
/**
 * دالة تفصيلية لتجهيز وإرسال تنبيهات الحدث الفردية إلى حساب المستخدم عبر تيليجرام
 */
async function sendTelegramReminder(userProfile, eventData, rule, eventId) {
    const chatId = userProfile.telegramChatId;
    if (!chatId)
        return false;
    const eventTitle = eventData.title;
    const eventDate = new Date(eventData.eventTime);
    const formattedTime = eventDate.toLocaleString("ar-EG", {
        timeZone: userProfile.timezone || "Asia/Riyadh",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
    let ruleDescription = "";
    if (rule.type === "days_before") {
        ruleDescription = `تذكير استباقي قبل البدء بـ ${rule.daysBefore} أيام`;
    }
    else if (rule.type === "hours_before") {
        ruleDescription = `تذكير استباقي قبل البدء بـ ${rule.hoursBefore} ساعات`;
    }
    else if (rule.type === "minutes_before") {
        ruleDescription = `تذكير استباقي قبل البدء بـ ${rule.minutesBefore} دقيقة`;
    }
    else if (rule.type === "at_time") {
        ruleDescription = `تنبيه فوري: حان موعد الحدث تماماً الآن! ⏰`;
    }
    let text = `🔔 *تنبيه هام ومجدول من منصة تذكير*\n\n`;
    text += `📌 *الحدث:* ${eventTitle}\n`;
    text += `📅 *تاريخ الموعد الرئيسي:* \`${formattedTime}\`\n`;
    text += `⏰ *مستوى التنبيه:* ${ruleDescription}\n`;
    if (eventData.notes) {
        text += `📝 *ملاحظات إضافية:* ${eventData.notes}\n`;
    }
    if (eventData.link) {
        text += `🔗 *رابط مرجعي:* [اضغط لفتح الرابط](${eventData.link})\n`;
    }
    // إنشاء زر تم الإنجاز التفاعلي
    const replyMarkup = {
        inline_keyboard: [
            [
                {
                    text: "✅ تم الإنجاز وإيقاف التذكيرات المستقبلية",
                    callback_data: `complete_${eventId}`
                }
            ]
        ]
    };
    return await sendTelegramMessage(chatId, text, replyMarkup);
}
/**
 * الـ Webhook الخاص بـ Telegram Bot لاستقبال الرسائل والتفاعلات من خوادم تيليجرام.
 */
exports.telegramBotWebhook = functions.https.onRequest(async (req, res) => {
    functions.logger.info("تم استقبال طلب جديد من تيليجرام Webhook", { body: req.body });
    const db = admin.firestore();
    try {
        const { message, callback_query } = req.body;
        // 1. معالجة الرسائل العادية لربط الحسابات (Deep Linking)
        if (message && message.text) {
            const text = message.text;
            const chatId = message.chat.id;
            if (text.startsWith("/start")) {
                const parts = text.split(" ");
                const token = parts[1]; // الـ Token المستخرج من الرابط
                if (!token) {
                    // رسالة للمستخدم الذي دخل بدون توكن تفعيل
                    const introText = `مرحباً بك في بوت منصة تذكير بالمواعيد الذكية! 🔔\n\n` +
                        `نقوم بإرسال التنبيهات والمهام المجدولة لك مباشرةً وبدقة عالية على الهاتف الجوال.\n\n` +
                        `🔗 لتفعيل حسابك، يرجى تسجيل الدخول إلى منصة تذكير والضغط على زر "تفعيل تلغرام" لفتح رابط الربط الفريد الخاص بك.`;
                    await sendTelegramMessage(chatId, introText);
                }
                else {
                    // البحث عن المستخدم صاحب الـ Token
                    const usersSnapshot = await db
                        .collection("users")
                        .where("telegramToken", "==", token)
                        .get();
                    if (usersSnapshot.empty) {
                        const errorText = `⚠️ عذراً، رمز الربط هذا غير صالح أو منتهي الصلاحية.\n\n` +
                            `يرجى توليد أو نسخ الرمز الصحيح من داخل حسابك في منصة تذكير بالمواعيد وإعادة مضاهاة الحسابات.`;
                        await sendTelegramMessage(chatId, errorText);
                    }
                    else {
                        const userDoc = usersSnapshot.docs[0];
                        const userId = userDoc.id;
                        // تحديث وتدعيم قنوات تواصل المستخدم
                        await userDoc.ref.update({
                            telegramChatId: chatId,
                            "channelsConfig.telegram": true,
                            updatedAt: new Date().toISOString()
                        });
                        const successText = `🎉 تم ربط حسابك بمنصة تذكير بمواعيدك بنجاح!\n\n` +
                            `المستخدم المستهدف: *${userDoc.data().username || "صديق المنصة"}*\n\n` +
                            `من الآن فصاعداً، ستصلك التنبيهات الموقوتة والرسائل الإشعارية بانتظام في هذا الحساب، مع أزرار الإنجاز التفاعلية لتسهيل مهامك اليومية.`;
                        await sendTelegramMessage(chatId, successText);
                        functions.logger.info(`تم ربط التيليجرام بنجاح للمستخدم ${userId} مع الشات ${chatId}`);
                    }
                }
            }
        }
        // 2. معالجة نقرة أزرار الـ Inline Keyboards (التسجيل الفوري للإنجاز)
        if (callback_query) {
            const callbackQueryId = callback_query.id;
            const data = callback_query.data || "";
            const chatId = callback_query.message?.chat?.id;
            const messageId = callback_query.message?.message_id;
            if (data.startsWith("complete_")) {
                const eventId = data.substring("complete_".length);
                // الحصول على تفاصيل الحدث القائم لتأكيد إنهاء وتعديل الحالة
                const eventRef = db.collection("events").doc(eventId);
                const eventSnap = await eventRef.get();
                if (eventSnap.exists) {
                    const eventData = eventSnap.data();
                    if (eventData?.status === "completed") {
                        if (chatId && messageId) {
                            await editTelegramMessage(chatId, messageId, `✅ تم إنجاز هذا الحدث سابقاً بالفعل: *${eventData.title}*\n\nالمهام المسجلة دائماً في أمان.`);
                        }
                    }
                    else {
                        // تحديث حالة الحدث فوراً لإيقاف مجدول التنبيهات للمهمة
                        await eventRef.update({
                            status: "completed",
                            updatedAt: new Date().toISOString(),
                            completedAt: new Date().toISOString()
                        });
                        if (chatId && messageId) {
                            const completedText = `💯 رائع جداً! تم تدوين إنجاز المهمة وإيقاف التنبيهات القادمة لها:\n\n` +
                                `📌 *الحدث:* ${eventData?.title}\n` +
                                `📅 *التوقيت:* \`${new Date(eventData?.eventTime).toLocaleString("ar-EG")}\`\n\n` +
                                `تم إيقاف المجدول وتحديث السجلات فورياً بنجاح. استمر في إنتاجيتك! ✨`;
                            await editTelegramMessage(chatId, messageId, completedText);
                        }
                    }
                }
                else {
                    if (chatId) {
                        await sendTelegramMessage(chatId, "⚠️ عذراً! لم نتمكن من العثور على هذا الحدث في قاعدة البيانات لتحديثه، قد يكون تم حذفه مسبقاً.");
                    }
                }
                // إرسال تأكيد الاستلام للتيليجرام لإنهاء التحميل بالزر
                await answerCallbackQuery(callbackQueryId);
            }
        }
        res.status(200).send({ status: "ok" });
    }
    catch (error) {
        functions.logger.error("خطأ بـ Webhook تيليجرام الرئيسي:", error);
        res.status(500).send({ error: error.message });
    }
});
//# sourceMappingURL=telegram.js.map