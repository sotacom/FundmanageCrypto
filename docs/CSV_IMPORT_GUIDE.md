# Hướng dẫn Import CSV giao dịch

## Tổng quan

Tính năng Import CSV cho phép bạn nhập nhiều giao dịch cùng lúc thay vì nhập tay từng giao dịch. Hỗ trợ tất cả 11 loại giao dịch trong hệ thống.

**Vị trí:** Tab **Lịch sử giao dịch** → Nút **"Import CSV"** (góc phải)

---

## Cách sử dụng

### Bước 1: Chuẩn bị file CSV

- Tải file mẫu tại: nút **"Template CSV"** trong popup Import, hoặc truy cập `/templates/transactions_template.csv`
- Mỗi hàng là 1 giao dịch, hàng đầu tiên là header

### Bước 2: Upload & Preview

- Bấm **"Import CSV"** → chọn file
- Hệ thống sẽ parse và **hiển thị bảng preview** với trạng thái từng hàng:
  - ✅ Hợp lệ — sẵn sàng import
  - ❌ Lỗi — hiện lý do cụ thể (sửa trong file CSV rồi upload lại)
- Import **chỉ bắt đầu khi tất cả hàng đều hợp lệ**

### Bước 3: Import

- Bấm **"Import X giao dịch"**
- Hệ thống import tất cả rồi tính toán lại quỹ 1 lần
- Trang sẽ tự reload để hiển thị dữ liệu mới

---

## Format CSV

### Các cột

```
date,type,amount,price,fee,fee_currency,from_account,to_account,note,opt_qty,opt_buy_price,opt_buy_fee,opt_sell_price,opt_sell_fee
```

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| `date` | text | ✅ | Ngày giờ, format `YYYY-MM-DD HH:mm` hoặc `YYYY-MM-DD` |
| `type` | text | ✅ | Loại giao dịch (xem bảng bên dưới) |
| `amount` | số | ✅* | Số lượng (đơn vị tùy loại giao dịch) |
| `price` | số | tùy | Giá giao dịch (VND/USDT hoặc USDT/BTC) |
| `fee` | số | tùy | Phí giao dịch |
| `fee_currency` | text | tùy | Đơn vị phí: `VND`, `USDT`, hoặc `BTC` |
| `from_account` | text | tùy | **Tên** tài khoản nguồn (ví dụ: "Binance 1") |
| `to_account` | text | tùy | **Tên** tài khoản đích (ví dụ: "Ví lạnh") |
| `note` | text | không | Ghi chú tự do |
| `opt_qty` | số | option | Số lượng hợp đồng option |
| `opt_buy_price` | số | option | Giá mua premium (USDT) |
| `opt_buy_fee` | số | option | Phí mua (USDT) |
| `opt_sell_price` | số | option | Giá bán premium (USDT) |
| `opt_sell_fee` | số | option | Phí bán (USDT) |

> **Lưu ý:** Cột account dùng **tên tài khoản** (không phải ID). Hệ thống tự động map tên → ID khi import.

### Các loại giao dịch (`type`)

| Type | Tên | amount = ? | Cần price? | Cần from? | Cần to? |
|------|-----|-----------|------------|-----------|---------|
| `capital_in` | Góp vốn | VND | ❌ | ❌ | ❌ |
| `capital_out` | Rút vốn / Lợi nhuận | VND | ❌ | ❌ | ❌ |
| `buy_usdt` | Mua USDT (VND → USDT) | USDT | ✅ VND/USDT | ❌ | ✅ |
| `sell_usdt` | Bán USDT (USDT → VND) | USDT | ✅ VND/USDT | ✅ | ❌ |
| `transfer_usdt` | Chuyển USDT | USDT | ❌ | ✅ | ✅ |
| `buy_btc` | Mua BTC (USDT → BTC) | BTC | ✅ USDT/BTC | ✅ | ✅ |
| `sell_btc` | Bán BTC (BTC → USDT) | BTC | ✅ USDT/BTC | ✅ | ✅ |
| `transfer_btc` | Chuyển BTC | BTC | ❌ | ✅ | ✅ |
| `earn_interest` | Lãi suất USDT Earn | USDT | ❌ | ❌ | ✅ |
| `futures_pnl` | PnL Futures | USDT (PnL, cho phép âm) | ❌ | ❌ | ✅ |
| `option_pnl` | PnL Option | _(tự tính)_ | ❌ | ❌ | ✅ |

