// Experiments: current active programs
export const EXPERIMENTS = [
  {
    id: "pole-work-4wk",
    name: "4-Week Pole Work Program",
    goal: "Hind end strength & topline development",
    method: "Progressive in-hand & ridden poles",
    horses: ["Hugo", "Qu", "Dahlia", "Mickey", "Avelin", "Ulyssa", "Stendahl", "Tammy", "Linka"],
    startDate: null, // TBD - user will confirm
    weeks: 4,
    notes: [
      { horse: "Qu", note: "Hind end maintenance history (LH fetlock). NEVER do raised poles. Flat walk/trot only." },
      { horse: "Stendahl", note: "Needs sheath cleaning before in-hand work near his hind end." },
      { horse: "Avelin", note: "Fjord stride: subtract 10cm from distances. Stay in-hand longer if green." },
      { horse: "Mickey", note: "Fjord stride: subtract 10cm from distances." },
      { horse: "Ulyssa", note: "Fjord stride: subtract 10cm from distances." },
      { horse: "Tammy", note: "Fjord stride: subtract 10cm from distances." },
      { horse: "Linka", note: "Fjord stride: subtract 10cm from distances." },
      { horse: "Dahlia", note: "Sport horse stride. May progress faster but do NOT skip Week 1 in-hand." },
      { horse: "Hugo", note: "Sport horse stride. May progress faster but do NOT skip Week 1 in-hand." },
    ],
    cheatSheet: {
      distances: [
        { label: "Walk poles", value: "~0.75m (2.5 ft) apart" },
        { label: "Trot poles", value: "~1.2–1.3m (4 ft) apart" },
        { label: "Raised height", value: "4–6 in (10–15 cm) block under one end" },
        { label: "Circle of poles", value: "20m circle, 4 poles at cardinal points" },
        { label: "Fjord adjustment", value: "Subtract ~10cm from all standard distances" },
      ],
      terms: [
        { label: "In-hand", value: "Handler leads from ground, no rider weight" },
        { label: "Topline", value: "Muscles along the spine: back, loin, croup" },
        { label: "Proprioception", value: "Body awareness — where the feet/legs are in space" },
        { label: "Engagement", value: "Hind legs stepping further under the body" },
        { label: "Fan", value: "Poles radiating from a point, ridden through center" },
      ],
    },
    nutrition: "Aim for 0.8–1.0 g crude protein per kg bodyweight daily. Lysine is the limiting amino acid. If hay tests low, a quality ration balancer goes a long way.",
  },
];
