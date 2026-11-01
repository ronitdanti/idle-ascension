import { game } from '../app/runtime';
import { ui, useUi } from '../app/ui-store';
import { zoneById, type TabId } from '../content/zones';
import { formatEta, formatNum } from '../core/format';
import { secondsUntilTotalKi } from '../core/training';
import { buyableTechCount, discoveriesReady } from '../core/archive';
import { ArchiveScreen } from './archive';
import { Panel } from './components';
import { DojoScreen } from './dojo';
import { Glyph, LockIcon } from './icons';
import { HeroScene } from './HeroScene';
import { TrainingGrounds } from './train';
import { UnlockProgress } from './unlock';

export function Home() {
  const s = game.state;
  const n = s.settings.notation;
  const speed = game.activeSpeed;
  return (
    <div class="screen">
      <Panel accent="var(--ember)">
        <HeroScene />
        <div class="chips">
          <div class="chip">
            <div class="k">Ki / sec</div>
            <div class="v">{formatNum(game.kiPerSec, n, 1)}</div>
          </div>
          <div class="chip">
            <div class="k">Lifetime Ki</div>
            <div class="v">{formatNum(s.totalKi, n)}</div>
          </div>
          {speed > 1 && (
            <div class="chip" style={{ borderColor: 'var(--volt)' }}>
              <div class="k" style={{ color: 'var(--volt)' }}>Speed Up</div>
              <div class="v">x{speed}</div>
            </div>
          )}
        </div>
      </Panel>
      <TrainingGrounds />
    </div>
  );
}

/** Stand-in for a zone tab: locked silhouette with its threshold, or "opens next update" once unlocked. */
export function ZoneScreen({ tab }: { tab: Exclude<TabId, 'home' | 'more'> }) {
  const zone = zoneById(tab);
  const open = !!game.state.unlocked[zone.id];
  if (tab === 'dojo' && open) return <DojoScreen />;
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
  const { moreView } = useUi();
  const s = game.state;
  const n = s.settings.notation;
  if (moreView === 'archive' && s.unlocked.archive) return <ArchiveScreen />;
  return (
    <div class="screen">
      <Panel title="Zones" accent="var(--violet)">
        <div class="stack">
          {MORE_ZONES.map((id) => {
            const z = zoneById(id);
            const open = !!s.unlocked[id];
            const rule = z.unlock;
            const built = id === 'archive';
            const badge = built && (buyableTechCount(s) > 0 || discoveriesReady(s).length > 0);
            const body = (
              <>
                <span class="glyph"><Glyph glyph={z.glyph} name={z.name} /></span>
                <span style={{ flex: 1 }}>
                  {z.name}
                  <small>
                    {built && open
                      ? discoveriesReady(s).length > 0
                        ? 'A new scroll is waiting'
                        : 'Technique Tree, scrolls and respec'
                      : open
                        ? 'Unlocked. Coming in an upcoming update.'
                        : rule.kind === 'totalKi'
                          ? `Unlocks at ${formatNum(rule.at, n)} total Ki, estimated ${formatEta(secondsUntilTotalKi(s, rule.at, game.kiPerSec))}`
                          : ''}
                  </small>
                </span>
                {!open && <LockIcon size={18} />}
                {badge && <i class="dot-ready" style={{ position: 'static' }} aria-label="something to do" />}
              </>
            );
            return built && open ? (
              <button class="list-row" key={id} style={{ '--accent': z.accent }} onClick={() => ui.set({ moreView: 'archive' })}>
                {body}
              </button>
            ) : (
              <div class={`list-row ${open ? '' : 'locked'}`} key={id} style={{ '--accent': z.accent }}>
                {body}
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
