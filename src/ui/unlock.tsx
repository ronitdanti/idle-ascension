import { game } from '../app/runtime';
import type { ZoneDef } from '../content/zones';
import { D } from '../core/bignum';
import { formatEta, formatNum } from '../core/format';
import { secondsUntilTotalKi } from '../core/training';
import { Bar } from './components';

/** Progress toward a zone unlock. The bar is log-scaled so each power of ten counts the same. */
export function UnlockProgress({ zone }: { zone: ZoneDef }) {
  const s = game.state;
  const rule = zone.unlock;
  if (rule.kind === 'totalKi') {
    const frac = Math.max(0, Math.min(1, s.totalKi.max(1).log10() / D(rule.at).log10()));
    const eta = secondsUntilTotalKi(s, rule.at, game.kiPerSec);
    return (
      <>
        <Bar value={frac} accent={zone.accent} label={`${formatNum(s.totalKi, s.settings.notation)} / ${formatNum(rule.at, s.settings.notation)} total Ki`} />
        <div class="muted small">{eta > 0 ? `Estimated ${formatEta(eta)} at your current Ki/s` : 'Reached'}</div>
      </>
    );
  }
  if (rule.kind === 'flag') return <div class="muted small">{rule.hint}</div>;
  return null;
}
