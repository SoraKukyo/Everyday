#!/usr/bin/env node
/*
 * Seeds one existing Everyday user with deterministic, fictional demo data.
 *
 * Required local-only environment variables:
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   EVERYDAY_SEED_USER_ID
 *
 * Preview: node scripts/seed-demo-data.mjs
 * Write:   node scripts/seed-demo-data.mjs --apply
 *
 * Every row uses a deterministic UUID and is upserted. Re-running this script
 * updates the same demo rows; it never deletes or scans unrelated user data.
 */
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 250;
const SEED_VERSION = 'everyday-demo-v2';
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.EVERYDAY_SEED_USER_ID;

if (!url || !serviceRoleKey || !userId) {
  throw new Error('Set SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, and EVERYDAY_SEED_USER_ID in your terminal. Never commit these values.');
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anchor = new Date();
anchor.setUTCHours(12, 0, 0, 0);
const dayMs = 86_400_000;
const categories = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Other'];
const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

function stableId(seed) {
  const hex = createHash('sha256').update(`${SEED_VERSION}:${seed}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
function dateAt(daysAgo = 0, hour = 12, minute = 0) {
  return new Date(anchor.getTime() - daysAgo * dayMs + (hour - 12) * 3_600_000 + minute * 60_000).toISOString();
}
function dateKey(daysAgo = 0) { return dateAt(daysAgo).slice(0, 10); }
function futureDate(daysFromToday = 0) { return new Date(anchor.getTime() + daysFromToday * dayMs).toISOString().slice(0, 10); }
function previousDate(date) { return new Date(new Date(`${date}T12:00:00Z`).getTime() - dayMs).toISOString().slice(0, 10); }
function timestampForDate(date, hour = 12) { return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00.000Z`).toISOString(); }
function demoMeta(metadata = {}) { return metadata; }
function chunk(rows, size = BATCH_SIZE) { return Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, index * size + size)); }

const entryRecords = [];
const checklistItems = [];
const streakCheckins = [];
const savedItems = [];
const dueItems = [];
const goals = [];
const moduleSettings = [];

function addEntry(moduleId, key, daysAgo, value, { note = null, fields = {}, metadata = {}, hour = 12 } = {}) {
  entryRecords.push({
    id: stableId(`entry:${moduleId}:${key}`), user_id: userId, module_id: moduleId, value,
    occurred_at: dateAt(daysAgo, hour), note, fields, metadata: demoMeta(metadata),
    created_at: dateAt(daysAgo, 8), updated_at: dateAt(daysAgo, hour),
  });
}
function addChecklist(moduleId, key, daysAgo, title, { fields = {}, complete = false, archived = false } = {}) {
  const completedAt = complete ? dateAt(Math.max(0, daysAgo - 1), 18) : null;
  checklistItems.push({
    id: stableId(`checklist:${moduleId}:${key}`), user_id: userId, module_id: moduleId, title,
    is_complete: complete, completed_at: completedAt, archived_at: archived ? dateAt(Math.max(0, daysAgo - 1), 19) : null,
    fields, created_at: dateAt(daysAgo, 9),
  });
}
function addStreak(moduleId, key, daysAgo, { note = null, fields = {}, habitKey = 'default' } = {}) {
  streakCheckins.push({
    id: stableId(`streak:${moduleId}:${key}`), user_id: userId, module_id: moduleId,
    completed_on: dateKey(daysAgo), note, fields, habit_key: habitKey,
    created_at: dateAt(daysAgo, 20),
  });
}
function addSaved(moduleId, key, daysAgo, title, { content = null, tags = [], metadata = {} } = {}) {
  savedItems.push({
    id: stableId(`saved:${moduleId}:${key}`), user_id: userId, module_id: moduleId, title, content, tags,
    metadata: demoMeta(metadata), created_at: dateAt(daysAgo, 10),
  });
}
function addDue(moduleId, key, createdDaysAgo, title, { dueDaysFromToday = 0, complete = false, archived = false, metadata = {}, id } = {}) {
  dueItems.push({
    id: id ?? stableId(`due:${moduleId}:${key}`), user_id: userId, module_id: moduleId, title,
    due_at: futureDate(dueDaysFromToday), is_complete: complete,
    completed_at: complete ? dateAt(Math.max(0, createdDaysAgo - 1), 17) : null,
    metadata: demoMeta(archived ? { ...metadata, archived_at: dateAt(Math.max(0, createdDaysAgo - 1), 18) } : metadata),
    created_at: dateAt(createdDaysAgo, 9),
  });
}
function addGoal(key, title, targetModuleId, targetValue, targetUnit, dueDaysFromToday, isComplete = false) {
  goals.push({
    id: stableId(`goal:${key}`), user_id: userId, module_id: 'goals', title,
    target_module_id: targetModuleId, target_value: targetValue, target_unit: targetUnit,
    due_at: futureDate(dueDaysFromToday), is_complete: isComplete, created_at: dateAt(150, 9),
  });
}
function addSettings(moduleId, settings) {
  moduleSettings.push({ user_id: userId, module_id: moduleId, settings, updated_at: dateAt(0, 9) });
}

