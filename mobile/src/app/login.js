import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../api/config';
import { useAuth } from '../auth/AuthContext';
import { Button, Disclaimer } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function LoginScreen() {
  const { login, message } = useAuth();
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.trim() || !password) { setError('Nhập email và mật khẩu.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const input = [styles.input, { color: c.ink, borderColor: c.line, backgroundColor: c.surface }];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={[styles.row, { gap: 10 }]}>
            <Text style={[styles.mark, { backgroundColor: c.accent, color: c.accentInk }]}>SS</Text>
            <Text style={{ color: c.ink, fontSize: 20, fontWeight: '800' }}>StockSense VN</Text>
          </View>
          <Text style={{ color: c.muted, marginTop: 8, marginBottom: 24 }}>Dự báo xu hướng T+2 và T+5, cập nhật mỗi ngày sau phiên.</Text>

          <Text style={[styles.label, { color: c.ink }]}>Email</Text>
          <TextInput style={input} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
            keyboardType="email-address" textContentType="username" placeholder="ban@vidu.vn" placeholderTextColor={c.muted}
            accessibilityLabel="Email" returnKeyType="next" />
          <Text style={[styles.label, { color: c.ink }]}>Mật khẩu</Text>
          <TextInput style={input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password"
            textContentType="password" accessibilityLabel="Mật khẩu" returnKeyType="go" onSubmitEditing={submit} />

          {(error || message) ? (
            <Text accessibilityRole="alert" style={[styles.note, { color: error ? c.down : c.hold, backgroundColor: error ? c.downSoft : c.holdSoft }]}>
              {error || message}
            </Text>
          ) : null}
          <View style={{ marginTop: 18 }}>
            <Button title={submitting ? 'Đang đăng nhập…' : 'Đăng nhập'} onPress={submit} disabled={submitting} />
          </View>
          <Text style={{ color: c.muted, fontSize: 12, marginTop: 14 }}>
            Chưa có tài khoản hoặc quên mật khẩu? Đăng ký và đặt lại mật khẩu trên web.
          </Text>

          <View style={{ marginTop: 28 }}><Disclaimer /></View>
          <Text style={{ color: c.muted, fontSize: 11, marginTop: 8 }}>Máy chủ: {API_URL}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 48, maxWidth: 480, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  mark: { fontWeight: '900', fontSize: 15, width: 36, height: 36, lineHeight: 36, textAlign: 'center', borderRadius: 9, overflow: 'hidden' },
  label: { fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  note: { marginTop: 14, padding: 10, borderRadius: 8, overflow: 'hidden' },
});
