# Sentient v3.0: Product Requirement Document (Gold Master)

**Version:** 3.0 (Gold Master)
**Role:** Product Lead & Senior Architect
**Status:** **APPROVED FOR BUILD**

---

## 1. Executive Vision: The Performance Intelligence Engine

**Sentient is a Performance Intelligence Engine.**

We combine the rigorous data science of elite fitness trackers with the directive-based guidance of a System Analyst.

*   **The Pivot:** We do not "play" a game (XP, Levels). We "operate" a biological system (Biometrics, Alignment).
*   **The Core Loop:** Observe State $\rightarrow$ Issue Directive $\rightarrow$ Measure Alignment.

### 1.1 The Core Reframe

| Old World (v2 – Gamified RPG) | New World (v3 – Performance Intelligence) |
| ----------------------------- | ----------------------------------------- |
| Player Identity               | **Operator Identity**                     |
| XP & Leveling                 | **Alignment & Calibration**               |
| Quests                        | **Directives**                            |
| Grinding                      | **Cost Management**                       |
| Winning                       | **Operating Accurately**                  |

> **"We do not reward raw effort; we reward Alignment—the strategic discipline to execute the plan, even when the plan is to rest."**

---

## 2. Ubiquitous Language (The Code of Law)

Strict semantic enforcement across DB, UI, and AI. This table is the **Absolute Source of Truth**.

| Category | Concept | **CANONICAL TERM** | Definition / Logic | Allowed Synonyms / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Identity** | The User | `OPERATOR` | The human pivot point running the biological system. | ❌ Player, User, Avatar |
|  | The Interface | `ANALYST` | The system’s narrative persona. Clinical, objective, precise. | ❌ Coach, Game Master |
|  | Strategy Agent | `PLANNER` | AI logic calculating the 3-Day Arc. | Internal Logic Only |
|  | Tactics Agent | `OPERATIVE` | AI logic generating specific Sessions. | Internal Logic Only |
| **Biometrics** | Baseline Recovery | `VITALITY` | Baseline capacity to absorb stress (0–100). | System Integrity (❌ Health, HP) |
|  | Daily Energy | `ADAPTIVE_CAPACITY` | Fuel available for today's stress (0-100%). | Daily Tank (❌ Mana, Battery) |
|  | Work Cost | `PHYSIOLOGICAL_LOAD` | The metabolic/neural cost of work. | Load, Cost (❌ XP, Strain, Score) |
|  | Autonomic Arousal | `STRESS` | A time-series index (0–100) estimating autonomic arousal (sympathetic load) across the day. | Stress Index (❌ Mood, Anxiety diagnosis) |
| **Work** | Activity Block | `SESSION` | A bounded period of physical exertion. | Workout, Activity (❌ Quest) |
|  | Daily Goal | `DIRECTIVE` | The strategic objective for the 24h window. | Orders, Plan (❌ Mission) |
|  | Specific Intent | `SESSION_FOCUS` | The physiological stimulus target (e.g., "Zone 2"). | Target, Intent (❌ Challenge) |
| **States** | Green State | `READY_FOR_LOAD` | Surplus capacity. Primed for stress. | "Prime, Go Mode" |
|  | Blue State | `BUILDING_CAPACITY` | Recovering from recent positive stress. | "Adaptation, Standard" |
|  | Yellow State | `NEEDS_STIMULATION` | Insufficient stimulus detected over time. | Stagnation |
|  | Orange State | `HIGH_STRAIN` | Neural saturation. Risk of burnout. | "Overreaching, Warning" |
|  | Red State | `PHYSICAL_STRAIN` | Structural tolerance compromised. | Injury Risk |
|  | Purple State | `RECOVERY_MODE` | Acute system failure (Immune/Viral). | "Sickness, Viral" |
| **Progression** | Execution Score | `ALIGNMENT_SCORE` | Rolling 30-day accuracy of adherence (%). | Alignment, Accuracy (❌ Level, Rank) |
|  | Reliability Chain | `CONSISTENCY` | Consecutive days of Alignment. | "Streak, Chain" |
|  | Total Volume | `THE_GRIND` | Accumulating Load from any activity. | "Total Load, Volume" |
| **Classes** | Elite Tier | `OPERATOR_CLASS` | >90% Alignment Score. | Gold Styling |
|  | Standard Tier | `CANDIDATE_CLASS` | 70–89% Alignment Score. | Silver Styling |
|  | Warning Tier | `UNCALIBRATED` | <70% Alignment Score. | Red Styling (❌ Noob, Beginner) |
| **Logic** | Logic Switch | `DAWN_PROTOCOL` | App launch logic (Advance vs. Regenerate). | Daily Reset |
|  | Calibration | `ZERO_DAY_PROTOCOL` | First launch logic (Fetch 30-day history for instant state). | "Init, Onboarding" |
|  | Correction | `INTRA_DAY_RECAL` | Mid-day logic update triggered by significant data change. | Course Correction |
|  | Planning Window | `3_DAY_ARC` | The Strategy: Today (Exec), Tomorrow (Prep), Horizon (Outlook). | The Plan |
|  | Validation | `CHECK_IN` | Scanning sensors to verify Session completion. | "Verify, Sync" |
| **UX Features** | Education | `CONTEXTUAL_INTEL` | Tap-to-Explain interaction pattern (Concept Modals). | "Insight, Info" |
|  | Data Proof | `BIOLOGY` | Evidence view showing baselines and trends for trust. | "Trends, Charts" (❌ Vault, Trust Layer) |
|  | User Input | `MISSION_VARIABLES` | User tags (Alcohol, Caffeine, Injury). | "Journal, Tags" |

### 2.1 The Two-Layer Language Standard (Canonical vs. Human-Readable)

**Requirement:** Sentient must maintain strict internal vocabulary while presenting calm, human-readable labels in the UI.

This is a **two-layer system**:

1.  **Canonical Layer (Internal / System Truth)**
    - The app’s data model, database keys, engine outputs, and AI prompts MUST use the canonical terms above (e.g., `READY_FOR_LOAD`, `VITALITY`, `DIRECTIVE`).
    - Canonical terms are **never “prettified”** internally and are the only valid identifiers for state/logic.

2.  **Display Layer (UI / Human-Readable)**
    - The UI MAY use human-readable labels, but ONLY as a deterministic translation of a canonical term.
    - The UI MUST NOT invent replacement concepts that override the canonical system (e.g., “Training”, “Detraining”, “Overreached” are forbidden if they replace `BUILDING_CAPACITY`, `NEEDS_STIMULATION`, `HIGH_STRAIN`, etc.).
    - Human-readable labels are **not new taxonomy**. They are **translations**.

**Single Source of Truth:** The product must define a centralized translation table for each canonical domain:
- **States:** `READY_FOR_LOAD` → “Ready for Load”, `BUILDING_CAPACITY` → “Building Capacity”, etc.
- **Directives:** `DIRECTIVE.category` + `stimulus_type` translate into short readable labels (e.g., “Strength — Overload”) without changing the underlying token pair.
- **Metrics:** `VITALITY`, `ADAPTIVE_CAPACITY`, `PHYSIOLOGICAL_LOAD` receive stable labels + units.

**Traceability Rule (where canonical tokens may appear):**
- Canonical tokens MAY be shown in **BIOLOGY** (data proof), developer tools, export, and diagnostics.
- Canonical tokens MUST NOT be the primary language of the main experience. The main experience must remain human-readable and calm.

