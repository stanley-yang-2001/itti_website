/** A tiny inline trend line - no axes, no labels, just the shape. Deliberately
 * plain SVG rather than recharts: these render many-at-once inside data panel
 * cards, where a full chart library instance per card would be overkill. */
export default function Sparkline({ points, color, width = 90, height = 24 }) {
  const values = points.filter((p) => p !== null && p !== undefined);
  if (values.length < 2) {
    return <span className="obs-sparkline-empty">Not enough years for a trend</span>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = v === null || v === undefined ? null : height - ((v - min) / range) * height;
    return { x, y };
  });

  const segments = [];
  let current = [];
  coords.forEach((c) => {
    if (c.y === null) {
      if (current.length > 1) segments.push(current);
      current = [];
    } else {
      current.push(c);
    }
  });
  if (current.length > 1) segments.push(current);

  return (
    <svg className="obs-sparkline" viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      {segments.map((seg, i) => (
        <polyline
          key={i}
          points={seg.map((c) => `${c.x},${c.y}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />
      ))}
      {coords.filter((c) => c.y !== null).map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="1.6" fill={color} />
      ))}
    </svg>
  );
}