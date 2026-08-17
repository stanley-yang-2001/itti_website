import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { REPORT_CATEGORIES } from '../constants/reportCategories.js';
import Reveal from '../components/Reveal.jsx';
import SEO from '../components/SEO.jsx';
import '../styles/Reports.css';

/**
 * Landing page at /reports - three CTA cards (browse, publish, peer
 * review), each navigating to its own dedicated page rather than
 * expanding in place. The actual report browser (category tabs,
 * pager, grid) lives at /reports/browse - see ReportsBrowse.jsx -
 * split out from here so all three cards behave the same way: a
 * real, shareable/bookmarkable page you navigate to.
 *
 * Still fetches the report list itself, but only for the "X reports
 * so far" count in the first card's copy - everything else that used
 * to live here (favorites, categories, the grid) moved to
 * ReportsBrowse.jsx along with the state it needs.
 */
export default function Reports() {
  const [totalReports, setTotalReports] = useState(null); // null = loading/unknown

  useEffect(() => {
    fetch('/api/reports')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) setTotalReports(data.length);
      })
      .catch(() => {}); // non-critical - copy just omits the count on failure
  }, []);

  return (
    <div className="reports-page">
      <SEO
        path="/reports"
        title="Reports"
        description="Published research reports and field bulletins from the International Truth & Trauma Institute, covering collective trauma documentation and trauma-informed governance."
      />
      <div className="reports-content">
        <Reveal delay={0}>
          <div className="reports-header">
            <div>
              <h1 className="display">Reports</h1>
              <p>Published research reports and field bulletins, and how to take part in producing them.</p>
            </div>
          </div>
        </Reveal>

        {/* ---------- Section 1: browse ---------- */}
        <Reveal delay={30}>
          <section className="reports-feature-section">
            <div className="reports-feature-text">
              <h2 className="reports-feature-heading">See the reports</h2>
              <p className="reports-feature-desc">
                Browse published research reports and field bulletins across{' '}
                {REPORT_CATEGORIES.length} sections
                {totalReports ? `, ${totalReports} report${totalReports === 1 ? '' : 's'} so far` : ''}.
              </p>
            </div>
            <Link className="btn btn-primary" to="/reports/browse">
              View Reports
            </Link>
          </section>
        </Reveal>

        {/* ---------- Section 2: publish ---------- */}
        <Reveal delay={60}>
          <section className="reports-feature-section">
            <div className="reports-feature-text">
              <h2 className="reports-feature-heading">Publish a report</h2>
              <p className="reports-feature-desc">
                Upload your own research, briefs, or bulletins for peer review. Publisher access is required —
                logged-out visitors will be asked to log in, and accounts without publisher access will see how
                to request it.
              </p>
            </div>
            <Link className="btn btn-primary" to="/reports/publish">
              Publish a Report
            </Link>
          </section>
        </Reveal>

        {/* ---------- Section 3: peer review ---------- */}
        <Reveal delay={90}>
          <section className="reports-feature-section">
            <div className="reports-feature-text">
              <h2 className="reports-feature-heading">Peer review</h2>
              <p className="reports-feature-desc">
                Review reports submitted by other publishers before they go public. Three approvals (or one from an
                admin) publish a report, and two disapprovals remove it; this also requires publisher access, with
                the same sign-in and access prompts as publishing.
              </p>
            </div>
            <Link className="btn btn-primary" to="/peer-review">
              Go to Peer Review
            </Link>
          </section>
        </Reveal>
      </div>
    </div>
  );
}