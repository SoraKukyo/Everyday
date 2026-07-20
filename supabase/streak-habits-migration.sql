-- Allows the generic Habit tracker to record more than one named habit per day.
alter table public.streak_checkins add column if not exists habit_key text not null default 'default';
alter table public.streak_checkins drop constraint if exists streak_checkins_user_id_module_id_completed_on_key;
alter table public.streak_checkins drop constraint if exists streak_checkins_user_id_module_id_habit_key_completed_on_key;
alter table public.streak_checkins add constraint streak_checkins_user_id_module_id_habit_key_completed_on_key unique (user_id, module_id, habit_key, completed_on);
