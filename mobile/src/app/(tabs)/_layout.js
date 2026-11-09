import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChartPie, Ellipsis, House, Star, Target } from 'lucide-react-native';
import { hasCapability } from '@stocksense/core/access';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../ui/theme';

// SDD 8.3: bottom tabs Tổng quan, Watchlist, Portfolio, Trade Plan, Thêm. Tabs a role cannot use are
// hidden, from the same capability table as the web (packages/core/access); the API still enforces them.
export default function TabsLayout() {
  const { user } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const can = (capability) => hasCapability(user?.role, capability);
  const icon = (Icon) => ({ color }) => <Icon color={color} size={22} />;

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: c.accent,
      tabBarInactiveTintColor: c.muted,
      // Default 49 px clips Vietnamese labels with diacritics under the icon; size it explicitly incl. the home-indicator inset.
      tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, height: 60 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4 },
      tabBarLabelStyle: { fontSize: 11, lineHeight: 15, minHeight: 15 },
      headerStyle: { backgroundColor: c.surface },
      headerTitleStyle: { color: c.ink },
      sceneStyle: { backgroundColor: c.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Tổng quan', tabBarIcon: icon(House) }} />
      <Tabs.Screen name="watchlist" options={{ title: 'Watchlist', tabBarIcon: icon(Star), href: can('watchlist.manage.self') ? undefined : null }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio', tabBarIcon: icon(ChartPie), href: can('portfolio.manage.self') ? undefined : null }} />
      <Tabs.Screen name="plans" options={{ title: 'Trade Plan', tabBarIcon: icon(Target), href: can('plans.manage.self') ? undefined : null }} />
      <Tabs.Screen name="more" options={{ title: 'Thêm', tabBarIcon: icon(Ellipsis) }} />
    </Tabs>
  );
}
