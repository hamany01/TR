import { doc, writeBatch, collection, getDocs, setDoc } from "firebase/firestore";

export interface ReminderRule {
  type: "days_before" | "hours_before" | "minutes_before" | "at_time";
  daysBefore?: number;
  hoursBefore?: number;
  minutesBefore?: number;
  times?: string[]; // e.g. ["09:00", "21:00"]
  channels: string[]; // e.g. ["telegram", "desktop", "browser"]
}

export interface ReminderTemplate {
  id: string; // Document ID
  name: string;
  description: string;
  rules: ReminderRule[];
}

export const defaultTemplates: ReminderTemplate[] = [
  {
    id: "official_docs",
    name: "وثائق رسمية",
    description: "تنبيه قبل 7 أيام (مرتين في اليوم: 9 صباحاً و 9 مساءً) لضمان عدم انتهاء الهويات أو المستندات الرسمية.",
    rules: [
      {
        type: "days_before",
        daysBefore: 7,
        times: ["09:00", "21:00"],
        channels: ["telegram", "desktop"]
      }
    ]
  },
  {
    id: "training_or_important",
    name: "دورة تدريبية / موعد مهم",
    description: "تنبيهات مكثفة ومجدولة بدقة لضمان الحضور (قبل يومين، قبل ساعة، قبل 30 دقيقة، وعند وقت الموعد).",
    rules: [
      {
        type: "days_before",
        daysBefore: 2,
        times: ["10:00"],
        channels: ["telegram", "desktop", "browser"]
      },
      {
        type: "hours_before",
        hoursBefore: 1,
        channels: ["telegram", "desktop", "browser"]
      },
      {
        type: "minutes_before",
        minutesBefore: 30,
        channels: ["telegram", "desktop", "browser"]
      },
      {
        type: "at_time",
        channels: ["telegram", "desktop", "browser"]
      }
    ]
  },
  {
    id: "normal_reminder",
    name: "تذكير عادي",
    description: "تنبيه بسيط ومثالي للمهام اليومية والالتزامات العامة (قبل الموعد بيوم واحد الساعة 9:00 صباحاً).",
    rules: [
      {
        type: "days_before",
        daysBefore: 1,
        times: ["09:00"],
        channels: ["telegram", "desktop", "browser"]
      }
    ]
  },
  {
    id: "weekly_reminder",
    name: "تذكير أسبوعي",
    description: "تنبيه دوري مريح قبل المهام الأسبوعية العادية بـ 7 أيام الساعة 9:00 صباحاً.",
    rules: [
      {
        type: "days_before",
        daysBefore: 7,
        times: ["09:00"],
        channels: ["telegram", "desktop", "browser"]
      }
    ]
  },
  {
    id: "no_plan",
    name: "بدون خطة",
    description: "تنبهك المنصة فقط في وقت حدوث الموعد تماماً دون أي تذكيرات مسبقة.",
    rules: [
      {
        type: "at_time",
        channels: ["telegram", "desktop", "browser"]
      }
    ]
  }
];

/**
 * Seeds default templates in Firestore batch command.
 * Idempotent: Overwrites with default state.
 */
export async function seedTemplates(db: any): Promise<void> {
  const batch = writeBatch(db);
  for (const template of defaultTemplates) {
    const docRef = doc(db, "reminder_templates", template.id);
    batch.set(docRef, {
      name: template.name,
      description: template.description,
      rules: template.rules
    });
  }
  await batch.commit();
}
