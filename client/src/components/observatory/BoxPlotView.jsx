/**
 * Recharts doesn't have a built-in box plot, so this is a small
 * hand-rolled SVG one - simple enough not to need a charting library:
 * a box (Q1-Q3), a median line, whiskers out to the nearest value
 * within 1.5*IQR, any values beyond that as muted outlier dots, and
 * the currently-selected data panels plotted as colored, labeled
 * points on top so it's clear where they sit relative to everyone
 * else rather than only showing their own values in isolation.
 */
function quantile(sortedValues, q) {
  const n = sortedValues.length;
  const pos = (n - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedValues[base + 1] === undefined) return sortedValues[base];
  return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
}

/** Standard Tukey box plot stats (1.5*IQR whiskers, everything beyond
 *  those fences treated as an outlier point) from a flat list of
 *  numeric values. Returns null if there's nothing to summarize. */
export function computeBoxStats(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const within = sorted.filter((v) => v >= lowerFence && v <= upperFence);
  const whiskerLow = within.length ? within[0] : sorted[0];
  const whiskerHigh = within.length ? within[within.length - 1] : sorted[n - 1];
  const outliers = sorted.filter((v) => v < whiskerLow || v > whiskerHigh);
  return { n, min: sorted[0], max: sorted[n - 1], q1, median, q3, whiskerLow, whiskerHigh, outliers };
}

const BOX_COLOR = '#0D8A7C';
const GRID_COLOR = '#E1E6EE';
const AXIS_TEXT = '#51607A';
const OUTLIER_COLOR = '#8A97AB';

function fmtTick(v) {
  return Math.abs(v) >= 100 ? Math.round(v).toString() : v.toFixed(1);
}

export default function BoxPlotView({ chart, height = 280 }) {
  const { stats, points, variableLabel } = chart;

  if (!stats) {
    return <p className="obs-charts-empty">Not enough country data to build a distribution for this variable.</p>;
  }

  const width = 420;
  const marginLeft = 54;
  const marginRight = 24;
  const marginTop = 16;
  const marginBottom = 34;
  const plotHeight = height - marginTop - marginBottom;
  const centerX = marginLeft + (width - marginLeft - marginRight) / 2;
  const boxHalfWidth = 46;

  const pointValues = points.map((p) => p.value);
  const domainMin = Math.min(stats.min, ...stats.outliers, ...pointValues, stats.whiskerLow);
  const domainMax = Math.max(stats.max, ...stats.outliers, ...pointValues, stats.whiskerHigh);
  const pad = (domainMax - domainMin) * 0.08 || 1;
  const dMin = domainMin - pad;
  const dMax = domainMax + pad;

  function y(value) {
    return marginTop + plotHeight - ((value - dMin) / (dMax - dMin)) * plotHeight;
  }

  const ticks = [dMin + pad * 0.3, stats.q1, stats.median, stats.q3, dMax - pad * 0.3];

  // Fan the selected points out a little so several at a similar value
  // don't sit exactly on top of each other.
  const jittered = points.map((p, i) => {
    const spread = Math.min(boxHalfWidth - 8, 12 * (points.length - 1));
    const offset = points.length > 1 ? (i / (points.length - 1) - 0.5) * spread : 0;
    return { ...p, x: centerX + offset };
  });

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={`Box plot of ${variableLabel}`}>
        {/* y-axis */}
        <line x1={marginLeft} y1={marginTop} x2={marginLeft} y2={marginTop + plotHeight} stroke={GRID_COLOR} />
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={marginLeft - 4} y1={y(t)} x2={marginLeft} y2={y(t)} stroke={GRID_COLOR} />
            <text x={marginLeft - 8} y={y(t)} fill={AXIS_TEXT} fontSize="10" textAnchor="end" dominantBaseline="middle">
              {fmtTick(t)}
            </text>
          </g>
        ))}

        {/* whiskers */}
        <line x1={centerX} y1={y(stats.whiskerHigh)} x2={centerX} y2={y(stats.q3)} stroke={BOX_COLOR} strokeWidth="1.5" />
        <line x1={centerX} y1={y(stats.q1)} x2={centerX} y2={y(stats.whiskerLow)} stroke={BOX_COLOR} strokeWidth="1.5" />
        <line x1={centerX - 16} y1={y(stats.whiskerHigh)} x2={centerX + 16} y2={y(stats.whiskerHigh)} stroke={BOX_COLOR} strokeWidth="1.5" />
        <line x1={centerX - 16} y1={y(stats.whiskerLow)} x2={centerX + 16} y2={y(stats.whiskerLow)} stroke={BOX_COLOR} strokeWidth="1.5" />

        {/* box */}
        <rect
          x={centerX - boxHalfWidth}
          y={y(stats.q3)}
          width={boxHalfWidth * 2}
          height={Math.max(1, y(stats.q1) - y(stats.q3))}
          fill="rgba(13,138,124,0.14)"
          stroke={BOX_COLOR}
          strokeWidth="1.5"
        />
        {/* median */}
        <line
          x1={centerX - boxHalfWidth}
          y1={y(stats.median)}
          x2={centerX + boxHalfWidth}
          y2={y(stats.median)}
          stroke={BOX_COLOR}
          strokeWidth="2.5"
        />

        {/* outliers from the broader population (muted, not the focus) */}
        {stats.outliers.map((v, i) => (
          <circle key={i} cx={centerX} cy={y(v)} r="2.5" fill={OUTLIER_COLOR}>
            <title>{fmtTick(v)}</title>
          </circle>
        ))}

        {/* selected data panels, plotted against the distribution */}
        {jittered.map((p, i) => (
          <circle key={i} cx={p.x} cy={y(p.value)} r="5" fill={p.color} stroke="#0B1220" strokeWidth="1">
            <title>{`${p.label}: ${fmtTick(p.value)}`}</title>
          </circle>
        ))}

        <text x={centerX} y={height - 6} fill={AXIS_TEXT} fontSize="11" textAnchor="middle">
          {variableLabel}
        </text>
      </svg>

      {points.length > 0 && (
        <div className="obs-chart-legend">
          {points.map((p, i) => (
            <span key={i} className="obs-chart-legend-item">
              <span className="obs-country-dot" style={{ background: p.color }} />
              {p.label}: {fmtTick(p.value)}
            </span>
          ))}
        </div>
      )}

      <p className="obs-chart-builder-note" style={{ display: 'block', marginTop: 8 }}>
        Distribution across {stats.n} countries with {variableLabel} data on file - median {fmtTick(stats.median)}, IQR{' '}
        {fmtTick(stats.q1)}–{fmtTick(stats.q3)}.
      </p>
    </div>
  );
}