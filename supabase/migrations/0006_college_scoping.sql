-- Different students have different colleges, but campus_locations was one
-- global list — everyone saw whichever campus got seeded first. Scope it.

alter table campus_locations add column college text;
update campus_locations set college = 'Delhi College of Engineering' where college is null;
alter table campus_locations alter column college set not null;

create index on campus_locations (college);

-- A coordinator may only add/edit locations for their own college — not just
-- "any coordinator, any campus" as the old policy allowed.
drop policy if exists "locations_write_coordinator" on campus_locations;
drop policy if exists "locations_update_coordinator" on campus_locations;

create policy "locations_write_coordinator" on campus_locations for insert to authenticated
  with check (is_coordinator() and college = (select college from profiles where id = auth.uid()));

create policy "locations_update_coordinator" on campus_locations for update to authenticated
  using (is_coordinator() and college = (select college from profiles where id = auth.uid()));
