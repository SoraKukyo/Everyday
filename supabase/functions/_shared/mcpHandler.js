import { catalogById, moduleCatalog, tableByEngine } from './moduleCatalog.js';

export const MCP_INSTRUCTIONS = "Everyday provides read-only access to a user's personal daily-life tracking data: nutrition, money, habits, lists, saved references, and reminders. Use these tools to answer questions about patterns, trends, current status, and next actions. Treat returned data as the sole source of truth; never assume missing data means zero or completion. This server cannot create, edit, delete, or modify any record.";

const MAX_SCAN = 5000;
const READ_ONLY_ANNOTATION = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const tools = [
  ['list_active_modules', 'List every Everyday module and whether it has data for this user.', { include_empty: { type: 'boolean', description: 'Include configured modules with no records. Defaults to true.' } }],
  ['get_weekly_summary', 'Get a cross-module summary for a calendar week. Budget is net income minus expenses; Weight and Net Worth use the latest snapshot.', { week_start: { type: 'string', description: 'Monday in YYYY-MM-DD form. Defaults to the current week.' }, timezone: { type: 'string', description: 'IANA timezone, such as Asia/Bangkok. Defaults to UTC.' } }],
  ['get_module_history', 'Get date-ordered, paginated history for one module.', { module_id: { type: 'string', description: 'Everyday module id, for example calories or budget.' }, start_date: { type: 'string', description: 'Inclusive YYYY-MM-DD date.' }, end_date: { type: 'string', description: 'Inclusive YYYY-MM-DD date.' }, include_archived: { type: 'boolean', description: 'Include archived checklist, saved, and due records. Defaults to false.' }, limit: { type: 'integer', minimum: 1, maximum: 500, description: 'Records per page. Defaults to 100.' }, cursor: { type: 'string', description: 'Opaque date cursor returned by the prior response.' } }, ['module_id']],
  ['get_current_streaks', 'Get current and best streaks for StreakTracker modules.', { module_ids: { type: 'array', items: { type: 'string' }, description: 'Optional list of streak module ids.' }, timezone: { type: 'string', description: 'IANA timezone. Defaults to UTC.' } }],
  ['get_upcoming_due_items', 'Get upcoming and overdue DueDateTracker items.', { from_date: { type: 'string', description: 'YYYY-MM-DD starting date. Defaults to today.' }, days: { type: 'integer', minimum: 1, maximum: 90, description: 'Days to look ahead. Defaults to 14.' }, module_ids: { type: 'array', items: { type: 'string' }, description: 'Optional due-module ids.' }, include_completed: { type: 'boolean', description: 'Include completed items. Defaults to false.' } }],
  ['get_goal_progress', 'Get the user’s saved goals with calculated progress and the calculation method.', { include_completed: { type: 'boolean', description: 'Include completed goals. Defaults to false.' } }],
].map(([name, description, properties, required = []]) => ({ name, title: name.replaceAll('_', ' '), description, inputSchema: { type: 'object', properties, required, additionalProperties: false }, annotations: READ_ONLY_ANNOTATION }));

const rpcError = (id, code, message, data) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } });
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const dateKey = (date) => date.toISOString().slice(0, 10);
const asNumber = (value) => Number(value ?? 0);
const active = (row) => !row.is_complete && !row.archived_at && !row.metadata?.archived_at;
const isArchived = (row) => Boolean(row.archived_at || row.metadata?.archived_at);
const asText = (value) => Array.isArray(value) ? value.join(', ') : String(value);
const labelize = (key) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());

function timezoneOrThrow(timezone = 'UTC') {
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(); return timezone; } catch { throw new Error(`Invalid timezone: ${timezone}`); }
}

function calendarToday(timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function mondayFor(date) {
  const value = new Date(`${date}T12:00:00Z`); const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return dateKey(value);
}

function addDays(date, amount) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + amount); return dateKey(value); }
function validDate(value, name) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') || Number.isNaN(new Date(`${value}T12:00:00Z`).valueOf())) throw new Error(`${name} must be YYYY-MM-DD.`); return value; }

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function friendlyDetails(data = {}) {
  return Object.entries(data).filter(([, value]) => value !== null && value !== undefined && value !== '').filter(([key]) => !['archived_at', 'favorite', 'recordKind', 'debtId'].includes(key)).map(([key, value]) => ({ label: labelize(key), value: asText(value) }));
}

