import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes("YOUR_PROJECT"));
export const supabase = isSupabaseConfigured ? createClient(url!, anonKey!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export type AppRole = "admin" | "teacher" | "student";
export type Profile = { id: string; full_name: string; role: AppRole; student_code?: string | null };

export async function getProfile(userId: string): Promise<Profile> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { data, error } = await supabase.from("profiles").select("id,full_name,role,student_code").eq("id", userId).single();
  if (error) throw error;
  return data as Profile;
}
