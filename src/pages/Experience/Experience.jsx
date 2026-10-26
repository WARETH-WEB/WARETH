import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "../../context/LangContext";

/* ========== إعدادات سهلة التعديل ========== */
const INITIAL_PAUSE = 500;    // شاشة فاضية قبل البداية (ms)
const GATHER_MS = 2000;       // مدة التجمّع
const MAX_START_DELAY = 200;  // أقصى تأخير لبداية أي نقطة
const MAX_PARTICLES = 2400;
const REPEL_RADIUS = 90;      // نطاق تأثير الماوس
const REPEL_FORCE = 38;       // قوة الدفع
const SWEEP_MS = 1100;        // مدة وميض اللمعة
const SWEEP_BAND = 140;       // عرض اللمعة
const IDLE_MS = 4000;         // بعد كام ms التلميح ينبض أقوى
const GOLD = "#D8AA4A";
const GOLD_SOFT = "#F4D27B";
const GOLD_LIGHT = "#FFF3C4";
const FONTS = {
  ar: { family: '"Amiri", serif', weight: 700, name: "Amiri", maxSize: 190, ratio: 0.19 },
  en: { family: '"Cinzel Decorative", serif', weight: 700, name: "Cinzel Decorative", maxSize: 120, ratio: 0.11 },
};
/* ========================================== */

const easeOut = (x) => 1 - Math.pow(1 - x, 2.2);
const TAU = Math.PI * 2;

