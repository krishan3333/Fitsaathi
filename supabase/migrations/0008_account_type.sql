-- Lets non-students use FitSaathi without a college/department, via an
-- account_type toggle. Coordinators always stay college-affiliated since the
-- coordinator RPCs (0007) and campus_locations scoping (0006) depend on it.

alter table profiles add column account_type text not null
  check (account_type in ('student', 'personal')) default 'student';

alter table profiles alter column college drop not null;
alter table profiles alter column college drop default;
alter table profiles alter column department drop not null;
alter table profiles alter column department drop default;

update profiles set college = nullif(college, ''), department = nullif(department, '');

alter table profiles add constraint coordinator_requires_student_account
  check (role <> 'coordinator' or account_type = 'student');