#### 2.1.1 Home Language Contract

**Purpose:** Define the exact language rules for Home screen display to ensure it reads like an Analyst briefing a human, while preserving strict canonical taxonomy.

**3-Question Rule (Ship Gate):**
In ≤ 5 seconds, a new user must be able to answer:
1. **What kind of day is it?** → Hero: "<Category> Day" (e.g., "Strength Day")
2. **How do I succeed?** → Mode line: short behavior cue derived from stimulus_type
3. **What should I avoid?** → Avoid cue: one common mistake (not physiology)

**Banned System-Speak (Home-visible text must never use):**
- "execute", "protocol", "mission", "orders", "proceed", "maximize", "ignite", "crush", "absolutely"
- Any coercive or command-oriented language
- These terms are already banned in §3.4.2—enforce in UI copy too

**Physiology Placement Rule:**
- Physiology explanations belong in Analyst Insight (expanded context), not in hero or mode line
- Home hero and mode line must focus on **behavior**, not biological mechanisms
- Example: Mode line says "Lift heavy with full recovery" (behavior), not "Maximize myofibrillar disruption" (physiology)

**5-Second Screenshot Test:**
A screenshot of Home must immediately communicate:
- The day type (Category Day)
- The success behavior (Mode line)
- The failure mode to avoid (Avoid cue)
- No ambiguity, no jargon, no system-speak

---

## 3. The Intelligence Architecture (The Brain)

### 3.1 The "Zero-Day" Protocol (First Launch)
The system must never show an empty state. It must be useful immediately.

*   **Trigger:** App First Launch (`isFirstLaunch === true`).
*   **Action:**
    1.  **Permissions:** Request full HealthKit/Health Connect read access.
    2.  **Deep Query:** Batch fetch the last 30 days of:
        *   Sleep Analysis (Duration/Efficiency)
        *   HRV (SDNN/rMSSD) & Resting Heart Rate
        *   Active Energy & Workout Logs
    3.  **Instant Calibration:**
        *   Compute `Baseline_Vitality` (30-day avg).
        *   Compute `Baseline_Load` (Typical output).
    4.  **The First Directive:** Compare *Yesterday's* data against this new *Baseline* to issue a valid, personalized Directive for *Today*.
*   **UX:** Display "Calibrating Biometrics..." $\rightarrow$ Reveal populated Dashboard.

#### 3.1.1 Zero-Day UX Acceptance Criteria (Non-Negotiable)

On first launch (`ZERO_DAY_PROTOCOL`), the app MUST:

1.  **Never show an empty state**
    - The operator must see an explicit calibration state (e.g., “Calibrating Biometrics…”), not a generic spinner.
2.  **Explain the phase, not the math**
    - The UI must communicate progress in operator terms (Permissions → Calibration → First Directive), without exposing technical implementation.
3.  **Reveal a populated, directive-first home state**
    - Upon completion, Home must show a valid **DIRECTIVE** for Today and the computed **SYSTEM STATE**.
    - Home must prioritize interpretation (Directive/State/Capacity). Raw biometrics belong to `THE_VAULT` unless surfaced via `CONTEXTUAL_INTEL`.
4.  **Fail safely**
    - If permissions are denied, the UI must state that the system cannot calibrate without sensor access and provide the next action (e.g., enable Health access).

### 3.2 The "Dawn Protocol" (Daily Routine)
Logic executes upon every new day launch.

1.  **Bio-Scan:** Fetch T-0 (Today) and T-1 (Yesterday) data.
2.  **State Calculation:** Assign canonical state (e.g., `READY_FOR_LOAD`).
3.  **The Handshake:**
    *   **If State matches Forecast:** Advance Arc (Day 1 becomes Today).
    *   **If State deviates:** Regenerate Arc (Call Planner AI).

### 3.3 Intra-Day Recalibration (Live Course Correction)
The plan must change if reality changes.

*   **Trigger:** Significant data event detected mid-day (e.g., Nap > 20m, Acute HRV drop, User tags "High Stress").
*   **Logic:**
    1.  Re-calculate `ADAPTIVE_CAPACITY`.
    2.  **Condition:** If Capacity drops below critical threshold for current Directive.
    3.  **Override:** Issue "Course Correction".
*   **Analyst Output:** *"Capacity drain detected. Abort 'Overload'. New Directive: 'Regulation'."*

#### 3.3.1 `INTRA_DAY_RECAL` Status Surfacing (UX + Observability)

**Purpose:** Make mid‑day recalibration **visible and trustworthy** without turning Home into diagnostics. Operators should be able to tell: **Did the system course-correct today? Why? When?**

##### A) Trigger policy (product definition)

`INTRA_DAY_RECAL` may be triggered only when there is a **material** change in the deterministic plan inputs:

- **Directive change**
  - `DIRECTIVE.category` changes (e.g., `STRENGTH` → `ENDURANCE`)
  - `DIRECTIVE.stimulus_type` changes (e.g., `OVERLOAD` → `MAINTENANCE`)
- **Constraint change**
  - Any constraint value changes (e.g., `allow_impact`, `heart_rate_cap`, required equipment)
- **(Optional, future) Evidence shock**
  - Clear, high-signal evidence events that would deterministically change directive/constraints (e.g., new workout logged; sleep confirmed; injury tag added)

**Cooldown rule (ship gate):**
- No more than **1 recalibration per 2 hours** unless the system enters a critical safety state.
- Daily cap: **≤ 3** recalibrations/day (after that, hold stable and record `COOLDOWN_BLOCKED`).

##### B) UI requirements (where it appears)

- **Home (required):** a compact `Course Correction` chip in the status row when a recalibration occurred today.
  - Default state: no chip (quiet).
  - When triggered: show `Course Correction` + time (e.g., “Course correction · 13:42”).
  - Tap → opens `CONTEXTUAL_INTEL` showing the reason line(s) and what changed.
- **Dashboard (optional):** a small “Plan Updated” meta line at the top of `TRENDS` if a recalibration occurred today.
- **Diagnostics/Dev Console (required):** show the full audit record (old directive/constraints → new directive/constraints; reason).

##### C) Copy rules (ship gate)

- Must be neutral and factual.
- Forbidden: hype, blame, urgency language.
- Allowed examples:
  - “Course correction: constraints tightened after new activity.”
  - “Course correction: recovery evidence dropped vs baseline.”

##### D) Data + audit requirements (ship gate)

When `INTRA_DAY_RECAL` triggers, persist:
- `last_recal_at` (timestamp)
- `last_recal_reason` (one line)
- `recal_count` (int)
- `directive_snapshot` / `constraints_snapshot` used for change detection

##### E) Acceptance criteria

1. If no qualifying trigger occurs, the system remains day‑stable and no UI “course correction” signal is shown.
2. When a qualifying trigger occurs, the system updates directive/constraints deterministically and persists the recal metadata.
3. Home surfaces a compact course correction indicator that links to a clear explanation (Contextual Intel).
4. Recalibration never loops (cooldown + daily cap enforced).

### 3.3.2 Smart Cards (Home Interactivity Layer)

**Purpose:** Provide low-friction Operator interactivity on Home **without** compromising directive-first UX. Smart Cards surface only high-leverage inputs that improve the system’s evidence quality, constraints, and day-level planning.

