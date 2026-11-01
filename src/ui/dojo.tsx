import { buzz, game, saveNow } from '../app/runtime';
import { ui, useUi } from '../app/ui-store';
import { DOJO, ROLES, type RoleDef } from '../content/dojo';
import { formatNum } from '../core/format';
import type { BuyAmount } from '../core/state';
import {
  assign,
  canLevelUp,
  canTrain,
  capacity,
  idleDisciples,
  levelUp,
  levelUpCost,
  recruit,
  recruitQuote,
  renownPerSec,
  roleAvailable,
  roleCount,
  scribeInsightPerSec,
  sparringBonus,
  trainUp,
  trainingCost,
  trainingMult,
  assigned,
} from '../core/dojo';
import { fluxCapSec } from '../core/training';
import { Bar, Panel, Segmented } from './components';
import { DiscipleIcon, Glyph, LockIcon, RenownIcon } from './icons';
import { useHold } from './train';

const AMOUNTS: Array<{ id: string; label: string }> = [
  { id: '1', label: 'x1' },
  { id: '10', label: 'x10' },
  { id: '100', label: 'x100' },
  { id: 'max', label: 'Max' },
];

/** What a role's disciples are doing right now, in numbers. */
function roleOutput(role: RoleDef): string {
  const s = game.state;
  const n = s.settings.notation;
  const count = roleCount(s, role.id);
  if (count === 0) return role.effectText;
  switch (role.id) {
    case 'sparring':
      return `+${(sparringBonus(s) * 100).toFixed(1)}% all Ki`;
    case 'scribe':
      return `+${formatNum(scribeInsightPerSec(s), n, 2)} Insight/s`;
    case 'cook':
      return `+${formatNum((count * DOJO.cook.fluxCapSec) / 60, n, 0)} min Flux cap, +${formatNum((count * DOJO.cook.offlineCapSec) / 60, n, 0)} min offline cap`;
    default:
      return role.effectText;
  }
}

