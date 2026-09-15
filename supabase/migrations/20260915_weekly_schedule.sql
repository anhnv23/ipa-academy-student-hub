-- Run this migration only when upgrading an existing IPA database.
create table if not exists public.class_weekly_rules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null, end_time time not null,
  unique(class_id,weekday)
);
alter table public.class_weekly_rules enable row level security;
drop policy if exists weekly_rules_read on public.class_weekly_rules;
create policy weekly_rules_read on public.class_weekly_rules for select using (
 public.current_role()='admin' or exists(select 1 from public.classes c where c.id=class_weekly_rules.class_id and (c.teacher_id=auth.uid() or c.assistant_id=auth.uid())) or
 exists(select 1 from public.class_members cm where cm.class_id=class_weekly_rules.class_id and cm.student_id=auth.uid())
);
drop policy if exists weekly_rules_staff_write on public.class_weekly_rules;
create policy weekly_rules_staff_write on public.class_weekly_rules for all using (
 public.current_role()='admin' or exists(select 1 from public.classes c where c.id=class_weekly_rules.class_id and c.teacher_id=auth.uid())
) with check(public.current_role()='admin' or exists(select 1 from public.classes c where c.id=class_weekly_rules.class_id and c.teacher_id=auth.uid()));
