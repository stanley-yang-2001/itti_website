// Fellowship level definitions, from FITTI_Executive_Deck.pdf. If the deck
// is revised, re-sync FELLOW_LEVELS so the Fellowship page keeps matching
// the authoritative language.

export const FELLOW_LEVELS = [
  {
    code: 'AFITTI',
    name: 'Associate Fellow',
    tag: 'Emerging Leaders',
    description: 'Designated for students, early-career professionals, humanitarian workers, educators, journalists, and activists.'
  },
  {
    code: 'FITTI',
    name: 'Professional Fellow',
    tag: 'Flagship — Senior Professionals',
    description: 'Flagship professional fellowship for senior practitioners, policymakers, researchers, and institutional leaders.'
  },
  {
    code: 'SFITTI',
    name: 'Senior Fellow',
    tag: 'Invitation Only',
    description: 'Invitation-only senior fellowship for diplomats, ministers, professors, commissioners, and global experts.'
  },
  {
    code: 'DFITTI',
    name: 'Distinguished Fellow',
    tag: 'Honorary',
    description: 'Honorary distinction recognizing internationally influential peacebuilders, trauma scholars, and humanitarian leaders.'
  }
];

export const WHO_SHOULD_APPLY = [
  'Government officials', 'Ministers of Health', 'Ministers of Justice', 'Diplomats', 'UN and WHO officials',
  'Security experts and heads of police or military institutions', 'University presidents and faculty',
  'Foundation and nonprofit leaders', 'Judges and commissioners', 'Peacebuilding leaders',
  'Humanitarian executives', 'Senior clinicians', 'Military medical leaders',
  'Community leaders and institutional heads', 'Individuals with a proven interest in collective trauma programs'
];

export const EXECUTIVE_VALUE = [
  'Access to a high-level international network of leaders and institutions.',
  'Thought leadership through publications, policy dialogue, and strategic missions.',
  'Opportunity to shape trauma-informed governance, observatories, and national recovery frameworks.',
  'Recognition through the FITTI™ designation and lifelong affiliation with ITTI.'
];

export const FELLOWS_GAIN = [
  'International Recognition',
  'Strategic Global Network',
  'Thought Leadership Platform',
  'Institutional Influence',
  'Lifelong FITTI™ Designation'
];

// The roster is intentionally empty until ITTI has real Fellows to list.
// Each entry should follow this shape once fellows are announced:
//   {
//     id: 'unique-slug',
//     name: 'Full Name',
//     level: 'AFITTI' | 'FITTI' | 'SFITTI' | 'DFITTI',   // must match a FELLOW_LEVELS code
//     bio: 'Short biography.',
//     photo: '/fellows/<slug>.jpg'                         // optional; falls back to initials
//   }
export const FELLOWS = [];