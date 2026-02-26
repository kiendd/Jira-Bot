# Jira Monitor Bot

Một Telegram Bot đa người dùng được viết bằng TypeScript và Node.js giúp tự động theo dõi và lấy thông báo từ **Jira** nhanh chóng. 
Bot sẽ gửi tin nhắn trực tiếp qua Telegram khi Issue có thay đổi về trạng thái, phân công, tiêu đề, bình luận (comments), mức độ ưu tiên và các trường thông tin khác mà bạn đang quan tâm.

## ✨ Tính năng nổi bật

- **Theo dõi toàn diện:** Thông báo sự thay đổi của hầu hết các trường trong Jira bao gồm: Status, Assignee, Summary, Description, Priority, Comments, Labels...
- **Nhận diện Issue mới:** Format gửi tin nhắn với icon nổi bật `✨ New Issue` để dễ dàng phân biệt với các thông báo Update thông thường `🔔`.
- **Lọc thông minh (Self-Action Filtering):** Bot tự động bỏ qua và KHÔNG thông báo những sự thay đổi do chính người dùng gây ra (chặn Spam tin nhắn cập nhật của chính mình).
- **Hỗ trợ Đa người dùng (Multi-User):** Mỗi người dùng trên một kênh Chat khác nhau có thể theo dõi một tài khoản Jira và bộ lọc JQL / Scope hoàn toàn độc lập.
- **Tuỳ chỉnh Thông báo:**
  - Hỗ trợ đổi **Múi giờ (Timezone)** cá nhân hoá qua câu lệnh `/tz`.
  - Giới hạn **Active Hours / Quiet Hours** để không nhận thông báo vào ban đêm hay ngày nghỉ.
  - Chọn theo dõi các thay đổi tùy biến qua Scope (Assigned to Me, Created by Me, Participated, Watched) hoặc bằng một query **JQL tự do**.
- **Giao diện Menu Cài đặt Trực quan:** Hỗ trợ Inline Keyboard (Nút bấm ngay trong khung Chat) để quản lí qua lệnh `/settings`.

## 🛠 Yêu cầu hệ thống
- Node.js (Version LTS)
- MongoDB (Sử dụng lưu trữ thông tin token, cài đặt người dùng)
- Tài khoản Bot Telegram (Tạo qua [BotFather](https://t.me/BotFather))
- **(Tùy chọn)** Encryption Key (để mã hoá Jira token an toàn trong Database)

## 🚀 Hướng dẫn Cài đặt

1. **Clone project và Cài đặt thư viện:**
   ```bash
   git clone <URL>
   cd Jira-bot
   npm install
   ```

2. **Cấu hình Môi trường (.env):**
   Tạo file `.env` tại thư mục root và thêm các hằng số sau:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   MONGODB_URI=mongodb://localhost:27017/jira-bot
   ENCRYPTION_KEY=your_secure_32_byte_encryption_key # Khoá mã hóa độ dài 32 ký tự, ví dụ: 12345678901234567890123456789012
   POLL_INTERVAL=60000        # Tuỳ chọn, thời gian chênh lệch mỗi lần quét (ms). Mặc định 60 giây.
   DEBOUNCE_WINDOW=30000      # Tuỳ chọn, thời gian chờ chống nhiễu (ms). Mặc định 30 giây.
   ```

3. **Chạy Project:**

   *Chạy môi trường Phát triển (Development):*
   ```bash
   npm run dev
   ```

   *Build và chạy bản Production:*
   ```bash
   npm run build
   npm start
   ```

4. **Kiểm tra/Testing Code:**
   Project sử dụng `vitest` để viết unit tests.
   ```bash
   npm test
   ```

## 💬 Hướng dẫn Sử dụng Bot

Mở Telegram, tìm tên Bot của bạn và dùng các lệnh sau:

- `/help` - Xem hướng dẫn chi tiết cách dùng ngay trong Bot.
- `/setup <host> <email> <token> [jql]` - Lưu trữ hoặc Cập nhật thông tin đăng nhập Jira (Email & Token) của riêng bạn. Ví dụ:
  `/setup https://your-domain.atlassian.net kien@example.com my-secret-token`
- `/settings` - Mở menu cấu hình cài đặt cho phép bật/tắt (Track Status, Track Assignee, Scope lọc theo vai trò).
- `/status` - Kiểm tra trạng thái cấu hình hiện tại.
- `/tz <timezone>` - Đặt múi giờ cá nhân (Ví dụ: `/tz Asia/Ho_Chi_Minh`) để hiển thị thời gian chính xác.
- `/start` và `/stop` - Tiếp tục (Resume) hoặc Tạm dừng (Pause) quá trình nhận tin nhắn cảnh báo.
- `/jql <query>` - Ghi đè bộ lọc mặc định bằng một bộ truy vấn JQL Jira cá nhân.

## 🗄️ Cấu trúc hệ thống
- **MonitorService (`src/services/monitor.ts`):** Quản lý tiến trình quét, đối soát thay đổi đa người dùng từ Jira `changelog` qua API.
- **TelegramNotifier (`src/services/telegram.ts`):** Giao tiếp hệ thống với API Telegram; Xử lý cú pháp, cắt độ dài văn bản và format Inline Keyboards.
- **Database (`src/models/`):** Chứa Mongoose schemas lưu `User` parameters và `IssueState`.

## 📝 Thông tin khác

Dự án này sử dụng mô hình [OpenSpec](https://github.com/peterbe/openspec) cho quy trình Quản lý vòng đời và thay đổi tài liệu Requirement (Nằm ở thư mục `/openspec`).
