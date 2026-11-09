import { useColorScheme } from 'react-native';

// Same palette as the web (apps/web/src/styles/prototype.css), light and dark.
const light = {
  bg: '#F3F5F2', surface: '#FFFFFF', surface2: '#ECEFEA', ink: '#15201B', muted: '#5A6660', line: '#DADFD8',
  accent: '#0B5D52', accentInk: '#FFFFFF', accentSoft: '#DDEDE8',
  up: '#0B8445', upSoft: '#DDF1E5', hold: '#A86B0C', holdSoft: '#FAEFD6', down: '#C9352A', downSoft: '#FBE3E0',
  neutral: '#5A6660', neutralSoft: '#ECEFEA',
};
const dark = {
  bg: '#0E1412', surface: '#151D1A', surface2: '#1C2622', ink: '#E4EBE7', muted: '#9AA8A1', line: '#28342F',
  accent: '#4CC2A6', accentInk: '#0B1714', accentSoft: '#183A33',
  up: '#3ECB7F', upSoft: '#173527', hold: '#E3AE48', holdSoft: '#3A2E15', down: '#FF6E61', downSoft: '#3E1D1A',
  neutral: '#9AA8A1', neutralSoft: '#1C2622',
};

export function useTheme() {
  const scheme = useColorScheme();
  return { dark: scheme === 'dark', c: scheme === 'dark' ? dark : light };
}
