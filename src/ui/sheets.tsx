import { useMemo, useState } from 'preact/hooks';
import { applySettings, exportText, failedLoadInfo, freezeAndReload, game, saveNow, store } from '../app/runtime';
import { parseImport } from '../app/storage';
import { ui, useUi } from '../app/ui-store';
import { CONFIG } from '../content/config';
import { DISCOVERIES } from '../content/discoveries';
import { TECHNIQUES } from '../content/techniques';
import { ZONES, zoneById } from '../content/zones';
import { D } from '../core/bignum';
import { respec, techCount } from '../core/archive';
import { offlineCapSec } from '../core/dojo';
import { newState, type Notation } from '../core/state';
import { formatDuration, formatNum } from '../core/format';
import { serialize } from '../core/save';
import { breakdown, fluxCapSec, fluxChargeRate } from '../core/training';
import { Bar, Kv, Segmented, Sheet, Toggle } from './components';
import { FluxIcon, Glyph, InsightIcon, KiIcon, RenownIcon } from './icons';

const close = () => ui.set({ sheet: null });
const open = (sheet: NonNullable<typeof ui.state.sheet>) => ui.set({ sheet });

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ago(ms: number): string {
  if (!ms) return 'not yet';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 2 ? 'just now' : `${formatDuration(s)} ago`;
}

export function Sheets() {
  const { sheet, welcome, recovery } = useUi();
  if (recovery) return <Recovery kind={recovery} />;
  if (welcome) return <Welcome />;
  switch (sheet) {
    case 'menu':
      return <Menu />;
    case 'settings':
      return <Settings />;
    case 'stats':
      return <Stats />;
    case 'debug':
      return <Debug />;
    case 'reset':
      return <Reset />;
    case 'breakdown':
      return <BreakdownSheet />;
    case 'smartInfo':
      return <SmartInfo />;
    case 'respec':
      return <RespecSheet />;
    case 'discovery':
      return <DiscoverySheet />;
    default:
      return null;
  }
}

