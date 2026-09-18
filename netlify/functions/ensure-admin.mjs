import { createClient } from "@supabase/supabase-js";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await request.json();
    if (String(body.username || "").toLowerCase() !== "admin" || body.password !== "Admin@123") {
      return json({ error: "Thông tin Admin không hợp lệ." }, 401);
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) return json({ error: "Netlify chưa có biến SUPABASE_SERVICE_ROLE_KEY." }, 500);
    const client = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const email = "admin@ipa.local";
    const { data: list, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    let user = list.users.find(item => item.email?.toLowerCase() === email);
    if (!user) {
      const { data, error } = await client.auth.admin.createUser({ email, password: "Admin@123", email_confirm: true, user_metadata: { username: "admin" } });
      if (error) throw error;
      user = data.user;
    } else {
      const { data, error } = await client.auth.admin.updateUserById(user.id, { password: "Admin@123", email_confirm: true, user_metadata: { ...user.user_metadata, username: "admin" } });
      if (error) throw error;
      user = data.user;
    }
    const { error: profileError } = await client.from("profiles").upsert({ id: user.id, username: "admin", full_name: "IPA Admin", role: "admin" }, { onConflict: "id" });
    if (profileError) throw profileError;
    return json({ ok: true });
  } catch (error) {
    return json({ error: error?.message || "Không thể khởi tạo Admin." }, 400);
  }
};
