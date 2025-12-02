# Quản Lý Quỹ Đầu Tư Cá Nhân

Ứng dụng quản lý quỹ đầu tư cá nhân được xây dựng với Next.js 15, TypeScript và Prisma ORM.

## 🚀 Tính năng

### 📊 Dashboard Tổng Quan
- **NAV (Net Asset Value)**: Hiển thị tổng giá trị tài sản ròng theo cả VND và USDT
- **uPNL (Unrealized Profit/Loss)**: Lãi/lỗ chưa hiện thực với phần trăm
- **PnL (Realized Profit/Loss)**: Lãi/lỗ đã hiện thực
- **Tổng Lãi/Lỗ**: Tổng lợi nhuận từ khi bắt đầu

### 💰 Quản Lý Tài Sản
- **VND**: Tiền mặt Việt Nam Đồng
- **USDT**: Tether (Stablecoin)
- **BTC**: Bitcoin

### 🔄 Các Loại Giao Dịch
1. **Góp vốn** (VND)
2. **Rút vốn/Lợi nhuận** (VND)
3. **Mua USDT** (VND → USDT)
4. **Bán USDT** (USDT → VND)
5. **Chuyển USDT** (giữa các địa điểm)
6. **Mua BTC** (USDT → BTC)
7. **Bán BTC** (BTC → USDT)
8. **Chuyển BTC** (giữa các địa điểm)
9. **Lãi suất USDT Earn**

### 🏢 Đa Tài Khoản
- **Binance Spot**: Tài khoản giao dịch spot
- **Binance Earn**: Tài khoản gửi lãi
- **Ví lạnh**: Ví lạnh đa chữ ký
- Hỗ trợ 2-3 tài khoản Binance và nhiều nơi lưu trữ

### 📈 Phân Tích NAV
- **Phương pháp 1**: NAV theo VND (tổng giá trị quy đổi VND)
- **Phương pháp 2**: NAV theo USDT (cash VND + stablecoin+crypto)

### 💡 Tính Năng Kế Toán
- **Giá mua trung bình**: Tính theo bình quân gia quyền
  - USDT/VND cho USDT
  - BTC/USDT cho BTC
- **Quản lý phí giao dịch**: Theo dõi phí mua/bán BTC
- **Lãi/lỗ 2 loại**: Chưa hiện thực và đã hiện thực

## 🛠 Công Nghệ

- **Frontend**: Next.js 15 với App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (New York style)
- **Database**: SQLite với Prisma ORM
- **Icons**: Lucide React

## 📁 Cấu Trúc Database

### Fund
- Thông tin quỹ đầu tư
- Vốn ban đầu (VND)

### Account
- Các tài khoản (Binance, Ví lạnh, Earn)
- Loại và platform

### Transaction
- Lịch sử giao dịch
- 9 loại giao dịch khác nhau
- Thông tin giá, phí, địa điểm

### AssetHolding
- Số dư các tài sản
- Giá mua trung bình
- Vị trí lưu trữ

### Fee
- Quản lý phí giao dịch
- Phân loại phí

## 🚀 Bắt Đầu

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd fund-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup database**
   ```bash
   npm run db:push
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:3000
   ```

## 📱 Giao Diện

### Main Dashboard
- Cards hiển thị NAV, uPNL, PnL
- Tabs chi tiết:
  - **Sở hữu tài sản**: Phân bổ theo loại tài sản
  - **Phân tích NAV**: 2 phương pháp tính NAV
  - **Giá trung bình**: Giá mua TB USDT/VND, BTC/USDT
  - **Lịch sử giao dịch**: Danh sách giao dịch gần đây

### Transaction Form
- Modal tạo giao dịch mới
- Form động theo loại giao dịch
- Validate dữ liệu real-time

## 🔄 Luồng Hoạt Động

1. **Góp vốn** → VND trong quỹ tăng
2. **Mua USDT** → VND giảm, USDT tăng (theo tỷ giá P2P)
3. **Chuyển USDT** → USDT chuyển giữa Spot/Earn/Ví lạnh
4. **Mua BTC** → USDT giảm, BTC tăng (theo giá spot)
5. **Chuyển BTC** → BTC chuyển giữa Spot/Ví lạnh
6. **Lãi suất Earn** → USDT tăng tự động

## 📊 Tính Toán

### Giá Mua Trung Bình
```
Giá TB = (Σ(Số lượng × Giá)) / (Tổng số lượng)
```

### NAV theo VND
```
NAV = VND_cash + USDT × Tỷ giá USDT/VND + BTC × Giá BTC/USDT × Tỷ giá USDT/VND
```

### uPNL
```
uPNL = NAV_hiện_tại - Vốn_ban_đầu
```

## 🔧 API Endpoints

- `GET/POST /api/funds` - Quản lý quỹ
- `GET/POST /api/transactions` - Giao dịch
- `GET/POST /api/nav` - Tính NAV & PnL
- `GET/POST /api/avg-price` - Giá mua TB
- `POST /api/init` - Khởi tạo data demo

## 🎯 Tương Lai

- [ ] Real-time price updates từ Binance API
- [ ] Charts & Analytics
- [ ] Export reports (Excel, PDF)
- [ ] Multi-user support
- [ ] Mobile app
- [ ] Advanced tax calculations

## 📝 License

MIT License