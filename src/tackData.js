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
    "bit": "Myler SS Kimberwick L2 Low Port Comfort Snaffle 5\"",
    "breast_collar": null,
    "boots": null,
    "pad": null,
    "notes": "Alt saddles: 🟠 Orange (with black pad, 54\", breast collar) and 📿 String (with pad & breast collar). No sheepskin-center pads (creates too much back pressure). Green saddle: right-side released, left-side closed adjustment balances panels perfectly (per Agetha 7/28).",
    "url": "https://app.clickup.com/t/86e3anytc",
    "saddles": [
      {
        "label": "🟢 Green Saddle",
        "saddle": "🟢 Green Saddle",
        "color": "#00FF00",
        "pad": null,
        "rank": "1st",
        "note": null,
        "url": "https://app.clickup.com/t/86e3cwq79"
      },
      {
        "label": "🟠 Orange Saddle",
        "saddle": "🟠 Orange Saddle",
        "color": "#FFA500",
        "pad": null,
        "rank": "2nd",
        "note": "54\" girth. No sheepskin-center pads (creates too much back pressure). Needs breast collar (size TBD).",
        "url": "https://app.clickup.com/t/86e3btx48"
      },
      {
        "label": "🔵 Pat's Saddle",
        "saddle": "🟦 Pat's Saddle",
        "color": "#3e63dd",
        "pad": null,
        "rank": "3rd",
        "note": "perfect fit",
        "url": "https://app.clickup.com/t/86e3cwrcz"
      }
    ]
  },
  {
    "horse": "Dahlia",
    "bit": "Myler L2 Med Baucher Low Port Comfort Snaffle 4.75\"",
    "breast_collar": null,
    "boots": null,
    "pad": null,
    "notes": "Blue saddle 60cm, squishy grippy pad while breaking in (per Agetha 7/28). Western bridle with only crown piece and browband, no throat latch, no cavesson. Straight-sided bits help Dahlia turn better. Q's old three-piece D-ring bit.",
    "url": "https://app.clickup.com/t/86e3anytk",
    "saddles": [
      {
        "label": "🔵 Dahlia's Saddle",
        "saddle": "🔵 Blue Saddle",
        "color": "#0f5096",
        "pad": "Grippy Half Pad",
        "rank": "1st",
        "note": null,
        "url": "https://app.clickup.com/t/86e3cwuep"
      }
    ]
  },
  {
    "horse": "Hugo",
    "bit": "Myler SS L2 Dee Low Port 4.75\"",
    "breast_collar": null,
    "boots": "Scoot Boots (fitted set)",
    "pad": null,
    "notes": "Red saddle for smaller rider (Clara). 👵🏼 Old Saddle with thinline + pad for adult rider. Alt bits: Myler L2 Med Baucher 4.75\", Myler L1 HBT Shank. Scoot Boots: fronts OK (hoof pick needed for front straps), hinds have stretched front rubber pieces, awaiting longer front straps.",
    "url": "https://app.clickup.com/t/86e3anytf",
    "saddles": [
      {
        "label": "🔴 Red Saddle",
        "saddle": "🔴 Red Saddle",
        "color": "#FF0000",
        "pad": null,
        "rank": "1st",
        "note": "smaller rider",
        "url": "https://app.clickup.com/t/86e3cwp5n"
      },
      {
        "label": "🔵 Dahlia's saddle",
        "saddle": "🔵 Blue Saddle",
        "color": "#0f5096",
        "pad": null,
        "rank": "2nd",
        "note": null,
        "url": "https://app.clickup.com/t/86e3cwpt4"
      },
      {
        "label": "🤠 Blue Western Saddle",
        "saddle": "🤠 Blue Western",
        "color": "#cecece",
        "pad": "Blue Wool",
        "rank": "3rd",
        "note": null,
        "url": "https://app.clickup.com/t/86e3fx2ma"
      }
    ]
  },
  {
    "horse": "Linka",
    "bit": "Myler SS Kimberwick L2 Low Port Comfort Snaffle 5\"",
    "breast_collar": null,
    "boots": null,
    "pad": null,
    "notes": "Alt saddle: 🟠 Orange (once broken in).",
    "url": "https://app.clickup.com/t/86e3anytd",
    "saddles": [
      {
        "label": "🟢 Green Saddle",
        "saddle": "🟢 Green Saddle",
        "color": "#00FF00",
        "pad": "ThinLine (no shims)",
        "rank": "1st",
        "note": null,
        "url": "https://app.clickup.com/t/86e3cwmaq"
      },
      {
        "label": "🟠 Orange Saddle",
        "saddle": "🟠 Orange Saddle",
        "color": "#FFA500",
        "pad": null,
        "rank": "2nd",
        "note": "Available once Orange saddle is broken in.",
        "url": "https://app.clickup.com/t/86e3btx4a"
      },
      {
        "label": "🩷 Pink Saddle",
        "saddle": "🟣 Pink Saddle",
        "color": "#C154C1",
        "pad": null,
        "rank": "3rd",
        "note": "use 2 back billets",
        "url": "https://app.clickup.com/t/86e3cwnd7"
      }
    ]
  },
  {
    "horse": "Mickey",
    "bit": "Myler 3¾ D L1 Twist Comfort Snaffle Copper Roller 5\"",
    "breast_collar": null,
    "boots": null,
    "pad": null,
    "notes": "Pink saddle with small rear riser. Alt: 👵🏼 Old Saddle with thinline + pad.",
    "url": "https://app.clickup.com/t/86e3anytg",
    "saddles": [
      {
        "label": "👵🏼 Old Saddle",
        "saddle": "👵🏼 Old Saddle",
        "color": "#A9A9A9",
        "pad": null,
        "rank": "1st",
        "note": "Uses thinline + pad (not in dropdown). No rear riser with Old Saddle (rear riser is Pink Saddle only).",
        "url": "https://app.clickup.com/t/86e3btx46"
      }
    ]
  },
  {
    "horse": "Qu",
    "bit": "Myler L3 Wide Kimberwick MB33 5.5\"",
    "breast_collar": null,
    "boots": "Scoot Boots (fitted set)",
    "pad": null,
    "notes": "Orange saddle with black half pad and breast collar (interim per Agetha 7/28). No sheepskin-center pads. Alt: 🟢 Green (70cm, slides and pinches at top of panels once shifted). Breast collar: top strap snug, lower areas loose for shoulder movement. Current collars don't fit well, need to source proper one. Scoot Boots: hinds can't clip in front, fronts tight on heels, possible size up needed.",
    "url": "https://app.clickup.com/t/86e3anytj",
    "saddles": [
      {
        "label": "🟠 Orange Saddle",
        "saddle": "🟠 Orange Saddle",
        "color": "#FFA500",
        "pad": "Black Fuzzy Half Pad",
        "rank": "1st",
        "note": null,
        "url": "https://app.clickup.com/t/86e3fwqrb"
      },
      {
        "label": "🟢 Green Saddle",
        "saddle": "🟢 Green Saddle",
        "color": "#00FF00",
        "pad": "Front Gel Riser",
        "rank": "2nd",
        "note": "70cm. Slides and pinches at top of panels once shifted. Backup option, Orange is preferred.",
        "url": "https://app.clickup.com/t/86e3btx45"
      }
    ]
  },
  {
    "horse": "Stendahl",
    "bit": "Myler L1 HBT Shank 5\"",
    "breast_collar": null,
    "boots": null,
    "pad": null,
    "notes": "Pink saddle fits great (per Agetha 7/28). Alt: 📿 String (so-so fit). Alt bit: Eggbutt Mullen with roller & tongue relief 5\".",
    "url": "https://app.clickup.com/t/86e3anytb",
    "saddles": [
      {
        "label": "🩷 Pink Saddle",
        "saddle": "🟣 Pink Saddle",
        "color": "#C154C1",
        "pad": null,
        "rank": "1st",
        "note": null,
        "url": "https://app.clickup.com/t/86e3cwkgw"
      },
      {
        "label": "🔵 Pat's Saddle",
        "saddle": "🟦 Pat's Saddle",
        "color": "#3e63dd",
        "pad": "ThinLine (no shims)",
        "rank": "2nd",
        "note": "good fit",
        "url": "https://app.clickup.com/t/86e3cwk4x"
      }
    ]
  },
  {
    "horse": "Tammy",
    "bit": "Herm Sprenger SATINOX D-Ring Single Jointed 135mm",
    "breast_collar": null,
    "boots": "Scoot Boots (fitted set)",
    "pad": null,
    "notes": "Orange is 1st choice, better fit than Pink. Alt saddles: 🟣 Pink, 📿 String. Alt bit: Myler L1 HBT Shank. Scoot Boots: size 3 front, size 2 hind (Adjust model). Fit confirmed.",
    "url": "https://app.clickup.com/t/86e3anyth",
    "saddles": [
      {
        "label": "🟣 Pink Saddle",
        "saddle": "🟣 Pink Saddle",
        "color": "#C154C1",
        "pad": null,
        "rank": "1st",
        "note": "Secondary to Orange. Orange is better fit.",
        "url": "https://app.clickup.com/t/86e3btx49"
      }
    ]
  },
  {
    "horse": "Ulyssa",
    "bit": "Myler SS FullCheek L2 Hook Low Port Comfort Snaffle 5\"",
    "breast_collar": "Breast Collar (larger)",
    "boots": "Scoot Boots (fitted set)",
    "pad": null,
    "notes": "Pink saddle with breast collar fits great (per Agetha 7/28). Alt: 📿 String (with breast collar). Alt bit: Myler SS L2 Dee Low Port 4.75\". Scoot Boots: front feet, size 2. Breast collar size not specified in old records.",
    "url": "https://app.clickup.com/t/86e3anyte",
    "saddles": [
      {
        "label": "🩷 Pink Saddle",
        "saddle": "🟣 Pink Saddle",
        "color": "#C154C1",
        "pad": "Grippy Rear Riser",
        "rank": "1st",
        "note": null,
        "url": "https://app.clickup.com/t/86e3cwt63"
      }
    ]
  }
];