### Chi tiết từng loại

#### `capital_in` — Góp vốn
```csv
2026-01-01 09:00,capital_in,300000000,,,,,,Góp vốn lần đầu
```
- `amount` = số VND góp vào

#### `capital_out` — Rút vốn / Lợi nhuận
```csv
2026-03-01 14:00,capital_out,50000000,,,,,,Rút lợi nhuận tháng 3
```
- `amount` = số VND rút ra

#### `buy_usdt` — Mua USDT bằng VND
```csv
2026-01-02 10:30,buy_usdt,5000,26500,,,,Binance 1,Mua USDT P2P
```
- `amount` = số USDT mua được
- `price` = giá VND/USDT
- `to_account` = tài khoản nhận USDT

#### `sell_usdt` — Bán USDT thu VND
```csv
2026-01-08 10:00,sell_usdt,2000,27000,,,Binance 1,,Bán USDT P2P
```
- `amount` = số USDT bán ra
- `price` = giá VND/USDT
- `from_account` = tài khoản USDT nguồn

#### `buy_btc` — Mua BTC bằng USDT
```csv
2026-01-03 11:00,buy_btc,0.05,65000,0.5,USDT,Binance 1,Binance 1,Mua BTC spot
```
- `amount` = số BTC mua
- `price` = giá USDT/BTC
- `fee` + `fee_currency` = phí (nếu có)
- `from_account` = tài khoản USDT trả
- `to_account` = tài khoản BTC nhận

#### `sell_btc` — Bán BTC thu USDT
```csv
2026-01-04 14:00,sell_btc,0.02,67000,0.3,USDT,Binance 1,Binance 1,Bán BTC chốt lời
```
- `amount` = số BTC bán
- `price` = giá USDT/BTC
- `from_account` = tài khoản BTC nguồn
- `to_account` = tài khoản USDT nhận

#### `transfer_usdt` / `transfer_btc` — Chuyển giữa tài khoản
```csv
2026-01-05 08:00,transfer_usdt,1000,,,,Binance 1,Ví lạnh,Chuyển USDT backup
```
- `amount` = số lượng chuyển
- `from_account` ≠ `to_account`

#### `earn_interest` — Lãi suất USDT Earn
```csv
2026-01-06 00:00,earn_interest,2.5,,,,,"Binance 1",Lãi Earn tuần
```
- `amount` = số USDT lãi nhận được
- `to_account` = tài khoản nhận lãi

#### `futures_pnl` — PnL Futures (Long/Short)
```csv
2026-01-07 16:00,futures_pnl,45.5,,3.2,USDT,,Binance 1,Long BTC 65k→67k
```
- `amount` = PnL bằng USDT (dương = lãi, **âm = lỗ**)
- `fee` = phí giao dịch (USDT)
- `to_account` = tài khoản Futures

#### `option_pnl` — PnL Option (BTC)
```csv
2026-01-10 15:00,option_pnl,,,,,,Binance 1,BTC Call 65k Mar28,1.5,120,0.5,180,0.5
```
- **Không cần** điền `amount` và `fee` — hệ thống tự tính:
  - PnL = (opt_sell_price − opt_buy_price) × opt_qty
  - Tổng phí = opt_buy_fee + opt_sell_fee
- `opt_sell_price = 0` nếu option hết hạn không giá trị
- Khi import, sẽ lưu dưới dạng `futures_pnl` với ghi chú `[Option]`

---

## Lưu ý quan trọng