export default function Experience() {
  const canvasRef = useRef(null);
  const ctrl = useRef({ exit: () => false });
  const pointer = useRef({ x: -9999, y: -9999 });
  const [ready, setReady] = useState(false);
  const [idle, setIdle] = useState(false);
  const [entered, setEntered] = useState(false);
  const { t, lang } = useLang();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cfg = FONTS[lang];
    const word = t.brand;

    setReady(false);
    setIdle(false);
    setEntered(false);

    let w = 0;
    let h = 0;
    let particles = [];
    let stars = [];
    let raf = 0;
    let cancelled = false;
    let isReady = false;
    let animatingOut = false;
    let resizeTimer = 0;
    let startTime = 0;
    let exitTime = 0;
    let sweepStart = 0;
    let minX = 0;
    let maxX = 0;

    const getTargets = () => {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const o = off.getContext("2d");

      let size = Math.min(w * cfg.ratio, cfg.maxSize);
      o.font = `${cfg.weight} ${size}px ${cfg.family}`;
      o.direction = lang === "ar" ? "rtl" : "ltr";
      const measured = o.measureText(word).width;
      if (measured > w * 0.85) {
        size = (size * w * 0.85) / measured;
        o.font = `${cfg.weight} ${size}px ${cfg.family}`;
      }
      o.textAlign = "center";
      o.textBaseline = "middle";
      o.fillStyle = "#fff";
      o.fillText(word, w / 2, h / 2);

      const data = o.getImageData(0, 0, w, h).data;
      const gap = Math.max(4, Math.round(w / (lang === "ar" ? 280 : 260)));
      const targets = [];

      for (let y = 0; y < h; y += gap) {
        for (let x = 0; x < w; x += gap) {
          if (data[(y * w + x) * 4 + 3] > 120) {
            targets.push({
              x: x + (Math.random() - 0.5) * 1.8,
              y: y + (Math.random() - 0.5) * 1.8,
            });
          }
        }
      }
      return targets;
    };

    const createStars = () => {
      const count = Math.min(140, Math.round((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 0.4 + Math.random() * 0.8,
        phase: Math.random() * TAU,
        speed: 0.0004 + Math.random() * 0.0009,
      }));
    };

    const createParticles = () => {
      isReady = false;
      animatingOut = false;
      sweepStart = 0;

      const all = getTargets();
      const step = all.length > MAX_PARTICLES ? Math.ceil(all.length / MAX_PARTICLES) : 1;
      const selected = all.filter((_, i) => i % step === 0);

      minX = Infinity;
      maxX = -Infinity;
      for (const s of selected) {
        if (s.x < minX) minX = s.x;
        if (s.x > maxX) maxX = s.x;
      }

      particles = selected.map((tg, i) => {
        // بداية من واحدة من الحواف الأربعة
        const side = Math.floor(Math.random() * 4);
        const sx = side === 0 ? -20 : side === 1 ? w + 20 : Math.random() * w;
        const sy = side === 2 ? -20 : side === 3 ? h + 20 : Math.random() * h;
        return {
          tx: tg.x,
          ty: tg.y,
          sx,
          sy,
          x: sx,
          y: sy,
          ox: 0,
          oy: 0,
          size: 0.35 + Math.random() * 1.35,
          alpha: 0.35 + Math.random() * 0.65,
          delay: Math.random() * MAX_START_DELAY,
          twinkle: Math.random() * TAU,
          twinkleSpeed: 0.02 + Math.random() * 0.03,
          special: i % 25 === 0,
          vx: 0,
          vy: 0,
        };
      });
      startTime = 0; // يتحدد عند أول فريم ظاهر
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createStars();
      createParticles();
    };

    const drawStars = (now) => {
      ctx.fillStyle = GOLD_SOFT;
      for (const s of stars) {
        const a = reduce ? 0.25 : 0.1 + 0.3 * (0.5 + 0.5 * Math.sin(now * s.speed + s.phase));
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, TAU);
        ctx.fill();
      }
    };

    const animate = (now) => {
      if (cancelled) return;
      if (!startTime) startTime = now;
      ctx.clearRect(0, 0, w, h);

      drawStars(now); // النجوم ظاهرة من أول لحظة

      const sinceStart = now - startTime;
      if (!animatingOut && sinceStart < INITIAL_PAUSE) {
        raf = requestAnimationFrame(animate);
        return;
      }
      const elapsed = Math.max(0, sinceStart - INITIAL_PAUSE);

      const mx = pointer.current.x;
      const my = pointer.current.y;
      const sweepT = sweepStart ? (now - sweepStart) / SWEEP_MS : -1;
      const sweepX = minX - SWEEP_BAND + sweepT * (maxX - minX + SWEEP_BAND * 2);

      for (const p of particles) {
        let alpha = p.alpha;

        if (animatingOut) {
          p.x += p.vx;
          p.y += p.vy;
          alpha *= Math.max(0, 1 - (now - exitTime) / 1000);
        } else {
          const dur = GATHER_MS - MAX_START_DELAY;
          const k = reduce ? 1 : Math.min(1, Math.max(0, (elapsed - p.delay) / dur));
          const e = easeOut(k);
          p.x = p.sx + (p.tx - p.sx) * e;
          p.y = p.sy + (p.ty - p.sy) * e;
          p.twinkle += p.twinkleSpeed;

          // الماوس/الصباع يبعّد النقط القريبة وترجع (إضافة 1)
          let tox = 0;
          let toy = 0;
          if (!reduce && k >= 1) {
            const dx = p.x - mx;
            const dy = p.y - my;
            const d = Math.hypot(dx, dy);
            if (d < REPEL_RADIUS && d > 0.01) {
              const f = Math.pow(1 - d / REPEL_RADIUS, 2) * REPEL_FORCE;
              tox = (dx / d) * f;
              toy = (dy / d) * f;
            }
          }
          p.ox += (tox - p.ox) * 0.14;
          p.oy += (toy - p.oy) * 0.14;
        }

        if (alpha <= 0.01) continue;

        // لمعة بتعدّي على الكلمة (إضافة 2)
        let boost = 0;
        if (sweepT >= 0 && sweepT <= 1) {
          boost = Math.max(0, 1 - Math.abs(p.tx - sweepX) / SWEEP_BAND);
        }

        const shimmer = 0.78 + Math.sin(p.twinkle) * 0.22;
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha * shimmer + boost * 0.7);
        ctx.fillStyle = boost > 0.35 ? GOLD_LIGHT : p.special ? GOLD_SOFT : GOLD;
        if (p.size > 1.1 || boost > 0.2) {
          ctx.shadowBlur = 8 + boost * 10;
          ctx.shadowColor = "rgba(216,170,74,0.5)";
        }
        ctx.beginPath();
        ctx.arc(p.x + p.ox, p.y + p.oy, p.size * (1 + boost * 0.8), 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      if (!animatingOut && !isReady && elapsed >= GATHER_MS) {
        isReady = true;
        sweepStart = reduce ? 0 : now;
        setReady(true);
      }

      raf = requestAnimationFrame(animate);
    };

    ctrl.current.exit = () => {
      if (!isReady || animatingOut) return false;
      animatingOut = true;
      exitTime = performance.now();
      for (const p of particles) {
        const angle = Math.atan2(p.y - h / 2, p.x - w / 2) + (Math.random() - 0.5) * 0.5;
        const speed = 3 + Math.random() * 7;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
      }
      return true;
    };

    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!animatingOut) resize();
      }, 250);
    };

    document.fonts
      .load(`${cfg.weight} 100px "${cfg.name}"`, word)
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        resize();
        raf = requestAnimationFrame(animate);
        window.addEventListener("resize", onResize);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [lang, t.brand]);

  // التلميح ينبض أقوى لو الزائر ما ضغطش (إضافة 7)
  useEffect(() => {
    if (!ready || entered) return;
    const id = setTimeout(() => setIdle(true), IDLE_MS);
    return () => clearTimeout(id);
  }, [ready, entered]);

  const handleEnter = () => {
    if (entered) return;
    if (ctrl.current.exit()) {
      if (navigator.vibrate) navigator.vibrate(30); // إضافة 12
      setReady(false);
      setEntered(true);
    }
  };

  const onMove = (e) => {
    pointer.current = { x: e.clientX, y: e.clientY };
  };
  const onLeave = () => {
    pointer.current = { x: -9999, y: -9999 };
  };

  // عربي: كلمة كلمة (عشان حروف العربي ما تتفكش)، إنجليزي: حرف حرف (إضافة 8)
  const units = lang === "ar" ? t.greeting.split(" ") : Array.from(t.greeting);
  const step = lang === "ar" ? 0.4 : 0.07;
  const base = 0.9;

  return (
    <section
      onPointerDown={handleEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative h-dvh w-full cursor-pointer select-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-label={t.brand}
        role="img"
      />

      <AnimatePresence>
        {ready && !entered && (
          <motion.p
            key="hint"
            className="absolute inset-x-0 bottom-[11%] px-6 text-center text-sm tracking-[0.2em] text-gold-soft sm:text-base"
            initial={{ opacity: 0 }}
            animate={
              idle
                ? { opacity: [0.35, 1, 0.35], scale: [1, 1.06, 1] }
                : { opacity: 0.6, scale: 1 }
            }
            exit={{ opacity: 0 }}
            transition={
              idle
                ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                : { duration: 1.2 }
            }
          >
            {t.tapHint}
          </motion.p>
        )}
      </AnimatePresence>

      {entered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="font-title text-4xl text-gold-soft sm:text-6xl">
            {units.map((u, i) => (
              <motion.span
                key={`${lang}-${i}`}
                className={`inline-block whitespace-pre ${lang === "ar" ? "mx-[0.12em]" : ""}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: base + i * step, duration: 0.8, ease: "easeOut" }}
              >
                {u}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="text-xs tracking-[0.25em] text-offwhite/60 sm:text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: base + units.length * step + 0.4, duration: 1.4 }}
          >
            {t.subtitle}
          </motion.p>
        </div>
      )}
    </section>
  );
}