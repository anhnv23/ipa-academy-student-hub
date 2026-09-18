"use client";

import { FormEvent, useState } from "react";
import { GraduationCap, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { AppRole, getProfile, isSupabaseConfigured, supabase } from "../lib/supabase";

type LoginArea = "staff" | "student";

export function AuthLogin({ onLogin }: { onLogin: (role: AppRole, name: string) => void }) {
  const [error, setError] = useState("");
  const [busyArea, setBusyArea] = useState<LoginArea | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, area: LoginArea) {
    event.preventDefault();
    if (!supabase) return setError("Hãy cấu hình các biến môi trường Supabase trước khi đăng nhập.");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const loginEmail = username.includes("@") ? username : `${username}@ipa.local`;
    setBusyArea(area); setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (authError || !data.user) { setBusyArea(null); return setError(authError?.message || "Không thể đăng nhập."); }
    try {
      const profile = await getProfile(data.user.id);
      const wrongArea = area === "staff" ? !["admin", "teacher"].includes(profile.role) : profile.role !== "student";
      if (wrongArea) {
        await supabase.auth.signOut();
        setError(area === "staff" ? "Đây là tài khoản học viên. Vui lòng đăng nhập tại khu vực Học viên." : "Đây là tài khoản Admin/Giáo viên. Vui lòng đăng nhập tại khu vực Admin & Giáo viên.");
        return;
      }
      onLogin(profile.role, profile.full_name);
    } catch {
      await supabase.auth.signOut();
      setError("Tài khoản chưa có hồ sơ/phân quyền trong bảng profiles.");
    } finally { setBusyArea(null); }
  }

  return <main className="auth-page"><section className="auth-brand"><img src="/ipa-logo.jpg" alt="IPA English Academy"/><span>IPA ENGLISH ACADEMY</span><h1>Mỗi hành trình học tập đều xứng đáng được theo sát.</h1><p>Student HUB kết nối học viện, giáo viên và học viên trên một không gian thống nhất.</p></section><section className="auth-panel"><div className="auth-box"><span className="auth-eyebrow">STUDENT HUB • SECURE LOGIN</span><h2>Đăng nhập hệ thống</h2><p className="auth-intro">Chọn đúng khu vực đăng nhập theo vai trò của bạn.</p>{error && <div className="auth-error" role="alert">{error}</div>}<div className="auth-grid"><article className="auth-role-card staff"><header><i><ShieldCheck/></i><div><h3>Admin & Giáo viên</h3><p>Quản trị và giảng dạy</p></div></header><form onSubmit={event => submit(event, "staff")}><label><span>Username</span><div><Mail/><input name="username" required defaultValue="admin" autoCapitalize="none" autoComplete="username"/></div></label><label><span>Mật khẩu</span><div><LockKeyhole/><input name="password" type="password" required autoComplete="current-password" placeholder="••••••••"/></div></label><button className="primary" disabled={busyArea !== null}>{busyArea === "staff" ? "Đang đăng nhập…" : "Đăng nhập quản trị"}</button></form></article><article className="auth-role-card student"><header><i><GraduationCap/></i><div><h3>Học viên</h3><p>Học tập và theo dõi tiến độ</p></div></header><form onSubmit={event => submit(event, "student")}><label><span>Username</span><div><Mail/><input name="username" required autoCapitalize="none" autoComplete="username" placeholder="Username học viên"/></div></label><label><span>Mật khẩu</span><div><LockKeyhole/><input name="password" type="password" required autoComplete="current-password" placeholder="••••••••"/></div></label><button className="primary" disabled={busyArea !== null}>{busyArea === "student" ? "Đang đăng nhập…" : "Đăng nhập học viên"}</button></form><small>Tài khoản do Admin IPA cấp.</small></article></div>{!isSupabaseConfigured && <div className="auth-config-note">Chưa cấu hình kết nối Supabase.</div>}</div></section></main>;
}
