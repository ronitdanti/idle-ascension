import { CONFIG } from '../content/config';
import { zoneById } from '../content/zones';
import { discoveriesReady } from '../core/archive';
import { Game } from '../core/game';
import { newState } from '../core/state';
import { encodeExport } from '../core/save';
import { SaveStore, type LoadResult } from './storage';
import { ui } from './ui-store';

export const store = new SaveStore();

/** Created in boot(). Components read `game.state` directly; the UI refreshes on a 10 Hz timer. */
export let game: Game;

let last = 0;
let running = false;
let failedLoad: Extract<LoadResult, { kind: 'unreadable' | 'tooNew' }> | null = null;

export function failedLoadInfo() {
  return failedLoad;
}

export function buzz(ms = 10): void {
  if (game?.state.settings.haptics && 'vibrate' in navigator) navigator.vibrate(ms);
}

export function applySettings(): void {
  const s = game.state.settings;
  const root = document.documentElement;
  root.style.setProperty('--scale', String(s.textScale));
  root.dataset.motion = s.reduceMotion ? 'reduce' : 'full';
}

export function saveNow(): boolean {
  if (!game) return false;
  game.state.lastSeen = Date.now();
  const ok = store.save(game.state);
  ui.set({ saveWarning: ok ? null : store.lastError, lastSavedAt: ok ? Date.now() : ui.state.lastSavedAt });
  return ok;
}

/** Stop all writes. Used right before a reload that follows an import or reset. */
export function freezeAndReload(): void {
  store.writable = false;
  location.reload();
}

export function exportText(): string {
  return encodeExport(game.state);
}

function handleReturn(now: number): void {
  const report = game.returnFromAway(now);
  if (report && report.awaySec >= CONFIG.welcomeMinSec) {
    // The welcome sheet already lists anything unlocked while away, so skip the toasts.
    ui.set({ welcome: report });
    game.drainEvents();
  }
  pumpEvents();
}

/** Number of unread found scrolls the last time we looked, so each new one toasts exactly once. */
let scrollsSeen = 0;

function pumpEvents(): void {
  const ready = discoveriesReady(game.state).length;
  if (ready > scrollsSeen) ui.toast('A scroll was found in the Archive', '巻', 'var(--violet)');
  scrollsSeen = ready;
  for (const ev of game.drainEvents()) {
    if (ev.type === 'unlock') {
      const z = zoneById(ev.zone);
      ui.toast(`${z.name} unlocked`, z.glyph, z.accent);
      buzz(30);
    } else if (ev.type === 'fluxEmpty') {
      ui.toast('Ki Flux spent. Back to normal speed', '力', 'var(--volt)');
    }
  }
}

function frame(t: number): void {
  if (!running) return;
  const dt = (t - last) / 1000;
  last = t;
  const now = Date.now();
  if (dt > 5) {
    // The page was frozen without a visibility event (device sleep, debugger). Treat it as absence.
    handleReturn(now);
  } else {
    game.update(dt);
    pumpEvents();
  }
  game.state.lastSeen = now;
  requestAnimationFrame(frame);
}

function startLoop(): void {
  if (running) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

function stopLoop(): void {
  running = false;
}

/** Called once at startup. Returns false if the game is blocked on a save problem. */
export async function boot(): Promise<boolean> {
  const result = await store.load();
  const now = Date.now();

  if (result.kind === 'unreadable' || result.kind === 'tooNew') {
    // Do not touch storage. The recovery screen asks the player what to do.
    failedLoad = result;
    store.writable = false;
    game = new Game(newState(now));
    applySettings();
    ui.set({ recovery: result.kind });
    return false;
  }

  if (result.kind === 'none') {
    const fresh = newState(now);
    // First launch honors the device's reduced-motion preference.
    fresh.settings.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    game = new Game(fresh);
    applySettings();
    saveNow();
  } else {
    game = new Game(result.state);
    game.state.stats.sessions += 1;
    applySettings();
    handleReturn(now);
    saveNow();
    if (result.source !== 'main') ui.toast(`Restored from ${result.source}`, '救', 'var(--jade)');
  }
  void store.requestPersistence().then((granted) => ui.set({ persistent: granted }));

  setInterval(() => {
    if (!document.hidden) saveNow();
  }, CONFIG.autosaveSec * 1000);

  const hide = () => {
    saveNow();
    stopLoop();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hide();
    } else {
      handleReturn(Date.now());
      startLoop();
    }
  });
  addEventListener('pagehide', () => saveNow());

  startLoop();
  return true;
}
