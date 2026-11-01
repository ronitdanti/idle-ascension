import { buzz, game, saveNow } from '../app/runtime';
import { ui, useUi, type ArchiveTab } from '../app/ui-store';
import { DISCOVERIES, type DiscoveryDef } from '../content/discoveries';
import { DRILLS } from '../content/drills';
import { BRANCHES, TECHNIQUES, TECH_BY_ID, techsInBranch, type TechDef } from '../content/techniques';
import { buyTech, buyableTechCount, canRefund, discoveriesReady, discoveryFound, discoveryRead, readDiscovery, refundTech, techAffordable, techCount, techOwned, techUnlocked } from '../core/archive';
import { insightPerSec } from '../core/dojo';
import { formatNum } from '../core/format';
import { effectText } from '../core/techniques';
import { Bar, Panel } from './components';
import { Glyph, InsightIcon } from './icons';

const drillName = (id: string): string => DRILLS.find((d) => d.id === id)?.name ?? id;

function TechCard({ t, accent }: { t: TechDef; accent: string }) {
  const s = game.state;
  const n = s.settings.notation;
  const owned = techOwned(s, t.id);
  const unlocked = techUnlocked(s, t);
  const can = !owned && unlocked && techAffordable(s, t) && !!s.unlocked.archive;
  const missing = t.requires.filter((r) => !techOwned(s, r)).map((r) => TECH_BY_ID.get(r)?.name ?? r);
  const state = owned ? 'owned' : !unlocked ? 'locked' : can ? 'can' : '';
  return (
    <div class={`tech ${state}`} style={{ '--accent': accent }}>
      <div class="tech-main">
        <div class="tech-top">
          <b>{t.name}</b>
          <span class="chip-tier">T{t.tier + 1}</span>
        </div>
        {t.effects.map((e, i) => (
          <div class="tech-effect" key={i}>
            {effectText(e, drillName)}
          </div>
        ))}
        {t.flavor && <div class="muted small tech-flavor">{t.flavor}</div>}
        {!owned && missing.length > 0 && <div class="muted small">Needs {missing.join(' + ')}</div>}
      </div>
      {owned ? (
        <div class="tech-side">
          <span class="learned">Learned</span>
          {canRefund(s, t.id) && (
            <button
              class="btn ghost small-btn"
              onClick={() => {
                if (refundTech(game.state, t.id)) {
                  buzz(8);
                  saveNow();
                }
              }}
              aria-label={`Refund ${t.name} for ${formatNum(t.cost, n)} Insight`}
            >
              Refund
            </button>
          )}
        </div>
      ) : (
        <button
          class="btn buy"
          disabled={!can}
          onClick={() => {
            if (buyTech(game.state, t.id)) {
              buzz(20);
              ui.toast(`${t.name} learned`, '巻', accent);
              saveNow();
            }
          }}
          aria-label={`Learn ${t.name} for ${formatNum(t.cost, n)} Insight`}
        >
          <span>Learn</span>
          <small>{formatNum(t.cost, n)}</small>
        </button>
      )}
    </div>
  );
}

function BranchView({ id }: { id: Exclude<ArchiveTab, 'scrolls'> }) {
  const branch = BRANCHES.find((b) => b.id === id)!;
  const list = techsInBranch(id);
  const s = game.state;
  const owned = list.filter((t) => techOwned(s, t.id)).length;
  return (
    <div class="stack" style={{ gap: 10 }}>
      <div class="muted small">
        <b style={{ color: branch.accent }}>{branch.name}.</b> {branch.blurb} {owned} of {list.length} learned.
      </div>
      {list.map((t) => (
        <TechCard key={t.id} t={t} accent={branch.accent} />
      ))}
    </div>
  );
}