**Non‑negotiables (Ship Gate):**
- **Max 2 cards visible** on Home at any time.
- Cards must be **calm, non-coercive**, and **single-decision** (one clear action).
- Cards must be **persistent**: once **Completed** (or intentionally dismissed per policy), they must not reappear.
- Cards must not push the Directive hero off-screen on a typical device; they belong **below** Directive/Focus/Avoid (or between Avoid and Context).

#### A) Card lifecycle + persistence
- **States:** `ACTIVE` → (`COMPLETED` | `DISMISSED`)
- **Ledger requirement:** The system must persist a card ledger (storage implementation is flexible) with:
  - `id`, `date`, `type`, `status`, `priority`, `payload`, timestamps
- **Stable ID rule:** Cards must have stable IDs to prevent duplicates.
  - Example: `${date}:${type}` (and append a context id for event-driven cards, e.g. workout id).

#### B) Selection rules (max 2)
- **Eligibility:** A card is eligible if its trigger condition is true **and** it is not `COMPLETED` **and** it is not blocked by its dismiss policy.
- **Ranking:** Prioritize by **impact on accuracy/safety** first, convenience second:
  1) Sleep confirmation (data quality)
  2) Workout log (evidence capture)
  3) Goals (longer-horizon tuning)
  4) Workout suggestion (value-add)
- **Tie-break:** Lowest numeric priority wins; then oldest `created_at`.

#### C) Card types (requirements + acceptance criteria)

##### 1) `SLEEP_CONFIRM` (Missing/Estimated Sleep Confirmation)
- **Trigger:** Sleep is missing OR sleep is derived from `ESTIMATED_7D` / `DEFAULT_6H` and requires Operator confirmation.
- **Action:** Operator confirms the estimate or sets a typical sleep duration (manual baseline preference).
- **Persistence:** Once confirmed, mark `COMPLETED` and store the preference for future fallback behavior.
- **Acceptance criteria:**
  - If sleep is missing and fallback was used, Home shows this card.
  - After confirm/set, the system updates the stored preference and the card does not reappear.

##### 2) `WORKOUT_LOG` (Today’s Workout → Add Log)
- **Trigger:** A workout is detected today AND no Operator workout log exists for it.
- **Action:** Fast log (one-liner) with optional “add details” expansion (sets/reps/intervals).
- **Data requirement:** Store logs in a dedicated “workout logs” store linked to the day, optionally linked to the detected workout id.
- **Persistence:** After save, mark `COMPLETED`. If dismissed, do not re-show that day unless a new workout event occurs.
- **Acceptance criteria:**
  - Card appears once per detected workout event until logged or dismissed.
  - Logging persists and becomes visible to downstream intelligence.

##### 3) `WORKOUT_SUGGEST` (LLM Suggested Session from Logs)
- **Trigger:** Enough recent logs exist (implementation threshold) AND system state/constraints allow suggestion AND no suggestion has been shown recently (rate limit).
- **Agent requirement:** Must use a **new agent (not Analyst)** with a programming persona grounded to `docs/exercise taxonomy.md`.
- **Non-negotiable:** Suggestions may not override Tier‑1 Directive/constraints; they can only propose a session that fits them.
- **Acceptance criteria:**
  - Suggestion is directive-consistent and constraint-compliant.
  - Operator can accept (“Add to today”), save for later, or dismiss; outcome is persisted.

###### 3.3.2.3.A Trainer suggestion constraints (ship gate)

- **Input constraints (required):**
  - Today’s `DIRECTIVE` (category + stimulus)
  - Hard constraints (`allow_impact`, optional HR cap, required equipment)
  - Recent workout log summaries (last 3–7 sessions)
- **Output format (required, JSON):**
  - `title` (≤ 50 chars)
  - `summary` (≤ 120 chars, one line)
  - `why` (optional, ≤ 200 chars; must reference directive/constraints in plain language)
  - `duration` (optional minutes)
  - `intensity` (optional LOW/MODERATE/HIGH; must match stimulus type)
- **Safety constraints (required):**
  - If `allow_impact = false`, no impact movements may be suggested.
  - If HR cap exists, no intensity prescription may exceed it; prefer a “cap-aware” phrasing (e.g., “keep under 145 bpm”).
  - The Trainer must not present medical advice or injury diagnosis.

###### 3.3.2.3.B Rate limiting + persistence (required)

- At most **1 suggestion/day** by default.
- Persist: suggestion payload + timestamp + operator action (`ADDED` | `SAVED` | `DISMISSED`).
- A dismissed suggestion does not reappear the same day unless a new qualifying event occurs (optional future).

##### 4) `GOALS` (Goals Intake / Update)
- **Trigger:** No goals set OR goals are stale OR Operator initiates.
- **Action:** Quick intake (guided prompts or micro-chat) to capture goals (e.g., fat loss, fitness, injury recovery).
- **Persistence:** Once saved, mark `COMPLETED` and do not re-show until refresh policy.
- **Acceptance criteria:**
  - Operator can set/update goals in < 30 seconds.
  - Goals are stored for future weighting/tuning (even if not yet used in scoring).

###### 3.3.2.4.A Goals data model (product requirement)

Store `OPERATOR_GOALS` as a durable preference object:

- `primary` (required): one sentence
- `secondary` (optional): one sentence
- `time_horizon` (optional): e.g., 4 weeks / 12 weeks
- `constraints` (optional): injury/limitations in plain language (non-medical)
- `updated_at` (timestamp)

##### 3.3.2.4.B Goals intake UX (ship gate)

- **Mode:** “Quick intake” first; micro-chat is optional.
- **Flow (default, ≤ 30s):**
  1) Primary goal (pick one or type)
  2) Time horizon (optional)
  3) Constraints/limitations (optional)
- **Tone:** calm, non-judgmental. No weight moralizing. No “before/after” framing.

##### 3.3.2.4.C Refresh policy (required)

- Stale threshold: **30 days** (show Goals card again).
- Operator may update goals any time from Settings (non-blocking).
- Goals changes may optionally trigger `INTRA_DAY_RECAL` only if they change deterministic constraints (future).

###### 3.3.2.X Smart Card Interaction Model (Modal-First) — Ship Gate

**Purpose:** Ensure Smart Cards never disrupt Home layout stability and provide focused, keyboard-safe interaction.

**Collapsed by default:**
- Home shows Smart Cards as compact collapsed rows/panels only.
- Cards display: Title, 1-line preview ("Tap to review" or key sentence), Status (optional) and icon.
- Tapping collapsed card never expands inline; it opens modal.

**Open behavior:**
- Tap a card → opens Smart Card Modal (centered, focus trap).
- One at a time: only one Smart Card modal can be open.
- Home remains stable: opening a card must not push/shift the Home layout.

**Smart Card Modal (UX spec):**

**A) Placement + sizing:**
- Centered "dialog" modal, not bottom-sheet by default.
- Max width: visually capped (tablet-friendly); on phones it should still read as centered.
- Max height: clamps to available viewport; content scrolls within modal (never behind keyboard).
- Safe areas: modal respects top/bottom safe areas.

**B) Keyboard safety (ship gate):**
- When keyboard appears:
  - Modal content must reflow/resize so the focused input and primary CTA remain visible.
  - No text fields can be obscured.
  - The bottom tab bar must not overlap modal actions (modal sits above it).

