# Hướng dẫn go-live IPA Academy Student HUB

Kiến trúc: **GitHub lưu mã nguồn → Netlify build và phát hành → Supabase cung cấp đăng nhập, PostgreSQL, RLS và Storage**.

## A. Chuẩn bị

Tạo tài khoản GitHub, Netlify và Supabase. Cài Node.js 22 và Git trên máy. Giải nén gói dự án; mọi lệnh bên dưới chạy tại thư mục có `package.json`.

## B. Tạo Supabase

1. Supabase → **New project**; chọn khu vực gần Việt Nam và lưu mật khẩu database.
2. Dự án mới: mở **SQL Editor**, dán toàn bộ `supabase/schema.sql`, bấm **Run** đúng một lần.
3. Dự án IPA đã chạy schema cũ: chỉ chạy `supabase/migrations/20260915_weekly_schedule.sql`.
4. Kiểm tra Table Editor có: `profiles`, `classes`, `class_weekly_rules`, `class_members`, `class_sessions`, `attendance`, `assignments`, `submissions`, `leave_requests`.
5. Storage phải có bucket riêng tư `homework`; RLS phải hiển thị Enabled.

## C. Tạo tài khoản và phân quyền

1. **Authentication → Users → Add user**; tạo user email/mật khẩu và đánh dấu xác nhận email nếu đây là tài khoản nội bộ.
2. Sao chép UUID của từng user.
3. SQL Editor:

```sql
insert into public.profiles (id, full_name, role)
values
  ('UUID_ADMIN', 'IPA Admin', 'admin'),
  ('UUID_TEACHER', 'Cô Mai Anh', 'teacher'),
  ('UUID_STUDENT', 'Nguyễn Minh Anh', 'student');
```

Role chỉ nhận `admin`, `teacher`, `student`. Mỗi Auth user phải có đúng một profile cùng UUID.

Gán giáo viên và học viên:

```sql
update public.classes set teacher_id='UUID_TEACHER' where code='I67-A';
insert into public.class_members(class_id,student_id)
select id,'UUID_STUDENT' from public.classes where code='I67-A';
```

## D. Lấy biến môi trường

Supabase → **Project Settings → API**. Sao chép Project URL và anon/publishable key. Tạo `.env.local` để kiểm tra trên máy:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

Không dùng `service_role` trong frontend, GitHub hoặc biến `NEXT_PUBLIC_*`. `.env.local` đã được `.gitignore` loại trừ.

## E. Kiểm tra local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`, đăng nhập lần lượt Admin/Giáo viên/Học viên. Sau đó chạy kiểm tra build:

```bash
npm run build
```

Chỉ tiếp tục khi build hoàn tất không lỗi.

## F. Đưa dự án lên GitHub

1. GitHub → **New repository** → đặt tên `ipa-academy-student-hub`; nên chọn Private; không tạo sẵn README.
2. Tại thư mục dự án:

```bash
git init
git add .
git status
git commit -m "Initial IPA Student HUB production"
git branch -M main
git remote add origin https://github.com/TEN_GITHUB/ipa-academy-student-hub.git
git push -u origin main
```

Trong `git status`, tuyệt đối không được có `.env.local`.

## G. Kết nối Netlify

1. Netlify → **Add new project → Import an existing project**.
2. Chọn GitHub, cấp quyền cho repository và chọn `ipa-academy-student-hub`.
3. Netlify đọc `netlify.toml`: Build command `npm run build`, publish `.next`, Node 22 và Next.js plugin.
4. **Project configuration → Environment variables** thêm:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Chọn **Deploy site**. Chờ trạng thái **Published** rồi mở URL `https://TEN-SITE.netlify.app`.
6. Nếu vừa sửa biến môi trường: **Deploys → Trigger deploy → Clear cache and deploy site**.

Không cần đưa mật khẩu database hay `service_role` key lên Netlify.

## H. Khai báo URL trong Supabase

Supabase → **Authentication → URL Configuration**:

- Site URL: `https://TEN-SITE.netlify.app`
- Redirect URLs: `https://TEN-SITE.netlify.app/**`
- Local test: `http://localhost:3000/**`
- Nếu dùng Deploy Preview: `https://**--TEN-SITE.netlify.app/**`

Nếu dùng tên miền riêng, thêm `https://portal.ipaenglish.com/**`, sau đó đổi Site URL sang tên miền chính.

## I. Kiểm thử trước khi công bố

1. Admin: tạo lớp; chọn nhiều ngày trong tuần; đặt giờ riêng cho từng ngày; sinh danh sách buổi; đổi riêng một buổi; lưu; mở lại và đối chiếu.
2. Giáo viên: chỉ thấy lớp được gán; xem học viên; giao/chấm bài.
3. Học viên: chỉ thấy dữ liệu cá nhân/lớp đã tham gia; nộp bài; xin nghỉ.
4. Đổi Việt/Anh; đăng xuất/đăng nhập lại; slogan phải đổi và không lặp câu ngay trước.
5. Tải file bài tập; xác nhận bucket `homework` vẫn Private.
6. Dùng một tài khoản học viên thử truy cập dữ liệu của người khác; RLS phải từ chối.

## J. Tên miền và go-live

Netlify → **Domain management → Add a domain**. Thêm bản ghi DNS đúng theo hướng dẫn Netlify, chờ HTTPS được cấp. Sau đó cập nhật Site URL/Redirect URLs trong Supabase như mục H. Khi ba vai trò vượt qua checklist mục I, webapp sẵn sàng go-live.

## K. Cập nhật về sau

```bash
git add .
git commit -m "Mo ta thay doi"
git push
```

Netlify tự build và phát hành từ nhánh `main`. Thay đổi database phải lưu thành file mới trong `supabase/migrations/` và chạy thủ công trên Supabase trước khi giao diện mới sử dụng cột/bảng đó.

## L. Lỗi thường gặp

- **Invalid login credentials**: sai email/mật khẩu, user chưa tồn tại hoặc email chưa xác nhận.
- **Tài khoản chưa có hồ sơ**: UUID trong Auth chưa có dòng tương ứng ở `profiles`.
- **RLS / permission denied**: kiểm tra `profiles.role`, `classes.teacher_id`, `class_members`; không tắt RLS.
- **Không thấy bảng class_weekly_rules**: chạy migration ở mục B.3.
- **Netlify thiếu biến môi trường**: thêm đủ hai biến rồi Clear cache and deploy.
- **Build failed**: chạy `npm install` và `npm run build` trên máy, sửa lỗi rồi push lại.
- **Upload bị từ chối**: đường dẫn Storage phải bắt đầu bằng UUID học viên.
