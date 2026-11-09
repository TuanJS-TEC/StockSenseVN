import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { ROLE_LABELS } from '@stocksense/core/access';
import { API_URL } from '../../api/config';
import { useAuth } from '../../auth/AuthContext';
import { Button, Card, Disclaimer } from '../../ui/components';
import { useTheme } from '../../ui/theme';

// SDD 8.3 "Thêm": account, logout, and the screens planned next (Journal, Chat, Thông báo, Cài đặt).
export default function MoreScreen() {
  const { user, logout } = useAuth();
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await logout();
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card style={{ gap: 4 }}>
        <Text style={{ color: c.muted, fontSize: 12 }}>Tài khoản</Text>
        <Text style={{ color: c.ink, fontSize: 16, fontWeight: '700' }}>{user?.full_name || user?.email}</Text>
        {user?.full_name ? <Text style={{ color: c.muted }}>{user.email}</Text> : null}
        <Text style={{ color: c.accent, fontWeight: '600' }}>{ROLE_LABELS[user?.role] ?? user?.role}</Text>
      </Card>

      <Card style={{ gap: 2 }}>
        <Text style={[styles.h3, { color: c.ink }]}>Sắp có trong app</Text>
        {['Journal', 'Chat hỏi đáp', 'Thông báo', 'Cài đặt và kênh nhận thông báo'].map((item) => (
          <View key={item} style={[styles.item, { borderTopColor: c.line }]}><Text style={{ color: c.muted }}>{item}</Text></View>
        ))}
      </Card>

      <Button title={busy ? 'Đang đăng xuất…' : 'Đăng xuất'} variant="ghost" onPress={signOut} disabled={busy} />
      <Disclaimer />
      <Text style={{ color: c.muted, fontSize: 11 }}>Phiên bản {Constants.expoConfig?.version} · Máy chủ {API_URL}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h3: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  item: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
});
