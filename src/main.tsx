import './ui/theme.css';
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { boot } from './app/runtime';
import { ui } from './app/ui-store';
import { App } from './ui/App';

async function main() {
  await boot();
  render(<App />, document.getElementById('app')!);

  // New versions wait until the player taps Reload, so a deploy never interrupts a session.
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => ui.set({ updateReady: () => void updateSW(true) }),
    onOfflineReady: () => ui.set({ offlineReady: true }),
  });
}

void main();
