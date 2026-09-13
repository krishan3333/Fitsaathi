-- fit_circles had no delete policy — a Fit Circle could never be removed once
-- created, even by its own creator. Let the creator delete their circle;
-- circle_members and challenges rows cascade automatically (0001_init.sql).

create policy "circles_delete_creator" on fit_circles for delete to authenticated
  using (created_by = auth.uid());
