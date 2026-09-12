-- The quest catalogue was one global list written entirely from a campus
-- student's perspective ("before your 2 PM class", "Hostel Workout Zone").
-- A "personal" account (no college) got served the exact same content,
-- which makes no sense for them. Tag each quest by who it's actually for.

alter table quests add column audience text not null
  check (audience in ('student', 'personal', 'any')) default 'any';

-- The existing 8 campus quests are all student-specific (named venues,
-- timetable references).
update quests set audience = 'student';
