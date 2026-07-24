import {
  GTBI_SOURCES, GTBI_FORMULA_NOTES, GTBI_KNOWN_GAP, GTBI_INTERPRETATION_SHORT, GTBI_PANEL_SUMMARY,
  ETTI_METHODOLOGY_NOTES, ETTI_KNOWN_GAP, ETTI_INTERPRETATION_SHORT, ETTI_PANEL_SUMMARY,
  UNDERLYING_EVENT_SOURCE,
} from "../data/observatoryReferences.js";
import "../styles/Docs.css";

export default function Docs() {
  return (
    <div className="docs-page">
      <div className="docs-header">
        <h1 className="display">Documentation &amp; References</h1>
        <p className="docs-subheading">
          Data sources, methodology, and how to interpret the Observatory's ETTI and GTBI figures.
        </p>
      </div>

      <section className="docs-section">
        <h2>Shared data source</h2>
        <p>{UNDERLYING_EVENT_SOURCE}</p>
      </section>

      <section className="docs-section">
        <h2>ETTI — Election Trauma Temperature Index</h2>
        <p className="docs-interpretation">{ETTI_INTERPRETATION_SHORT}</p>
        <p>{ETTI_PANEL_SUMMARY}</p>
        <p className="docs-known-gap">{ETTI_KNOWN_GAP}</p>
        <div className="docs-cards">
          {ETTI_METHODOLOGY_NOTES.map((item) => (
            <div key={item.variable} className="docs-card">
              <h3>{item.variable}</h3>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="docs-section">
        <h2>GTBI — Global Trauma Burden Index</h2>
        <p className="docs-interpretation">{GTBI_INTERPRETATION_SHORT}</p>
        <p>{GTBI_PANEL_SUMMARY}</p>
        <p className="docs-known-gap">{GTBI_KNOWN_GAP}</p>

        <h3 className="docs-subheading-h3">Formula</h3>
        <ul className="docs-formula-list">
          {GTBI_FORMULA_NOTES.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>

        <h3 className="docs-subheading-h3">Sources</h3>
        <div className="docs-sources-table-wrap">
          <table className="docs-sources-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Citation</th>
                <th>Used for</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {GTBI_SOURCES.map((s) => (
                <tr key={s.id}>
                  <td className="docs-source-id">{s.id}</td>
                  <td>{s.citation}</td>
                  <td>{s.usedFor}</td>
                  <td>{s.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="docs-section">
        <h2>Missing-value convention</h2>
        <p>
          Any variable without a usable number is recorded as <code>"Data Pending"</code> rather than a null or a
          numeric placeholder like <code>-1</code>, so it's never mistaken for a real value in a chart or export.
          A country with no recorded years at all for an indicator still has that indicator's section present, with
          a single <code>"Data Pending"</code> year.
        </p>
      </section>
    </div>
  );
}