function Welcome() {
  const r = ui.state.welcome!;
  const n = game.state.settings.notation;
  const done = () => ui.set({ welcome: null });
  return (
    <Sheet title="Welcome back" onClose={done}>
      <div>
        <div class="muted small">You were away {formatDuration(r.awaySec)}</div>
        <div class="welcome-gain">
          <KiIcon size={30} /> +{formatNum(r.kiGained, n)} Ki
        </div>
      </div>
      <div>
        {r.capped && (
          <div class="notice" style={{ marginBottom: 10 }}>
            Offline progress covers up to {formatDuration(offlineCapSec(game.state))}. Nothing is lost, production just paused after that. Breath techniques and Cooks raise this.
          </div>
        )}
        <Kv k="Time counted" v={formatDuration(r.countedSec)} />
        {r.insightGained.gt(0) && (
          <Kv
            k="Insight written"
            v={
              <>
                <InsightIcon size={14} /> +{formatNum(r.insightGained, n, 1)}
              </>
            }
          />
        )}
        {r.renownGained.gt(0) && (
          <Kv
            k="Renown earned"
            v={
              <>
                <RenownIcon size={14} /> +{formatNum(r.renownGained, n, 1)}
              </>
            }
          />
        )}
        <Kv
          k="Ki Flux charged"
          v={
            <>
              <FluxIcon size={14} /> +{formatDuration(r.fluxGainedSec)}
            </>
          }
        />
        {r.fluxGainedSec > 0 && (
          <div class="notice good" style={{ marginTop: 8 }}>
            Charged Meditation: you hold {formatDuration(game.state.fluxSec)} of Ki Flux. Spend it on Speed Up from the Home screen.
          </div>
        )}
      </div>
      {r.unlocks.length > 0 && (
        <div>
          <h3>Unlocked while away</h3>
          {r.unlocks.map((id) => {
            const z = zoneById(id);
            return (
              <div class="kv" key={id}>
                <span>
                  <Glyph glyph={z.glyph} name={z.name} /> {z.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <button class="btn block" onClick={done}>
        Back to training
      </button>
    </Sheet>
  );
}

function Menu() {
  const s = game.state;
  const u = useUi();
  const cap = fluxCapSec(s);
  return (
    <Sheet title="Status" onClose={close}>
      <div>
        <h3>Ki Flux</h3>
        <Bar value={s.fluxSec / cap} accent="var(--volt)" label={`${formatDuration(s.fluxSec)} / ${formatDuration(cap)}`} />
        <div class="muted small" style={{ marginTop: 6 }}>
          Every {Math.round(1 / fluxChargeRate(s))}s away charges 1s of Flux (up to {formatDuration(cap)}). Speed Up spends it to run the game faster.
        </div>
      </div>
      <div>
        <Kv k="Offline progress cap" v={formatDuration(offlineCapSec(s))} />
        <Kv k="Last saved" v={ago(u.lastSavedAt)} />
        <Kv k="Storage protected" v={u.persistent === null ? 'checking' : u.persistent ? 'yes' : 'not guaranteed'} />
      </div>
      {u.saveWarning && <div class="notice bad">{u.saveWarning}</div>}
      <div class="row">
        <button class="btn grow" onClick={() => saveNow()}>Save now</button>
        <button class="btn ghost grow" onClick={() => open('settings')}>Settings</button>
      </div>
    </Sheet>
  );
}

function Stats() {
  const s = game.state;
  const n = s.settings.notation;
  return (
    <Sheet title="Stats" onClose={close}>
      <div>
        <Kv k="Ki now" v={formatNum(s.ki, n)} />
        <Kv k="Ki this run" v={formatNum(s.runKi, n)} />
        <Kv k="Lifetime Ki" v={formatNum(s.totalKi, n)} />
      </div>
      <div>
        <Kv k="Time played" v={formatDuration(s.stats.playTimeSec)} />
        <Kv k="Time away (counted)" v={formatDuration(s.stats.offlineSec)} />
        <Kv k="Sessions" v={formatNum(s.stats.sessions, n)} />
        <Kv k="Started" v={new Date(s.createdAt).toLocaleDateString()} />
      </div>
      <div>
        <Kv k="Dojo level" v={s.dojo.level} />
        <Kv k="Disciples" v={s.dojo.disciples} />
        <Kv k="Training Level" v={s.dojo.training} />
        <Kv k="Insight earned" v={formatNum(s.insightEarned, n, 1)} />
        <Kv k="Techniques learned" v={`${techCount(s)} / ${TECHNIQUES.length}`} />
        <Kv k="Scrolls read" v={`${Object.keys(s.discoveries).length} / ${DISCOVERIES.length}`} />
      </div>
      <div>
        <h3>Zones</h3>
        {ZONES.map((z) => (
          <Kv key={z.id} k={z.name} v={s.unlocked[z.id] ? 'Unlocked' : 'Locked'} />
        ))}
      </div>
    </Sheet>
  );
}

function Settings() {
  const s = game.state;
  const set = s.settings;
  const [, bump] = useState(0);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<ReturnType<typeof parseImport> | null>(null);
  const exported = useMemo(() => exportText(), []);
  const update = (patch: Partial<typeof set>) => {
    Object.assign(set, patch);
    applySettings();
    saveNow();
    bump((n) => n + 1);
  };

  const check = () => {
    try {
      setPending(parseImport(text));
      setMsg(null);
    } catch (e) {
      setPending(null);
      setMsg({ ok: false, text: (e as Error).message });
    }
  };
  const onFile = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) {
      setText(await f.text());
      setPending(null);
      setMsg(null);
    }
  };

  return (
    <Sheet title="Settings" onClose={close}>
      <div>
        <h3>Number style</h3>
        <Segmented<Notation>
          value={set.notation}
          onChange={(notation) => update({ notation })}
          options={[
            { id: 'scientific', label: '1.23e45' },
            { id: 'engineering', label: '12.3e42' },
            { id: 'standard', label: '1.23aa' },
          ]}
        />
      </div>
      <div>
        <h3>Text size {Math.round(set.textScale * 100)}%</h3>
        <input type="range" min="85" max="140" step="5" value={Math.round(set.textScale * 100)} onInput={(e) => update({ textScale: Number((e.target as HTMLInputElement).value) / 100 })} aria-label="Text size" />
      </div>
      <div>
        <Toggle label="Reduce motion" on={set.reduceMotion} onChange={(reduceMotion) => update({ reduceMotion })} />
        <Toggle label="Haptics (vibration)" on={set.haptics} onChange={(haptics) => update({ haptics })} />
      </div>

      <div>
        <h3>Save backup</h3>
        <div class="muted small" style={{ marginBottom: 8 }}>
          Your game saves to this browser every {CONFIG.autosaveSec}s, with a rolling backup. Export a copy now and then, especially before clearing browser data.
        </div>
        <textarea readOnly value={exported} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} aria-label="Save text" />
        <div class="row" style={{ marginTop: 8 }}>
          <button
            class="btn grow"
            onClick={async () => setMsg((await copy(exported)) ? { ok: true, text: 'Copied.' } : { ok: false, text: 'Copy was blocked. Select the text above and copy it by hand.' })}
          >
            Copy
          </button>
          <button class="btn ghost grow" onClick={() => download(`ki-ascension-${stamp()}.txt`, exported)}>
            Download file
          </button>
        </div>
      </div>

      <div>
        <h3>Restore a save</h3>
        <textarea value={text} onInput={(e) => { setText((e.target as HTMLTextAreaElement).value); setPending(null); }} placeholder="Paste save text here, or choose a file" aria-label="Paste save" />
        <div class="row" style={{ marginTop: 8 }}>
          <label class="btn ghost grow" style={{ textAlign: 'center' }}>
            Choose file
            <input type="file" accept=".txt,.json,text/plain" onChange={onFile} style={{ display: 'none' }} />
          </label>
          <button class="btn grow" disabled={!text.trim()} onClick={check}>Check save</button>
        </div>
        {pending && (
          <div class="notice good" style={{ marginTop: 10 }}>
            <div>
              Valid save: {formatNum(pending.totalKi, set.notation)} lifetime Ki, last played {new Date(pending.lastSeen).toLocaleString()}.
            </div>
            <div class="muted small" style={{ margin: '6px 0 10px' }}>
              Restoring replaces your current game. A copy of the current one is kept in this browser.
            </div>
            <button
              class="btn danger block"
              onClick={() => {
                store.replaceConfirmed(pending);
                freezeAndReload();
              }}
            >
              Replace my current save
            </button>
          </div>
        )}
      </div>

      {msg && <div class={`notice ${msg.ok ? 'good' : 'bad'}`}>{msg.text}</div>}

      <div>
        <h3>Developer</h3>
        <Toggle label="Debug panel" on={set.debug} onChange={(debug) => update({ debug })} />
        {set.debug && <button class="btn ghost block" onClick={() => open('debug')}>Open debug panel</button>}
      </div>

      <div>
        <h3>Danger zone</h3>
        <button class="btn danger block" onClick={() => open('reset')}>Hard reset…</button>
      </div>

      <div class="muted small">
        Ki Ascension v{__APP_VERSION__} ({__BUILD_SHA__})
      </div>
    </Sheet>
  );
}

function Reset() {
  const [step, setStep] = useState(1);
  const [word, setWord] = useState('');
  return (
    <Sheet title="Hard reset" onClose={close}>
      {step === 1 ? (
        <>
          <div class="notice bad">
            This erases your progress and starts a brand-new game. There is no undo. Export your save first if you might want it back.
          </div>
          <button class="btn ghost block" onClick={() => open('settings')}>Go back to export</button>
          <button class="btn danger block" onClick={() => setStep(2)}>I understand, continue</button>
        </>
      ) : (
        <>
          <div class="notice bad">Type RESET to confirm. Your old save stays in this browser under a recovery key, but it will not load in the game.</div>
          <input type="text" value={word} onInput={(e) => setWord((e.target as HTMLInputElement).value)} placeholder="RESET" autocapitalize="characters" aria-label="Type RESET" />
          <button
            class="btn danger block"
            disabled={word.trim().toUpperCase() !== 'RESET'}
            onClick={() => {
              store.resetConfirmed(newState(Date.now()));
              freezeAndReload();
            }}
          >
            Erase and start over
          </button>
          <button class="btn ghost block" onClick={close}>Cancel</button>
        </>
      )}
    </Sheet>
  );
}

function Debug() {
  const s = game.state;
  const [, bump] = useState(0);
  const [dump, setDump] = useState('');
  const refresh = () => bump((n) => n + 1);
  const grant = (amount: string) => {
    const a = D(amount);
    s.ki = s.ki.add(a);
    s.runKi = s.runKi.add(a);
    s.totalKi = s.totalKi.add(a);
    refresh();
  };
  const nextZone = ZONES.find((z) => !s.unlocked[z.id] && z.unlock.kind === 'totalKi');
  const warps = [1, 10, 100, 1000];
  const away = (sec: number) => {
    s.lastSeen = Date.now() - sec * 1000;
    const report = game.returnFromAway(Date.now());
    if (report) ui.set({ welcome: report, sheet: null });
  };

  return (
    <Sheet title="Debug" onClose={close}>
      <div class="notice">Testing tools. These change your real save.</div>
      <div>
        <h3>Grant Ki</h3>
        <div class="row">
          {['1e3', '1e6', '1e9', '1e12', '1e24', '1e60'].map((a) => (
            <button class="btn ghost" key={a} onClick={() => grant(a)}>+{a}</button>
          ))}
          <button class="btn ghost" onClick={() => grant(s.ki.toString())}>x2</button>
        </div>
        {nextZone && nextZone.unlock.kind === 'totalKi' && (
          <button class="btn block" style={{ marginTop: 8 }} onClick={() => nextZone.unlock.kind === 'totalKi' && grant(D(nextZone.unlock.at).sub(s.totalKi).max(0).toString())}>
            Jump to {nextZone.name}
          </button>
        )}
      </div>
      <div>
        <h3>Insight and Renown</h3>
        <div class="row">
          {['100', '1e4', '1e6'].map((a) => (
            <button class="btn ghost" key={a} onClick={() => { const v = D(a); s.insight = s.insight.add(v); s.insightEarned = s.insightEarned.add(v); refresh(); }}>+{a} Insight</button>
          ))}
          {['100', '1e4', '1e6'].map((a) => (
            <button class="btn ghost" key={`r${a}`} onClick={() => { s.renown = s.renown.add(D(a)); refresh(); }}>+{a} Renown</button>
          ))}
        </div>
      </div>
      <div>
        <h3>Ki Flux</h3>
        <div class="row">
          <button class="btn ghost grow" onClick={() => { s.fluxSec = fluxCapSec(s); refresh(); }}>Fill</button>
          <button class="btn ghost grow" onClick={() => { s.fluxSec = 0; refresh(); }}>Empty</button>
        </div>
      </div>
      <div>
        <h3>Time warp (x{game.timeWarp})</h3>
        <Segmented
          value={String(game.timeWarp)}
          onChange={(v) => { game.timeWarp = Number(v); refresh(); }}
          options={warps.map((w) => ({ id: String(w), label: `x${w}` }))}
        />
      </div>
      <div>
        <h3>Simulate being away</h3>
        <div class="row">
          {[[600, '10m'], [3600, '1h'], [43200, '12h'], [172800, '2d']].map(([sec, label]) => (
            <button class="btn ghost grow" key={label} onClick={() => away(sec as number)}>{label}</button>
          ))}
        </div>
      </div>
      <div>
        <h3>State</h3>
        <button class="btn ghost block" onClick={() => setDump(JSON.stringify(serialize(s), null, 2))}>Dump state</button>
        {dump && <textarea readOnly value={dump} style={{ marginTop: 8, minHeight: 200 }} />}
      </div>
    </Sheet>
  );
}

function Recovery({ kind }: { kind: 'unreadable' | 'tooNew' }) {
  const info = failedLoadInfo();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const raw = info?.raw ?? '';

  return (
    <Sheet title={kind === 'tooNew' ? 'Newer save found' : 'Save needs attention'}>
      <div class="notice bad">
        {kind === 'tooNew'
          ? 'Your saved game was made by a newer version of Ki Ascension than this one. Nothing has been changed.'
          : 'We found a saved game but could not read it. Nothing has been changed or deleted.'}
        <div class="muted small" style={{ marginTop: 6 }}>{info?.error.message}</div>
      </div>
      <div class="row">
        <button class="btn grow" onClick={() => location.reload()}>{kind === 'tooNew' ? 'Reload to update' : 'Try again'}</button>
        {raw && <button class="btn ghost grow" onClick={() => download(`ki-ascension-recovered-${stamp()}.txt`, raw)}>Download raw data</button>}
      </div>
      <div>
        <h3>Restore from a backup</h3>
        <textarea value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} placeholder="Paste a save text here" aria-label="Paste save" />
        <button
          class="btn block"
          style={{ marginTop: 8 }}
          disabled={!text.trim()}
          onClick={() => {
            try {
              store.replaceConfirmed(parseImport(text));
              freezeAndReload();
            } catch (e) {
              setMsg((e as Error).message);
            }
          }}
        >
          Restore this save
        </button>
        {msg && <div class="notice bad" style={{ marginTop: 8 }}>{msg}</div>}
      </div>
      {kind === 'unreadable' && (
        <div>
          <h3>Start over</h3>
          {step === 0 ? (
            <button class="btn danger block" onClick={() => setStep(1)}>Start a new game…</button>
          ) : (
            <>
              <div class="notice bad">The unreadable data is kept in this browser under a recovery key. Download it first if you want to try to repair it.</div>
              <button
                class="btn danger block"
                style={{ marginTop: 8 }}
                onClick={() => {
                  store.replaceConfirmed(newState(Date.now()));
                  freezeAndReload();
                }}
              >
                Yes, start a new game
              </button>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

function BreakdownSheet() {
  const s = game.state;
  const n = s.settings.notation;
  const bd = breakdown(s);
  const speed = game.activeSpeed;
  const f = (v: Parameters<typeof formatNum>[0], d = 2) => formatNum(v, n, d);
  return (
    <Sheet title="Multiplier breakdown" onClose={close}>
      <div>
        <div class="muted small">Ki per second</div>
        <div class="mult-total">{f(game.kiPerSec, 2)}</div>
      </div>
      <div>
        <h3>Sources</h3>
        <div class="mult-line">
          <div class="kv" style={{ border: 0, padding: 0 }}>
            <span>Innate Ki</span>
            <b>{f(bd.innate)}</b>
          </div>
        </div>
        {bd.drills
          .filter((l) => l.owned > 0)
          .map((l) => (
            <div class="mult-line" key={l.id}>
              <div class="kv" style={{ border: 0, padding: 0 }}>
                <span>
                  {l.name} <span class="muted">x{formatNum(l.owned, n)}</span>
                </span>
                <b>{f(l.perSec)}</b>
              </div>
              <div class="eq">
                {f(l.baseProd, 2)} each × {formatNum(l.owned, n)} × milestones {f(l.milestoneMult, 0)} ({l.milestones}) × drill upgrades {(1 + l.localBonus).toFixed(2)}{l.techBonus > 0 && <> × techniques {(1 + l.techBonus).toFixed(2)}</>}
              </div>
            </div>
          ))}
        <div class="kv">
          <span class="muted">Subtotal</span>
          <b>{f(bd.subtotal)}</b>
        </div>
      </div>
      <div>
        <h3>Multipliers on the whole total</h3>
        {bd.categories.map((c) => (
          <div class="kv" key={c.id}>
            <span>{c.label}</span>
            <b>x{c.mult.toNumber().toFixed(2)}</b>
          </div>
        ))}
        <div class="kv">
          <span>Speed Up</span>
          <b>x{speed}</b>
        </div>
        <div class="muted small" style={{ marginTop: 6 }}>
          Gear, rivals, forms, ranks and prestige will each add their own line here as they arrive. Bonuses add together inside a category; categories multiply each other.
        </div>
      </div>
    </Sheet>
  );
}

function SmartInfo() {
  return (
    <Sheet title="Smart Spend" onClose={close}>
      <div>
        Smart Spend spends your Ki for you on whatever pays for itself fastest.
      </div>
      <div>
        <h3>How it works</h3>
        <div class="kv"><span>1</span><b style={{ textAlign: 'left', flex: 1, marginLeft: 12 }}>It looks at every drill and upgrade you can see and works out how much extra Ki per second each would give for its price.</b></div>
        <div class="kv"><span>2</span><b style={{ textAlign: 'left', flex: 1, marginLeft: 12 }}>It buys the best one you can afford, then repeats until nothing affordable is left.</b></div>
      </div>
      <div>
        <h3>Good to know</h3>
        <div class="muted">
          It buys one unit of a drill at a time, so it ignores your x1/x10/x100/Max setting. It never saves up for an expensive item, so if you are aiming for a specific upgrade, buy it by hand first. Ki Flux upgrades are left for you to choose, since they do not raise Ki per second. Cost reductions are counted as extra income.
        </div>
      </div>
      <button class="btn block" onClick={close}>Got it</button>
    </Sheet>
  );
}

function RespecSheet() {
  const s = game.state;
  const n = s.settings.notation;
  return (
    <Sheet title="Respec techniques" onClose={close}>
      <div>
        This releases all {techCount(s)} techniques and gives back <b>{formatNum(s.insightSpent, n, 1)} Insight</b>, every point of it. You can then spend it again however you like.
      </div>
      <div class="notice">Respec is always free and never loses anything. Auto-Training stops until you learn Routine Training again.</div>
      <button
        class="btn block"
        onClick={() => {
          respec(game.state);
          saveNow();
          close();
          ui.toast('Techniques refunded in full', '巻', 'var(--violet)');
        }}
      >
        Refund everything
      </button>
      <button class="btn ghost block" onClick={close}>Keep my techniques</button>
    </Sheet>
  );
}

function DiscoverySheet() {
  const id = ui.state.discoveryId;
  const d = DISCOVERIES.find((x) => x.id === id);
  if (!d) return null;
  return (
    <Sheet title={d.title} onClose={close}>
      <div class="lore">{d.text}</div>
      <div class="notice good">Reward: {d.rewardText}</div>
      <button class="btn block" onClick={close}>Roll it up</button>
    </Sheet>
  );
}
