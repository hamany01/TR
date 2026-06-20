import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "../firebase";
import { User, Mail, KeyRound, Phone, MapPin, Globe, AlertCircle, CheckCircle, Loader2, UserPlus, Gift } from "lucide-react";
import { motion } from "motion/react";

interface RegisterFormProps {
  onSuccess: (user: any) => void;
  onNavigateToLogin: () => void;
}

const COMMON_TIMEZONES = [
  { value: "Asia/Riyadh", label: "الرياض (Asia/Riyadh)" },
  { value: "Asia/Dubai", label: "دبي (Asia/Dubai)" },
  { value: "Africa/Cairo", label: "القاهرة (Africa/Cairo)" },
  { value: "Asia/Amman", label: "عمان (Asia/Amman)" },
  { value: "Asia/Baghdad", label: "بغداد (Asia/Baghdad)" },
  { value: "Asia/Kuwait", label: "الكويت (Asia/Kuwait)" },
  { value: "Asia/Qatar", label: "الدوحة (Asia/Qatar)" },
  { value: "Europe/London", label: "لندن (Europe/London)" }
];

export default function RegisterForm({ onSuccess, onNavigateToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [timezone, setTimezone] = useState("Asia/Riyadh");
  const [referralInput, setReferralInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Standard Client Checks
    if (!username || !email || !password || !confirmPassword || !phone) {
      setError("الرجاء تعبئة جميع الحقول الإلزامية ممثلة بالنجمة الأحمر.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    if (password.length < 6) {
      setError("يجب أن تكون كلمة المرور 6 خانات على الأقل.");
      return;
    }

    // Validate Username Format (alphanumeric, underscores, dots)
    const usernameRegex = /^[a-zA-Z0-9_\.]+$/;
    if (!usernameRegex.test(username)) {
      setError("اسم المستخدم يجب أن يحتوي فقط على أحرف، أرقام، شرطة سفلية أو نقطة.");
      return;
    }

    if (!isFirebaseConfigured) {
      setError("خطأ: إعدادات Firebase غير صحيحة. يرجى إعداد المفاتيح في لوحة Secrets أولاً.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authInstance = getFirebaseAuth();
      const dbInstance = getFirebaseDb();

      // Check if username is already taken
      const usernameLower = username.trim().toLowerCase();
      const usernameDocRef = doc(dbInstance, "usernames", usernameLower);
      const usernameSnapshot = await getDoc(usernameDocRef);

      if (usernameSnapshot.exists()) {
        throw new Error("اسم المستخدم محجوز مسبقاً! يرجى اختيار اسم مستخدم آخر.");
      }

      // Create new Auth User
      const userCredential = await createUserWithEmailAndPassword(authInstance, email.trim(), password);
      const uid = userCredential.user.uid;

      // Calculate Dates (30 Days Trial)
      const now = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(now.getDate() + 30);

      // Generate random unique telegram token
      const tgToken = "tg_" + Math.random().toString(36).substring(2, 10).toUpperCase();

      // Generate Referral Code
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const referralCode = `REF-${usernameLower.toUpperCase()}-${randSuffix}`;

      // Write User Document
      const userDocRef = doc(dbInstance, "users", uid);
      const userPayload: any = {
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        region: region.trim() || null,
        timezone: timezone,
        createdAt: now.toISOString(),
        subType: "free_trial",
        subStartDate: now.toISOString(),
        subEndDate: trialEndDate.toISOString(),
        telegramToken: tgToken,
        referralCode: referralCode,
        telegramChatId: null
      };

      if (referralInput.trim()) {
        userPayload.referredBy = referralInput.trim().toUpperCase();
      }

      // Execute atomic-like creation (Username lock + User document)
      await setDoc(usernameDocRef, {
        email: email.trim(),
        uid: uid
      });

      await setDoc(userDocRef, userPayload);

      onSuccess(userCredential.user);
    } catch (err: any) {
      console.error("Registration error:", err);
      let arabicMessage = "عذراً، فشل تسجيل الحساب. يرجى التحقق من المدخلات.";
      if (err.code === "auth/email-already-in-use") {
        arabicMessage = "البريد الإلكتروني هذا مستخدم بالفعل بحساب آخر.";
      } else if (err.code === "auth/invalid-email") {
        arabicMessage = "البريد الإلكتروني المدخل غير صالح.";
      } else if (err.code === "auth/operation-not-allowed") {
        arabicMessage = "خطأ: ميزة تسجيل الحساب بالبريد وكلمة المرور غير مفعّلة في لوحة تحكم Authentication الخاصة بمشروع tathkeer-reminders. يرجى الدخول إلى لوحة التحكم بمشروعك بموقع Firebase وتفعيل خيار 'Email/Password' في صفحة Sign-in method كي تتمكن من إنشاء حسابات حقيقية.";
      } else if (err.code === "permission-denied" || (err.message && err.message.includes("permission-denied")) || (err.message && err.message.includes("insufficient permissions"))) {
        arabicMessage = "خطأ: تم رفض الصلاحية لقاعدة البيانات (Permission Denied). يرجى التأكد من نسخ قواعد حماية Firestore (Firestore Rules) وتطبيقها في لوحة التحكم بمشروعك (tathkeer-reminders) لتسمح بعمليات الكتابة والقراءة اللازمة.";
      } else if (err.message && err.message.includes("offline")) {
        arabicMessage = "فشل الاتصال: العميل غير متصل بـ Firebase (the client is offline). يرجى التحقق من صحة مفاتيح ومحددات الاتصال بـ Firebase وإدخالها بالشكل السليم في الـ Secrets.";
      } else if (err.message) {
        arabicMessage = err.message;
      }
      setError(arabicMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-8 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 flex flex-col justify-center">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 rounded-xl mb-3 text-amber-600">
          <UserPlus className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">إنشاء حساب منصة تذكير</h2>
        <p className="text-sm text-slate-500 mt-2">احصل على فترة تجريبية مجانية لمدة شهر لتتبع المواعيد وتنبيهات تيليجرام</p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 mb-6 bg-rose-50 text-rose-800 rounded-xl flex items-center gap-3 border border-rose-100 text-sm animate-pulse"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">
            اسم المستخدم (username) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              dir="ltr"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-slate-800 text-right bg-slate-50/50"
              placeholder="e.g. mohammed_99"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">
            البريد الإلكتروني <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-slate-800 text-right bg-slate-50/50"
              placeholder="name@example.com"
              required
            />
          </div>
        </div>

        {/* Passwords row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">
              كلمة المرور <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-slate-800 text-right bg-slate-50/50"
                placeholder="••••••"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">
              تأكيد كلمة المرور <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-slate-800 text-right bg-slate-50/50"
                placeholder="••••••"
                required
              />
            </div>
          </div>
        </div>

        {/* Phone & Timezone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">
              رقم الجوال <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-slate-800 text-right bg-slate-50/50"
                placeholder="+9665xxxxxxxx"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">
              المنطقة الزمنية (Timezone) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                <Globe className="w-4 h-4" />
              </span>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full pr-8 pl-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-slate-800 text-right bg-slate-50/50 cursor-pointer appearance-none"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Region & Invitation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">
              الدولة / المنطقة <span className="text-slate-400">(اختياري)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-slate-800 text-right bg-slate-50/50 hover:bg-white"
                placeholder="مثال: الرياض، السعودية"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-sans">
              كود الإحالة / كود دعوة <span className="text-slate-400">(اختياري)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                <Gift className="w-4 h-4" />
              </span>
              <input
                type="text"
                dir="ltr"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value)}
                className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-slate-800 text-right bg-slate-50/50 hover:bg-white"
                placeholder="REF-XXXXXX"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 mt-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-slate-300 text-white font-medium rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري محادثة الخادم وتأمين الحساب...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>إنشاء الحساب وبدء التجربة المجانية</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-slate-500 text-xs">
          لديك حساب بالفعل بداخل المنصة؟{" "}
          <button
            onClick={onNavigateToLogin}
            className="text-amber-600 hover:text-amber-700 font-semibold underline underline-offset-4 focus:outline-none transition inline-block mr-1"
          >
            سجل دخولك هنا
          </button>
        </p>
      </div>
    </div>
  );
}
