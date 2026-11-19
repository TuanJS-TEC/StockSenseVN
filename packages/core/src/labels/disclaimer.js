// FR-M14-05: web and mobile show the same disclaimer text.
export const DISCLAIMER = 'Dự báo chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.';
// Shown while forecasts come from the demo dataset (/market/status state=demo).
export const DEMO_FORECAST_NOTE = 'Dự báo đang là dữ liệu mẫu';
// Shown while forecasts come from a model under test (state=experimental): AI_Core's rangecast, which forecasts how far
// the price may move (volatility level and an 80% range), not which way.
export const EXPERIMENTAL_FORECAST_NOTE = 'Mô hình thử nghiệm: dự báo mức biến động và dải giá, không dự báo chiều tăng giảm';
// The note to show for a batch state, or null when the forecasts need no warning.
export const forecastStateNote = (state) => ({ demo: DEMO_FORECAST_NOTE, experimental: EXPERIMENTAL_FORECAST_NOTE })[state] ?? null;
