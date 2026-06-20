import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "../firebase";
import { KeyRound, Mail, User, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface LoginFormProps {
  onSuccess: (user: any) => void;
  onNavigateToRegister: () => void;
}

export default function LoginForm({ onSuccess, onNavigateToRegister }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("الرجاء ملء جميع الحقول المطلوبة.");
      return;
    }

    if (!isFirebaseConfigured) {
      setError("إعدادات Firebase غير مكتملة. الرجاء إدخال المفاتيح في لوحة Secrets أولاً.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authInstance = getFirebaseAuth();
      const dbInstance = getFirebaseDb();

      let targetEmail = identifier.trim();

      // If the identifier doesn't look like an email, lookup in /usernames/{username_lowercase}
      if (!targetEmail.includes("@")) {
        const usernameLower = targetEmail.toLowerCase();
        const usernameDocRef = doc(dbInstance, "usernames", usernameLower);
        const usernameSnapshot = await getDoc(usernameDocRef);

        if (!usernameSnapshot.exists()) {
          throw new Error("اسم المستخدم غير موجود. الرجاء التأكد من الكلمة.");
        }

        const usernameData = usernameSnapshot.data();
        targetEmail = usernameData.email;
      }

      const userCredential = await signInWithEmailAndPassword(authInstance, targetEmail, password);
      onSuccess(userCredential.user);
    } catch (err: any) {
      console.error("Login error:", err);
      let arabicMessage = "فشل تسجيل الدخول. الرجاء التحقق من صحة البيانات.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        arabicMessage = "اسم المستخدم أو كلمة المرور غير صحيحة.";
      } else if (err.code === "auth/operation-not-allowed") {
        arabicMessage = "خطأ: تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في منصة الـ Authentication للـ Firebase بمشروع tathkeer-reminders. يرجى تفعيله من لوحة تحكم Firebase بموقع مشروعك (Sign-in method -> Email/Password).";
      } else if (err.code === "permission-denied" || (err.message && err.message.includes("permission-denied")) || (err.message && err.message.includes("insufficient permissions"))) {
        arabicMessage = "خطأ: تم رفض الصلاحية لقراءة قاعدة البيانات (Permission Denied). يرجى التأكد من تفعيل وتطبيق قواعد الحماية (Rules) في Firestore Database لتسمح بالعمليات.";
      } else if (err.message && err.message.includes("offline")) {
        arabicMessage = "العميل غير متصل بـ Firebase (the client is offline). يرجى التحقق من صحة مفاتيح ومحددات الاتصال بـ Firebase وإدخالها بالشكل السليم في الـ Secrets.";
      } else if (err.message) {
        arabicMessage = err.message;
      }
      setError(arabicMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 flex flex-col justify-center">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 rounded-xl mb-4 text-amber-600">
          <KeyRound className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">تسجيل الدخول للمنصة</h2>
        <p className="text-sm text-slate-500 mt-2">مرحباً بك مجدداً في نظام تذكير المواعيد والمهام الذكي</p>
      </div>

      {!isFirebaseConfigured && (
        <div className="p-4 mb-6 bg-amber-50 text-amber-800 rounded-xl flex items-start gap-3 border border-amber-200 text-xs leading-relaxed">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <span className="font-semibold">تنبيه المطور:</span> مفاتيح Firebase غير مهيأة بعد! يمكنك تعبئتها في جدول الـ Secrets لتبدأ بحفظ البيانات الحقيقية وتجربة الحسابات.
          </div>
        </div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 mb-6 bg-rose-50 text-rose-800 rounded-xl flex items-center gap-3 border border-rose-100 text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5 font-sans">
            اسم المستخدم أو البريد الإلكتروني <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
              <User className="w-5 h-5" />
            </span>
            <input
              type="text"
              dir="ltr"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-slate-800 text-right bg-slate-50/50"
              placeholder="username or email"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5 font-sans">
            كلمة المرور <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
              <KeyRound className="w-5 h-5" />
            </span>
            <input
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-slate-800 text-right bg-slate-50/50"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-amber-300 text-white font-medium rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري تسجيل الدخول...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>دخول</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <p className="text-slate-500 text-sm">
          ليس لديك حساب بعد؟{" "}
          <button
            onClick={onNavigateToRegister}
            className="text-amber-600 hover:text-amber-700 font-semibold underline underline-offset-4 focus:outline-none transition inline-block mr-1"
          >
            سجل معنا الآن
          </button>
        </p>
      </div>
    </div>
  );
}
