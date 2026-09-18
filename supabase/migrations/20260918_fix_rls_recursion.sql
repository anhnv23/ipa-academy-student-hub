-- IPA Student HUB v1.5.2: break profiles/classes/class_members RLS recursion
create or replace function public.is_class_student(target_class_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.class_members cm where cm.class_id=target_class_id and cm.student_id=auth.uid()) $$;

create or replace function public.is_class_staff(target_class_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.classes c where c.id=target_class_id and (c.teacher_id=auth.uid() or c.assistant_id=auth.uid())) $$;

create or replace function public.teacher_can_view_student(target_student_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.class_members cm join public.classes c on c.id=cm.class_id where cm.student_id=target_student_id and (c.teacher_id=auth.uid() or c.assistant_id=auth.uid())) $$;

revoke all on function public.is_class_student(uuid) from public;
revoke all on function public.is_class_staff(uuid) from public;
revoke all on function public.teacher_can_view_student(uuid) from public;
grant execute on function public.is_class_student(uuid) to authenticated;
grant execute on function public.is_class_staff(uuid) to authenticated;
grant execute on function public.teacher_can_view_student(uuid) to authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (
 id=auth.uid() or public.current_role()='admin' or (public.current_role()='teacher' and public.teacher_can_view_student(id))
);
drop policy if exists classes_read on public.classes;
create policy classes_read on public.classes for select to authenticated using (
 public.current_role()='admin' or teacher_id=auth.uid() or assistant_id=auth.uid() or public.is_class_student(id)
);
drop policy if exists members_read on public.class_members;
create policy members_read on public.class_members for select to authenticated using (
 student_id=auth.uid() or public.current_role()='admin' or public.is_class_staff(class_id)
);
