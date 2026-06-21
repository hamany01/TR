import React, { useState, useEffect } from "react";
import { getFirebaseDb, firebaseConfig, databaseId } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  orderBy, 
  limit,
  deleteDoc
} from "firebase/firestore";
import { EventDoc } from "../types";
import { 
  PlusCircle, 
  CheckCircle2, 
  Edit, 
  Calendar, 
  Clock, 
  Link as LinkIcon, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  Trash2, 
  Sparkles,
  HelpCircle,
  Code
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MyEventsProps {
  userId: string;
  onEditEvent: (event: EventDoc) => void;
  onAddNewEvent: () => void;
  refreshTrigger: number;
  onEventsLoaded?: (events: EventDoc[]) => void;
}

export default function MyEvents({ userId, onEditEvent, onAddNewEvent, refreshTrigger, onEventsLoaded }: MyEventsProps) {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "cancelled">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const db = getFirebaseDb();

  // Fetch user specific events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const eventsCol = collection(db, "events");
      const q = query(
        eventsCol, 
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      const list: EventDoc[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as EventDoc);
      });
      
      // Sort events by date descending or ascending (we do it in memory to bypass complex Firestore index exceptions on clean accounts)
      list.sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
      
      setEvents(list);
      if (onEventsLoaded) {
        onEventsLoaded(list);
      }
    } catch (err: any) {
      console.error("Error loading events:", err);
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Fetch the debug notifications from Cloud Function scheduler
  const fetchDebugLogs = async () => {
    try {
      setLogsLoading(true);
      const logsCol = collection(db, "debug_notifications");
      // query recent simulation logs for this user
      const q = query(
        logsCol,
        where("userId", "==", userId)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by computedSendTime descending
      list.sort((a, b) => new Date(b.computedSendTime).getTime() - new Date(a.computedSendTime).getTime());
      setDebugLogs(list.slice(0, 8)); // show last 8 logs
    } catch (err) {
      console.error("Error listing debug logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    console.log("🔍 [UI Connection Debug] MyEvents loaded / refreshed:");
    console.log("   - Firebase Project ID:", firebaseConfig.projectId);
    console.log("   - Firestore Database ID:", databaseId === undefined ? "undefined (Default Database)" : databaseId);
    console.log("   - Logged-in User UID:", userId);
    console.log("   - Exact Query: query(collection(db, 'events'), where('userId', '==', '" + userId + "'))");
    fetchEvents();
    fetchDebugLogs();
  }, [userId, refreshTrigger]);

  // Mark event as completed to shut off reminders
  const markAsCompleted = async (eventId: string) => {
    setActionLoading(eventId);
    try {
      const docRef = doc(db, "events", eventId);
      await updateDoc(docRef, { 
        status: "completed",
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setEvents(events.map((ev) => ev.id === eventId ? { ...ev, status: "completed" } : ev));
    } catch (err) {
      console.error("Error setting completed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete event helper
  const deleteEvent = async (eventId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحدث نهائياً؟ ستتوقف جميع التنبيهات المرجعية فوراً.")) return;
    setActionLoading(eventId);
    try {
      const docRef = doc(db, "events", eventId);
      await deleteDoc(docRef);
      setEvents(events.filter((ev) => ev.id !== eventId));
    } catch (err) {
      console.error("Error deleting event:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter events list
  const filteredEvents = events.filter((ev) => {
    if (filter === "all") return true;
    return ev.status === filter;
  });

  return (
    <div className="space-y-8" dir="rtl">
      
      {/* Top action header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            <span>لوحة إدارة الأحداث والتنبيهات المجدولة</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            سجل مواعيدك الهامة، حدد الترانزيت المفضل، وحافظ على تنظيم وقتك وجدولك اليومي.
          </p>
          <div className="mt-3 text-[10px] text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex flex-wrap gap-x-4 gap-y-1.5 w-fit font-mono shadow-inner">
            <span className="flex items-center gap-1">🟢 <strong>Project ID:</strong> <span className="text-slate-800 font-bold">{firebaseConfig.projectId}</span></span>
            <span className="flex items-center gap-1">📂 <strong>Database ID:</strong> <span className="text-slate-800 font-bold">{databaseId || "undefined (default)"}</span></span>
            <span className="flex items-center gap-1">👤 <strong>User UID:</strong> <span className="text-slate-800 font-bold">{userId}</span></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:mr-auto">
          {/* Refresh button */}
          <button
            onClick={() => { fetchEvents(); fetchDebugLogs(); }}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
            title="تحديث البيانات"
            id="refresh-events-btn"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onAddNewEvent}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition shadow-md hover:shadow-lg cursor-pointer"
            id="add-new-event-btn"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            <span>إضافة حدث وتنبيه جديد</span>
          </button>
        </div>
      </div>

      {/* Grid: Events List (Left) + Live Debug Scheduler Monitor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Events list and rules (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filters navigation segment bar */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit text-xs font-semibold text-slate-600">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${filter === "all" ? "bg-white text-slate-800 shadow-sm" : "hover:text-slate-800"}`}
            >
              الكل ({events.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${filter === "active" ? "bg-white text-amber-700 shadow-sm" : "hover:text-amber-700"}`}
            >
              نشط ({events.filter(e => e.status === "active").length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${filter === "completed" ? "bg-white text-emerald-700 shadow-sm" : "hover:text-emerald-700"}`}
            >
              مكتمل ({events.filter(e => e.status === "completed").length})
            </button>
            <button
              onClick={() => setFilter("cancelled")}
              className={`px-4 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${filter === "cancelled" ? "bg-white text-red-700 shadow-sm" : "hover:text-red-700"}`}
            >
              ملغي ({events.filter(e => e.status === "cancelled").length})
            </button>
          </div>

          {fetchError && (
            <div className="p-4 mb-6 bg-red-50 text-red-800 rounded-2xl flex flex-col gap-3 border border-red-100 text-sm leading-relaxed shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500 font-bold" />
                <strong className="font-extrabold text-red-950">فشل في جلب قائمة الأحداث من Firestore:</strong>
              </div>
              <p className="font-mono text-xs text-red-900 bg-red-100/40 p-3 rounded-lg border border-red-100/55 scrollbar-thin max-w-full overflow-x-auto select-all">
                {fetchError}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => fetchEvents()} 
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة الآن</span>
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 min-h-[300px]">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-600 mb-3" />
              <p className="text-slate-500 text-sm">جاري جلب أحداثك المخططة وقواعد الفرز والتذكير...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 text-center min-h-[300px]">
              <Calendar className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد أحداث مطابقة</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-6">
                {filter === "all" 
                  ? "لم تقم بإضافة أي مواعيد أو أحداث تذكير بعد في حسابك الشخصي. ابدأ الآن بتسجيل أول حدث!"
                  : "ليس لديك أحداث ضمن هذا الفلتر المحدد حالياً."}
              </p>
              {filter === "all" && (
                <button
                  onClick={onAddNewEvent}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition"
                >
                  إضافة حدثك الأول الآن
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredEvents.map((ev) => {
                  const eventDate = new Date(ev.eventTime);
                  const isPast = eventDate < new Date();
                  
                  return (
                    <motion.div
                      layout
                      key={ev.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-5 rounded-2xl bg-white border transition shadow-sm hover:shadow-md ${
                        ev.status === "completed" 
                          ? "border-emerald-100 bg-emerald-50/5" 
                          : ev.status === "cancelled" 
                            ? "border-red-100 bg-red-50/5"
                            : isPast 
                              ? "border-slate-200" 
                              : "border-slate-100"
                      }`}
                      id={`event-card-${ev.id}`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-extrabold text-slate-800">{ev.title}</h4>
                            
                            {/* Badges */}
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              ev.status === "active" 
                                ? "bg-amber-150 text-amber-800" 
                                : ev.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                            }`}>
                              {ev.status === "active" ? "نشط" : ev.status === "completed" ? "مكتمل" : "ملغى"}
                            </span>

                            {isPast && ev.status === "active" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>تاريخ فائت</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1.5 font-mono">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>{eventDate.toLocaleDateString("ar-EG")} - {eventDate.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                            </span>

                            {ev.link && (
                              <a 
                                href={ev.link} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-amber-600 hover:underline flex items-center gap-1 text-xs"
                                id={`event-link-${ev.id}`}
                              >
                                <LinkIcon className="w-3 h-3" />
                                <span>الرابط المرجعي</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Event actions Buttons */}
                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                          {ev.status === "active" && (
                            <button
                              onClick={() => markAsCompleted(ev.id!)}
                              disabled={actionLoading === ev.id}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
                              title="تم إنجاز المهمة وإيقاف التنبيهات"
                              id={`complete-btn-${ev.id}`}
                            >
                              {actionLoading === ev.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>تم الإنجاز ✅</span>
                            </button>
                          )}

                          <button
                            onClick={() => onEditEvent(ev)}
                            disabled={actionLoading === ev.id}
                            className="p-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
                            title="تعديل الحدث"
                            id={`edit-btn-${ev.id}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>

                          <button
                            onClick={() => deleteEvent(ev.id!)}
                            disabled={actionLoading === ev.id}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition cursor-pointer"
                            title="حذف الحدث"
                            id={`delete-btn-${ev.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {ev.notes && (
                        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed mb-3">
                          <strong>ملاحظات:</strong> {ev.notes}
                        </div>
                      )}

                      {/* Reminder Rules attached to this event */}
                      <div className="pt-3 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 block tracking-wide">قواعد فواصل التذكير المنصوصة:</span>
                        <div className="flex flex-wrap gap-2">
                          {ev.reminderRules && ev.reminderRules.length > 0 ? (
                            ev.reminderRules.map((rule, idx) => (
                              <span 
                                key={idx} 
                                className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-100/50 rounded-lg text-[10px] font-medium flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>
                                  {rule.type === "days_before" && `قبل بـ ${rule.daysBefore} أيام (${rule.times?.join(", ")})`}
                                  {rule.type === "hours_before" && `قبل بـ ${rule.hoursBefore} ساعات`}
                                  {rule.type === "minutes_before" && `قبل بـ ${rule.minutesBefore} دقيقة`}
                                  {rule.type === "at_time" && "في الوقت المحدد"}
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">لا توجد قواعد تذكير منصوصة للحدث.</span>
                          )}
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Live Debug Scheduler Monitor Panel (Right) - Span 1 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 h-fit space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-50">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Code className="w-4 h-4 text-amber-600" />
              <span>مراقبة المجدول (Scheduler Engine)</span>
            </h3>
            
            <button
              onClick={fetchDebugLogs}
              disabled={logsLoading}
              className="p-1 text-slate-400 hover:text-slate-600 transition disabled:opacity-50 cursor-pointer"
              title="تحديث التقارير"
              id="refresh-logs-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin text-amber-600" : ""}`} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="leading-relaxed text-xs text-slate-600 space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>كيف يعمل الفحص والتحقق؟</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                كل دقيقة تلقائياً تقوم دالة المجدول الذكية بمسح الأحداث النشطة ومقارنتها مع منطقة وقت المستخدم. يتم بذر التقارير المحسوبة فورياً بالجدول أدناه.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">سجل الإرسال الوهمي لـ Debug:</span>

              {logsLoading && debugLogs.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
                </div>
              ) : debugLogs.length === 0 ? (
                <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-100 text-slate-400 text-xs leading-relaxed">
                  لم يسجل المجدول أي تذكير منطلق بعد.<br />
                  <span className="text-[10px] text-amber-600 font-medium">ابدأ بإضافة حدث مخصص بفاصل دقيقة واحدة أو ساعة لتشاهد حساب المجدول فورياً!</span>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {debugLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-[10px] space-y-1"
                      id={`log-card-${log.id}`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-800">
                        <span className="truncate max-w-[120px]">{log.eventTitle}</span>
                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono text-[9px]">{log.channel}</span>
                      </div>
                      
                      <div className="text-slate-500 flex justify-between">
                        <span>نوع التذكير:</span>
                        <span className="font-semibold text-slate-700">{log.ruleType}</span>
                      </div>

                      <div className="text-slate-500 flex justify-between font-mono text-[9px]">
                        <span>توقيت الحساب:</span>
                        <span>{new Date(log.computedSendTime).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                      </div>

                      <div className="text-slate-400 border-t border-emerald-100/50 pt-1 text-[9px] leading-snug">
                        {log.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