function currentStreak(rows, today) {
  const dates = new Set(rows.map((row) => row.completed_on)); let count = 0; let cursor = today;
  while (dates.has(cursor) && count < 730) { count += 1; cursor = addDays(cursor, -1); }
  return count;
}

function bestStreak(rows) {
  const dates = [...new Set(rows.map((row) => row.completed_on))].sort(); let best = 0; let run = 0; let previous = null;
  for (const item of dates) { run = previous && addDays(previous, 1) === item ? run + 1 : 1; best = Math.max(best, run); previous = item; }
  return best;
}

function entryValue(module, rows) {
  const usable = rows.filter((row) => !row.metadata?.archived_at);
  if (module.id === 'budget') {
    const income = usable.filter((row) => row.metadata?.transactionType === 'income').reduce((sum, row) => sum + asNumber(row.value), 0);
    const expenses = usable.filter((row) => row.metadata?.transactionType !== 'income').reduce((sum, row) => sum + asNumber(row.value), 0);
    return { value: income - expenses, calculation: 'income_minus_expenses', income, expenses };
  }
  if (module.id === 'weight' || module.id === 'net-worth') {
    const latest = [...usable].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))[0];
    return { value: latest ? asNumber(latest.value) : 0, calculation: 'latest_snapshot', latest_date: latest?.occurred_at ?? null };
  }
  if (module.id === 'savings') return { value: usable.reduce((sum, row) => sum + (row.metadata?.kind === 'withdrawal' ? -asNumber(row.value) : asNumber(row.value)), 0), calculation: 'deposits_minus_withdrawals' };
  if (module.id === 'investments') return { value: usable.filter((row) => row.metadata?.kind !== 'portfolio_snapshot').reduce((sum, row) => sum + asNumber(row.value), 0), calculation: 'contributions_excluding_snapshots' };
  if (module.id === 'calories') return { value: usable.filter((row) => !['calorie_burn', 'day_skip'].includes(row.metadata?.kind)).reduce((sum, row) => sum + asNumber(row.value), 0), calculation: 'intake_sum_excluding_burn_and_skips' };
  return { value: usable.reduce((sum, row) => sum + asNumber(row.value), 0), calculation: 'sum' };
}

function goalBaseline(module, rows) {
  if (module.goalProgress?.baseline !== 'first_record') return 0;
  const first = rows.filter((row) => !row.metadata?.archived_at).sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))[0];
  return first ? asNumber(first.value) : null;
}

function goalProgressPercent({ current, target, baseline, direction }) {
  if (baseline === null || baseline === undefined) return 0;
  const reached = direction === 'decrease' ? current <= target : current >= target;
  const span = direction === 'decrease' ? baseline - target : target - baseline;
  if (!Number.isFinite(current) || !Number.isFinite(target) || !Number.isFinite(baseline)) return 0;
  if (span <= 0) return reached ? 100 : 0;
  const traveled = direction === 'decrease' ? baseline - current : current - baseline;
  return Math.max(0, Math.min(100, traveled / span * 100));
}

function normalizeHistory(module, row) {
  const metadata = row.metadata ?? {}; const fields = row.fields ?? {}; const base = { id: row.id, module: { id: module.id, title: module.title }, created_at: row.created_at ?? null };
  if (module.engine === 'entryTracker') return { ...base, date: row.occurred_at, value: asNumber(row.value), unit: module.unit, note: row.note ?? null, details: friendlyDetails({ ...fields, ...metadata }) };
  if (module.engine === 'streakTracker') return { ...base, date: row.completed_on, note: row.note ?? null, details: friendlyDetails(fields) };
  if (module.engine === 'checklist') return { ...base, title: row.title, completed: Boolean(row.is_complete), completed_at: row.completed_at ?? null, archived: Boolean(row.archived_at), archived_at: row.archived_at ?? null, details: friendlyDetails(fields) };
  if (module.engine === 'savedItems') return { ...base, title: row.title, content: row.content ?? null, tags: row.tags ?? [], archived: isArchived(row), details: friendlyDetails(metadata) };
  return { ...base, title: row.title, due_date: row.due_at ?? null, completed: Boolean(row.is_complete), completed_at: row.completed_at ?? null, archived: isArchived(row), details: friendlyDetails(metadata) };
}

