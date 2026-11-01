import { useEffect, useRef } from 'preact/hooks';
import { game, buzz } from '../app/runtime';
import { currentKiPerSec, gather } from '../core/engine';
import { formatNum } from '../core/format';
import { canDraw } from './icons';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  text?: string;
  size: number;
}

/**
 * The home-screen Ki orb. Procedural canvas: flame tongues that grow with Ki/s, a bright core,
 * and spark particles on tap. Runs on its own rAF loop; stops when the tab is hidden.
 */
export function KiOrb() {
  const ref = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const pulse = useRef(0);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let w = 0;
    let h = 0;
    let t0 = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      const reduce = game.state.settings.reduceMotion;
      const time = reduce ? 0 : now / 1000;
      const power = Math.min(1, Math.max(0, Math.log10(Math.max(1, currentKiPerSec(game.state).toNumber())) / 12));
      const tongues = 7 + Math.round(power * 9);
      pulse.current = Math.max(0, pulse.current - dt * 4);
      const cx = w / 2;
      const cy = h / 2 + 4;
      const base = Math.min(w, h) * (0.2 + power * 0.04) * (1 + pulse.current * 0.12);

      ctx.clearRect(0, 0, w, h);

      // soft ground glow
      const glow = ctx.createRadialGradient(cx, cy, base * 0.4, cx, cy, base * 2.6);
      glow.addColorStop(0, 'rgba(255,107,33,0.38)');
      glow.addColorStop(1, 'rgba(255,107,33,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // flame tongues
      for (let layer = 0; layer < 2; layer++) {
        const scale = layer === 0 ? 1 : 0.62;
        ctx.beginPath();
        for (let i = 0; i < tongues * 2; i++) {
          const a = (i / (tongues * 2)) * Math.PI * 2 + time * (layer ? -0.5 : 0.35);
          const spike = i % 2 === 0;
          const wob = reduce ? 1 : 1 + 0.12 * Math.sin(time * 3 + i * 1.7 + layer);
          const r = base * scale * (spike ? 1.75 * wob : 1.05);
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = layer === 0 ? '#ff6b21' : '#ffb347';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.lineJoin = 'miter';
        ctx.stroke();
      }

      // core
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.8);
      core.addColorStop(0, '#fff8e0');
      core.addColorStop(0.55, '#ffd27a');
      core.addColorStop(1, '#ff9a3c');
      ctx.beginPath();
      ctx.arc(cx, cy, base * 0.78, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.stroke();

      // glyph on the core, if the fonts can draw it
      if (canDraw('気')) {
        ctx.fillStyle = 'rgba(120,40,0,0.55)';
        ctx.font = `900 ${Math.round(base * 0.95)}px "Noto Sans JP","Hiragino Sans",system-ui,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('気', cx, cy + base * 0.06);
      }

      // particles
      const list = particles.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life -= dt;
        if (p.life <= 0) {
          list.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = p.life / p.max;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        if (p.text) {
          ctx.font = `900 ${p.size}px system-ui,sans-serif`;
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#000';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillStyle = '#ffd27a';
          ctx.fillText(p.text, p.x, p.y);
        } else {
          ctx.fillStyle = k > 0.5 ? '#ffd27a' : '#ff6b21';
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(draw);

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        t0 = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const onTap = (e: PointerEvent) => {
    const gained = gather(game.state);
    buzz(8);
    pulse.current = 1;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const list = particles.current;
    const { reduceMotion, notation } = game.state.settings;
    list.push({ x, y: y - 10, vx: 0, vy: reduceMotion ? 0 : -60, life: 0.8, max: 0.8, text: `+${formatNum(gained, notation)}`, size: 20 });
    if (!reduceMotion) {
      for (let i = 0; i < 8 && list.length < 80; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 60 + Math.random() * 120;
        list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5, max: 0.5, size: 4 + Math.random() * 3 });
      }
    }
  };

  return (
    <div class="orb-wrap">
      <canvas ref={ref} onPointerDown={onTap} role="button" aria-label="Gather Ki" />
      <div class="orb-hint">Tap to gather Ki</div>
    </div>
  );
}
