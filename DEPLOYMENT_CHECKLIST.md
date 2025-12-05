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
  - [ ] Format: `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres`

### GitHub Repository
- [ ] Code đã được commit
- [ ] Code đã được push lên GitHub
- [ ] Repository tên: `FundmanageCrypto` (hoặc tên khác)
- [ ] Branch chính: `main` hoặc `master`

### Local Verification
- [ ] Build thành công locally:
  ```bash
  NODE_ENV=production npm run build
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

### Configure Deployment Settings
- [ ] **Framework Preset**: Verify là "Next.js"
- [ ] **Root Directory**: Giữ mặc định `./`
- [ ] **Build Command**: Verify là `npm run build` hoặc để trống
- [ ] **Install Command**: Verify là `npm install` hoặc để trống
- [ ] Không cần thay đổi gì (đã có trong `vercel.json`)

### Environment Variables
- [ ] Click tab "Environment Variables"
- [ ] Add biến `DATABASE_URL`:
  - **Name**: `DATABASE_URL`
  - **Value**: `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres`
  - **Environments**: Select tất cả (Production, Preview, Development)
- [ ] Click "Save"
- [ ] (Optional) Add connection pooling:
  ```
  postgresql://...?pgbouncer=true&connection_limit=1
  ```

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
- [ ] Vercel provide URL deployment (example: `https://fundmanage-crypto.vercel.app`)
- [ ] Click vào URL
- [ ] Application loads successfully
- [ ] Không có errors trong browser console

---

## 🗄️ DATABASE SETUP

### Initialize Database Schema

**Option 1: Từ Local Machine (Recommended)**
- [ ] Create file `.env` local với production DATABASE_URL:
  ```bash
  DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
  ```
- [ ] Run migration:
  ```bash
  npm run db:push
  ```
- [ ] Verify output: "Your database is now in sync"

**Option 2: Using Vercel CLI**
- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Link project: `vercel link`
- [ ] Pull env vars: `vercel env pull`
- [ ] Run migration: `npm run db:push`

### Verify Database Tables
- [ ] Mở Supabase dashboard
- [ ] Click "Table Editor"
- [ ] Verify 5 tables đã được tạo:
  - [ ] `Fund`
  - [ ] `Account`
  - [ ] `Transaction`
  - [ ] `AssetHolding`
  - [ ] `Fee`

---

## ✨ POST-DEPLOYMENT

### Test Application Functions
- [ ] Initialize fund:
  ```bash
  curl https://YOUR-VERCEL-URL.vercel.app/api/init -X POST
  ```
- [ ] Response có `"success": true`
- [ ] Verify fund created trong Supabase Table Editor

### Test via UI
- [ ] Mở production URL trong browser
- [ ] Dashboard loads correctly
- [ ] Try tạo transaction mới
- [ ] Verify transaction xuất hiện trong UI
- [ ] Check Supabase dashboard → `Transaction` table có data mới

### Performance Check
- [ ] Page load speed acceptable (< 3s)
- [ ] API calls work correctly
- [ ] Live prices updating (USDT/VND, BTC/USDT)
- [ ] No console errors

---

## 🔒 SECURITY & MONITORING

### Security Checklist
- [ ] `.env` file KHÔNG được commit vào Git
- [ ] Database password KHÔNG được share publicly
- [ ] Connection string chỉ lưu trong Vercel environment variables
- [ ] GitHub repository có thể là private (recommended)

### Monitoring Setup
- [ ] Check Vercel Analytics (nếu enable)
- [ ] Check Supabase dashboard:
  - [ ] Database size (free tier: 500MB max)
  - [ ] Active connections
  - [ ] Query performance
- [ ] Setup alerts cho database size limits (optional)

---

## 🔄 CONTINUOUS DEPLOYMENT

### Automatic Deploy on Push
- [ ] Verify Vercel đã connect với GitHub
- [ ] Test automatic deploy:
  - [ ] Make a small change in code
  - [ ] Commit và push to main branch
  - [ ] Verify Vercel tự động trigger deployment
  - [ ] Check deployment successful

### Workflow
```bash
# Local
git add .
git commit -m "Your message"
git push origin main

# Vercel tự động:
# ✅ Detect commit
# ✅ Run build
# ✅ Deploy to production
```

---

## 🎯 OPTIONAL ENHANCEMENTS

### Custom Domain (Optional)
- [ ] Purchase domain (ví dụ: `fundmanage.vn`)
- [ ] Add domain trong Vercel:
  - [ ] Project Settings → Domains
  - [ ] Add domain và configure DNS
  - [ ] Vercel tự động provision SSL certificate

### Database Backups
- [ ] Verify Supabase auto backup enabled (mặc định: 7 ngày)
- [ ] Consider manual backup cho production data
- [ ] Test restore process (optional)

---

## 🆘 TROUBLESHOOTING

Nếu có vấn đề, xem [DEPLOYMENT.md - Troubleshooting section](./DEPLOYMENT.md#-troubleshooting):

Common issues:
- ❌ Build error: Check build logs
- ❌ Database connection error: Verify DATABASE_URL
- ❌ Prisma client not generated: Check postinstall script ran
- ❌ Performance slow: Enable connection pooling

---

## ✅ COMPLETION

- [ ] All checks above passed
- [ ] Application accessible via Vercel URL
- [ ] Database connected and working
- [ ] Can create and view transactions
- [ ] Auto-deploy working on git push

🎉 **DEPLOYMENT SUCCESSFUL!**

**Production URL**: `https://_________________.vercel.app`

**Database**: Supabase (Singapore region)

**Next steps**:
1. Share URL with users
2. Monitor performance and usage
3. Setup custom domain (optional)
4. Regular database backups

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Notes**:
_____________________________________________________
_____________________________________________________
_____________________________________________________