// EntryTracker: 1,475 records. High-frequency trackers intentionally dominate.
for (let day = 0; day < 150; day += 1) {
  addEntry('calories', `breakfast-${day}`, day, 320 + (day % 5) * 25, { note: ['Oat bowl', 'Egg toast', 'Yogurt and fruit', 'Rice bowl', 'Coffee and sandwich'][day % 5], fields: { meal: 'Breakfast' }, hour: 8 });
  addEntry('calories', `dinner-${day}`, day, 620 + (day % 6) * 35, { note: ['Home dinner', 'Noodle bowl', 'Curry rice', 'Vegetable stir-fry', 'Pasta night', 'Soup and bread'][day % 6], fields: { meal: 'Dinner' }, hour: 19 });
  if (day < 100) addEntry('calories', `lunch-${day}`, day, 500 + (day % 4) * 40, { note: ['Lunch set', 'Chicken salad', 'Bento', 'Quick café lunch'][day % 4], fields: { meal: 'Lunch' }, hour: 13 });
  if (day % 3 === 0) addEntry('calories', `burn-${day}`, day, 210 + (day % 5) * 30, { note: ['Jogging', 'Strength workout', 'Long walk', 'Cycling', 'Mobility session'][(day / 3) % 5 | 0], fields: { duration: 25 + (day % 4) * 10 }, metadata: { kind: 'calorie_burn' }, hour: 18 });
}
[28, 63, 97, 126, 148].forEach((day) => addEntry('calories', `skip-${day}`, day, 0, { note: 'Demo rest day', metadata: { kind: 'day_skip' }, hour: 23 }));

for (let index = 0; index < 344; index += 1) {
  const day = Math.floor(index / 2);
  const category = categories[index % categories.length];
  addEntry('budget', `expense-${index}`, day, 8 + (index % 11) * 7.5, { note: `${['Demo groceries', 'Metro pass', 'Utility payment', 'Household item', 'Coffee with friends', 'Health item', 'Streaming'][index % 7]} ${index + 1}`, fields: { category }, metadata: { transactionType: 'expense', enteredCurrency: index % 19 === 0 ? 'JPY' : index % 23 === 0 ? 'EUR' : 'USD', exchangeRate: 1 }, hour: 11 });
}
for (let index = 0; index < 6; index += 1) addEntry('budget', `income-${index}`, 5 + index * 29, 3200 + index * 40, { note: 'Demo monthly income', fields: { category: 'Bills' }, metadata: { transactionType: 'income', enteredCurrency: 'USD', exchangeRate: 1 }, hour: 9 });

for (let index = 0; index < 150; index += 1) {
  addEntry('water', `morning-${index}`, index, 400 + (index % 3) * 50, { note: 'Morning water', hour: 9 });
  addEntry('water', `afternoon-${index}`, index, 500 + (index % 4) * 50, { note: 'Afternoon water', hour: 15 });
}
for (let index = 0; index < 25; index += 1) addEntry('weight', `snapshot-${index}`, 168 - index * 7, Number((76.4 - index * (3.2 / 24)).toFixed(1)), { note: index === 24 ? 'Current demo weigh-in' : 'Weekly weigh-in', hour: 7 });
for (let index = 0; index < 150; index += 1) addEntry('steps', `day-${index}`, index, 6200 + (index * 431) % 7200, { note: ['Commute day', 'Walk break', 'Errands', 'Weekend walk'][index % 4], hour: 21 });
for (let index = 0; index < 75; index += 1) addEntry('time-tracking', `session-${index}`, index * 2, 30 + (index % 6) * 15, { note: 'Focused session', fields: { project: ['Portfolio', 'Study', 'Home admin'][index % 3], task: ['Planning', 'Deep work', 'Review'][index % 3] }, hour: 16 });

