import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { hasCapability } from '@stocksense/core/access';
import { SYMBOL_GROUPS, inGroup } from '@stocksense/core/symbol-groups';
import { cachedGet } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Card, Change, Chip, DataStamp, Disclaimer, ErrorNote, ForecastLabel, Loading } from '../../ui/components';
import { formatMoney, formatNumber, formatPoints } from '../../ui/format';
import { useTheme } from '../../ui/theme';

// FR-M14-02 Tổng quan: same data as the web overview (/market/status, /market/summary, /symbols).
export default function OverviewScreen() {
  const { user } = useAuth();
  const { c } = useTheme();
  const router = useRouter();
  const canReadSymbols = hasCapability(user?.role, 'symbols.read');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async (refresh = false) => {
    setError('');
    try {
      const [status, summary, symbols] = await Promise.all([
        cachedGet('/market/status', { refresh }),
        cachedGet('/market/summary', { refresh }),
        canReadSymbols ? cachedGet('/symbols', { refresh }) : Promise.resolve({ items: [] }),
      ]);
      setData({ status, summary, symbols: symbols.items });
    } catch (err) {
      setError(err.message);
    }
  }, [canReadSymbols]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    return (data?.symbols ?? []).filter((item) => inGroup(item, group)
      && (!q || item.symbol.includes(q) || item.name?.toUpperCase().includes(q)));
  }, [data, group, query]);

  if (!data && !error) return <Loading text="Đang tải dữ liệu tổng quan…" />;
  if (!data) return <View style={{ padding: 16 }}><ErrorNote message={error} onRetry={() => load(true)} /></View>;

  const groups = SYMBOL_GROUPS.filter(([value]) => data.symbols.some((item) => inGroup(item, value)));
  const analysed = data.symbols.filter((item) => item.analysisEnabled !== false);
  const header = (
    <View style={{ gap: 12, paddingBottom: 8 }}>
      {error ? <ErrorNote message={error} /> : null}
      <DataStamp status={data.status} />
      <MarketStrip summary={data.summary} analysed={analysed} canReadSymbols={canReadSymbols} />
      {canReadSymbols && (
        <>
          <Text style={[styles.h2, { color: c.ink }]}>Danh sách mã</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Tìm mã hoặc tên công ty" placeholderTextColor={c.muted}
            autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Tìm mã"
            style={[styles.search, { color: c.ink, borderColor: c.line, backgroundColor: c.surface }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {groups.map(([value, label]) => (
              <Pressable key={value} onPress={() => setGroup(value)} accessibilityRole="button" accessibilityState={{ selected: group === value }}
                style={[styles.seg, { borderColor: group === value ? c.accent : c.line, backgroundColor: group === value ? c.accentSoft : c.surface }]}>
                <Text style={{ color: group === value ? c.accent : c.ink, fontWeight: '600' }}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
      {!canReadSymbols && <Text style={{ color: c.muted }}>Vai trò quản trị xem trạng thái thị trường và mô hình; danh sách mã và dự báo dành cho người dùng cuối.</Text>}
    </View>
  );

  return (
    <FlatList
      data={canReadSymbols ? rows : []}
      keyExtractor={(item) => item.symbol}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      ListHeaderComponent={header}
      ListEmptyComponent={canReadSymbols ? <Text style={{ color: c.muted }}>Không có mã khớp.</Text> : null}
      ListFooterComponent={<View style={{ marginTop: 8 }}><Text style={{ color: c.muted, fontSize: 12, marginBottom: 8 }}>Hiển thị {rows.length}/{data.symbols.length} mã · Kéo xuống để tải lại</Text><Disclaimer /></View>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => <SymbolRow item={item} onPress={() => router.push(`/symbol/${item.symbol}`)} />}
    />
  );
}

function MarketStrip({ summary, analysed, canReadSymbols }) {
  const { c } = useTheme();
  const breadth = summary.breadth;
  const count = (label) => analysed.filter((item) => item.forecasts?.t5?.label === label).length;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {['VNINDEX', 'HNX'].map((code) => {
          const item = summary.indices.find((index) => index.code === code);
          return (
            <Card key={code} style={{ flex: 1 }}>
              <Text style={{ color: c.muted, fontSize: 12 }}>{item?.label ?? code}</Text>
              <Text style={[styles.big, { color: c.ink }]}>{item ? formatNumber(item.value) : '—'}</Text>
              {item && <Change value={item.changePoints} size={12}>{`${formatPoints(item.changePoints)} (${item.changePercent.toFixed(2).replace('.', ',')}%)`}</Change>}
            </Card>
          );
        })}
      </View>
      <Card>
        <Text style={{ color: c.muted, fontSize: 12 }}>Độ rộng ({breadth.total} mã theo dõi): tăng · đứng · giảm</Text>
        <Text style={[styles.mid, { color: c.ink }]}>
          <Text style={{ color: c.up }}>▲ {breadth.advances}</Text> · <Text style={{ color: c.hold }}>● {breadth.nochanges}</Text> · <Text style={{ color: c.down }}>▼ {breadth.declines}</Text>
        </Text>
        <Bar parts={[[breadth.advances, c.up], [breadth.nochanges, c.hold], [breadth.declines, c.down]]} />
        {canReadSymbols && (
          <>
            <Text style={{ color: c.muted, fontSize: 12, marginTop: 12 }}>Tỷ lệ nhãn T+5 ({analysed.length} mã có dự báo)</Text>
            <Text style={[styles.mid, { color: c.ink }]}>
              <Text style={{ color: c.up }}>▲ {count('up')}</Text> · <Text style={{ color: c.hold }}>● {count('hold')}</Text> · <Text style={{ color: c.down }}>▼ {count('down')}</Text>
            </Text>
            <Bar parts={[[count('up'), c.up], [count('hold'), c.hold], [count('down'), c.down]]} />
          </>
        )}
      </Card>
    </View>
  );
}

function Bar({ parts }) {
  const { c } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: c.surface2 }]}>
      {parts.map(([value, color], i) => <View key={i} style={{ flex: value, backgroundColor: color }} />)}
    </View>
  );
}

function SymbolRow({ item, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Xem chi tiết ${item.symbol}`}
      style={({ pressed }) => [styles.rowCard, { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line }]}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ color: c.ink, fontWeight: '800', fontSize: 16 }}>{item.symbol}</Text>
          <Text style={{ color: c.muted, fontSize: 12 }} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: c.ink, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatMoney(item.closePrice)}</Text>
          <Change value={item.changePercent} size={12} />
        </View>
      </View>
      {item.analysisEnabled === false ? (
        <View style={[styles.rowBottom, { borderTopColor: c.line }]}>
          <Chip>Chỉ giá</Chip>
          <Text style={{ color: c.muted, fontSize: 12, marginLeft: 8 }}>Chưa phân tích</Text>
        </View>
      ) : (
        <View style={[styles.rowBottom, { borderTopColor: c.line, gap: 14 }]}>
          <View style={styles.horizon}><Text style={[styles.hz, { color: c.muted }]}>T+2</Text><ForecastLabel forecast={item.forecasts?.t2} size={12} /></View>
          <View style={styles.horizon}><Text style={[styles.hz, { color: c.muted }]}>T+5</Text><ForecastLabel forecast={item.forecasts?.t5} size={12} /></View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 17, fontWeight: '800', marginTop: 6 },
  big: { fontSize: 20, fontWeight: '800', marginVertical: 2, fontVariant: ['tabular-nums'] },
  mid: { fontSize: 16, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  search: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  seg: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7 },
  rowCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8 },
  horizon: { flexDirection: 'row', alignItems: 'center' },
  hz: { fontSize: 11, fontWeight: '700', marginRight: 6 },
});