**C) Structure (consistent across card types):**
- Header: card title + short context line (1 line).
- Body: card-specific content + inputs (if any).
- Primary CTA: single decisive action (e.g., "Save", "Confirm", "Continue").
- Secondary action: "Not now" (dismiss per policy).
- Close affordance: top-right close (equivalent to "Not now" unless card is hard-blocking; Smart Cards should not be hard-blocking).

**D) Dismiss rules:**
- Tap outside to dismiss: allowed (same as "Not now") unless the card is in a critical safety flow (not expected for Smart Cards).
- Swipe-to-dismiss: optional, but must not cause accidental dismissal during form scroll.

**Input field behavior (forms inside modal):**
- Inputs must be card-type specific (as today), but presented in a consistent modal grammar:
  - Label → input → helper text (optional)
- Validation errors inline, calm tone
- Primary CTA disabled until valid (when applicable).
- On submit:
  - Modal closes
  - Card transitions to COMPLETED
  - Home list updates (card disappears or shows completed state depending on policy)

**Accessibility / interaction (ship gate):**
- Modal must trap focus (screen-reader friendly).
- Close button and CTAs have clear labels.
- Dynamic type: modal scroll must still work; CTA remains reachable.

**Acceptance Criteria (QA):**
- Open any Smart Card with inputs; keyboard appears; no overlap with keyboard or bottom menu; CTA stays visible.
- Home does not reflow when opening/closing card.
- Form-heavy cards remain usable on smallest supported phone size.
- Only one modal can be open; back/close returns to Home cleanly.
- Dismiss and complete behaviors remain consistent with Smart Card lifecycle/persistence rules.

### 3.4 The 3-Day Strategic Arc (The Planner)
**Requirement:** The Analyst generates a 3-Day Contract:
1.  **Today:** Execution (The strict Directive).
2.  **Tomorrow:** Forecast (Preparation).
3.  **Horizon:** Outlook (Trend direction).

#### 3.4.1 Intelligence Narrative Flow (Planner → Analyst → Operator)

**Goal:** Preserve the PRD’s separation: deterministic decision loop (Planner) vs generative narrative (Analyst/Oracle), while keeping the UI calm and directive-first.

**Non-Negotiable Outputs (by layer):**
- **PLANNER (Deterministic)** produces:
  - **Canonical `DIRECTIVE`** (category + stimulus_type)
  - **Hard constraints** (safety bounds)
  - A minimal **risk/priority explanation** (machine-readable is allowed internally)
- **ORACLE / ANALYST (Narrative)** produces:
  - **Analyst Insight (WHY):** 1–3 sentences explaining the trade-off in operator language
  - **SESSION_FOCUS (HOW):** 1 sentence tactical cue (operator-friendly, non-coercive)
  - Optional session formatting (title/subtitle/instructions) that **cannot change** the `DIRECTIVE`

**Copy rules (enforced in narrative + UI):**
- Forbidden terms in user-facing text: “protocol”, “execute”, “briefing”, “mission”, “orders”, “proceed”.
- Forbidden tone: coercive hype headlines (e.g., “MAXIMIZE”, “IGNITE”, “EXTEND LIMITS”).
- Required tone: calm, clinical, precise, non-judgmental Analyst voice.

**UI surfacing requirement:**
- The Focus/Home experience must always be able to render:
  - The **Directive label** (Appendix A.2 format)
  - One **SESSION_FOCUS** line
  - One **AVOID** line
  - One **Analyst Insight** paragraph inside `CONTEXTUAL_INTEL` (“Why this directive?”)

**Failure-safe requirement:**
- If narrative generation fails or is unavailable, the system must fall back to deterministic, PRD-safe defaults for `SESSION_FOCUS` and Analyst Insight (no empty state).

#### 3.4.1.1 LLM-Generated `SESSION_FOCUS` & `AVOID` (Constrained, Persistent)

**Problem:** Static mappings for Focus/Avoid will not cover the breadth of real-world cases.  
**Solution:** Allow the narrative layer to generate `SESSION_FOCUS` and `AVOID` **language**, while Tier‑1 remains the deterministic authority over the `DIRECTIVE` and constraints.

**Non-negotiable rule:** The LLM may generate **phrasing**, not **new taxonomy**.  
It may not invent new directive categories, new states, or override constraints.

##### A) Inputs allowed to influence `SESSION_FOCUS` and `AVOID`

The narrative layer must be grounded to the deterministic Evidence Summary and constraints:
- `DIRECTIVE` (canonical pair)
- `SYSTEM STATE`
- Evidence Summary bullets (PRD §4.1.1.6)
- Constraints (impact allowed, HR cap, load density, `STRESS` summary, mission variables)

##### B) Output requirements

- **`SESSION_FOCUS`**
  - Purpose: one tactical cue for how to succeed today.
  - Must follow §3.4.2(A) constraints.
- **`AVOID`**
  - Purpose: one constraint that prevents the most likely failure mode (misalignment or excessive cost).
  - Must follow §3.4.2(B) constraints.

##### C) Persistence through the day (stability rule)

`SESSION_FOCUS` and `AVOID` must be **stable** for the day:
- Generated once at `DAWN_PROTOCOL` and persisted with the day record.
- Recomputed only when `INTRA_DAY_RECAL` issues a **course correction** (directive/constraints change).
- The UI must show the persisted values on relaunch (warm start), not regenerate opportunistically.

##### D) Regeneration + fallback

If the LLM output fails validation (format/structure, excessive length, directive inconsistency, constraint violations):
- Regenerate once (if available), otherwise fall back to deterministic templates keyed by `DIRECTIVE.category + stimulus_type`.

#### 3.4.2 Narrative Output Constraints (Hard Limits — Ship Gate)

**Purpose:** Prevent narrative drift and cognitive overload. These constraints apply to any user-facing narrative produced by the Analyst/Oracle or any fallback system.

##### A) `SESSION_FOCUS` (Hero secondary line)

- **Intent:** One highest-leverage execution cue. Calm. Minimal.
- **Hard limit:** 1 sentence.  
  - **Preferred:** ≤ 120 characters  
  - **Maximum:** 160 characters
- **Forbidden language:** “execute”, “protocol”, “briefing”, “mission”, “orders”, “proceed”, “maximize”, “ignite”, “crush”, “absolutely”.
- **Forbidden content:** prescriptive strength programming details (e.g., “5x5”, “80% 1RM”) unless the UI is explicitly in a Session Details view; Home is not.
- **Must be directive-consistent:** The cue must match the current `DIRECTIVE` pair (no regulation cues under “Strength — Overload”, etc.).

##### B) `AVOID` (Visible constraint line)

- **Intent:** Prevent the most likely failure mode (misalignment or excessive cost).
- **Hard limit:** 1 sentence.  
  - **Preferred:** ≤ 90 characters  
  - **Maximum:** 120 characters
- **Tone:** constraint/risk framing. No shame. No moral judgment.
- **Must be state-aware:** “Avoid” should tighten when the system is in high-risk states.

##### C) Analyst Insight (WHY — inside `CONTEXTUAL_INTEL`)

