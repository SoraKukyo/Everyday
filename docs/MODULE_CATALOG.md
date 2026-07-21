# Module catalog

Status key: **Code** means configured and implemented in the repository. **Migration** identifies data prerequisites. **Live verification** is not claimed here unless recorded by a manual test outside the repository.

## EntryTracker

| Module | ID | Data / accent | Important fields and behavior | Status |
|---|---|---|---|---|
| Calories | `calories` | `entry_records` / green | Meal, note, date; food vs burn, daily target, skip/clear recovery, deficit mode, bar history | Code; base schema; manual live check needed |
| Budget | `budget` | `entry_records` / pink | Income/expense, category, date, currency/display rate, monthly/category limits; net cash flow | Code; base schema; manual live check needed |
| Water intake | `water` | `entry_records` / green | ml/oz, daily sum/goal, quick amounts | Code; base schema; manual live check needed |
| Weight | `weight` | `entry_records` / green | kg/lb, latest value, line trend, goal pace/date | Code; base schema; manual live check needed |
| Steps | `steps` | `entry_records` / green | Daily sum/goal and presets | Code; base schema; manual live check needed |
| Time tracking | `time-tracking` | `entry_records` / green | Minutes, project, task, duration display/history | Code; base schema; manual live check needed |
| Subscriptions | `subscriptions` | `entry_records` / pink | Service, billing cycle, next charge, active/paused/cancelled, charge history | Code; base schema; manual live check needed |
| Savings goal | `savings` | `entry_records` / pink | Deposit/withdrawal, target/date, required pace forecast | Code; base schema; manual live check needed |
| Net worth | `net-worth` | `entry_records` / pink | Account, asset/liability, account-aware latest snapshots and line trend | Code; base schema; manual live check needed |
| Investments* | `investments` | `entry_records` / pink | Contribution vs portfolio snapshot, broker/account, asset, annual target | Code; base schema; manual live check needed |

*Investments is the additional unplanned engine module.

## Checklist

| Module | ID | Data / accent | Important fields and behavior | Status |
|---|---|---|---|---|
| Todo | `todo` | `checklist_items` / pink | Priority, due date, notes, date filters, completion/archive history | Code; `core` + checklist history migration; manual live check needed |
| Grocery list | `grocery` | `checklist_items` / pink | Quantity, category, store/aisle, grouped shopping list | Code; same migrations; manual live check needed |
| Watchlist | `watchlist` | `checklist_items` / pink | Book/movie/show, status, rating, safe source URL, complete → finished | Code; same migrations; manual live check needed |
| Bucket list | `bucket-list` | `checklist_items` / pink | Category, status, target date, estimate, next action | Code; same migrations; manual live check needed |
| Gift ideas | `gift-ideas` | `checklist_items` / pink | Person, occasion/date, budget, source URL, purchase/given status | Code; same migrations; manual live check needed |

## StreakTracker

| Module | ID | Data / accent | Important fields and behavior | Status |
|---|---|---|---|---|
| Exercise | `exercise` | `streak_checkins` / green | Duration, type, effort; calendar history | Code; `core` + habits migration; manual live check needed |
| Medication | `medication` | `streak_checkins` / green | Dose/reminder and time taken | Code; same migrations; manual live check needed |
| Meditation | `meditation` | `streak_checkins` / green | Duration and style | Code; same migrations; manual live check needed |
| Habit tracker | `habits` | `streak_checkins` / green | Named habit scope, note, multiple habits per day | Code; same migrations; manual live check needed |
| Language learning | `language` | `streak_checkins` / green | Duration and topic | Code; same migrations; manual live check needed |
| Skill practice | `skill-practice` | `streak_checkins` / green | Duration and project/skill | Code; same migrations; manual live check needed |
| Gratitude log | `gratitude` | `streak_checkins` / green | Reflection/note and calendar history | Code; same migrations; manual live check needed |

## SavedItems

| Module | ID | Data / accent | Important fields and behavior | Status |
|---|---|---|---|---|
| Link saver | `links` | `saved_items` / blue | URL, detected type, reading state, tags, safe Open link action | Code; `core` migration; manual live check needed |
| Journal | `journal` | `saved_items` / blue | Free content, mood, entry type, tags | Code; same migration; manual live check needed |
| Reading list | `reading-list` | `saved_items` / blue | Progress %, status, tags, filters | Code; same migration; manual live check needed |
| Contacts | `contacts` | `saved_items` / blue | Phone/email/context, birthday, last talked, follow-up filter | Code; same migration; manual live check needed |
| Recipe box | `recipes` | `saved_items` / blue | Source URL, ingredients, cuisine, course, tags | Code; same migration; manual live check needed |
| Idea inbox | `ideas` | `saved_items` / blue | Status, review/promoted filters, tags | Code; same migration; manual live check needed |
| Quote collector | `quotes` | `saved_items` / blue | Author, source, tags | Code; same migration; manual live check needed |

## DueDateTracker

| Module | ID | Data / accent | Important fields and behavior | Status |
|---|---|---|---|---|
| Debt payoff | `debt` | `due_items` / blue | Original amount plus payment-ledger rows; remaining amount derived | Code; `core` + due history migration; manual live check needed |
| Remittance log | `remittance` | `due_items` / blue | Amount, recipient, sent date, state | Code; same migrations; manual live check needed |
| Chore schedule | `chores` | `due_items` / blue | Repeat interval, area, preserved completed occurrences | Code; same migrations; manual live check needed |
| Package tracker | `packages` | `due_items` / blue | Tracking number/carrier/status and safe tracking URL | Code; same migrations; manual live check needed |
| Warranty tracker | `warranties` | `due_items` / blue | Provider/store and receipt reference | Code; same migrations; manual live check needed |
| Document expiry | `documents` | `due_items` / blue | Document type and issuer | Code; same migrations; manual live check needed |
| Vehicle maintenance | `maintenance` | `due_items` / blue | Asset and service type | Code; same migrations; manual live check needed |
| Course tracker | `courses` | `due_items` / blue | Progress %, provider, credential | Code; same migrations; manual live check needed |

## Meta features

| Feature | Route ID | Data / purpose | Status |
|---|---|---|---|
| Dashboard | `dashboard` | Derives snapshots and deadlines from engine tables | Code; manual live check needed |
| Goals | `goals` | Stores cross-module goals; compatible EntryTracker calculations | Code; goals-rich migration required; manual live check needed |
| Global Search | `search` | Searches engine-table records and opens the source module | Code; core tables required; manual live check needed |
| Backup / Import | `backup` | JSON export/import across generic tables/settings with rollback attempt | Code; core tables required; manual live check needed |

### Auxiliary integration (not part of the 41-feature catalog count)

| Feature | Route ID | Data / purpose | Status |
|---|---|---|---|
| Connect to AI / MCP | `connect-ai` | Token UI plus optional read-only Edge Function | Code; MCP token/read-grant migrations and Edge Function deployment required; ChatGPT No auth connection was manually observed during project work; Claude remains unverified |

## Explicitly cut / stretch scope

**Cut:** Password/notes vault. It is intentionally excluded because a public/shared hackathon repository is not an appropriate security boundary for secret storage.

**Stretch, not configured:** Image saver, Mood tracker, Period/cycle tracker, Pomodoro timer, Calendar/event log, Currency converter, and Meal planner.
