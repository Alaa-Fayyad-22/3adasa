// Static, non-animated fallback for prefers-reduced-motion — no Three.js
// chunk is ever fetched for these users (see BehindTheLens.tsx), just this
// cheap inline SVG showing the lens already assembled, every label visible.
const LENS_CENTER_X = 280;
const PARTS = [
  { cy: 140, r: 66, label: "Front element", glass: true, side: "right" as const },
  { cy: 205, r: 68, label: "Front barrel", glass: false, side: "left" as const },
  { cy: 270, r: 64, label: "Aperture blades", glass: false, side: "right" as const },
  { cy: 340, r: 78, label: "Rear barrel", glass: false, side: "left" as const },
  { cy: 410, r: 72, label: "Mount ring", glass: false, side: "right" as const },
];

function Callout({ cy, r, side, text }: { cy: number; r: number; side: "left" | "right"; text: string }) {
  const dir = side === "right" ? 1 : -1;
  const lineStart = LENS_CENTER_X + dir * (r + 4);
  const lineEnd = LENS_CENTER_X + dir * (r + 32);
  const textX = LENS_CENTER_X + dir * (r + 40);
  return (
    <g>
      <circle cx={lineStart} cy={cy} r={2} className="fill-muted" />
      <line x1={lineStart} y1={cy} x2={lineEnd} y2={cy} className="stroke-muted" strokeWidth={1} />
      <text
        x={textX}
        y={cy + 5}
        textAnchor={side === "right" ? "start" : "end"}
        className="fill-muted font-display italic"
        fontSize={15}
      >
        {text}
      </text>
    </g>
  );
}

export default function BehindTheLensStatic() {
  return (
    <svg
      viewBox="0 100 560 500"
      role="img"
      aria-label="Illustration of an assembled camera lens with labeled parts"
      className="h-auto w-full max-w-md md:max-w-lg"
    >
      <g className="stroke-stroke">
        <rect
          x={LENS_CENTER_X - 130}
          y={460}
          width={260}
          height={130}
          rx={18}
          className="fill-surface"
          strokeWidth={2}
        />
        <rect
          x={LENS_CENTER_X - 40}
          y={428}
          width={80}
          height={34}
          rx={7}
          className="fill-surface"
          strokeWidth={2}
        />
        <circle cx={LENS_CENTER_X + 92} cy={447} r={7} className="fill-bg" strokeWidth={2} />
      </g>
      <Callout cy={525} r={130} side="left" text="Camera body" />
      {PARTS.map((part) => (
        <g key={part.label}>
          <circle
            cx={LENS_CENTER_X}
            cy={part.cy}
            r={part.r}
            className={part.glass ? "fill-bg stroke-stroke" : "fill-surface stroke-stroke"}
            strokeWidth={3}
          />
          <Callout cy={part.cy} r={part.r} side={part.side} text={part.label} />
        </g>
      ))}
    </svg>
  );
}
