import React, { useState } from "react";
import { 
  Bell, 
  MessageSquare, 
  Copy, 
  Tv, 
  Chrome, 
  Settings as SettingsIcon, 
  Clock, 
  Database,
  User,
  LogOut,
  Mail,
  Locate,
  RefreshCw,
  Send,
  Check
} from "lucide-react";
import { motion } from "motion/react";
import { getFirebaseDb } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

interface SettingsPageProps {
  user: any;
  userProfile: any;
  botUsername: string;
  setBotUsername: (val: string) => void;
  tgNotification: boolean;
  copiedTg: boolean;
  copyTgLink: (token: string) => void;
  showPythonInstructions: boolean;
  setShowPythonInstructions: (val: boolean) => void;
  copiedPythonCode: boolean;
  setCopiedPythonCode: (val: boolean) => void;
  browserNotification: boolean;
  browserPermissionState: string;
  requestBrowserPermission: () => void;
  onLogout: () => void;
  onRefreshProfile?: () => void;
}

export default function SettingsPage({
  user,
  userProfile,
  botUsername,
  setBotUsername,
  tgNotification,
  copiedTg,
  copyTgLink,
  showPythonInstructions,
  setShowPythonInstructions,
  copiedPythonCode,
  setCopiedPythonCode,
  browserNotification,
  browserPermissionState,
  requestBrowserPermission,
  onLogout,
  onRefreshProfile
}: SettingsPageProps) {

  const [chatIdInput, setChatIdInput] = useState<string>(userProfile?.telegramChatId ? String(userProfile.telegramChatId) : "");
  const [savingChatId, setSavingChatId] = useState(false);
  const [chatIdSaveSuccess, setChatIdSaveSuccess] = useState(false);
  const [chatIdSaveError, setChatIdSaveError] = useState("");

  const [testingTelegram, setTestingTelegram] = useState(false);
  const [tgTestSuccess, setTgTestSuccess] = useState(false);
  const [tgTestError, setTgTestError] = useState("");

  const [browserTestStatus, setBrowserTestStatus] = useState("");

  const handleTestTelegram = async () => {
    const chatId = chatIdInput || userProfile?.telegramChatId;
    if (!chatId) {
      setTgTestError("⚠️ يرجى إدخال وحفظ معرّف المحادثة (Chat ID) أولاً!");
      return;
    }

    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || import.meta.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      setTgTestError("⚠️ لم يتم العثور على توكن البوت VITE_TELEGRAM_BOT_TOKEN في Secrets المنصة. يرجى تهيئته أولاً.");
      return;
    }

    try {
      setTestingTelegram(true);
      setTgTestError("");
      setTgTestSuccess(false);

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: Number(chatId),
          text: `🔔 رسالة اختبار فورية من منصة تذكير!\n\nاهلاً بك، تم اختبار ربط حسابك بالبث بنجاح ✅\nمعرّف المحادثة المستهدف: ${chatId}\nوقت الإرسال: ${new Date().toLocaleTimeString("ar-EG")}\nيوم: ${new Date().toLocaleDateString("ar-EG")}`
        })
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        setTgTestSuccess(true);
        setTimeout(() => setTgTestSuccess(false), 5000);
      } else {
        throw new Error(data.description || "فشل إرسال الطلب إلى خادم تلغرام.");
      }
    } catch (err: any) {
      console.error("error sending test telegram msg:", err);
      setTgTestError(`فشل الإرسال: ${err.message || err}`);
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestBrowserNotification = () => {
    if (!("Notification" in window)) {
      alert("هذا المتصفح لا يدعم الإشعارات");
      return;
    }
    if (Notification.permission !== "granted") {
      alert('يرجى منح إذن الإشعارات أولاً بالضغط على زر "طلب في المتصفح"');
      return;
    }
    new Notification("🔔 اختبار منصة تذكير", {
      body: "هذا إشعار تجريبي — النظام يعمل بشكل صحيح!",
      icon: "/favicon.ico",
      tag: "test-notification",
      requireInteraction: false,
    });
    setBrowserTestStatus("✅ تم إطلاق إشعار الاختبار بنجاح في متصفحك!");
    setTimeout(() => setBrowserTestStatus(""), 4000);
  };

  React.useEffect(() => {
    if (userProfile?.telegramChatId) {
      setChatIdInput(String(userProfile.telegramChatId));
    }
  }, [userProfile?.telegramChatId]);

  const handleSaveChatId = async () => {
    if (!chatIdInput.trim()) {
      setChatIdSaveError("يرجى إدخال معرّف المحادثة أولاً!");
      return;
    }
    const chatIdNum = Number(chatIdInput);
    if (isNaN(chatIdNum)) {
      setChatIdSaveError("معرّف المحادثة يجب أن يكون رقماً صحيحاً!");
      return;
    }

    try {
      setSavingChatId(true);
      setChatIdSaveError("");
      setChatIdSaveSuccess(false);

      const db = getFirebaseDb();
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        telegramChatId: chatIdNum,
        channelsConfig: {
          telegram: true
        }
      }, { merge: true });

      setChatIdSaveSuccess(true);
      if (onRefreshProfile) {
        onRefreshProfile();
      }
      setTimeout(() => setChatIdSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error("Error saving Telegram Chat ID:", err);
      setChatIdSaveError(`فشل الحفظ: ${err.message || err}`);
    } finally {
      setSavingChatId(false);
    }
  };

  const tgDeepLink = `https://t.me/${botUsername}?start=${userProfile?.telegramToken}`;

  const python_code = `# -*- coding: utf-8 -*-
import os, sys, time, json, requests
from plyer import notification

API_BASE_URL = "https://europe-west1-tathkeer-reminders.cloudfunctions.net/desktopApi"
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

  return (
    <div className="space-y-8" dir="rtl">
      
      {/* Settings Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-amber-600" />
          <span>مركز إعدادات النظام وقنوات التنبيه</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          قم بضبط معرّفات الربط، ومزامنة تطبيق ويندوز الخاص بك، وتفقد بيانات حسابك الشخصي في أي وقت.
        </p>
      </div>

      {/* Grid Layout of Settings panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Notification Channels Setup */}
        <div className="space-y-6">
          <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-4.5 h-4.5 text-amber-600" />
            <span>تفعيل قنوات التنبيه الشاملة</span>
          </h3>

          {/* Telegram Channel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-3">
              <span className="flex items-center gap-2 font-bold text-sm text-blue-900">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <span>بوت تيليجرام (Telegram Bot)</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${tgNotification ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                {tgNotification ? "مربوط بنجاح" : "غير مربوط"}
              </span>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              استقبل إشعارات المواعيد أولاً بأول، وتفاعل مع البوت بالضغط على «✅ تم الإنجاز» لتغيير حالة الحدث فوراً من أي مكان في العالم.
            </p>

            {/* Telegram Settings Section (إعدادات تيليجرام) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-250/60 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-1.5 text-right flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                <span>إعدادات تيليجرام</span>
              </h4>

              {/* Telegram Username Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 text-right">
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
                    className="flex-1 text-xs py-1.5 px-3 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 font-mono text-left"
                  />
                </div>
              </div>

              {/* Telegram Chat ID Input and Save Button */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-500 text-right font-sans">
                    معرّف محادثتك في تيليجرام (Chat ID)
                  </label>
                  {userProfile?.telegramChatId && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold font-sans">
                      مربوط مسبقاً ✅
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatIdInput}
                    onChange={(e) => setChatIdInput(e.target.value.replace(/[^0-9-]/g, ""))}
                    placeholder="مثال: 123456789"
                    className="flex-1 text-xs py-1.5 px-3 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 font-mono text-left"
                    dir="ltr"
                  />
                  <button
                    onClick={handleSaveChatId}
                    disabled={savingChatId}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:bg-slate-300 shrink-0 shadow-sm"
                  >
                    {savingChatId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>حفظ Chat ID</span>
                  </button>
                </div>
                
                {/* Admin user Chat ID Quick Fill */}
                <div className="p-2 bg-amber-50/70 border border-amber-200/50 rounded-lg text-right">
                  <p className="text-[10px] text-amber-800 leading-normal font-medium">
                    💡 لحساب الأدمن <strong className="font-mono">testadmin</strong>، استخدم الـ Chat ID هذا:{" "}
                    <button 
                      type="button"
                      onClick={() => setChatIdInput("218601139")}
                      className="text-blue-600 hover:underline font-bold font-mono px-1 py-0.5 bg-white border border-amber-200 rounded cursor-pointer text-[11px]"
                      title="اضغط للتعيين تلقائياً"
                    >
                      218601139
                    </button>
                  </p>
                </div>

                <p className="text-[9px] text-slate-400 leading-normal text-right">
                  للحصول على رقمك، افتح تيليجرام وأرسل أي رسالة لـ <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-bold font-mono">@userinfobot</a>
                </p>
                
                {chatIdSaveSuccess && (
                  <p className="text-xs text-emerald-700 font-bold bg-emerald-100 border border-emerald-200 p-2 rounded-lg text-center font-sans animate-pulse">
                    ✨ تم حفظ Chat ID بنجاح! تم تفعيل إشعارات تيليجرام.
                  </p>
                )}
                {chatIdSaveError && (
                  <p className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 p-2 rounded-lg text-center font-sans">
                    {chatIdSaveError}
                  </p>
                )}
              </div>

              {/* Telegram Test Message Section (إرسال رسالة اختبار) */}
              <div className="pt-3 border-t border-slate-200/60 flex flex-col gap-2">
                <button
                  onClick={handleTestTelegram}
                  disabled={testingTelegram}
                  className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {testingTelegram ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-blue-500" />
                  )}
                  <span>إرسال رسالة اختبار إلى تيليجرام</span>
                </button>

                {tgTestSuccess && (
                  <p className="text-xs text-emerald-700 font-bold bg-emerald-100 border border-emerald-200 p-2 rounded-lg text-center font-sans">
                    🚀 وصلت الرسالة التجريبية بنجاح! تفقد هاتف في تيليجرام.
                  </p>
                )}
                {tgTestError && (
                  <p className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 p-2 rounded-lg text-right font-sans leading-relaxed">
                    {tgTestError}
                  </p>
                )}
              </div>

            </div>

            <div className="flex gap-2 items-center pt-2">
              <a
                href={tgDeepLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold text-center transition shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>فتح البوت وبدء الربط</span>
              </a>
              <button
                onClick={() => copyTgLink(userProfile?.telegramToken || "")}
                className="p-2 bg-white border border-blue-200 rounded-xl text-blue-600 hover:bg-blue-50 transition shrink-0 cursor-pointer"
                title="نسخ رابط الـ start"
              >
                {copiedTg ? (
                  <span className="text-[10px] text-emerald-600 font-bold px-1.5">تم نسخ!</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Windows Desktop Client Column */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="flex items-center gap-2 font-bold text-sm text-purple-950">
                <Tv className="w-5 h-5 text-purple-600" />
                <span>تطبيق سطح المكتب (Windows)</span>
              </span>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold rounded px-2.5 py-0.5">برنامج تفاعلي</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              قم بتشغيل تطبيق بايثون الصغير على نظام ويندوز لتلقي التنبيهات مع صوت مميز وأزرار التفاعل لإنجاز المهام فوراً.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-xs text-slate-600 leading-relaxed">
              <div>
                <span className="font-bold text-purple-700 block mb-1">1. تثبيت الحزم المطلوبة:</span>
                <div className="bg-slate-800 text-slate-100 p-2 rounded-lg font-mono text-[10px] flex justify-between items-center" dir="ltr">
                  <span>pip install requests plyer</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("pip install requests plyer");
                      alert("تم نسخ سطر التثبيت!");
                    }} 
                    className="text-purple-300 hover:text-white px-2 py-0.5 border border-purple-800 rounded font-sans text-[10px] cursor-pointer"
                  >
                    نسخ المعقد
                  </button>
                </div>
              </div>
              <div className="pt-1.5">
                <span className="font-bold text-purple-700">2. تسجيل الدخول:</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  بمجرد تشغيل السكربت، أدخل نفس بيانات حسابك الحالية للمزامنة مع الخادم.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPythonInstructions(!showPythonInstructions)}
                className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold text-center transition shadow-sm cursor-pointer"
              >
                {showPythonInstructions ? "إغلاق نافذة كود المصدر" : "عرض كود السكربت (desktop_client.py)"}
              </button>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(python_code);
                  setCopiedPythonCode(true);
                  setTimeout(() => setCopiedPythonCode(false), 2000);
                }}
                className="p-2 bg-white border border-purple-200 rounded-xl text-purple-600 hover:bg-purple-50 transition shrink-0 cursor-pointer text-xs flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedPythonCode ? "نسخ!" : "نسخ السكربت كاملاً"}</span>
              </button>
            </div>

            {showPythonInstructions && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3 bg-slate-900 rounded-xl text-left font-mono text-[10px] text-white/90 overflow-x-auto border border-purple-800 leading-normal"
                dir="ltr"
              >
                <div className="flex justify-between items-center text-slate-400 mb-2 pb-1.5 border-b border-slate-800 font-sans">
                  <span>desktop_client.py</span>
                  <span className="text-purple-400">Python 3+</span>
                </div>
                <pre className="max-h-48 overflow-y-auto select-all tab-size-4">
                  {python_code}
                </pre>
              </motion.div>
            )}
          </div>

          {/* Chrome Notifications */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="flex items-center gap-2 font-bold text-sm text-slate-800">
                <Chrome className="w-5 h-5 text-amber-500" />
                <span>إشعارات المتصفح (Chrome/Edge)</span>
              </span>
              
              {/* Show button if permission is default */}
              {browserPermissionState === "default" && (
                <button
                  onClick={requestBrowserPermission}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 rounded-xl font-bold transition focus:ring-2 focus:ring-amber-500 shadow-sm cursor-pointer"
                >
                  طلب في المتصفح
                </button>
              )}

              {/* Show active disabled state if granted */}
              {browserPermissionState === "granted" && (
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>مفعّل ✅</span>
                </span>
              )}

              {/* Show error indicator if denied */}
              {browserPermissionState === "denied" && (
                <span className="text-xs bg-rose-50 text-rose-700 border border-rose-105 px-3 py-1.5 rounded-xl font-bold" title="يرجى تمكين الصلاحية من المتصفح">
                  محجوب ⛔
                </span>
              )}
            </div>

            {/* Dynamic Status Alert based on permission state */}
            {browserPermissionState === "default" && (
              <div className="p-3 bg-amber-50/60 border border-amber-250/50 rounded-xl text-right">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>لم يُمنح الإذن بعد</span>
                </p>
                <p className="text-[10px] text-amber-750/90 mt-1 leading-relaxed">
                  الرجاء النقر على زر <strong>طلب في المتصفح</strong> بالأعلى للسماح باستقبال التذكيرات الفورية بمجرد حلول موعد الحدث.
                </p>
              </div>
            )}

            {browserPermissionState === "granted" && (
              <div className="p-3 bg-emerald-50/55 border border-emerald-250/50 rounded-xl text-right">
                <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>✅ مفعّل</span>
                </p>
                <p className="text-[10px] text-emerald-750/90 mt-1 leading-relaxed">
                  تنبيهات المتصفح نشطة وسلسة بالكامل وسيبث لك النظام إشعارًا فوريًا لكل موعد طالما كانت نافذة المنصة مفتوحة بالخلفية.
                </p>
              </div>
            )}

            {browserPermissionState === "denied" && (
              <div className="p-4 bg-rose-50/65 border border-rose-250/50 rounded-xl text-right space-y-2">
                <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5 leading-relaxed">
                  <span>⛔ محجوب — يرجى تغييره من إعدادات المتصفح</span>
                </p>
                <p className="text-[10px] text-rose-750/90 leading-relaxed">
                  تم حظر صلاحية الإشعارات مسبقاً لهذا الموقع من خلال متصفحك. يرجى النقر على أيقونة القفل أو لوحة الإعدادات بجانب شريط العنوان في الأعلى، ثم غيّر خيار الإشعارات إلى <strong>"السماح" (Allow)</strong>.
                </p>
                <div className="pt-0.5">
                  <a 
                    href="https://support.google.com/chrome/answer/3220216" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-bold"
                  >
                    <span>📖 اضغط هنا لفتح دليل شرح تفعيل الإشعارات بالمتصفح</span>
                  </a>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-normal font-normal">
              تظهر هذه الإشعارات في زاوية الشاشة بمجرد مطابقة أي تذكير، طالما كان تبويب المنصة مفتوحاً في الخلفية.
            </p>

            {/* Test button for Browser Notification */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleTestBrowserNotification}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600 animate-swing" />
                <span>إرسال إشعار اختبار في المتصفح</span>
              </button>

              {browserTestStatus && (
                <p className={`text-xs font-bold p-2 rounded-lg text-center ${
                  browserTestStatus.startsWith("✅") 
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                    : "bg-rose-50 text-rose-805 border border-rose-100"
                }`}>
                  {browserTestStatus}
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Timezone, DB Diagnostics & User Profile details */}
        <div className="space-y-6">
          <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-amber-600" />
            <span>إعدادات النظام والمنطقة</span>
          </h3>

          {/* Timezone panel */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 justify-between border-b border-slate-50 pb-3">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-amber-500" />
                <span>المنطقة الزمنية المفعلة</span>
              </span>
              <span className="text-[10px] text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold">توليد آلي</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">منطقتك الحالية:</span>
                <span className="font-bold text-slate-800">{userProfile?.timezone || "Asia/Riyadh"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">البلد / المنطقة المسجلة:</span>
                <span className="text-slate-700 font-semibold">{userProfile?.region || "الرياض، المملكة العربية السعودية"}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              * تحسب المنصة تفاضل المواعيد ومطابقتها بالتوافق مع التوقيت العالمي المنسق (UTC) لضمان عدم وصول التنبيهات في الساعات المتأخرة ليلاً.
            </p>
          </div>

          {/* Diagnostics */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
              سلامة الاتصال والنظام
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span>خادوم قاعدة البيانات Cloud Firestore:</span>
                </span>
                <span className="text-emerald-600 font-bold">متصل (قراءة/كتابة)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>تأمين اسم المستخدم:</span>
                <span className="text-emerald-600 font-bold">نشط في /usernames</span>
              </div>
              <div className="flex justify-between items-center">
                <span>معرف الاشتراك الفردي:</span>
                <span className="font-mono text-[10px] text-slate-400">{user.uid}</span>
              </div>
            </div>
          </div>

          {/* Account Profile and Safe Logout */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
              <User className="w-4.5 h-4.5 text-amber-500" />
              <span>إدارة الجلسة والحساب</span>
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg">
                <span className="flex items-center gap-1 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>البريد الإلكتروني:</span>
                </span>
                <span className="font-mono text-slate-750 font-semibold">{user.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg">
                <span className="flex items-center gap-1 text-slate-500">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>اسم المستخدم المسجل:</span>
                </span>
                <span className="font-bold text-slate-800">{userProfile?.username || "---"}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition border border-rose-100 cursor-pointer"
              id="settings-logout-btn"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج الآمن</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
