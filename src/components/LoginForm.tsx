import React, { useState } from "react";
import { signInWithUsername, isSupabaseConfigured } from "../firebase";
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
    if (!isSupabaseConfigured) {
      setError("إعدادات Supabase غير مكتملة. الرجاء إدخال المفاتيح في لوحة Vercel أولاً.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithUsername(identifier.trim(), password);
      onSuccess(user);
    } catch (err: any) {
      console.error("Login error:", err);
      let arabicMessage = "فشل تسجيل الدخول. الرجاء التحقق من صحة البيانات.";
      if (err.message) arabicMessage = err.message;
      setError(arabicMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto"
    >
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">تسجيل الدخول للمنصة</h2>
          <p className="text-sm text-slate-500">مرحباً بك مجدداً في نظام تذكير المواعيد والمهام الذكي</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <strong>تنبيه المطور:</strong> مفاتيح Supabase غير مهيأة بعد!
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">اسم المستخدم أو البريد الإلكتروني <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">كلمة المرور <span className="text-red-500">*</span></label>
            <div className="relative">
              <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جاري تسجيل الدخول...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> دخول</>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          ليس لديك حساب بعد؟{" "}
          <button onClick={onNavigateToRegister} className="text-amber-600 font-medium hover:underline cursor-pointer">سجل معنا الآن</button>
        </p>
      </div>
    </motion.div>
  );
}
