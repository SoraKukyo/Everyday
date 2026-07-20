# Module-by-module product audit backlog

This file records the Feature Architect and Skeptical Reviewer outcome for every module. Each module is implemented after its audit; only SQL migrations, installations, destructive changes, or integrations require a user pause.

## Entry trackers

| Module | Architect focus | Reviewer must-have gap | Next implementation target |
|---|---|---|---|
| Calories | Capture food, burn, target and history | Accurate back-dated records; native history/filtering | **Verified:** meals, personal target, burns, deficit mode, edit/undo and day/week/month/year history; native chart refactor deferred |
| Budget | Plan, transact, review cash flow | Category-limit decisions and spending pace | **Implemented:** per-category limits, month forecast, searchable transaction review |
| Water | Fast intake and daily consistency | Containers and meaningful consistency feedback | **Verified:** unit-aware quick containers, daily target, streak and history; custom saved containers deferred |
| Weight | Weigh-ins and goal trajectory | Trend, change, milestone pacing | **Verified:** kg/lb, dated entries, latest/change, rolling trend and goal setting; forecast deferred |
| Steps | Daily activity and progress | Personal baseline and weekly pattern | **Verified:** daily target, quick adjustments, personal best, weekly total and history |
| Time tracking | Capture sessions and review work | Reliable projects and billable-style review | **Verified:** persistent timer, manual sessions, project/task breakdown and date-based history |
| Subscriptions | Bills and renewals | Avoid surprise charges and see total commitment | **Verified:** service, billing cycle, next charge, monthly commitment and upcoming charges; cancel state deferred |
| Savings | Contributions and target | Know required pace and progress | **Verified:** deposits/withdrawals, target/date, progress and required monthly pace |
| Net worth | Periodic balance snapshots | Explain change, assets and liabilities | **Verified:** dated account snapshots, asset/liability types and trend; account comparison deferred |
| Investments | Contributions and snapshots | Separate deposits from value/performance | **Verified:** account/type, annual contribution target, portfolio snapshots, contribution/value comparison |

## Lists

| Module | Architect focus | Reviewer must-have gap | Next implementation target |
|---|---|---|---|
| Todo | Decide what matters next | Urgency gets buried | **Verified:** priority, due date, notes, active/done filters and smart ordering; dedicated today view deferred |
| Grocery | Shop quickly without omissions | Store context and purchased cleanup | **Verified:** quantity, category, store/aisle grouping, purchased cleanup with undo |
| Watchlist | Save and choose media | No next choice or completion context | **Verified:** media type, status, source and rating, grouped status view |
| Bucket list | Turn wishes into plans | Items never become actionable | **Verified:** someday/planned/done state, target date and cost estimate |
| Gift ideas | Remember gifts and occasions | Duplicate/late purchases | **Verified:** person, occasion, budget, source and purchase/given state |

## Streaks

| Module | Architect focus | Reviewer must-have gap | Next implementation target |
|---|---|---|---|
| Exercise | Consistent movement | Need effort/context, not only checkmark | **Verified:** duration, check-in history, current/best streak and seven-day consistency |
| Medication | Safe routine support | Need dose/time clarity without medical advice | **Verified:** dose/reminder note, check-in history and consistency view |
| Meditation | Practice consistency | Need session reflection | **Verified:** duration, notes, streak and consistency view |
| Habit tracker | Multiple personal habits | Each habit needs independent identity/history | **Verified:** independent named-habit check-ins after streak-habits migration; dashboard selector deferred |
| Language learning | Daily skill practice | Need topic and accumulated practice | **Verified:** duration, notes and consistency history; topic totals deferred |
| Skill practice | Deliberate practice | Need project context | **Verified:** duration, notes and consistency history; project totals deferred |
| Gratitude | Daily reflection | Entries should be searchable and meaningful later | **Verified:** reflection check-ins, streak and searchable history |

## Saved libraries

| Module | Architect focus | Reviewer must-have gap | Next implementation target |
|---|---|---|---|
| Link saver | Read/view later | Saved links disappear into a pile | **Verified:** URL/type detection, tags, search, edit and favorite resurfacing; reading state deferred |
| Journal | Private daily reflection | Need dates, mood and retrieval | **Verified:** dated records, mood field, text search and favorites; calendar view deferred |
| Reading list | Finish books/articles | Need clear next item and progress | **Verified:** status, progress, tags/search and favorites |
| Contacts | Maintain relationships | Need timely follow-up context | **Verified:** birthday/last-talked fields, search, tags and favorites; contact-soon view deferred |
| Recipe box | Reuse recipes | Need ingredients and meal-planning context | **Verified:** ingredients/source metadata, tags, search and favorites |
| Idea inbox | Capture then decide | Ideas stagnate | **Verified:** capture, tags, search, edit and favorite review queue |
| Quote collector | Retrieve inspiration | Quotes need source and collection context | **Verified:** tags, full-text search, favorites and editable collections via tags |

## Due dates

| Module | Architect focus | Reviewer must-have gap | Next implementation target |
|---|---|---|---|
| Debt payoff | Reduce balance | Need payoff progress, not reminder only | **Verified:** amount/paid fields, due date, completion and urgency; payoff pace deferred |
| Remittance | Track sending/receipt | Need transaction state | **Verified:** amount, recipient, sent date, due/status workflow and history |
| Chores | Recurrent home maintenance | Need next occurrence and completion history | **Verified:** weekly/monthly recurrence automatically advances on completion |
| Packages | Track deliveries | Need delivery state and carrier context | **Verified:** tracking number, order/shipped/delivered state, dates and urgency |
| Warranty | Avoid losing coverage | Need provider/receipt and expiry urgency | **Verified:** provider metadata, expiry countdown and overdue/upcoming views |
| Documents | Stay compliant | Need issuer/renewal visibility | **Verified:** document type, expiry countdown and searchable records; issuer deferred |
| Maintenance | Protect vehicles/items | Need service history and future interval | **Verified:** asset metadata, next-date schedule and completion history |
| Courses | Finish/retain credentials | Need progress and completion proof | **Verified:** provider/progress fields, schedule and completion workflow |

## Meta

| Module | Architect focus | Reviewer must-have gap | Next implementation target |
|---|---|---|---|
| Dashboard | Decide what to do now | Counts are not priorities | **Verified:** overdue/due-next action queue plus open-list/habit counts and module shortcuts |
| Goals | Turn trackers into outcomes | Need measurable progress | **Implemented:** linked live totals, target/date/unit, progress bars and complete/reopen state |
| Global search | Find anything quickly | Need scoped, meaningful results | **Verified:** cross-table full-text search, module filter and result previews |
| Backup | Keep data safe | Need clear validation/recovery feedback | **Verified:** validated JSON import, record totals, module-settings coverage and recovery feedback |
