# Hướng Dẫn Setup Supabase Database

Tài liệu này hướng dẫn cách thiết lập Supabase (PostgreSQL) làm database cho ứng dụng quản lý quỹ đầu tư.

## Tại Sao Nên Dùng Supabase?

### ✅ Ưu Điểm
- **Miễn phí**: 500MB database, 1GB file storage, 50MB bandwidth/ngày
- **Dashboard UI**: Xem và quản lý data qua web interface
- **Auto Backup**: Tự động backup database
- **Scalable**: Dễ dàng nâng cấp khi cần
- **PostgreSQL**: Database mạnh mẽ, production-ready
- **Realtime**: Hỗ trợ realtime subscriptions (có thể dùng sau)

### 🔄 So Sánh với SQLite

| Tính năng | SQLite | Supabase |
|-----------|--------|----------|
| Setup | ⚡ Đơn giản | 🔧 Cần config |
| Performance | 🚀 Nhanh (local) | ⚡ Tốt (network) |
| Scalability | ❌ File-based | ✅ Cloud-based |
| Multi-user | ❌ Không | ✅ Có |
| Backup | 📁 Manual | ☁️ Automatic |
| Dashboard | ❌ Không | ✅ Web UI |
| Production | ⚠️ Không khuyến nghị | ✅ Production-ready |

**Khuyến nghị**: 
- 🏠 **Development**: Dùng SQLite (đơn giản, nhanh)
- 🚀 **Production**: Dùng Supabase (scalable, reliable)

---

## 📋 Bước 1: Tạo Supabase Project

### 1.1. Đăng Ký Tài Khoản