const subscriptions = [
  ['music', 'Music plan', 12.99, 'Monthly', 'Active'], ['video', 'Video plan', 15.99, 'Monthly', 'Active'], ['cloud', 'Cloud storage', 3.99, 'Monthly', 'Paused'], ['fitness', 'Fitness app', 59.99, 'Yearly', 'Active'], ['news', 'News membership', 9.99, 'Monthly', 'Cancelled'],
];
subscriptions.forEach(([key, service, value, billingCycle, status], index) => {
  const id = stableId(`entry:subscriptions:${key}`);
  addEntry('subscriptions', key, 150 - index * 9, value, { note: service, fields: { service, billingCycle, dueDate: futureDate(4 + index * 6), status }, metadata: { kind: 'subscription' } });
  for (let charge = 0; charge < 4; charge += 1) addEntry('subscriptions', `${key}-charge-${charge}`, 120 - charge * 28 - index, value, { note: `Charge: ${service}`, fields: { service, billingCycle }, metadata: { kind: 'subscription_charge', subscriptionId: id } });
});
for (let index = 0; index < 35; index += 1) addEntry('savings', `movement-${index}`, 170 - index * 5, 75 + (index % 4) * 25, { note: index % 9 === 0 ? 'Demo withdrawal for repair' : 'Emergency fund contribution', fields: { type: index % 9 === 0 ? 'Withdrawal' : 'Deposit' }, metadata: index % 9 === 0 ? { kind: 'withdrawal' } : {} });
['Cash', 'Brokerage', 'Pension', 'Credit card', 'Loan'].forEach((account, accountIndex) => { for (let month = 0; month < 5; month += 1) addEntry('net-worth', `${account}-${month}`, 150 - month * 30 - accountIndex, account === 'Credit card' || account === 'Loan' ? 700 - month * 45 : 2500 + accountIndex * 900 + month * 260, { note: `${account} monthly snapshot`, fields: { account, type: account === 'Credit card' || account === 'Loan' ? 'Liability' : 'Asset' } }); });
for (let index = 0; index < 30; index += 1) addEntry('investments', `contribution-${index}`, 145 - index * 5, 120 + (index % 4) * 40, { note: 'Demo monthly investment', fields: { entryKind: 'Contribution', account: ['NISA', 'Rakuten Securities', 'iDeCo'][index % 3], assetName: ['Global index fund', 'Bond ETF', 'Dividend ETF'][index % 3] } });
for (let index = 0; index < 5; index += 1) addEntry('investments', `snapshot-${index}`, 150 - index * 30, 4200 + index * 520, { note: 'Portfolio value snapshot', fields: { entryKind: 'Portfolio value', account: 'NISA', assetName: 'Portfolio total' }, metadata: { kind: 'portfolio_snapshot' } });

