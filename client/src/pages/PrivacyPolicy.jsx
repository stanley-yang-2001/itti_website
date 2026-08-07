import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Reveal from '../components/Reveal.jsx';
import '../styles/About.css';

const EFFECTIVE_DATE = 'July 30, 2026';

// Shared with About.jsx/Docs.jsx: this site's html/body sizing makes
// <body> the actual scrolling container rather than the window.
function getScroller() {
  const candidate = document.scrollingElement;
  if (candidate && candidate.scrollHeight > candidate.clientHeight) return candidate;
  return document.body;
}

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'information-we-collect', label: 'Information We Collect' },
  { id: 'how-we-use', label: 'How We Use Your Information' },
  { id: 'information-sharing', label: 'Information Sharing' },
  { id: 'your-rights', label: 'Your Rights and Choices' },
  { id: 'retention-security', label: 'Data Retention & Security' },
  { id: 'children', label: "Children's Privacy" },
  { id: 'ip-copyright', label: 'Intellectual Property & Copyright' },
  { id: 'certification-terms', label: 'Certification Course Terms' },
  { id: 'account-policy', label: 'Account Policy' },
  { id: 'ai-policy', label: 'AI & LLM Use Policy' },
  { id: 'changes', label: 'Changes to This Policy' },
  { id: 'contact', label: 'Contact Us' },
];

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const sectionRefs = useRef({});
  const { hash } = useLocation();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-12% 0px -55% 0px', threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));

    const scroller = getScroller();
    function onScroll() {
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) {
        setActiveSection(SECTIONS[SECTIONS.length - 1].id);
      }
    }
    scroller.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', onScroll);
    };
  }, []);

  function registerSection(id) {
    return (el) => {
      sectionRefs.current[id] = el;
    };
  }

  function scrollToSection(id) {
    const el = sectionRefs.current[id];
    if (!el) return;
    const scroller = getScroller();
    const navbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 0;
    const top = el.getBoundingClientRect().top + scroller.scrollTop - navbarHeight - 16;
    scroller.scrollTo({ top, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!hash) return;
    scrollToSection(hash.slice(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  return (
    <div className="about-page">
      <Reveal delay={0}>
        <section className="about-hero">
          <img src="/itti-logo.png" alt="ITTI seal" className="about-hero-seal" />
          <p className="about-hero-eyebrow mono">International Truth &amp; Trauma Institute</p>
          <h1 className="about-hero-title display">Privacy Policy &amp; Terms</h1>
          <p className="about-hero-tagline">Effective {EFFECTIVE_DATE}</p>
        </section>
      </Reveal>

      <div className="about-layout">
        <nav className="about-index" aria-label="Privacy policy sections">
          <p className="about-index-label mono">On this page</p>
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  className={`about-index-item${activeSection === s.id ? ' active' : ''}`}
                  onClick={() => scrollToSection(s.id)}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="about-content">
          <Reveal delay={0}>
            <section id="overview" ref={registerSection('overview')} className="about-section">
              <h2 className="about-section-title display">Overview</h2>
              <p>
                This policy explains what information the International Truth &amp; Trauma Institute ("ITTI,"
                "we," "us") collects when you create an account on this website, how we use it, who we share it
                with, and the choices and rights you have over it. It applies to account creation, sign-in, and
                the account-connected features on this site (Observatory saved charts, favorited reports,
                donations, and certification enrollment).
              </p>
              <p>
                Beyond privacy, this page also sets out ITTI's intellectual property and copyright terms,
                certification course terms of use, account policy, and AI/LLM use policy — together, the full
                set of terms governing use of this site and its certification programs.
              </p>
              <p>
                This policy describes our current practices as implemented on this website. It is not a
                substitute for legal advice, and if you need this policy to satisfy a specific legal or
                regulatory requirement, please have it reviewed by counsel.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.05}>
            <section id="information-we-collect" ref={registerSection('information-we-collect')} className="about-section">
              <h2 className="about-section-title display">Information We Collect</h2>
              <p><strong>When you create an account</strong>, we collect:</p>
              <ul className="about-bullet-list">
                <li>Your email address (required)</li>
                <li>A securely hashed version of your password, if you sign up with email/password. We never store your password in plain text, and no one at ITTI can view it.</li>
                <li>Your name, if you provide one</li>
              </ul>

              <p><strong>If you sign in with Google instead</strong>, Google provides us with:</p>
              <ul className="about-bullet-list">
                <li>Your email address, name, and profile picture, as returned by your Google account</li>
                <li>A unique Google account identifier, used only to recognize your account on future sign-ins</li>
              </ul>
              <p>
                We do not receive your Google password, and we do not send your information back to Google
                beyond the standard sign-in request itself — see "Information Sharing" below.
              </p>

              <p><strong>As you use the site</strong>, depending on which features you use, we may also collect:</p>
              <ul className="about-bullet-list">
                <li>Your account role (e.g. standard user, publisher, administrator) and account status</li>
                <li>An internal log of account activity (e.g. document or report uploads/edits), used for accountability and troubleshooting</li>
                <li>Charts you save on the Observatory page</li>
                <li>Reports you mark as favorites</li>
                <li>If you donate: your name, email, donation amount, and a payment confirmation record. Your card details are collected and processed directly by Stripe, our payment processor — we never receive or store your full card number.</li>
                <li>If you enroll in a certification: the certification, tuition amount, and a payment confirmation record, tied to your account. As with donations, card details are handled directly by Stripe.</li>
                <li>If you're a publisher or administrator: the documents and reports you upload, and your name as the credited author/publisher where applicable (for example, on a published report's byline)</li>
              </ul>
            </section>
          </Reveal>

          <Reveal delay={0.05}>
            <section id="how-we-use" ref={registerSection('how-we-use')} className="about-section">
              <h2 className="about-section-title display">How We Use Your Information</h2>
              <p>We use the information above to:</p>
              <ul className="about-bullet-list">
                <li>Create and secure your account, and let you sign in</li>
                <li>Process enrollments and deliver certifications</li>
                <li>Verify credentials and issue certificates</li>
                <li>Maintain professional directory listings, where applicable</li>
                <li>Attribute content you publish (for example, showing a publisher's name on a report they authored)</li>
                <li>Send account-related emails, such as password reset links, donation receipts, and certification enrollment confirmations</li>
                <li>Process payments for donations and certification tuition, in partnership with Stripe</li>
                <li>Maintain an internal record of account activity for accountability, troubleshooting, and abuse prevention</li>
                <li>Improve courses and provide features you choose to use, like saved Observatory charts and favorited reports</li>
                <li>Respond to inquiries, prevent fraud, and comply with legal obligations</li>
              </ul>
              <p>
                We do not sell your personal information, and we do not use it for third-party advertising. This
                site does not currently show ads.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.05}>
            <section id="information-sharing" ref={registerSection('information-sharing')} className="about-section">
              <h2 className="about-section-title display">Information Sharing</h2>
              <p>We do not share your account information with third parties, with two specific exceptions:</p>
              <ul className="about-bullet-list">
                <li>
                  <strong>Google (only if you choose to sign in with Google):</strong> information flows from
                  Google to us when you use Google sign-in, so we can create and recognize your account. We do
                  not send your account information to Google in return.
                </li>
                <li>
                  <strong>Stripe (only if you make a donation or enroll in a certification):</strong> Stripe
                  processes your payment directly and securely. We share the minimum information necessary to
                  process the transaction (such as your name, email, and the amount) and receive back a
                  confirmation of payment — never your full card details.
                </li>
              </ul>
              <p>We do not sell, rent, or otherwise share your information with any other third party.</p>
            </section>
          </Reveal>

          <Reveal delay={0.05}>
            <section id="your-rights" ref={registerSection('your-rights')} className="about-section">
              <h2 className="about-section-title display">Your Rights and Choices</h2>
              <p>You can, at any time:</p>
              <ul className="about-bullet-list">
                <li><strong>View</strong> your account information from your <Link to="/profile">Profile</Link> page</li>
                <li><strong>Update</strong> your name, email, or password from your <Link to="/settings">Settings</Link> page</li>
                <li>
                  <strong>Delete your account</strong> from Settings. This deactivates your account immediately;
                  if you sign back in or sign up again with the same email afterward, your account (and its
                  history) is reactivated rather than recreated from scratch.
                </li>
                <li>
                  <strong>Request a copy of your data, or full erasure of it,</strong> by{' '}
                  <Link to="/contact">contacting us</Link>. We don't yet offer a self-service export tool, so
                  this is handled manually.
                </li>
              </ul>
              <p>
                Depending on where you live, you may have additional rights under applicable law — for example,
                the right to data portability or to lodge a complaint with a data protection authority. Contact
                us to exercise any of these rights.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.05}>
            <section id="retention-security" ref={registerSection('retention-security')} className="about-section">
              <h2 className="about-section-title display">Data Retention &amp; Security</h2>
              <p>
                We retain account information for as long as your account is active, plus a reasonable period
                after deletion to support account recovery (see "Your Rights and Choices" above) and to meet our
                own recordkeeping and legal obligations (for example, payment and donation records). Passwords
                are stored using a one-way cryptographic hash, never in plain text. Payment card details are
                never stored on our servers — they're handled directly by Stripe, a PCI-compliant payment
                processor.
              </p>
              <p>
                We use commercially reasonable safeguards to protect the information described in this policy.
                However, no method of transmission over the internet, and no method of electronic storage, can
                be guaranteed to be 100% secure.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.05}>
            <section id="children" ref={registerSection('children')} className="about-section">
              <h2 className="about-section-title display">Children's Privacy</h2>
              <p>
                This site is not directed at children, and we do not knowingly collect information from
                children. If you believe a child has created an account, please contact us and we will address
                it.
              </p>
            </section>
          </Reveal>

          {/* ---------- New: Intellectual Property & Copyright ---------- */}
          <Reveal delay={0.05}>
            <section id="ip-copyright" ref={registerSection('ip-copyright')} className="about-section">
              <h2 className="about-section-title display">Intellectual Property, Copyright &amp; Proprietary Materials Policy</h2>
              <p>
                Everything published on ITTI is proprietary unless expressly stated otherwise. This includes,
                but is not limited to: certification curricula, learning modules, presentations, instructor
                guides, videos, slides, graphics, assessments, examinations, workbooks, research reports,
                dashboards, country profiles, Observatory materials, methodologies, analytical frameworks,
                scoring systems, templates, checklists, toolkits, capstone materials, digital badges, logos,
                trademarks, names, branding, website design, databases, software, and downloadable resources —
                including all future revisions.
              </p>

              <h3 className="about-subsection-title display">Proprietary Methodologies</h3>
              <p>The following are proprietary intellectual property of ITTI:</p>
              <ul className="about-bullet-list">
                <li>Election Trauma Temperature Index (ETTI™)</li>
                <li>Global Trauma Burden Indicator (GTBI™)</li>
                <li>National Truth &amp; Trauma Commission (NTTC™)</li>
                <li>International Trauma Observatory</li>
                <li>Trauma Observatory Framework</li>
                <li>ITTI Professional Certification System</li>
                <li>ITTI Fellowship System</li>
              </ul>
              <p>and any related scoring systems, frameworks, algorithms, analytical models, visualizations, manuals, or derivative works.</p>

              <h3 className="about-subsection-title display">Ownership</h3>
              <p>
                Purchasing a course does <strong>not</strong> transfer ownership. Participants receive only a
                limited, non-transferable license for personal professional learning. Ownership always remains
                with ITTI.
              </p>

              <h3 className="about-subsection-title display">No Unauthorized Use</h3>
              <p>Without written permission you may not:</p>
              <ul className="about-bullet-list">
                <li>Copy, photograph, screenshot, record, film, or livestream ITTI materials</li>
                <li>Translate, republish, upload, share, distribute, or resell them</li>
                <li>Modify them or create derivative works from them</li>
                <li>Teach using ITTI materials, or train others using them</li>
                <li>Post them online, or upload them to AI systems — including ChatGPT, Claude, Gemini, Copilot, DeepSeek, or similar systems — for redistribution or model training</li>
                <li>Sell summaries of ITTI materials, or repackage their content</li>
                <li>Create competing certifications, or reverse engineer ITTI's methodologies</li>
                <li>Duplicate ITTI's examinations, toolkits, dashboards, country profiles, or Observatory materials</li>
              </ul>

              <h3 className="about-subsection-title display">Printed &amp; Digital Materials</h3>
              <p>
                Printing or downloading ITTI materials does <strong>not</strong> transfer ownership. Printed
                materials remain protected by United States copyright law, international copyright treaties,
                trademark law, and intellectual property law — this protection continues permanently regardless
                of format. Downloaded files remain equally protected.
              </p>

              <h3 className="about-subsection-title display">Violations</h3>
              <p>Unauthorized use may result in:</p>
              <ul className="about-bullet-list">
                <li>Termination of account and revocation of certifications</li>
                <li>Permanent removal from ITTI platforms</li>
                <li>Legal action, civil damages, and injunctive relief</li>
                <li>Recovery of attorney fees where permitted by law</li>
              </ul>
            </section>
          </Reveal>

          {/* ---------- New: Certification Course Terms ---------- */}
          <Reveal delay={0.05}>
            <section id="certification-terms" ref={registerSection('certification-terms')} className="about-section">
              <h2 className="about-section-title display">Certification Course Terms of Use</h2>
              <p>Enrollment grants participants a limited license to complete the certification. Participants may:</p>
              <ul className="about-bullet-list">
                <li>View lessons</li>
                <li>Download approved resources</li>
                <li>Complete assignments</li>
                <li>Earn certification</li>
              </ul>
              <p>Participants may not redistribute any course materials. Certification does not authorize participants to:</p>
              <ul className="about-bullet-list">
                <li>Teach ITTI curriculum, or certify others</li>
                <li>License ITTI materials to third parties</li>
                <li>Represent themselves as speaking or acting on behalf of ITTI</li>
                <li>Modify ITTI's proprietary methodologies</li>
              </ul>
            </section>
          </Reveal>

          {/* ---------- New: Account Policy ---------- */}
          <Reveal delay={0.05}>
            <section id="account-policy" ref={registerSection('account-policy')} className="about-section">
              <h2 className="about-section-title display">Account Creation &amp; User Account Policy</h2>
              <p>To access portions of ITTI you may create an account. You agree to:</p>
              <ul className="about-bullet-list">
                <li>Provide accurate information, and keep it current</li>
                <li>Protect your password and maintain its confidentiality</li>
                <li>Notify ITTI promptly of any unauthorized access to your account</li>
              </ul>
              <p>
                Each account is for <strong>one individual only.</strong> Accounts may not be shared, loaned,
                sold, transferred, or leased. Multiple simultaneous logins on one account may result in
                suspension.
              </p>

              <h3 className="about-subsection-title display">Account Suspension</h3>
              <p>ITTI may suspend or terminate accounts for:</p>
              <ul className="about-bullet-list">
                <li>Copyright violations or misuse of trademarks</li>
                <li>Credential fraud, cheating, or false identity</li>
                <li>Harassment or unauthorized sharing of materials or account access</li>
                <li>Reverse engineering of ITTI methodologies</li>
                <li>Payment fraud, or attempts to circumvent site security</li>
              </ul>

              <h3 className="about-subsection-title display">Certification Records</h3>
              <p>
                ITTI maintains certification records for credential verification. Credential status may be
                Active, Expired, Suspended, or Revoked. Revocation may occur for academic dishonesty, unethical
                conduct, misuse of an ITTI designation, or violation of ITTI policies.
              </p>
            </section>
          </Reveal>

          {/* ---------- New: AI & LLM Use Policy ---------- */}
          <Reveal delay={0.05}>
            <section id="ai-policy" ref={registerSection('ai-policy')} className="about-section">
              <h2 className="about-section-title display">Artificial Intelligence &amp; Large Language Model Use Policy</h2>
              <p>
                Because ITTI's certifications and methodologies are unique proprietary work, this policy sets
                out how AI and large language model (LLM) tools may and may not be used in connection with them.
              </p>
              <p>Unless expressly authorized in writing by ITTI, no person or organization may use ITTI materials to:</p>
              <ul className="about-bullet-list">
                <li>Train or fine-tune artificial intelligence models</li>
                <li>Create derivative AI-generated educational content</li>
                <li>Build competing certification programs</li>
                <li>Develop automated tutoring systems using ITTI content</li>
                <li>Scrape, mine, or systematically extract ITTI materials</li>
                <li>Reproduce ITTI methodologies through AI-assisted tools</li>
              </ul>
              <p>
                Participants may use publicly available AI tools for personal study assistance, but may not
                upload substantial portions of ITTI's proprietary materials, examinations, manuals, toolkits, or
                assessment content into AI platforms if doing so would reproduce, distribute, or compromise
                ITTI's intellectual property.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.05}>
            <section id="changes" ref={registerSection('changes')} className="about-section">
              <h2 className="about-section-title display">Changes to This Policy</h2>
              <p>
                If we make material changes to this policy, we'll update the effective date above. Continuing to
                use your account after a change means you accept the updated policy.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.05}>
            <section id="contact" ref={registerSection('contact')} className="about-section">
              <h2 className="about-section-title display">Contact Us</h2>
              <p>
                Questions about this policy, or requests regarding your data, can be sent through our{' '}
                <Link to="/contact">Contact page</Link>, or to <a href="mailto:support@ittiglobal.org">support@ittiglobal.org</a>.
              </p>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}