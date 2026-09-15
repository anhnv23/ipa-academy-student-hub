"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { AppRole, getProfile, isSupabaseConfigured, supabase } from "../lib/supabase";

export function AuthLogin({ onLogin }: { onLogin: (role: AppRole, name: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return setError("Hãy cấu hình NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    setBusy(true); setError("");
    const loginEmail=email.includes("@")?email.trim():`${email.trim().toLowerCase()}@ipa.local`;
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email:loginEmail, password });
    if (authError || !data.user) { setBusy(false); return setError(authError?.message || "Không thể đăng nhập."); }
    try {
      const profile = await getProfile(data.user.id);
      onLogin(profile.role, profile.full_name);
    } catch {
      await supabase.auth.signOut();
      setError("Tài khoản chưa có hồ sơ/phân quyền trong bảng profiles.");
    } finally { setBusy(false); }
  }

  return <main className="login-page"><section className="login-card"><img src="/ipa-logo.jpg" alt="IPA English Academy"/><div className="login-copy"><span className="eyebrow">IPA ACADEMY • STUDENT HUB</span><h1>Đăng nhập hệ thống</h1><p>Dùng username do IPA cấp. Giao diện được mở tự động theo quyền Admin, Giáo viên hoặc Học viên.</p></div><form className="login-form" onSubmit={submit}><label><span>Username</span><div><Mail/><input required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin" autoCapitalize="none"/></div></label><label><span>Mật khẩu</span><div><LockKeyhole/><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></div></label>{error&&<p style={{color:"#b42318"}}>{error}</p>}<button className="primary" disabled={busy}>{busy?"Đang đăng nhập…":"Đăng nhập"}</button>{!isSupabaseConfigured&&<small>Điền biến môi trường Supabase để kích hoạt đăng nhập.</small>}</form></section></main>;
}
