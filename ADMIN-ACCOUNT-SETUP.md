# Thiết lập tài khoản mặc định và quản lý username

## Dự án Supabase mới

Chạy `supabase/schema.sql`, sau đó tạo `.env.local` với ba biến:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` chỉ được lưu trong `.env.local` và biến môi trường bí mật của Netlify; tuyệt đối không commit lên GitHub hoặc đặt tiền tố `NEXT_PUBLIC_`.

Cài thư viện và tạo Admin mặc định:

```bash
npm install
npm run seed:admin
```

Đăng nhập:

```text
Username: admin
Password: Admin@123
```

Hãy đổi mật khẩu mặc định sau khi kiểm tra go-live.

## Netlify

Ngoài hai biến public Supabase, thêm `SUPABASE_SERVICE_ROLE_KEY` trong **Project configuration → Environment variables**, đánh dấu là secret/sensitive. Netlify Function dùng key này để tạo Auth user; key không được gửi xuống trình duyệt.

## Tạo tài khoản Giáo viên/Học viên

Admin đăng nhập → **Học viên** → **Tài khoản đăng nhập** → **Tạo tài khoản**. Nhập họ tên, vai trò, username và password tối thiểu 8 ký tự. Người dùng đăng nhập bằng username vừa được cấp.

## Nâng cấp database cũ

Chạy `supabase/migrations/20260915_username_accounts.sql`, sau đó chạy `npm run seed:admin`.
