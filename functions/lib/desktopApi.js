"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desktopApi = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const corsLib = require("cors");
const fs = require("fs");
const path = require("path");
const cors = corsLib({ origin: true });
// قراءة API Key لـ Firebase لتنفيذ عمليات تسجيل المصادقة الحقيقية
let apiKey = "AIzaSyCWQpYyjqCLs1_98n9dyCEpYpYP0L7r2Xw"; // المفتاح التلقائي لقاعدة البيانات
try {
    const configPath = path.join(__dirname, "../../../firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (config.apiKey) {
            apiKey = config.apiKey;
        }
    }
}
catch (e) {
    functions.logger.error("خطأ أثناء قراءة ملف مفاتيح Firebase لـ Desktop API", e);
}
/**
 * الـ APIs المخصصة لتطبيق سطح المكتب (بايثون على ويندوز):
 *
 * 1. تسجيل الدخول والتفويض (/login):
 *    - يتلقى اسم المستخدم (أو البريد) وكلمة المرور من تطبيق البايثون.
 *    - يتحقق من هويته ويزوده بالـ UID والبيانات الأساسية ليقوم تطبيق سطح المكتب بحفظها محلياً بأمان.
 *
 * 2. جلب التذكيرات والأحداث النشطة (/events):
 *    - يطلبها تطبيق البايثون بصفة دورية لعرض إشعارات منبثقة على ويندوز بصوت مميز.
 *    - يعود بقائمة الأحداث النشطة ذات الحالة `active` وتفاصيل قواعد تذكيرها.
 *
 * 3. إشارة اكتمال الحدث (/complete):
 *    - عند ضغط المستخدم على زر "تم الإنجاز" في إشعار ويندوز المنبثق، يتصل تطبيق البايثون بهذا الـ Endpoint.
 *    - نقوم بالتبعية بتعديل حالة الحدث إلى `completed` في Firestore فوراً.
 */