function rowsByModule(rows, id) { return rows.filter((row) => row.module_id === id); }
function inRange(iso, start, end) { const key = String(iso ?? '').slice(0, 10); return key >= start && key < end; }

async function allData(repository, userId) {
  const tables = ['entry_records', 'checklist_items', 'streak_checkins', 'saved_items', 'due_items', 'goals'];
  const values = await Promise.all(tables.map((table) => repository.readAll(table, userId, MAX_SCAN)));
  return Object.fromEntries(tables.map((table, index) => [table, values[index] ?? []]));
}

async function listModules(repository, userId, args) {
  const data = await allData(repository, userId); const idsWithData = new Set(Object.values(data).flat().map((row) => row.module_id).filter(Boolean));
  const result = moduleCatalog.filter((module) => args.include_empty !== false || idsWithData.has(module.id)).map((module) => ({ id: module.id, title: module.title, engine: module.engine, unit: module.unit, aggregation: module.aggregation, has_data: idsWithData.has(module.id) }));
  return { modules: result, configured_module_count: moduleCatalog.length };
}

async function weeklySummary(repository, userId, args) {
  const timezone = timezoneOrThrow(args.timezone); const start = args.week_start ? validDate(args.week_start, 'week_start') : mondayFor(calendarToday(timezone));
  if (mondayFor(start) !== start) throw new Error('week_start must be a Monday.');
  const end = addDays(start, 7); const today = calendarToday(timezone); const data = await allData(repository, userId);
  const summaries = moduleCatalog.map((module) => {
    const rows = rowsByModule(data[tableByEngine[module.engine]], module.id);
    if (module.engine === 'entryTracker') {
      const weekRows = rows.filter((row) => inRange(row.occurred_at, start, end)); const metric = entryValue(module, weekRows);
      const extra = module.id === 'calories' ? { calories_burned: weekRows.filter((row) => row.metadata?.kind === 'calorie_burn').reduce((sum, row) => sum + asNumber(row.value), 0) } : {};
      return { module: { id: module.id, title: module.title }, unit: module.unit, records_in_week: weekRows.length, ...metric, ...extra };
    }
    if (module.engine === 'checklist') return { module: { id: module.id, title: module.title }, items_created_in_week: rows.filter((row) => inRange(row.created_at, start, end)).length, items_completed_in_week: rows.filter((row) => inRange(row.completed_at, start, end)).length, open_now: rows.filter(active).length };
    if (module.engine === 'streakTracker') { const weekRows = rows.filter((row) => inRange(row.completed_on, start, end)); return { module: { id: module.id, title: module.title }, check_ins_in_week: weekRows.length, current_streak_days: currentStreak(rows, today) }; }
    if (module.engine === 'savedItems') return { module: { id: module.id, title: module.title }, saved_in_week: rows.filter((row) => inRange(row.created_at, start, end)).length, available_now: rows.filter((row) => !isArchived(row)).length };
    return { module: { id: module.id, title: module.title }, created_in_week: rows.filter((row) => inRange(row.created_at, start, end)).length, completed_in_week: rows.filter((row) => inRange(row.completed_at, start, end)).length, open_now: rows.filter(active).length, overdue_now: rows.filter((row) => active(row) && row.due_at && row.due_at < today).length };
  });
  return { week: { start_date: start, end_date_exclusive: end, timezone }, summaries };
}

async function moduleHistory(repository, userId, args) {
  const module = catalogById[args.module_id]; if (!module) throw new Error(`Unknown module_id: ${args.module_id}`);
  const start = args.start_date ? validDate(args.start_date, 'start_date') : null; const end = args.end_date ? addDays(validDate(args.end_date, 'end_date'), 1) : null;
  const limit = Math.min(500, Math.max(1, Number(args.limit ?? 100))); const dateField = module.engine === 'entryTracker' ? 'occurred_at' : module.engine === 'streakTracker' ? 'completed_on' : 'created_at';
  let rows = rowsByModule(await repository.readAll(tableByEngine[module.engine], userId, MAX_SCAN), module.id);
  rows = rows.filter((row) => (args.include_archived ? true : !isArchived(row))).filter((row) => !start || String(row[dateField] ?? '').slice(0, 10) >= start).filter((row) => !end || String(row[dateField] ?? '').slice(0, 10) < end).filter((row) => !args.cursor || String(row[dateField] ?? '') < args.cursor).sort((a, b) => String(b[dateField] ?? '').localeCompare(String(a[dateField] ?? '')));
  const page = rows.slice(0, limit); return { module: { id: module.id, title: module.title, engine: module.engine, unit: module.unit }, records: page.map((row) => normalizeHistory(module, row)), next_cursor: rows.length > limit ? page.at(-1)?.[dateField] ?? null : null, returned: page.length, limit };
}

