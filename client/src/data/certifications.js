// Structured content for the Certifications page, extracted from
// ITTI_CERTIFICATIONS.docx. If that document is revised, re-sync the
// affected certification(s) below so the page keeps matching the
// authoritative copy. Category groupings and ranking follow the docx's
// own "ARRANGE IN THIS ORDER ON WEBSITE" instructions.

export const CATEGORIES = [
  { id: 'popular', label: 'Most Popular Professional Certifications' },
  { id: 'global', label: 'Global Analyst & Specialist Certifications' },
  { id: 'executive', label: 'Executive & Advanced Fellowship Credentials' }
];

export const CERTIFICATIONS = [
  {
    rank: 1,
    code: 'CTICP',
    category: 'popular',
    badge: 'MOST POPULAR',
    ctaVerb: 'Enroll',
    image: '/certifications/cticp.jpg',
    name: 'Certified Trauma-Informed Care Practitioner',
    tagline: 'Strengthen frontline care through safety, trust, compassion, and trauma-informed communication.',
    focus: 'Trauma-informed frontline care, communication, safety, and prevention of retraumatization',
    duration: '4 weeks',
    delivery: 'Guided online certification with lessons, practical exercises, case studies, and applied assignments',
    timeCommitment: 'Approximately 4–5 hours per week',
    tuition: '$349',
    credential: 'CTICP™ — Certified Trauma-Informed Care Practitioner',
    finalRequirement: 'Trauma-informed care knowledge assessment and applied practice plan',
    overview: [
      'Prepares frontline professionals to recognize the effects of trauma and apply trauma-informed principles in everyday interactions, services, and care environments.',
      'Trauma can influence how people communicate, respond to authority, process information, build trust, manage emotions, and engage with services — without appropriate training, even well-intended practices may unintentionally increase distress.',
      'Equips participants with practical strategies for creating safer, more respectful, culturally responsive, and person-centered interactions, emphasizing communication, emotional safety, de-escalation, resilience, and the prevention of retraumatization.'
    ],
    whoLabel: 'Who Should Enroll?',
    who: [
      'Nurses and other healthcare professionals', 'Social workers and case managers', 'Mental health and behavioral health staff',
      'Direct-care and residential-support professionals', 'Community health workers', 'Teachers, school staff, and youth workers',
      'Humanitarian and refugee-support personnel', 'Faith and community leaders', 'Probation, correctional, and public-safety personnel',
      'Nonprofit and social-service professionals'
    ],
    whoNote: 'No advanced clinical degree is required.',
    curriculum: [
      { week: 1, title: 'Understanding Trauma and Its Effects', bullets: ['Acute, chronic, complex, collective, and historical trauma', 'Adverse experiences and cumulative stress', 'How trauma affects behavior, emotions, memory, and trust', 'Trauma-informed care vs. trauma treatment'] },
      { week: 2, title: 'Safety, Trust, and Trauma-Informed Communication', bullets: ['Physical and emotional safety', 'Choice, collaboration, and empowerment', 'Cultural humility and active listening', 'Professional boundaries and person-centered delivery'] },
      { week: 3, title: 'Responding Without Retraumatizing', bullets: ['De-escalation principles', 'Trauma-sensitive responses to distress', 'Referral and escalation boundaries', 'Secondary traumatic stress and compassion fatigue'] },
      { week: 4, title: 'Applied Trauma-Informed Practice', bullets: ['Case-based decision-making', 'Analysis of a frontline care environment', 'Trauma-informed interaction plan', 'Final certification assessment'] }
    ],
    outcomes: [
      'Recognize common signs and effects of trauma', 'Communicate more safely and respectfully with trauma-affected individuals',
      'Reduce practices that may unintentionally retraumatize people', 'Promote choice, dignity, trust, and collaboration',
      'Use basic de-escalation and emotional-safety strategies', 'Recognize when referral to a licensed professional is appropriate'
    ],
    requirements: ['Complete all required learning modules', 'Participate in assigned case exercises', 'Pass the final knowledge assessment', 'Complete an applied trauma-informed practice plan', 'Agree to the ITTI professional standards and ethical-use statement'],
    credentialPackage: ['CTICP™ professional certificate', 'Digital credential badge', 'Certificate-verification access', 'Eligibility for listing in the ITTI professional directory', 'Eligibility to pursue advanced ITTI certifications and fellowship pathways'],
    notice: 'CTICP™ is a professional-development credential issued by the International Truth and Trauma Institute. It is not a clinical license, treatment qualification, or substitute for professional licensure.'
  },
  {
    rank: 2,
    code: 'CWMHRP',
    category: 'popular',
    badge: 'MOST POPULAR',
    ctaVerb: 'Enroll',
    image: '/certifications/cwmhrp.jpg',
    name: 'Certified Workplace Mental Health & Resilience Practitioner',
    tagline: 'Build healthier workplaces through psychological safety, resilience, and mental health-informed leadership.',
    focus: 'Workplace mental health, psychological safety, employee wellbeing, and organizational resilience',
    duration: '4 weeks',
    delivery: 'Online certification with guided lessons, workplace case studies, practical tools, and applied assignments',
    timeCommitment: 'Approximately 4–5 hours per week',
    tuition: '$499',
    credential: 'CWMHRP™ — Certified Workplace Mental Health & Resilience Practitioner',
    finalRequirement: 'Workplace mental health and resilience action plan',
    overview: [
      'Prepares professionals to recognize workplace mental health risks, strengthen psychological safety, support employee wellbeing, and contribute to more resilient organizational cultures.',
      'Workplace mental health is affected by leadership practices, workload, organizational change, violence, harassment, discrimination, burnout, traumatic events, and institutional distrust.',
      'Equips participants to identify workplace psychosocial risks and support practical, nonclinical strategies that improve communication, trust, resilience, and organizational response.'
    ],
    whoLabel: 'Who Should Enroll?',
    who: [
      'Human-resource professionals', 'Supervisors and managers', 'Occupational-health and employee-wellbeing personnel',
      'Organizational-development professionals', 'Training and staff-development specialists', 'Healthcare and behavioral health leaders',
      'School and university administrators', 'Nonprofit and humanitarian managers', 'Safety and risk-management personnel',
      'Diversity, equity, inclusion, and belonging professionals'
    ],
    whoNote: 'No clinical license is required.',
    curriculum: [
      { week: 1, title: 'Workplace Mental Health and Psychosocial Risk', bullets: ['Psychosocial hazards and burnout', 'Workplace trauma', 'Bullying, harassment, discrimination, and violence', 'Absenteeism, presenteeism, and disengagement'] },
      { week: 2, title: 'Psychological Safety and Supportive Leadership', bullets: ['Trust and respectful communication', 'Supportive supervision and employee voice', 'Trauma-informed leadership', 'Boundaries between supervision, support, and clinical care'] },
      { week: 3, title: 'Responding to Distress, Crisis, and Workplace Trauma', bullets: ['Supportive conversations and referral pathways', 'Emergency and crisis escalation', 'Workplace violence and critical incidents', 'Secondary traumatic stress and compassion fatigue'] },
      { week: 4, title: 'Organizational Resilience and Action Planning', bullets: ['Workplace mental health assessment', 'Review of policies, communication, and referral systems', 'Workplace resilience action plan', 'Final certification assessment'] }
    ],
    outcomes: [
      'Identify common workplace mental health and psychosocial risks', 'Recognize signs that an employee may require support',
      'Strengthen psychological safety within teams', 'Support resilience during organizational change or crisis',
      'Distinguish managerial support from clinical diagnosis or treatment', 'Develop a workplace mental health and resilience action plan'
    ],
    requirements: ['Complete all required learning modules', 'Participate in assigned workplace case exercises', 'Pass the final knowledge assessment', 'Complete a workplace mental health and resilience action plan', 'Agree to the ITTI professional standards and scope-of-practice statement'],
    credentialPackage: ['CWMHRP™ professional certificate', 'Digital credential badge', 'Workplace mental health assessment toolkit', 'Supportive-conversation guide', 'Certificate-verification access', 'Eligibility for listing in the ITTI professional directory'],
    notice: 'CWMHRP™ is a professional-development credential issued by the International Truth and Trauma Institute. It is not a clinical license, mental health treatment qualification, or substitute for professional licensure.'
  },
  {
    rank: 3,
    code: 'CTISP',
    category: 'popular',
    badge: null,
    ctaVerb: 'Enroll',
    image: '/certifications/ctisp.jpg',
    name: 'Certified Trauma-Informed Systems Practitioner',
    tagline: 'Transform organizations, institutions, and communities through trauma-informed systems leadership.',
    focus: 'Trauma-informed systems, organizations, policy, leadership, and institutional transformation',
    duration: '4 weeks',
    delivery: 'Online certification with guided instruction, institutional case studies, systems-assessment exercises, and applied assignments',
    timeCommitment: 'Approximately 4–5 hours per week',
    tuition: '$499',
    credential: 'CTISP™ — Certified Trauma-Informed Systems Practitioner',
    finalRequirement: 'Trauma-informed systems assessment and institutional improvement plan',
    overview: [
      'Prepares professionals to understand how trauma affects not only individuals, but also organizations, institutions, communities, and entire systems.',
      'When systems fail to recognize these effects, policies and routine practices may unintentionally reproduce fear, exclusion, distrust, or retraumatization.',
      'Moves beyond frontline trauma-informed care — equipping participants to examine how systems operate and design practical strategies that promote safety, trust, inclusion, resilience, and accountability.'
    ],
    whoLabel: 'Who Should Enroll?',
    who: [
      'Healthcare and behavioral health leaders', 'Nurses, social workers, counselors, and case managers', 'Government and public-sector professionals',
      'Nonprofit and humanitarian leaders', 'School administrators and education professionals', 'Human-resource and workforce-development professionals',
      'Organizational-development specialists', 'Quality, compliance, and safety personnel', 'Community-program directors', 'Public-health and population-health professionals'
    ],
    whoNote: 'No clinical license is required.',
    curriculum: [
      { week: 1, title: 'Understanding Trauma Across Systems', bullets: ['Organizational and institutional trauma', 'Community and national trauma', 'How trauma affects trust and decision-making', 'Trauma-informed care vs. systems transformation'] },
      { week: 2, title: 'Safety, Trust, Culture, and Institutional Practice', bullets: ['Institutional power and authority', 'Policies that may unintentionally reproduce harm', 'Employee voice and service-user choice', 'Communication during uncertainty or crisis'] },
      { week: 3, title: 'Trauma-Informed Leadership and Systems Change', bullets: ['Workforce resilience and staff retention', 'Trauma-responsive policy development', 'Organizational readiness for change', 'Sustainable systems transformation'] },
      { week: 4, title: 'Applied Systems Assessment and Transformation Planning', bullets: ['Analysis of an organization or institutional system', 'Identification of trauma-related risks and protective factors', 'Trauma-informed systems transformation plan', 'Final certification assessment'] }
    ],
    outcomes: [
      'Analyze organizations through a trauma-informed systems lens', 'Recognize signs of organizational and institutional trauma',
      'Identify policies or practices that may unintentionally retraumatize people', 'Recommend trauma-responsive organizational improvements',
      'Support workforce resilience and organizational recovery', 'Develop a practical trauma-informed systems transformation plan'
    ],
    requirements: ['Complete all required learning modules', 'Participate in assigned systems-analysis exercises', 'Pass the final knowledge assessment', 'Complete a trauma-informed systems assessment', 'Submit an institutional improvement or transformation plan'],
    credentialPackage: ['CTISP™ professional certificate', 'Digital credential badge', 'Trauma-informed systems assessment toolkit', 'Institutional-practice review checklist', 'Certificate-verification access', 'Eligibility to pursue FITTI™ and advanced ITTI pathways'],
    notice: 'CTISP™ is a professional-development credential issued by the International Truth and Trauma Institute. It is not an academic degree, clinical license, or substitute for regulated professional licensure.'
  },
  {
    rank: 4,
    code: 'CGPCRP',
    category: 'popular',
    badge: null,
    ctaVerb: 'Enroll',
    image: '/certifications/cgpcrp.jpg',
    name: 'Certified Global Peace & Conflict Resolution Practitioner',
    tagline: 'Advance peace through conflict analysis, dialogue, mediation, reconciliation, and trauma-informed practice.',
    focus: 'Peacebuilding, conflict analysis, mediation, dialogue, and reconciliation',
    duration: '4 weeks',
    delivery: 'Online certification with guided instruction, conflict simulations, international case studies, and applied assignments',
    timeCommitment: 'Approximately 4–5 hours per week',
    tuition: '$499',
    credential: 'CGPCRP™ — Certified Global Peace & Conflict Resolution Practitioner',
    finalRequirement: 'Conflict analysis and trauma-informed peacebuilding strategy',
    overview: [
      'Prepares professionals to understand conflict, support constructive dialogue, contribute to mediation and reconciliation, and design trauma-informed peacebuilding strategies.',
      'Sustainable peace requires an understanding of historical grievances, political exclusion, identity, inequality, collective trauma, displacement, and institutional distrust — not political agreements alone.',
      'Connects established conflict-resolution principles with ITTI\u2019s distinctive focus on trauma, national healing, community stabilization, institutional recovery, and sustainable peace.'
    ],
    whoLabel: 'Who Should Enroll?',
    who: [
      'Peacebuilding and conflict-resolution practitioners', 'Diplomats and international-relations professionals', 'Government and public-policy personnel',
      'NGO and humanitarian professionals', 'Human-rights professionals', 'Community organizers and youth leaders', 'Religious and traditional leaders',
      'Refugee and displacement-response professionals', 'Journalists and political analysts', 'Students of diplomacy, peace studies, or international affairs'
    ],
    whoNote: 'No prior mediation license is required.',
    curriculum: [
      { week: 1, title: 'Understanding Conflict and Its Drivers', bullets: ['Conflict drivers and escalation pathways', 'Stakeholder identification and mapping', 'Historical grievances, inequality, and exclusion', 'Trauma as a driver and consequence of conflict'] },
      { week: 2, title: 'Dialogue, Negotiation, and Mediation', bullets: ['Principles of negotiation and mediation frameworks', 'Interests, positions, and underlying needs', 'Managing emotionally charged discussions', 'Impartiality and neutrality'] },
      { week: 3, title: 'Trauma-Informed Peacebuilding and Reconciliation', bullets: ['Collective and intergenerational trauma', 'Truth-telling and trust rebuilding', 'Reintegration and post-conflict recovery', 'Risks of premature reconciliation or forced forgiveness'] },
      { week: 4, title: 'Applied Peacebuilding Strategy', bullets: ['Conflict-context assessment', 'Stakeholder and conflict-driver analysis', 'Trauma-informed peacebuilding plan', 'Final certification assessment'] }
    ],
    outcomes: [
      'Conduct a structured conflict assessment', 'Examine how trauma contributes to recurring instability',
      'Support dialogue and mediation processes', 'Develop trauma-informed peacebuilding strategies',
      'Support violence-prevention and community-stabilization efforts', 'Communicate findings without inflaming political or communal tensions'
    ],
    requirements: ['Complete all required learning modules', 'Participate in assigned conflict-analysis exercises', 'Complete a mediation or dialogue simulation', 'Pass the final knowledge assessment', 'Submit a trauma-informed peacebuilding strategy'],
    credentialPackage: ['CGPCRP™ professional certificate', 'Digital credential badge', 'Conflict-analysis toolkit', 'Stakeholder-mapping template', 'Certificate-verification access', 'Consideration for selected peacebuilding, research, or Observatory initiatives'],
    notice: 'CGPCRP™ is a professional-development credential issued by the International Truth and Trauma Institute. It does not constitute appointment as a diplomat, government negotiator, or accredited mediator.'
  },
  {
    rank: 5,
    code: 'CEOPTA',
    category: 'global',
    badge: 'ITTI PROPRIETARY METHODOLOGY',
    ctaVerb: 'Enroll',
    image: '/certifications/ceopta.jpg',
    name: 'Certified Election Observation & Political Trauma Analyst',
    tagline: 'Observe electoral environments, detect political-trauma risks, and apply ETTI with rigor and impartiality.',
    focus: 'Election observation, political-trauma analysis, election risk, and application of ETTI',
    duration: '4 weeks',
    delivery: 'Live online cohort with simulation exercises, structured observation tools, and ETTI case analysis',
    timeCommitment: '4–5 hours per week',
    tuition: '$499',
    credential: 'CEOPTA™ — Certified Election Observation & Political Trauma Analyst',
    finalRequirement: 'ETTI coding examination and country election-trauma assessment',
    overview: [
      'Prepares participants to examine election environments through established observation principles and ITTI\u2019s proprietary Election Trauma and Tension Index (ETTI).',
      'Goes beyond conventional election observation by examining how electoral processes expose individuals, communities, institutions, and nations to political trauma.',
      'Participants study election violence, threat and intimidation, political repression, disinformation, displacement, psychological distress, and post-election recovery.'
    ],
    whoLabel: 'Who Should Enroll?',
    who: [
      'Election-monitoring personnel', 'Civil-society professionals', 'Human-rights professionals', 'Democracy and governance professionals',
      'Journalists', 'Political-risk analysts', 'Political scientists', 'Peacebuilding practitioners', 'Early-warning and security analysts', 'Conflict researchers'
    ],
    curriculum: [
      { week: 1, title: 'Election Observation, Ethics, and Democratic Standards', bullets: ['The phases of an election cycle', 'Impartiality and political independence', 'Electoral institutions and voter participation', 'Observer documentation and reporting'] },
      { week: 2, title: 'Political Trauma and Election-Related Harm', bullets: ['Election violence and threat/intimidation', 'Political repression and communal tension', 'Disinformation and inflammatory narratives', 'Post-election instability and recovery'] },
      { week: 3, title: 'Applying the Election Trauma and Tension Index', bullets: ['EVS — Election Violence Severity', 'TIE — Threat and Intimidation Exposure', 'PDL — Psychological Distress Load', 'ITS — Institutional Strain'] },
      { week: 4, title: 'ETTI Election-Trauma Assessment', bullets: ['Country and election context', 'Domain-level findings and ETTI scoring', 'Early-warning considerations', 'Policy or institutional recommendations'] }
    ],
    outcomes: [
      'Apply impartial and ethical election-observation principles', 'Identify election-related trauma and violence',
      'Recognize patterns of intimidation and political repression', 'Apply ETTI coding and scoring rules',
      'Produce an election-trauma and tension assessment', 'Distinguish direct evidence from interpretation'
    ],
    requirements: ['Maintain political impartiality', 'Avoid partisan advocacy while acting in an analytical capacity', 'Document evidence accurately', 'Follow the official ITTI ETTI coding and reporting standards'],
    credentialPackage: ['CEOPTA™ professional certificate', 'Digital credential badge', 'ITTI professional-directory listing', 'ETTI observation and coding toolkit', 'Election-trauma assessment template', 'Eligibility for selected Observatory projects'],
    notice: 'CEOPTA™ is an ITTI professional-development credential. It does not constitute appointment, accreditation, or deployment as an official election observer for the UN, AU, EU, OSCE, or any national election commission.'
  },
  {
    rank: 6,
    code: 'CGTEA',
    category: 'global',
    badge: null,
    ctaVerb: 'Enroll',
    image: '/certifications/cgtea.jpg',
    name: 'Certified Global Trauma Epidemiology Analyst',
    tagline: 'Measure, map, and interpret the population-level mental-health consequences of collective trauma.',
    focus: 'Population mental health, trauma epidemiology, geopsychiatry, surveillance, and geographic analysis',
    duration: '4 weeks',
    delivery: 'Applied online cohort with live instruction, guided data exercises, and comparative country analysis',
    timeCommitment: '5–6 hours per week',
    tuition: '$699',
    credential: 'CGTEA™ — Certified Global Trauma Epidemiology Analyst',
    finalRequirement: 'Country or population trauma epidemiology profile with a recorded or live capstone defense',
    overview: [
      'Prepares professionals to examine the distribution, determinants, and population consequences of trauma across countries and communities.',
      'Integrates population-health thinking, collective trauma science, mental-health surveillance, conflict and displacement analysis, and ITTI\u2019s emerging geopsychiatric perspective.',
      'Graduates are trained to become credible analysts of the intersection between population mental health, collective trauma, geography, conflict, displacement, and institutional conditions.'
    ],
    whoLabel: 'Who Should Enroll?',
    who: [
      'Public-health and population-health professionals', 'Mental-health professionals', 'Epidemiology students and early-career analysts',
      'Researchers and research assistants', 'Humanitarian and displacement-response professionals', 'Government and NGO policy analysts',
      'Monitoring and evaluation specialists', 'Graduate students in public health, global health, or political science'
    ],
    curriculum: [
      { week: 1, title: 'Foundations of Global Trauma Epidemiology', bullets: ['Population mental health and trauma exposure', 'Collective and historical trauma', 'ITTI\u2019s emerging geopsychiatric perspective', 'Pathways from exposure to population outcomes'] },
      { week: 2, title: 'Surveillance, Measurement, and Data Quality', bullets: ['Prevalence, incidence, and population vulnerability', 'Sampling and surveillance systems', 'Missing data and measurement bias', 'Ethical management of sensitive trauma data'] },
      { week: 3, title: 'Geographic and Comparative Analysis', bullets: ['Country and population comparisons', 'Geographic concentration of trauma exposure', 'Population vulnerability mapping', 'Trauma-related dashboards and visualizations'] },
      { week: 4, title: 'Trauma Epidemiology Capstone', bullets: ['Structured epidemiological profile of a chosen population', 'Exposure patterns and available evidence', 'Key outcomes and limitations', 'Policy implications'] }
    ],
    outcomes: [
      'Describe population patterns of trauma exposure', 'Evaluate surveillance and secondary data sources',
      'Compare trauma patterns across countries or populations', 'Develop a trauma epidemiology profile or dashboard',
      'Communicate findings responsibly to policy and program audiences', 'Distinguish evidence-supported findings from unsupported conclusions'
    ],
    requirements: ['Complete all required learning modules', 'Participate in assigned data exercises', 'Produce and defend a trauma epidemiology profile', 'Agree to ITTI\u2019s research-integrity standards'],
    credentialPackage: ['CGTEA™ professional certificate', 'Digital credential badge', 'ITTI professional-directory listing', 'Trauma epidemiology profile template', 'Applied analytical toolkit', 'Eligibility for advanced ITTI burden-science and fellowship pathways'],
    notice: 'CGTEA™ is a professional-development credential issued by the International Truth and Trauma Institute. It does not confer licensure as an epidemiologist, psychiatrist, or psychologist.'
  },
  {
    rank: 7,
    code: 'CGTBA',
    category: 'global',
    badge: 'ITTI PROPRIETARY METHODOLOGY',
    ctaVerb: 'Enroll',
    pathway: { label: 'Global Trauma Burden Pathway — Level 1', next: 'GTBSF' },
    image: '/certifications/cgtba.jpg',
    name: 'Certified Global Trauma Burden Analyst',
    tagline: 'Apply GTBI to compare trauma exposure, vulnerability, institutional strain, resilience, and recovery across nations.',
    focus: 'Application of GTBI to national trauma-burden assessment and country comparison',
    duration: '4 weeks',
    delivery: 'Applied online cohort with live instruction, guided GTBI coding, and country-comparison exercises',
    timeCommitment: '5–6 hours per week',
    tuition: '$799',
    credential: 'CGTBA™ — Certified Global Trauma Burden Analyst',
    finalRequirement: 'Complete and defend a GTBI country profile',
    overview: [
      'The Level 1 credential in ITTI\u2019s Global Trauma Burden pathway — prepares participants to apply the Global Trauma Burden Indicator (GTBI) to structured country analysis.',
      'Participants examine trauma exposure, population vulnerability, institutional strain, governance conditions, resilience, recovery capacity, and evidence limitations.',
      'The emphasis is on accurate application, transparent documentation, and responsible interpretation of GTBI.'
    ],
    whoLabel: 'Who Should Enroll?',
    who: [
      'Public-health and population-health professionals', 'Conflict analysts', 'Humanitarian professionals', 'International-development professionals',
      'Researchers and policy analysts', 'Government and think-tank professionals', 'Monitoring and evaluation specialists', 'Professionals seeking entry into the GTBSF™ pathway'
    ],
    curriculum: [
      { week: 1, title: 'Understanding Global Trauma Burden', bullets: ['Conceptual foundations of global trauma burden', 'Trauma exposure and population vulnerability', 'Institutional strain, resilience, and recovery capacity', 'Trauma burden and national development'] },
      { week: 2, title: 'GTBI Methodology and Evidence Standards', bullets: ['GTBI domains and indicators', 'Data-source hierarchy and coding rules', 'Weighting principles', 'Missing data and conflicting evidence'] },
      { week: 3, title: 'Country Comparison and Visualization', bullets: ['Country trauma profiles', 'Comparative GTBI scoring', 'Trauma-burden dashboards, maps, and visualizations', 'Policy-oriented reports'] },
      { week: 4, title: 'GTBI Country Capstone', bullets: ['Complete GTBI profile for a selected country', 'Domain-level coding and scoring', 'Data limitations and uncertainty', 'Policy recommendations'] }
    ],
    outcomes: [
      'Explain the conceptual structure of GTBI', 'Select and evaluate appropriate evidence sources',
      'Apply GTBI coding and scoring rules', 'Compare national trauma burden responsibly',
      'Produce a defensible GTBI country profile', 'Translate findings into a policy-oriented analytical brief'
    ],
    requirements: ['Complete all required learning modules', 'Participate in guided GTBI coding exercises', 'Produce and defend a GTBI country profile'],
    credentialPackage: ['Level 1 CGTBA™ certificate', 'Digital credential badge', 'ITTI professional-directory listing', 'GTBI coding manual', 'GTBI country-profile template', 'Eligibility to apply for Level 2 GTBSF™'],
    notice: 'CGTBA™ certifies demonstrated application of ITTI\u2019s GTBI methodology. It does not confer an academic degree or independent professional status as a statistician, epidemiologist, or scientist.'
  },
  {
    rank: 8,
    code: 'CCTNHS',
    category: 'global',
    badge: null,
    ctaVerb: 'Enroll',
    image: '/certifications/cctnhs.jpg',
    name: 'Certified Collective Trauma & National Healing Specialist',
    tagline: 'Help societies confront the past, restore trust, and build pathways toward national healing.',
    focus: 'Collective trauma, transitional justice, reconciliation, and national healing',
    duration: '4 weeks',
    delivery: 'Online certification with international case studies, guided readings, analytical exercises, and applied assignments',
    timeCommitment: 'Approximately 5 hours per week',
    tuition: '$997',
    credential: 'CCTNHS™ — Certified Collective Trauma & National Healing Specialist',
    finalRequirement: 'National-healing framework for a selected country, community, or trauma-affected population',
    overview: [
      'Prepares professionals to understand how wars, authoritarianism, colonization, political repression, communal violence, and forced displacement continue to affect societies across generations.',
      'Collective trauma does not end when violence stops — it can remain embedded in public memory, family narratives, political institutions, national identity, and patterns of distrust.',
      'Explores truth-telling, transitional justice, public acknowledgment, memorialization, reconciliation, institutional trust, and national-healing strategy.'
    ],
    whoLabel: 'Who Should Enroll?',
    who: [
      'Government and public-policy advisors', 'Peace and reconciliation practitioners', 'Truth-commission and transitional-justice personnel',
      'Human-rights professionals', 'Researchers and university professionals', 'Historians and educators', 'International-development practitioners',
      'Diaspora and community leaders', 'Museum, memorialization, and public-memory professionals'
    ],
    curriculum: [
      { week: 1, title: 'Collective, Historical, and Intergenerational Trauma', bullets: ['Historical trauma and intergenerational transmission', 'Political repression, colonization, and structural violence', 'Public memory and national narratives', 'Silence, denial, and unresolved grief'] },
      { week: 2, title: 'Truth, Justice, Acknowledgment, and Memory', bullets: ['Truth commissions and transitional justice', 'Public acknowledgment and official apology', 'Memorialization and remembrance', 'Risks of politicizing truth and memory'] },
      { week: 3, title: 'Reconciliation, Institutional Trust, and Trauma-Informed Governance', bullets: ['National and community reconciliation', 'Institutional distrust and social fragmentation', 'Trauma-informed governance', 'Reconciliation vs. justice vs. political settlement'] },
      { week: 4, title: 'National-Healing Strategy', bullets: ['Analysis of a selected national or community context', 'Assessment of truth, justice, memory, and institutional conditions', 'Culturally responsive national-healing framework', 'Final certification assessment'] }
    ],
    outcomes: [
      'Analyze collective and historical trauma', 'Identify how unresolved trauma affects institutions and social cohesion',
      'Evaluate truth commissions and national-healing initiatives', 'Develop trauma-informed governance recommendations',
      'Design community or national-healing strategies', 'Communicate responsibly about sensitive historical harms'
    ],
    requirements: ['Complete all required learning modules', 'Complete a structured country or community assessment', 'Submit a national-healing framework', 'Agree to ITTI\u2019s ethical standards for survivor dignity and political impartiality'],
    credentialPackage: ['CCTNHS™ professional certificate', 'Digital credential badge', 'Collective-trauma assessment framework', 'National-healing planning template', 'Eligibility for FITTI™ and advanced ITTI pathways', 'Opportunity to submit qualifying work for publication consideration'],
    notice: 'CCTNHS™ is a professional-development credential issued by the International Truth and Trauma Institute. It does not constitute appointment to a government commission, truth commission, or international tribunal.'
  },
  {
    rank: 9,
    code: 'CTODAF',
    category: 'global',
    badge: null,
    ctaVerb: 'Enroll',
    image: '/certifications/ctodaf.jpg',
    name: 'Certified Trauma Observatory & Data Analytics Fellow',
    tagline: 'Transform trauma, conflict, and institutional data into actionable intelligence.',
    focus: 'Trauma Observatory development, data analytics, dashboards, mapping, and policy intelligence',
    duration: '4 weeks',
    delivery: 'Applied online laboratory with live instruction, guided data exercises, dashboard activities, and a supervised capstone',
    timeCommitment: 'Approximately 5–6 hours per week',
    tuition: '$1,250',
    credential: 'CTODAF™ — Certified Trauma Observatory & Data Analytics Fellow',
    finalRequirement: 'Country trauma profile, analytical dashboard, map, or Observatory policy brief',
    overview: [
      'Prepares professionals to support the development and operation of trauma observatories, country-profile systems, analytical dashboards, and policy-oriented intelligence products.',
      'Combines trauma and conflict analysis with data-source evaluation, coding, country profiling, visualization, dashboard design, mapping, and evidence communication.',
      'Participants receive practical exposure to the analytical approaches supporting the ITTI International Trauma Observatory.'
    ],
    whoLabel: 'Who Should Enroll?',
    who: [
      'Researchers and research assistants', 'Public-health and population-health professionals', 'Data analysts', 'Epidemiologists',
      'GIS and mapping professionals', 'Monitoring and evaluation specialists', 'Political-risk and conflict analysts', 'Policy analysts', 'Graduate students'
    ],
    whoNote: 'Basic familiarity with spreadsheets or data analysis is recommended.',
    curriculum: [
      { week: 1, title: 'Trauma Observatory Foundations', bullets: ['Purpose and structure of an Observatory', 'Trauma and conflict-data ecosystems', 'Source identification and evaluation', 'Research ethics and sensitive-data management'] },
      { week: 2, title: 'Trauma, Conflict, Election, and Institutional Indicators', bullets: ['Trauma exposure and population vulnerability', 'Conflict intensity and political repression', 'Comparative country indicators', 'Missing data and avoiding false precision'] },
      { week: 3, title: 'Data Analysis, Mapping, and Visualization', bullets: ['Country profiles and dashboards', 'Maps, trend charts, and risk heatmaps', 'Early-warning briefs', 'Accessible data narratives'] },
      { week: 4, title: 'Observatory Capstone', bullets: ['One approved product: country profile, dashboard, or policy brief', 'Evidence sources and methodology', 'Interpretation and limitations', 'Recommendations'] }
    ],
    outcomes: [
      'Identify credible trauma and conflict-data sources', 'Evaluate data quality and limitations',
      'Develop country trauma profiles', 'Produce basic dashboards, maps, and visualizations',
      'Communicate uncertainty and methodological limitations', 'Support the development of a trauma or conflict Observatory'
    ],
    requirements: ['Complete all required learning modules', 'Complete an approved Observatory capstone', 'Document all major evidence sources', 'Present or submit a written defense of the final product'],
    credentialPackage: ['CTODAF™ professional certificate', 'Digital credential badge', 'Country-profile template', 'Observatory coding and documentation tools', 'Eligibility for selected ITTI research assignments', 'Eligibility to pursue advanced ETTI, GTBI, and fellowship pathways'],
    notice: 'CTODAF™ is a professional-development credential issued by the International Truth and Trauma Institute. It does not confer an academic degree or independent licensure as a statistician, epidemiologist, or data scientist.'
  },
  {
    rank: 10,
    code: 'EFTLIT',
    category: 'executive',
    badge: 'SELECTIVE',
    ctaVerb: 'Apply',
    image: '/certifications/eftlit.jpg',
    name: 'Executive Fellow in Trauma Leadership & Institutional Transformation',
    tagline: 'Lead institutions through trauma-informed governance, recovery, resilience, and strategic transformation.',
    focus: 'Executive trauma leadership, governance, institutional recovery, and transformation',
    duration: '4 weeks',
    delivery: 'Selective executive online cohort with live seminars, leadership case studies, mentor-guided exercises, and an institutional capstone',
    timeCommitment: 'Approximately 5–6 hours per week',
    tuition: '$2,500',
    credential: 'EFTLIT™ — Executive Fellow in Trauma Leadership & Institutional Transformation',
    finalRequirement: 'Executive institutional-transformation plan and leadership presentation',
    overview: [
      'An advanced executive credential for leaders responsible for guiding organizations, institutions, and public systems through crisis, disruption, institutional distrust, and strategic change.',
      'Institutions frequently attempt transformation without addressing the fear, unresolved harm, and power imbalances influencing their people and systems.',
      'Integrates trauma-informed executive leadership, systems thinking, strategic governance, crisis recovery, and institutional accountability. Fellows complete a transformation plan addressing a real organizational challenge.'
    ],
    whoLabel: 'Who Should Apply?',
    who: [
      'Government ministers and senior public officials', 'Hospital and healthcare executives', 'University presidents and senior administrators',
      'Chief executive officers and executive directors', 'NGO and humanitarian executives', 'Foundation and philanthropic leaders',
      'Governance and institutional-reform advisors', 'Leaders responsible for crisis recovery or complex institutional change'
    ],
    whoNote: 'Admission may be based on professional experience, executive responsibility, or demonstrated leadership potential.',
    curriculum: [
      { week: 1, title: 'Trauma-Informed Executive Leadership', bullets: ['Institutional and organizational trauma', 'Leadership behavior under pressure', 'Psychological safety and power, authority, and trust', 'Ethical executive decision-making'] },
      { week: 2, title: 'Governance, Culture, Trust, and Accountability', bullets: ['Strategic governance and institutional culture', 'Transparency and accountability', 'Stakeholder confidence and internal communication', 'Institutional legitimacy'] },
      { week: 3, title: 'Crisis Recovery, Resilience, and Systems Transformation', bullets: ['Crisis leadership and institutional recovery', 'Systems thinking and stakeholder engagement', 'Managing resistance and change fatigue', 'Sustainability and measurable impact'] },
      { week: 4, title: 'Executive Institutional-Transformation Plan', bullets: ['Institutional context and trauma-related risks', 'Stakeholder analysis and governance priorities', 'Implementation phases and accountability measures', 'Presented to peers for defense'] }
    ],
    outcomes: [
      'Diagnose institutional barriers linked to trauma and distrust', 'Lead organizational change without reproducing harm',
      'Strengthen psychological safety and executive accountability', 'Guide institutions through crisis, disruption, and recovery',
      'Design culture-transformation strategies', 'Produce and defend an executive transformation plan'
    ],
    requirements: ['Complete all required executive seminars', 'Complete mentor-guided institutional exercises', 'Submit an executive institutional assessment', 'Develop and present an institutional-transformation plan'],
    credentialPackage: ['EFTLIT™ Executive Fellow certificate', 'Digital executive credential badge', 'Executive institutional-assessment toolkit', 'Executive profile in the ITTI professional directory', 'Eligibility for selected advisory, speaking, or institutional initiatives', 'Eligibility for advanced ITTI fellowship and advisory pathways'],
    notice: 'EFTLIT™ is a selective professional fellowship and executive-development credential issued by ITTI. It is not an academic degree, government appointment, or regulated professional license.'
  },
  {
    rank: 11,
    code: 'GTBSF',
    category: 'executive',
    badge: 'ITTI PROPRIETARY METHODOLOGY',
    ctaVerb: 'Apply',
    pathway: { label: 'Global Trauma Burden Pathway — Level 2', prereq: 'CGTBA' },
    image: '/certifications/gtbsf.jpg',
    name: 'Global Trauma Burden Scientist Fellow',
    tagline: 'Advance the science, validation, interpretation, and global application of the Global Trauma Burden Indicator.',
    focus: 'Advanced GTBI methodology, validation, burden science, research, and Observatory leadership',
    duration: '4 weeks',
    delivery: 'Selective advanced online fellowship with live seminars, mentor sessions, research workshops, and oral defense',
    timeCommitment: '6–8 hours per week',
    tuition: '$2,500',
    credential: 'GTBSF™ — Global Trauma Burden Scientist Fellow',
    finalRequirement: 'Advanced GTBI research product, methodological paper, validation exercise, or comparative study with oral defense',
    overview: [
      'The advanced Level 2 pathway for professionals who have mastered basic GTBI application and are prepared to contribute to methodological refinement, comparative research, and Observatory leadership.',
      'Scientist Fellows move beyond applying a fixed analytical instrument — examining measurement validity, reliability, weighting, sensitivity, uncertainty, and cross-country comparability.',
      'The designation recognizes demonstrated competence within ITTI\u2019s defined GTBI scientific framework.'
    ],
    admissionNote: 'Applicants must hold CGTBA™ certification, an approved equivalent, relevant graduate-level training, or substantial professional experience applying trauma, conflict, health, or population data. Admission is selective and subject to ITTI review.',
    whoLabel: 'Who Should Apply?',
    who: [
      'Successful CGTBA™ graduates', 'Experienced epidemiologists', 'Public-health and population-health professionals', 'Senior researchers',
      'Quantitative and mixed-methods analysts', 'University faculty', 'Advanced graduate researchers', 'Observatory leaders'
    ],
    curriculum: [
      { week: 1, title: 'Advanced GTBI Methodology and Scientific Standards', bullets: ['Construct definition and indicator selection', 'Measurement validity and reliability', 'Cross-country comparability', 'Reproducibility and scientific review standards'] },
      { week: 2, title: 'Weighting, Missing Data, Sensitivity, and Uncertainty', bullets: ['Weighting choices and sensitivity analysis', 'Missing-data strategies', 'Robustness of country profiles', 'Preventing false precision'] },
      { week: 3, title: 'Comparative Burden Science and Policy Interpretation', bullets: ['Cross-country and temporal comparison', 'Triangulation and comparative case selection', 'Ethical communication of uncertainty', 'Preventing overstatement and misuse'] },
      { week: 4, title: 'Scientist Fellowship Research Product and Defense', bullets: ['One advanced product: methodological paper, validation exercise, or research report', 'Evidence sources and methodology', 'Oral defense', 'Peer-review or quality-assurance framework'] }
    ],
    outcomes: [
      'Critically evaluate GTBI methodology', 'Assess measurement validity and reliability',
      'Design comparative or validation studies', 'Contribute to methodological refinement',
      'Translate burden-science findings into responsible policy intelligence', 'Produce and defend an advanced research product'
    ],
    requirements: ['Meet the admission requirement (CGTBA™ or equivalent)', 'Complete all required seminars and mentor sessions', 'Produce and defend an advanced GTBI research product'],
    credentialPackage: ['GTBSF™ advanced fellowship designation', 'Digital fellowship badge', 'Scientist Fellow profile in the ITTI professional directory', 'Eligibility for selected GTBI technical working groups', 'Eligibility for selected Observatory leadership roles', 'Publication or presentation consideration for qualifying work'],
    notice: 'GTBSF™ is a selective professional fellowship designation issued by ITTI. It does not replace an accredited academic science degree, professional licensure, or institutional research appointment.'
  }
];

// "At a glance" comparison table, from the docx's certification comparison chart.
export const COMPARISON_ROWS = CERTIFICATIONS.map((c) => ({
  rank: c.rank,
  code: c.code,
  focus: c.focus,
  duration: c.duration,
  tuition: c.tuition
}));