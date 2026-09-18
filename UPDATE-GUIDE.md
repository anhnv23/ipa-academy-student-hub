# Hướng dẫn cập nhật IPA Academy Student HUB v1.5.2

Áp dụng cho dự án đã kết nối theo mô hình **GitHub → Netlify → Supabase**.

## 1. Sao lưu trước khi cập nhật

1. Supabase → **Database → Backups** và xác nhận có bản sao lưu gần nhất.
2. Trên GitHub, ghi lại commit đang chạy ổn định.
3. Không xóa site Netlify hoặc project Supabase cũ.

## 2. Chuẩn bị mã nguồn mới

Giải nén gói mới. Sao chép `.env.local` từ thư mục dự án cũ sang thư mục mới. Không đưa file này lên GitHub.

```bash
npm install
npm run build
```

Chỉ tiếp tục khi build thành công.

## 3. Cập nhật GitHub hiện có

Sao chép toàn bộ nội dung gói mới vào thư mục repository cũ, cho phép ghi đè file trùng tên nhưng giữ nguyên thư mục `.git` và file `.env.local`. Sau đó chạy:

```bash
git status
git add .
git commit -m "Use live Supabase data and initialize sample database v1.5.1"
git push origin main
```

Không tạo repository hoặc site Netlify mới. Netlify tự nhận commit mới và triển khai.

## 4. Theo dõi Netlify

1. Netlify → site IPA hiện tại → **Deploys**.
2. Chờ deploy mới nhất chuyển sang **Published**.
3. Nếu giao diện chưa đổi: **Trigger deploy → Clear cache and deploy site**.
4. Biến môi trường cũ được giữ nguyên khi vẫn dùng cùng project Supabase.

## 5. Xử lý cập nhật cơ sở dữ liệu

Chỉ chạy file mới trong `supabase/migrations` mà bạn chưa từng chạy:

1. Supabase → đúng project → **SQL Editor → New query**.
2. Mở file migration mới, sao chép SQL, dán và bấm **Run** một lần.
3. Không chạy lại `supabase/schema.sql` trên database đang có dữ liệu.

Với bản v1.3.0, giữ nguyên các migration đã chạy trước đây và chạy thêm đúng một lần:

```text
supabase/migrations/20260918_role_portals.sql
```

Sau đó, với bản v1.4.0 chạy thêm đúng một lần:

```text
supabase/migrations/20260918_admin_management.sql
```

## Tài khoản Admin cố định

```text
Username: Admin
Password: Admin@123
```

Khi đăng nhập trên website Netlify, Function `ensure-admin` tự tạo hoặc đồng bộ tài khoản `admin@ipa.local` và hồ sơ `admin` trong Supabase. Admin vì vậy vẫn có phiên xác thực hợp lệ để tạo tài khoản học viên. Netlify bắt buộc phải có biến bí mật `SUPABASE_SERVICE_ROLE_KEY`.

Khi chạy local bằng `npm run dev`, khởi tạo Admin một lần bằng:

```bash
npm run seed:admin
```

## 6. Kiểm tra sau cập nhật

- Khu vực **Admin & Giáo viên** chỉ nhận role `admin` hoặc `teacher`.
- Khu vực **Học viên** chỉ nhận role `student`.
- Tạo lớp với nhiều ngày học và giờ riêng cho từng ngày.
- Sửa riêng một buổi học, bảo đảm các buổi khác không đổi.
- Đổi Việt/Anh; đăng xuất, đăng nhập lại và kiểm tra slogan mới.

## 7. Quay lại bản cũ nếu có lỗi

Netlify → **Deploys** → chọn deploy tốt gần nhất → **Publish deploy**. Website trở về bản trước mà không xóa dữ liệu Supabase.

## 8. Quy trình cho những lần sau

1. Sao lưu.
2. Ghi đè mã nguồn trong repository cũ.
3. Chạy `npm install` và `npm run build`.
4. Chạy duy nhất migration SQL mới nếu có.
5. Commit và push lên `main`.
6. Kiểm tra deploy bằng cả ba vai trò.
