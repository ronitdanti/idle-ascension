import { useEffect, useRef } from 'preact/hooks';
import { buzz, game, saveNow } from '../app/runtime';
import { fx, ui, useUi } from '../app/ui-store';
import { DRILLS, type DrillDef } from '../content/drills';
import { UPGRADES, type UpgradeDef } from '../content/upgrades';
import { ZONES, zoneById } from '../content/zones';
import { D } from '../core/bignum';
import { formatDuration, formatNum } from '../core/format';
import { autoCanUpgrade, autoIntervalSec, autoLevel, autoModes, effectiveMode } from '../core/auto';
import type { AutoMode, BuyAmount } from '../core/state';
import { speedLevels } from '../core/techniques';
import {
  affordableUpgradeCount,
  breakdown,
  buyDrill,
  buyQuote,
  buyUpgrade,
  drillVisible,
  fluxCapSec,
  milestoneAt,
  milestoneMultiplier,
  milestonesReached,
  nextMilestone,
  owned,
  smartSpend,
  upgradeAffordable,
  upgradeAvailable,
  type DrillLine,
} from '../core/training';
import { Bar, Panel, Segmented, Toggle } from './components';
import { Glyph } from './icons';
import { UnlockProgress } from './unlock';

/** Press once to act, hold to repeat. Keyboard activation still works through click. */
export function useHold(action: () => void) {
  const fn = useRef(action);
  fn.current = action;
  const timers = useRef<{ t?: number; i?: number }>({});
  const stop = () => {
    clearTimeout(timers.current.t);
    clearInterval(timers.current.i);
    timers.current = {};
  };
  useEffect(() => stop, []);
  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      fn.current();
      stop();
      timers.current.t = window.setTimeout(() => {
        timers.current.i = window.setInterval(() => fn.current(), 90);
      }, 420);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn.current();
      }
    },
    onContextMenu: (e: Event) => e.preventDefault(),
  };
}

const AMOUNTS: Array<{ id: string; label: string }> = [
  { id: '1', label: 'x1' },
  { id: '10', label: 'x10' },
  { id: '100', label: 'x100' },
  { id: 'max', label: 'Max' },
];

function DrillRow({ d, index, line }: { d: DrillDef; index: number; line: DrillLine }) {
  const s = game.state;
  const n = s.settings.notation;
  const amount = s.settings.buyAmount;
  const have = owned(s, d.id);
  const q = buyQuote(s, d.id, amount);
  const next = nextMilestone(have);
  const prevAt = milestonesReached(have) === 0 ? 0 : milestoneAt(milestonesReached(have) - 1);
  const hold = useHold(() => {
    const r = buyDrill(game.state, d.id, game.state.settings.buyAmount);
    if (r.bought > 0) {
      buzz(8);
      if (r.milestones > 0) {
        fx.burst();
        const after = owned(game.state, d.id);
        const gain = milestoneMultiplier(after).div(milestoneMultiplier(after - r.bought));
        ui.toast(`${d.name} x${formatNum(gain, 'scientific')}!`, '倍', d.accent);
        buzz(30);
      }
    }
  });
  const label = amount === 'max' ? `Max (${q.count})` : `x${q.count}`;
  return (
    <div class={`drill ${q.affordable ? 'can' : ''}`} style={{ '--accent': d.accent }}>
      <div class="drill-tier" aria-hidden="true">{index + 1}</div>
      <div class="drill-main">
        <div class="drill-top">
          <b>{d.name}</b>
          <span class="muted"> x{formatNum(have, n)}</span>
        </div>
        <div class="drill-rate">
          {have > 0 ? (
            <>
              <b>{formatNum(line.perSec, n, 1)}</b> Ki/s
              {line.milestones > 0 && <span class="muted small"> · x{formatNum(line.milestoneMult, n)} milestones</span>}
            </>
          ) : (
            <span class="muted">{d.blurb}</span>
          )}
        </div>
        <div class="drill-next">
          <Bar
            value={next.at === prevAt ? 1 : (have - prevAt) / (next.at - prevAt)}
            accent={d.accent}
            label={`Next x${next.mult} at ${formatNum(next.at, n)}`}
          />
        </div>
      </div>
      <button class="btn buy" disabled={!q.affordable} {...hold} aria-label={`Buy ${label} ${d.name} for ${formatNum(q.cost, n)} Ki`}>
        <span>{label}</span>
        <small>{formatNum(q.cost, n)}</small>
      </button>
    </div>
  );
}