async function streaks(repository, userId, args) {
  const timezone = timezoneOrThrow(args.timezone); const today = calendarToday(timezone); const requested = args.module_ids ?? moduleCatalog.filter((module) => module.engine === 'streakTracker').map((module) => module.id); const rows = await repository.readAll('streak_checkins', userId, MAX_SCAN);
  const result = requested.map((id) => catalogById[id]).filter((module) => module?.engine === 'streakTracker').map((module) => {
    const moduleRows = rowsByModule(rows, module.id); const groups = module.id === 'habits' ? Object.entries(moduleRows.reduce((all, row) => { const name = row.habit_key || row.fields?.habit || 'Default'; (all[name] ??= []).push(row); return all; }, {})).map(([name, rowsForHabit]) => ({ name, current_streak_days: currentStreak(rowsForHabit, today), best_streak_days: bestStreak(rowsForHabit), checked_in_today: rowsForHabit.some((row) => row.completed_on === today), last_check_in: [...rowsForHabit].sort((a, b) => String(b.completed_on).localeCompare(String(a.completed_on)))[0]?.completed_on ?? null, recent_dates: [...new Set(rowsForHabit.map((row) => row.completed_on))].sort().slice(-28) })) : [{ name: module.title, current_streak_days: currentStreak(moduleRows, today), best_streak_days: bestStreak(moduleRows), checked_in_today: moduleRows.some((row) => row.completed_on === today), last_check_in: [...moduleRows].sort((a, b) => String(b.completed_on).localeCompare(String(a.completed_on)))[0]?.completed_on ?? null, recent_dates: [...new Set(moduleRows.map((row) => row.completed_on))].sort().slice(-28) }];
    return { module: { id: module.id, title: module.title }, streaks: groups };
  });
  return { timezone, as_of_date: today, modules: result };
}

