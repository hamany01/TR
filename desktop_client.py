# -*- coding: utf-8 -*-
"""
منصة تذكير الذكية - تطبيق تنبيهات سطح المكتب لـ Windows
===================================================

المتطلبات الأساسية للتشغيل:
1. تثبيت لغة بايثون Python 3.8+ من الموقع الرسمي.
2. تثبيت المكتبات البرمجية المطلوبة عبر موجه الأوامر (CMD/Terminal):
   pip install requests plyer

طريقة التشغيل:
python desktop_client.py

ميزات التطبيق:
- رصد ذكي وتلقائي للتنبيهات الموقوتة بصفة دورية في الخلفية.
- تكنولوجيا الإشعارات المنبثقة الأصلية لنظام ويندوز مع صوت الإنباه التلقائي.
- دعم حفظ جلسة تسجيل الدخول محلياً وجلب البيانات فورياً وحذف الإشعارات المقروءة.
"""

import os
import sys
import time
import json
import requests
from plyer import notification

# رابط الـ Cloud Function الفعلي الذي تم بناؤه في مشروعك
API_BASE_URL = "https://europe-west1-gen-lang-client-0171705870.cloudfunctions.net/desktopApi"
CONFIG_FILE = "config.json"

def display_welcome_banner():
    print("=" * 65)
    print("   🌐 منصة تذكير للمواعيد الذكية - تطبيق سطح المكتب لويندوز 🌐")
    print("=" * 65)
    print("يرجى التأكد من تشغيل السكربت على نظام ويندوز وتثبيت المتطلبات.")
    print("=" * 65 + "\n")

def load_auth_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return None

def save_auth_config(data):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"❌ فشل حفظ الجلسة محلياً: {e}")

def logout_local():
    if os.path.exists(CONFIG_FILE):
        try:
            os.remove(CONFIG_FILE)
            print("🚀 تم تسجيل الخروج بنجاح وحذف ملف التوكن المحلي.")
        except Exception as e:
            print(f"⚠️ فشل حذف ملف الجلسة: {e}")

def login_flow():
    print("🔐 يرجى تسجيل الدخول باستخدام حسابك في منصة تذكير:")
    while True:
        identifier = input("📧 اسم المستخدم أو البريد الإلكتروني: ").strip()
        password = input("🔑 كلمة المرور (سري): ").strip()

        if not identifier or not password:
            print("❌ الحقول مطلوبة! يرجى إدخال البيانات مجدداً.")
            continue

        print("\n⏳ جاري المصادقة الآمنة عبر المنصة للتحقق...")
        try:
            response = requests.post(
                f"{API_BASE_URL}/login",
                json={"identifier": identifier, "password": password},
                headers={"Content-Type": "application/json"},
                timeout=15
            )

            res_data = response.json()
            if response.status_code == 200 and res_data.get("success"):
                print(f"\n🎉 مرحباً بك مجدداً {res_data.get('username')}! تمت المصادقة بنجاح.")
                save_auth_config({
                    "username": res_data.get("username"),
                    "email": res_data.get("email"),
                    "desktopAuthToken": res_data.get("desktopAuthToken")
                })
                return res_data.get("desktopAuthToken")
            else:
                error_msg = res_data.get("error", "اسم المستخدم أو كلمة المرور غير صحيحة.")
                print(f"❌ فشل تسجيل الدخول: {error_msg}\n")
        except Exception as e:
            print(f"📡 خطأ شبكي: لم نتمكن من الوصول للمنصة. ({e})\n")
        
        retry = input("هل ترغب في إعادة المحاولة؟ (y/n): ").strip().lower()
        if retry != "y":
            print("👋 تم إيقاف البرنامج. نراك لاحقاً.")
            sys.exit(0)

