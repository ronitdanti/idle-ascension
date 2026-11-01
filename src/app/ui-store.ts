import { useEffect, useState } from 'preact/hooks';
import type { OfflineReport } from '../core/engine';
import type { TabId } from '../content/zones';

export type SheetId = 'menu' | 'settings' | 'stats' | 'debug' | 'reset' | 'breakdown' | 'smartInfo';
export type HomeTab = 'train' | 'upgrades' | 'overview';

export interface Toast {
  id: number;
  text: string;
  glyph: string;
  accent: string;
}

export interface UiState {
  tab: TabId;
  homeTab: HomeTab;
  sheet: SheetId | null;
  welcome: OfflineReport | null;
  recovery: 'unreadable' | 'tooNew' | null;
  toasts: Toast[];
  saveWarning: string | null;
  lastSavedAt: number;
  persistent: boolean | null;
  updateReady: (() => void) | null;
  offlineReady: boolean;
}

type Listener = () => void;

class UiStore {
  state: UiState = {
    tab: 'home',
    homeTab: 'train',
    sheet: null,
    welcome: null,
    recovery: null,
    toasts: [],
    saveWarning: null,
    lastSavedAt: 0,
    persistent: null,
    updateReady: null,
    offlineReady: false,
  };
  private listeners = new Set<Listener>();
  private nextToast = 1;

  set(patch: Partial<UiState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  toast(text: string, glyph: string, accent: string): void {
    const id = this.nextToast++;
    this.set({ toasts: [...this.state.toasts, { id, text, glyph, accent }].slice(-3) });
    setTimeout(() => this.set({ toasts: this.state.toasts.filter((t) => t.id !== id) }), 4500);
  }
}

export const ui = new UiStore();

/** One-way event bus for visual effects (milestone bursts). The scene listens, the game logic emits. */
class Fx {
  private fns = new Set<() => void>();
  on(fn: () => void): () => void {
    this.fns.add(fn);
    return () => this.fns.delete(fn);
  }
  burst(): void {
    this.fns.forEach((f) => f());
  }
}
export const fx = new Fx();

/** Re-render when UI state changes. */
export function useUi(): UiState {
  const [, bump] = useState(0);
  useEffect(() => ui.subscribe(() => bump((n) => n + 1)), []);
  return ui.state;
}

/** Re-render on a timer so live numbers refresh at most `hz` times a second. Pauses while hidden. */
export function useTick(hz = 10): void {
  const [, bump] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) bump((n) => (n + 1) % 1e9);
    }, 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
}
