export function mean(values) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function summarize(values) {
  if (values.length === 0) return null;
  return {
    count: values.length,
    mean: mean(values),
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/** Formats a number for display: trims to at most 2 decimal places, no trailing zeros. */
export function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Math.round(n * 100) / 100;
}

/** Ranks entries by value descending (rank 1 = highest). Ties share a rank. */
export function rank(entries) {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  let lastValue = null;
  let lastRank = 0;
  return sorted.map((entry, i) => {
    if (entry.value !== lastValue) {
      lastRank = i + 1;
      lastValue = entry.value;
    }
    return { ...entry, rank: lastRank };
  });
}

/** Builds a CSV string from an array of row objects sharing the same keys. */
export function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const str = String(value ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(rows, filename) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}