function RoleRow({ role }: { role: RoleDef }) {
  const s = game.state;
  const open = roleAvailable(s, role);
  const count = roleCount(s, role.id);
  const idle = idleDisciples(s);
  const move = (delta: number) => {
    if (assign(game.state, role.id, delta) !== 0) buzz(6);
  };
  const minus = useHold(() => move(-1));
  const plus = useHold(() => move(1));
  return (
    <div class={`role ${open ? '' : 'locked'}`} style={{ '--accent': role.accent }}>
      <div class="role-glyph" aria-hidden="true">
        {open ? <Glyph glyph={role.glyph} name={role.name} /> : <LockIcon size={18} />}
      </div>
      <div class="role-main">
        <div class="role-top">
          <b>{role.name}</b>
          {open && <span class="muted"> x{count}</span>}
        </div>
        <div class="muted small">{open ? roleOutput(role) : role.lockedHint}</div>
      </div>
      {open && (
        <div class="stepper">
          <button class="btn ghost" disabled={count <= 0} {...minus} aria-label={`Remove a ${role.name}`}>−</button>
          <button class="btn" disabled={idle <= 0} {...plus} aria-label={`Assign a ${role.name}`}>+</button>
          <button
            class="btn ghost all"
            disabled={idle <= 0}
            onClick={() => {
              move(idle);
              saveNow();
            }}
            aria-label={`Assign all idle disciples as ${role.name}`}
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}

function RolesTab() {
  const s = game.state;
  return (
    <div class="stack" style={{ gap: 10 }}>
      {ROLES.map((r) => (
        <RoleRow key={r.id} role={r} />
      ))}
      <div class="muted small" style={{ textAlign: 'center' }}>
        Assigned disciples earn Renown whatever their job. Moving someone is free and instant, so experiment.
        {s.dojo.disciples === 0 ? ' Recruit your first disciple above.' : ''}
      </div>
    </div>
  );
}

function CostLine({ label, have, need }: { label: string; have: string; need: string }) {
  return (
    <div class="kv">
      <span class="muted">{label}</span>
      <b>
        {have} / {need}
      </b>
    </div>
  );
}

function GrowTab() {
  const s = game.state;
  const n = s.settings.notation;
  const lvl = levelUpCost(s);
  const can = canLevelUp(s);
  const train = trainingCost(s);
  const nextCap = capacity(s) + DOJO.capacity.perLevel;
  return (
    <div class="stack" style={{ gap: 12 }}>
      <Panel title={`Dojo level ${s.dojo.level}`} accent="var(--gold)">
        <div class="stack">
          <div class="muted small">
            Expanding the Dojo raises how many disciples fit: {capacity(s)} now, {nextCap} after. Some roles open at higher levels.
          </div>
          <CostLine label="Ki" have={formatNum(s.ki, n)} need={formatNum(lvl.ki, n)} />
          <CostLine label="Renown" have={formatNum(s.renown, n)} need={formatNum(lvl.renown, n)} />
          <button
            class="btn block"
            disabled={!can}
            onClick={() => {
              if (levelUp(game.state)) {
                buzz(30);
                ui.toast(`Dojo level ${game.state.dojo.level}`, '道', 'var(--gold)');
                saveNow();
              }
            }}
          >
            Expand the Dojo
          </button>
        </div>
      </Panel>

      <Panel title={`Training Level ${s.dojo.training}`} accent="var(--ember)">
        <div class="stack">
          <div class="muted small">
            Each Training Level makes Sparring Partners and Scribes {DOJO.training.bonusPerLevel * 100}% stronger. Right now they are at x{trainingMult(s).toFixed(2)}.
          </div>
          <CostLine label="Renown" have={formatNum(s.renown, n)} need={formatNum(train, n)} />
          <button
            class="btn block"
            disabled={!canTrain(s)}
            onClick={() => {
              if (trainUp(game.state)) {
                buzz(20);
                saveNow();
              }
            }}
          >
            Train the disciples
          </button>
        </div>
      </Panel>
      <div class="notice">
        Renown comes from every assigned disciple. It is spent here and nowhere else, so it never feels wasted. Ki Flux gets a bigger cap from Cooks.
        <div class="muted small" style={{ marginTop: 4 }}>Current Flux cap: {Math.round(fluxCapSec(s) / 60)} min.</div>
      </div>
    </div>
  );
}

export function DojoScreen() {
  const { dojoTab } = useUi();
  const s = game.state;
  const n = s.settings.notation;
  const amount = s.settings.buyAmount;
  const q = recruitQuote(s, amount);
  const idle = idleDisciples(s);
  const label = q.full ? 'Dojo full' : amount === 'max' ? `Recruit Max (${q.count})` : `Recruit x${q.count}`;
  const hold = useHold(() => {
    const got = recruit(game.state, game.state.settings.buyAmount);
    if (got > 0) buzz(10);
  });
  const tabs: Array<{ id: typeof dojoTab; label: string; dot?: boolean }> = [
    { id: 'roles', label: 'Roles', dot: idle > 0 },
    { id: 'grow', label: 'Grow', dot: canLevelUp(s) || canTrain(s) },
  ];
  return (
    <div class="screen" style={{ '--accent': 'var(--gold)' }}>
      <Panel accent="var(--gold)" watermark="道">
        <div class="dojo-head">
          <div class="dojo-stat">
            <DiscipleIcon size={22} />
            <div>
              <div class="k">Disciples</div>
              <div class="v">
                {s.dojo.disciples} / {capacity(s)}
              </div>
            </div>
          </div>
          <div class="dojo-stat">
            <RenownIcon size={22} />
            <div>
              <div class="k">Renown</div>
              <div class="v">{formatNum(s.renown, n)}</div>
              <div class="muted small">+{formatNum(renownPerSec(s), n, 2)}/s</div>
            </div>
          </div>
        </div>
        <Bar value={capacity(s) > 0 ? s.dojo.disciples / capacity(s) : 0} accent="var(--gold)" label={`Dojo level ${s.dojo.level} · ${assigned(s)} working · ${idle} idle`} />
        <div style={{ height: 14 }} />
        <div class="row" style={{ alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 190 }}>
            <Segmented
              value={String(amount)}
              options={AMOUNTS}
              onChange={(v) => {
                s.settings.buyAmount = (v === 'max' ? 'max' : Number(v)) as BuyAmount;
                saveNow();
              }}
            />
          </div>
        </div>
        <button class={`btn block recruit ${q.affordable ? 'can' : ''}`} style={{ marginTop: 8 }} disabled={!q.affordable} {...hold}>
          <span>{label}</span>
          {!q.full && <small>{formatNum(q.cost, n)} Ki</small>}
        </button>
        {q.full && <div class="muted small" style={{ marginTop: 6 }}>Every bed is taken. Expand the Dojo under Grow.</div>}
      </Panel>

      <div class="subnav two" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={dojoTab === t.id} onClick={() => ui.set({ dojoTab: t.id })}>
            {t.label}
            {t.dot && <i class="dot-ready" aria-label="ready" />}
          </button>
        ))}
      </div>
      {dojoTab === 'roles' ? <RolesTab /> : <GrowTab />}
    </div>
  );
}