function TrainTab() {
  const s = game.state;
  const bd = breakdown(s);
  const lines = new Map(bd.drills.map((l) => [l.id, l]));
  const spend = () => {
    const n = smartSpend(game.state);
    buzz(n ? 20 : 5);
    ui.toast(n ? `Smart Spend: ${n} purchase${n === 1 ? '' : 's'}` : 'Nothing affordable yet', '賢', 'var(--gold)');
    saveNow();
  };
  const hidden = DRILLS.filter((d) => !drillVisible(s, d));
  return (
    <div class="stack" style={{ gap: 12 }}>
      <div class="row" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 190 }}>
          <Segmented
            value={String(s.settings.buyAmount)}
            options={AMOUNTS}
            onChange={(v) => {
              s.settings.buyAmount = (v === 'max' ? 'max' : Number(v)) as BuyAmount;
              saveNow();
            }}
          />
        </div>
        <button class="btn ghost" onClick={spend}>Smart Spend</button>
        <button class="icon-btn" onClick={() => ui.set({ sheet: 'smartInfo' })} aria-label="What does Smart Spend do?">
          <span style={{ fontWeight: 900, fontSize: '1.125rem' }}>i</span>
        </button>
      </div>
      {DRILLS.filter((d) => drillVisible(s, d)).map((d) => (
        <DrillRow key={d.id} d={d} index={DRILLS.indexOf(d)} line={lines.get(d.id)!} />
      ))}
      {hidden.length > 0 && (
        <div class="muted small" style={{ textAlign: 'center' }}>
          {hidden.length} more drill{hidden.length === 1 ? '' : 's'} to discover. Keep training.
        </div>
      )}
    </div>
  );
}

function UpgradeCard({ u }: { u: UpgradeDef }) {
  const s = game.state;
  const n = s.settings.notation;
  const can = upgradeAffordable(s, u);
  return (
    <div class={`upgrade ${can ? 'can' : ''}`}>
      <div class="upgrade-main">
        <b>{u.name}</b>
        <div class="muted small">{u.blurb}</div>
      </div>
      <button
        class="btn buy"
        disabled={!can}
        onClick={() => {
          if (buyUpgrade(game.state, u.id)) {
            buzz(20);
            saveNow();
          }
        }}
        aria-label={`Buy ${u.name} for ${formatNum(u.cost, n)} Ki`}
      >
        <span>Buy</span>
        <small>{formatNum(u.cost, n)}</small>
      </button>
    </div>
  );
}

function UpgradesTab() {
  const s = game.state;
  const avail = UPGRADES.filter((u) => upgradeAvailable(s, u)).sort((a, b) => D(a.cost).cmp(b.cost));
  const bought = UPGRADES.filter((u) => s.upgrades[u.id]).length;
  return (
    <div class="stack" style={{ gap: 10 }}>
      {avail.length === 0 && <div class="notice">No upgrades to buy right now. New ones appear as you train more.</div>}
      {avail.map((u) => (
        <UpgradeCard key={u.id} u={u} />
      ))}
      <div class="muted small" style={{ textAlign: 'center' }}>
        {bought} of {UPGRADES.length} upgrades owned. More are revealed as your drills and Ki grow.
      </div>
    </div>
  );
}

const MODE_LABELS: Record<AutoMode, string> = { cheapest: 'Cheapest', value: 'Best value', deepest: 'Top tier', even: 'Even' };
const MODE_HELP: Record<AutoMode, string> = {
  cheapest: 'Buys the cheapest drill again and again.',
  value: 'Buys whatever pays for itself fastest, and saves up for it when it is worth waiting.',
  deepest: 'Buys as many of your highest-tier drill as it can, then the next one down.',
  even: 'Buys the affordable drill you own the fewest of, so every tier keeps growing.',
};

