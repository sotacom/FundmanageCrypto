# Hướng Dẫn Deploy Lên Vercel với Supabase

Tài liệu này hướng dẫn chi tiết cách deploy ứng dụng FundmanageCrypto lên Vercel và sử dụng Supabase làm database.

## 📋 Điều Kiện Tiên Quyết

### 1. Tài Khoản Cần Thiết
- ✅ Tài khoản GitHub (để connect với Vercel)
- ✅ Tài khoản Vercel (miễn phí tại [vercel.com](https://vercel.com))
- ✅ Tài khoản Supabase (miễn phí tại [supabase.com](https://supabase.com))

### 2. Repository Setup
- Code đã được push lên GitHub repository
- Repository có thể là public hoặc private

---

## 🗄️ Bước 1: Setup Supabase Database

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
> Xem hướng dẫn chi tiết tại [docs/SUPABASE_SETUP.md](file:///Users/sotacom/Documents/Coding/FundmanageCrypto/docs/SUPABASE_SETUP.md)

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

> [!WARNING]
> **Bảo Mật Connection String**
> - ⚠️ KHÔNG share connection string công khai
> - ⚠️ KHÔNG commit vào code
> - ✅ Chỉ lưu trong Vercel environment variables

**Lưu connection string này lại**, bạn sẽ cần nó ở bước 3.

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

> [!NOTE]
> Build command đã được cấu hình sẵn trong `vercel.json` và `package.json`, nhưng bạn có thể override tại đây nếu cần.

---

## 🔑 Bước 3: Configure Environment Variables

### 3.1. Add DATABASE_URL

1. Trong Vercel project settings, click tab **"Environment Variables"**
2. Add biến môi trường:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres:YOUR-PASSWORD@db.xxxxx.supabase.co:5432/postgres` | Production, Preview, Development |

3. Paste connection string từ Bước 1.2 vào **Value**
4. Chọn tất cả environments: **Production**, **Preview**, và **Development**
5. Click **"Save"**

### 3.2. Optional: Add Connection Pooling

Để tối ưu performance trong production, thêm connection pooling:

```
postgresql://postgres:YOUR-PASSWORD@db.xxxxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
```

> [!TIP]
> Connection pooling giúp quản lý kết nối database hiệu quả hơn, đặc biệt với serverless functions.

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
> - TypeScript errors (nếu đã bật checking)

---

## 🗂️ Bước 5: Initialize Database Schema

Sau khi deploy thành công, cần push schema lên Supabase:

### 5.1. Option A: Từ Local Machine (Recommended)

1. Tạo file `.env` trong project local:
   ```bash
   DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.xxxxx.supabase.co:5432/postgres"
   ```

2. Push schema lên Supabase:
   ```bash
   npm run db:push
   ```

3. Verify trong Supabase dashboard:
   - Click **Table Editor**
   - Bạn sẽ thấy các tables: `Fund`, `Account`, `Transaction`, `AssetHolding`, `Fee`

### 5.2. Option B: Sử dụng Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link project:
   ```bash
   vercel link
   ```

3. Pull environment variables:
   ```bash
   vercel env pull
   ```

4. Run migration:
   ```bash
   npm run db:push
   ```

---

## ✅ Bước 6: Verify Deployment

### 6.1. Test Application

1. Vercel sẽ cung cấp URL deployment, ví dụ:
   ```
   https://fundmanage-crypto.vercel.app
   ```

2. Mở URL trong browser

3. Initialize fund đầu tiên:
   ```bash
   curl https://fundmanage-crypto.vercel.app/api/init -X POST
   ```

   **Expected response**:
   ```json
   {
     "success": true,
     "message": "Empty fund initialized successfully",
     "fundId": "clxxxx..."
   }
   ```

### 6.2. Verify Data in Supabase

1. Quay lại Supabase dashboard
2. Click **Table Editor** → `Fund`
3. Bạn sẽ thấy fund vừa tạo
4. Click `Account` → Thấy 2 accounts (Binance, Ví lạnh)

### 6.3. Test Basic Operations

Thử tạo một transaction:
1. Truy cập app UI
2. Nhập data vào form
3. Submit
4. Check Supabase dashboard để verify data đã lưu

🎉 **Thành công!** App đã được deploy và hoạt động trên production.

---

## 🔄 Workflow: Updates và Continuous Deployment

### Auto Deploy on Git Push

Vercel tự động deploy khi bạn push code:

1. **Main branch** → Deploys to **Production**
2. **Other branches** → Deploys to **Preview** (staging URL)
3. **Pull requests** → Deploys to temporary **Preview** environment

### Deploy Process

```bash
# Local development
git add .
git commit -m "Add new feature"
git push origin main

# Vercel tự động:
# 1. Detect new commit
# 2. Trigger build
# 3. Run tests (nếu có)
# 4. Deploy to production
# 5. Invalidate cache
```

### Database Migrations

Khi có thay đổi schema:

1. Update `prisma/schema.prisma`
2. Test locally:
   ```bash
   npm run db:push
   ```
3. Push code lên GitHub
4. Vercel sẽ tự động deploy code mới
5. **Manually** run migration on production database:
   ```bash
   # Option 1: Từ local với production DATABASE_URL
   DATABASE_URL="postgresql://..." npm run db:push
   
   # Option 2: Sử dụng Vercel CLI
   vercel env pull
   npm run db:push
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
3. Test connection từ local:
   ```bash
   npm run db:verify
   ```

### ❌ Build Error: "Prisma Client not generated"

**Nguyên nhân**: `postinstall` script không chạy hoặc fail.

**Giải pháp**:
1. Verify `package.json` có `postinstall` script
2. Check build logs để xem `prisma generate` có chạy không
3. Manually override build command trong Vercel:
   ```bash
   prisma generate && next build
   ```

### ❌ Runtime Error: "P1001 - Can't reach database"

**Nguyên nhân**: Serverless function không thể kết nối Supabase.

**Giải pháp**:
1. Check `DATABASE_URL` trong production environment
2. Thêm connection pooling:
   ```
   ?pgbouncer=true&connection_limit=1
   ```
3. Verify Supabase project status (có thể đang maintenance)

### ❌ Performance Issue: Slow Database Queries

**Giải pháp**:
1. Enable connection pooling (xem bước 3.2)
2. Add database indexes trong Supabase:
   ```sql
   CREATE INDEX idx_transaction_fundId ON "Transaction"("fundId");
   CREATE INDEX idx_assetholding_fundId ON "AssetHolding"("fundId");
   ```
3. Consider upgrading Supabase plan nếu cần

### 🐛 Debugging Tips

**View Logs**:
- Vercel Dashboard → Project → Deployments → Click deployment → Logs
- Real-time logs cho functions và build process

**Check Environment**:
```bash
vercel env ls
```

**Test Production Build Locally**:
```bash
npm run build
npm run start
```

---

## 🔒 Security Best Practices

### Environment Variables
- ✅ Lưu `DATABASE_URL` trong Vercel environment variables
- ✅ Không commit `.env` files vào Git
- ✅ Use different databases cho dev/staging/production

### Database Access
- ✅ Enable RLS (Row Level Security) trong Supabase if needed
- ✅ Create read-only user nếu cần analytics access
- ✅ Regularly review Supabase access logs

### Supabase Security
- ✅ Enable database backups (auto trong free plan: 7 days)
- ✅ Use SSL connections (mặc định trong connection string)
- ✅ Monitor database performance trong Supabase dashboard

---

## 📊 Monitoring & Maintenance

### Vercel Analytics
1. Enable trong Project Settings → Analytics
2. Monitor:
   - Page views
   - Function invocations
   - Performance metrics
   - Error rates

### Supabase Monitoring
1. Dashboard → Database → Performance
2. Check:
   - Database size (free: 500MB)
   - Active connections
   - Query performance
   - Bandwidth usage

### Alerts Setup
- Setup alerts trong Supabase cho database size limits
- Monitor Vercel function execution limits (free: 100GB-hours/month)

---

## 💰 Pricing Considerations

### Vercel Free Tier
- ✅ Unlimited websites
- ✅ 100GB bandwidth/month
- ✅ 100GB-Hrs serverless function execution
- ✅ Automatic HTTPS
- ⚠️ No commercial usage without Pro plan

### Supabase Free Tier
- ✅ 500MB database storage
- ✅ 1GB file storage
- ✅ 50MB bandwidth/day
- ✅ 500K Edge Function invocations
- ✅ 7-day log retention
- ✅ Auto backups (7 days)

> [!TIP]
> Free tiers là đủ cho MVP và small-scale applications. Nâng cấp khi cần scale.

---

## 🚀 Advanced: Custom Domain

### Add Custom Domain to Vercel

1. Vercel Dashboard → Project → Settings → Domains
2. Add domain (ví dụ: `fundmanage.vn`)
3. Configure DNS records theo hướng dẫn Vercel:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. Vercel tự động provision SSL certificate (Let's Encrypt)

---

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Supabase Docs](https://supabase.com/docs)
- [Project Supabase Setup Guide](file:///Users/sotacom/Documents/Coding/FundmanageCrypto/docs/SUPABASE_SETUP.md)

---

## 📝 Deployment Checklist

Copy checklist này để track progress:

### Pre-Deployment
- [ ] Supabase project created
- [ ] Database password saved securely
- [ ] Connection string obtained
- [ ] GitHub repository ready
- [ ] Code pushed to main branch

### Vercel Setup
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] `DATABASE_URL` environment variable configured
- [ ] Build settings verified

### Deployment
- [ ] First deployment successful
- [ ] Build logs checked (no errors)
- [ ] Deployment URL accessible

### Database
- [ ] Schema pushed to Supabase (`npm run db:push`)
- [ ] Tables visible in Supabase dashboard
- [ ] Initial data seeded (if needed)

### Verification
- [ ] Application loads correctly
- [ ] Can create fund/transaction
- [ ] Data persists in Supabase
- [ ] No console errors

### Post-Deployment
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Monitoring setup
- [ ] Backup strategy verified

---

Nếu gặp vấn đề, check [Troubleshooting](#-troubleshooting) hoặc open issue trên GitHub!
