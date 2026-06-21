import React from "react";
import { 
  PlusCircle, 
  RefreshCw, 
  CheckCircle, 
  Smartphone, 
  ShieldAlert,
  Award
} from "lucide-react";
import { ReminderTemplate, defaultTemplates } from "../seedTemplates";

interface TemplatesPageProps {
  userProfile: any;
  dbTemplates: ReminderTemplate[];
  seedLoading: boolean;
  seedSuccess: boolean;
  onTriggerSeeding: () => void;
}

export default function TemplatesPage({
  userProfile,
  dbTemplates,
  seedLoading,
  seedSuccess,
  onTriggerSeeding
}: TemplatesPageProps) {
  
  const isAdmin = !!userProfile?.isAdmin;

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100" dir="rtl">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-600" />
            <span>قوالب تذكير المواعيد الافتراضية (5 Templates)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            تتيح لك القوالب الجاهزة اختيار خطة تذكير متكاملة وثلاثية الحلقات (قبل الموعد بأيام وساعات وفوري) بمجرد نقرة واحدة عند إنشاء الحدث.
          </p>
        </div>

        {/* Administration control buttons */}
        <div className="shrink-0 flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={onTriggerSeeding}
              disabled={seedLoading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-md hover:shadow-lg cursor-pointer"
            >
              {seedLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>بذر القوالب في Firestore ...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>تهيئة/بذر القوالب في Firestore</span>
                </>
              )}
            </button>
          ) : (
            <div className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs flex items-center gap-2 border border-slate-100">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>إدخال/تهيئة القوالب متاح فقط للمشرف الإداري</span>
            </div>
          )}
        </div>
      </div>

      {seedSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>تم تصفير وإدخال القوالب الافتراضية الخمسة بنجاح كامل في Firestore! المستندات متوفرة الآن للاستخدام!</span>
        </div>
      )}

      {/* Database templates count status */}
      <div className="text-xs text-slate-400 mb-6 flex items-center gap-2">
        <span>حالة القوالب الحالية:</span>
        {dbTemplates.length > 0 ? (
          <span className="font-bold text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            نشطة ومسجلة في قاعدة البيانات ({dbTemplates.length} قوالب)
          </span>
        ) : (
          <span className="font-bold text-[11px] text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
            قيد المحاكاة المحلية (لم تبذر في قاعدة البيانات بعد)
          </span>
        )}
      </div>

      {/* Grid: 5 Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(dbTemplates.length > 0 ? dbTemplates : defaultTemplates).map((tpl) => (
          <div 
            key={tpl.id} 
            className="p-6 rounded-2xl border border-slate-100 hover:border-amber-200 hover:shadow-md transition bg-slate-50/50 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-extrabold text-slate-800">{tpl.name}</h4>
                <span className="text-[10px] bg-amber-50 text-amber-800 px-20 py-0.5 rounded-full font-extrabold">قالب معتمد</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">
                {tpl.description}
              </p>
            </div>

            {/* Display Predefined Rules */}
            <div className="space-y-3 pt-3 border-t border-slate-100/60">
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">قواعد وقنوات التذكير:</span>
              {tpl.rules.map((rule, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-100 text-[11px] text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    {rule.type === "days_before" && `قبل الموعد بـ ${rule.daysBefore} أيام`}
                    {rule.type === "hours_before" && `قبل الموعد بـ ${rule.hoursBefore} ساعات`}
                    {rule.type === "minutes_before" && `قبل الموعد بـ ${rule.minutesBefore} دقائق`}
                    {rule.type === "at_time" && "في وقت الموعد تماماً"}
                  </div>
                  {rule.times && rule.times.length > 0 && (
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      الأوقات: {rule.times.join("، ")}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1.5 text-[9px] text-slate-400">
                    القنوات: {rule.channels.map((ch) => (
                      <span key={ch} className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-sans font-medium">
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
  );
}
