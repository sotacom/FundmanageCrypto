# Hướng Dẫn Deploy FundmanageCrypto lên Coolify (Self-hosted)

Hướng dẫn chi tiết deploy ứng dụng FundmanageCrypto lên **Coolify** trên máy chủ nội bộ, bao gồm self-host PostgreSQL và Supabase.

---

## 📋 Điều Kiện Tiên Quyết

### Phần cứng Server
| Yêu cầu | Tối thiểu | Khuyến nghị |
|----------|-----------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB | 50 GB SSD |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 LTS |

### Phần mềm
- ✅ **Coolify** đã cài đặt ([Hướng dẫn cài Coolify](https://coolify.io/docs/installation))
- ✅ **Docker** & **Docker Compose** (Coolify cài tự động)
- ✅ Git repository đã kết nối với Coolify

> [!TIP]
> Cài đặt Coolify nhanh nhất:
> ```bash
> curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
> ```
> Sau khi cài xong, truy cập `http://<server-ip>:8000` để setup.

---

## 🗄️ Bước 1: Setup PostgreSQL trên Coolify

### 1.1 Tạo PostgreSQL Service

1. Vào **Coolify Dashboard** → **Resources** → **+ New**
2. Chọn **Database** → **PostgreSQL**
3. Chọn server để deploy
4. Cấu hình:
   - **Name**: `fundmanage-db`
   - **PostgreSQL Version**: `16` (khuyến nghị)
   - **Database**: `fundmanage`
   - **Username**: `fundmanage`
   - **Password**: Tạo password mạnh và **LƯU LẠI**
5. Click **Deploy**

### 1.2 Lấy Connection String

Sau khi deploy xong, vào tab **Connection** của PostgreSQL service:

```
# Internal URL (dùng trong Coolify network):
postgresql://fundmanage:<password>@fundmanage-db:5432/fundmanage

# External URL (dùng từ máy local):
postgresql://fundmanage:<password>@<server-ip>:<mapped-port>/fundmanage
```

> [!IMPORTANT]
> Ghi lại **Internal URL** — sẽ dùng làm `DATABASE_URL` cho app.

---

## 🔐 Bước 2: Setup Supabase Auth

Có 2 lựa chọn. **Khuyến nghị Option B** cho môi trường nội bộ hoàn toàn.

### Option A: Dùng Supabase Cloud (Dễ nhất)

Nếu server có kết nối internet, cách đơn giản nhất:

1. Dùng Supabase project hiện tại hoặc tạo mới tại [supabase.com](https://supabase.com)
2. Lấy keys từ **Settings** → **API**:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
3. Xong — chuyển sang Bước 3

> [!WARNING]
> Server cần internet để xác thực user. Nếu mạng nội bộ không có internet, dùng Option B.

---

### Option B: Self-host Supabase (Khuyến nghị cho nội bộ)

Supabase cung cấp bộ Docker Compose chính thức để self-host. Đây là cách triển khai trên cùng server chạy Coolify.

#### Cách 1: Deploy trực tiếp qua Docker Compose (Khuyến nghị)

```bash
# SSH vào server
ssh user@<server-ip>

# Clone Supabase repo
git clone --depth 1 https://github.com/supabase/supabase.git /opt/supabase

# Di chuyển vào thư mục Docker
cd /opt/supabase/docker

# Copy file cấu hình
cp .env.example .env
```

Chỉnh sửa file `.env`:

```bash
nano .env
```

**Các biến quan trọng cần thay đổi:**

```env
# ============================================
# BẮT BUỘC THAY ĐỔI - Bảo mật
# ============================================

# Postgres password (dùng password khác với PostgreSQL ở Bước 1)
POSTGRES_PASSWORD=your-super-secret-supabase-password

# JWT Secret - PHẢI thay đổi! Dùng ít nhất 32 ký tự
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long

# Anon Key - Generate tại https://supabase.com/docs/guides/self-hosting#api-keys
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key - Generate cùng tool trên
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# URL Configuration
# ============================================

# URL mà app sẽ truy cập Supabase API
SITE_URL=http://<server-ip>:3000
API_EXTERNAL_URL=http://<server-ip>:8000

# Dashboard
SUPABASE_PUBLIC_URL=http://<server-ip>:8000
```

> [!TIP]
> **Generate JWT keys** nhanh bằng lệnh:
> ```bash
> # Generate JWT_SECRET
> openssl rand -base64 32
>
> # Hoặc dùng Supabase CLI
> npx supabase@latest gen keys
> ```
>
> Hoặc sử dụng công cụ online: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys

Khởi chạy Supabase:

```bash
cd /opt/supabase/docker
docker compose up -d
```

Kiểm tra các service đang chạy:

```bash
docker compose ps
```

**Sau khi chạy xong:**
- 🌐 **Supabase Studio** (Dashboard): `http://<server-ip>:8000`
- 🔑 **API URL**: `http://<server-ip>:8000`
- 📝 **ANON_KEY**: Giá trị `ANON_KEY` trong file `.env`
- 🔒 **SERVICE_ROLE_KEY**: Giá trị `SERVICE_ROLE_KEY` trong file `.env`

#### Cách 2: Deploy qua Coolify Docker Compose Resource

1. Vào **Coolify** → **Resources** → **+ New** → **Docker Compose**
2. Paste nội dung `docker-compose.yml` từ Supabase repo
3. Thêm environment variables
4. Deploy

> [!CAUTION]
> **Bảo mật Supabase Self-hosted:**
> - ⚠️ **BẮT BUỘC** thay đổi `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`
> - ⚠️ KHÔNG dùng giá trị mặc định trong `.env.example`
> - ⚠️ Hạn chế expose port ra ngoài nếu chỉ dùng nội bộ
> - ✅ Backup Supabase database thường xuyên

---

## 🚀 Bước 3: Deploy App lên Coolify

### 3.1 Kết nối Git Repository

1. Vào **Coolify Dashboard** → **Resources** → **+ New**
2. Chọn **Application**
3. Chọn **Git Source**:
   - **GitHub** (nếu đã kết nối GitHub App)
   - **Public Repository** (paste URL trực tiếp)
   - **Self-hosted Git** (Gitea, GitLab, etc.)
4. Chọn repository: `FundmanageCrypto`
5. Chọn branch: `feature/coolify-selfhost-deploy` (hoặc `main` sau khi merge)
6. Chọn server để deploy

### 3.2 Cấu hình Build

| Setting | Value |
|---------|-------|
| **Build Pack** | Dockerfile |
| **Dockerfile Location** | `/Dockerfile` |
| **Port** | `3000` |

**Build Arguments** (cần thiết vì Next.js inline `NEXT_PUBLIC_*` lúc build):

```
NEXT_PUBLIC_SUPABASE_URL=http://<server-ip>:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
NEXT_PUBLIC_APP_URL=http://<your-domain-or-ip>:3000
```

> [!IMPORTANT]
> `NEXT_PUBLIC_*` phải được set làm **Build Arguments** VÀ **Environment Variables**. 
> Next.js cần chúng lúc build (inline vào code) VÀ lúc runtime.

### 3.3 Environment Variables

Trong Coolify → Application → **Environment Variables**, thêm:

| Tên | Bắt buộc | Mô tả | Ví dụ |
|-----|----------|-------|-------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://fundmanage:pass@fundmanage-db:5432/fundmanage` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase API URL | `http://<server-ip>:8000` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Supabase service role key | `eyJ...` |
| `NEXTAUTH_SECRET` | ✅ | Random secret cho session | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | URL ứng dụng | `http://fund.internal` |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL công khai | `http://fund.internal` |

> [!TIP]
> Generate `NEXTAUTH_SECRET`:
> ```bash
> openssl rand -base64 32
> ```

### 3.4 Health Check

Cấu hình trong Coolify → Application → **Health Check**:

| Setting | Value |
|---------|-------|
| **Path** | `/api/health` |
| **Port** | `3000` |
| **Interval** | `30s` |
| **Timeout** | `10s` |
| **Retries** | `3` |

### 3.5 Domain / Proxy

Coolify tự động cấu hình **Traefik** làm reverse proxy:

1. Vào tab **Settings** của application
2. Thêm domain: `http://fund.internal` hoặc `http://<server-ip>:3000`
3. Nếu dùng domain nội bộ, cần cấu hình DNS server hoặc `/etc/hosts` trên các máy client:
   ```
   192.168.1.100  fund.internal
   ```

> [!NOTE]
> Nếu chỉ truy cập qua IP, có thể bỏ qua cấu hình domain và truy cập trực tiếp `http://<server-ip>:3000`.

### 3.6 Deploy!

Click **Deploy** trong Coolify. Theo dõi build logs để đảm bảo:

- ✅ Docker image build thành công (~3-5 phút lần đầu)
- ✅ Container khởi động
- ✅ Health check pass

---

## 🗂️ Bước 4: Khởi Tạo Database

Sau lần deploy đầu tiên, cần push schema vào PostgreSQL.

### Option 1: Qua Coolify Execute Command

1. Vào Coolify → Application → **Terminal**
2. Chạy:
   ```bash
   npx prisma db push
   ```

### Option 2: Từ máy local

```bash
# Dùng External URL của PostgreSQL trên Coolify
DATABASE_URL="postgresql://fundmanage:<password>@<server-ip>:<port>/fundmanage" npx prisma db push
```

### Option 3: Chạy migration script trong container

```bash
# SSH vào server, tìm container ID
docker ps | grep fundmanage

# Exec vào container
docker exec -it <container-id> npx prisma db push
```

### Verify Tables

Kiểm tra các tables đã được tạo:
- `User`, `Fund`, `FundMember`, `Account`
- `Transaction`, `AssetHolding`, `Fee`

> [!IMPORTANT]
> Bước này **BẮT BUỘC** phải chạy sau lần deploy đầu tiên. Nếu không, app sẽ lỗi khi truy vấn database.

---

## ✅ Bước 5: Kiểm Tra

### 5.1 Health Check
```bash
curl http://<server-ip>:3000/api/health
# Expected: {"status":"ok","db":"connected","timestamp":"..."}
```

### 5.2 Truy cập ứng dụng
1. Mở browser: `http://<server-ip>:3000` hoặc `http://fund.internal`
2. Trang Login sẽ hiển thị

### 5.3 Test Auth Flow
1. Click **"Đăng ký"**
2. Nhập email + password
3. Nếu dùng Supabase self-hosted, email verify tự động bypass
4. Đăng nhập thành công

### 5.4 Test Fund
1. Tạo quỹ mới
2. Thêm giao dịch
3. Kiểm tra dashboard hiển thị đúng

🎉 **Hoàn tất! App đã chạy trên server nội bộ.**

---

## 🔄 Cập Nhật & CI/CD

### Auto Deploy khi Push Code

1. Trong Coolify → Application → **Webhooks**
2. Copy webhook URL
3. Thêm vào GitHub repo: **Settings** → **Webhooks** → **Add webhook**
4. Mỗi lần push code, Coolify tự động rebuild và deploy

### Database Migrations

Khi thay đổi `prisma/schema.prisma`:

```bash
# Local: test trước
npm run db:push

# Production: sau khi deploy code mới
# Exec vào container và chạy
docker exec -it <container-id> npx prisma db push
```

> [!CAUTION]
> **Thay đổi schema có thể gây mất data!**
> - Luôn backup database trước khi migrate
> - Test migration trên staging trước
> - Dùng `prisma db push` (không dùng `--force-reset` trên production!)

---

## 🔧 Troubleshooting

### ❌ Build thất bại

**Triệu chứng**: Docker build lỗi

**Giải pháp**:
1. Kiểm tra build logs trong Coolify
2. Đảm bảo **Build Arguments** đã được set (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Kiểm tra Dockerfile path đúng `/Dockerfile`
4. Verify Dockerfile tồn tại trong branch đang deploy

### ❌ Không kết nối được Database

**Triệu chứng**: Health check trả về `{"status":"error","db":"disconnected"}`

**Giải pháp**:
1. Kiểm tra PostgreSQL service đang chạy trong Coolify
2. Verify `DATABASE_URL` dùng **Internal URL** (hostname là service name, không phải IP)
3. Đảm bảo app và DB cùng network trong Coolify
4. Test connection:
   ```bash
   docker exec -it <app-container> sh
   # Trong container:
   node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => console.log('OK')).catch(e => console.error(e))"
   ```

### ❌ Auth không hoạt động

**Triệu chứng**: Đăng nhập/đăng ký lỗi

**Giải pháp**:
1. Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` trỏ đúng đến Supabase instance
2. Kiểm tra `NEXT_PUBLIC_SUPABASE_ANON_KEY` đúng
3. Nếu self-host Supabase, đảm bảo:
   - Supabase containers đang chạy: `docker compose ps` (trong `/opt/supabase/docker`)
   - Port 8000 accessible từ app container
   - `SITE_URL` trong Supabase `.env` trỏ đúng đến app URL

### ❌ Health check fail

**Triệu chứng**: Coolify báo unhealthy

**Giải pháp**:
1. Kiểm tra endpoint: `curl http://localhost:3000/api/health` (từ trong container)
2. Verify port 3000 trong Health Check config
3. Tăng **Start Period** lên 60s nếu app khởi động chậm

### ❌ Port conflict với Supabase

**Triệu chứng**: Supabase không khởi động được

**Giải pháp**:
Supabase sử dụng các port: `8000` (API), `5432` (PostgreSQL), `9000` (Storage)
- Nếu port 5432 bị conflict (do Coolify PostgreSQL), thay đổi trong `docker-compose.yml` của Supabase
- Map sang port khác: `"5433:5432"` cho Supabase PostgreSQL

---

## 🔒 Bảo Mật

### Checklist

- [ ] Đổi tất cả password mặc định
- [ ] Generate JWT secrets riêng (không dùng mặc định)
- [ ] Hạn chế expose port ra public
- [ ] Bật firewall (`ufw`) chỉ cho phép SSH, HTTP/S
- [ ] Setup SSL nếu expose ra internet
- [ ] Regular backup PostgreSQL

### Backup PostgreSQL

```bash
# Backup
docker exec <postgres-container> pg_dump -U fundmanage fundmanage > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260621.sql | docker exec -i <postgres-container> psql -U fundmanage fundmanage
```

### Firewall (UFW)

```bash
# Cho phép SSH
sudo ufw allow 22/tcp

# Cho phép Coolify Dashboard
sudo ufw allow 8000/tcp

# Cho phép App
sudo ufw allow 3000/tcp

# Bật firewall
sudo ufw enable
```

---

## 📊 Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────┐
│                  Server Nội Bộ                   │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │              Coolify                      │    │
│  │  ┌──────────┐  ┌───────────────────┐     │    │
│  │  │ Traefik  │→ │  FundmanageCrypto │     │    │
│  │  │ (Proxy)  │  │  (Next.js:3000)   │     │    │
│  │  └──────────┘  └───────┬───────────┘     │    │
│  │                        │                  │    │
│  │              ┌─────────▼──────────┐      │    │
│  │              │   PostgreSQL:5432  │      │    │
│  │              │   (Coolify DB)     │      │    │
│  │              └────────────────────┘      │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │         Supabase Self-hosted              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐ │    │
│  │  │ GoTrue   │  │ PostgREST│  │ Studio │ │    │
│  │  │ (Auth)   │  │ (API)    │  │ (UI)   │ │    │
│  │  └──────────┘  └──────────┘  └────────┘ │    │
│  │  ┌──────────────────────────────────────┐│    │
│  │  │     Supabase PostgreSQL:5433         ││    │
│  │  └──────────────────────────────────────┘│    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Clients (LAN) ←──── http://fund.internal        │
└─────────────────────────────────────────────────┘
```

---

## 📚 Tài Liệu Tham Khảo

- [Coolify Documentation](https://coolify.io/docs)
- [Supabase Self-hosting Guide](https://supabase.com/docs/guides/self-hosting/docker)
- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

---

> Nếu gặp vấn đề, kiểm tra phần [Troubleshooting](#-troubleshooting) hoặc liên hệ team dev!
