-- IPA Student HUB v1.6.0: live teacher/student portals
alter table public.assignments
  add column if not exists target_student_id uuid references public.profiles(id) on delete cascade;

create index if not exists idx_assignments_target_student
  on public.assignments(target_student_id);

drop policy if exists assignments_read on public.assignments;
create policy assignments_read on public.assignments for select to authenticated using (
  public.current_role()='admin'
  or created_by=auth.uid()
  or exists(
    select 1 from public.class_members cm
    where cm.class_id=assignments.class_id
      and cm.student_id=auth.uid()
      and (assignments.target_student_id is null or assignments.target_student_id=auth.uid())
  )
);
