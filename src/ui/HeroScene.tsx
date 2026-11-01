import { useEffect, useRef } from 'preact/hooks';
import { game } from '../app/runtime';
import { fx } from '../app/ui-store';
import { canDraw } from './icons';

/** Deterministic pseudo-random in [0, 1) so the scenery never changes between frames. */
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

/** Ridge height at x for a layer: a few summed sines, stable per layer. */
const ridge = (layer: number, x: number, w: number) => {
  const t = x / w;
  return (
    Math.sin(t * (5 + layer * 2.3) + layer * 4) * 0.5 +
    Math.sin(t * (11 + layer * 3.1) + layer) * 0.25 +
    Math.sin(t * (23 + layer * 5) + layer * 2) * 0.1
  );
};

/**
 * The home-screen scene, all procedural: dusk sky, three parallax mountain ridges and a
 * silhouette hero in a ready stance. The aura behind the hero grows with Ki/s and turns
 * electric while Speed Up runs. Own rAF loop; stops while the tab is hidden.
 */
export function HeroScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let w = 0;
    let h = 0;
    let last = performance.now();
    const sparks: Spark[] = [];

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

    const burst = (count: number) => {
      if (game.state.settings.reduceMotion) return;
      for (let i = 0; i < count && sparks.length < 120; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 50 + Math.random() * 130;
        sparks.push({ x: w / 2, y: h * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.8, max: 0.8, size: 3 + Math.random() * 3 });
      }
    };
    const off = fx.on(() => burst(26));

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const reduce = game.state.settings.reduceMotion;
      const time = reduce ? 0 : now / 1000;
      const speed = game.activeSpeed;
      const power = Math.min(1, Math.max(0, Math.log10(Math.max(1, game.kiPerSec.toNumber())) / 14));
      const fast = speed > 1;

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, fast ? '#04122a' : '#0a0520');
      sky.addColorStop(0.62, fast ? '#0b3550' : '#4a1408');
      sky.addColorStop(1, fast ? '#052030' : '#1a0804');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // stars
      ctx.fillStyle = '#f4efe4';
      for (let i = 0; i < 40; i++) {
        const tw = reduce ? 0.7 : 0.5 + 0.5 * Math.sin(time * 1.5 + i);
        ctx.globalAlpha = 0.25 + 0.5 * tw * rand(i + 9);
        ctx.fillRect(rand(i) * w, rand(i + 50) * h * 0.5, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;

      // low sun
      ctx.fillStyle = fast ? 'rgba(34,229,255,0.18)' : 'rgba(255,120,40,0.22)';
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.5, h * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // mountain ridges, back to front
      const colors = fast ? ['#0a2a40', '#071b2c', '#040f1a'] : ['#2a0f12', '#1a0a0e', '#0d0509'];
      for (let layer = 0; layer < 3; layer++) {
        const drift = reduce ? 0 : Math.sin(time * 0.08 + layer) * (3 + layer * 5);
        const base = h * (0.6 + layer * 0.08);
        const amp = h * (0.2 - layer * 0.03);
        ctx.fillStyle = colors[layer];
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w + 6; x += 6) ctx.lineTo(x, base - Math.abs(ridge(layer, x + drift * 3, w)) * amp * 1.2);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }

      const cx = w / 2;
      const gy = h * 0.94;
      const u = h * 0.0088;

      // aura: spiky flame polygon behind the hero
      const tongues = 8 + Math.round(power * 8);
      const auraR = u * (22 + power * 20);
      const glow = ctx.createRadialGradient(cx, gy - 36 * u, u * 4, cx, gy - 36 * u, auraR * 1.9);
      glow.addColorStop(0, fast ? 'rgba(34,229,255,0.55)' : 'rgba(255,107,33,0.55)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      for (let layer = 0; layer < 2; layer++) {
        const sc = layer ? 0.6 : 1;
        ctx.beginPath();
        for (let i = 0; i < tongues * 2; i++) {
          const a = (i / (tongues * 2)) * Math.PI * 2 + time * (layer ? -0.4 : 0.3);
          const spike = i % 2 === 0;
          const wob = reduce ? 1 : 1 + 0.14 * Math.sin(time * 3.2 + i * 1.9 + layer);
          const rr = auraR * sc * (spike ? 1.25 * wob : 0.72);
          const x = cx + Math.cos(a) * rr;
          const y = gy - 36 * u + Math.sin(a) * rr * 1.15;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.globalAlpha = layer ? 0.9 : 0.75;
        ctx.fillStyle = fast ? (layer ? '#b8f6ff' : '#22e5ff') : layer ? '#ffb347' : '#ff6b21';
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // hero silhouette
      const rim = fast ? '#22e5ff' : '#ffb347';
      const body = '#07040c';
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';
      ctx.strokeStyle = body;
      const limb = (pts: Array<[number, number]>, width: number) => {
        ctx.lineWidth = width * u;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x * u, gy + y * u) : ctx.moveTo(cx + x * u, gy + y * u)));
        ctx.stroke();
      };
      const breathe = reduce ? 0 : Math.sin(time * 2) * 0.6;
      limb([[-3, -34], [-14, -18], [-13, 0]], 6.5); // back leg
      limb([[3, -34], [14, -18], [13, 0]], 6.5); // front leg
      ctx.fillStyle = body;
      ctx.beginPath(); // torso
      ctx.moveTo(cx - 9.5 * u, gy + (-62 + breathe) * u);
      ctx.lineTo(cx + 9.5 * u, gy + (-62 + breathe) * u);
      ctx.lineTo(cx + 6 * u, gy - 33 * u);
      ctx.lineTo(cx - 6 * u, gy - 33 * u);
      ctx.closePath();
      ctx.fill();
      limb([[-9, -60 + breathe], [-19, -50], [-11, -60]], 5); // guard arm
      limb([[9, -60 + breathe], [18, -52], [26, -61]], 5); // lead arm
      ctx.beginPath(); // head
      ctx.arc(cx, gy + (-70 + breathe) * u, 6 * u, 0, Math.PI * 2);
      ctx.fill();
      // spiky hair
      ctx.beginPath();
      const hy = gy + (-72 + breathe) * u;
      const spikes: Array<[number, number, number]> = [[-6, -13, -4], [-3, -16, 0], [1, -17, 4], [5, -14, 9], [-8, -8, -12]];
      for (const [x0, y0, x1] of spikes) {
        ctx.moveTo(cx + (x0 - 2.5) * u, hy);
        ctx.lineTo(cx + x1 * u, hy + y0 * u + (reduce ? 0 : Math.sin(time * 4 + x0) * 0.8 * u));
        ctx.lineTo(cx + (x0 + 2.5) * u, hy);
      }
      ctx.fill();
      // headband with trailing tails
      ctx.fillStyle = '#ff3b5c';
      ctx.fillRect(cx - 6.2 * u, gy + (-72 + breathe) * u, 12.4 * u, 2 * u);
      ctx.beginPath();
      const flutter = reduce ? 0 : Math.sin(time * 6) * 1.5;
      ctx.moveTo(cx - 6 * u, gy + (-72 + breathe) * u);
      ctx.lineTo(cx - 17 * u, gy + (-70 + flutter + breathe) * u);
      ctx.lineTo(cx - 6 * u, gy + (-70 + breathe) * u);
      ctx.fill();
      // rim light on the lit side
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + 9.5 * u, gy + (-62 + breathe) * u);
      ctx.lineTo(cx + 6 * u, gy - 33 * u);
      ctx.moveTo(cx + 6 * u, gy + (-70 + breathe) * u);
      ctx.arc(cx, gy + (-70 + breathe) * u, 6 * u, 0, Math.PI * 0.5);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // ground
      ctx.fillStyle = '#05030a';
      ctx.fillRect(0, gy, w, h - gy);

      // speed lines while Speed Up runs
      if (fast && !reduce) {
        ctx.strokeStyle = 'rgba(184,246,255,0.5)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 16; i++) {
          const y = rand(i + 3) * h * 0.9;
          const len = 40 + rand(i + 20) * 90;
          const x = ((time * (300 + speed * 120) * (0.5 + rand(i))) + rand(i + 7) * w) % (w + len);
          ctx.beginPath();
          ctx.moveTo(w - x, y);
          ctx.lineTo(w - x + len, y);
          ctx.stroke();
        }
      }

      // embers rising off the hero
      if (!reduce && Math.random() < 0.15 + power * 0.6 && sparks.length < 100) {
        sparks.push({ x: cx + (Math.random() - 0.5) * 22 * u, y: gy - 20 * u, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 50, life: 1.4, max: 1.4, size: 2 + Math.random() * 2.5 });
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life -= dt;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = p.life / p.max;
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.fillStyle = fast ? '#b8f6ff' : k > 0.5 ? '#ffd27a' : '#ff6b21';
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // faint kanji watermark in the sky
      if (canDraw('気')) {
        ctx.fillStyle = 'rgba(244,239,228,0.06)';
        ctx.font = `900 ${Math.round(h * 0.5)}px "Noto Sans JP","Hiragino Sans",system-ui,sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('気', w * 0.04, h * 0.42);
      }
    };
    raf = requestAnimationFrame(draw);

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      off();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div class="scene-wrap">
      <canvas ref={ref} role="img" aria-label="Your hero training at dusk" />
    </div>
  );
}
