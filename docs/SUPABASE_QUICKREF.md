# Supabase Integration - Quick Reference

## ⚡ Quick Start

### 1. Sử Dụng SQLite (Mặc Định)
```bash
# .env
DATABASE_URL="file:./dev.db"

# Run
npm run db:push
npm run dev
```

### 2. Chuyển Sang Supabase
```bash
# 1. Update prisma/schema.prisma
# Change: provider = "sqlite"
# To:     provider = "postgresql"

# 2. Get Supabase URL from dashboard and update .env
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# 3. Generate & push
npm run db:generate
npm run db:push

# 4. Verify connection
npm run db:verify

# 5. Run app
npm run dev
```

## 📝 Các Lệnh Quan Trọng

```bash
# Regenerate Prisma Client (sau khi đổi DATABASE_URL)
npm run db:generate

# Push schema to database (create tables)
npm run db:push

# Migrate data từ SQLite → Supabase
npm run db:migrate:supabase

# Production deployment
npm run db:migrate:deploy
```

## 🔄 Switch Between Databases

```bash
# SQLite → Supabase
1. Update DATABASE_URL in .env
2. npm run db:generate
3. npm run db:push

# Supabase → SQLite
1. Update DATABASE_URL in .env
2. npm run db:generate
3. npm run db:push
```

## 🚨 Common Issues

### Error: "Can't reach database server"
- Check connection string trong `.env`
- Verify password (không có ký tự đặc biệt chưa encode)

### Error: "Prisma schema not compatible"
```bash
npm run db:generate
```

### Migration fails
```bash
# Force reset (⚠️ sẽ xóa data)
npm run db:reset
```

## 📚 Full Documentation

Xem [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) để biết chi tiết.
