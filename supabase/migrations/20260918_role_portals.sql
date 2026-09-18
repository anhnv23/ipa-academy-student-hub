-- IPA Student HUB v1.3.0: teacher/student portals, tuition and rich homework
alter table public.assignments add column if not exists content_type text not null default 'text';
alter table public.assignments add column if not exists resource_link text;
alter table public.assignments add column if not exists media_urls text[] not null default '{}';
alter table public.submissions add column if not exists content_type text not null default 'text';
alter table public.submissions add column if not exists submission_link text;
alter table public.submissions add column if not exists media_urls text[] not null default '{}';

create table if not exists public.assignment_targets (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

create table if not exists public.tuition_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  amount numeric(14,2) not null default 0,
  due_date date,
  paid_amount numeric(14,2) not null default 0,
  paid_at timestamptz,
  status text not null default 'pending' check(status in ('pending','partial','paid','overdue')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_reminders (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.assignment_targets enable row level security;
alter table public.tuition_records enable row level security;
alter table public.teacher_reminders enable row level security;

create policy assignment_targets_read on public.assignment_targets for select using (
  student_id=auth.uid() or public.current_role()='admin' or
  exists(select 1 from public.assignments a join public.classes c on c.id=a.class_id where a.id=assignment_targets.assignment_id and c.teacher_id=auth.uid())
);
create policy assignment_targets_staff on public.assignment_targets for all using (
  public.current_role()='admin' or exists(select 1 from public.assignments a join public.classes c on c.id=a.class_id where a.id=assignment_targets.assignment_id and c.teacher_id=auth.uid())
) with check (
  public.current_role()='admin' or exists(select 1 from public.assignments a join public.classes c on c.id=a.class_id where a.id=assignment_targets.assignment_id and c.teacher_id=auth.uid())
);
create policy tuition_admin_write on public.tuition_records for all using(public.current_role()='admin') with check(public.current_role()='admin');
create policy tuition_owner_read on public.tuition_records for select using(student_id=auth.uid() or public.current_role()='admin');
create policy reminders_read on public.teacher_reminders for select using(student_id=auth.uid() or teacher_id=auth.uid() or public.current_role()='admin');
create policy reminders_teacher_write on public.teacher_reminders for all using(teacher_id=auth.uid() or public.current_role()='admin') with check(teacher_id=auth.uid() or public.current_role()='admin');

create index if not exists idx_assignment_targets_student on public.assignment_targets(student_id);
create index if not exists idx_tuition_student on public.tuition_records(student_id);
create index if not exists idx_reminders_student on public.teacher_reminders(student_id);

insert into storage.buckets(id,name,public) values('assignment-media','assignment-media',false)
on conflict(id) do nothing;
create policy assignment_media_read on storage.objects for select using(bucket_id='assignment-media' and auth.role()='authenticated');
create policy assignment_media_upload on storage.objects for insert with check(bucket_id='assignment-media' and auth.role()='authenticated');
