import { game } from '../app/runtime';
import { ui, useTick, useUi } from '../app/ui-store';
import type { TabId } from '../content/zones';
import { currentKiPerSec } from '../core/engine';
import { formatNum } from '../core/format';
import { Glyph, DojoIcon, ForgeIcon, FrontierIcon, HomeIcon, KiIcon, LockIcon, MenuIcon, MoreIcon } from './icons';
import { Home, More, ZoneScreen } from './screens';
import { Sheets } from './sheets';

const TABS: Array<{ id: TabId; label: string; zone?: string; Icon: typeof HomeIcon }> = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'dojo', label: 'Dojo', zone: 'dojo', Icon: DojoIcon },
  { id: 'frontier', label: 'Frontier', zone: 'frontier', Icon: FrontierIcon },
  { id: 'forge', label: 'Forge', zone: 'forge', Icon: ForgeIcon },
  { id: 'more', label: 'More', Icon: MoreIcon },
];

function Header() {
  const s = game.state;
  const n = s.settings.notation;
  const { saveWarning } = useUi();
  return (
    <header class="header">
      <div class="badge" aria-hidden="true">
        <span><Glyph glyph="気" name="K" /></span>
      </div>
      <div class="readout">
        <div class="readout-ki">
          <KiIcon size={22} />
          <span>{formatNum(s.ki, n)}</span>
        </div>
        <div class="readout-rate">
          <b>{formatNum(currentKiPerSec(s), n, 1)}</b> Ki/s
          {s.restedSec > 0 && <span class="rested-pill"> · Rested x2</span>}
        </div>
      </div>
      <button class="icon-btn" onClick={() => ui.set({ sheet: 'menu' })} aria-label="Status and menu">
        <MenuIcon />
        {saveWarning && <span class="dot" />}
      </button>
    </header>
  );
}

function TabBar() {
  const { tab } = useUi();
  const s = game.state;
  return (
    <nav class="tabbar" aria-label="Main">
      {TABS.map(({ id, label, zone, Icon }) => {
        const locked = zone ? !s.unlocked[zone] : false;
        return (
          <button key={id} class={`tab ${locked ? 'locked' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => ui.set({ tab: id })}>
            <Icon />
            {label}
            {locked && (
              <span class="lock">
                <LockIcon size={14} />
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function Screen() {
  const { tab } = useUi();
  switch (tab) {
    case 'home':
      return <Home />;
    case 'more':
      return <More />;
    default:
      return <ZoneScreen tab={tab} />;
  }
}

function Toasts() {
  const { toasts } = useUi();
  return (
    <div class="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div class="toast" key={t.id} style={{ '--accent': t.accent }}>
          <span class="glyph"><Glyph glyph={t.glyph} name={t.text} /></span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

function UpdateBanner() {
  const { updateReady, offlineReady } = useUi();
  if (updateReady) {
    return (
      <div class="banner" role="status">
        <span>A new version is ready.</span>
        <button class="btn" onClick={updateReady}>Reload</button>
      </div>
    );
  }
  if (offlineReady) {
    return (
      <div class="banner" role="status">
        <span>Ready to play offline.</span>
        <button class="btn ghost" onClick={() => ui.set({ offlineReady: false })}>OK</button>
      </div>
    );
  }
  return null;
}

export function App() {
  useTick(10);
  return (
    <>
      <Header />
      <main>
        <Screen />
      </main>
      <TabBar />
      <UpdateBanner />
      <Toasts />
      <Sheets />
    </>
  );
}
