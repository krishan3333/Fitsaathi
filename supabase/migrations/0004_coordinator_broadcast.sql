-- Lets a coordinator publish a campus-wide announcement without needing a
-- direct insert policy on other students' notification rows.
create or replace function coordinator_broadcast_announcement(announcement_title text, announcement_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_coordinator() then
    raise exception 'Only coordinators can broadcast announcements';
  end if;

  insert into notifications (profile_id, title, body, type)
  select id, announcement_title, announcement_body, 'announcement'
  from profiles
  where role = 'student';
end;
$$;
