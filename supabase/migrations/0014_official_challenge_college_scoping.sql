-- Official challenges had no college field at all, so challenges_select_eligible's
-- `is_official` clause made every official challenge from every campus visible
-- to every student everywhere. Scope it the same way campus_locations was
-- scoped in migration 0006.

alter table challenges add column college text;
update challenges set college = 'Delhi College of Engineering' where is_official and college is null;

drop policy "challenges_select_eligible" on challenges;
create policy "challenges_select_eligible" on challenges for select to authenticated
  using (
    (is_official and college = (select college from profiles where id = auth.uid()))
    or (circle_id is not null and is_circle_member(circle_id))
  );

drop policy "challenges_insert_member" on challenges;
create policy "challenges_insert_member" on challenges for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (circle_id is null and is_coordinator() and college = (select college from profiles where id = auth.uid()))
      or is_circle_member(circle_id)
    )
  );