function ScrollCard({ d }: { d: DiscoveryDef }) {
  const s = game.state;
  const n = s.settings.notation;
  const found = discoveryFound(s, d);
  const read = discoveryRead(s, d.id);
  if (!found) {
    return (
      <div class="scroll locked">
        <div class="scroll-glyph" aria-hidden="true">?</div>
        <div class="scroll-main" style={{ flex: 1 }}>
          <b>Unfound scroll</b>
          <Bar value={s.insightEarned.max(1).log10() / Math.max(1, Math.log10(d.at))} accent="var(--violet)" label={`${formatNum(s.insightEarned, n)} / ${formatNum(d.at, n)} Insight earned`} />
        </div>
      </div>
    );
  }
  return (
    <div class={`scroll ${read ? 'read' : 'new'}`}>
      <div class="scroll-glyph" aria-hidden="true">
        <Glyph glyph="巻" name="S" />
      </div>
      <div class="scroll-main" style={{ flex: 1 }}>
        <b>{d.title}</b>
        <div class="muted small">{read ? d.rewardText : 'A new scroll is waiting.'}</div>
      </div>
      <button
        class={`btn ${read ? 'ghost' : ''}`}
        onClick={() => {
          if (!read) {
            readDiscovery(game.state, d.id);
            buzz(25);
            saveNow();
          }
          ui.set({ sheet: 'discovery', discoveryId: d.id });
        }}
      >
        {read ? 'Reread' : 'Read'}
      </button>
    </div>
  );
}

function ScrollsView() {
  const s = game.state;
  const found = DISCOVERIES.filter((d) => discoveryFound(s, d)).length;
  // Show every found scroll, then only the next unfound one so the rest stay a surprise.
  const next = DISCOVERIES.find((d) => !discoveryFound(s, d));
  const shown = DISCOVERIES.filter((d) => discoveryFound(s, d));
  return (
    <div class="stack" style={{ gap: 10 }}>
      <div class="muted small">
        Rare scrolls turn up as you earn Insight. Each holds a bit of lore and a one-time reward. {found} of {DISCOVERIES.length} found.
      </div>
      {shown.map((d) => (
        <ScrollCard key={d.id} d={d} />
      ))}
      {next && <ScrollCard d={next} />}
    </div>
  );
}

export function ArchiveScreen() {
  const { archiveTab } = useUi();
  const s = game.state;
  const n = s.settings.notation;
  const ready = discoveriesReady(s).length;
  const buyable = buyableTechCount(s);
  const tabs: Array<{ id: ArchiveTab; label: string; dot?: boolean }> = [
    ...BRANCHES.map((b) => ({ id: b.id as ArchiveTab, label: b.name })),
    { id: 'scrolls', label: 'Scrolls', dot: ready > 0 },
  ];
  return (
    <div class="screen" style={{ '--accent': 'var(--violet)' }}>
      <button class="btn ghost back" onClick={() => ui.set({ moreView: 'menu' })}>
        ← More
      </button>
      <Panel accent="var(--violet)" watermark="巻">
        <div class="dojo-head">
          <div class="dojo-stat">
            <InsightIcon size={24} />
            <div>
              <div class="k">Insight</div>
              <div class="v">{formatNum(s.insight, n, 1)}</div>
              <div class="muted small">+{formatNum(insightPerSec(s), n, 2)}/s</div>
            </div>
          </div>
          <div class="dojo-stat">
            <div>
              <div class="k">Techniques</div>
              <div class="v">
                {techCount(s)} / {TECHNIQUES.length}
              </div>
              <div class="muted small">{buyable > 0 ? `${buyable} you can learn now` : 'Save up for the next one'}</div>
            </div>
          </div>
        </div>
        <div class="muted small" style={{ marginTop: 8 }}>
          Scribes in the Dojo write faster. Respec is always free and refunds every point of Insight.
        </div>
      </Panel>

      <div class="subnav three" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={archiveTab === t.id} onClick={() => ui.set({ archiveTab: t.id })}>
            {t.label}
            {t.dot && <i class="dot-ready" aria-label="new scroll" />}
          </button>
        ))}
      </div>

      {archiveTab === 'scrolls' ? <ScrollsView /> : <BranchView id={archiveTab} />}

      {archiveTab !== 'scrolls' && techCount(s) > 0 && (
        <button class="btn ghost block" onClick={() => ui.set({ sheet: 'respec' })}>
          Respec all techniques (free)
        </button>
      )}
    </div>
  );
}
