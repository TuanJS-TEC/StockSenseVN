import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { Button, Loading } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Screens behind login are only reachable with a valid session (FR-M14-04); the rest of the app
// is the same REST API and role checks as the web (FR-M14-01).
function Gate() {
  const { status, message, retry } = useAuth();
  const { c, dark } = useTheme();

  if (status === 'loading') return <><StatusBar style={dark ? 'light' : 'dark'} /><Loading text="Đang kiểm tra phiên đăng nhập…" /></>;
  if (status === 'offline') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 24, gap: 14 }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Text style={{ color: c.ink, fontSize: 18, fontWeight: '700' }}>Chưa kết nối được máy chủ</Text>
        <Text style={{ color: c.muted }}>{message}</Text>
        <Button title="Thử lại" onPress={retry} />
      </View>
    );
  }

  const signedIn = status === 'signedIn';
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.accent,
        headerTitleStyle: { color: c.ink },
        contentStyle: { backgroundColor: c.bg },
        headerBackTitle: 'Quay lại',
      }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="symbol/[symbol]" options={{ title: '' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
