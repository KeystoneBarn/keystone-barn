// Tack board data: sourced from 🧢 Tack Inventory list "Current tack setup" tasks

export const SADDLES = {
  "🟢 Green": { color: "#3F6B45", label: "Green Saddle" },
  "🟠 Orange": { color: "#D2761B", label: "Orange Saddle" },
  "🟣 Pink": { color: "#B5537A", label: "Pink Saddle" },
  "🔵 Blue": { color: "#2E6E8E", label: "Blue Saddle" },
  "🔴 Red": { color: "#A31E22", label: "Red Saddle" },
  "📿 String": { color: "#7A5230", label: "String Saddle" },
  "👵🏼 Old": { color: "#7a7a7a", label: "Old Saddle" },
};

export const TACK = [
  {
    horse: "Hugo",
    saddles: [
      { name: "🔴 Red", pad: "Standard pad", note: "Use for smaller rider (Clara)" },
      { name: "👵🏼 Old", pad: "Thinline + pad", note: "Use for adult rider" },
    ],
    breastCollar: false,
    bit: "Myler SS level 2 Dee Low Port 4 3/4\"",
    boots: "Scoot Boots: fronts fit OK, hinds stretched",
  },
  {
    horse: "Qu",
    saddles: [
      { name: "🟠 Orange", pad: "Black half pad, breast collar", note: "Interim setup (Agetha 7/28)" },
      { name: "🟢 Green", pad: "Standard pad", note: "Slides and pinches once shifted" },
    ],
    breastCollar: true,
    bit: "Myler Level 3 Wide Kimberwick MB33 5.5\"",
    boots: "Scoot Boots: sizing issues, Adjust model being evaluated",
  },
  {
    horse: "Dahlia",
    saddles: [
      { name: "🔵 Blue", pad: "Squishy grippy half pad (breaking in)", note: "60cm. Per Agetha 7/28" },
    ],
    breastCollar: false,
    bridle: "Western bridle, crown + browband only. No throat latch, no cavesson.",
    bit: "Qu's old 3-piece D-ring with brass rollers",
    boots: null,
  },
  {
    horse: "Mickey",
    saddles: [
      { name: "🟣 Pink", pad: "Pad + small rear riser" },
      { name: "👵🏼 Old", pad: "Thinline + pad" },
    ],
    breastCollar: false,
    bit: "Myler 3 3/4 D level 1 Twist Comfort Snaffle Copper Roller 5\"",
    boots: null,
  },
  {
    horse: "Avelin",
    saddles: [
      { name: "🟢 Green", pad: "None needed", note: "Right-side released, left closed. Perfect fit." },
      { name: "🟠 Orange", pad: "Black pad, 54\", chest collar" },
      { name: "📿 String", pad: "Pad + chest collar" },
    ],
    breastCollar: true,
    bit: "Myler SS Kimberwick level 2 Low Port Comfort Snaffle 5\"",
    boots: null,
  },
  {
    horse: "Ulyssa",
    saddles: [
      { name: "🟣 Pink", pad: "Standard pad, chest collar", note: "Fits great (Agetha 7/28)" },
      { name: "📿 String", pad: "Pad + chest collar" },
    ],
    breastCollar: true,
    bit: "Myler SS FullCheek level 2 Low Port Comfort Snaffle 5\"",
    boots: "Scoot Boots: front feet, size 2",
  },
  {
    horse: "Stendahl",
    saddles: [
      { name: "🟣 Pink", pad: "Standard pad", note: "Fits great (Agetha 7/28)" },
      { name: "📿 String", pad: "Pad (so-so fit)" },
    ],
    breastCollar: false,
    bit: "Myler Level 1 HBT Shank 5\"",
    boots: null,
  },
  {
    horse: "Tammy",
    saddles: [
      { name: "🟠 Orange", pad: "Standard pad", note: "1st choice, better fit than Pink" },
      { name: "🟣 Pink", pad: "Standard pad" },
      { name: "📿 String", pad: "Standard pad" },
    ],
    breastCollar: false,
    bit: "Herm Sprenger SATINOX D-Ring Single Jointed 135mm",
    boots: "Scoot Boots: size 3 front, size 2 hind (Adjust). Fit confirmed.",
  },
  {
    horse: "Linka",
    saddles: [
      { name: "🟣 Pink", pad: "Standard pad" },
      { name: "🟠 Orange", pad: "Standard pad (once broken in)" },
    ],
    breastCollar: false,
    bit: "Myler SS Kimberwick level 2 Low Port Comfort Snaffle 5\"",
    boots: null,
  },
];