exports.desktopApi = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        const { method, path: reqPath } = req;
        functions.logger.info(`طلب API لسطح المكتب: ${method} ${reqPath}`, { query: req.query, body: req.body });
        const db = admin.firestore();
        try {
            // 1. مسار تسجيل الدخول والتفويض للـ Desktop client
            if (reqPath === "/login") {
                const { identifier, password } = req.body;
                if (!identifier || !password) {
                    return res.status(400).json({
                        success: false,
                        error: "الرجاء توفير اسم المستخدم وكلمة المرور للتحقق."
                    });
                }
                let email = identifier.trim();
                // لو كان المدخل ليس بريداً إلكترونياً (اسم مستخدم)، ابحث عنه لجلب البريد الحقيقي
                if (!email.includes("@")) {
                    const usernameLower = email.toLowerCase();
                    const usernameDoc = await db.collection("usernames").doc(usernameLower).get();
                    if (!usernameDoc.exists) {
                        return res.status(400).json({
                            success: false,
                            error: "اسم المستخدم المكتوب غير مسجل بقاعدة بياناتنا."
                        });
                    }
                    email = usernameDoc.data()?.email;
                }
                // المصادقة الحقيقية عبر بوابة Firebase REST Auth API لضمان مطابقة كلمة المرور بالأعضاء
                const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
                try {
                    const authResponse = await fetch(authUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email,
                            password,
                            returnSecureToken: true
                        })
                    });
                    const authData = await authResponse.json();
                    if (authData.error) {
                        return res.status(400).json({
                            success: false,
                            error: "اسم المستخدم أو كلمة المرور السفرية غير صحيحة."
                        });
                    }
                    const userId = authData.localId;
                    // جلب تفاصيل المستخدم وصلاحية اشتراكه
                    const userSnap = await db.collection("users").doc(userId).get();
                    if (!userSnap.exists) {
                        return res.status(404).json({
                            success: false,
                            error: "لم يتم العثور على وثيقة المستخدم في النظام الفعلي."
                        });
                    }
                    const userData = userSnap.data() || {};
                    const subEndDate = new Date(userData.subEndDate);
                    if (subEndDate < new Date()) {
                        return res.status(403).json({
                            success: false,
                            error: "عذراً! انتهت صلاحية اشتراكك بالمنصة، يرجى الدخول لموقع المنصة لتجديده."
                        });
                    }
                    // توليد وتخزين توكن للجهاز desktopToken
                    let desktopToken = userData.desktopToken;
                    if (!desktopToken) {
                        desktopToken = "dt_" + Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 10).toUpperCase();
                        await db.collection("users").doc(userId).update({
                            desktopToken,
                            updatedAt: new Date().toISOString()
                        });
                    }
                    return res.status(200).json({
                        success: true,
                        userId,
                        username: userData.username,
                        email: userData.email,
                        desktopAuthToken: desktopToken
                    });
                }
                catch (authErr) {
                    functions.logger.error("خطأ أثناء الاتصال ببوابة التحقق من الهوية", authErr);
                    return res.status(500).json({
                        success: false,
                        error: "فشلت المصادقة؛ تأكد من اتصال الإنترنيت أو خواديم تذكير."
                    });
                }
            }
            // 2. مسار جلب تذكيرات طابور سطح المكتب النشطة ذات التوكن الصالح
            if (reqPath === "/events") {
                const desktopAuthToken = req.headers["authorization"] || req.body.desktopAuthToken || req.query.desktopAuthToken;
                if (!desktopAuthToken) {
                    return res.status(401).json({
                        success: false,
                        error: "عذراً، يجب توفير توكن تفويض سطح المكتب لإتمام العملية."
                    });
                }
                // البحث عن المستخدم صاحب التوكن النشط
                const usersSnap = await db.collection("users").where("desktopToken", "==", desktopAuthToken).get();
                if (usersSnap.empty) {
                    return res.status(401).json({
                        success: false,
                        error: "توكن التفويض المستخدم غير صالح أو منتهي."
                    });
                }
                const userDoc = usersSnap.docs[0];
                const userId = userDoc.id;
                const userData = userDoc.data();
                // التثبت من اشتراك المستخدم
                if (new Date(userData.subEndDate) < new Date()) {
                    return res.status(403).json({
                        success: false,
                        error: "انتهت صلاحية تذكرة اشتراكك تذكير."
                    });
                }
                // جلب الإشعارات النشطة والمضافة حديثاً بداخل طابور سطح المكتب ولم يحضرها من قبل (read === false)
                const queueSnap = await db.collection("desktop_queue")
                    .where("userId", "==", userId)
                    .where("read", "==", false)
                    .get();
                const eventsList = [];
                const batch = db.batch();
                queueSnap.forEach((doc) => {
                    const data = doc.data();
                    eventsList.push({
                        queueId: doc.id,
                        eventId: data.eventId,
                        title: data.title,
                        eventTime: data.eventTime,
                        notes: data.notes || "",
                        link: data.link || ""
                    });
                    // تدويلها كـ مقروءة حتى لا تتكرر في طلبات البولينغ اللاحقة
                    batch.update(doc.ref, {
                        read: true,
                        readAt: new Date().toISOString()
                    });
                });
                if (!queueSnap.empty) {
                    await batch.commit();
                }
                return res.status(200).json({
                    success: true,
                    events: eventsList
                });
            }
            // 3. مسار التسجيل الفوري لإنجاز الحدث من تنبيه سطح المكتب
            if (reqPath === "/complete") {
                const { eventId } = req.body;
                const desktopAuthToken = req.headers["authorization"] || req.body.desktopAuthToken || req.query.desktopAuthToken;
                if (!desktopAuthToken || !eventId) {
                    return res.status(400).json({
                        success: false,
                        error: "الرجاء توفير معرف الجلسة ومعرف الحدث بالكامل."
                    });
                }
                const usersSnap = await db.collection("users").where("desktopToken", "==", desktopAuthToken).get();
                if (usersSnap.empty) {
                    return res.status(401).json({
                        success: false,
                        error: "توكن التفويض المستخدم غير متوافق."
                    });
                }
                const userDoc = usersSnap.docs[0];
                const userId = userDoc.id;
                const eventRef = db.collection("events").doc(eventId);
                const eventSnap = await eventRef.get();
                if (!eventSnap.exists) {
                    return res.status(404).json({
                        success: false,
                        error: "لم نتمكن من العثور على هذا الموعد المختار."
                    });
                }
                const eventData = eventSnap.data();
                if (eventData?.userId !== userId) {
                    return res.status(403).json({
                        success: false,
                        error: "غير مصرح لك قانوناً بالإجراء على هذا الحدث."
                    });
                }
                // تحديث الحدث إلى الحالة مكتمل
                await eventRef.update({
                    status: "completed",
                    updatedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString()
                });
                return res.status(200).json({
                    success: true,
                    message: `تمت مزامنة الموعد بنجاح وتعيينه كـ مكتمل بالمنصة وتوقف التذكيرات.`
                });
            }
            return res.status(404).json({ success: false, error: "Endpoint not found" });
        }
        catch (error) {
            functions.logger.error("خطأ بـ APIs سطح المكتب", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    });
});
//# sourceMappingURL=desktopApi.js.map