---
name: Recomp 2027
description: The day written up like a market stall's chalkboard; one big chalk figure, fixed rows, the price alongside.
colors:
  board: "#19211e"
  board-panel: "#202a26"
  board-raised: "#26312c"
  board-line: "#2d3933"
  board-edge: "#3a4741"
  wood-shadow: "#4a3423"
  wood-ledge: "#5d422c"
  wood-edge: "#74543a"
  wood-chalk: "#e9d9c4"
  chalk-bright: "#f6f5ef"
  chalk: "#eeede6"
  chalk-soft: "#dfdfd6"
  chalk-muted: "#cdd0c6"
  chalk-dim: "#aeb3a9"
  chalk-faint: "#959b92"
  chalk-ghost: "#4e5750"
  chalk-green: "#b4e09a"
  chalk-green-hover: "#c6e8ae"
  chalk-green-pressed: "#d6efc2"
  chalk-sky: "#6dbbe4"
  chalk-sky-text: "#9fd3ee"
  chalk-yellow: "#dcb441"
  chalk-yellow-text: "#f2d06b"
  chalk-pink: "#e48aa8"
  chalk-red: "#e2685a"
  chalk-red-text: "#ef8e80"
  chalk-aqua: "#5fcfc5"
  chalk-aqua-text: "#92e2db"
  chalk-orange: "#f5b27a"
  data-protein: "#369dd1"
  data-carbs: "#b18e15"
  data-fat: "#c25485"
  data-good: "#3eab5e"
  data-activity: "#b64e10"
  data-other: "#866ec5"
  data-water: "#1ba79f"
  data-protein-low: "#497b98"
  data-water-low: "#48807b"
  data-steps-low: "#86722a"
  data-plan-in: "#2f7d47"
  data-plan-close: "#2a4a36"
  data-plan-far: "#26352d"
typography:
  display:
    fontFamily: "Cabin Sketch, Atkinson Hyperlegible, sans-serif"
    fontSize: "84px"
    fontWeight: 700
    lineHeight: 0.82
  display-lg:
    fontFamily: "Cabin Sketch, Atkinson Hyperlegible, sans-serif"
    fontSize: "104px"
    fontWeight: 700
    lineHeight: 0.82
  display-sm:
    fontFamily: "Cabin Sketch, Atkinson Hyperlegible, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1
  headline:
    fontFamily: "Caveat, Atkinson Hyperlegible, cursive"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 0.9
  title:
    fontFamily: "Caveat, Atkinson Hyperlegible, cursive"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1
  annotation:
    fontFamily: "Caveat, Atkinson Hyperlegible, cursive"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1
  figure:
    fontFamily: "Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\" 1"
  body:
    fontFamily: "Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.35
  label-caps:
    fontFamily: "Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.025em"
rounded:
  hairline: "4px"
  field: "8px"
  control: "12px"
  panel: "14px"
  sheet: "16px"
  pill: "9999px"
spacing:
  row: "14px"
  panel-pad: "16px"
  panel-pad-wide: "20px"
  gutter: "16px"
  gutter-wide: "24px"
  section: "28px"
  column-gap: "40px"
