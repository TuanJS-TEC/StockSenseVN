import { DISCLAIMER } from '@stocksense/core/disclaimer';
// App icons come from Lucide (lucide-react, ISC licence); names below are the ones used across the app.
import {
  ArrowDown, ArrowLeft, ArrowUp, Bell, BookOpen, ChartColumn, ChartPie, ChevronDown, ChevronUp, Download, Ellipsis,
  FileText, Funnel, Gauge, House, Info, MessageSquare, Minus, Plus, Search, Settings, ShieldCheck, Star, Table2, Target,
  TrendingDown, TrendingUp, X,
} from 'lucide-react';

const ICONS = {
  home: House, chart: ChartColumn, board: Table2, filter: Funnel, star: Star, pie: ChartPie, target: Target,
  book: BookOpen, chat: MessageSquare, gauge: Gauge, shield: ShieldCheck, gear: Settings, bell: Bell, info: Info,
  plus: Plus, pdf: FileText, dl: Download, more: Ellipsis, search: Search, close: X, back: ArrowLeft,
  'sort-asc': ChevronUp, 'sort-desc': ChevronDown, 'index-up': ArrowUp, 'index-down': ArrowDown,
  // Forecast labels.
  up: TrendingUp, hold: Minus, down: TrendingDown,
};

export function Icon({ name, className = '', filled = false }) {
  const Component = ICONS[name];
  if (!Component) return null;
  return <Component className={`ic ${filled ? 'ic-filled' : ''} ${className}`.trim()} aria-hidden="true" focusable="false" />;
}

// Disclaimer strip used under forecast-related content (prototype `.disc`).
export function Disclaimer({ children = DISCLAIMER }) {
  return <div className="disc"><Icon name="info" /><span>{children}</span></div>;
}
