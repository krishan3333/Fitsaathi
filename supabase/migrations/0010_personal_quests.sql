-- Personal, AI-generated quests live alongside the shared hand-written
-- catalogue in the same table — a generated quest is just a normal `quests`
-- row, so every existing mechanism (recommendQuests, quest_completions,
-- streak/badge triggers) keeps working on it unmodified.
--
-- profile_id null  = shared catalogue (today's 16 seeded rows, visible to everyone)
-- profile_id set   = personal, visible only to that one student

alter table quests add column profile_id uuid references profiles(id) on delete cascade;

drop policy "quests_select_all" on quests;
create policy "quests_select_all" on quests for select to authenticated
  using (profile_id is null or profile_id = auth.uid());

-- A student may only ever insert a quest tagged as their own — never into the
-- shared catalogue (profile_id null) and never tagged as someone else.
create policy "quests_insert_own_generated" on quests for insert to authenticated
  with check (profile_id = auth.uid());