components:
  button-primary:
    backgroundColor: "{colors.chalk-green}"
    textColor: "{colors.board}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.chalk-green-hover}"
  button-primary-sm:
    backgroundColor: "{colors.chalk-green}"
    textColor: "{colors.board}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.chalk-soft}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.chalk-red-text}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-plain:
    backgroundColor: "transparent"
    textColor: "{colors.chalk-dim}"
    rounded: "{rounded.control}"
    height: "36px"
  input:
    backgroundColor: "rgb(0 0 0 / 0.18)"
    textColor: "{colors.chalk}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "40px"
  card-panel:
    backgroundColor: "{colors.board-panel}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-pad}"
  nav-ledge:
    backgroundColor: "{colors.wood-ledge}"
    textColor: "{colors.wood-chalk}"
    rounded: "{rounded.hairline}"
    padding: "4px"
  nav-create:
    backgroundColor: "{colors.chalk-green}"
    textColor: "{colors.board}"
    rounded: "{rounded.sheet}"
    size: "48px"
  sheet-more:
    backgroundColor: "{colors.board-raised}"
    rounded: "{rounded.sheet}"
    padding: "8px"
  chip-kind:
    backgroundColor: "rgb(180 224 154 / 0.10)"
    textColor: "{colors.chalk-green}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.hairline}"
    padding: "1px 4px"
  chip-recent:
    backgroundColor: "transparent"
    textColor: "{colors.chalk-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px 4px 6px"
  chip-portion:
    backgroundColor: "transparent"
    textColor: "{colors.chalk-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "4px 10px"
  chip-fresh:
    backgroundColor: "rgb(180 224 154 / 0.15)"
    textColor: "{colors.chalk-green}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  toast:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.board}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  check-plan:
    backgroundColor: "{colors.chalk-green}"
    textColor: "{colors.board}"
    rounded: "6px"
    size: "20px"
---

# Design System: Recomp 2027

## Overview

**Creative North Star: "Pizarra de feria"**

