const GLYPHS = Array.from("𓂀𓆣𓋹𓃭𓅓𓊖𓇳𓏏𓈖𓄿𓁹𓆓𓌳𓉐𓎛𓊪𓅱𓂋𓏤");

function Column({ side }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-0 hidden h-full flex-col items-center justify-around py-24 sm:flex ${
        side === "left" ? "left-3 lg:left-8" : "right-3 lg:right-8"
      }`}
      style={{
        fontFamily: '"Noto Sans Egyptian Hieroglyphs", serif',
        color: "#D8AA4A",
        opacity: 0.07,
        fontSize: "clamp(22px, 2.4vw, 38px)",
      }}
    >
      {GLYPHS.map((g, i) => (
        <span key={i}>{g}</span>
      ))}
    </div>
  );
}

export default function HieroglyphBorders() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Column side="left" />
      <Column side="right" />
    </div>
  );
}