1. **Tên tài khoản phải chính xác** — khớp với tên trong "Quản lý tài khoản", phân biệt hoa/thường: không (tự động match)
2. **Giới hạn 1000 dòng** mỗi lần import
3. **Thứ tự dòng** nên theo thời gian (cũ → mới) để dữ liệu nhất quán
4. **Dấu thập phân**: dùng `.` (dấu chấm), ví dụ `0.05`, `26500.50`
5. **Tên chứa dấu phẩy**: bọc trong ngoặc kép `"Tên có, dấu phẩy"`
6. **Encoding**: Lưu file CSV bằng UTF-8 để hỗ trợ tiếng Việt

---

## Sử dụng AI LLM để chuyển đổi lịch sử giao dịch

Nếu bạn có lịch sử giao dịch ở dạng chưa chuẩn (tin nhắn, ghi chú, ảnh chụp, hoặc bảng Excel khác format...), bạn có thể dùng AI LLM (ChatGPT, Claude, Gemini...) để chuyển đổi sang format CSV chuẩn.

### Prompt mẫu — Copy và dùng ngay

Dưới đây là prompt bạn có thể copy trực tiếp vào AI LLM. Chỉ cần thay phần `[DÁN LỊCH SỬ GIAO DỊCH Ở ĐÂY]` bằng dữ liệu thực tế của bạn:

---

````
Hãy giúp tôi chuyển đổi lịch sử giao dịch bên dưới thành file CSV theo format chuẩn.

## FORMAT CSV YÊU CẦU:

Header:
date,type,amount,price,fee,fee_currency,from_account,to_account,note,opt_qty,opt_buy_price,opt_buy_fee,opt_sell_price,opt_sell_fee

## RULES:

1. Cột `date`: format `YYYY-MM-DD HH:mm` (nếu không có giờ thì dùng `00:00`)
2. Cột `type` phải là 1 trong các giá trị sau (chính xác, viết thường):
   - `capital_in` — Góp vốn bằng VND
   - `capital_out` — Rút vốn/lợi nhuận bằng VND
   - `buy_usdt` — Mua USDT bằng VND (amount = số USDT, price = giá VND/USDT)
   - `sell_usdt` — Bán USDT thu VND (amount = số USDT, price = giá VND/USDT)
   - `transfer_usdt` — Chuyển USDT giữa tài khoản
   - `buy_btc` — Mua BTC bằng USDT (amount = số BTC, price = giá USDT/BTC)
   - `sell_btc` — Bán BTC thu USDT (amount = số BTC, price = giá USDT/BTC)
   - `transfer_btc` — Chuyển BTC giữa tài khoản
   - `earn_interest` — Lãi suất USDT Earn (amount = USDT lãi)
   - `futures_pnl` — PnL Futures Long/Short (amount = PnL USDT, cho phép âm nếu lỗ)
   - `option_pnl` — PnL Option BTC (KHÔNG điền amount/fee, điền 5 cột opt_*)

3. Cột `amount`:
   - capital_in/capital_out: số VND
   - buy_usdt/sell_usdt/transfer_usdt/earn_interest/futures_pnl: số USDT
   - buy_btc/sell_btc/transfer_btc: số BTC
   - futures_pnl: cho phép số âm (lỗ)
   - option_pnl: để trống (hệ thống tự tính)

4. Cột `price`:
   - buy_usdt/sell_usdt: giá VND trên 1 USDT
   - buy_btc/sell_btc: giá USDT trên 1 BTC
   - Các loại khác: để trống

5. Cột `fee` và `fee_currency`:
   - Nếu có phí giao dịch: điền số phí và đơn vị (VND, USDT, hoặc BTC)
   - Nếu không có: để trống cả 2 cột

