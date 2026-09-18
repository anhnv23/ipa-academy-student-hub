-- IPA Student HUB v1.4.0: extended student/staff profiles and attendance automation
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists parent_name text;
alter table public.profiles add column if not exists parent_phone text;
alter table public.profiles add column if not exists secondary_phone text;
alter table public.profiles add column if not exists active boolean not null default true;

alter table public.class_sessions add column if not exists makeup_policy text
  check (makeup_policy in ('makeup','no_makeup'));
alter table public.class_sessions add column if not exists updated_by uuid references public.profiles(id);

create or replace function public.sync_approved_leave_to_attendance()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status='approved' and new.session_id is not null then
    insert into public.attendance(session_id,student_id,status,note,marked_by)
    values(new.session_id,new.student_id,'excused','Tự động cập nhật từ đơn xin nghỉ',new.reviewed_by)
    on conflict(session_id,student_id) do update
      set status='excused',note='Tự động cập nhật từ đơn xin nghỉ',marked_by=new.reviewed_by,marked_at=now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leave_to_attendance on public.leave_requests;
create trigger trg_leave_to_attendance
after insert or update of status on public.leave_requests
for each row execute function public.sync_approved_leave_to_attendance();

create index if not exists idx_profiles_role_active on public.profiles(role,active);
create index if not exists idx_tuition_status_due on public.tuition_records(status,due_date);
