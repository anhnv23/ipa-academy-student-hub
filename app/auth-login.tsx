"use client";

import { FormEvent, useState } from "react";
import { GraduationCap, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { AppRole, getProfile, isSupabaseConfigured, supabase } from "../lib/supabase";

type LoginArea = "admin" | "teacher" | "student";

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
    const isDefaultAdmin = area === "admin" && username === "admin" && password === "Admin@123";
    setBusyArea(area); setError("");
    if (isDefaultAdmin) {
      const bootstrap = await fetch("/.netlify/functions/ensure-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "Admin", password }),
      });
      if (!bootstrap.ok) {
        const result = await bootstrap.json().catch(() => ({}));
        setBusyArea(null);
        return setError(result.error || "Không thể khởi tạo tài khoản Admin mặc định.");
      }
    }
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (authError || !data.user) { setBusyArea(null); return setError(authError?.message || "Không thể đăng nhập."); }
    if (isDefaultAdmin) {
      setBusyArea(null);
      onLogin("admin", "IPA Admin");
      return;
    }
    try {
      const profile = await getProfile(data.user.id);
      const wrongArea = profile.role !== area;
      if (wrongArea) {
        await supabase.auth.signOut();
        setError(`Tài khoản này thuộc khu vực ${profile.role === "teacher" ? "Giáo viên" : profile.role === "student" ? "Học viên" : "Admin"}.`);
        return;
      }
      onLogin(profile.role, profile.full_name);
    } catch {
      await supabase.auth.signOut();
      setError("Tài khoản chưa có hồ sơ/phân quyền trong bảng profiles.");
    } finally { setBusyArea(null); }
  }

  return <main className="auth-page"><section className="auth-brand"><img src="/ipa-logo.jpg" alt="IPA English Academy"/><span>IPA ENGLISH ACADEMY</span><h1>Mỗi hành trình học tập đều xứng đáng được theo sát.</h1><p>Student HUB kết nối học viện, giáo viên và học viên trên một không gian thống nhất.</p></section><section className="auth-panel"><div className="auth-box"><span className="auth-eyebrow">STUDENT HUB • SECURE LOGIN</span><h2>Đăng nhập hệ thống</h2><p className="auth-intro">Chọn khu vực tương ứng với vai trò của bạn.</p>{error && <div className="auth-error" role="alert">{error}</div>}<div className="auth-grid three"><article className="auth-role-card admin"><header><i><ShieldCheck/></i><div><h3>Admin</h3><p>Quản trị toàn hệ thống</p></div></header><form onSubmit={event => submit(event, "admin")}><label><span>Username</span><div><Mail/><input name="username" required value="Admin" readOnly/></div></label><label><span>Mật khẩu</span><div><LockKeyhole/><input name="password" type="password" required value="Admin@123" readOnly/></div></label><button className="primary" disabled={busyArea !== null}>{busyArea === "admin" ? "Đang đăng nhập…" : "Đăng nhập Admin"}</button></form><small>Mặc định: Admin / Admin@123</small></article><article className="auth-role-card teacher"><header><i><GraduationCap/></i><div><h3>Giáo viên</h3><p>Giảng dạy và chấm bài</p></div></header><form onSubmit={event => submit(event, "teacher")}><label><span>Username</span><div><Mail/><input name="username" required autoCapitalize="none" autoComplete="username" placeholder="Username giáo viên"/></div></label><label><span>Mật khẩu</span><div><LockKeyhole/><input name="password" type="password" required autoComplete="current-password" placeholder="••••••••"/></div></label><button className="primary" disabled={busyArea !== null}>{busyArea === "teacher" ? "Đang đăng nhập…" : "Đăng nhập Giáo viên"}</button></form><small>Tài khoản do Admin cấp.</small></article><article className="auth-role-card student"><header><i><GraduationCap/></i><div><h3>Học viên</h3><p>Học tập và theo dõi tiến độ</p></div></header><form onSubmit={event => submit(event, "student")}><label><span>Username</span><div><Mail/><input name="username" required autoCapitalize="none" autoComplete="username" placeholder="Username học viên"/></div></label><label><span>Mật khẩu</span><div><LockKeyhole/><input name="password" type="password" required autoComplete="current-password" placeholder="••••••••"/></div></label><button className="primary" disabled={busyArea !== null}>{busyArea === "student" ? "Đang đăng nhập…" : "Đăng nhập Học viên"}</button></form><small>Tài khoản do Admin cấp.</small></article></div>{!isSupabaseConfigured && <div className="auth-config-note">Chưa cấu hình kết nối Supabase.</div>}</div></section></main>;
}
