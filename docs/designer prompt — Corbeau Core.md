## Sentient — Designer Prompt (Design System First)

### Objective
Design a **cold, calibrated instrument** UI system for Sentient. The current app feels like “basic RN UI”; your job is to define a **cohesive component language + tokens** that make the product feel like a premium, quiet instrument.

Sentient is **directive-first**: the interface is calm, typographic, and evidence-driven. Color is **functional**, never decorative.

### Deliverables (Figma)
- **1) Tokens page**: color, type scale, spacing, radius, strokes, motion rules.
- **2) Components page**: buttons, input, chips, panels, dividers, list rows, Smart Signal cards (collapsed/expanded), Context panel (collapsed/expanded), chart primitives (gridlines, series colors, highlights).
- **3) Screens (Hi-fi)**:
  - Home (Directive hero + Focus cue + Avoid + Smart Signals rail (max 2) + Context panel)
  - Dashboard (panel-based “proof of trust”: baselines + trends + log; diagnostics collapsed)
  - Settings (quiet utilities; no Smart Cards)

### Non‑negotiables (PRD alignment)
- **IA**: 3 tabs only — Home / Dashboard / Settings.
- **Smart Cards (“Smart Signals”)**:
  - **Home screen only**
  - **Max 2 visible**
  - Compact, expandable **in place**
  - Disappear when completed; dismiss is calm “Not now”
  - **Workout entry UI is ONLY via the WORKOUT_LOG Smart Signal** triggered by workout detection
- **Analyst Insight**:
  - Summary visible by default (1–2 sentences)
  - Longer detail behind explicit “More context” expansion
- **Tone**: calm, clinical, precise. No hype. No “protocol/execute/mission/orders”.

---

## 1) Palette — “Corbeau Core” (Cold Instrument, violet removed)
This is the single source of truth. Do not introduce new hues.

### Roles (not just colors)
- **Background gravity**: deep near-black with blue bias
- **Surfaces**: blue-graphite panels; depth via tone shift, not heavy shadows
- **Text**: soft off-white for authority; cool gray for metadata
- **Accent**: disciplined blue for “aligned/active”
- **Caution/Strain**: only when warranted (constraints or protection)

### Tokens (use these exact hexes)
- **`color.bg`**: `#111122`
- **`color.surface`**: `#1A2133`
- **`color.surface2`** (input wells / nested surfaces): `#14192A`
- **`color.text.primary`**: `#F0EEEE`
- **`color.text.secondary`**: `#9698A3`
- **`color.accent.primary`** (alignment/active): `#3A8CA8`
- **`color.accent.caution`**: `#D6A85C`
- **`color.accent.strain`**: `#C85C5C`
- **`color.border.default`** (hairline): `#2A3146`
- **`color.border.subtle`**: `#1B2238`

### Color rules
- **Functional only**: no decorative gradients, no rainbow indicators.
- **One accent per screen** by default (the blue). Caution/strain only when data justifies it.
- **Hairlines > shadows**. Use 1px strokes for structure.

---

## 2) Typography (Tiimo-inspired calm, instrument hierarchy)
Typography is the primary “design”.

### Type scale (name → use)
- **Hero / Directive**: large, high authority (e.g. “Endurance — Maintenance”)
- **Subhero / Focus cue**: 1 sentence, calm, colored by accent (not neon)
- **Section labels**: restrained caps for “AVOID”, “SMART SIGNALS”, “ANALYST INSIGHT”
- **Body**: readable, calm
- **Meta**: timestamps, confidence, labels

### Rules
- No shouting. No exclamation marks.
- Caps only for small labels; keep tracking tight and contrast restrained.

---

## 3) Layout + Depth (the “instrument” feel)
- **Depth field**: achieved via tonal layers (`bg` → `surface` → `surface2`) and hairlines.
- **No playful shadows**. If any elevation exists, it’s barely perceptible.
- Use **consistent spacing rhythm**; whitespace is part of the brand.

---

## 4) Component language (what to design)

### A) Smart Signal (Home)
Collapsed row:
- Title (short)
- One-line hint
- CTA: “Review”
Expanded:
- Compact header with workout/sleep context
- One-line input (or choice)
- Primary action + “Not now”

**Must feel like a system prompt, not a social card.**

### B) Context panel (“Why this directive?”)
Collapsed:
- Label + 2-line summary + subtle “More context ›”
Expanded:
- Summary + detail + small meta row (State / Vitality / Confidence / Last update)

### C) Dashboard panel grammar (UltraHuman/Oura-inspired)
Define primitives:
- Panel container
- Metric header + value + baseline + trend glyph
- Chart rules: gridline weight, axis labels, highlight color, series color (use accent.primary)
- Dense log row (quiet separators, compact metadata)

---

## 5) What I need from you (final outputs)
- A token sheet with the exact hex values above.
- Component specs with states (default/pressed/disabled; expanded/collapsed).
- 3 screen comps (Home/Dashboard/Settings) using those components and tokens.


