import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDown, ArrowUp, Info, Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { getForecastLabel } from '@stocksense/core/labels';
import { DEMO_FORECAST_NOTE, DISCLAIMER } from '@stocksense/core/disclaimer';
import { useTheme } from './theme';
import { formatChange, formatDay, formatPercent } from './format';

const TONE_ICON = { up: TrendingUp, hold: Minus, down: TrendingDown };
const CONFIDENCE = { low: [1, 'Thấp'], mid: [2, 'Trung bình'], high: [3, 'Cao'] };

// Forecast label = icon + text + color (NFR-10), same words as the web (Tăng / Đi ngang / Giảm).
export function ForecastLabel({ forecast, size = 13, showPercent = true }) {
  const { c } = useTheme();
  if (!forecast?.label) return <Text style={{ color: c.muted, fontSize: size }}>—</Text>;
  const label = getForecastLabel(forecast.label);
  const Icon = TONE_ICON[label.tone] ?? Minus;
  const color = c[label.tone] ?? c.muted;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label.text} ${formatPercent(forecast.probabilities?.[forecast.label])}`}>
      <Icon size={size + 2} color={color} strokeWidth={2.4} />
      <Text style={{ color, fontSize: size, fontWeight: '700', marginLeft: 4 }}>{label.text}</Text>
      {showPercent && <Text style={{ color: c.muted, fontSize: size, marginLeft: 4, fontVariant: ['tabular-nums'] }}>{formatPercent(forecast.probabilities?.[forecast.label])}</Text>}
    </View>
  );
}

// Price change with an arrow so it does not rely on color alone.
export function Change({ value, size = 13, children }) {
  const { c } = useTheme();
  const tone = value > 0 ? 'up' : value < 0 ? 'down' : 'hold';
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
  return (
    <View style={styles.row}>
      <Icon size={size} color={c[tone]} strokeWidth={2.4} />
      <Text style={{ color: c[tone], fontSize: size, fontWeight: '600', marginLeft: 2, fontVariant: ['tabular-nums'] }}>{children ?? formatChange(value)}</Text>
    </View>
  );
}

export function Confidence({ level }) {
  const { c } = useTheme();
  const [lv, text] = CONFIDENCE[level] ?? [0, 'Chưa có'];
  return (
    <View style={styles.row} accessible accessibilityLabel={`Mức tin cậy ${text}`}>
      {[1, 2, 3].map((i) => <View key={i} style={[styles.confDot, { backgroundColor: i <= lv ? c.accent : c.line }]} />)}
      <Text style={{ color: c.muted, fontSize: 12, marginLeft: 6 }}>Tin cậy: {text}</Text>
    </View>
  );
}

// Same content as the web ForecastCard: horizon, due date, top label, probability bar, confidence.
export function ForecastCard({ horizon, forecast, dueDate }) {
  const { c } = useTheme();
  const p = forecast?.probabilities ?? {};
  const top = forecast?.label ? p[forecast.label] : null;
  return (
    <View style={[styles.card, styles.fc, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text style={[styles.horizon, { color: c.accent, backgroundColor: c.accentSoft }]} numberOfLines={1}>{horizon === 't2' ? 'T+2' : 'T+5'}</Text>
        <Text style={{ color: c.muted, fontSize: 12, flexShrink: 1, marginLeft: 8, textAlign: 'right' }}>Đáo hạn {formatDay(dueDate)}</Text>
      </View>
      <View style={{ marginTop: 10 }}><ForecastLabel forecast={forecast} size={18} /></View>
      <View style={[styles.pbar, { backgroundColor: c.surface2 }]}
        accessible accessibilityLabel={`Tăng ${formatPercent(p.up)}, Đi ngang ${formatPercent(p.hold)}, Giảm ${formatPercent(p.down)}`}>
        <View style={{ flex: p.up ?? 0, backgroundColor: c.up }} />
        <View style={{ flex: p.hold ?? 0, backgroundColor: c.hold }} />
        <View style={{ flex: p.down ?? 0, backgroundColor: c.down }} />
      </View>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        {['up', 'hold', 'down'].map((key) => {
          const Icon = TONE_ICON[key];
          return (
            <View key={key} style={styles.row}>
              <Icon size={13} color={c[key]} strokeWidth={2.4} />
              <Text style={{ color: c[key], fontSize: 12, marginLeft: 3, fontVariant: ['tabular-nums'] }}>{formatPercent(p[key])}</Text>
            </View>
          );
        })}
      </View>
      <View style={[styles.row, { marginTop: 10, flexWrap: 'wrap', gap: 6 }]}>
        <Confidence level={forecast?.confidence} />
        {top != null && top < 0.45 && <Chip tone="hold">Độ tin cậy thấp</Chip>}
      </View>
    </View>
  );
}

export function Chip({ tone = 'neutral', children }) {
  const { c } = useTheme();
  return <Text style={[styles.chip, { color: c[tone] ?? c.muted, backgroundColor: c[`${tone}Soft`] ?? c.surface2 }]}>{children}</Text>;
}

// FR-M14-05: same disclaimer string as the web (packages/core/src/labels/disclaimer.js).
export function Disclaimer({ children = DISCLAIMER }) {
  const { c } = useTheme();
  return (
    <View style={[styles.row, styles.disclaimer, { borderColor: c.line }]}>
      <Info size={14} color={c.muted} />
      <Text style={{ color: c.muted, fontSize: 12, marginLeft: 6, flex: 1 }}>{children}</Text>
    </View>
  );
}

// FR-M14-05: when the data was last updated, from /market/status.
export function DataStamp({ status }) {
  const { c } = useTheme();
  if (!status) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.muted, fontSize: 12 }}>
        Giá đến phiên {formatDay(status.latestPriceDate)} · Dự báo tính cho phiên {formatDay(status.dataDate)}
      </Text>
      {status.state === 'demo' && <View style={{ flexDirection: 'row' }}><Chip tone="hold">{DEMO_FORECAST_NOTE}</Chip></View>}
    </View>
  );
}

export function Card({ children, style }) {
  const { c } = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

export function Loading({ text = 'Đang tải…' }) {
  const { c } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: c.bg }]}>
      <ActivityIndicator color={c.accent} />
      <Text style={{ color: c.muted, marginTop: 10 }}>{text}</Text>
    </View>
  );
}

export function ErrorNote({ message, onRetry }) {
  const { c } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.downSoft, borderColor: c.downSoft, gap: 10 }]} accessibilityRole="alert">
      <Text style={{ color: c.down }}>{message}</Text>
      {onRetry && <Button title="Thử lại" variant="ghost" onPress={onRetry} />}
    </View>
  );
}

export function Button({ title, onPress, disabled, variant = 'primary' }) {
  const { c } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [styles.button, {
        backgroundColor: primary ? c.accent : 'transparent', borderColor: c.accent, opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      }]}>
      <Text style={{ color: primary ? c.accentInk : c.accent, fontWeight: '700', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14 },
  fc: { flex: 1, minWidth: 150 },
  horizon: { flexShrink: 0, fontWeight: '800', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  pbar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 10 },
  confDot: { width: 7, height: 7, borderRadius: 4, marginRight: 3 },
  chip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, overflow: 'hidden' },
  disclaimer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 4, alignItems: 'flex-start' },
  button: { minHeight: 46, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
