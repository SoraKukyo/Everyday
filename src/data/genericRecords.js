import { supabase } from './supabaseClient';

export async function listRecords(table, userId, moduleId) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).eq('module_id', moduleId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addRecord(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateRecord(table, id, patch) {
  const { error } = await supabase.from(table).update(patch).eq('id', id);
  if (error) throw error;
}

export async function removeRecord(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}