- **Intent:** Explain the trade-off so the Operator trusts the Directive, without turning Home into a lecture.
- **Length:** Analyst Insight MAY be long **only inside** `CONTEXTUAL_INTEL`. However, it must be structured as:
  - **Summary (required):** 1–2 sentences that stand alone as the complete answer.
  - **Detail (optional):** additional context behind an explicit “More context” expansion.
- **Hard caps (Ship Gate):**
  - Summary: **≤ 300 characters**
  - Detail (expanded only): **≤ 1,500 characters**
- **UI rule:** Home never shows the full detail by default; it shows the Summary only (via the Context panel’s collapsed state).
- **Required content:** Must contain a trade-off structure:
  - “X is strong / available, but Y is compromised, therefore the directive is Z.”
- **Forbidden style:** long essays, excessive physiology jargon, or “robot-speak”.
  - Examples of jargon to avoid: “myofibrillar disruption”, “parasympathetic tone”, “potentiation”.

##### D) Quality Gate + Fallback

If any generated narrative violates these limits or banned language:
- The system must **regenerate once** (if generation is available), otherwise
- It must **fallback deterministically** to PRD-safe templates keyed by `DIRECTIVE.category` + `stimulus_type`.
- **No empty state** is permitted on Home.

##### E) UI Clamp Rule (defensive rendering)

Even if narrative exceeds constraints, the UI must:
- Clamp `SESSION_FOCUS` to **1–2 lines max** (no paragraphs in the hero).
- Clamp `AVOID` to **1–2 lines max**.
- Long-form narrative belongs only in `BIOLOGY` or an explicit details surface, never the Home hero.

##### F) Home Copy Patterns (Display-Layer Requirements)

**Purpose:** Define the exact Home display representation to ensure Analyst-like briefing while preserving canonical taxonomy.

**Directive = "Name the Day"**
- **Hero (required):** Must always show "<Category> Day" where Category comes from the canonical directive category
  - Examples: "Strength Day", "Endurance Day", "Neural Day", "Regulation Day"
- **Forbidden:** Must not show stimulus in hero (no "Strength — Overload" as hero)
- **Optional metadata:** May show "<Category> — <Stimulus>" only as small secondary text/chip
  - Must never replace hero prominence
  - Example: Hero = "Strength Day", optional chip = "Strength — Overload"

**Mode Line (under hero)**
- **Deterministic mapping from stimulus_type:**
  - `OVERLOAD` → "Lift heavy with full recovery."
  - `MAINTENANCE` → "Steady work. Keep it crisp, not exhausting."
  - `FLUSH` → "Easy flow. Keep cost low."
  - `TEST` → "Measure output. Stop before form breaks."
- **Hard limits:** Must remain within existing PRD caps (≤ 120 chars preferred; ≤ 160 max)
- **Tone:** Behavior-focused, not physiology-focused

**Focus = One Cue (Intent + Constraint)**
- Derived from `SESSION_FOCUS` (LLM-generated or fallback)
- Must be one tactical cue combining intent and constraint
- Example: "Crisp reps, long rests—stop before form degrades."

**Avoid = One Common Mistake (Not Physiology)**
- Derived from `AVOID` cue (LLM-generated or fallback)
- Must focus on a behavioral mistake, not biological explanation
- Example: "Avoid intensity spikes—keep effort conversational." (not "Avoid excessive sympathetic activation")

**Analyst Insight = Cause → Interpretation → Decision**
- Structure: "X is strong/available, but Y is compromised, therefore the directive is Z."
- Must explain the trade-off that led to the directive
- Must be accessible in ≤ 5 seconds (summary visible, detail expandable)

### 3.5 Agent Coordination System
The Intelligence Layer is not a monolith. It is a system of specialized agents.
**Crucial Distinction:** The *Decision Loop* is Deterministic (No Hallucinations). The *Narrative Layer* is Generative (LLM).

1.  **The Analyst (Observer):** `[Mechanism: DETERMINISTIC CODE]`
    *   *Input:* HealthKit Data + Mission Variables.
    *   *Role:* Determines the `System State` and `Vitality`.
    *   *Output:* "System is READY_FOR_LOAD."

2.  **The Planner (Deterministic Decision Loop):**
    *   **Tier 1 (The Guardrails):** `[Mechanism: UTILITY SCORING]`
        *   *Role:* Selects Today’s canonical `DIRECTIVE` and hard constraints using deterministic scoring.
        *   *Output:* Directive + Constraint Set + machine-readable trace.
    *   **Non‑negotiable:** The Planner does **not** call the LLM. It is predictable code.

3.  **The Operative (Tactician):** `[Mechanism: LOGIC / CONSTRAINT SOLVER]`
    *   *Input:* Planner's Directive + User Archetype.
    *   *Role:* Generates the specific `Session` parameters (Duration, HR Zone, Load Target).
    *   *Output:* "Session: 20min Zone 2 Run."

4.  **The Judge (Verifier):** `[Mechanism: DETERMINISTIC MATH]`
    *   *Input:* Planned Session vs. Actual Execution.
    *   *Role:* Calculates `Alignment Score` with zero ambiguity.
    *   *Output:* "ALIGNED" or "MISALIGNED".

5.  **The Analyst (Narrator):** `[Mechanism: LLM via Analyst gateway]`
    *   *Input:* Directive + constraints + evidence bullets + state.
    *   *Role:* Produces the Home narrative package (`SESSION_FOCUS`, `AVOID`, `Analyst Insight`) without changing the directive.
    *   *Non‑negotiable:** All LLM calls that produce Home-facing narrative must route through the Analyst gateway.

6.  **The Trainer (Optional, Non‑Home):** `[Mechanism: LLM]`
    *   *Role:* Generates specific training suggestions and programming helpers grounded to the Exercise Taxonomy.
    *   *Constraint:** Trainer outputs must be constrained by Tier‑1 directive/constraints and must not override them.

#### 3.5.1 Trainer Agent (Workout Suggestion) — PRD Spec

**Purpose:** Provide high‑quality, constraint‑aware workout suggestions when the Operator asks for help (or via the `WORKOUT_SUGGEST` Smart Card), without changing the deterministic plan.

**Non‑negotiables (ship gate):**
- Trainer may propose **only** sessions that fit the current Tier‑1 `DIRECTIVE` + constraints.
- Trainer may not change or reinterpret the `DIRECTIVE`.
- Trainer may not present medical advice, injury diagnosis, or coercive motivation.
- Output must be short, actionable, and plain language.

**Inputs (required):**
- `DIRECTIVE` (category + stimulus)
- Constraints (`allow_impact`, optional HR cap, required equipment)
- Recent workout log summaries (3–7 most recent)
- Optional: today’s state label (for tone only; not for overriding constraints)

**Output contract (required):**
- JSON fields: `title`, `summary`, optional `why`, optional `duration`, optional `intensity` (see §3.3.2.3.A)
- No additional text outside JSON when called by the system.

**Persistence rules (required):**
- Store the generated suggestion payload and the Operator action (`ADDED` | `SAVED` | `DISMISSED`) for audit and rate limiting.
- Default rate: ≤ 1 suggestion/day unless the Operator explicitly requests another.

**Acceptance criteria:**
1. Trainer suggestions always respect `allow_impact` and HR cap constraints.
2. Suggestion is specific enough to be executed (a named session pattern or clear structure).
3. Suggestion never uses forbidden framing (“protocol”, “execute”, coercive tone).
4. Suggestion can be accepted and stored without affecting Tier‑1 decisions.