def register_completion_on_server(event_id, token, event_title):
    print(f"📲 جاري مخاطبة المنصة لتسجيل إنجاز: {event_title}...")
    try:
        response = requests.post(
            f"{API_BASE_URL}/complete",
            json={"eventId": event_id, "desktopAuthToken": token},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        res_data = response.json()
        if response.status_code == 200 and res_data.get("success"):
            print(f"✅ تم تأكيد إنجاز الحدث: ({event_title}) في المنصة وتحديث المجدول.")
        else:
            print(f"⚠️ تعذر الإنجاز على السيرفر: {res_data.get('error')}")
    except Exception as e:
        print(f"📡 خطأ شبكة أثناء تسجيل الإنجاز: {e}")

def check_for_reminders(token):
    print(f"🔍 [فحص دوري - {time.strftime('%H:%M:%S')}] جاري رصد تذكيرات سطح المكتب الحالية...")
    try:
        response = requests.post(
            f"{API_BASE_URL}/events",
            json={"desktopAuthToken": token},
            headers={"Content-Type": "application/json"},
            timeout=12
        )
        res_data = response.json()
        if response.status_code == 200 and res_data.get("success"):
            events = res_data.get("events", [])
            if not events:
                return

            print(f"🔔 تم العثور على ({len(events)}) تذكير(ات) جديدة ومستحقة الآن!")
            for item in events:
                title = item.get("title")
                event_time = item.get("eventTime")
                notes = item.get("notes", "")
                event_id = item.get("eventId")

                # عرض إشعار منبثق في الويندوز بنجاح
                notification_desc = f"الموعد: {event_time}\n"
                if notes:
                    notification_desc += f"ملاحظة: {notes}"
                
                try:
                    notification.notify(
                        title=f"🔔 تذكير: {title}",
                        message=notification_desc[:120],  # حد أقصى لطول الرسائل بويندوز
                        app_name="منصة تذكير المواعيد",
                        app_icon=None,
                        timeout=10
                    )
                except Exception as ex:
                    print(f"⚠️ تعذر تشغيل الإشعار الأصلي للنظام: {ex}")

                print(f"\n📢 تذكير فوري: <<{title}>>")
                print(f"📅 الوقت المحدد: {event_time}")
                if notes:
                    print(f"📝 ملاحظات الموعد: {notes}")
                
                # سؤال تفاعلي فوري في الكونسول لتنفيذ الإنجاز وإيقاف التكرار
                complete_now = input("اضغط (Enter) للاستمرار، أو اكتب 'c' ثم اضغط (Enter) لتسجيل إنجاز المهمة وإيقافها: ").strip().lower()
                if complete_now == "c":
                    register_completion_on_server(event_id, token, title)
                print("-" * 50)
        else:
            print(f"⚠️ خطأ أثناء الفحص: {res_data.get('error')}")
    except Exception as e:
        print(f"🔌 تعذر فحص التنبيهات نتيجة عطل شبكي أو استعلام معلق: {e}")

def main():
    display_welcome_banner()
    config = load_auth_config()
    
    if config and config.get("desktopAuthToken"):
        token = config.get("desktopAuthToken")
        print(f"✨ تم استعادة الجلسة السابقة للمستخدم: *{config.get('username')}* بنجاح.")
        use_curr = input("هل ترغب بالاستمرار بنفس الحساب الحالي؟ (y/n): ").strip().lower()
        if use_curr != "y":
            logout_local()
            token = login_flow()
    else:
        token = login_flow()

    print("\n" + "=" * 65)
    print("💻 التطبيق يعمل بنجاح في الخلفية الآن كـ Daemon!")
    print("سيقوم بالتحقق من تذكيرات سطح مكتبك المجدولة كل 60 ثانية بشكل مستمر.")
    print("لإيقاف السكربت في أي وقت، اضغط Ctrl + C من لوحة المفاتيح.")
    print("=" * 65 + "\n")

    try:
        while True:
            check_for_reminders(token)
            time.sleep(60)
    except KeyboardInterrupt:
        print("\n👋 تم إيقاف رصد التنبيهات وإغلاق تطبيق تذكير لسطح المكتب.")

if __name__ == "__main__":
    main()