// Checklist: 505 records with active, completed, and archived history.
for (let index = 0; index < 260; index += 1) addChecklist('todo', index, index % 175, `Demo task ${String(index + 1).padStart(3, '0')}`, { complete: index % 3 === 0, archived: index % 10 === 0, fields: { priority: ['High', 'Medium', 'Low'][index % 3], dueDate: futureDate((index % 35) - 22), notes: 'Fictional task for demo filtering' } });
for (let index = 0; index < 130; index += 1) addChecklist('grocery', index, index % 90, `Demo grocery item ${index + 1}`, { complete: index % 2 === 0, fields: { quantity: `${1 + index % 4} unit`, category: ['Produce', 'Pantry', 'Dairy', 'Frozen', 'Household'][index % 5], store: ['Market A', 'Market B', 'Corner shop'][index % 3] } });
for (let index = 0; index < 45; index += 1) addChecklist('watchlist', index, index * 3, `Sample ${['Book', 'Movie', 'Show'][index % 3]} ${index + 1}`, { complete: index % 4 === 0, fields: { type: ['Book', 'Movie', 'Show'][index % 3], status: ['Want to watch', 'In progress', 'Finished'][index % 3], where: `https://example.com/watch/${index + 1}`, rating: index % 4 === 0 ? 4 + index % 2 : '' } });
for (let index = 0; index < 35; index += 1) addChecklist('bucket-list', index, index * 4, `Demo adventure ${index + 1}`, { complete: index % 6 === 0, fields: { category: ['Travel', 'Learning', 'Experience'][index % 3], status: ['Someday', 'Planned', 'Done'][index % 3], targetDate: futureDate(20 + index * 12), cost: 100 + index * 25, nextAction: 'Research one option' } });
for (let index = 0; index < 35; index += 1) addChecklist('gift-ideas', index, index * 4, `Gift idea ${index + 1}`, { complete: index % 5 === 0, fields: { person: `Demo person ${1 + index % 8}`, occasion: ['Birthday', 'Holiday', 'Thank you'][index % 3], occasionDate: futureDate(15 + index * 11), budget: 20 + index * 5, source: `https://example.com/gift/${index + 1}`, status: ['Idea', 'To buy', 'Purchased', 'Given'][index % 4] } });

function streakOffsets(count, phase = 0) {
  const runs = [6, 12, 9, 15, 8, 13, 10, 14, 7, 11]; const gaps = [5, 7, 2, 4, 1, 3, 2, 6, 1, 3];
  const offsets = []; let cursor = phase; let segment = 0;
  while (offsets.length < count) {
    const length = Math.min(runs[segment % runs.length], count - offsets.length);
    for (let day = 0; day < length; day += 1) offsets.push(cursor + day);
    cursor += length + gaps[segment % gaps.length]; segment += 1;
  }
  return offsets;
}
function addStreakSeries(moduleId, count, phase, note, fields = {}) { streakOffsets(count, phase).forEach((daysAgo, index) => addStreak(moduleId, index, daysAgo, { note: note[index % note.length], fields })); }
addStreakSeries('exercise', 130, 0, ['Demo strength session', 'Demo walk', 'Demo cardio']);
addStreakSeries('medication', 145, 0, ['Demo reminder completed'], { dose: 'Demo dose', time: '08:00' });
addStreakSeries('meditation', 80, 1, ['Demo breathing practice', 'Demo guided session'], { duration: 10, style: 'Breathing' });
streakOffsets(90, 0).forEach((daysAgo, index) => addStreak('habits', `reading-${index}`, daysAgo, { note: 'Demo reading habit', fields: { habit: 'Read 10 pages' }, habitKey: 'Read 10 pages' }));
streakOffsets(60, 2).forEach((daysAgo, index) => addStreak('habits', `language-${index}`, daysAgo, { note: 'Demo language habit', fields: { habit: 'Review vocabulary' }, habitKey: 'Review vocabulary' }));
addStreakSeries('language', 70, 1, ['Demo language lesson'], { duration: 20, topic: 'Vocabulary' });
addStreakSeries('skill-practice', 45, 3, ['Demo practice session'], { duration: 30, project: 'Drawing basics' });
addStreakSeries('gratitude', 55, 0, ['Demo gratitude: a quiet morning', 'Demo gratitude: helpful friend'], { reflection: 'Fictional reflection' });

