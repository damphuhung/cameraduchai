Dưới đây là nội dung file README.md hoàn chỉnh, tổng hợp toàn bộ quá trình từ lúc bắt đầu đến khi hoàn thiện dự án.

Bạn chỉ cần tạo một file có tên README.md ở thư mục gốc của dự án (ngang hàng với package.json), sau đó copy và dán toàn bộ nội dung này vào là xong.

markdown
# 📱 ERP Cửa hàng Thiết bị Điện tử (PWA)

Phần mềm quản lý bán hàng chuyên nghiệp dành cho cửa hàng nhỏ kinh doanh các thiết bị điện tử (Camera, Đầu thu, Ổ cứng, Đèn năng lượng mặt trời...). Ứng dụng được thiết kế theo dạng **PWA (Progressive Web App)**, cho phép cài đặt và sử dụng mượt mà như một app native trên cả điện thoại (iOS/Android) và máy tính.

---

## 🚀 1. Công nghệ sử dụng (Tech Stack)

*   **Frontend / Backend:** Next.js 14 (App Router), React, TypeScript
*   **Giao diện:** Tailwind CSS, shadcn/ui (hỗ trợ Responsive, Mobile Drawer Menu)
*   **Database:** PostgreSQL (chạy trên **Supabase**)
*   **ORM:** Prisma (v6.x)
*   **Xác thực:** NextAuth.js (Phân quyền động: Admin, Quản lý, Nhân viên...)
*   **Lưu trữ ảnh:** Supabase Storage (Lưu ảnh bill chuyển khoản, chứng minh thanh toán)
*   **Xuất/Nhập liệu:** Thư viện `xlsx` (Hỗ trợ Excel)
*   **Triển khai (Hosting):** Netlify

---

## ✨ 2. Các tính năng chính

Hệ thống bao gồm 12 module cốt lõi:
1.  **Tổng quan (Dashboard):** Thống kê doanh thu, lợi nhuận, cảnh báo tồn kho, bảo hành sắp hết hạn.
2.  **Sản phẩm:** Quản lý danh mục, hãng, thông số kỹ thuật, quản lý theo S/N (Serial Number).
3.  **Nhập kho:** Tạo phiếu nhập, quét mã vạch S/N, upload ảnh bill thanh toán, lịch sử thanh toán NCC.
4.  **Bán hàng (POS):** Giỏ hàng, chọn S/N, thanh toán tiền mặt/chuyển khoản, tự động tạo mã **VietQR**, tính tiền thừa (Bonus).
5.  **Đơn hàng:** Quản lý danh sách đơn, trạng thái thanh toán (Thu đủ/Ghi nợ).
6.  **Khách hàng & Nhà cung cấp:** Quản lý thông tin, theo dõi công nợ.
7.  **Bảo hành:** Tự động tạo thẻ bảo hành khi bán S/N, tra cứu thời hạn, tạo phiếu tiếp nhận bảo hành.
8.  **Tra cứu S/N:** Quét mã vạch để xem nhanh lịch sử mua bán, bảo hành.
9.  **Báo cáo:** Biểu đồ doanh thu, lợi nhuận, tồn kho, top sản phẩm bán chạy, tiền Tip.
10. **Import/Export Excel:** Nhập hàng loạt sản phẩm/khách hàng/NCC, xuất báo cáo.
11. **Nhật ký (Audit Log):** Ghi lại mọi thao tác của nhân viên (Thêm, sửa, xóa, thu tiền...).
12. **Backup & Restore:** Sao lưu toàn bộ Database ra JSON/Excel và phục hồi.

---

## 🛠️ 3. Cài đặt môi trường Local (Development)

### Yêu cầu hệ thống:
*   Node.js (v20.x trở lên)
*   Tài khoản Supabase (để lấy Database & Storage)

### Các bước cài đặt:

1. **Clone source code:**
   ```bash
   git clone https://github.com/damphuhung/cameraduchai.git
   cd cameraduchai
Cài đặt dependencies:

bash
npm install
Cấu hình biến môi trường:
Tạo file .env ở thư mục gốc với nội dung sau (lấy thông tin từ Supabase Dashboard):

env
# Database (Lấy từ Supabase -> Settings -> Database -> Connection string)
# QUAN TRỌNG: DATABASE_URL phải dùng port 6543 (Pooler) kèm pgbouncer=true
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# NextAuth
NEXTAUTH_SECRET="tạo_bằng_lệnh_openssl_rand_base64_32"
NEXTAUTH_URL="http://localhost:3000"

# Supabase Storage (Lấy từ Supabase -> Settings -> API)
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="chuỗi_anon_key_dài"
Khởi tạo Database và dữ liệu mẫu:

bash
npx prisma generate
npx prisma migrate dev
npm run db:seed
Chạy server:

bash
npm run dev
Truy cập: http://localhost:3000
Tài khoản mặc định:

Admin: admin@erp.local / admin123

Nhân viên: staff@erp.local / staff123

🌐 4. Hướng dẫn Deploy lên Netlify
Dự án đã được cấu hình sẵn file netlify.toml.

Đẩy code lên GitHub.

Vào Netlify -> Add new project -> Chọn repo GitHub này.

Cấu hình Build: (Netlify tự đọc netlify.toml)

Build command: npx prisma generate && next build

Publish directory: .next

Thêm Environment Variables: Copy toàn bộ 6 biến trong file .env ở trên vào Netlify (Lưu ý: NEXTAUTH_URL phải đổi thành domain của Netlify, ví dụ https://erp-cuahang.netlify.app).

Bấm Deploy.

⚠️ 5. Các lưu ý quan trọng (Troubleshooting)
1. Về Database Migration (Prisma):
Do Netlify chạy Serverless, chúng ta không chạy prisma migrate deploy tự động trên Netlify để tránh lỗi timeout.
👉 Mỗi khi thay đổi file schema.prisma, bạn phải chạy lệnh này ở máy Local (để cập nhật DB trên Supabase) trước khi push code:

bash
npx prisma migrate dev --name ten_thay_doi
npx prisma migrate deploy
2. Về Connection Pooling (PgBouncer):
Tuyệt đối không đổi DATABASE_URL về port 5432. Nếu dùng port 5432 trên Netlify, app sẽ bị lỗi Too many connections hoặc prepared statement already exists. Luôn giữ port 6543 kèm ?pgbouncer=true&connection_limit=1.

3. Về Upload ảnh (Supabase Storage):
Nếu báo lỗi new row violates row-level security policy, bạn cần vào Supabase -> Storage -> Tạo bucket tên là proofs (chế độ Public) và thêm 2 Policies (INSERT và SELECT) cho bucket này với role anon.

4. Về PWA (Cài app lên điện thoại):
Android (Chrome): Bấm Menu (3 chấm) -> "Thêm vào màn hình chính".

iOS (Safari): Bấm nút Share -> "Thêm vào màn hình chính". (Bắt buộc dùng Safari, không dùng Chrome trên iOS).

5. Về quyền (Role) động:
Dự án đã bỏ enum Role trong database, chuyển sang dùng bảng Role riêng để bạn có thể tùy ý thêm các quyền mới (VD: KETOAN, THUKHO) ở giao diện Nhân viên. Tuy nhiên, các menu hệ thống vẫn đang mặc định gán cho ADMIN, MANAGER và STAFF.