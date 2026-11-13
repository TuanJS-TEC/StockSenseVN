// FR-M14-05: web and mobile show the same disclaimer text.
export const DISCLAIMER = 'Dự báo chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.';
// Shown while forecasts come from the demo dataset (/market/status state=demo).
export const DEMO_FORECAST_NOTE = 'Dự báo đang là dữ liệu mẫu';
// Shown while forecasts come from a model under test (state=experimental): the AI_Core trend board, whose up/down
// direction part did not pass its go/no-go test.
export const EXPERIMENTAL_FORECAST_NOTE = 'Mô hình thử nghiệm: hướng Tăng/Giảm chưa được kiểm chứng';
// The note to show for a batch state, or null when the forecasts need no warning.
export const forecastStateNote = (state) => ({ demo: DEMO_FORECAST_NOTE, experimental: EXPERIMENTAL_FORECAST_NOTE })[state] ?? null;
