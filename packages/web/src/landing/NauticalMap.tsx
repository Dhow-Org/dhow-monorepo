/**
 * A bespoke nautical-chart map (no geodata, no stock): a lat/long grid,
 * bathymetric depth rings around two ports, and a great-circle route from
 * Jebel Ali to Shenzhen with a dhow that sails along it. Elements carry ids so
 * the scroll timeline in ActVoyage can draw the route and move the dhow.
 */
export function NauticalMap({ className = "" }: { className?: string }) {
  const grid: JSX.Element[] = [];
  for (let x = 0; x <= 1200; x += 60) {
    grid.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={600} stroke="rgba(242,236,221,0.05)" strokeWidth={1} />);
  }
  for (let y = 0; y <= 600; y += 60) {
    grid.push(<line key={`h${y}`} x1={0} y1={y} x2={1200} y2={y} stroke="rgba(242,236,221,0.05)" strokeWidth={1} />);
  }

  const rings = (cx: number, cy: number, key: string) =>
    [26, 48, 72].map((r, i) => (
      <circle
        key={`${key}${r}`}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(215,162,59,0.18)"
        strokeWidth={1}
        strokeDasharray={i === 2 ? "2 6" : undefined}
      />
    ));

  return (
    <svg viewBox="0 0 1200 600" className={className} role="img" aria-label="Voyage from Jebel Ali to Shenzhen">
      <defs>
        <radialGradient id="chartGlow" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="rgba(86,214,182,0.06)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <rect x={0} y={0} width={1200} height={600} fill="url(#chartGlow)" />
      <g>{grid}</g>

      {/* faded secondary corridors */}
      <path d="M250,360 C500,180 780,180 990,300" fill="none" stroke="rgba(242,236,221,0.06)" strokeWidth={1.5} strokeDasharray="1 8" />
      <path d="M250,360 C520,470 760,470 990,300" fill="none" stroke="rgba(242,236,221,0.06)" strokeWidth={1.5} strokeDasharray="1 8" />

      {/* bathymetric rings at the ports */}
      {rings(250, 360, "dxb")}
      {rings(990, 300, "szx")}

      {/* the voyage route (drawn on scroll) */}
      <path
        id="voyage-route"
        d="M250,360 C480,150 800,150 990,300"
        fill="none"
        stroke="#D7A23B"
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      {/* ports */}
      <g>
        <circle cx={250} cy={360} r={6} fill="#56D6B6" />
        <text x={250} y={398} textAnchor="middle" fill="#8FA9AC" fontSize={15} fontFamily="'IBM Plex Mono', monospace">
          JEBEL ALI
        </text>
        <text x={250} y={416} textAnchor="middle" fill="rgba(143,169,172,0.6)" fontSize={11} fontFamily="'IBM Plex Mono', monospace">
          25.01°N 55.06°E
        </text>
      </g>
      <g>
        <circle cx={990} cy={300} r={6} fill="#D7A23B" />
        <text x={990} y={338} textAnchor="middle" fill="#8FA9AC" fontSize={15} fontFamily="'IBM Plex Mono', monospace">
          SHENZHEN
        </text>
        <text x={990} y={356} textAnchor="middle" fill="rgba(143,169,172,0.6)" fontSize={11} fontFamily="'IBM Plex Mono', monospace">
          22.54°N 114.06°E
        </text>
      </g>

      {/* the dhow (moved along the route on scroll) */}
      <g id="voyage-dhow">
        <g transform="translate(-11,-11)">
          <path d="M11,2 L19,17 L11,17 Z" fill="#F2ECDD" />
          <path d="M11,5 L5,17 L11,17 Z" fill="rgba(242,236,221,0.6)" />
          <path d="M3,18 Q11,21 19,18" stroke="#F2ECDD" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
