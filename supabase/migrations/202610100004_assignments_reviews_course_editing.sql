create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 150),
  description text not null default '',
  due_at timestamptz,
  published boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  submission_text text not null check (length(btrim(submission_text)) between 1 and 10000),
  submitted_at timestamptz not null default now(),
  grade numeric(5,2) check (grade is null or grade between 0 and 100),
  feedback text,
  graded_at timestamptz,
  unique (assignment_id, student_id),
  check ((grade is null) = (graded_at is null))
);

create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text not null default '' check (length(review) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create index assignments_course_due_idx on public.assignments(course_id, due_at);
create index assignment_submissions_assignment_idx on public.assignment_submissions(assignment_id, submitted_at);
create index course_reviews_course_idx on public.course_reviews(course_id, created_at desc);

alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.course_reviews enable row level security;

create policy "Students read assignments for active courses" on public.assignments
  for select to authenticated using (
    public.is_admin() or (published and exists (
      select 1 from public.enrollments e
      where e.course_id = assignments.course_id
        and e.student_id = (select auth.uid())
        and e.status = 'active'
    ))
  );
create policy "Admins manage assignments" on public.assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students and admins read assignment submissions" on public.assignment_submissions
  for select to authenticated using (student_id = (select auth.uid()) or public.is_admin());
create policy "Learners read published course reviews" on public.course_reviews
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.courses c
      where c.id = course_reviews.course_id and c.publication_status = 'published'
    )
  );

grant select, insert, update, delete on public.assignments to authenticated;
grant select on public.assignment_submissions, public.course_reviews to authenticated;

create function public.submit_course_assignment(p_assignment_id uuid, p_submission_text text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_id uuid;
  target_course_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to submit an assignment'; end if;
  if nullif(btrim(p_submission_text), '') is null or length(p_submission_text) > 10000 then
    raise exception 'Write an assignment response (up to 10,000 characters)';
  end if;
  select course_id into target_course_id from public.assignments
  where id = p_assignment_id and published;
  if target_course_id is null then raise exception 'This assignment is unavailable'; end if;
  if not exists (
    select 1 from public.enrollments
    where student_id = auth.uid() and course_id = target_course_id and status = 'active'
  ) then raise exception 'Enroll in this course before submitting the assignment'; end if;
  if exists (
    select 1 from public.assignment_submissions
    where assignment_id = p_assignment_id and student_id = auth.uid() and grade is not null
  ) then raise exception 'This assignment has already been graded and cannot be changed'; end if;

  insert into public.assignment_submissions as existing_submission
    (assignment_id, student_id, submission_text, submitted_at, grade, feedback, graded_at)
  values (p_assignment_id, auth.uid(), btrim(p_submission_text), now(), null, null, null)
  on conflict (assignment_id, student_id) do update
    set submission_text = excluded.submission_text,
        submitted_at = excluded.submitted_at,
        grade = null,
        feedback = null,
        graded_at = null
    where existing_submission.grade is null
  returning id into result_id;
  if result_id is null then raise exception 'This assignment has already been graded and cannot be changed'; end if;

  insert into public.learning_activity (student_id, activity_type, reference_id)
  values (auth.uid(), 'assignment_submitted', p_assignment_id);
  return result_id;
end;
$$;

create function public.grade_course_assignment(p_submission_id uuid, p_grade numeric, p_feedback text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Only administrators can grade assignments'; end if;
  if p_grade is null or p_grade < 0 or p_grade > 100 then raise exception 'Grade must be between 0 and 100'; end if;
  if p_feedback is not null and length(p_feedback) > 2000 then raise exception 'Feedback must be 2,000 characters or fewer'; end if;
  update public.assignment_submissions
  set grade = p_grade, feedback = nullif(btrim(p_feedback), ''), graded_at = now()
  where id = p_submission_id;
  if not found then raise exception 'Assignment submission not found'; end if;
end;
$$;

create function public.save_course_review(p_course_id uuid, p_rating integer, p_review text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to leave a course review'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Choose a rating from 1 to 5 stars'; end if;
  if p_review is null or length(p_review) > 2000 then raise exception 'Review must be 2,000 characters or fewer'; end if;
  if not exists (
    select 1 from public.enrollments
    where student_id = auth.uid() and course_id = p_course_id and status in ('active', 'completed')
  ) then raise exception 'Enroll in this course before leaving a review'; end if;

  insert into public.course_reviews (course_id, student_id, rating, review)
  values (p_course_id, auth.uid(), p_rating, btrim(p_review))
  on conflict (course_id, student_id) do update
    set rating = excluded.rating, review = excluded.review, updated_at = now();
end;
$$;

revoke all on function public.submit_course_assignment(uuid, text) from public, anon;
revoke all on function public.grade_course_assignment(uuid, numeric, text) from public, anon;
revoke all on function public.save_course_review(uuid, integer, text) from public, anon;
grant execute on function public.submit_course_assignment(uuid, text) to authenticated;
grant execute on function public.grade_course_assignment(uuid, numeric, text) to authenticated;
grant execute on function public.save_course_review(uuid, integer, text) to authenticated;
