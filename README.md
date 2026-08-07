# International Truth & Trauma Institute (ITTI) — Website

This repository is the website for the **International Truth & Trauma
Institute (ITTI)**, a global research, policy, and advisory platform for the
systematic documentation and governance-informed analysis of collective
trauma exposure in fragile, conflict-affected, and post-authoritarian
societies. ITTI operates as a global research division of **Outlets for
Hope, Inc.** ([ofhusa.org](https://ofhusa.org)).

The site is where that research actually lives online: an interactive data
Observatory built around two of ITTI's own indices, a public library of
research reports, country-level profiles, a fellowship program, and a
catalog of professional certifications — plus the account system, donation
flow, and publishing workflow that support all of it.

Replace `<BASE_URL>` below with wherever the site is actually deployed
(e.g. `https://itti.org`) — it's left as a placeholder here since this repo
doesn't pin one fixed production URL.

## Vocabulary

A few terms recur throughout the site. Full technical definitions,
formulas, and data sources live on the [Docs](#docs) page; this is just
enough to navigate by:

- **GTBI (Global Trauma Burden Index)** — a population-level metric
  estimating cumulative trauma exposure across countries and regions.
- **ETTI (Election Trauma Temperature Index)** — a trauma-informed
  electoral risk monitoring framework, tracking psychosocial stress and
  instability signals around election cycles. Built from four component
  scores: **EVS** (Election Violence Severity), **TIE** (Threat &
  Intimidation Environment), **PDL** (Psychological Distress Load), and
  **ITS** (Institutional Trauma Score).
- **Observatory** — the site's interactive data tool: browse, chart, and
  compare GTBI/ETTI data across countries and years.
- **NTO (Nigeria Trauma Observatory)** — a fixed, fully worked example of
  the Observatory's tools, using real Nigeria data, inside the Observatory
  page.

## Sections of the site

### [Home](<BASE_URL>/)
The landing page: an interactive globe for exploring a single country's
GTBI/ETTI profile at a glance, and links into the rest of the site.
- [`#welcome`](<BASE_URL>/#welcome) — introduction
- [`#globe`](<BASE_URL>/#globe) — the interactive globe and country panel
- [`#explore`](<BASE_URL>/#explore) — shortcuts to other sections
- [`#connect`](<BASE_URL>/#connect) — ITTI's YouTube channel and Outlets for Hope

### [About](<BASE_URL>/about)
ITTI's mission, its relationship to Outlets for Hope, its research
frameworks, and who it serves.
- [`#overview`](<BASE_URL>/about#overview)
- [`#parent-org`](<BASE_URL>/about#parent-org) — Outlets for Hope
- [`#mission`](<BASE_URL>/about#mission)
- [`#observatories`](<BASE_URL>/about#observatories) — International Trauma Observatories
- [`#frameworks`](<BASE_URL>/about#frameworks) — GTBI, ETTI, and ITCS
- [`#advisory`](<BASE_URL>/about#advisory) — advisory & consulting work
- [`#who-we-serve`](<BASE_URL>/about#who-we-serve)
- [`#ethics`](<BASE_URL>/about#ethics)
- [`#why`](<BASE_URL>/about#why) — why this work matters
- [`#partnership`](<BASE_URL>/about#partnership) — partnership & funding
- [`#contact`](<BASE_URL>/about#contact)

### [Observatory](<BASE_URL>/observatory)
The interactive data tool: pick countries/years, build charts, view maps,
tables, and summary statistics across GTBI and ETTI. Includes the fixed
Nigeria (NTO) example.
- [`#international`](<BASE_URL>/observatory#international) — the interactive query tool
- [`#nigeria`](<BASE_URL>/observatory#nigeria) — the Nigeria worked example (NTO)

### [Reports](<BASE_URL>/reports)
Published research briefs and PDFs from ITTI. Signed-in users can favorite
reports here (see [Profile](#profile) below).

### [Country Profiles](<BASE_URL>/country-profiles)
Narrative, per-country write-ups, browsable alphabetically.
- Jump to a letter, e.g. [`#country-letter-A`](<BASE_URL>/country-profiles#country-letter-A)
- Link directly to one country's profile with `?code=`, e.g.
  [`?code=US`](<BASE_URL>/country-profiles?code=US) — expands that country's
  entry and scrolls it into view (this is a query parameter, not a hash,
  since it also drives which row is expanded)

### [Fellowship](<BASE_URL>/fellows)
ITTI's fellowship program: what it is, who it's for, and the people
currently in it.
- [`#about-fellowship`](<BASE_URL>/fellows#about-fellowship)
- [`#leadership`](<BASE_URL>/fellows#leadership)
- [`#our-fellows`](<BASE_URL>/fellows#our-fellows)

### [Certifications](<BASE_URL>/certifications)
ITTI's catalog of professional certifications, with enrollment and
payment.
- [`#overview`](<BASE_URL>/certifications#overview)
- [`#cert-grid`](<BASE_URL>/certifications#cert-grid) — browse/search all certifications
- Jump to a specific certification by its code, e.g.
  [`#cert-ETTI-101`](<BASE_URL>/certifications#cert-ETTI-101)
- [`#compare`](<BASE_URL>/certifications#compare) — side-by-side comparison table

### [Contact](<BASE_URL>/contact)
Direct addresses for different parts of the institute.
- [`#contact`](<BASE_URL>/contact#contact) — general inquiries
- [`#fellowship`](<BASE_URL>/contact#fellowship)
- [`#chancellor`](<BASE_URL>/contact#chancellor)
- [`#press`](<BASE_URL>/contact#press)
- [`#support`](<BASE_URL>/contact#support)

### [Docs](<BASE_URL>/docs)
Technical documentation for the Observatory's data: methodology,
formulas, sources, and known gaps behind every GTBI/ETTI figure shown on
the site.
- [`#user-guide`](<BASE_URL>/docs#user-guide)
- [`#overview`](<BASE_URL>/docs#overview)
- [`#etti`](<BASE_URL>/docs#etti) — ETTI methodology and formulas
- [`#gtbi`](<BASE_URL>/docs#gtbi) — GTBI methodology and formulas
- [`#gtbi-sources`](<BASE_URL>/docs#gtbi-sources)
- [`#nto-map`](<BASE_URL>/docs#nto-map) — Nigeria stressor map references
- [`#conventions`](<BASE_URL>/docs#conventions) — data conventions

### [Donate](<BASE_URL>/donate)
Support ITTI's research directly.

### [Privacy Policy](<BASE_URL>/privacy)
Privacy practices, intellectual property/copyright policy, certification
course terms, account policy, and AI/LLM use policy.
- [`#overview`](<BASE_URL>/privacy#overview)
- [`#information-we-collect`](<BASE_URL>/privacy#information-we-collect)
- [`#how-we-use`](<BASE_URL>/privacy#how-we-use)
- [`#information-sharing`](<BASE_URL>/privacy#information-sharing)
- [`#your-rights`](<BASE_URL>/privacy#your-rights)
- [`#retention-security`](<BASE_URL>/privacy#retention-security)
- [`#children`](<BASE_URL>/privacy#children)
- [`#ip-copyright`](<BASE_URL>/privacy#ip-copyright)
- [`#certification-terms`](<BASE_URL>/privacy#certification-terms)
- [`#account-policy`](<BASE_URL>/privacy#account-policy)
- [`#ai-policy`](<BASE_URL>/privacy#ai-policy)
- [`#changes`](<BASE_URL>/privacy#changes)
- [`#contact`](<BASE_URL>/privacy#contact)

### Account pages
- [Sign up](<BASE_URL>/signup)
- [Log in](<BASE_URL>/login)
- [Forgot password](<BASE_URL>/forgot-password)

### [Profile](<BASE_URL>/profile) *(requires sign-in)*
A signed-in user's own space: their info, saved Observatory charts and
favorited reports, their published reports (if they have publishing
access), and account settings.
- [`#profile`](<BASE_URL>/profile#profile) — account info
- [`#favorites`](<BASE_URL>/profile#favorites) — saved charts and favorited reports
- [`#publications`](<BASE_URL>/profile#publications) — a publisher's own uploaded reports
- [`#settings`](<BASE_URL>/profile#settings) — name, password, profile picture, account deletion

Saved Observatory charts and favorited reports here link back into the
[Observatory](#observatory) and [Reports](#reports) pages respectively, so
you land on the actual data or document, not just a summary card.

### [Settings](<BASE_URL>/settings) *(requires sign-in)*
The same account settings as the Profile page's Settings tab, also
reachable as its own page.

## Accounts and access

Anyone can browse most of the site without an account. Signing in (via
Google or email/password) unlocks saving Observatory charts, favoriting
reports, enrolling in certifications, and donating.

Beyond that, the site has a small number of internal access tiers for
people who publish content on ITTI's behalf (uploading research reports)
or administer the platform. These aren't self-service — if you believe you
should have publishing access, use the [Contact](#contact) page.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for how this site is
deployed, and [`docs/DONATIONS_SETUP.md`](docs/DONATIONS_SETUP.md) for the
one-time setup the donation flow needs.