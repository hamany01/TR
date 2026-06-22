import React, { useState, useEffect } from "react";
import { getFirebaseDb } from "../firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { 
  seedTemplates, 
  ReminderTemplate 
} from "../seedTemplates";
import MyEvents from "./MyEvents";
import EventForm from "./EventForm";
import { EventDoc } from "../types";
import { 
  Home,
  Clock, 
  Settings, 
  LogOut, 
  Zap, 
  Smartphone, 
  Calendar,
  RefreshCw,
  Bell,
  CheckCircle,
  Menu,
  X,
  User as UserIcon,
  Crown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import HomePage from "./HomePage";
import TemplatesPage from "./TemplatesPage";
import SettingsPage from "./SettingsPage";

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<"home" | "events" | "templates" | "settings">("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Profile and template states
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

  // Events master state (aggregated from EventsPage/MyEvents)
  const [events, setEvents] = useState<EventDoc[]>([]);

  // States for user dynamic settings
  const [tgNotification, setTgNotification] = useState(false);
  const [desktopNotification, setDesktopNotification] = useState(false);
  const [browserNotification, setBrowserNotification] = useState(false);
  const [browserPermissionState, setBrowserPermissionState] = useState<string>("default");

  // States for event configuration modals
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
        const data = snap.data();
        setUserProfile(data);
        setTgNotification(!!data.telegramChatId);
      } else {
        // Fallback or guest simulation if database connection is pending configuration
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
          region: "الرياض، السعودية",
          isAdmin: false
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
      // Fallback
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
        region: "الرياض، السعودية",
        isAdmin: false
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

  // Copy Referral helper
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
      await loadData();
    } catch (err) {
      console.error("Failed to seed default templates:", err);
      alert("خطأ أثناء إدخال البيانات الافتراضية. تأكد من تهيئة مفاتيح Firebase أولاً.");
    } finally {
      setSeedLoading(false);
    }
  };

  // Request chrome browser notifications permission
  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) {
      alert("هذا المتصفح لا يدعم الإشعارات");
      return;
    }
    if (Notification.permission === "denied") {
      alert("تم حجب الإشعارات. افتح إعدادات الموقع من شريط العنوان وغيّر الإشعارات إلى السماح يدوياً.");
      setBrowserPermissionState("denied");
      setBrowserNotification(false);
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserPermissionState(permission);
      if (permission === "granted") {
        setBrowserNotification(true);
        new Notification("منصة تذكير ✅", {
          body: "تم تفعيل إشعارات المتصفح بنجاح!",
          icon: "/favicon.ico",
        });
      } else {
        setBrowserNotification(false);
        alert("لم يتم منح الإذن. يرجى السماح يدوياً من إعدادات المتصفح.");
      }
    } catch (err) {
      console.error("Error setting notification permission:", err);
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

  const isAdmin = !!userProfile?.isAdmin;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col" dir="rtl">
      
      {/* Dynamic Navbar header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm" id="main-navigation-navbar">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo / Title brand */}
            <div className="flex items-center gap-3">
              <span className="p-2 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-xl text-white shadow-md shadow-amber-500/20">
                <Bell className="w-5 h-5" />
              </span>
              <span className="font-extrabold text-slate-800 tracking-tight text-md">
                تذكير المواعيد الذكي
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-extrabold rounded-md flex items-center gap-1 border border-rose-100 select-none">
                  <Crown className="w-3 h-3 text-rose-500 fill-rose-500" />
                  مشرف إداري
                </span>
              )}
            </div>

            {/* Desktop Nav menu items */}
            <nav className="hidden md:flex gap-1.5 text-slate-600 font-bold text-sm">
              <button
                onClick={() => { setActiveTab("home"); setMobileMenuOpen(false); }}
                className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${activeTab === "home" ? "bg-amber-50 text-amber-700 font-extrabold" : "hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <Home className="w-4 h-4" />
                <span>الرئيسية</span>
              </button>
              
              <button
                onClick={() => { setActiveTab("events"); setMobileMenuOpen(false); }}
                className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${activeTab === "events" ? "bg-amber-50 text-amber-700 font-extrabold" : "hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <Calendar className="w-4 h-4" />
                <span>الأحداث</span>
              </button>

              <button
                onClick={() => { setActiveTab("templates"); setMobileMenuOpen(false); }}
                className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${activeTab === "templates" ? "bg-amber-50 text-amber-700 font-extrabold" : "hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <Smartphone className="w-4 h-4" />
                <span>القوالب</span>
              </button>

              <button
                onClick={() => { setActiveTab("settings"); setMobileMenuOpen(false); }}
                className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${activeTab === "settings" ? "bg-amber-50 text-amber-700 font-extrabold" : "hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <Settings className="w-4 h-4" />
                <span>الإعدادات</span>
              </button>
            </nav>

            {/* Left side actions (User badge info & logout button) */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-xs text-slate-500 font-semibold bg-slate-100 py-1.5 px-3 rounded-full flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>{userProfile?.username || user.email?.split("@")[0]}</span>
              </span>

              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="تسجيل الخروج"
                id="header-logout-btn"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Mobile menu trigger button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile menu panel dropdown */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-t border-slate-100 p-4 space-y-2 text-right text-sm font-bold flex flex-col"
          >
            <button
              onClick={() => { setActiveTab("home"); setMobileMenuOpen(false); }}
              className={`w-full py-2.5 px-4 rounded-xl text-right flex items-center gap-2 cursor-pointer ${activeTab === "home" ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Home className="w-4 h-4" />
              <span>الرئيسية</span>
            </button>
            <button
              onClick={() => { setActiveTab("events"); setMobileMenuOpen(false); }}
              className={`w-full py-2.5 px-4 rounded-xl text-right flex items-center gap-2 cursor-pointer ${activeTab === "events" ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Calendar className="w-4 h-4" />
              <span>الأحداث والمنبهات</span>
            </button>
            <button
              onClick={() => { setActiveTab("templates"); setMobileMenuOpen(false); }}
              className={`w-full py-2.5 px-4 rounded-xl text-right flex items-center gap-2 cursor-pointer ${activeTab === "templates" ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Smartphone className="w-4 h-4" />
              <span>القوالب الجاهزة</span>
            </button>
            <button
              onClick={() => { setActiveTab("settings"); setMobileMenuOpen(false); }}
              className={`w-full py-2.5 px-4 rounded-xl text-right flex items-center gap-2 cursor-pointer ${activeTab === "settings" ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Settings className="w-4 h-4" />
              <span>الإعدادات والربط</span>
            </button>
            
            <div className="border-t border-slate-100 pt-3 mt-1 flex items-center justify-between text-xs text-slate-500 font-semibold px-4 pb-2">
              <span className="flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span>{userProfile?.username || user.email?.split("@")[0]}</span>
              </span>
              <button
                onClick={onLogout}
                className="text-rose-600 flex items-center gap-1 font-bold cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>خروج آمن</span>
              </button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Main Tab Routing Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "home" && (
              <HomePage 
                user={user}
                userProfile={userProfile}
                events={events}
                copiedCode={copiedCode}
                copyReferral={copyReferral}
              />
            )}

            {activeTab === "events" && (
              <MyEvents
                userId={user.uid}
                userProfile={userProfile}
                refreshTrigger={refreshEventsTrigger}
                onAddNewEvent={() => {
                  setEventToEdit(null);
                  setEventFormOpen(true);
                }}
                onEditEvent={(eventSelected) => {
                  setEventToEdit(eventSelected);
                  setEventFormOpen(true);
                }}
                onEventsLoaded={(list) => setEvents(list)}
              />
            )}

            {activeTab === "templates" && (
              <TemplatesPage
                userProfile={userProfile}
                dbTemplates={dbTemplates}
                seedLoading={seedLoading}
                seedSuccess={seedSuccess}
                onTriggerSeeding={triggerSeeding}
              />
            )}

            {activeTab === "settings" && (
              <SettingsPage
                user={user}
                userProfile={userProfile}
                botUsername={botUsername}
                setBotUsername={setBotUsername}
                tgNotification={tgNotification}
                copiedTg={copiedTg}
                copyTgLink={copyTgLink}
                showPythonInstructions={showPythonInstructions}
                setShowPythonInstructions={setShowPythonInstructions}
                copiedPythonCode={copiedPythonCode}
                setCopiedPythonCode={setCopiedPythonCode}
                browserNotification={browserNotification}
                browserPermissionState={browserPermissionState}
                requestBrowserPermission={requestBrowserPermission}
                onLogout={onLogout}
                onRefreshProfile={loadData}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Shared Modals Section (Event Add / Edit Form) */}
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

      {/* Simple informative page footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>نهج تنظيم إداري عادل ومبسط لجميع المهام والقرارات.</span>
          <span>© {new Date().getFullYear()} منصة تذكر للمواعيد - جميع الحقوق محفوظة</span>
        </div>
      </footer>

    </div>
  );
}