// SavedItems: 240 fictional references, with tags, filters, and metadata.
for (let index = 0; index < 70; index += 1) addSaved('links', index, index * 2, `Demo article ${index + 1}`, { content: 'A fictional saved reference for search and tag testing.', tags: ['demo', ['design', 'health', 'finance', 'learning'][index % 4]], metadata: { url: `https://example.com/article/${index + 1}`, type: ['Article', 'YouTube', 'Instagram', 'Other'][index % 4], status: ['Unread', 'In progress', 'Finished'][index % 3] } });
for (let index = 0; index < 45; index += 1) addSaved('journal', index, index * 3, `Demo journal entry ${index + 1}`, { content: 'A fictional daily reflection with an ordinary highlight and a small next step.', tags: ['demo', 'reflection'], metadata: { mood: ['Great', 'Good', 'Okay', 'Low'][index % 4], entryType: ['Reflection', 'Daily note', 'Memory', 'Lesson'][index % 4] } });
for (let index = 0; index < 30; index += 1) addSaved('reading-list', index, index * 5, `Sample reading title ${index + 1}`, { content: 'Fictional reading-list note.', tags: ['books', 'demo'], metadata: { progress: (index * 13) % 101, status: ['Want to read', 'Reading', 'Finished'][index % 3] } });
for (let index = 0; index < 20; index += 1) addSaved('contacts', index, index * 7, `Demo contact ${index + 1}`, { content: 'Fictional contact context only.', tags: ['people', 'demo'], metadata: { phone: `+1-555-010-${String(index).padStart(2, '0')}`, email: `demo-contact-${index + 1}@example.net`, organization: ['Demo studio', 'Sample club', 'Example team'][index % 3], birthday: futureDate(-100 - index * 11), lastTalked: futureDate(-5 - index * 8) } });
for (let index = 0; index < 30; index += 1) addSaved('recipes', index, index * 5, `Demo recipe ${index + 1}`, { content: 'Fictional recipe note for demo search.', tags: ['food', ['quick', 'weekend', 'vegetarian'][index % 3]], metadata: { source: `https://example.com/recipe/${index + 1}`, ingredients: 'Example ingredient A, example ingredient B, pantry staple', cuisine: ['Mediterranean', 'Japanese-inspired', 'Comfort food'][index % 3], course: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'][index % 5] } });
for (let index = 0; index < 25; index += 1) addSaved('ideas', index, index * 6, `Demo idea ${index + 1}`, { content: 'A fictional idea with a lightweight next action.', tags: ['ideas', 'demo'], metadata: { status: ['Inbox', 'Review', 'Promoted', 'Archived'][index % 4] } });
for (let index = 0; index < 20; index += 1) addSaved('quotes', index, index * 7, `Demo quote ${index + 1}`, { content: 'A short fictional quote for collection testing.', tags: ['quotes', 'demo'], metadata: { author: `Demo author ${index + 1}`, source: 'Sample collection' } });

// DueDateTracker: 105 rows, including a linked debt payment ledger and recurring chores.
const debtIds = ['card', 'course', 'device'].map((key) => stableId(`due:debt:${key}`));
[['card', 'Demo credit balance', 1800], ['course', 'Demo course payment', 900], ['device', 'Demo device plan', 1200]].forEach(([key, title, amount], index) => addDue('debt', key, 160 - index * 20, title, { dueDaysFromToday: 18 + index * 25, metadata: { amount }, id: debtIds[index] }));
for (let index = 0; index < 10; index += 1) addDue('debt', `payment-${index}`, 140 - index * 12, 'Debt payment', { dueDaysFromToday: -120 + index * 12, complete: true, metadata: { recordKind: 'payment', debtId: debtIds[index % debtIds.length], amount: 75 + index * 25, note: 'Demo scheduled payment' } });
for (let index = 0; index < 15; index += 1) addDue('remittance', index, index * 8, `Demo remittance ${index + 1}`, { dueDaysFromToday: (index % 8) - 18, complete: index % 3 === 0, metadata: { amount: 45 + index * 15, recipient: `Demo recipient ${index + 1}`, sent: futureDate(-index * 8), state: ['To send', 'Sent', 'Received'][index % 3] } });
for (let index = 0; index < 20; index += 1) addDue('chores', index, index * 7, `Demo recurring chore ${index + 1}`, { dueDaysFromToday: (index % 12) - 8, complete: index % 4 === 0, metadata: { repeat: index % 2 ? 'Weekly' : 'Monthly', area: ['Kitchen', 'Laundry', 'Desk', 'Bike'][index % 4], recurrenceRootId: `demo-chore-${index % 4}`, recurrenceDayOfMonth: 1 + index % 28 } });
for (let index = 0; index < 12; index += 1) addDue('packages', index, index * 9, `Demo package ${index + 1}`, { dueDaysFromToday: (index % 9) - 3, complete: index % 4 === 0, metadata: { tracking: `DEMO${String(index + 1).padStart(6, '0')}`, carrier: ['Sample Post', 'Demo Courier', 'Example Express'][index % 3], trackingUrl: `https://example.com/track/${index + 1}`, status: ['Ordered', 'Shipped', 'Delivered'][index % 3] } });
for (let index = 0; index < 12; index += 1) addDue('warranties', index, 20 + index * 12, `Demo warranty ${index + 1}`, { dueDaysFromToday: 30 + index * 31, complete: index % 7 === 0, metadata: { store: ['Sample Store', 'Demo Supplier'][index % 2], receipt: `DEMO-RECEIPT-${index + 1}` } });
for (let index = 0; index < 10; index += 1) addDue('documents', index, 30 + index * 14, `Demo document ${index + 1}`, { dueDaysFromToday: (index % 4 === 0 ? -10 : 35) + index * 19, metadata: { documentType: ['Passport copy', 'Insurance', 'Permit'][index % 3], issuer: 'Demo issuer' } });
for (let index = 0; index < 12; index += 1) addDue('maintenance', index, index * 10, `Demo maintenance ${index + 1}`, { dueDaysFromToday: (index % 5) - 10, complete: index % 3 === 0, metadata: { asset: ['Demo bike', 'Demo vehicle'][index % 2], serviceType: ['Inspection', 'Oil change', 'Tire check'][index % 3] } });
for (let index = 0; index < 11; index += 1) addDue('courses', index, index * 12, `Demo course ${index + 1}`, { dueDaysFromToday: 7 + index * 16, complete: index % 4 === 0, metadata: { progress: (index * 9) % 101, provider: 'Demo learning provider', credential: `Demo credential ${index + 1}` } });

// Goals and settings give the Dashboard, Goals, and MCP tools useful current state.
addGoal('weight', 'Demo sustainable weight goal', 'weight', 70, 'kg', 120);
addGoal('savings', 'Demo emergency fund', 'savings', 3000, 'USD', 180);
addGoal('investments', 'Demo annual investing', 'investments', 6000, 'USD', 160);
addGoal('net-worth', 'Demo net-worth milestone', 'net-worth', 20000, 'USD', 365);
addGoal('water', 'Demo hydration habit', 'water', 2000, 'ml', 30, true);
addSettings('calories', { dailyTarget: 2100, deficitMode: true, maintenance: 2400, deficitTarget: 350 });
addSettings('water', { target: 2200, unit: 'ml' });
addSettings('weight', { unit: 'kg', goalWeight: 70, targetDate: futureDate(120) });
addSettings('budget', { monthlyLimit: 1600, currency: 'USD', rates: { USD: 1, JPY: 150, EUR: 0.92 }, categoryLimits: { Food: 420, Transport: 160, Bills: 450 } });
addSettings('steps', { target: 9000, unit: 'steps' });
addSettings('savings', { target: 3000, targetDate: futureDate(180), unit: 'USD' });
addSettings('time-tracking', { unit: 'min' });
addSettings('investments', { target: 6000, unit: 'USD' });

const datasets = [
  ['entry_records', entryRecords, 'id'], ['checklist_items', checklistItems, 'id'], ['streak_checkins', streakCheckins, 'id'],
  ['saved_items', savedItems, 'id'], ['due_items', dueItems, 'id'], ['goals', goals, 'id'],
  ['module_settings', moduleSettings, 'user_id,module_id'],
];

function streakUniqueKey(row) { return `${row.user_id}:${row.module_id}:${row.habit_key}:${row.completed_on}`; }
function assertGeneratedStreaksAreUnique() {
  const seen = new Set();
  for (const row of streakCheckins) {
    const key = streakUniqueKey(row);
    if (seen.has(key)) throw new Error(`Seed generator produced a duplicate streak key: ${key}`);
    seen.add(key);
  }
}

async function verifyUser() {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error(`Could not verify EVERYDAY_SEED_USER_ID: ${error?.message ?? 'user not found'}`);
}
async function reserveUnoccupiedStreakDates() {
  const existing = [];
  for (let offset = 0; ; offset += BATCH_SIZE) {
    const { data, error } = await supabase.from('streak_checkins').select('id,user_id,module_id,habit_key,completed_on,created_at').eq('user_id', userId).order('completed_on', { ascending: false }).range(offset, offset + BATCH_SIZE - 1);
    if (error) throw new Error(`Could not inspect existing streak history: ${error.message}`);
    existing.push(...(data ?? []));
    if ((data ?? []).length < BATCH_SIZE) break;
  }
  const existingById = new Map(existing.map((row) => [row.id, row]));
  const occupied = new Set(existing.map(streakUniqueKey));
  const existingSeedIds = new Set();
  let shifted = 0;
  for (const row of streakCheckins) {
    const existingSeedRow = existingById.get(row.id);
    // Keep a prior deterministic seed row at the date it already owns. This
    // avoids swapping unique keys during a later bulk upsert as "today" moves.
    if (existingSeedRow) {
      row.completed_on = existingSeedRow.completed_on;
      row.created_at = existingSeedRow.created_at ?? timestampForDate(existingSeedRow.completed_on, 20);
      existingSeedIds.add(row.id);
      continue;
    }
    let candidate = row.completed_on;
    while (occupied.has(streakUniqueKey({ ...row, completed_on: candidate }))) {
      candidate = previousDate(candidate);
      shifted += 1;
    }
    row.completed_on = candidate;
    row.created_at = timestampForDate(candidate, 20);
    occupied.add(streakUniqueKey(row));
  }
  if (shifted) console.log(`Shifted ${shifted} demo streak dates to avoid existing check-ins; no existing row was changed or deleted.`);
  return existingSeedIds;
}
async function upsertRows(table, rows, onConflict) {
  for (const batch of chunk(rows)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw new Error(`${table} batch failed: ${error.message}`);
  }
}
async function writeStreakRows(existingSeedIds) {
  const priorSeedRows = streakCheckins.filter((row) => existingSeedIds.has(row.id));
  const newRows = streakCheckins.filter((row) => !existingSeedIds.has(row.id));
  for (const batch of chunk(priorSeedRows)) {
    const { error } = await supabase.from('streak_checkins').upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`streak_checkins existing-row update failed: ${error.message}`);
  }
  for (const batch of chunk(newRows)) {
    const { error } = await supabase.from('streak_checkins').insert(batch);
    if (error) throw new Error(`streak_checkins new-row insert failed: ${error.message}`);
  }
}
async function verifyRows(table, rows) {
  if (table === 'module_settings') {
    const expected = new Set(rows.map((row) => row.module_id));
    const { data, error } = await supabase.from(table).select('module_id').eq('user_id', userId).in('module_id', [...expected]);
    if (error) throw error;
    return data?.length ?? 0;
  }
  let found = 0;
  for (const ids of chunk(rows.map((row) => row.id))) {
    const { data, error } = await supabase.from(table).select('id').eq('user_id', userId).in('id', ids);
    if (error) throw error;
    found += data?.length ?? 0;
  }
  return found;
}

const planned = Object.fromEntries(datasets.map(([table, rows]) => [table, rows.length]));
const total = Object.values(planned).reduce((sum, count) => sum + count, 0);
assertGeneratedStreaksAreUnique();
console.log(`Prepared ${total} deterministic ${SEED_VERSION} rows for user ${userId}.`);
console.table(planned);

if (!APPLY) {
  console.log('Dry run only. Add --apply to upsert this fictional demo data. Existing non-demo rows are never deleted.');
  process.exit(0);
}

await verifyUser();
const existingSeedStreakIds = await reserveUnoccupiedStreakDates();
assertGeneratedStreaksAreUnique();
for (const [table, rows, onConflict] of datasets) {
  if (table === 'streak_checkins') await writeStreakRows(existingSeedStreakIds);
  else await upsertRows(table, rows, onConflict);
  const found = await verifyRows(table, rows);
  if (found !== rows.length) throw new Error(`${table} verification failed: expected ${rows.length}, found ${found}.`);
  console.log(`Verified ${table}: ${found} rows.`);
}
console.log(`Seed completed: ${total} rows are present for the selected anonymous user. It is safe to run this exact command again.`);
