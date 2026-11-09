import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { addTradingDays } from '@stocksense/core/calendar';
import { NOT_ANALYSED } from '@stocksense/core/symbol-groups';
import { cachedGet } from '../../api/client';
import { Card, Change, Chip, DataStamp, Disclaimer, ErrorNote, ForecastCard, Loading } from '../../ui/components';
import { formatDateTime, formatDay, formatMoney } from '../../ui/format';
import { useTheme } from '../../ui/theme';

const SENTIMENT = { positive: ['Tích cực', 'up'], negative: ['Tiêu cực', 'down'], neutral: ['Trung lập', 'neutral'] };

// FR-M14-02 chi tiết mã: forecast cards first (NFR-17: /symbols/{sym} and /market/status, both cached),
// news loads after and never blocks the forecast.
export default function SymbolScreen() {
  const { symbol: raw } = useLocalSearchParams();
  const symbol = String(raw ?? '').toUpperCase();
  const { c } = useTheme();
  const [data, setData] = useState(null);
  const [news, setNews] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setError('');
    try {
      const [status, detail] = await Promise.all([
        cachedGet('/market/status', { refresh }),
        cachedGet(`/symbols/${encodeURIComponent(symbol)}`, { refresh }),
      ]);
      setData({ status, detail });
      if (detail.analysisEnabled !== false) {
        cachedGet(`/symbols/${encodeURIComponent(symbol)}/news`, { refresh })
          .then((result) => setNews(result.items ?? []))
          .catch(() => setNews([]));
      }
    } catch (err) {
      setError(err.message);
    }
  }, [symbol]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const title = <Stack.Screen options={{ title: symbol }} />;
  if (!data && !error) return <>{title}<Loading text={`Đang tải ${symbol}…`} /></>;
  if (!data) return <>{title}<View style={{ padding: 16 }}><ErrorNote message={error} onRetry={() => load(true)} /></View></>;

  const { status, detail } = data;
  const t2 = detail.forecasts?.t2;
  const t5 = detail.forecasts?.t5;
  const conflict = t2?.label && t5?.label && ((t2.label === 'up' && t5.label === 'down') || (t2.label === 'down' && t5.label === 'up'));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />}>
      {title}
      {error ? <ErrorNote message={error} /> : null}
      <Card>
        <Text style={{ color: c.ink, fontSize: 22, fontWeight: '800' }}>{detail.symbol}</Text>
        <Text style={{ color: c.muted }}>{detail.name}</Text>
        <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{[detail.exchange, detail.industry, ...(detail.indices ?? [])].filter(Boolean).join(' · ')}</Text>
        <View style={styles.priceRow}>
          <Text style={{ color: c.ink, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{formatMoney(detail.closePrice)}</Text>
          <Change value={detail.changePercent} size={15} />
        </View>
        <Text style={{ color: c.muted, fontSize: 12 }}>Giá đóng cửa phiên {formatDay(detail.priceDate)} (đồng)</Text>
        {detail.dataFlags?.stalePrice && <View style={{ marginTop: 8, flexDirection: 'row' }}><Chip tone="hold">Giá chưa cập nhật phiên mới nhất</Chip></View>}
      </Card>

      {detail.analysisEnabled === false ? (
        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row' }}><Chip>Chỉ giá</Chip></View>
          <Text style={{ color: c.ink }}>{NOT_ANALYSED}.</Text>
          <Text style={{ color: c.muted, fontSize: 12 }}>Mã này chỉ có giá để tham khảo, không có dự báo, giải thích hay tin tức.</Text>
        </Card>
      ) : (
        <>
          <View style={styles.sectionHead}>
            <Text style={[styles.h2, { color: c.ink }]}>Dự báo xu hướng</Text>
            {conflict && <Chip tone="hold">T+2 và T+5 ngược chiều</Chip>}
          </View>
          <View style={styles.cards}>
            <ForecastCard horizon="t2" forecast={t2} dueDate={addTradingDays(status.dataDate, 2, status.holidays)} />
            <ForecastCard horizon="t5" forecast={t5} dueDate={addTradingDays(status.dataDate, 5, status.holidays)} />
          </View>
          <DataStamp status={status} />

          <Card style={{ gap: 4 }}>
            <Text style={[styles.h3, { color: c.ink }]}>Giải thích dự báo</Text>
            <Text style={{ color: c.muted }}>Sẽ có khi mô hình AI sẵn sàng; hiện web cũng đang ở trạng thái “Sắp có”.</Text>
          </Card>

          <Text style={[styles.h2, { color: c.ink }]}>Tin tức</Text>
          {news === null && <Text style={{ color: c.muted }}>Đang tải tin…</Text>}
          {news?.length === 0 && <Text style={{ color: c.muted }}>Chưa có tin cho mã này.</Text>}
          {news?.slice(0, 15).map((item) => {
            const [sentimentText, tone] = SENTIMENT[item.sentiment] ?? [null, 'neutral'];
            return (
              <Pressable key={item.id} onPress={() => item.url && Linking.openURL(item.url)} accessibilityRole="link"
                style={({ pressed }) => [styles.news, { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line }]}>
                <Text style={{ color: c.ink, fontWeight: '700' }}>{item.title}</Text>
                <View style={[styles.newsMeta]}>
                  <Text style={{ color: c.muted, fontSize: 12 }}>{item.source} · {formatDateTime(item.publishedAt)}</Text>
                  {sentimentText && <Chip tone={tone}>{sentimentText}</Chip>}
                </View>
              </Pressable>
            );
          })}
        </>
      )}
      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  h2: { fontSize: 17, fontWeight: '800' },
  h3: { fontSize: 15, fontWeight: '700' },
  news: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, gap: 6 },
  newsMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
});
