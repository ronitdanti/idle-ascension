import { buzz, game } from '../app/runtime';
import { ui } from '../app/ui-store';
import { ZONES, zoneById, type TabId, type ZoneDef } from '../content/zones';
import { CONFIG } from '../content/config';
import { formatDuration, formatNum } from '../core/format';
import { D } from '../core/bignum';
import { Bar, Panel } from './components';
import { fluxCapSec } from '../core/state';
import { Glyph, LockIcon } from './icons';
import { KiOrb } from './KiOrb';

/** Log-scale progress toward a Ki threshold: each power of ten counts the same. */
function kiProgress(total: number, at: number): number {
  return at <= 0 ? 1 : Math.max(0, Math.min(1, total / at));
}

function thresholdOf(z: ZoneDef): string | null {
  const r = z.unlock;
  return r.kind === 'totalKi' ? D(r.at).toString() : null;
}

export function UnlockProgress({ zone }: { zone: ZoneDef }) {
  const s = game.state;
  const rule = zone.unlock;
  if (rule.kind === 'totalKi') {
    const frac = kiProgress(s.totalKi.max(1).log10(), D(rule.at).log10());
    return <Bar value={frac} accent={zone.accent} label={`${formatNum(s.totalKi, s.settings.notation)} / ${formatNum(rule.at, s.settings.notation)} total Ki`} />;
  }
  if (rule.kind === 'flag') return <div class="muted small">{rule.hint}</div>;
  return null;
}

/** Ki Flux from time away, spent on Speed Up. See DECISIONS.md for the balance reasoning. */
function ChargedMeditation() {
  const s = game.state;
  const cap = fluxCapSec(s);
  const active = game.activeSpeed;
  const pick = (level: number) => {
    game.setSpeed(level);
    buzz(10);
  };
  return (
    <Panel title="Charged Meditation" accent="var(--volt)">
      <div class="stack">
        <Bar
          value={s.fluxSec / cap}
          accent="var(--volt)"
          label={`Ki Flux ${formatDuration(s.fluxSec)} / ${formatDuration(cap)}`}
        />
        <div class="seg" role="group" aria-label="Speed Up">
          <button aria-pressed={active === 1} onClick={() => pick(1)}>
            x1
          </button>
          {CONFIG.speedLevels.map((l) => (
            <button key={l} aria-pressed={active === l} disabled={s.fluxSec <= 0} onClick={() => pick(l)}>
              x{l}
            </button>
          ))}
        </div>
        <div class="muted small">
          {active > 1
            ? `Running at x${active}. Your Flux lasts ${formatDuration(s.fluxSec / (active - 1))} at this speed.`
            : s.fluxSec > 0
              ? 'Spend Ki Flux to run the whole game faster. Higher speeds burn Flux faster.'
              : 'Time away charges Ki Flux. Spend it later to run the game faster.'}
        </div>
      </div>
    </Panel>
  );
}

export function Home() {
  const s = game.state;
  const n = s.settings.notation;
  const next = ZONES.filter((z) => !s.unlocked[z.id] && thresholdOf(z) !== null)
    .sort((a, b) => D(thresholdOf(a)!).cmp(thresholdOf(b)!))
    .slice(0, 3);
  const forge = zoneById('forge');
  const showForge = !s.unlocked.forge && s.unlocked.frontier;

  return (
    <div class="screen">
      <Panel accent="var(--ember)" watermark="気">
        <KiOrb />
        <div class="chips">
          <div class="chip">
            <div class="k">Ki / sec</div>
            <div class="v">{formatNum(game.kiPerSec, n, 1)}</div>
          </div>
          <div class="chip">
            <div class="k">Lifetime Ki</div>
            <div class="v">{formatNum(s.totalKi, n)}</div>
          </div>
        </div>
      </Panel>

      <ChargedMeditation />

      <Panel title="Unlocks in" accent="var(--gold)">
        {next.length === 0 && !showForge && <div class="muted">Everything has been found. For now.</div>}
        {next.map((z) => (
          <div class="unlock" key={z.id} style={{ '--accent': z.accent }}>
            <div class="unlock-head">
              <span class="glyph"><Glyph glyph={z.glyph} name={z.name} /></span>
              <span>{z.name}</span>
            </div>
            <div class="muted small">{z.blurb}</div>
            <UnlockProgress zone={z} />
          </div>
        ))}
        {showForge && (
          <div class="unlock" style={{ '--accent': forge.accent }}>
            <div class="unlock-head">
              <span class="glyph"><Glyph glyph={forge.glyph} name={forge.name} /></span>
              <span>{forge.name}</span>
            </div>
            <UnlockProgress zone={forge} />
          </div>
        )}
      </Panel>

      <Panel>
        <div class="muted small">
          Early build. This foundation has the engine, saving and offline progress. Drills and upgrades arrive next.
        </div>
      </Panel>
    </div>
  );
}

