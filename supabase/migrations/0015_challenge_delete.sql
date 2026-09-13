-- Challenges had no delete policy at all — once created, a stale/abandoned
-- circle challenge sat in the Challenges list forever with no way to remove
-- it, even after everyone left. Let the creator delete their own challenge;
-- challenge_participants rows cascade automatically (0001_init.sql).

create policy "challenges_delete_creator" on challenges for delete to authenticated
  using (created_by = auth.uid());
