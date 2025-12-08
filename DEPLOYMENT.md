# Hướng Dẫn Deploy Lên Vercel với Supabase

Tài liệu này hướng dẫn chi tiết cách deploy ứng dụng FundmanageCrypto lên Vercel và sử dụng Supabase làm database + authentication.

## 📋 Điều Kiện Tiên Quyết

### 1. Tài Khoản Cần Thiết
- ✅ Tài khoản GitHub (để connect với Vercel)
- ✅ Tài khoản Vercel (miễn phí tại [vercel.com](https://vercel.com))
- ✅ Tài khoản Supabase (miễn phí tại [supabase.com](https://supabase.com))

### 2. Repository Setup
- Code đã được push lên GitHub repository
- Repository có thể là public hoặc private

---

## 🗄️ Bước 1: Setup Supabase

### 1.1. Tạo Supabase Project

1. Truy cập [https://supabase.com](https://supabase.com)
2. Đăng nhập và click **"New Project"**
3. Điền thông tin:
   - **Name**: `fundmanage-production` (hoặc tên bạn muốn)
   - **Database Password**: Tạo password mạnh và **LƯU LẠI**
   - **Region**: Chọn `Singapore (South East Asia)` (gần VN nhất)
   - **Pricing Plan**: `Free`
4. Click **"Create new project"**
5. Đợi 2-3 phút để Supabase khởi tạo

> [!TIP]
> Xem hướng dẫn chi tiết tại [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md)

### 1.2. Lấy Database Connection String

1. Trong Supabase dashboard, click **Settings** ⚙️
2. Click **Database** trong menu bên trái
3. Scroll xuống phần **"Connection String"**
4. Chọn tab **"URI"**
5. Copy connection string có dạng:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. Thay `[YOUR-PASSWORD]` bằng password bạn đã tạo ở bước 1.1

### 1.3. Lấy Supabase Auth Keys (BẮT BUỘC)

1. Trong Supabase dashboard, click **Settings** ⚙️
2. Click **API** trong menu bên trái
3. Copy các giá trị sau:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (dài)
   - **service_role secret**: `eyJhbGc...` (dài, KHÔNG share)

> [!WARNING]
> **Bảo Mật Keys**
> - ⚠️ KHÔNG share `service_role` key công khai
> - ⚠️ KHÔNG commit keys vào code
> - ✅ Chỉ lưu trong Vercel environment variables

### 1.4. Enable Auth Providers (Optional)

1. Supabase Dashboard → **Authentication** → **Providers**
2. Enable các providers muốn dùng:
   - **Email**: Enabled by default
   - **Google**: Configure với Google Cloud credentials
   - **GitHub**: Configure với GitHub OAuth app

---

## 🚀 Bước 2: Setup Vercel Project

### 2.1. Import Project từ GitHub

1. Truy cập [https://vercel.com](https://vercel.com)
2. Đăng nhập và click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Authorize Vercel với GitHub (nếu chưa)
5. Tìm và chọn repository `FundmanageCrypto`
6. Click **"Import"**

### 2.2. Configure Project Settings

Vercel sẽ tự động detect Next.js và hiển thị form cấu hình:

**Framework Preset**: Next.js (auto-detected) ✅

**Root Directory**: `./` (mặc định) ✅

**Build and Output Settings**:
- Giữ mặc định, Vercel sẽ đọc từ `vercel.json`

**Install Command**:
```bash
npm install
```

**Build Command**:
```bash
prisma generate && next build
```

---

## 🔑 Bước 3: Configure Environment Variables

### 3.1. Required Environment Variables

| Name | Value | Description |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres` | Database connection |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Supabase service role key |

### 3.2. Add Variables to Vercel

1. Trong Vercel project settings, click tab **"Environment Variables"**
2. Add từng biến môi trường như bảng trên
3. Chọn tất cả environments: **Production**, **Preview**, và **Development**
4. Click **"Save"**

### 3.3. Optional: Connection Pooling

Để tối ưu performance trong production:

```
postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
```

---

## 🏗️ Bước 4: Deploy

### 4.1. Trigger First Deployment

1. Click **"Deploy"** trong Vercel dashboard
2. Vercel sẽ:
   - Clone repository
   - Chạy `npm install` (tự động chạy `prisma generate` qua `postinstall`)
   - Build Next.js app
   - Deploy lên Vercel edge network
3. Đợi 2-5 phút cho deployment hoàn tất

### 4.2. Monitor Build Logs

- Click vào deployment để xem real-time logs
- Check các bước:
  - ✅ Installing dependencies
  - ✅ Running `prisma generate`
  - ✅ Building Next.js app
  - ✅ Deployment successful

> [!IMPORTANT]
> Nếu build **fail**, check logs để tìm lỗi. Thường là:
> - Missing environment variables
> - Wrong DATABASE_URL format
> - TypeScript errors

---

## 🗂️ Bước 5: Initialize Database Schema

Sau khi deploy thành công, cần push schema lên Supabase:

### 5.1. Reset và Khởi Tạo Database (Fresh Install)

```bash
# Từ local machine với production DATABASE_URL
DATABASE_URL="postgresql://..." npx prisma db push --force-reset
```

### 5.2. Update Schema (Giữ Data)

```bash
# Chỉ sync schema, không xóa dữ liệu
DATABASE_URL="postgresql://..." npx prisma db push
```

### 5.3. Verify Tables

Trong Supabase dashboard → **Table Editor**, verify các tables:
- `User`
- `Fund`
- `FundMember`
- `Account`
- `Transaction`
- `AssetHolding`
- `Fee`

---

## ✅ Bước 6: Verify Deployment

### 6.1. Test Application

1. Mở URL deployment (ví dụ: `https://fundmanage-crypto.vercel.app`)
2. Bạn sẽ thấy trang **Login**
3. **Đăng ký tài khoản mới** hoặc đăng nhập

### 6.2. Test Authentication Flow

1. Click **"Đăng ký"**
2. Nhập email và password
3. Check email để verify (nếu Supabase bật email confirmation)
4. Đăng nhập với tài khoản vừa tạo

### 6.3. Test Fund Creation

1. Sau khi đăng nhập, tạo quỹ đầu tiên
2. Chọn timezone (default: Asia/Ho_Chi_Minh)
3. Thêm giao dịch với ngày giờ tùy chỉnh

🎉 **Thành công!** App đã được deploy và hoạt động trên production.

---

## 🔄 Workflow: Updates và Continuous Deployment

### Auto Deploy on Git Push

Vercel tự động deploy khi bạn push code:

1. **Main branch** → Deploys to **Production**
2. **Other branches** → Deploys to **Preview** (staging URL)
3. **Pull requests** → Deploys to temporary **Preview** environment

### Database Migrations

Khi có thay đổi schema:

1. Update `prisma/schema.prisma`
2. Test locally:
   ```bash
   npm run db:push
   ```
3. Push code lên GitHub
4. **Manually** run migration on production:
   ```bash
   # Option 1: Reset hoàn toàn (xóa data)
   DATABASE_URL="postgresql://..." npx prisma db push --force-reset
   
   # Option 2: Chỉ sync schema (giữ data nếu có thể)
   DATABASE_URL="postgresql://..." npm run db:push
   ```

> [!CAUTION]
> **Production Database Migrations**
> - Always backup database trước khi migrate
> - Test migrations trên staging environment trước
> - Có kế hoạch rollback nếu migration fail

---

## 🔧 Troubleshooting

### ❌ Build Error: "Can't reach database server"

**Nguyên nhân**: DATABASE_URL không đúng hoặc chưa được set.

**Giải pháp**:
1. Check Vercel environment variables
2. Verify connection string format
3. Test connection từ local

### ❌ Auth Error: "Invalid API Key"

**Nguyên nhân**: Supabase keys không đúng.

**Giải pháp**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Check keys trong Supabase → Settings → API
3. Ensure không có extra spaces trong keys

### ❌ Runtime Error: "User not authenticated"

**Nguyên nhân**: Auth middleware không hoạt động.

**Giải pháp**:
1. Verify middleware.ts đang handle auth routes đúng
2. Check Supabase auth cookies
3. Clear browser cookies và thử lại

### ❌ Timezone không hiển thị đúng

**Nguyên nhân**: Fund chưa có timezone hoặc schema cũ.

**Giải pháp**:
1. Run `npm run db:push` để sync schema mới
2. Default timezone là `Asia/Ho_Chi_Minh`
3. Có thể thay đổi trong Settings của mỗi quỹ

---

## 🔒 Security Best Practices

### Environment Variables
- ✅ Lưu tất cả secrets trong Vercel environment variables
- ✅ Không commit `.env` files vào Git
- ✅ Use different Supabase projects cho dev/staging/production

### Authentication
- ✅ Supabase Auth với email/password hoặc OAuth
- ✅ Role-based access control (Owner/Editor/Viewer)
- ✅ Protected API routes với middleware

### Database Access
- ✅ Row-level access control qua FundMember table
- ✅ Only fund members có thể access fund data
- ✅ Owner-only operations (delete fund, manage members)

---

## 📊 Monitoring & Maintenance

### Vercel Analytics
- Enable trong Project Settings → Analytics
- Monitor page views, function invocations, error rates

### Supabase Monitoring
- Dashboard → Database → Performance
- Check database size, connections, query performance

---

## 💰 Pricing Considerations

### Vercel Free Tier
- ✅ Unlimited websites
- ✅ 100GB bandwidth/month
- ✅ 100GB-Hrs serverless function execution
- ✅ Automatic HTTPS

### Supabase Free Tier
- ✅ 500MB database storage
- ✅ 50,000 monthly active users (Auth)
- ✅ 500MB file storage
- ✅ 7-day database backup retention

---

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Project Supabase Setup Guide](./docs/SUPABASE_SETUP.md)

---

Nếu gặp vấn đề, check [Troubleshooting](#-troubleshooting) hoặc open issue trên GitHub!