/** Stand-in for a zone tab: locked silhouette with its threshold, or "opens next update" once unlocked. */
export function ZoneScreen({ tab }: { tab: Exclude<TabId, 'home' | 'more'> }) {
  const zone = zoneById(tab);
  const open = !!game.state.unlocked[zone.id];
  return (
    <div class="screen" style={{ '--accent': zone.accent }}>
      <Panel accent={zone.accent} watermark={zone.glyph}>
        <div class={`zone-hero ${open ? '' : 'locked'}`}>
          <div class="big"><Glyph glyph={zone.glyph} name={zone.name} /></div>
          <h2>{zone.name}</h2>
          <div class="muted">{zone.blurb}</div>
        </div>
        {open ? (
          <div class="notice good">Unlocked. This zone gets built in an upcoming update, and your progress toward it is already counting.</div>
        ) : (
          <div class="stack">
            <div class="row" style={{ alignItems: 'center', color: 'var(--mute)', fontWeight: 800 }}>
              <LockIcon size={18} /> <span>Locked</span>
            </div>
            <UnlockProgress zone={zone} />
          </div>
        )}
      </Panel>
    </div>
  );
}

const MORE_ZONES = ['archive', 'tournament', 'spirit', 'court'];

export function More() {
  const s = game.state;
  const n = s.settings.notation;
  return (
    <div class="screen">
      <Panel title="Zones" accent="var(--violet)">
        <div class="stack">
          {MORE_ZONES.map((id) => {
            const z = zoneById(id);
            const open = !!s.unlocked[id];
            const rule = z.unlock;
            return (
              <div class={`list-row ${open ? '' : 'locked'}`} key={id} style={{ '--accent': z.accent }}>
                <span class="glyph"><Glyph glyph={z.glyph} name={z.name} /></span>
                <span style={{ flex: 1 }}>
                  {z.name}
                  <small>{open ? 'Unlocked. Coming in an upcoming update.' : rule.kind === 'totalKi' ? `Unlocks at ${formatNum(rule.at, n)} total Ki` : ''}</small>
                </span>
                {!open && <LockIcon size={18} />}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Game">
        <div class="stack">
          <button class="list-row" onClick={() => ui.set({ sheet: 'stats' })}>
            <span class="glyph">統</span>
            <span style={{ flex: 1 }}>Stats<small>Totals and play time</small></span>
          </button>
          <button class="list-row" onClick={() => ui.set({ sheet: 'settings' })}>
            <span class="glyph">設</span>
            <span style={{ flex: 1 }}>Settings<small>Display, saving, backups</small></span>
          </button>
          {s.settings.debug && (
            <button class="list-row" onClick={() => ui.set({ sheet: 'debug' })}>
              <span class="glyph">試</span>
              <span style={{ flex: 1 }}>Debug panel<small>Testing tools</small></span>
            </button>
          )}
        </div>
      </Panel>
    </div>
  );
}