#### 3.5.2 Goals Intake (Operator Preferences) — PRD Spec

**Purpose:** Capture operator goals as a durable preference object to tune future weighting and personalization, without requiring a long onboarding flow.

**Non‑negotiables (ship gate):**
- Goals are optional, editable, and non‑moralizing.
- Goals must not be treated as medical guidance.
- Goals may influence personalization only via deterministic mapping (future); they cannot override safety constraints.

**Inputs/UX:**
- Default: quick intake (≤ 30s) per §3.3.2.4.B
- Optional: micro‑chat for refinement; must produce the same `OPERATOR_GOALS` object (§3.3.2.4.A)

**Persistence + refresh:**
- Persist `OPERATOR_GOALS` with `updated_at`.
- Re-surface Goals card when stale (30 days) or when Operator initiates.

### 3.6 Dynamic Profiling Engine (Archetype Detection)
**Concept:** The system does not rely on static "User Personas." Instead, it employs **Continuous Pattern Recognition** to construct a fluid Operator Profile. This ensures applicability across the entire human spectrum—from "Post-Partum Rehabilitation" to "Ultra-Endurance Competition."

**The Logic (The "Fingerprint"):**
We analyze the *relationship* between biometric inputs to determine the Operator's current physiological reality.

*   **Core Input Vectors:**
    *   **Intensity Distribution:** (Polarized vs. Threshold vs. Random)
    *   **Volume Tolerance:** (High Frequency/Low Load vs. Low Frequency/High Load)
    *   **Recovery Variance:** (Fast vs. Slow parasympathetic rebound)
    *   **Metric Patterns:** (e.g., Consistent HR spikes without GPS distance = Stationary/Gym Work)

*   **Spectrum of Recognition (Examples of Breadth):**
    *   **The Specialist:** Detects activity patterns matching specific sport demands (e.g., "Golf: Low HR + High Walk Volume + Power Spikes").
    *   **The Seasoned Operator:** Detects high training age via rapid RHR recovery and high load tolerance.
    *   **The Restricted Operator:** Detects constraints (e.g., "Pregnancy" or "Injury") via altered HRV baselines, capped intensity, or modified walking mechanics.
    *   **The Generalist:** Detects broad, non-specific variance typical of "Functional Fitness."

*   **Application:**
    The **Analyst** adapts its *vocabulary and expectations* based on this detected profile.
    *   *Example:* A "Missed Session" for a Generalist is "Inconsistency." For a Restricted Operator (e.g., Rehab), it is "Prudent Listening to the Body."

---

## Appendix A — Display Translation Tables (UI Lock)

**Purpose:** Prevent semantic drift. These tables are the **single source of truth** for human-readable UI labels derived from canonical terms (see §2.1).

### A.1 System State (Canonical → Display Label)

**Rule:** The UI must translate `SystemStatus.current_state` using this exact mapping. The UI MUST NOT substitute new state concepts.

| Canonical State | Display Label | Operator Meaning (1 line) |
| :--- | :--- | :--- |
| `READY_FOR_LOAD` | Ready for Load | Surplus capacity. Stress is appropriate today. |
| `BUILDING_CAPACITY` | Building Capacity | Adapting from recent load. Maintain consistency. |
| `NEEDS_STIMULATION` | Needs Stimulation | Under-loaded trend. A controlled stimulus is required. |
| `HIGH_STRAIN` | High Strain | Neural saturation risk. Reduce intensity and volatility. |
| `PHYSICAL_STRAIN` | Physical Strain | Structural tolerance compromised. Protect joints/tissues. |
| `RECOVERY_MODE` | Recovery Mode | Acute recovery priority (immune/viral/system failure). |

**Optional UI Detail (allowed):** Secondary microtext may show the canonical token (e.g., `READY_FOR_LOAD`) only in `THE_VAULT` / diagnostics surfaces.

### A.2 Directive Labels (Canonical Pair → Display Format)

**Rule:** The daily `DIRECTIVE` is a canonical pair: `directive.category` + `directive.stimulus_type`. The UI MUST render it using the following fixed components.

#### A.2.1 Category Labels

| Canonical Category | Display Label |
| :--- | :--- |
| `STRENGTH` | Strength |
| `ENDURANCE` | Endurance |
| `NEURAL` | Neural |
| `REGULATION` | Regulation |

#### A.2.2 Stimulus Labels

| Canonical Stimulus | Display Label |
| :--- | :--- |
| `OVERLOAD` | Overload |
| `MAINTENANCE` | Maintenance |
| `FLUSH` | Flush |
| `TEST` | Test |

#### A.2.3 Required Display Format

**Decision (Ship Gate):** Home hero must always be "<Category Label> Day"
- **Primary format (Hero):** `"<Category Label> Day"` (example: "Strength Day")
- **Optional metadata:** Canonical pair label `"<Category Label> — <Stimulus Label>"` allowed only as optional secondary metadata (small text/chip)
- **Forbidden in hero:** Must not show stimulus in hero (no "Strength — Overload" as hero)
- **Forbidden language:** “protocol”, “execute”, “briefing”, “mission”, coercive headlines (e.g., “MAXIMIZE FORCE”, “IGNITE”).

### A.3 Metric Display Lock (Canonical → UI Label + Placement)

**Rule:** The main experience prioritizes interpretation. Raw biometrics are secondary and belong in `BIOLOGY` unless surfaced via `CONTEXTUAL_INTEL` as narrative.

| Canonical Metric | Display Label | Unit / Range | Placement Rule |
| :--- | :--- | :--- | :--- |
| `VITALITY` | Vitality | 0–100 | Primary (Home allowed) |
| `ADAPTIVE_CAPACITY` | Adaptive Capacity | 0–100% | Primary (Home allowed) |
| `PHYSIOLOGICAL_LOAD` | Physiological Load | relative | Secondary (Biology-first) |
| HRV / RHR / Sleep (raw) | (human-friendly labels) | ms / bpm / hours | Biology-first; Home via `CONTEXTUAL_INTEL` only |

### A.4 Home Display Vocabulary Lock

**Purpose:** Explicitly lock allowed/forbidden vocabulary for Home screen to prevent semantic drift and ensure Analyst-like briefing tone.

**Forbidden Terms (Home-visible text must never use):**
- System-speak: "execute", "protocol", "mission", "orders", "proceed", "maximize", "ignite", "crush", "absolutely"
- Command-oriented language that implies coercion
- These terms are already banned in §3.4.2—enforce in UI copy too

**Sleep Summary Labels (Lock):**
- **Forbidden:** "Sleep Bank" (must never appear anywhere in UI copy)
- **Allowed:** "Sleep" or "Sleep (Last Night)" only
- **Rationale:** "Sleep Bank" implies accumulation/debt framing, which is not how Sentient models sleep

**Home Label Lock:**
- **Hero:** Must always be "<Category> Day" (e.g., "Strength Day", "Endurance Day")
- **Mode Line:** Deterministic mapping from stimulus_type (see §3.4.2.F)
- **Focus/Avoid:** Must use behavior-focused language, not physiology jargon
- **Analyst Insight:** Must use cause → interpretation → decision structure

**Enforcement:**
- All Home-visible text must pass vocabulary validation
- No forbidden terms may appear anywhere on Home (including Smart Cards if present)
- Canonical tokens remain unchanged in state/DB/engine outputs (display-layer only)

