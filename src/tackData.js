// Tack Board OFFLINE FALLBACK only. The live board comes from the ClickUp
// 🧢 Tack Board list via /api/tack (backend/tack_live.py). This copy is shown
// only if that can't be reached, and has the same shape as the API's `horses`.

// App-palette swatch per saddle, matched by keyword on the ClickUp Saddle
// dropdown name (or the task label). Unknown saddles fall back to the
// dropdown's own ClickUp color, then grey.
export const SADDLE_COLORS = [
  ["western", "#5B7FA6"],
  ["pat", "#2E4E8E"],
  ["green", "#3F6B45"],
  ["orange", "#D2761B"],
  ["pink", "#B5537A"],
  ["blue", "#2E6E8E"],
  ["red", "#A31E22"],
  ["string", "#7A5230"],
  ["old", "#7a7a7a"],
];

export const TACK_FALLBACK = [
  {
    "horse": "Avelin",
    "bit": "Myler SS Kimberwick level 2 Low Port Comfort Snaffle 5\"",
    "breast_collar": "Breast Collar",
    "boots": null,
    "pad": null,
    "notes": null,
    "url": null,
    "saddles": [
      {
        "label": "🟢 Green Saddle",
        "saddle": "🟢 Green Saddle",
        "color": null,
        "pad": "None needed",
        "rank": "1st",
        "note": "Right-side released, left closed. Perfect fit.",
        "url": null
      },
      {
        "label": "🟠 Orange Saddle",
        "saddle": "🟠 Orange Saddle",
        "color": null,
        "pad": "Black pad, 54\", chest collar",
        "rank": "2nd",
        "note": null,
        "url": null
      },
      {
        "label": "📿 String Saddle",
        "saddle": "📿 String Saddle",
        "color": null,
        "pad": "Pad + chest collar",
        "rank": "3rd",
        "note": null,
        "url": null
      }
    ]
  },
  {
    "horse": "Dahlia",
    "bit": "Qu's old 3-piece D-ring with brass rollers",
    "breast_collar": null,
    "boots": null,
    "pad": null,
    "notes": "Bridle: Western bridle, crown + browband only. No throat latch, no cavesson.",
    "url": null,
    "saddles": [
      {
        "label": "🔵 Blue Saddle",
        "saddle": "🔵 Blue Saddle",
        "color": null,
        "pad": "Squishy grippy half pad (breaking in)",
        "rank": "1st",
        "note": "60cm. Per Agetha 7/28",
        "url": null
      }
    ]
  },
  {
    "horse": "Hugo",
    "bit": "Myler SS level 2 Dee Low Port 4 3/4\"",
    "breast_collar": null,
    "boots": "Scoot Boots: fronts fit OK, hinds stretched",
    "pad": null,
    "notes": null,
    "url": null,
    "saddles": [
      {
        "label": "🔴 Red Saddle",
        "saddle": "🔴 Red Saddle",
        "color": null,
        "pad": "Standard pad",
        "rank": "1st",
        "note": "Use for smaller rider (Clara)",
        "url": null
      },
      {
        "label": "👵🏼 Old Saddle",
        "saddle": "👵🏼 Old Saddle",
        "color": null,
        "pad": "Thinline + pad",
        "rank": "2nd",
        "note": "Use for adult rider",
        "url": null
      }
    ]
  },
  {
    "horse": "Linka",
    "bit": "Myler SS Kimberwick level 2 Low Port Comfort Snaffle 5\"",
    "breast_collar": null,
    "boots": null,
    "pad": null,
    "notes": null,
    "url": null,
    "saddles": [
      {
        "label": "🟣 Pink Saddle",
        "saddle": "🟣 Pink Saddle",
        "color": null,
        "pad": "Standard pad",
        "rank": "1st",
        "note": null,
        "url": null
      },
      {
        "label": "🟠 Orange Saddle",
        "saddle": "🟠 Orange Saddle",
        "color": null,
        "pad": "Standard pad (once broken in)",
        "rank": "2nd",
        "note": null,
        "url": null
      }
    ]
  },
  {
    "horse": "Mickey",
    "bit": "Myler 3 3/4 D level 1 Twist Comfort Snaffle Copper Roller 5\"",
    "breast_collar": null,
    "boots": null,
    "pad": null,
    "notes": null,
    "url": null,
    "saddles": [
      {
        "label": "🟣 Pink Saddle",
        "saddle": "🟣 Pink Saddle",
        "color": null,
        "pad": "Pad + small rear riser",
        "rank": "1st",
        "note": null,
        "url": null
      },
      {
        "label": "👵🏼 Old Saddle",
        "saddle": "👵🏼 Old Saddle",
        "color": null,
        "pad": "Thinline + pad",
        "rank": "2nd",
        "note": null,
        "url": null
      }
    ]
  },
  {
    "horse": "Qu",
    "bit": "Myler Level 3 Wide Kimberwick MB33 5.5\"",
    "breast_collar": "Breast Collar",
    "boots": "Scoot Boots: sizing issues, Adjust model being evaluated",
    "pad": null,
    "notes": null,
    "url": null,
    "saddles": [
      {
        "label": "🟠 Orange Saddle",
        "saddle": "🟠 Orange Saddle",
        "color": null,
        "pad": "Black half pad, breast collar",
        "rank": "1st",
        "note": "Interim setup (Agetha 7/28)",
        "url": null
      },
      {
        "label": "🟢 Green Saddle",
        "saddle": "🟢 Green Saddle",
        "color": null,
        "pad": "Standard pad",
        "rank": "2nd",
        "note": "Slides and pinches once shifted",
        "url": null
      }
    ]
  },
  {
    "horse": "Stendahl",
    "bit": "Myler Level 1 HBT Shank 5\"",
    "breast_collar": null,
    "boots": null,
    "pad": null,
    "notes": null,
    "url": null,
    "saddles": [
      {
        "label": "🟣 Pink Saddle",
        "saddle": "🟣 Pink Saddle",
        "color": null,
        "pad": "Standard pad",
        "rank": "1st",
        "note": "Fits great (Agetha 7/28)",
        "url": null
      },
      {
        "label": "📿 String Saddle",
        "saddle": "📿 String Saddle",
        "color": null,
        "pad": "Pad (so-so fit)",
        "rank": "2nd",
        "note": null,
        "url": null
      }
    ]
  },
  {
    "horse": "Tammy",
    "bit": "Herm Sprenger SATINOX D-Ring Single Jointed 135mm",
    "breast_collar": null,
    "boots": "Scoot Boots: size 3 front, size 2 hind (Adjust). Fit confirmed.",
    "pad": null,
    "notes": null,
    "url": null,
    "saddles": [
      {
        "label": "🟠 Orange Saddle",
        "saddle": "🟠 Orange Saddle",
        "color": null,
        "pad": "Standard pad",
        "rank": "1st",
        "note": "1st choice, better fit than Pink",
        "url": null
      },
      {
        "label": "🟣 Pink Saddle",
        "saddle": "🟣 Pink Saddle",
        "color": null,
        "pad": "Standard pad",
        "rank": "2nd",
        "note": null,
        "url": null
      },
      {
        "label": "📿 String Saddle",
        "saddle": "📿 String Saddle",
        "color": null,
        "pad": "Standard pad",
        "rank": "3rd",
        "note": null,
        "url": null
      }
    ]
  },
  {
    "horse": "Ulyssa",
    "bit": "Myler SS FullCheek level 2 Low Port Comfort Snaffle 5\"",
    "breast_collar": "Breast Collar",
    "boots": "Scoot Boots: front feet, size 2",
    "pad": null,
    "notes": null,
    "url": null,
    "saddles": [
      {
        "label": "🟣 Pink Saddle",
        "saddle": "🟣 Pink Saddle",
        "color": null,
        "pad": "Standard pad, chest collar",
        "rank": "1st",
        "note": "Fits great (Agetha 7/28)",
        "url": null
      },
      {
        "label": "📿 String Saddle",
        "saddle": "📿 String Saddle",
        "color": null,
        "pad": "Pad + chest collar",
        "rank": "2nd",
        "note": null,
        "url": null
      }
    ]
  }
];
