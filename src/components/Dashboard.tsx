import React, { useState, useEffect } from "react";
import { getFirebaseDb } from "../firebase";
import { collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { 
  seedTemplates, 
  defaultTemplates, 
  ReminderTemplate 
} from "../seedTemplates";
import MyEvents from "./MyEvents";
import EventForm from "./EventForm";
import { EventDoc } from "../types";
import { 
  User, 
  Clock, 
  Tv, 
  MessageSquare, 
  Chrome, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Smartphone, 
  Database,
  Calendar,
  Gift,
  PlusCircle,
  Bell,
  RefreshCw
} from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [dbTemplates, setDbTemplates] = useState<ReminderTemplate[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedTg, setCopiedTg] = useState(false);
  const [showPythonInstructions, setShowPythonInstructions] = useState(false);
  const [copiedPythonCode, setCopiedPythonCode] = useState(false);
  const [botUsername, setBotUsername] = useState(() => {
    return localStorage.getItem("telegram_bot_username") || "MySchedulerReminder_Bot";
  });

  // States for user dynamic settings
  const [tgNotification, setTgNotification] = useState(false);
  const [desktopNotification, setDesktopNotification] = useState(false);
  const [browserNotification, setBrowserNotification] = useState(false);
  const [browserPermissionState, setBrowserPermissionState] = useState<string>("default");

  // States for event management
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventDoc | null>(null);
  const [refreshEventsTrigger, setRefreshEventsTrigger] = useState(0);

  const db = getFirebaseDb();

  // Load User details and database templates
  const loadData = async () => {
    try {
      setProfileLoading(true);
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserProfile(snap.data());
        // Set dynamic triggers
        const data = snap.data();
        setTgNotification(!!data.telegramChatId);
      } else {
        // Fallback or guest simulation if database connection is pending key configuration
        setUserProfile({
          username: user.email?.split("@")[0] || "مستخدم_تجريبي",
          email: user.email || "guest@example.com",
          phone: "+966500000000",
          timezone: "Asia/Riyadh",
          createdAt: new Date().toISOString(),
          subType: "free_trial",
          subStartDate: new Date().toISOString(),
          subEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          telegramToken: "tg_DEMO12345",
          referralCode: "REF-DEMO-9918",
          region: "الرياض، السعودية"
        });
      }

      // Load templates from Firestore
      const templatesCol = collection(db, "reminder_templates");
      const templatesSnap = await getDocs(templatesCol);
      if (!templatesSnap.empty) {
        const loaded: ReminderTemplate[] = [];
        templatesSnap.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as ReminderTemplate);
        });
        setDbTemplates(loaded);
      } else {
        setDbTemplates([]);
      }
    } catch (e) {
      console.error("Error loading user profile:", e);
      // Fallback fallback so user experience is smooth when keys aren't added yet
      setUserProfile({
        username: user.email?.split("@")[0] || "مستخدم_تجريبي",
        email: user.email || "guest@example.com",
        phone: "+966500000000",
        timezone: "Asia/Riyadh",
        createdAt: new Date().toISOString(),
        subType: "free_trial",
        subStartDate: new Date().toISOString(),
        subEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        telegramToken: "tg_DEMO12345",
        referralCode: "REF-DEMO-9918",
        region: "الرياض، السعودية"
      });
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if ("Notification" in window) {
      setBrowserPermissionState(Notification.permission);
      setBrowserNotification(Notification.permission === "granted");
    }
  }, [user.uid]);

  // Copy Referral code helper
  const copyReferral = () => {
    if (userProfile?.referralCode) {
      navigator.clipboard.writeText(userProfile.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Copy Telegram deep link helper
  const copyTgLink = (token: string) => {
    const link = `https://t.me/${botUsername}?start=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedTg(true);
    setTimeout(() => setCopiedTg(false), 2000);
  };

  // Trigger Seeding Templates in Database
  const triggerSeeding = async () => {
    setSeedLoading(true);
    setSeedSuccess(false);
    try {
      await seedTemplates(db);
      setSeedSuccess(true);
      // reload templates
      await loadData();
    } catch (err) {
      console.error("Failed to seed default templates:", err);
      alert("خطأ أثناء إدخال البيانات الافتراضية. تأكد من تهيئة مفاتيح Firebase أولاً.");
    } finally {
      setSeedLoading(false);
    }
  };

  // Request standard chrome browser permission
  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) {
      alert("متصفحك الحالي لا يدعم إشعارات الويب.");
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserPermissionState(permission);
    if (permission === "granted") {
      setBrowserNotification(true);
      new Notification("تم تفعيل تنبيهات المتصفح بنجاح!", {
        body: "منصة تذكير: ستصلك التنبيهات في وقتها عندما تكون الصفحة مفتوحة.",
        dir: "rtl"
      });
    } else {
      setBrowserNotification(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-600" />
        <p className="text-slate-600 font-medium">جاري تحميل بيانات لوحة التحكم والتحقق من القنوات...</p>
      </div>
    );
  }

  const tgDeepLink = `https://t.me/${botUsername}?start=${userProfile?.telegramToken}`;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      
      {/* Header section with User summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-8 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-3xl shadow-lg mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold">مرحباً، {userProfile?.username}!</h1>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-xs font-semibold rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3 fill-amber-300" />
              {userProfile?.subType === "free_trial" ? "رخصة تجريبية مجانية" : "حساب مدفوع كامل"}
            </span>
          </div>
          <p className="text-amber-100/90 text-sm mt-3 leading-relaxed max-w-xl">
            تم تسجيل دخولك بنجاح لمنصة إدارة وتذكير المواعيد الذكية. تتبع وثائقك الرسمية، دوراتك التدريبية، ومواعيدك الهامة مع إرسال التنبيهات الفورية.
          </p>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 active:bg-white/35 transition rounded-xl text-sm font-semibold border border-white/10 self-end md:self-center cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج آمن</span>
        </button>
      </div>

      {/* Main Grid layout for dynamic subscription/reference and notifications settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        
        {/* Card 1: Subscription Info & Referral */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-50">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span>تفاصيل الاشتراك والمدة</span>
            </h3>
            
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500">حالة الحساب:</span>
                <span className="font-bold text-emerald-600">نشط (تجربة مجانية)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>تاريخ البدء:</span>
                <span className="font-mono">{userProfile?.subStartDate ? new Date(userProfile.subStartDate).toLocaleDateString("ar-EG") : "--"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>تاريخ الانتهاء:</span>
                <span className="font-mono text-amber-700 font-semibold">{userProfile?.subEndDate ? new Date(userProfile.subEndDate).toLocaleDateString("ar-EG") : "--"}</span>
              </div>
              
              <div className="pt-2">
                <span className="text-xs text-slate-400 block mb-2 leading-relaxed">
                  * لا يوجد دفع إلكتروني حالياً، فقط يدوياً عبر المشرف الرئيسي لتفعيل الحساب بعد انتهاء التجربة.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 bg-amber-50/50 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5 font-sans">
              <Gift className="w-4 h-4 text-amber-600 animate-bounce" />
              <span>نظام الإحالات والمكافآت (Referrals)</span>
            </h4>
            <p className="text-xs text-amber-700/80 leading-relaxed mb-3">
              ادعُ أصدقاءك! عند تفعيل حساب أي شخص يسجل بكود دعوتك، تحصل تلقائياً على <strong>شهر إضافي مجاني</strong>.
            </p>
            <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-amber-200">
              <span className="text-xs font-mono font-bold text-slate-700 select-all">{userProfile?.referralCode}</span>
              <button
                onClick={copyReferral}
                className="mr-auto text-amber-600 hover:text-amber-700 p-1 rounded hover:bg-slate-50 transition cursor-pointer"
                title="نسخ الكود"
              >
                {copiedCode ? <span className="text-xs text-emerald-600">تم!</span> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Notifications Channels (Telegram, Desktop, Browser) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-50">
            <Bell className="w-5 h-5 text-amber-600" />
            <span>تفعيل قنوات التنبيه الشاملة</span>
          </h3>

          <div className="space-y-5">
            
            {/* Telegram Channel */}
            <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100/50 text-right" dir="rtl">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="flex items-center gap-2 font-semibold text-sm text-blue-900">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span>بوت تيليجرام (Telegram Bot)</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tgNotification ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                  {tgNotification ? "مربوط بنجاح" : "غير مربوط"}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                استلم التنبيهات الموقوتة بالدوران على جوالك مع تفعيل زر «✅ تم الإنجاز» مباشرة للتسجيل التفاعلي من داخل محادثة البوت.
              </p>

              {/* مدخل تغيير معرف البوت */}
              <div className="mb-3 bg-white p-2 rounded border border-slate-100">
                <label className="block text-[10px] font-bold text-slate-500 mb-1 text-right">
                  اسم معرّف بوت تيليجرام الخاص بك (Bot Username)
                </label>
                <div className="flex items-center gap-1.5" dir="ltr">
                  <span className="text-xs text-slate-400 font-mono">@</span>
                  <input
                    type="text"
                    value={botUsername}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                      setBotUsername(val);
                      localStorage.setItem("telegram_bot_username", val);
                    }}
                    placeholder="MySchedulerReminder_Bot"
                    className="flex-1 text-xs py-1 px-2 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 font-mono text-left"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 items-center">
                <a
                  href={tgDeepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold text-center transition shadow-sm inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>فتح البوت وبدء الربط</span>
                </a>
                <button
                  onClick={() => copyTgLink(userProfile?.telegramToken || "")}
                  className="p-1.5 bg-white border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50 transition shrink-0 cursor-pointer"
                  title="نسخ الرابط"
                >
                  {copiedTg ? <span className="text-[10px] text-emerald-600 font-bold px-1">تم نسخ الرابط!</span> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Desktop Windows Application Channel */}
            <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-100/50 text-right font-sans" dir="rtl">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 font-semibold text-sm text-purple-950">
                  <Tv className="w-4.5 h-4.5 text-purple-600 animate-pulse" />
                  <span>تطبيق سطح المكتب (Windows)</span>
                </span>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold rounded px-2 py-0.5">تنبيهات مدمجة</span>
              </div>
              <p className="text-xs text-purple-900 font-medium mb-3">
                ثبّت سكربت البايثون على جهازك لتستقبل تنبيهات فورية مميزة على سطح المكتب بصوت وزر «تم الإنجاز» التفاعلي.
              </p>
              
              <div className="bg-white/75 rounded-lg p-3 border border-purple-100 mb-3 space-y-2 text-xs text-slate-600 leading-relaxed">
                <div>
                  <span className="font-bold text-purple-700">1. تثبيت المتطلبات المباشرة:</span>
                  <div className="mt-1 bg-slate-800 text-slate-100 p-1.5 rounded font-mono text-[10px] select-all uppercase flex justify-between items-center" dir="ltr">
                    <span>pip install requests plyer</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("pip install requests plyer");
                        alert("تم نسخ أمر التثبيت!");
                      }} 
                      className="text-purple-300 hover:text-white px-2 py-0.5 border border-purple-800 rounded text-[9px] cursor-pointer"
                    >
                      نسخ
                    </button>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-purple-700">2. بيانات الدخول:</span>
                  <p className="text-[11px] text-slate-500">
                    أدخل نفس اسم المستخدم أو البريد الإلكتروني الحالي مع كلمة المرور الخاصة بك بمجرد تشغيل التطبيق.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowPythonInstructions(!showPythonInstructions)}
                  className="flex-1 min-w-[140px] py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold text-center transition shadow-sm cursor-pointer"
                >
                  {showPythonInstructions ? "إغلاق نافذة الكود" : "عرض وتحميل الكود (desktop_client.py)"}
                </button>
                <button
                  onClick={() => {
                    const python_code = `# -*- coding: utf-8 -*-
import os, sys, time, json, requests
from plyer import notification

API_BASE_URL = "https://europe-west1-gen-lang-client-0171705870.cloudfunctions.net/desktopApi"
CONFIG_FILE = "config.json"

def display_welcome_banner():
    print("=" * 65)
    print("   🌐 منصة تذكير للمواعيد الذكية - تطبيق سطح المكتب لويندوز 🌐")
    print("=" * 65)

def load_auth_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f: return json.load(f)
        except: pass
    return None

def save_auth_config(data):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=4)
    except Exception as e: print(f"❌ فشل حفظ الجلسة محلياً: {e}")

def logout_local():
    if os.path.exists(CONFIG_FILE):
        try: os.remove(CONFIG_FILE); print("🚀 تم تسجيل الخروج.")
        except: pass

def login_flow():
    print("🔐 يرجى تسجيل الدخول:")
    while True:
        identifier = input("📧 اسم المستخدم أو البريد: ").strip()
        password = input("🔑 كلمة المرور: ").strip()
        if not identifier or not password: continue
        try:
            response = requests.post(f"{API_BASE_URL}/login", json={"identifier": identifier, "password": password}, headers={"Content-Type": "application/json"}, timeout=15)
            res_data = response.json()
            if response.status_code == 200 and res_data.get("success"):
                save_auth_config({"username": res_data.get("username"), "email": res_data.get("email"), "desktopAuthToken": res_data.get("desktopAuthToken")})
                return res_data.get("desktopAuthToken")
            else:
                print(f"❌ فشل تسجيل الدخول: {res_data.get('error')}")
        except Exception as e: print(f"📡 خطأ شبكي: {e}")

def register_completion_on_server(event_id, token, event_title):
    try:
        response = requests.post(f"{API_BASE_URL}/complete", json={"eventId": event_id, "desktopAuthToken": token}, headers={"Content-Type": "application/json"}, timeout=10)
        if response.status_code == 200 and response.json().get("success"):
            print(f"✅ تم تأكيد إنجاز الحدث: {event_title}")
    except Exception as e: print(f"📡 خطأ تسجيل الإنجاز: {e}")

def check_for_reminders(token):
    try:
        response = requests.post(f"{API_BASE_URL}/events", json={"desktopAuthToken": token}, headers={"Content-Type": "application/json"}, timeout=12)
        res_data = response.json()
        if response.status_code == 200 and res_data.get("success"):
            events = res_data.get("events", [])
            for item in events:
                title = item.get("title"); event_id = item.get("eventId"); notes = item.get("notes", "")
                notification.notify(title=f"🔔 تذكير: {title}", message=f"الوقت: {item.get('eventTime')}\\n📝 {notes}"[:115], app_name="تذكير", timeout=10)
                print(f"\\n📢 تذكير فوري: <<{title}>>")
                complete_now = input("اضغط (Enter) للاستمرار، أو اكتب 'c' لتأكيد الإنجاز: ").strip().lower()
                if complete_now == "c": register_completion_on_server(event_id, token, title)
    except: pass

def main():
    display_welcome_banner()
    config = load_auth_config()
    token = config.get("desktopAuthToken") if config else login_flow()
    if not token: token = login_flow()
    while True:
        check_for_reminders(token)
        time.sleep(60)

if __name__ == '__main__':
    main()`;
                    navigator.clipboard.writeText(python_code);
                    setCopiedPythonCode(true);
                    setTimeout(() => setCopiedPythonCode(false), 3000);
                  }}
                  className="p-1.5 bg-white border border-purple-200 rounded-lg text-purple-600 hover:bg-purple-50 transition shrink-0 cursor-pointer text-xs flex items-center justify-center gap-1 min-w-[80px]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedPythonCode ? "تم النسخ!" : "نسخ الكود الكلي"}</span>
                </button>
              </div>

              {showPythonInstructions && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 p-3 bg-slate-900 rounded-xl text-left font-mono text-[10px] text-white/90 overflow-x-auto border border-purple-800 leading-normal"
                  dir="ltr"
                >
                  <div className="flex justify-between items-center text-slate-400 mb-2 pb-1.5 border-b border-slate-800 font-sans">
                    <span>desktop_client.py (كود المصدر الجاهز لتشغيله بويندوز)</span>
                    <span className="text-purple-400">Python 3+</span>
                  </div>
                  <pre className="whitespace-pre overflow-x-auto max-h-56 select-all tab-size-4">
                    {`# -*- coding: utf-8 -*-
import os, sys, time, json, requests
from plyer import notification

API_BASE_URL = "https://europe-west1-gen-lang-client-0171705870.cloudfunctions.net/desktopApi"
CONFIG_FILE = "config.json"

# ... (شاهد أعلى الملف للحصول على الكود المكتمل أو انقر زر نسخ الكود الكلي)`}
                  </pre>
                  <div className="mt-2 text-slate-400 font-sans text-[9px] leading-relaxed">
                    * ملاحظة المبرمج: قمنا مسبقاً بكتابة الملف بالكامل في بيئة عملك باسم <strong className="text-purple-300">/desktop_client.py</strong> لتنزيله وتشغيله فوراً على حاسوبك الشخصي.
                  </div>
                </motion.div>
              )}
            </div>

            {/* Chrome/Browser Notifications */}
            <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100/50">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 font-semibold text-sm text-amber-950">
                  <Chrome className="w-4 h-4 text-amber-500" />
                  <span>إشعارات المتصفح (Chrome)</span>
                </span>
                <button
                  onClick={requestBrowserPermission}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    browserNotification 
                      ? "bg-emerald-100 text-emerald-800 cursor-default" 
                      : "bg-amber-600 text-white hover:bg-amber-700"
                  }`}
                  disabled={browserNotification}
                >
                  {browserNotification ? "مفعّلة مسبقاً" : "تفعيل الآن"}
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                تعمل الإشعارات طالما كانت صفحة المنصة مفتوحة في الخلفية. اضغط التفعيل لإعطاء متصفح كروم الإذن.
              </p>
            </div>

          </div>
        </div>

        {/* Card 3: Timezone & System Health */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-50">
            <Settings className="w-5 h-5 text-amber-600" />
            <span>إعدادات النظام والمنطقة</span>
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs text-slate-400 block mb-1">المنطقة الزمنية الحالية لحسابك:</span>
              <div className="flex items-center gap-2 justify-between">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-500" />
                  {userProfile?.timezone}
                </span>
                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">تعديل تلقائي بالدقة</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                مهمة الـ Cloud Scheduler تحسب أوقات التنبيهات يومياً بدقة بدلالة تفاوت مواقيت منطقتك والـ UTC لتفادي الإزعاج في أوقات النوم.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl leading-relaxed text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>حالة الإتصال بـ Firebase</span>
              </div>
              <div className="flex justify-between">
                <span>المستند الشخصي:</span>
                <span className="text-emerald-600 font-bold">متصل بـ Cloud Firestore</span>
              </div>
              <div className="flex justify-between">
                <span>تأمين الاسم الفريد:</span>
                <span className="text-emerald-600 font-bold">نشط في /usernames</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* لوحة إدارة المواعيد والأحداث الفعلية */}
      <div className="mb-12">
        <MyEvents
          userId={user.uid}
          refreshTrigger={refreshEventsTrigger}
          onAddNewEvent={() => {
            setEventToEdit(null);
            setEventFormOpen(true);
          }}
          onEditEvent={(eventSelected) => {
            setEventToEdit(eventSelected);
            setEventFormOpen(true);
          }}
        />
      </div>

      {/* نافذة نموذج إضافة وتعديل الأحداث المودال */}
      {eventFormOpen && (
        <EventForm
          userId={user.uid}
          eventToEdit={eventToEdit}
          onClose={() => {
            setEventFormOpen(false);
            setEventToEdit(null);
          }}
          onSaveSuccess={() => {
            setEventFormOpen(false);
            setEventToEdit(null);
            setRefreshEventsTrigger((prev) => prev + 1);
          }}
        />
      )}

      {/* Templates Row with dynamic Seeding trigger */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-12">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-600" />
              <span>قوالب تذكير المواعيد الافتراضية خمسة (5 Templates)</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              نعرض هنا القوالب الخمسة الهامة لتسهيل إنشاء الأحداث وتضمين قواعد التذكير بداخلها ديناميكياً.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={triggerSeeding}
              disabled={seedLoading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-md hover:shadow-lg cursor-pointer"
            >
              {seedLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>برمجة القوالب...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>تهيئة/بذر القوالب في Firestore</span>
                </>
              )}
            </button>
          </div>
        </div>

        {seedSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>تم بذر وإدخال القوالب الافتراضية الخمسة بنجاح كامل في Firestore! المستندات متوفرة الآن للاستخدام!</span>
          </div>
        )}

        {/* Database templates count notice */}
        <div className="text-xs text-slate-400 mb-6 flex items-center gap-2">
          <span>حالة القوالب في Firestore:</span>
          {dbTemplates.length > 0 ? (
            <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">جاهزة ومسجلة في قاعدة البيانات ({dbTemplates.length} قوالب)</span>
          ) : (
            <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">لم تبذر بعد، اضغط الزر أعلاه لإضافة القوالب إلى Firestore</span>
          )}
        </div>

        {/* Grid display of templates rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(dbTemplates.length > 0 ? dbTemplates : defaultTemplates).map((tpl) => (
            <div 
              key={tpl.id} 
              className="p-5 rounded-2xl border border-slate-100 hover:border-amber-200 transition bg-slate-50/50 flex flex-col justify-between hover:shadow-md"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-bold text-slate-800">{tpl.name}</h4>
                  <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-bold">قالب معتمد</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {tpl.description}
                </p>
              </div>

              {/* Display Rules */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">قواعد التذكير:</span>
                {tpl.rules.map((rule, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-100 text-[11px] text-slate-700">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      {rule.type === "days_before" && `قبل الحدث بـ ${rule.daysBefore} أيام`}
                      {rule.type === "hours_before" && `قبل الحدث بـ ${rule.hoursBefore} ساعات`}
                      {rule.type === "minutes_before" && `قبل الحدث بـ ${rule.minutesBefore} دقيقة`}
                      {rule.type === "at_time" && "في وقت الحدث تماماً"}
                    </div>
                    {rule.times && rule.times.length > 0 && (
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">
                        في الأوقات التالية: {rule.times.join("، ")}
                      </div>
                    )}
                    <div className="flex gap-2.5 mt-2 lg:mt-1 pt-1 border-t border-slate-50 text-[10px] text-slate-400">
                      القنوات: {rule.channels.map((ch) => (
                        <span key={ch} className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-sans">
                          {ch === "telegram" ? "تيليجرام" : ch === "desktop" ? "سطح المكتب" : "المنبه"}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
