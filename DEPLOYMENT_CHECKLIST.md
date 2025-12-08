# ✅ Deployment Checklist - Vercel + Supabase

Sử dụng checklist này để đảm bảo deployment thành công.

---

## 📋 PRE-DEPLOYMENT

### Supabase Setup
- [ ] Tạo Supabase account tại [supabase.com](https://supabase.com)
- [ ] Tạo new project trong Supabase
  - [ ] Đặt tên project (ví dụ: `fundmanage-production`)
  - [ ] Tạo database password mạnh và **LƯU LẠI**
  - [ ] Chọn region: **Singapore (South East Asia)**
  - [ ] Chọn plan: **Free**
- [ ] Đợi Supabase khởi tạo project (2-3 phút)
- [ ] Lấy database connection string:
  - [ ] Settings → Database → Connection String (URI)
  - [ ] Copy và thay `[YOUR-PASSWORD]` bằng password thực
- [ ] Lấy Supabase Auth keys:
  - [ ] Settings → API → Project URL
  - [ ] Settings → API → anon public key
  - [ ] Settings → API → service_role secret

### GitHub Repository
- [ ] Code đã được commit
- [ ] Code đã được push lên GitHub
- [ ] Branch chính: `main`

### Local Verification
- [ ] Build thành công locally:
  ```bash
  npm run build
  ```
- [ ] Không có TypeScript errors
- [ ] Không có build errors

---

## 🚀 VERCEL DEPLOYMENT

### Setup Vercel Account
- [ ] Tạo Vercel account tại [vercel.com](https://vercel.com)
- [ ] Đăng nhập bằng GitHub account

### Import Project
- [ ] Click "Add New..." → "Project"
- [ ] Click "Import Git Repository"
- [ ] Authorize Vercel với GitHub (nếu lần đầu)
- [ ] Tìm và select repository `FundmanageCrypto`
- [ ] Click "Import"

### Environment Variables (QUAN TRỌNG)
- [ ] Click tab "Environment Variables"
- [ ] Add biến `DATABASE_URL`:
  - **Name**: `DATABASE_URL`
  - **Value**: `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres`
- [ ] Add biến `NEXT_PUBLIC_SUPABASE_URL`:
  - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
  - **Value**: `https://xxxxx.supabase.co`
- [ ] Add biến `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
  - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **Value**: `eyJhbGc...` (anon key từ Supabase)
- [ ] Add biến `SUPABASE_SERVICE_ROLE_KEY`:
  - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
  - **Value**: `eyJhbGc...` (service role key từ Supabase)
- [ ] Select tất cả environments: **Production**, **Preview**, **Development**
- [ ] Click "Save"

### Deploy
- [ ] Click "Deploy" button
- [ ] Đợi deployment process (2-5 phút)
- [ ] Monitor build logs để check progress

---

## 🔍 VERIFY DEPLOYMENT

### Build Verification
- [ ] Build logs không có errors
- [ ] "Installing dependencies" - ✅
- [ ] "Running `prisma generate`" (via postinstall) - ✅
- [ ] "Building Next.js app" - ✅
- [ ] "Deployment successful" - ✅

### Application Verification
- [ ] Click vào deployment URL
- [ ] Trang Login hiển thị
- [ ] Không có errors trong browser console

---

## 🗄️ DATABASE SETUP

### Initialize Database Schema

**Từ Local Machine:**
- [ ] Set production DATABASE_URL trong terminal:
  ```bash
  export DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
  ```
- [ ] Run migration:
  ```bash
  npx prisma db push
  ```
  Hoặc reset hoàn toàn:
  ```bash
  npx prisma db push --force-reset
  ```
- [ ] Verify output: "Your database is now in sync"

### Verify Database Tables
- [ ] Mở Supabase dashboard
- [ ] Click "Table Editor"
- [ ] Verify tables đã được tạo:
  - [ ] `User`
  - [ ] `Fund`
  - [ ] `FundMember`
  - [ ] `Account`
  - [ ] `Transaction`
  - [ ] `AssetHolding`
  - [ ] `Fee`

---

## ✨ POST-DEPLOYMENT

### Test Authentication
- [ ] Mở production URL trong browser
- [ ] Click "Đăng ký" để tạo account mới
- [ ] Nhập email và password
- [ ] Verify email (nếu Supabase bật email confirmation)
- [ ] Đăng nhập thành công

### Test Fund Creation
- [ ] Sau khi đăng nhập, click "Tạo quỹ mới"
- [ ] Nhập tên quỹ
- [ ] Chọn múi giờ (default: Asia/Ho_Chi_Minh)
- [ ] Click tạo
- [ ] Verify quỹ xuất hiện trong dropdown

### Test Transaction
- [ ] Tạo giao dịch mới (ví dụ: Góp vốn)
- [ ] Chọn ngày giờ giao dịch
- [ ] Submit thành công
- [ ] Verify transaction xuất hiện trong lịch sử
- [ ] Verify ngày giờ hiển thị đúng theo múi giờ quỹ

### Test Fund Settings
- [ ] Mở tab "Cài đặt"
- [ ] Verify múi giờ hiển thị (ví dụ: "(UTC+7) Việt Nam")
- [ ] Click edit để thay đổi múi giờ (optional)
- [ ] Verify transaction dates update theo múi giờ mới

---

## 🔒 SECURITY CHECKLIST

- [ ] `.env` file KHÔNG được commit vào Git
- [ ] Database password KHÔNG được share publicly
- [ ] Supabase keys KHÔNG được share publicly
- [ ] Connection string chỉ lưu trong Vercel environment variables
- [ ] GitHub repository có thể là private (recommended)

---

## 🔄 CONTINUOUS DEPLOYMENT

### Automatic Deploy on Push
- [ ] Verify Vercel đã connect với GitHub
- [ ] Test automatic deploy:
  - [ ] Make a small change in code
  - [ ] Commit và push to main branch
  - [ ] Verify Vercel tự động trigger deployment
  - [ ] Check deployment successful

### Database Schema Changes
- [ ] Sau khi push code mới với schema changes:
  ```bash
  # Sync schema (giữ data nếu có thể)
  DATABASE_URL="postgresql://..." npx prisma db push
  
  # Hoặc reset hoàn toàn (xóa data)
  DATABASE_URL="postgresql://..." npx prisma db push --force-reset
  ```

---

## ✅ COMPLETION

- [ ] All checks above passed
- [ ] Application accessible via Vercel URL
- [ ] Authentication working (login/signup)
- [ ] Database connected and working
- [ ] Can create funds and transactions
- [ ] Timezone hiển thị đúng
- [ ] Auto-deploy working on git push

🎉 **DEPLOYMENT SUCCESSFUL!**

**Production URL**: `https://_________________.vercel.app`

**Database**: Supabase (Singapore region)

**Authentication**: Supabase Auth

**Next steps**:
1. Share URL với users
2. Monitor performance và usage
3. Setup custom domain (optional)
4. Regular database backups

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Notes**:
_____________________________________________________
_____________________________________________________
