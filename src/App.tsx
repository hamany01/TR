import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "./firebase";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import Dashboard from "./components/Dashboard";
import {
  BellRing,
  HelpCircle,
  AlertTriangle,
  Github,
  Globe,
  Loader2,
  Settings,
  Sparkles
} from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [view, setView] = useState<"login" | "register" | "dashboard">("login");
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSessionLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        setView("dashboard");
      }
      setSessionLoading(false);
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        setView("dashboard");
      } else {
        setCurrentUser(null);
        if (view === "dashboard") setView("login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setView("dashboard");
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Sign out error", e);
      }
    }
    setCurrentUser(null);
    setDemoMode(false);
    setView("login");
  };

  const enableDemoSession = () => {
    setDemoMode(true);
    setCurrentUser({ id: "demo_uid_12345", email: "demo_user@remindme.sa", user_metadata: { username: "Mohammed" } });
    setView("dashboard");
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium">جاري التحقق من جلسة المستخدم الذكية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30" dir="rtl">
      {/* Top Navigation Frame */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md">ت</div>
            <div>
              <span className="font-bold text-slate-800 text-sm">منصة تذكير</span>
              <span className="text-xs text-slate-500 mr-1"> v2.0.0</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 hidden md:block">نظام جدولة التنبيهات المخصص (SaaS)</div>
          {!isSupabaseConfigured && view !== "dashboard" && (
            <button onClick={enableDemoSession} className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition font-medium cursor-pointer">تجربة المنصة مباشرة (Demo Mode)</button>
          )}
          <div className="text-xs text-slate-400">التوقيت المحلي: {new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Warning Badge for missing Keys configuration */}
        {!isSupabaseConfigured && !demoMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>تنبيه تهيئة مفاتيح Supabase:</strong> لم يتم ملء مفاتيح Supabase في ملف البيئة بعد. يمكنك الضغط على رابط تجارب العرض (Demo Mode) للوصول للوحة مباشرة.
              </div>
            </div>
          </motion.div>
        )}

        {view === "login" && (
          <LoginForm onSuccess={handleLoginSuccess} onNavigateToRegister={() => setView("register")} />
        )}
        {view === "register" && (
          <RegisterForm onSuccess={handleLoginSuccess} onNavigateToLogin={() => setView("login")} />
        )}
        {view === "dashboard" && (
          <Dashboard user={currentUser} onLogout={handleLogout} />
        )}
      </main>

      {/* Footer Design Frame */}
      <footer className="mt-12 border-t border-slate-100 bg-white/50 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h4 className="font-bold text-slate-700 mb-2">منصة التذكير الموحد</h4>
          <p className="text-xs text-slate-500 mb-3">تطبيق SaaS عربي لحساب التنبيهات وإرسالها بتلقائية دقيقة عبر التليجرام وجهاز سطح المكتب، تم التصميم مع هندسة معالجة اختلافات الأوقات بدقة.</p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <a href="#" className="hover:text-slate-600 transition">الشروط والأحكام</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-600 transition">سياسة الخصوصية</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-600 transition">المستند التقني للبايثون</a>
          </div>
          <p className="text-xs text-slate-400 mt-3">© {new Date().getFullYear()} منصة تذكير (إصدار v2.0.0). جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
