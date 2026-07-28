import { useEffect, useState } from 'react';
import '../styles/AdminDonations.css';

const PAGE_SIZE = 25;

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatTotal(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Admin-only donations list (server-gated via @roles_required("admin") on
 * /api/donations - this page's own ProtectedRoute check is a UX
 * convenience, not the actual security boundary). Lets staff look up a
 * gift by confirmation code/name/email, e.g. when a donor calls in
 * asking about their receipt, and see a running lifetime total.
 */
export default function AdminDonations() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [offset, setOffset] = useState(0);

  const [donations, setDonations] = useState([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ count: 0, total_cents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce the search box so we're not firing a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Any filter change resets to page 1.
  useEffect(() => {
    setOffset(0);
  }, [status, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (status) params.set('status', status);
    if (debouncedSearch) params.set('q', debouncedSearch);

    fetch(`/api/donations?${params.toString()}`, { credentials: 'include', signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load donations.');
        return data;
      })
      .then((data) => {
        setDonations(data.donations);
        setTotal(data.total);
        setTotals(data.totals);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [status, debouncedSearch, offset]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="admin-donations-page">
      <div className="admin-donations-header">
        <h1 className="display">Donations</h1>
        <p className="admin-donations-subtitle">
          {totals.count.toLocaleString()} succeeded donation{totals.count === 1 ? '' : 's'} totaling{' '}
          <strong>{formatTotal(totals.total_cents)}</strong>.
        </p>
      </div>

      <div className="admin-donations-controls">
        <input
          type="search"
          placeholder="Search name, email, or confirmation code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-donations-search"
        />
        <div className="admin-donations-status-filters">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`admin-donations-status-chip${status === f.value ? ' active' : ''}`}
              onClick={() => setStatus(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="admin-donations-error">{error}</p>}

      <div className="admin-donations-table-wrap">
        <table className="admin-donations-table">
          <thead>
            <tr>
              <th>Confirmation</th>
              <th>Donor</th>
              <th>Email</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="admin-donations-empty">Loading…</td></tr>
            )}
            {!loading && donations.length === 0 && (
              <tr><td colSpan={6} className="admin-donations-empty">No donations match these filters.</td></tr>
            )}
            {!loading && donations.map((d) => (
              <tr key={d.id}>
                <td className="mono">{d.confirmation_code}</td>
                <td>{d.first_name} {d.last_name}</td>
                <td>{d.email}</td>
                <td className="mono">{d.amount_display}</td>
                <td><span className={`admin-donations-status-badge status-${d.status}`}>{d.status}</span></td>
                <td>{formatDate(d.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="admin-donations-pagination">
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            Previous
          </button>
          <span>Page {page} of {pageCount}</span>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}