function AutoPanel() {
  const s = game.state;
  const level = autoLevel(s);
  if (level === 0) {
    if (!s.unlocked.archive) return null;
    return (
      <div class="notice">
        <b>Auto-Training.</b> Learn Routine Training in the Mind branch of the Scroll Archive to have drills bought for you.
      </div>
    );
  }
  const modes = autoModes(s);
  const mode = effectiveMode(s) ?? 'cheapest';
  const set = () => {
    saveNow();
  };
  return (
    <Panel title="Auto-Training" accent="var(--gold)">
      <div class="stack">
        <Toggle
          label={s.auto.on ? 'On' : 'Off'}
          on={s.auto.on}
          onChange={(v) => {
            s.auto.on = v;
            s.auto.acc = 0;
            set();
          }}
        />
        <div class="muted small">Every {autoIntervalSec(level)} seconds it spends your Ki in the order you pick. Switch it off any time to save Ki for something specific.</div>
        <Segmented
          value={mode}
          options={modes.map((m) => ({ id: m, label: MODE_LABELS[m] }))}
          onChange={(m) => {
            s.auto.mode = m;
            set();
          }}
        />
        <div class="muted small">{MODE_HELP[mode]}</div>
        {autoCanUpgrade(s) && (
          <Toggle
            label="Also buy upgrades"
            on={s.auto.upgrades}
            onChange={(v) => {
              s.auto.upgrades = v;
              set();
            }}
          />
        )}
      </div>
    </Panel>
  );
}

function OverviewTab() {
  const s = game.state;
  const cap = fluxCapSec(s);
  const active = game.activeSpeed;
  const next = ZONES.filter((z) => !s.unlocked[z.id] && z.unlock.kind === 'totalKi')
    .sort((a, b) => D((a.unlock as { at: number }).at).cmp((b.unlock as { at: number }).at))
    .slice(0, 3);
  const forge = zoneById('forge');
  const showForge = !s.unlocked.forge && s.unlocked.frontier;
  const pick = (level: number) => {
    game.setSpeed(level);
    buzz(10);
  };
  return (
    <div class="stack" style={{ gap: 12 }}>
      <Panel title="Charged Meditation" accent="var(--volt)">
        <div class="stack">
          <Bar value={s.fluxSec / cap} accent="var(--volt)" label={`Ki Flux ${formatDuration(s.fluxSec)} / ${formatDuration(cap)}`} />
          <div class="seg" role="group" aria-label="Speed Up">
            <button aria-pressed={active === 1} onClick={() => pick(1)}>x1</button>
            {speedLevels(s).map((l) => (
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

      <AutoPanel />

      <button class="btn ghost block" onClick={() => ui.set({ sheet: 'breakdown' })}>
        Multiplier breakdown
      </button>

      <Panel title="Unlocks in" accent="var(--gold)">
        {next.length === 0 && !showForge && <div class="muted">Everything has been found. For now.</div>}
        {[...next, ...(showForge ? [forge] : [])].map((z) => (
          <div class="unlock" key={z.id} style={{ '--accent': z.accent }}>
            <div class="unlock-head">
              <span class="glyph"><Glyph glyph={z.glyph} name={z.name} /></span>
              <span>{z.name}</span>
            </div>
            <div class="muted small">{z.blurb}</div>
            <UnlockProgress zone={z} />
          </div>
        ))}
      </Panel>
    </div>
  );
}

export function TrainingGrounds() {
  const { homeTab } = useUi();
  const s = game.state;
  const ready = affordableUpgradeCount(s);
  const tabs: Array<{ id: typeof homeTab; label: string; dot?: boolean }> = [
    { id: 'train', label: 'Drills' },
    { id: 'upgrades', label: 'Upgrades', dot: ready > 0 },
    { id: 'overview', label: 'Overview' },
  ];
  return (
    <>
      <div class="subnav" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={homeTab === t.id} onClick={() => ui.set({ homeTab: t.id })}>
            {t.label}
            {t.dot && <i class="dot-ready" aria-label="upgrade ready" />}
          </button>
        ))}
      </div>
      {homeTab === 'train' && <TrainTab />}
      {homeTab === 'upgrades' && <UpgradesTab />}
      {homeTab === 'overview' && <OverviewTab />}
    </>
  );
}
