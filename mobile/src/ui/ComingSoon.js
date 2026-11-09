import { ScrollView, Text } from 'react-native';
import { Card, Disclaimer } from './components';
import { useTheme } from './theme';

// Placeholder for core screens planned for the next mobile steps (FR-M14-02); they already work on the web.
export function ComingSoon({ title, children }) {
  const { c } = useTheme();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card style={{ gap: 6 }}>
        <Text style={{ color: c.ink, fontSize: 17, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: c.muted }}>{children}</Text>
        <Text style={{ color: c.muted, fontSize: 12 }}>Màn hình này sẽ có trong app ở bước tiếp theo; hiện bạn dùng được trên web với cùng tài khoản.</Text>
      </Card>
      <Disclaimer />
    </ScrollView>
  );
}
