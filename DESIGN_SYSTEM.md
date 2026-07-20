# "Everyday" Design System — for implementation

## CSS Variables

```css
:root {
  /* Base */
  --color-background: #FBF9F6;
  --color-surface: #FFFFFF;
  --color-text-primary: #2E2B27;
  --color-text-secondary: #8C8579;

  /* Green — habits, nutrition */
  --color-green-100: #E3EFE5;
  --color-green-300: #B9D9BE;
  --color-green-500: #7FB88A;
  --color-green-700: #4C8358;

  /* Blue — links, reminders, notes */
  --color-blue-100: #E2ECF4;
  --color-blue-300: #AFCBE0;
  --color-blue-500: #74A2C6;
  --color-blue-700: #3E6E93;

  /* Pink — budget, self-care, tasks */
  --color-pink-100: #F8E7EB;
  --color-pink-300: #E9BFC8;
  --color-pink-500: #D98CA0;
  --color-pink-700: #A65670;

  /* Card shell */
  --card-radius: 20px;
  --card-shadow: 0 2px 12px rgba(46, 43, 39, 0.06); /* soft, low-opacity — adjust if design tool gave exact value */

  /* Fonts */
  --font-heading: 'Lora', serif;
  --font-body: 'Karla', sans-serif;
}
```

## Accent color usage rule (apply per module category)
- 100 → tinted background
- 500 → fills & icons
- 700 → text-on-tint

Category → color mapping:
- **Green**: habits, nutrition (streak engine + calorie-type entry trackers)
- **Blue**: links, reminders, notes (saved-item engine + due-date engine)
- **Pink**: budget, self-care, tasks (checklist engine + budget-type entry trackers)

Suggest exposing this as a `moduleColorMap` or similar lookup in `modules.js` config, so each module config declares which accent family it belongs to (not hardcoded per-component).

## Type scale
| Role | Size | Font | Weight |
|---|---|---|---|
| H1 (page title, e.g. "Today, July 17") | 32px | Lora | 600 |
| H2 (section title, e.g. "Nutrition") | 22px | Lora | 600 |
| Card title (e.g. "Calories today") | 15px | Karla | 700 |
| Body | 15px | Karla | 400 |
| Meta (e.g. "1,450 / 2,000 kcal") | 13px | Karla | 500 |
| Label (small, tracked/letterspaced) | 11px | Karla | 500-600 |

## Card shell (shared across all 5 engines)
- 20px border radius
- Soft shadow (low opacity)
- Icon chip + label header at top
- Only the accent color + content region differ per engine type — the shell component itself should be one shared component (e.g. `<ModuleCard accent="green">...</ModuleCard>`) wrapping engine-specific content

## Per-engine content pattern (inside the shared card shell)
- **EntryTracker**: big number + "/goal" + small subtext (e.g. "550 kcal left today")
- **Checklist**: list with strikethrough for completed items + "X of Y done" footer
- **StreakTracker**: large streak number ("12 days") + short encouragement subtext
- **SavedItems**: title + small tag/type label + count footer ("1 of 14 saved")
- **DueDateTracker**: date block (day-of-week + day number) + title + "due in X days"

## Fonts to load
Google Fonts: Lora (600) and Karla (400, 500, 700)