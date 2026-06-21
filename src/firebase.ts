/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// ============================================================
// SUPABASE CLIENT - بديل Firebase
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kitqqwsgczofysmxyqgf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    throw new Error('خطأ: لم يتم تهيئة Supabase. يرجى إضافة مفاتيح الإعداد.');
  }
  return supabase;
}

// ============================================================
// AUTH FUNCTIONS
// ============================================================

export async function signInWithUsername(username: string, password: string) {
  // نستخدم username كـ email مع domain وهمي للتوافق مع Supabase Auth
  const fakeEmail = `${username.toLowerCase()}@tathkeer.app`;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: fakeEmail,
    password,
  });
  if (error) {
    // إذا فشل auth، نحاول تسجيل الدخول عبر جدول users مباشرة (للـ demo mode)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    if (userError || !userData) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    return { user: userData, session: null, demoMode: true };
  }
  return { user: data.user, session: data.session, demoMode: false };
}

export async function signUpWithUsername(
  username: string,
  password: string,
  email?: string
) {
  const fakeEmail = email || `${username.toLowerCase()}@tathkeer.app`;
  const { data, error } = await supabase.auth.signUp({
    email: fakeEmail,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  // إنشاء سجل في جدول users
  if (data.user) {
    await supabase.from('users').upsert({
      auth_uid: data.user.id,
      username,
      email: fakeEmail,
      role: 'user',
      subscription_plan: 'free',
      timezone: 'Asia/Riyadh',
    });
  }
  return data;
}

export async function signOutUser() {
  await supabase.auth.signOut();
}

export function onAuthStateChange(callback: (user: any) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return subscription;
}

// ============================================================
// USER FUNCTIONS
// ============================================================

export async function getUserProfile(usernameOrUid: string) {
  // Try by auth_uid first
  let { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_uid', usernameOrUid)
    .single();
  if (error || !data) {
    // Try by username
    const res = await supabase
      .from('users')
      .select('*')
      .eq('username', usernameOrUid)
      .single();
    data = res.data;
    error = res.error;
  }
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
}

export async function getUserByUsername(username: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// EVENTS FUNCTIONS
// ============================================================

export async function getEvents(userId: string) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      reminder_rules (*)
    `)
    .eq('user_id', userId)
    .order('event_time', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createEvent(event: {
  user_id: string;
  title: string;
  event_time: string;
  external_link?: string;
  notes?: string;
  status?: string;
  reminder_template?: string;
}) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(eventId: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(eventId: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
}

// ============================================================
// REMINDER RULES FUNCTIONS
// ============================================================

export async function createReminderRule(rule: {
  event_id: string;
  user_id: string;
  offset_type: 'minutes_before' | 'hours_before' | 'days_before';
  offset_value: number;
  channels: { browser?: boolean; telegram?: boolean; desktop?: boolean };
}) {
  const { data, error } = await supabase
    .from('reminder_rules')
    .insert(rule)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReminderRules(eventId: string) {
  const { error } = await supabase
    .from('reminder_rules')
    .delete()
    .eq('event_id', eventId);
  if (error) throw error;
}

export async function getReminderRules(eventId: string) {
  const { data, error } = await supabase
    .from('reminder_rules')
    .select('*')
    .eq('event_id', eventId);
  if (error) throw error;
  return data || [];
}

// ============================================================
// TEMPLATES FUNCTIONS
// ============================================================

export async function getTemplates(userId?: string) {
  let query = supabase.from('reminder_templates').select('*');
  if (userId) {
    query = query.or(`user_id.eq.${userId},is_global.eq.true`);
  } else {
    query = query.eq('is_global', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createTemplate(template: {
  user_id: string;
  name: string;
  rules: any;
  is_global?: boolean;
}) {
  const { data, error } = await supabase
    .from('reminder_templates')
    .insert(template)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// NOTIFICATION FUNCTIONS
// ============================================================

export async function logNotification(log: {
  user_id: string;
  event_id: string;
  rule_id?: string;
  channel: string;
  status: string;
  message?: string;
  error_message?: string;
}) {
  const { error } = await supabase.from('notification_logs').insert(log);
  if (error) console.error('Log error:', error);
}

// ============================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================

export function subscribeToEvents(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`events-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'events',
      filter: `user_id=eq.${userId}`,
    }, callback)
    .subscribe();
}

// ============================================================
// BACKWARD COMPATIBILITY - للحفاظ على توافق الكود القديم
// ============================================================

export const db = supabase; // alias
export const auth = supabase.auth; // alias
export const isFirebaseConfigured = isSupabaseConfigured; // alias

export function getFirebaseDb() {
  return supabase;
}

export function getFirebaseAuth() {
  return supabase.auth;
}
