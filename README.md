# IPA Academy Student HUB — GitHub + Netlify + Supabase

Hướng dẫn go-live đầy đủ nằm tại **`GO-LIVE-GUIDE.md`**.
Thiết lập Admin mặc định và quản lý username nằm tại **`ADMIN-ACCOUNT-SETUP.md`**.

Bản triển khai theo kiến trúc của Bee: mã nguồn Next.js nằm trên GitHub, Netlify tự build/deploy, Supabase cung cấp Auth, PostgreSQL, Row Level Security và Storage dùng chung.

## Chức năng đã đóng gói

- Đăng nhập thật bằng Supabase Auth và duy trì phiên đăng nhập.
- Đọc `profiles.role` để mở đúng giao diện `admin`, `teacher`, `student`.
- Song ngữ Việt/Anh.
- Admin: học viên, lớp học, lịch/buổi học, điểm danh, bài tập, báo cáo. Khi tạo lớp có thể sinh lịch mặc định rồi chỉnh ngày, giờ bắt đầu và giờ kết thúc riêng cho từng buổi.
- Giáo viên: học viên thuộc lớp phụ trách, giao/chấm/nhận xét bài, đánh giá tiến độ.
- Học viên: xem/nộp bài, xem tiến độ, gửi đơn xin nghỉ.
- Schema quan hệ, RLS và bucket riêng tư `homework` trong `supabase/schema.sql`.

> Giao diện có dữ liệu minh họa để xem bố cục. Đăng nhập và nền tảng dữ liệu chung đã nối Supabase; khi vận hành, thay các mảng minh họa trong `app/page.tsx` bằng truy vấn các bảng tương ứng.

## 1. Chạy trên máy tính

Yêu cầu Node.js 22 và npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`. Điền URL/key Supabase ở bước 3 trước khi đăng nhập.

## 2. Tạo dự án Supabase

1. Đăng nhập Supabase, chọn **New project**.
2. Chọn region gần Việt Nam (thường Singapore), đặt mật khẩu database mạnh và lưu riêng.
3. Mở **SQL Editor → New query**.
4. Mở file `supabase/schema.sql`, sao chép toàn bộ, dán và chọn **Run**.
5. Kiểm tra **Table Editor** có `profiles`, `classes`, `class_members`, `class_sessions`, `attendance`, `assignments`, `submissions`, `leave_requests`.
6. Kiểm tra **Storage** có bucket riêng tư `homework`.

Không đưa `service_role` key vào GitHub, Netlify frontend hoặc biến có tiền tố `NEXT_PUBLIC_`. Frontend chỉ dùng anon/publishable key và được bảo vệ bằng RLS.

## 3. Lấy biến môi trường

Trong Supabase mở **Project Settings → API**, lấy Project URL và anon/publishable key. Tạo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TEN-DU-AN.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=KEY_ANON_HOAC_PUBLISHABLE
```

Không commit `.env.local`; file đã nằm trong `.gitignore`.

## 4. Tạo tài khoản và phân quyền

Vào **Authentication → Users → Add user**, tạo người dùng bằng email/mật khẩu. Sao chép UUID từng user, rồi chạy:

```sql
insert into public.profiles (id, username, full_name, role)
values
  ('UUID_ADMIN', 'admin', 'IPA Admin', 'admin'),
  ('UUID_GIAO_VIEN', 'teacher01', 'Cô Mai Anh', 'teacher'),
  ('UUID_HOC_VIEN', 'student01', 'Nguyễn Minh Anh', 'student');
```

Mỗi tài khoản phải có đúng một dòng trong `profiles`. Role chỉ nhận `admin`, `teacher`, `student`. Đổi quyền bằng:

```sql
update public.profiles set role='teacher' where id='UUID_CAN_DOI';
```

Đặt `classes.teacher_id` bằng UUID giáo viên và thêm học viên vào `class_members`. RLS tự giới hạn: Admin thấy toàn bộ; giáo viên thấy lớp/học viên phụ trách; học viên chỉ thấy dữ liệu của mình và lớp đã tham gia.

## 5. Đưa mã nguồn lên GitHub

Giải nén, mở Terminal tại thư mục chứa `package.json`, chạy:

```bash
git init
git add .
git commit -m "Initial IPA Student HUB production"
git branch -M main
git remote add origin https://github.com/TEN_GITHUB/ipa-student-hub.git
git push -u origin main
```

Trước `git add`, kiểm tra `.env.local` không xuất hiện trong `git status`.

## 6. Kết nối GitHub với Netlify

1. Netlify → **Add new project → Import an existing project**.
2. Chọn GitHub và repository `ipa-student-hub`.
3. `netlify.toml` đặt Build command `npm run build`, Publish directory `.next`, Node `22`.
4. **Project configuration → Environment variables**: thêm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` và secret `SUPABASE_SERVICE_ROLE_KEY`.
5. Chọn **Deploy site**. Mỗi lần push nhánh `main`, Netlify tự build/phát hành.

Sau khi đổi biến môi trường, dùng **Deploys → Trigger deploy → Clear cache and deploy site**.

## 7. Khai báo URL Netlify trong Supabase

Sao chép URL `https://ten-site.netlify.app`. Trong **Authentication → URL Configuration**:

- Site URL: `https://ten-site.netlify.app`
- Redirect URLs production: `https://ten-site.netlify.app`
- Thêm `http://localhost:3000/**` để thử local.

Nếu dùng Deploy Preview, thêm mẫu `https://**--TEN-SITE.netlify.app/**`; với URL production nên dùng địa chỉ chính xác.

Nếu có tên miền riêng, thêm `https://portal.ipaenglish.com/**` và đổi Site URL sang tên miền chính.

## 8. Kiểm thử trước khi dùng thật

1. Admin thấy Học viên, Quản lý lớp học, Bài tập, Báo cáo.
2. Giáo viên chỉ truy cập lớp được gán.
3. Học viên thấy bài tập, tiến độ, xin nghỉ và không đọc được dữ liệu người khác.
4. Thử VI/EN và tải lại trang để kiểm tra phiên.
5. Không tắt RLS để xử lý lỗi quyền; kiểm tra role, `teacher_id`, `class_members`.

## 9. Cập nhật phiên bản

```bash
git add .
git commit -m "Mo ta thay doi"
git push
```

Netlify tự triển khai. Thay đổi database nên lưu thành SQL mới trong `supabase/migrations/`.

## Lỗi thường gặp

- **Tài khoản chưa có hồ sơ/phân quyền**: UUID Auth chưa có trong `profiles`.
- **Invalid login credentials**: sai email/mật khẩu hoặc user chưa tồn tại.
- **new row violates row-level security**: kiểm tra role, `teacher_id`, `class_members`.
- **Netlify thiếu biến**: thêm đủ hai biến và clear cache/deploy lại.
- **Build lỗi**: chạy `npm install && npm run build`, sửa rồi push.
- **Upload bị từ chối**: đường dẫn object phải bắt đầu bằng UUID học viên, ví dụ `UUID/assignment-id/bai-lam.pdf`.

## Cấu trúc

```text
app/                 Giao diện/portal theo vai trò
lib/supabase.ts      Supabase client và profile/role
public/              Logo, favicon
supabase/schema.sql  Database, RLS, Storage
.env.example         Mẫu biến môi trường
netlify.toml         Cấu hình build/deploy
```
