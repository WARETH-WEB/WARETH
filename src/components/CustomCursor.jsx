import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const dot = useRef(null);

  useEffect(() => {
    // الأجهزة اللمسية مفيهاش ماوس
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.body.classList.add("custom-cursor");

    let raf = 0;
    let tx = -100;
    let ty = -100;
    let x = -100;
    let y = -100;
    let down = false;

    const move = (e) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const onDown = () => (down = true);
    const onUp = () => (down = false);

    const loop = () => {
      x += (tx - x) * 0.25;
      y += (ty - y) * 0.25;
      if (dot.current) {
        const s = down ? 0.6 : 1;
        dot.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove("custom-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div
      ref={dot}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[100] hidden h-3 w-3 rounded-full bg-gold-soft pointer-fine:block"
      style={{
        boxShadow: "0 0 14px 4px rgba(244,210,123,0.55)",
        transform: "translate(-100px, -100px)",
        transition: "scale 0.15s",
      }}
    />
  );
}