---

## Appendix B — Scoring Inputs & Intelligence Evidence (Deterministic Requirements)

**Purpose:** Expand Tier‑1 utility scoring beyond a single “sleep + HRV” snapshot, using additional sensor evidence while preserving deterministic, audit‑ready decisions.

### B.1 Bevel Parity: What Sentient should learn from the screenshots

The attached Bevel screens demonstrate two valuable patterns:

- **Baseline-first Biology (Evidence view):**
  - Visible baselines + trend direction for HRV and RHR (“HRV Baselines”, “RHR Baselines”)
  - VO₂ Max shown with a simple qualitative band (“Good/Fair”) and a range context
  - Body composition surfaces (Weight / Lean Body Mass / Body Fat) as available, non-blocking modules (“No data” allowed)
- **Home = interpretation + narrative card:**
  - A single narrative card that explains “what to do now” in plain language
  - High-level day gauges (strain/recovery/sleep) without forcing the operator into raw charts

Sentient must adopt the **pattern**, not the vocabulary: Sentient remains directive-first, `BIOLOGY` holds raw evidence, and the Analyst communicates the trade-off.

### B.2 Required Evidence Categories for Tier‑1 Scoring (Guardrails)

Tier‑1 scoring MUST be able to incorporate the following evidence categories when available. Each input is optional, but the scoring system must be designed to accept them without changing the canonical taxonomy.

- **Recovery evidence**
  - Sleep duration, sleep score/efficiency, sleep timing regularity
  - HRV vs baseline (absolute + deviation + trend)
  - Resting Heart Rate vs baseline (deviation + trend)
  - Respiratory rate trend (if available)
  - SpO₂ trend (if available)
  - Temperature deviation (if available)

- **Load evidence**
  - Workout presence, duration, and caloric cost
  - Intensity distribution (Zone 2 / threshold / intervals) when available
  - Recent load density (e.g., number of sessions in last 72h)
  - Day activity volume (steps, active minutes)

- **Capacity modifiers (context)**
  - Mission Variables (`MISSION_VARIABLES`): alcohol, caffeine, injury, illness, high stress, travel, etc.
  - Environmental context (temperature extremes, timezone shift) when available

- **Autonomic stress evidence**
  - `STRESS` (0–100) computed as a time-series index across the day
  - Summary outputs: average, highest, lowest, and % time elevated
  - Must be interpretable as “autonomic arousal” (not a psychological diagnosis)

- **Fitness / readiness modifiers (Vault-first)**
  - VO₂ Max trend (slow-moving fitness signal; never a same-day whip)
  - Weight / Lean Body Mass / Body Fat trends (slow-moving; Vault-first; never moralized)

### B.3 How evidence should influence scoring (product rules)

- **Deviations matter more than absolutes:** scoring should use “vs baseline” signals (Bevel’s baseline framing) wherever possible.
- **Trends matter more than a single day:** include multi-day directionality (rising/falling/stable) for HRV/RHR/Sleep/Load.
- **The system must remain audit‑ready:** every Tier‑1 directive must be explainable as a small set of evidence statements (“HRV down vs baseline”, “sleep short”, “recent load high”).
- **No dashboard on Home:** these evidence signals are primarily surfaced in `BIOLOGY`; Home receives the interpretation.

#### B.3.1 `STRESS` (Autonomic Arousal) — Product Requirements

**Definition:** `STRESS` is a time-series evidence signal (0–100) estimating autonomic arousal across the day. It is not a mood score and not a medical diagnosis.

**Computation (high-level, non-implementation):**
- The system should estimate arousal from wearable signals available to the platform (e.g., heart rate dynamics relative to baseline, HRV when available, and optional respiratory/SpO₂/temperature signals where supported).
- The system must reduce false positives by accounting for obvious exercise/movement context so “stress” does not simply mean “workout.”

**Daily summary outputs (required):**
- `STRESS.avg` (0–100)
- `STRESS.highest` (0–100)
- `STRESS.lowest` (0–100)
- `STRESS.time_elevated_pct` (0–100%)

**How Tier‑1 may use `STRESS` (guardrails):**
- Persistent elevated `STRESS` may lower effective `ADAPTIVE_CAPACITY` and bias Tier‑1 away from high-cost directives.
- `STRESS` must never override hard safety constraints (injury/illness flags remain dominant).

**Where it appears:**
- `BIOLOGY`: shows the evidence (summary + trend). This is “proof of trust.”
- Home: the Analyst may reference stress only as a plain-language factor (“arousal has been elevated today”), never as a dashboard.

### B.4 BIOLOGY requirement: Baselines view (Proof of Trust)

`BIOLOGY` MUST include a Baselines view that can show:
- HRV baseline + trend direction
- RHR baseline + trend direction
- VO₂ Max with range context (qualitative band allowed)
- Body composition modules (Weight / Lean Body Mass / Body Fat) that degrade gracefully when missing

This view exists to build trust in the Analyst’s narrative without turning Home into a dashboard.

---

## Appendix C — Design Tokens (UI Lock)

**Purpose:** Lock Sentient’s visual identity as **calm, restrained, instrument-like**. Typography is the primary voice; color is a functional signal; motion is confirmation; space is intentional.

**Rule:** These tokens are the single source of truth for core UI styling. Product surfaces MUST NOT introduce ad-hoc colors, type scales, gradients, or decorative effects that compete with the directive-first hierarchy.

### C.1 Color Tokens (Corbeau Core — Cold Instrument, violet removed)

| Token | Hex | Usage (strict) |
| :--- | :--- | :--- |
| `color.bg` | `#111122` | App background (default for all screens) |
| `color.surface` | `#1A2133` | Cards, panels, modals, context surfaces |
| `color.surface2` | `#14192A` | Nested surfaces / input wells |
| `color.text.primary` | `#F0EEEE` | Primary text |
| `color.text.secondary` | `#9698A3` | Secondary/meta text |
| `color.accent.primary` | `#3A8CA8` | Alignment/active signals (Focus cue, “Monitoring/Updated”, highlights) |
| `color.accent.caution` | `#D6A85C` | Caution/constraint signals (tightened bounds, warnings that are not critical) |
| `color.accent.strain` | `#C85C5C` | Protection/critical strain signals (low vitality, high risk states) |
| `color.border.default` | `#2A3146` | Hairline strokes / dividers |
| `color.border.subtle` | `#1B2238` | Subtle hairlines / nested separators |

**Non-negotiable color rules:**
- Color is **functional only**. No decorative gradients. No rainbow indicators. No “celebration” effects on Home.
- Home uses **one accent by default** (`color.accent.primary`). Caution/strain colors appear only when warranted by state/constraints.

### C.2 Typography Tokens

**Principle:** Typography communicates hierarchy. The UI must remain readable and calm at a glance.

| Token | Role | Notes |
| :--- | :--- | :--- |
| `type.hero` | Directive label (e.g., “Endurance — Maintenance”) | Highest emphasis |
| `type.subhero` | Focus cue (1 sentence) | Uses `color.accent.primary` when appropriate |
| `type.sectionLabel` | Small labels (e.g., “AVOID”, “ANALYST INSIGHT”) | Low-contrast, restrained |
| `type.body` | Insight summary/detail, card body | Plain language, no shouting |
| `type.meta` | Status lines, timestamps, confidence | Secondary text |

