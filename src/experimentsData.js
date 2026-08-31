// 4-Week Pole Work Program: full daily content from the experiment attachment

export const WEEKS = [
  {
    num: 1, title: "Activation & Proprioception",
    goal: "Introduce pole awareness, single-leg stability, and back lift at walk.",
    rule: "All sessions in-hand. Ridden work is optional rest day only.",
    color: "#2563eb",
    days: [
      { day: "Day 1 (Mon)", session: "Single Flat Pole + Raised Obstacle",
        exercises: [
          { label: "Warmup", text: "5 min free walk in arena" },
          { label: "Exercise", text: "1 flat pole on ground. Walk over 5-6 times each direction." },
          { label: "Progression", text: "1 raised obstacle (knee/hock height). Walk over 3-4 times each direction." },
          { label: "Cooldown", text: "3 min free walk" },
        ],
        flags: { Qu: "flat poles only, no raised work", Stendahl: "check sheath before handling hind end" },
      },
      { day: "Day 3 (Wed)", session: "Simple Maze",
        exercises: [
          { label: "Warmup", text: "5 min free walk" },
          { label: "Exercise", text: "3-4 poles in a serpentine maze (walk through, no stepping over). Lateral flexion and core control. 3 reps each direction." },
          { label: "Cooldown", text: "3 min free walk" },
        ],
        flags: { Stendahl: "check sheath before handling hind end" },
      },
      { day: "Day 5 (Fri)", session: "Flat Pole Line at Walk (Optional Ridden)",
        exercises: [
          { label: "Warmup", text: "5 min free walk under saddle" },
          { label: "Exercise", text: "3-4 flat poles in a straight line at walk. Focus on rhythm, not speed. 4-5 passes each direction." },
          { label: "Cooldown", text: "5 min free walk" },
        ],
        flags: {},
      },
    ],
  },
  {
    num: 2, title: "Building the Topline",
    goal: "Introduce rhythm, steady repetition, and gentle bending.",
    rule: "",
    color: "#16a34a",
    days: [
      { day: "Day 8 (Mon)", session: "Flat Pole Line at Walk",
        exercises: [
          { label: "Exercise", text: "In-hand: 5-6 flat poles in a straight line at walk. 4-5 passes each direction." },
        ],
        flags: { Stendahl: "check sheath before handling hind end" },
      },
      { day: "Day 10 (Wed)", session: "The Fan",
        exercises: [
          { label: "Exercise", text: "In-hand: 4-6 poles in a slight fan shape. Walk through the center to encourage bending and even muscle use. 4 reps each direction." },
        ],
        flags: { Stendahl: "check sheath before handling hind end" },
      },
      { day: "Day 12 (Fri)", session: "Trot Poles Straight Line (Ridden)",
        exercises: [
          { label: "Exercise", text: "Ridden: 3-4 trot poles in a straight line, ~1.2-1.3m apart. 4-5 passes each direction. Straightness and rhythm only. No height." },
        ],
        flags: { Qu: "keep trot poles flat, low intensity" },
      },
    ],
  },
  {
    num: 3, title: "Power & Engagement",
    goal: "Increase joint flexion, add bending, and introduce transitions.",
    rule: "",
    color: "#ca8a04",
    days: [
      { day: "Day 15 (Mon)", session: "Raised Trot Poles",
        exercises: [
          { label: "Exercise", text: "Ridden or In-hand: 3-4 trot poles, raise ONE end of each pole to 4-6 inches (alternate sides). 4-5 passes each direction." },
        ],
        flags: { Qu: "skip raised poles. Do flat trot poles only." },
      },
      { day: "Day 17 (Wed)", session: "Circle of Poles",
        exercises: [
          { label: "Exercise", text: "Ridden: 4 poles in a 20m circle. Trot the circle. 3-4 laps each direction. Encourage bending and even engagement." },
        ],
        flags: {},
      },
      { day: "Day 19 (Fri)", session: "Transitions Over Poles",
        exercises: [
          { label: "Exercise", text: "Ridden: 3-4 flat trot poles. Walk-trot-walk transitions over the poles. 4-5 reps each direction. Push from behind." },
        ],
        flags: {},
      },
    ],
  },
  {
    num: 4, title: "Integration & Challenge",
    goal: "Combine patterns, test balance, and correct asymmetries.",
    rule: "",
    color: "#9333ea",
    days: [
      { day: "Day 22 (Mon)", session: "Fan + Raised Line Combo",
        exercises: [
          { label: "Exercise", text: "Ridden: Trot the fan (4-6 poles), then walk through a raised pole line (3-4 poles). 3-4 sets each direction." },
        ],
        flags: { Qu: "skip raised line. Do flat fan + flat line only." },
      },
      { day: "Day 24 (Wed)", session: "Spiral In & Out Over Poles",
        exercises: [
          { label: "Exercise", text: "Ridden: 4 poles on a 20m circle. Spiral in to 15m over the poles, then spiral out. 3-4 reps each direction. Reveals asymmetries." },
        ],
        flags: {},
      },
      { day: "Day 26 (Fri)", session: "Complex Pattern",
        exercises: [
          { label: "Exercise", text: "Ridden: Walk a serpentine over 3-4 poles, then immediately trot a straight line of 4-6 poles. 3-4 sets each direction. Focus on balance and self-carriage." },
        ],
        flags: {},
      },
    ],
  },
];