The app is a market stall's chalkboard for one person's day. A green-black board carries a single huge figure written in chalk (what is left of today's calories), a set of fixed ruled rows beneath it (protein, steps, water), and the "price" alongside each row as a one-tap action. Coloured chalks have fixed jobs and never swap them. Navigation sits on a flat wooden ledge, the shelf the chalk rests on. Hand-drawn marks (underlines that draw themselves when a goal is met, tally sticks, rough-edged bars) stand in for the rings, boxes and glows of a fitness app.

It is used on a phone, one-handed, in daylight, in seconds: open, read what is left and whether the three rows are on track, log with one tap, leave. Density is that of a well-kept board: few type sizes, one protagonist number per screen, rows that stay in the same place every day so they can be compared at a glance. The world rejects black-with-neon and fitness-app rings outright.

The chalk is texture of the *letterforms and strokes*, never of the surface. The board has soft, fixed eraser smudges (three faint radial washes on the body) and no grain, no noise, no photographic chalkboard.

The app installs as a PWA: theme and background colour are `board`, and the icon is a group of chalk tally marks over a green chalk underline on the board.

**Key Characteristics:**
- Green-black board, chalk-white text, fixed-role coloured chalks.
- One protagonist chalk figure per screen (Cabin Sketch), everything else in Atkinson Hyperlegible.
- Caveat handwriting for titles and annotations; the sentence is the title, no labels above it.
- Fixed ruled rows with dashed chalk dividers instead of boxed cards for reading content.
- Flat wooden ledge navigation; centred green "Crear" chalk on mobile.
- Motion as chalk behaviour: underlines draw, numbers re-chalk, deletions smudge away like an eraser.

## Colors

A dark, low-chroma board with a single white chalk for text and a small set of saturated chalks, each locked to one meaning.

### Primary
- **Green Chalk** (`chalk-green`): the only action and success colour. Primary buttons, the mobile Crear button, the calorie bar while under goal, completed-goal underlines, "Déficit" lines, focus outlines (2px dashed), caret, text selection at 35%. Hover lightens to `chalk-green-hover`; the active Crear tab uses `chalk-green-pressed`.

### Secondary (nutrient chalks, fixed roles)
- **Sky Chalk** (`chalk-sky` fill, `chalk-sky-text` for text): protein, everywhere. Protein bars, "g prot" figures in lists, "comida" kind chips.
- **Yellow Chalk** (`chalk-yellow` fill, `chalk-yellow-text`): carbohydrates, steps bar, "desayuno" chips, weight-up deltas.
- **Pink Chalk** (`chalk-pink`): fat.
- **Aqua Chalk** (`chalk-aqua` fill, `chalk-aqua-text`): water and its tally sticks.
- **Orange Chalk** (`chalk-orange`): activity and calories burned.

### Tertiary
- **Red Chalk** (`chalk-red` fill, `chalk-red-text`): excess and danger only. The hero figure turns red-chalk when over the calorie goal, "Superávit" lines, danger buttons.

### Neutral
- **Board** (`board`): page background, with three fixed eraser-smudge washes of chalk at 3–4.5% opacity.
- **Board Panel** (`board-panel`): filled panels for form-heavy groups and chart surfaces.
- **Board Raised** (`board-raised`): the mobile "Más" sheet.
- **Board Line** (`board-line`): chart gridlines, empty heat-strip cells.
- **Board Edge** (`board-edge`): scrollbar thumbs.
- **Chalk** (`chalk`, ~12.6–14:1 on board/panel): primary text, figure values. `chalk-bright` for page titles and the hero number.
- **Chalk Dim** (`chalk-dim`, ~6.9:1): secondary text, row labels, field labels, legends.
- **Chalk Faint** (`chalk-faint`, ~5.2:1): units, notes, helper text, axis ticks. **The lowest token allowed for any readable text.**
- **Chalk Ghost** (`chalk-ghost`): unlit tally sticks, middle-dot separators. Never text.
- **Wood** (`wood-ledge` with `wood-edge` top border; `wood-chalk` at 75–80% for inactive ledge labels): navigation only.
- Dividers are chalk white at low alpha: 18% for the ruled-section top rule and ghost-button borders, 14% for renglón dividers, 10% for list dividers and field borders, 8% for empty bar tracks.

### Status uses of the chalks
- **Yellow as caution:** besides carbs/steps, yellow chalk carries "soon" warnings: the cook reminder outline (40%) and title, "comer pronto" / "usar pronto" freshness labels, and stalled-plan advice text.
- **Sky as cold:** the only non-protein use of sky is the "Congelado" freshness label (15% sky tint, `sky-200` text).
- **Freshness labels** step green (fresh) → yellow (eat soon) → red (check) at 15% tint.

### Data palette (charts only)
Validated in dark mode on the board, fixed order: `data-protein`, `data-carbs`, `data-fat`, `data-good`, `data-activity`, `data-other`. `data-water` stands apart. Below-goal steps use `data-protein-low` and `data-water-low` (≥3:1 on the panel). Interface chalks are lighter and are for UI fills and text; data colours are for chart marks. Do not mix the two sets inside one chart.
- **Daily calories:** `data-other` for days within goal, `chalk-red` for days more than 5% over (the one chalk shared with charts, because it means excess in both), goal line in neutral `chalk-muted`. This pair passed the dataviz validator.
- **Daily steps:** `data-carbs` when met, `data-steps-low` below (≥3:1), goal line in `data-good`.
- **Plan calendar** (sequential greens): `data-good` 4/4 checks, `data-plan-in` in plan, `data-plan-close` 2–3 checks, `data-plan-far` logged but off ("lejos"), `board-line` no data; every tone has a legend entry.
- **Waist:** a single chalk-white line (`chalk`); one series needs no hue.

### Named Rules
**The Fixed Chalk Rule.** Each coloured chalk has one meaning for the whole app: sky = protein, yellow = carbs/steps, pink = fat, aqua = water, orange = activity, green = action and goal met, red = excess. A colour is never borrowed for decoration or for a different metric. The only extensions are status: yellow for caution, sky for frozen (see above).

**The Green Is Earned Rule.** Green appears on actions and on goals actually reached. A row's bar turns green only when its goal is met; until then it carries its nutrient chalk.

**The Faint Floor Rule.** No readable text below `chalk-faint`. `chalk-ghost` and anything darker are for strokes and separators only.

**The Water Apart Rule.** Water never shares a chart with protein; their hues sit too close for categorical separation.

## Typography

**Display Font:** Cabin Sketch 700 (fallback Atkinson Hyperlegible)
**Hand Font:** Caveat 600/700 (fallback Atkinson Hyperlegible, cursive)
**Body Font:** Atkinson Hyperlegible 400/700 (fallback ui-sans-serif, system-ui, Segoe UI)

All three are self-hosted through @fontsource; no external font requests.

**Character:** Cabin Sketch is the chalk itself, rough and loud, reserved for the one number that matters. Caveat is the stall-keeper's handwriting for what things are called. Atkinson Hyperlegible does all the real reading, chosen for legibility in daylight on a phone.

### Hierarchy
- **Display** (Cabin Sketch 700, 84px mobile / 104px from 640px, line-height 0.82): the hero "te quedan" figure on Hoy; the Agua hero figure at 84px. `display-sm` (48px) for secondary chalk figures such as today's weight and activity calories.
- **Headline** (Caveat 700, 40px, 0.9): page titles via the page header. The app wordmark uses Caveat 700 at 30px.
- **Title** (Caveat 600, 26px, 1.0): section titles, the date in the date navigator, the "te quedan" lead-in.
- **Annotation** (Caveat 600, 21px): renglón labels, notice titles ("Para cerrar el día"), mini-macro labels, the daily note line. Small Caveat subheads (food categories in Compras, template kinds, "recientes:", "día dentro del plan") use the same 21px step; section-level Caveat (titles of panels like "La semana pasada", "Estimado") uses 26px; units beside chalk figures at 26px. Caveat appears only at 40 / 26 / 21px.
- **Figure** (Atkinson 700, 30px, -0.02em, tabular): row values in the fixed renglones and other in-row figures.
- **Body** (Atkinson 400, 15px): list item names, inputs, buttons (`md`). `body-sm` (14px) for header purpose lines (max-width 65ch) and the hero's summary line.
- **Label** (Atkinson 400, 12px): field labels, notes under rows, legends, helper text, chips. `label-caps` (11px, uppercase, 0.025em) only for small descriptors placed *under or inside* a value (meal-kind chips, "kcal" under a stat, table headers). 11px is the floor for any text; freshness labels and ledge labels sit at it.

### Named Rules
**The Single Chalk Figure Rule.** Cabin Sketch is used only for figures 48px and larger, and only one display-size figure leads a screen. Never set words, labels or small numbers in it.

**The Sentence Is the Title Rule.** Section titles are a plain handwritten phrase ("Lo que comiste hoy", "En la heladera"). No eyebrow, kicker or category label sits above them.

**The Tabular Figures Rule.** Any number that lines up with another (row values, list kcal/protein, axes, tables) is tabular.

## Layout

Single column centred at max 1024px with a 16px side gutter (24px from 640px). Vertical rhythm is 28px between sections on Hoy. From 1024px, Hoy becomes two columns (1.15fr / 1fr, 40px gap): hero, renglones, macros and weight on the left; fridge, quick meals and activity on the right. On mobile the fridge moves directly under the renglones so what there is to eat is one scroll away.

The first viewport at 390px is fixed: date, "te quedan" + chalk figure + rough bar, the three renglones with their quick action at the right edge, then the fridge. Renglones keep their order and position on every day so they read like the fixed cells of a board.

Mobile reserves 128px of bottom padding for the ledge; desktop 56px. The mobile ledge respects the safe-area inset.

## Elevation & Depth

Flat by default. Depth comes from tonal steps of the board (`board` → `board-panel` → `board-raised`), not from shadows. Filled panels carry only a 1px inner top highlight of chalk at 5%, like the lip of a slate.

### Shadow Vocabulary
- **Panel lip** (`box-shadow: inset 0 1px 0 rgb(238 237 230 / 0.05)`): every filled panel card.
- **Sheet lift** (`box-shadow: 0 18px 40px -12px rgb(0 0 0 / 0.7)`): the mobile "Más" sheet, above a 60% black scrim.
- **Chalk resting on the ledge** (`box-shadow: 0 6px 16px -6px rgb(0 0 0 / 0.7)`): the raised centre Crear button on the mobile ledge only.
- **Toast lift** (`box-shadow: 0 14px 30px -10px rgb(0 0 0 / 0.7)`): the chalk-white toast above the ledge.

### Named Rules
**The Slate Not Glass Rule.** No blur backdrops, no glows, no coloured shadows. Things that float (the sheet, the toast, the Crear chalk) cast a plain dark shadow; everything else sits flat on the board.

## Shapes

Softly rounded rectangles throughout; hand-drawn geometry only where it carries meaning. Controls round at 12px, fields at 8px, filled panels at 14px, the sheet and Crear chalk at 16px, the wooden ledge at a near-square 4px (it is a plank). Chips and inline kind labels use 4px; legend swatches are 2px squares, line swatches are pills.

Borders are dashed chalk, not solid: ghost buttons, danger buttons, empty-state prompts, the ruled-section top rule and renglón dividers all use dashed white at low alpha. Solid hairlines appear only in fields (10% white) and chart gridlines.

Progress bars have no radius: their edges are roughened by a repeating chalk-stroke mask (40px tile) so they read as a chalk line, not a pill.

## Components

### Buttons
Tactile chalk on a board: flat, quick, slightly squashed on press.
- **Shape:** 12px radius; heights 32px (`sm`, 14px text), 40px (`md`, 15px), 36px square (`icon`).
- **Primary:** green chalk fill, board-coloured bold text. Used for the one main action of a group ("Comer 1", "Anotar", save).
- **Ghost:** transparent with a dashed 18% chalk border and `chalk-soft` text; hover brightens the border to 30% and adds a 4% wash. Used for quick row actions ("+1k", "+ vaso") and secondary choices.
- **Danger:** dashed red-chalk border at 40%, red-chalk text, 10% red wash on hover.
- **Plain:** text only, `chalk-dim` to `chalk` on hover; icon buttons, "Ver heladera", delete crosses.
- **States:** 150ms colour transition on the ease-out curve; press scales to 0.97; disabled is 40% opacity without pointer events. Focus is the global 2px dashed green outline at 3px offset with an 8px radius.

### Chips (meal kind)
- **Style:** 11px uppercase label inside a 4px-rounded tint: green chalk at 10% for tupper, yellow at 10% for desayuno, sky at 10% for comida, white at 6% with `chalk-dim` for extra. Colour follows the Fixed Chalk Rule.
- **Preset chips** (Cargar con un toque, activity presets) are ghost-style dashed outlines with an emoji content icon, name and protein in sky chalk.
- **Recent-food chips:** after a Caveat "recientes:" label, dashed 18% pills with emoji + name in 12px `chalk-muted`; hover turns the border green at 50%.
- **Portion chips** (½, 1, 1½, 2 porción): revealed when a meal row expands; 8px-radius dashed outlines, the selected one solid green at 70% with a 10% green wash.
- **Freshness labels** (batch cooking): 11px pills with a 15% tint; see Status uses of the chalks.

### Plan checks
Four chalk checkboxes under the hero summary (Calorías, Proteína, Pasos, Agua): 20px, 6px radius, dashed 25% outline when unmet, filled green with a board-coloured tick when met; the label brightens from `chalk-faint` to `chalk`. When the day is in plan, "día dentro del plan" follows in 21px Caveat green with a drawn chalk underline.

### Cards / Containers
Two variants, chosen by job.
- **Ruled** (reading sections): no fill, no radius; a dashed 18% chalk top rule and 20px top padding. Used for Peso, En la heladera, Cargar con un toque, Actividad, Lo que comiste hoy and other read-first sections.
- **Panel** (form-heavy groups and chart surfaces): `board-panel` fill, 14px radius, panel lip highlight, 16px padding (20px from 640px). Used for the Crear builder, the Gastos form, Ajustes, the Alimentos detail and chart frames.
- **Notice** (one suggestion or warning with at most one action): no fill, 12px radius, dashed 1px outline tinted by meaning, 14×12px padding, 21px Caveat title in the same chalk. Green 40% for "Para cerrar el día" (one primary button), yellow 40% for the cook reminder, white 18% for missing recurring ("fijo") expenses with a primary "Cargarlos".
- Dismissible panels (La semana pasada on Monday/Tuesday, Primeros pasos onboarding) use the panel variant with a plain close cross; onboarding steps are numbered 24px circles (dashed when pending, green with a tick when done, label struck through).
- Never nest a panel inside a panel.

### Inputs / Fields
- **Style:** 40px tall, 8px radius, 18% black inset fill, 1px solid 10% chalk border, 15px chalk text, placeholder at `zinc-600`. Optional emoji/text prefix and a `chalk-faint` unit suffix inside the field. Label above in 12px `chalk-dim`.
- **Focus:** border shifts to green chalk at 70%; caret is green chalk.
- Number inputs have no spinners.

### Navigation (the wooden ledge)
- **Desktop (≥640px):** a flat wood plank under the wordmark: `wood-ledge` fill, `wood-edge` 1px top border, 4px radius, 4px padding. Items are icon + label (short label at md, full at lg), `wood-chalk` at 75% inactive. The active item gets a 25% black inset wash, chalk text, and a white chalk underline drawn under it.
- **Mobile (<640px):** the plank is fixed to the bottom edge with five slots: Hoy, Heladera, **Crear**, Agua, Más. Crear is a 48px green-chalk square (16px radius) raised 20px above the plank with a resting shadow. Labels are 11px. The active tab is marked by the drawn chalk underline, never by a pill.
- **Más:** a sheet rising from the ledge (board-raised, 16px radius, sheet lift shadow) over a 60% black scrim, titled in Caveat, with a two-column grid of the remaining sections. When the current section lives in Más, the Más slot takes its name and its underline.

### Renglón (signature: fixed board row)
The defining pattern of Hoy. Caveat label at 21px in `chalk-dim`; value in Atkinson 700 30px with the unit and goal in 14px `chalk-faint`; a small (8px) chalk-stroke bar in the row's nutrient chalk, max 384px; a 12px note under it; the quick action pinned right. Rows are separated by dashed 14% rules and the group is closed top and bottom. When the goal is met the bar turns green and a green chalk underline draws itself beneath the value. Steps carries a goal marker tick on a bar scaled to the stretch target.

### Hero chalk figure
"te quedan" / "te pasaste por" in Caveat 26px, the Cabin Sketch display figure with "kcal" in Caveat beside it, a 12px chalk-stroke bar (green, red when over), and one tabular summary line with figures in bold chalk and burned calories in orange chalk.

### Toast
A slip of white chalk above the ledge: `chalk` fill, board text, 12px radius, toast-lift shadow, check icon, 14px text truncated to one line, max 448px wide, fixed 88px above the bottom on mobile (24px from 640px). An optional "Deshacer" is bold text with a dashed underline. It stays 3s, 6s when it offers undo, rises and fades with the sheet motion, and is announced politely to screen readers.

### Compras (shopping list)
Ruled sections. Planned templates are grouped under small Caveat kind subheads, each row with a stepper (inset field style, 36px − / + buttons, tabular count). The list groups items by food category under Caveat subheads in dashed-divided rows: checkbox, emoji, name, quantity in 12px `chalk-faint`, cost at the right. Checked rows go `zinc-600` and struck through. A dashed top rule closes the list with "Estimado" in Caveat and the total in bold tabular figures, then copy-list and register-expense actions.

### Tally sticks
Market-stall counting: groups of five (four strokes and a diagonal), 2.2px round-capped strokes, lit strokes in the metric's chalk and unlit strokes in `chalk-ghost`. Used for glasses of water.

### Charts
- **Marks:** 2px lines with round caps and joins; bars max 18–24px wide with a 4px rounded top; 2px gaps between stacked segments; dots 4px radius with a 2px board-panel ring.
- **Frame:** solid 1px horizontal gridlines in `board-line`, no vertical grid, no axis lines or tick marks; axis text 11px Atkinson in `chalk-faint`.
- **Text:** always in chalk text tokens, never in the series colour. Lines get a direct end label. Any chart with two or more series gets a legend (12px `chalk-dim`, line/dot/square swatches). Goal lines are labelled ("meta 166 g") in `chalk-muted`.
- **Status:** goal met uses the full data colour; below goal uses the `-low` step. Consistency strips use a single-hue sky scale.
- **Plan calendar:** 12 weeks × 7 days heatmap, columns are weeks, 3px gaps, 3px-radius cells capped at 24px, four-step green legend below; cell titles carry the date and checks passed.
- **"Cómo vas":** a panel above the charts with a 26px Caveat title, the 2-week rate in 12px tabular, one sentence of advice (green when on track, yellow when stalled or too fast) and at most one primary "Aplicar" button.
- Chart animation is off; values appear in place.

### Motion (chalk behaviour)

Motion behaves like chalk and an eraser, never like a dashboard.
- **Curves:** ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for everything that settles; drawer `cubic-bezier(0.32, 0.72, 0, 1)` for sheets.
- **Fills:** bars and the water glass fill by transform only (scaleX 240ms, scaleY 320ms), never by animating width or height.
- **Goal underline:** draws its stroke over 500ms when it mounts (that is, when a goal is reached).
- **Re-chalk:** a changed figure fades in from 35% opacity and a 1.5px blur over 220ms.
- **Erase:** removing a list item blurs (4px), fades and drifts 8px right over 180ms before it is removed.
- **Sheets and toast:** 260ms rise from 16px below with a 200ms fade; scrim fades 200ms. Drawer-in content rises 24px over 280ms.
- **Tab switches have no animation.**
- **Reduced motion:** the underline appears drawn, fills jump, sheets and drawers become 150ms fades, re-chalk and erase are skipped.

## Do's and Don'ts

### Do:
- **Do** lead each screen with at most one Cabin Sketch figure (≥48px) and keep all other text in Atkinson Hyperlegible or Caveat.
- **Do** keep every coloured chalk on its fixed role: sky protein, yellow carbs/steps, pink fat, aqua water, orange activity, green action/goal met, red excess.
- **Do** use the ruled variant (dashed top rule, no fill) for reading sections and the filled panel only for form-heavy groups and charts.
- **Do** mark a reached goal by drawing the chalk underline (500ms) and turning the bar green.
- **Do** animate fills with transform and delete items with the eraser smudge.
- **Do** keep chart text in chalk tokens, label goal lines, label line ends directly and give ≥2-series charts a legend.
- **Do** use 1.8px-stroke line icons for interface chrome; food emoji stay as user-chosen content icons for foods and meals.
- **Do** keep readable text at `chalk-faint` (~5.2:1) or brighter and at 11px or larger.
- **Do** confirm everyday logging actions with the toast and offer "Deshacer" when they can be reversed.
- **Do** give a suggestion or warning the dashed notice form with one action, tinted by meaning.

### Don't:
- **Don't** use black-and-neon styling, glows, or progress rings; bars are rough chalk strokes and goals are underlines and tallies.
- **Don't** add grain, noise or a photographic chalkboard texture; the board carries only its three fixed eraser smudges.
- **Don't** imitate wood grain on the ledge; it is a flat plank colour with a lighter top edge.
- **Don't** put an eyebrow, kicker or category label above a section title.
- **Don't** set body copy, labels or numbers under 48px in Cabin Sketch.
- **Don't** use a data colour for UI text or a UI chalk for chart marks, and don't put water and protein in the same chart.
- **Don't** mark the active tab with a filled pill on mobile; it gets the chalk underline.
- **Don't** animate tab switches or chart entry.
- **Don't** nest a filled panel inside another panel.