**Rules:**
- Avoid hype punctuation (no exclamation marks).
- Avoid heavy all-caps except for small section labels (and keep them restrained).

### C.3 Spacing & Layout Tokens

**Principle:** Space is intentional. Home must feel unhurried and stable.

| Token | Meaning |
| :--- | :--- |
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 24 |
| `space.6` | 32 |

**Rules:**
- Directive hero region must not “jump” between states (loading → loaded).
- Cards appear **below** Directive/Focus/Avoid and never push the Directive off-screen on a typical device.

### C.4 Radius & Elevation Tokens

**Principle:** Surfaces are instrument-like (subtle). Avoid playful shadows.

| Token | Value | Notes |
| :--- | :--- | :--- |
| `radius.card` | 12 | Cards/panels |
| `radius.pill` | 999 | Small status chips if used |
| `elevation.card` | subtle | Minimal shadow; rely on contrast, not depth |

### C.5 Motion Tokens (Confirmation-only)

**Allowed motion:**
- Expand/collapse (Context panel, Smart Cards)
- Subtle crossfade/transition on refresh completion
- Gentle layout animation when content becomes available

**Not allowed:**
- Looping animations
- Confetti/celebrations
- Attention-grabbing motion competing with Home content

### C.6 Component Usage Rules (Home)

**Home hierarchy (must):**
1) Directive (hero)
2) Focus cue (subhero)
3) Avoid cue (constraint line)
4) Contextual Intel (“Why this directive?”) panel
5) Smart Cards (max 2)

**Functional color mapping (must):**
- Focus cue uses `color.accent.primary` by default.
- Avoid header uses `color.accent.strain` (restraint; do not oversaturate).
- Links (e.g., “More context”) must be low-noise; prefer subtle blue or primary text + underline, not bright neon.

### C.7 Accessibility & Readability (Ship Gate)
- Maintain sufficient contrast between `color.text.primary` and `color.bg`.
- Never convey meaning by color alone (pair with labels such as “Avoid”, “Updated”, “Unavailable”).
- Clamp long text on Home; long narrative belongs behind explicit expansion.

## 4. The Physics Engine (Layer 0)

Deterministic math. No AI hallucinations.

### 4.1 Core Formulas
*   **Vitality:** `(Sleep * 0.4) + (HRV_Z * 0.4) + (RHR_Stability * 0.2)`
*   **Adaptive Capacity:** Refills overnight based on Vitality. Drains daily based on Load.
*   **Physiological Load:** The metabolic cost of work.

### 4.1.1 Baseline Quality & Confidence Rules (Non‑Negotiable)

**Purpose:** Prevent false certainty. Baseline-relative scoring must be audit‑ready and must degrade gracefully when data is missing or insufficient.

#### 4.1.1.1 Baseline Quality Gates

For any baseline‑relative metric used in scoring (HRV, RHR, Sleep duration; later `STRESS`, load density), the system MUST compute and store:

- mean
- stdDev
- sampleCount
- coverage (sampleCount / 30)

**Minimum thresholds (30‑day window):**
- **LOW confidence:** sampleCount ≥ 7
- **MEDIUM confidence:** sampleCount ≥ 14
- **HIGH confidence:** sampleCount ≥ 21

If sampleCount < 7, the metric is **not baseline-valid** and may not produce a z‑score.

**Metric-specific rule (critical):** Baseline quality gates apply **per metric**, not as a single combined minimum.  
Example: Low sleep baseline coverage MUST NOT invalidate HRV/RHR scoring. The system must degrade confidence and/or re-weight using available channels.

#### 4.1.1.2 Availability vs Confidence (Two Flags)

All computed outputs MUST include:

- **Availability**
  - `AVAILABLE` / `UNAVAILABLE`
  - If unavailable, include a reason (e.g., permission denied, no samples, insufficient baseline).
- **Confidence**
  - `HIGH` / `MEDIUM` / `LOW`
  - Derived from baseline quality + missingness of today’s inputs.

**UNAVAILABLE must be rare:** The system should prefer `AVAILABLE` + `LOW` confidence over `UNAVAILABLE` when reasonable fallbacks exist (see §4.1.1.4).

#### 4.1.1.3 Confidence Inheritance

- **Vitality Confidence** is derived from the quality/availability of:
  - HRV baseline + today HRV
  - RHR baseline + today RHR
  - Sleep baseline + today sleep duration (or an explicit fallback)
- **System State Confidence** MUST inherit from Vitality Confidence (it cannot claim higher certainty than its upstream recovery evidence).

#### 4.1.1.4 Fallback Hierarchy (when data is missing)

For Vitality computation:

- **Full data available** → standard formula (40/40/20) + confidence per baseline gates
- **Missing HRV today** → fallback formula (Sleep/RHR) + **LOW confidence** + penalty
- **Sleep fallback policy (required):**
  - If measured sleep is missing, the system MUST fall back in this order:
    - `ESTIMATED_7D` → `DEFAULT_6H` → `MANUAL` (when provided)
  - Sleep fallbacks keep Vitality **AVAILABLE** but reduce confidence and set an explicit reason code (e.g., `SLEEP_ESTIMATED_7D`, `SLEEP_DEFAULT_6H`, `SLEEP_MANUAL`).
- **Definition of “UNAVAILABLE” (hard rule):**
  - Vitality may be `UNAVAILABLE` only when there is **insufficient autonomic evidence**, meaning:
    - HRV is unavailable (missing or not baseline-valid) **and**
    - RHR is unavailable (missing or not baseline-valid)
  - Sleep missing alone MUST NOT force `UNAVAILABLE` if a fallback sleep estimate/default/manual value exists.
- **Missing multiple critical inputs** → output is **UNAVAILABLE** with reason `INSUFFICIENT_DATA` (only when both HRV and RHR evidence are unavailable as defined above)

#### 4.1.1.5 UI Semantics Separation (Critical)

The UI MUST distinguish:

- **Data Unavailable** (neutral/gray): cannot compute due to missing data / insufficient baseline
- **Low Vitality** (warning): computed value is genuinely low with adequate evidence

#### 4.1.1.6 Evidence Requirements (Audit‑Ready)

- Every **state assignment** MUST record the dominant axis(es) and the key evidence statements.
- Every **directive** MUST store a 3–5 bullet **Evidence Summary** (“sleep short vs baseline”, “HRV below baseline”, “load density high”, “stress elevated”, etc.).
- The Analyst may only reference this Evidence Summary in operator language.
- Raw z‑scores and detailed statistics belong in `BIOLOGY`, not required in Home copy.

### 4.2 The Golden Rule
> **If Directive is "Rest", High Load = Misalignment (Failure).**

---

## 5. The Progression Layer (Alignment)

### 5.1 Alignment Score
*   **Calculation:** Rolling 30-day % of `ALIGNED` days.
*   **The Judge:**
    *   Check `Session.TargetLoad` vs `Actual.Load`.
    *   **Tolerance:** +/- 15%.
    *   **Result:** HIT or MISS.

### 5.2 The Class System
*   **`OPERATOR_CLASS` (90-100%)**: Elite Status (Gold).
*   **`CANDIDATE_CLASS` (70-89%)**: Standard Status (Silver).
*   **`UNCALIBRATED` (<70%)**: Warning Status (Red).

---