1. Truy cập [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** hoặc **"Sign Up"**
3. Đăng nhập bằng GitHub (recommended) hoặc email

### 1.2. Tạo Project Mới

1. Sau khi đăng nhập, click **"New Project"**
2. Điền thông tin:
   - **Name**: `fund-management` (hoặc tên bạn muốn)
   - **Database Password**: Tạo password mạnh và **LƯU LẠI** (rất quan trọng!)
   - **Region**: Chọn `Singapore (South East Asia)` (gần VN nhất, latency thấp)
   - **Pricing Plan**: `Free` (đủ cho hầu hết use cases)
3. Click **"Create new project"**
4. Đợi 2-3 phút để Supabase setup database

---

## 🔑 Bước 2: Lấy Database Connection String

### 2.1. Tìm Connection String

1. Trong project dashboard, click **Settings** (⚙️ icon ở sidebar trái)
2. Click **Database** trong menu Settings
3. Scroll xuống phần **"Connection String"**
4. Chọn tab **"URI"**
5. Copy connection string có dạng:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

### 2.2. Replace Password

Connection string có `[YOUR-PASSWORD]` là placeholder. Bạn cần:

1. Copy connection string
2. Replace `[YOUR-PASSWORD]` với password bạn đã tạo ở Bước 1.2
3. Ví dụ nếu password là `MySecretPass123!`:
   ```
   postgresql://postgres:MySecretPass123!@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

> [!WARNING]
> **Bảo Mật Connection String**
> - ⚠️ KHÔNG commit connection string vào Git
> - ⚠️ KHÔNG share connection string công khai
> - ✅ Chỉ lưu trong file `.env` (đã có trong `.gitignore`)

---

## ⚙️ Bước 3: Cấu Hình Local Environment

### 3.1. Update Prisma Schema

1. Mở file `prisma/schema.prisma`
2. Tìm dòng:
   ```prisma
   provider = "sqlite"  // Change to "postgresql" for Supabase
   ```
3. Đổi thành:
   ```prisma
   provider = "postgresql"
   ```

### 3.2. Update Environment Variable

1. Mở file `.env` trong thư mục root của project
2. Thay thế nội dung bằng connection string từ Bước 2:

```env
# Supabase PostgreSQL Database
DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.your-project-ref.supabase.co:5432/postgres"
```

3. Lưu file `.env`

### 3.3. Generate Prisma Client

Prisma client cần regenerate để nhận diện PostgreSQL provider:

```bash
npm run db:generate
```

**Expected output**:
```
✔ Generated Prisma Client (x.x.x) to ./node_modules/@prisma/client
```

---

## 🗄️ Bước 4: Chạy Database Migrations

### 4.1. Push Schema to Supabase

Lần đầu setup, dùng `db:push` để tạo tables:

```bash
npm run db:push
```

**Expected output**:
```
🚀  Your database is now in sync with your Prisma schema.
```

### 4.2. Verify Schema trong Supabase Dashboard

1. Quay lại Supabase dashboard
2. Click **Table Editor** trong sidebar
3. Bạn sẽ thấy 5 tables đã được tạo:
   - `Fund`
   - `Account`
   - `Transaction`
   - `AssetHolding`
   - `Fee`

---

## ✅ Bước 5: Test Connection

### 5.1. Start Development Server

```bash
npm run dev
```

### 5.2. Initialize Demo Data

1. Mở browser: `http://localhost:3000`
2. App sẽ tự động tạo fund mới (hoặc call API):

```bash
curl http://localhost:3000/api/init -X POST
```

**Expected response**:
```json
{
  "success": true,
  "message": "Empty fund initialized successfully",
  "fundId": "clxxxx..."
}
```

### 5.3. Verify Data trong Supabase

1. Quay lại Supabase dashboard → **Table Editor**
2. Click vào table `Fund`
3. Bạn sẽ thấy 1 row mới được tạo
4. Click vào table `Account` → Thấy 2 accounts (Binance, Ví lạnh)

🎉 **Thành công!** Database đã kết nối với Supabase.

---

## 🔄 Bước 6: Migration Data từ SQLite (Tùy Chọn)

Nếu bạn đã có data trong SQLite và muốn chuyển sang Supabase:

### 6.1. Backup SQLite Data

```bash
# Backup file SQLite hiện tại
cp prisma/dev.db prisma/dev.db.backup
```

### 6.2. Run Migration Script

```bash
npm run db:migrate:supabase
```

Script sẽ:
1. Đọc tất cả data từ SQLite (`prisma/dev.db`)
2. Connect đến Supabase (dùng `DATABASE_URL` mới)
3. Import data vào Supabase
4. Validate data integrity

### 6.3. Verify Migration

Check trong Supabase dashboard xem data đã được import đúng chưa.

---

## 🚀 Bước 7: Production Deployment

### 7.1. Environment Variables

Khi deploy lên production (Vercel, Railway, etc.), set environment variable:

**Vercel**:
```bash
vercel env add DATABASE_URL
# Paste connection string khi được hỏi
```

**Railway/Render**:
- Add environment variable `DATABASE_URL` trong dashboard
- Paste connection string

### 7.2. Run Migrations on Deploy

Hầu hết platforms sẽ tự chạy `prisma generate`. Nếu không:

```bash
# Thêm vào build command
npm run db:generate && npm run build
```

---

## 🔧 Troubleshooting

### ❌ Error: "Can't reach database server"

**Nguyên nhân**: Connection string sai hoặc network issue.

**Giải pháp**:
1. Verify connection string trong `.env`
2. Check password có đúng không (không có ký tự đặc biệt chưa encode)
3. Thử encode password nếu có ký tự đặc biệt:
   ```javascript
   // Nếu password là: "My@Pass#123"
   const encoded = encodeURIComponent("My@Pass#123")
   // Dùng: postgresql://postgres:My%40Pass%23123@...
   ```

### ❌ Error: "SSL connection required"

**Nguyên nhân**: Supabase requires SSL.

**Giải pháp**: Thêm `?sslmode=require` vào cuối connection string:
```env
DATABASE_URL="postgresql://...?sslmode=require"
```

### ❌ Error: "Prepared statement already exists"

**Nguyên nhân**: Connection pooling issue.

**Giải pháp**: Thêm connection pooling config:
```env
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"
```

### 🐌 Performance Slow?

**Giải pháp**:
1. Check region: Đổi sang Singapore nếu đang dùng US/EU
2. Enable connection pooling (xem trên)
3. Add indexes nếu cần (trong Supabase dashboard)

---

## 📊 Supabase Dashboard Features

### Table Editor
- View/edit data như Excel
- Add/delete rows manually
- Search và filter

### SQL Editor
- Chạy custom SQL queries
- Export results to CSV
- Save queries for reuse

### Database
- View connection info
- Monitor performance
- Check database size

### Logs
- Real-time query logs
- Error tracking
- Performance monitoring

---

## 🔙 Quay Lại SQLite

Nếu muốn quay lại dùng SQLite:

1. Update `.env`:
   ```env
   DATABASE_URL="file:./dev.db"
   ```

2. Regenerate Prisma Client:
   ```bash
   npm run db:generate
   ```

3. Push schema (nếu cần):
   ```bash
   npm run db:push
   ```

---

## 💡 Tips & Best Practices

1. **Development**: Dùng SQLite cho development (nhanh, đơn giản)
2. **Staging**: Dùng Supabase project riêng cho staging
3. **Production**: Dùng Supabase project riêng cho production
4. **Backups**: Supabase free plan có auto backup 7 ngày
5. **Monitoring**: Check Supabase dashboard thường xuyên
6. **Security**: Không bao giờ commit `.env` file

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Supabase Free Tier Limits](https://supabase.com/pricing)

---

Nếu có vấn đề gì, check [Troubleshooting](#-troubleshooting) hoặc liên hệ support!