6. Cột `from_account` và `to_account`:
   - Dùng TÊN tài khoản (ví dụ: "Binance 1", "Ví lạnh")
   - buy_usdt: chỉ cần to_account
   - sell_usdt: chỉ cần from_account
   - buy_btc, sell_btc: cần cả from_account VÀ to_account
   - transfer_usdt, transfer_btc: cần cả from_account VÀ to_account (phải khác nhau)
   - earn_interest, futures_pnl, option_pnl: chỉ cần to_account
   - capital_in, capital_out: để trống cả 2

7. Cột `note`: ghi chú tùy ý, mô tả ngắn gọn giao dịch

8. 5 cột `opt_*` chỉ dùng cho `option_pnl`:
   - opt_qty: số lượng hợp đồng
   - opt_buy_price: giá mua premium (USDT)
   - opt_buy_fee: phí mua (USDT), mặc định 0
   - opt_sell_price: giá bán premium (USDT), điền 0 nếu hết hạn không giá trị
   - opt_sell_fee: phí bán (USDT), mặc định 0

9. Dấu thập phân dùng `.` (dấu chấm), ví dụ: 0.05, 26500.50
10. Nếu tên tài khoản chứa dấu phẩy, bọc trong ngoặc kép: "Tên, có dấu phẩy"
11. Sắp xếp theo thời gian từ cũ → mới
12. với các loại khác option_pnl, 5 cột opt_* để trống

## VÍ DỤ OUTPUT:

```csv
date,type,amount,price,fee,fee_currency,from_account,to_account,note,opt_qty,opt_buy_price,opt_buy_fee,opt_sell_price,opt_sell_fee
2026-01-01 09:00,capital_in,300000000,,,,,,Góp vốn lần đầu,,,,,
2026-01-02 10:30,buy_usdt,5000,26500,,,,Binance 1,Mua USDT P2P,,,,,
2026-01-03 11:00,buy_btc,0.05,65000,0.5,USDT,Binance 1,Binance 1,Mua BTC spot,,,,,
2026-01-07 16:00,futures_pnl,45.5,,3.2,USDT,,Binance 1,Long BTC 65k,,,,,
2026-01-07 16:00,futures_pnl,-12.3,,1.5,USDT,,Binance 1,Short BTC thua lỗ,,,,,
2026-01-10 15:00,option_pnl,,,,,,,Binance 1,BTC Call 65k,1.5,120,0.5,180,0.5
```

## LỊCH SỬ GIAO DỊCH CẦN CHUYỂN ĐỔI:

[DÁN LỊCH SỬ GIAO DỊCH Ở ĐÂY]
````

---

### Mẹo sử dụng prompt

1. **Copy toàn bộ prompt** ở trên vào AI LLM
2. **Thay phần cuối** `[DÁN LỊCH SỬ GIAO DỊCH Ở ĐÂY]` bằng dữ liệu thực tế — có thể ở bất kỳ format nào:
   - Tin nhắn chat / ghi chú tay
   - Bảng Excel copy-paste
   - Ảnh chụp lịch sử giao dịch (với AI hỗ trợ đọc ảnh)
   - Export từ Binance hoặc sàn khác
3. **Kiểm tra output** AI trả về, đặc biệt:
   - Tên tài khoản có đúng không (phải khớp với tên trong app)
   - Số lượng và giá có đúng đơn vị không
4. **Lưu thành file `.csv`** (UTF-8 encoding)
5. **Upload vào app** qua nút Import CSV

### Ví dụ: Dữ liệu đầu vào mẫu

Bạn có thể dán dữ liệu kiểu như thế này:

```
ngày 1/3 góp 300 triệu
2/3 mua 5000 usdt giá 26.5k trên Binance 1
3/3 mua 0.05 btc giá 65000 phí 0.5u trên Binance 1
5/3 chuyển 1000u từ Binance 1 sang ví lạnh
7/3 long btc lãi 45.5u phí 3.2u trên Binance 1
10/3 mua option call btc 1.5 hợp đồng giá 120u phí 0.5u, bán giá 180u phí 0.5u trên Binance 1
```

AI sẽ tự chuyển thành CSV chuẩn theo format yêu cầu.
