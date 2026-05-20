import type { HealthData } from '../types';
interface Props { health: HealthData | null }

export default function StatusBar({ health }: Props) {
  if (!health) {
    return <div className="status-bar status-loading">Connecting…</div>;
  }
  return (
    <div className={`status-bar status-${health.status}`}>
      <span className={`status-dot ${health.status === 'ok' ? 'status-dot--healthy' : 'status-dot--error'}`} aria-hidden="true" />
      {health.provider.keyPresent ? 'Gemini Active' : 'Offline / Mock'}
    </div>
  );
}