async function upcomingDue(repository, userId, args) {
  const timezone = timezoneOrThrow('UTC'); const from = args.from_date ? validDate(args.from_date, 'from_date') : calendarToday(timezone); const days = Math.min(90, Math.max(1, Number(args.days ?? 14))); const through = addDays(from, days); const allowed = new Set(args.module_ids ?? moduleCatalog.filter((module) => module.engine === 'dueDateTracker').map((module) => module.id)); const rows = (await repository.readAll('due_items', userId, MAX_SCAN)).filter((row) => allowed.has(row.module_id)).filter((row) => args.include_completed || !row.is_complete).filter((row) => !isArchived(row)).filter((row) => row.due_at).sort((a, b) => String(a.due_at).localeCompare(String(b.due_at)));
  const convert = (row) => ({ id: row.id, module: { id: row.module_id, title: catalogById[row.module_id]?.title ?? row.module_id }, title: row.title, due_date: row.due_at, status: row.is_complete ? 'completed' : row.due_at < from ? 'overdue' : 'upcoming', days_until_due: Math.floor((new Date(`${row.due_at}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000), completed_at: row.completed_at ?? null, details: friendlyDetails(row.metadata) });
  return { from_date: from, through_date: through, overdue: rows.filter((row) => !row.is_complete && row.due_at < from).map(convert), upcoming: rows.filter((row) => row.due_at >= from && row.due_at <= through).map(convert) };
}

async function goalProgress(repository, userId, args) {
  const [goals, entries] = await Promise.all([repository.readAll('goals', userId, MAX_SCAN), repository.readAll('entry_records', userId, MAX_SCAN)]);
  return { goals: goals.filter((goal) => args.include_completed || !goal.is_complete).map((goal) => { const module = catalogById[goal.target_module_id]; const rows = module ? rowsByModule(entries, module.id) : []; const metric = module ? entryValue(module, rows) : { value: 0, calculation: 'unsupported_module' }; const target = asNumber(goal.target_value); const direction = module?.goalProgress?.direction ?? 'increase'; const baseline = module ? goalBaseline(module, rows) : 0; return { id: goal.id, title: goal.title, module: module ? { id: module.id, title: module.title, unit: module.unit } : { id: goal.target_module_id, title: 'Unknown module' }, current_value: metric.value, starting_value: baseline, target_value: target, direction, progress_percent: target ? goalProgressPercent({ current: metric.value, target, baseline, direction }) : 0, target_date: goal.due_at ?? null, completed: Boolean(goal.is_complete), calculation: `${metric.calculation}_from_${module?.goalProgress?.baseline ?? 'zero'}_${direction}` }; }) };
}

async function callTool(repository, userId, name, args) {
  if (name === 'list_active_modules') return listModules(repository, userId, args);
  if (name === 'get_weekly_summary') return weeklySummary(repository, userId, args);
  if (name === 'get_module_history') return moduleHistory(repository, userId, args);
  if (name === 'get_current_streaks') return streaks(repository, userId, args);
  if (name === 'get_upcoming_due_items') return upcomingDue(repository, userId, args);
  if (name === 'get_goal_progress') return goalProgress(repository, userId, args);
  throw new Error(`Unknown tool: ${name}`);
}

export async function authenticateMcpRequest({ request, repository }) {
  const origin = request.headers.get('origin'); const allowedOrigins = repository.allowedOrigins ?? [];
  if (origin && !allowedOrigins.includes(origin)) return { error: { status: 403, body: rpcError(null, -32003, 'Origin is not allowed.') } };
  const authorization = request.headers.get('authorization') ?? ''; const match = authorization.match(/^Bearer\s+(.+)$/i);
  // Header credentials take precedence. URL tokens are a compatibility fallback for
  // MCP connector UIs that offer only a no-auth URL field; never use a query token
  // to override a supplied (possibly invalid) Authorization header.
  const accessToken = match ? match[1] : new URL(request.url).searchParams.get('token');
  if (!accessToken) return { error: { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="Everyday MCP"' }, body: rpcError(null, -32001, 'Bearer token or token query parameter is required.') } };
  const userId = await repository.findUserIdByTokenHash(await sha256Hex(accessToken));
  if (!userId) return { error: { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="Everyday MCP", error="invalid_token"' }, body: rpcError(null, -32001, 'Invalid or revoked access token.') } };
  return { userId };
}

export async function handleMcpRequest({ request, repository }) {
  const authentication = await authenticateMcpRequest({ request, repository });
  if (authentication.error) return authentication.error;
  const { userId } = authentication;
  let message;
  try { message = await request.json(); } catch { return { status: 400, body: rpcError(null, -32700, 'Invalid JSON.') }; }
  if (message?.jsonrpc !== '2.0' || !message.method) return { status: 400, body: rpcError(message?.id, -32600, 'Invalid JSON-RPC request.') };
  if (message.method === 'notifications/initialized') return { status: 202, body: null };
  if (message.method === 'initialize') return { status: 200, body: rpcResult(message.id, { protocolVersion: '2025-03-26', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'everyday-mcp', version: '1.0.0' }, instructions: MCP_INSTRUCTIONS }) };
  if (message.method === 'tools/list') return { status: 200, body: rpcResult(message.id, { tools }) };
  if (message.method === 'tools/call') {
    try { const args = message.params?.arguments ?? {}; const output = await callTool(repository, userId, message.params?.name, args); const structuredContent = { as_of: new Date().toISOString(), timezone: args.timezone ?? output.timezone ?? 'UTC', ...output }; return { status: 200, body: rpcResult(message.id, { content: [{ type: 'text', text: JSON.stringify(structuredContent) }], structuredContent }) }; }
    catch (error) { return { status: 200, body: rpcResult(message.id, { content: [{ type: 'text', text: error.message }], isError: true }) }; }
  }
  return { status: 404, body: rpcError(message.id, -32601, `Method not found: ${message.method}`) };
}

export const __testables = { entryValue, currentStreak, bestStreak, normalizeHistory, sha256Hex };
