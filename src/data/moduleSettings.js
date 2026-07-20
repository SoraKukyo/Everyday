import { supabase } from './supabaseClient';

export async function getModuleSettings(userId, moduleId) {
  const { data, error } = await supabase.from('module_settings').select('settings').eq('user_id', userId).eq('module_id', moduleId).maybeSingle();
  if (error) throw error;
  return data?.settings ?? {};
}

export async function saveModuleSettings(userId, moduleId, settings) {
  const { error } = await supabase.from('module_settings').upsert({ user_id: userId, module_id: moduleId, settings }, { onConflict: 'user_id,module_id' });
  if (error) throw error;
}