export const HORSE_NOTES = [
  { horse: "Qu", note: "Hind end maintenance history (LH fetlock). NEVER do raised poles. Flat walk/trot only." },
  { horse: "Stendahl", note: "Needs sheath cleaning before in-hand work near his hind end." },
  { horse: "Avelin", note: "Fjord stride: subtract 10cm." },
  { horse: "Mickey", note: "Fjord stride: subtract 10cm." },
  { horse: "Ulyssa", note: "Fjord stride: subtract 10cm." },
  { horse: "Tammy", note: "Fjord stride: subtract 10cm." },
  { horse: "Linka", note: "Fjord stride: subtract 10cm." },
  { horse: "Dahlia", note: "Sport horse stride. May progress faster but do NOT skip Week 1 in-hand." },
  { horse: "Hugo", note: "Sport horse stride. May progress faster but do NOT skip Week 1 in-hand." },
];

export const CHEAT_SHEET = {
  distances: [
    { label: "Walk poles", value: "~0.75m (2.5 ft) apart" },
    { label: "Trot poles", value: "~1.2-1.3m (4 ft) apart" },
    { label: "Raised height", value: "4-6 in block under one end" },
    { label: "Circle of poles", value: "20m circle, 4 poles at cardinal points" },
    { label: "Fjord adjustment", value: "Subtract ~10cm from all distances" },
  ],
  terms: [
    { label: "In-hand", value: "Handler leads from the ground" },
    { label: "Topline", value: "Muscles along the spine: back, loin, croup" },
    { label: "Proprioception", value: "Body awareness (where feet are in space)" },
    { label: "Engagement", value: "Hind legs stepping further under the body" },
    { label: "Fan", value: "Poles radiating from a point" },
  ],
};

export const NUTRITION = "Aim for 0.8-1.0 g crude protein per kg bodyweight daily. Lysine is the limiting amino acid. If hay tests low, a quality ration balancer goes a long way.";

// Where the pole work program stands. Updated 2026-08-31.
export const PROGRESS = {
  startDate: "2026-08-17",
  currentWeek: 3,
  currentDay: 1,
  sessionsCompleted: 7,
  totalSessions: 12,
  weekLog: [
    { week: 1, days: [
      { day: 1, date: "Aug 17", note: "All horses started. Hugo: walked + raised poles, short RF/LH, knocked poles." },
      { day: 2, date: "~Aug 19", note: "Completed, nothing significant noted." },
      { day: 3, date: "~Aug 21", note: "Completed, nothing significant noted." },
    ] },
    { week: 2, days: [
      { day: 1, date: "~Aug 24", note: "Completed. All horses on schedule." },
      { day: 2, date: "~Aug 26", note: "Completed." },
      { day: 3, date: "~Aug 28", note: "Completed." },
    ] },
    { week: 3, days: [
      { day: 1, date: "Aug 31", note: "Completed. Hugo: short on RF/LH, kept knocking poles, got Bemer after." },
      { day: 2, date: null, note: "Upcoming" },
      { day: 3, date: null, note: "Upcoming" },
    ] },
    { week: 4, days: [
      { day: 1, date: null, note: "Upcoming" },
      { day: 2, date: null, note: "Upcoming" },
      { day: 3, date: null, note: "Upcoming" },
    ] },
  ],
};

// Smaller trials running alongside the pole program. From the Experiments list.
export const SIDE_EXPERIMENTS = [
  {
    title: "Mega-Tek daily on Dahlia's mane & tail",
    horse: "Dahlia", status: "active", started: "Aug 7", window: "30 days",
    detail: "EQYSS Mega-Tek Rebuilder to mane, forelock, and tail roots basically daily. Testing whether those areas grow in thicker. ~24 days in.",
  },
  {
    title: "Multi-product grooming protocol — Qu",
    horse: "Qu", status: "active", started: "Aug 7",
    detail: "Equiderma coat spray on the coat, EquinElite Shine & Shield on forelock/mane/tail ends, EQYSS Mega-Tek on roots and feathers.",
  },
  {
    title: "Multi-product grooming protocol — Avelin",
    horse: "Avelin", status: "active", started: "Aug 7",
    detail: "Equiderma coat spray on the coat, EquinElite Shine & Shield on forelock/tail, EQYSS Mega-Tek on feathers.",
  },
  {
    title: "Charlee's Fly Spray staying power — Avelin",
    horse: "Avelin", status: "active", started: "Aug 25",
    detail: "Does one application keep flies off the body for at least 75 minutes? 8/25: yes, held 75 minutes.",
  },
  {
    title: "Feed increase — Qu",
    horse: "Qu", status: "inconclusive", started: "Aug 4",
    detail: "Whether more feed produces a measurable positive response for weight gain. No clear result yet.",
  },
  {
    title: "Micro-Tek vs Coat Defense — Qu",
    horse: "Qu", status: "inconclusive",
    detail: "Split-body trial for sweat itch: Micro-Tek on one side, Coat Defense on the other.",
  },
  {
    title: "Silvetrasol only for hooves",
    horse: null, status: "concluded — worked",
    detail: "Dropped every other hoof product and kept only Silvetrasol. It held up on its own.",
  },
  {
    title: "Special Care + Alfalfa pellets for weight — Dahlia",
    horse: "Dahlia", status: "concluded — worked",
    detail: "Within 3 weeks her body composition improved.",
  },
];
