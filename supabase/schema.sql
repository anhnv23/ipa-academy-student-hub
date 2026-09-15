-- IPA Academy Student HUB — Supabase schema
create extension if not exists pgcrypto;
create type public.app_role as enum ('admin','teacher','student');
create type public.attendance_status as enum ('present','excused','unexcused');
create type public.workflow_status as enum ('draft','open','submitted','graded','approved','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'student',
  phone text, student_code text unique,
  created_at timestamptz not null default now()
);
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, name text not null, level text,
  start_date date, total_sessions int not null default 30,
  completed_sessions int not null default 0,
  start_time time, end_time time, weekdays int[] default '{}',
  teacher_id uuid references public.profiles(id),
  teacher_name text, assistant_id uuid references public.profiles(id),
  assistant_name text, room text, curriculum text, expected_outcomes text,
  schedule_text text, attendance_rate numeric(5,2) default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create table public.class_members (
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key(class_id,student_id)
);
create table public.class_weekly_rules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null, end_time time not null,
  unique(class_id,weekday)
);
create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  session_no int not null, session_date date not null,
  start_time time, end_time time, status text not null default 'scheduled',
  cancellation_reason text, makeup_for uuid references public.class_sessions(id),
  lesson_plan text, unique(class_id,session_no)
);
create table public.attendance (
  session_id uuid references public.class_sessions(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  status public.attendance_status not null,
  note text, marked_by uuid references public.profiles(id),
  marked_at timestamptz not null default now(),
  primary key(session_id,student_id)
);
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  title text not null, instructions text, due_at timestamptz,
  created_by uuid references public.profiles(id),
  status public.workflow_status not null default 'open',
  created_at timestamptz not null default now()
);
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  content text, file_url text, score numeric(5,2), teacher_comment text,
  status public.workflow_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  unique(assignment_id,student_id)
);
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  session_id uuid references public.class_sessions(id) on delete cascade,
  reason text not null, note text,
  status public.workflow_status not null default 'submitted',
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.class_weekly_rules enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.leave_requests enable row level security;

create policy profiles_read on public.profiles for select using (
 id=auth.uid() or public.current_role()='admin' or
 (public.current_role()='teacher' and exists(select 1 from public.class_members cm join public.classes c on c.id=cm.class_id where cm.student_id=profiles.id and c.teacher_id=auth.uid()))
);
create policy profiles_admin on public.profiles for all using(public.current_role()='admin') with check(public.current_role()='admin');
create policy classes_read on public.classes for select using (
 public.current_role()='admin' or teacher_id=auth.uid() or assistant_id=auth.uid() or
 exists(select 1 from public.class_members cm where cm.class_id=classes.id and cm.student_id=auth.uid())
);
create policy classes_admin_write on public.classes for all using(public.current_role()='admin') with check(public.current_role()='admin');
create policy classes_teacher_update on public.classes for update using(teacher_id=auth.uid()) with check(teacher_id=auth.uid());
create policy members_read on public.class_members for select using (
 student_id=auth.uid() or public.current_role()='admin' or
 exists(select 1 from public.classes c where c.id=class_members.class_id and (c.teacher_id=auth.uid() or c.assistant_id=auth.uid()))
);
create policy members_admin on public.class_members for all using(public.current_role()='admin') with check(public.current_role()='admin');
create policy weekly_rules_read on public.class_weekly_rules for select using (
 public.current_role()='admin' or exists(select 1 from public.classes c where c.id=class_weekly_rules.class_id and (c.teacher_id=auth.uid() or c.assistant_id=auth.uid())) or
 exists(select 1 from public.class_members cm where cm.class_id=class_weekly_rules.class_id and cm.student_id=auth.uid())
);
create policy weekly_rules_staff_write on public.class_weekly_rules for all using (
 public.current_role()='admin' or exists(select 1 from public.classes c where c.id=class_weekly_rules.class_id and c.teacher_id=auth.uid())
) with check(public.current_role()='admin' or exists(select 1 from public.classes c where c.id=class_weekly_rules.class_id and c.teacher_id=auth.uid()));
create policy sessions_read on public.class_sessions for select using (
 public.current_role()='admin' or exists(select 1 from public.classes c where c.id=class_sessions.class_id and (c.teacher_id=auth.uid() or c.assistant_id=auth.uid())) or
 exists(select 1 from public.class_members cm where cm.class_id=class_sessions.class_id and cm.student_id=auth.uid())
);
create policy sessions_staff_write on public.class_sessions for all using (
 public.current_role()='admin' or exists(select 1 from public.classes c where c.id=class_sessions.class_id and c.teacher_id=auth.uid())
) with check(public.current_role()='admin' or exists(select 1 from public.classes c where c.id=class_sessions.class_id and c.teacher_id=auth.uid()));
create policy attendance_read on public.attendance for select using (
 student_id=auth.uid() or public.current_role()='admin' or exists(select 1 from public.class_sessions s join public.classes c on c.id=s.class_id where s.id=attendance.session_id and c.teacher_id=auth.uid())
);
create policy attendance_staff_write on public.attendance for all using (
 public.current_role()='admin' or exists(select 1 from public.class_sessions s join public.classes c on c.id=s.class_id where s.id=attendance.session_id and c.teacher_id=auth.uid())
) with check(public.current_role()='admin' or exists(select 1 from public.class_sessions s join public.classes c on c.id=s.class_id where s.id=attendance.session_id and c.teacher_id=auth.uid()));
create policy assignments_read on public.assignments for select using (
 public.current_role()='admin' or created_by=auth.uid() or exists(select 1 from public.class_members cm where cm.class_id=assignments.class_id and cm.student_id=auth.uid())
);
create policy assignments_staff_write on public.assignments for all using(public.current_role() in ('admin','teacher')) with check(public.current_role() in ('admin','teacher'));
create policy submissions_read on public.submissions for select using (
 student_id=auth.uid() or public.current_role()='admin' or exists(select 1 from public.assignments a join public.classes c on c.id=a.class_id where a.id=submissions.assignment_id and c.teacher_id=auth.uid())
);
create policy submissions_student_insert on public.submissions for insert with check(student_id=auth.uid());
create policy submissions_owner_update on public.submissions for update using(student_id=auth.uid() or public.current_role() in ('admin','teacher'));
create policy leaves_read on public.leave_requests for select using (
 student_id=auth.uid() or public.current_role()='admin' or exists(select 1 from public.class_sessions s join public.classes c on c.id=s.class_id where s.id=leave_requests.session_id and c.teacher_id=auth.uid())
);
create policy leaves_student_insert on public.leave_requests for insert with check(student_id=auth.uid());
create policy leaves_staff_update on public.leave_requests for update using(public.current_role() in ('admin','teacher'));

create index idx_class_members_student on public.class_members(student_id);
create index idx_sessions_class_date on public.class_sessions(class_id,session_date);
create index idx_assignments_class_due on public.assignments(class_id,due_at);
create index idx_submissions_student on public.submissions(student_id);
create index idx_leave_student on public.leave_requests(student_id);

insert into storage.buckets(id,name,public) values('homework','homework',false)
on conflict(id) do nothing;
create policy homework_read on storage.objects for select using (
 bucket_id='homework' and auth.role()='authenticated'
);
create policy homework_upload on storage.objects for insert with check (
 bucket_id='homework' and auth.uid()::text=(storage.foldername(name))[1]
);
