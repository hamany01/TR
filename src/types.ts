export interface UserDoc {
  username: string;
  email: string;
  phone: string;
  region?: string;
  timezone: string; // e.g. "Asia/Riyadh"
  createdAt: string; // ISO String
  subType: "free_trial" | "premium";
  subStartDate: string; // ISO String
  subEndDate: string; // ISO String
  telegramChatId?: string;
  telegramToken: string; // unique random string to use in Start URL link
  referralCode: string; // user's unique referral code
  referredBy?: string; // code of user who referred them, if any
}

export interface UsernameDoc {
  email: string;
  uid: string;
}

export interface ReminderRule {
  type: "days_before" | "hours_before" | "minutes_before" | "at_time";
  daysBefore?: number;
  hoursBefore?: number;
  minutesBefore?: number;
  times?: string[]; // e.g. ["09:00", "21:00"]
  channels: ("telegram" | "desktop" | "browser")[];
}

export interface EventDoc {
  id?: string;
  userId: string;
  title: string;
  eventTime: string; // ISO String
  link?: string;
  notes?: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string; // ISO String
  updatedAt?: string; // ISO String
  reminderRules: ReminderRule[];
}

export interface ReminderTemplate {
  id: string;
  name: string;
  description: string;
  rules: ReminderRule[];
}
