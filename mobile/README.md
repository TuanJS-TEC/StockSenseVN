# StockSense VN – app mobile (M14)

Ứng dụng iOS/Android viết bằng React Native, dựng bằng Expo SDK 58 (SDD §8.3). App gọi cùng REST API `/api/v1` với web, đăng nhập bằng Bearer token và dùng chung `packages/core` (quyền theo vai trò, nhãn dự báo, lịch giao dịch, nhóm mã, chuỗi tuyên bố trách nhiệm).

## Đã có

- **Đăng nhập:** `POST /auth/login` với `client: "mobile"`. Token lưu trong Keychain (iOS) hoặc Keystore (Android) qua `expo-secure-store`. Mỗi request gửi `Authorization: Bearer`.
- **Hết phiên:** token hết hạn sau 24 giờ hoặc API trả 401 (phiên bị thu hồi) thì app xóa token và quay về màn đăng nhập. Đăng xuất gọi `POST /auth/logout` trước, rồi xóa token.
- **Tổng quan:** VN-Index, HNX-Index, độ rộng 30 mã, tỷ lệ nhãn T+5, danh sách mã kèm dự báo T+2/T+5. Có tìm kiếm, lọc theo nhóm và kéo xuống để tải lại.
- **Chi tiết mã:** giá, hai thẻ dự báo T+2/T+5 kèm ngày đáo hạn, tin tức (bấm để mở bài trong trình duyệt). Mã chỉ có giá hiện thông báo "Chỉ giá".
- **Tab Thêm:** tài khoản, vai trò, đăng xuất.
- **Tab đáy:** Tổng quan, Watchlist, Portfolio, Trade Plan, Thêm. Tab mà vai trò không có quyền sẽ bị ẩn; API vẫn tự kiểm quyền.
- **Chưa làm:** Watchlist, Portfolio, Trade Plan, Journal, Chat, Thông báo. Các màn này đang là trang giữ chỗ.
- **Cùng nội dung với web:** tuyên bố trách nhiệm và thời điểm cập nhật dữ liệu giống web. Màu tăng/giảm luôn đi kèm biểu tượng. Có chế độ sáng/tối theo máy.

## Chạy thử trên điện thoại (Expo Go)

1. Ở thư mục gốc, thêm `API_BIND=0.0.0.0` vào `.env` rồi chạy `docker compose up -d` để điện thoại gọi được API ở cổng 3000.
2. Cài dependency cho app. Thư mục `mobile/` có `node_modules` riêng, không nằm trong npm workspaces.
   ```sh
   cd mobile
   npm install
   npm start
   ```
3. Cài **Expo Go** (bản từ CH Play hoặc App Store hiện hỗ trợ SDK 58) trên điện thoại, kết nối cùng Wi-Fi với máy tính, rồi quét mã QR mà `npm start` in ra.
   - Android: quét bằng nút "Scan QR code" trong Expo Go.
   - iPhone: quét bằng app Camera, rồi cho phép Expo Go truy cập **mạng cục bộ (Local Network)** khi được hỏi.
   - Lần đầu, Expo Go tải bundle khoảng 10 MB, mất 20–30 giây. Các lần sau nhanh hơn, và khi bạn lưu code thì app tự nạp lại.

App tự gọi API trên chính máy đang chạy `npm start` (cổng 3000). Nếu muốn trỏ tới máy chủ khác, chép `.env.example` thành `.env.local` và đặt `EXPO_PUBLIC_API_URL`.

Nếu app báo "Chưa kết nối được máy chủ (http://…:3000)", kiểm tra theo thứ tự:

- **Địa chỉ trong thông báo có phải IP Wi-Fi của máy tính không.** Xem IP bằng `ipconfig`, mục Wi-Fi.
  - Nếu máy có card mạng ảo như Radmin VPN, Hamachi hay VirtualBox, Expo có thể chọn nhầm IP của card đó.
  - Khi đó, chỉ định IP bằng `REACT_NATIVE_PACKAGER_HOSTNAME=<IP Wi-Fi> npm start` (Git Bash), hoặc `$env:REACT_NATIVE_PACKAGER_HOSTNAME="<IP Wi-Fi>"; npm start` (PowerShell).
  - Không dùng `--tunnel`: ở chế độ này app không tự tìm được API.
- **API đã mở ra mạng chưa.** `docker compose ps` phải hiện `0.0.0.0:3000->3000/tcp`. Nếu thấy `127.0.0.1:3000`, nghĩa là `.env` chưa có `API_BIND=0.0.0.0`.
- **Windows Firewall có chặn cổng 3000 không.**
  - Node.js (Metro, cổng 8081) thường đã được phép từ lần chạy đầu. Cổng 3000 do Docker mở thì cần thêm luật, chạy một lần trong PowerShell mở bằng **Run as administrator**:
    ```powershell
    New-NetFirewallRule -DisplayName "StockSense API 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private,Public
    ```
  - Gỡ luật khi không cần nữa: `Remove-NetFirewallRule -DisplayName "StockSense API 3000"`.
  - Nếu Wi-Fi nhà đang để Public, có thể chuyển sang Private trong Settings → Network & internet → Wi-Fi → (tên mạng) → Private network.
- **Điện thoại có cùng mạng Wi-Fi với máy tính không.** Nhiều mạng khách hoặc mạng công ty chặn các máy nói chuyện với nhau (AP isolation).
- **Kiểm tra nhanh trên điện thoại:** mở trình duyệt, vào `http://<IP Wi-Fi>:3000/api/v1/me`. Nếu thấy JSON báo lỗi đăng nhập (401) là đã thông mạng.

## Kiểm tra nhanh

```sh
npm run check:bundle   # đóng gói thật cho Android và iOS, báo lỗi import/cú pháp; kết quả ở dist/ (đã gitignore)
npx expo-doctor        # kiểm tra cấu hình và phiên bản thư viện
npm run web            # bản xem trên trình duyệt ở http://localhost:5173, chỉ để thử nhanh
```

Bản web chỉ dùng để thử nhanh. Trình duyệt không có Keychain/Keystore nên token nằm trong `sessionStorage` của tab. Cổng 5173 trùng với web chính, nên tắt `npm run dev:web` trước khi chạy. API chỉ cho phép CORS từ origin này.

## Phát hành (SDD §8.3, PRD A9)

- **Android:** tạo APK cài trực tiếp bằng EAS Build (`npx eas build -p android --profile preview`, cần tài khoản Expo miễn phí).
- **iOS:** phát hành qua TestFlight, cần tài khoản Apple Developer và build bằng EAS hoặc máy macOS.
- **Máy chủ:** bản phát hành cần API chạy HTTPS và đặt `EXPO_PUBLIC_API_URL` lúc build.
