import React from "react";
import { 
  User, 
  Clock, 
  Database, 
  Calendar, 
  Gift, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Copy,
  TrendingUp,
  Activity,
  XCircle,
  Clock3
} from "lucide-react";
import { motion } from "motion/react";
import { EventDoc } from "../types";

interface HomePageProps {
  user: any;
  userProfile: any;
  events: EventDoc[];
  copiedCode: boolean;
  copyReferral: () => void;
}

export default function HomePage({ 
  user, 
  userProfile, 
  events, 
  copiedCode, 
  copyReferral 
}: HomePageProps) {
  
  // Calculate stats
  const totalCount = events.length;
  const activeCount = events.filter(e => e.status === "active" || !e.status).length; // fallback if status is empty
  const completedCount = events.filter(e => e.status === "completed").length;
  const cancelledCount = events.filter(e => e.status === "cancelled").length;

  return (
    <div className="space-y-8" dir="rtl">
      
      {/* Welcome Card & Subscription Status */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-3xl shadow-lg border border-amber-500/20"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
              <span>مرحباً، {userProfile?.username || user.email?.split("@")[0]}!</span>
              {userProfile?.isAdmin && (
                <span className="px-2 py-0.5 bg-white/25 text-[11px] font-bold rounded-lg border border-white/20 select-none">
                  (حساب إداري ⚙️)
                </span>
              )}
            </h1>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-xs font-semibold rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
              {userProfile?.subType === "free_trial" ? "رخصة تجريبية مجانية" : "حساب مدفوع كامل"}
            </span>
          </div>
          <p className="text-amber-100/90 text-sm mt-2 leading-relaxed max-w-2xl">
            أهلاً بك مجدداً في نظام تذكير المواعيد الذكي. هنا يمكنك متابعة لوحة التحكم التفاعلية، ومراجعة أوقات تذكير وثائقك الهامة ودوراتك التدريبية النشطة.
          </p>
        </div>
        
        {/* Quick info right side */}
        <div className="bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0 text-right min-w-[200px]">
          <span className="text-xs text-amber-100 block mb-1">المنطقة الزمنية المفعلة:</span>
          <span className="text-md font-bold font-mono tracking-wide flex items-center gap-1 justify-end">
            <Clock className="w-4 h-4 text-amber-300" />
            {userProfile?.timezone || "Asia/Riyadh"}
          </span>
        </div>
      </motion.div>

      {/* Grid: Stats Column (Left) + General details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Span: Quick Statistics overview */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-600" />
            <span>نظرة عامة على أحداث ومواعيد التذكير</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Active events card */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-right flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="p-3 bg-amber-50 rounded-xl">
                  <Clock3 className="w-6 h-6 text-amber-600" />
                </span>
                <span className="text-xs text-slate-400 font-semibold">قيد التشغيل</span>
              </div>
              <div>
                <span className="block text-3xl font-extrabold text-slate-800 font-mono">{activeCount}</span>
                <span className="text-xs text-slate-500 font-medium">أحداث ونبهات نشطة</span>
              </div>
            </motion.div>

            {/* Completed events card */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-right flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="p-3 bg-emerald-50 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </span>
                <span className="text-xs text-slate-400 font-semibold">مكتملة ومؤكدة</span>
              </div>
              <div>
                <span className="block text-3xl font-extrabold text-emerald-600 font-mono">{completedCount}</span>
                <span className="text-xs text-slate-500 font-medium">مواعيد تم إنجازها</span>
              </div>
            </motion.div>

            {/* Cancelled events card */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-right flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="p-3 bg-rose-50 rounded-xl">
                  <XCircle className="w-6 h-6 text-rose-500" />
                </span>
                <span className="text-xs text-slate-400 font-semibold">ملغاة أو متوقفة</span>
              </div>
              <div>
                <span className="block text-3xl font-extrabold text-rose-500 font-mono">{cancelledCount}</span>
                <span className="text-xs text-slate-500 font-medium">أحداث ملغاة</span>
              </div>
            </motion.div>

          </div>

          {/* Quick instructions on how the system scheduler works */}
          <div className="p-5 bg-amber-50/40 rounded-2xl border border-amber-100/50 space-y-3">
            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>كيف تعمل جدولة التنبيهات؟</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              يقوم المحرّك السحابي بتفحص مواقيت المواعيد التي تسجلها في قسم <strong>«الأحداث»</strong> كل دقيقة.
              عندما يحين وقت إحدى قواعد التذكير التي حددتها (على سبيل المثال قبل موعد الاستحقاق بـ 3 أيام أو في نفس الوقت)،
              يتم إرسال تذكير مباشر باللغة العربية إلى قنواتك المفعلة تلقائياً.
            </p>
          </div>
        </div>

        {/* Right Span: Subscription details and Firebase connection status */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-600" />
            <span>بيانات الاشتراك وقاعدة البيانات</span>
          </h3>

          {/* Card: Duration Details */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide border-b border-slate-50 pb-2">
              مدة تفعيل الرخصة الحالية
            </h4>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">الاشتراك الحالي:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  نشط (تجريبي)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>تاريخ بداية الحساب:</span>
                <span className="font-mono text-slate-700 font-semibold">
                  {userProfile?.subStartDate ? new Date(userProfile.subStartDate).toLocaleDateString("ar-EG") : "--"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>تاريخ انتهاء المفعول:</span>
                <span className="font-mono text-amber-700 font-extrabold bg-amber-50 px-2 py-0.5 rounded">
                  {userProfile?.subEndDate ? new Date(userProfile.subEndDate).toLocaleDateString("ar-EG") : "--"}
                </span>
              </div>
            </div>

            {/* Referral section */}
            <div className="mt-4 pt-4 border-t border-slate-100 bg-amber-50/30 p-4 rounded-xl">
              <h5 className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                <Gift className="w-4 h-4 text-amber-600" />
                <span>دعوة صديق واحصل على أشهر مجانية</span>
              </h5>
              <p className="text-[11px] text-amber-800/80 leading-relaxed mb-3">
                شارك كودك الخاص، وسيدخل حساب كلاهما شهراً إضافياً كلياً بمجرد تفعيل حسابه من المشرف!
              </p>
              <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-amber-200">
                <span className="text-xs font-mono font-bold text-slate-700 select-all px-1">
                  {userProfile?.referralCode || "REF-ERROR"}
                </span>
                <button
                  onClick={copyReferral}
                  className="mr-auto text-amber-600 hover:text-amber-700 p-1 rounded hover:bg-slate-50 transition cursor-pointer"
                  title="نسخ كود الإحالة"
                >
                  {copiedCode ? (
                    <span className="text-[10px] text-emerald-600 font-bold">تم نسخ!</span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card: Firebase connection state */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide border-b border-slate-50 pb-2">
              الاتصال السحابي بالخادوم
            </h4>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>الاتصال بـ Cloud Firestore:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  نشط ومستقر
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>الاسم المسجل الفريد:</span>
                <span className="text-emerald-600 font-bold">محفوظ في /usernames</span>
              </div>
              <div className="flex items-center justify-between">
                <span>منفذ المنصة:</span>
                <span className="text-slate-500 font-mono">Port 3000 (Proxy Target)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
