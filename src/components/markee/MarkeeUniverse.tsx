import { useEffect, useRef } from "react";

/**
 * Animação "universo / IA" — partículas leves em canvas com órbitas
 * suaves ao redor de um núcleo. Respeita prefers-reduced-motion.
 */
export function MarkeeUniverse({ size = 220 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    const cx = size / 2;
    const cy = size / 2;

    const particles = Array.from({ length: 48 }).map((_, i) => ({
      r: 30 + Math.random() * (size / 2 - 30),
      a: Math.random() * Math.PI * 2,
      s: 0.002 + Math.random() * 0.006,
      size: 0.6 + Math.random() * 1.6,
      hue: 270 + Math.random() * 60,
      alpha: 0.4 + Math.random() * 0.6,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      // núcleo
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 60);
      grad.addColorStop(0, "rgba(190,160,255,0.9)");
      grad.addColorStop(0.4, "rgba(120,120,255,0.35)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.fill();

      for (const p of particles) {
        if (!reduced) p.a += p.s;
        const x = cx + Math.cos(p.a) * p.r;
        const y = cy + Math.sin(p.a) * p.r * 0.85;
        ctx.fillStyle = `hsla(${p.hue}, 90%, 80%, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-full markee-orbit"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, rgba(180,140,255,0.25), transparent 40%, rgba(120,180,255,0.25), transparent 70%)",
          filter: "blur(14px)",
        }}
      />
      <canvas
        ref={ref}
        style={{ width: size, height: size }}
        className="relative"
      />
    </div>
  );
}
