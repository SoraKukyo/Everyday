import { supabase } from './supabaseClient';

export async function listEntryRecords(userId, moduleId, from, to) {
  const { data, error } = await supabase
    .from('entry_records')
    .select('*')
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .gte('occurred_at', from.toISOString())
    .lt('occurred_at', to.toISOString())
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Supabase pages results by default. Walk stable, bounded pages so an all-time
// history does not silently omit older private records.
export async function listAllEntryRecords(userId, moduleId, pageSize = 500) {
  const records = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('entry_records').select('*').eq('user_id', userId).eq('module_id', moduleId).order('occurred_at', { ascending: false }).range(offset, offset + pageSize - 1);
    if (error) throw error;
    records.push(...data);
    if (data.length < pageSize) return records;
  }
}

export async function createEntryRecord({ userId, moduleId, value, occurredAt = new Date(), fields = {}, metadata = {}, note = null }) {
  const { data, error } = await supabase
    .from('entry_records')
    .insert({ user_id: userId, module_id: moduleId, value, occurred_at: occurredAt.toISOString(), fields, metadata, note })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntryRecord(id) {
  const { error } = await supabase.from('entry_records').delete().eq('id', id);
  if (error) throw error;
}

export async function updateEntryRecord(id, patch) {
  const { occurredAt, ...rest } = patch;
  const normalizedPatch = occurredAt ? { ...rest, occurred_at: occurredAt.toISOString() } : rest;
  const { data, error } = await supabase.from('entry_records').update(normalizedPatch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
