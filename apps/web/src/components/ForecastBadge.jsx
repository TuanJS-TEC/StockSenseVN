import { getForecastLabel } from '@stocksense/core/labels';
import { Icon } from '../app/icons.jsx';

export function ForecastBadge({ label }) {
  const forecast = getForecastLabel(label);
  return <span className={`chip ${forecast.tone}`}><Icon name={forecast.tone} />{forecast.text}</span>;
}
