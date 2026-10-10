create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'admin');
create type public.skill_type as enum ('technical', 'soft');
create type public.course_difficulty as enum ('beginner', 'intermediate', 'advanced');
create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.progress_status as enum ('in_progress', 'completed');
create type public.question_type as enum ('multiple_choice', 'true_false', 'multiple_select');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.user_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  skill_type public.skill_type not null,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  category_id uuid not null references public.categories(id),
  difficulty public.course_difficulty not null default 'beginner',
  estimated_duration_minutes integer not null default 0 check (estimated_duration_minutes >= 0),
  thumbnail_url text,
  instructor_name text not null default 'SkillQuest Team',
  publication_status public.publication_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  level_order integer not null check (level_order > 0),
  content_type text not null default 'text' check (content_type in ('text', 'video', 'mixed')),
  content jsonb not null default '{}'::jsonb,
  video_url text,
  resource_urls jsonb not null default '[]'::jsonb,
  estimated_duration_minutes integer not null default 10 check (estimated_duration_minutes > 0),
  publication_status public.publication_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, level_order),
  unique (id, course_id)
);

create table public.lesson_prerequisites (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  prerequisite_lesson_id uuid not null references public.lessons(id) on delete cascade,
  primary key (lesson_id, prerequisite_lesson_id),
  check (lesson_id <> prerequisite_lesson_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'withdrawn')),
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create table public.course_bookmarks (
  student_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, course_id)
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status public.progress_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_viewed_at timestamptz not null default now(),
  unique (student_id, lesson_id),
  check ((status = 'completed') = (completed_at is not null))
);

create table public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create table public.lesson_bookmarks (
  student_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  title text not null,
  passing_percentage integer not null default 70 check (passing_percentage between 1 and 100),
  time_limit_seconds integer check (time_limit_seconds is null or time_limit_seconds > 0),
  attempt_limit integer check (attempt_limit is null or attempt_limit > 0),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  question_type public.question_type not null default 'multiple_choice',
  options jsonb not null,
  explanation text not null default '',
  display_order integer not null,
  unique (quiz_id, display_order)
);

create table public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_answer jsonb not null
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0 check (score >= 0),
  percentage numeric(5,2) not null default 0 check (percentage between 0 and 100),
  correct_count integer not null default 0 check (correct_count >= 0),
  passed boolean not null default false,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (student_id, quiz_id, attempt_number)
);

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null,
  reference_id uuid not null,
  created_at timestamptz not null default now(),
  unique (student_id, reason, reference_id)
);

create table public.learning_activity (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  reference_id uuid,
  occurred_at timestamptz not null default now()
);

create index courses_publication_category_idx on public.courses(publication_status, category_id);
create index lessons_course_order_idx on public.lessons(course_id, level_order);
create index lesson_prerequisites_prerequisite_idx on public.lesson_prerequisites(prerequisite_lesson_id);
create index enrollments_student_idx on public.enrollments(student_id, status);
create index lesson_progress_student_idx on public.lesson_progress(student_id, status);
create index quiz_attempts_student_quiz_idx on public.quiz_attempts(student_id, quiz_id, submitted_at desc);
create index learning_activity_student_date_idx on public.learning_activity(student_id, occurred_at desc);

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_auth_user();

insert into public.profiles (id, display_name)
select
  id,
  coalesce(nullif(raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(email, ''), '@', 1))
from auth.users
on conflict (id) do nothing;

create function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.id <> old.id or new.role <> old.role then
      raise exception 'You cannot change profile identity or role';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger protect_profile_fields_before_update
  before update on public.profiles
  for each row execute procedure public.protect_profile_fields();

create function public.enroll_in_course(p_course_id uuid)
returns public.enrollments
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.enrollments;
begin
  if auth.uid() is null then raise exception 'Sign in to enroll'; end if;
  if not exists (
    select 1 from public.courses
    where id = p_course_id and publication_status = 'published'
  ) then raise exception 'Course is not available'; end if;

  insert into public.enrollments (student_id, course_id)
  values (auth.uid(), p_course_id)
  on conflict (student_id, course_id) do update set status = 'active'
  returning * into result;
  return result;
end;
$$;

create function public.start_lesson(p_lesson_id uuid)
returns public.lesson_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_course uuid;
  result public.lesson_progress;
begin
  if auth.uid() is null then raise exception 'Sign in to start a lesson'; end if;
  select course_id into target_course from public.lessons
  where id = p_lesson_id and publication_status = 'published';
  if target_course is null then raise exception 'Lesson is unavailable'; end if;
  if not exists (
    select 1 from public.enrollments
    where student_id = auth.uid() and course_id = target_course and status = 'active'
  ) then raise exception 'Enroll in this course before starting the lesson'; end if;
  if exists (
    select 1 from public.lesson_prerequisites lp
    where lp.lesson_id = p_lesson_id and not exists (
      select 1 from public.lesson_progress progress
      where progress.student_id = auth.uid()
        and progress.lesson_id = lp.prerequisite_lesson_id
        and progress.status = 'completed'
    )
  ) then raise exception 'Complete the prerequisite levels first'; end if;

  insert into public.lesson_progress (student_id, lesson_id)
  values (auth.uid(), p_lesson_id)
  on conflict (student_id, lesson_id) do update set last_viewed_at = now()
  returning * into result;
  insert into public.learning_activity (student_id, activity_type, reference_id)
  values (auth.uid(), 'lesson_started', p_lesson_id);
  return result;
end;
$$;

create function public.complete_lesson(p_lesson_id uuid)
returns public.lesson_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.lesson_progress;
begin
  if auth.uid() is null then raise exception 'Sign in to complete a lesson'; end if;
  if not exists (
    select 1 from public.lesson_progress
    where student_id = auth.uid() and lesson_id = p_lesson_id
  ) then raise exception 'Start the lesson before completing it'; end if;
  if exists (
    select 1 from public.quizzes q
    where q.lesson_id = p_lesson_id and q.published
      and not exists (
        select 1 from public.quiz_attempts qa
        where qa.student_id = auth.uid() and qa.quiz_id = q.id and qa.passed
      )
  ) then raise exception 'Pass the required quiz before completing this level'; end if;

  update public.lesson_progress
  set status = 'completed', completed_at = coalesce(completed_at, now()), last_viewed_at = now()
  where student_id = auth.uid() and lesson_id = p_lesson_id
  returning * into result;
  insert into public.xp_transactions (student_id, amount, reason, reference_id)
  values (auth.uid(), 25, 'lesson_completed', p_lesson_id)
  on conflict (student_id, reason, reference_id) do nothing;
  insert into public.learning_activity (student_id, activity_type, reference_id)
  values (auth.uid(), 'lesson_completed', p_lesson_id);
  return result;
end;
$$;

create function public.submit_quiz(p_quiz_id uuid, p_answers jsonb)
returns public.quiz_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  quiz_record public.quizzes;
  total_questions integer;
  correct integer;
  attempt_no integer;
  result public.quiz_attempts;
begin
  if auth.uid() is null then raise exception 'Sign in to submit this quiz'; end if;
  select * into quiz_record from public.quizzes where id = p_quiz_id and published;
  if quiz_record.id is null then raise exception 'Quiz is unavailable'; end if;
  if not exists (
    select 1 from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = quiz_record.lesson_id and e.student_id = auth.uid() and e.status = 'active'
  ) then raise exception 'Enroll in this course before taking the quiz'; end if;

  select count(*) into total_questions from public.quiz_questions where quiz_id = p_quiz_id;
  if total_questions = 0 then raise exception 'This quiz has no questions'; end if;
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'Answers must be a JSON object'; end if;

  select count(*) into correct
  from public.quiz_questions question
  join public.quiz_answer_keys answer_key on answer_key.question_id = question.id
  where question.quiz_id = p_quiz_id
    and p_answers -> question.id::text = answer_key.correct_answer;

  select coalesce(max(attempt_number), 0) + 1 into attempt_no
  from public.quiz_attempts where student_id = auth.uid() and quiz_id = p_quiz_id;
  if quiz_record.attempt_limit is not null and attempt_no > quiz_record.attempt_limit then
    raise exception 'You have reached the attempt limit for this quiz';
  end if;

  insert into public.quiz_attempts (
    student_id, quiz_id, attempt_number, answers, score, percentage, correct_count, passed, submitted_at
  ) values (
    auth.uid(), p_quiz_id, attempt_no, p_answers, correct,
    round((correct::numeric / total_questions) * 100, 2), correct,
    (correct::numeric / total_questions) * 100 >= quiz_record.passing_percentage, now()
  ) returning * into result;

  insert into public.learning_activity (student_id, activity_type, reference_id)
  values (auth.uid(), 'quiz_submitted', p_quiz_id);
  if result.passed then
    insert into public.xp_transactions (student_id, amount, reason, reference_id)
    values (auth.uid(), 15, 'quiz_passed', result.id)
    on conflict (student_id, reason, reference_id) do nothing;
  end if;
  return result;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_prerequisites enable row level security;
alter table public.enrollments enable row level security;
alter table public.course_bookmarks enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.lesson_bookmarks enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.learning_activity enable row level security;

create policy "Profiles readable by owner or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "Profiles update own non-role fields" on public.profiles
  for update to authenticated using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

create policy "Categories visible with published courses" on public.categories
  for select to anon, authenticated using (
    public.is_admin() or exists (
      select 1 from public.courses c
      where c.category_id = categories.id and c.publication_status = 'published'
    )
  );
create policy "Admins manage categories" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Published courses visible to everyone" on public.courses
  for select to anon, authenticated using (publication_status = 'published' or public.is_admin());
create policy "Admins manage courses" on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Lessons visible to enrolled learners or admins" on public.lessons
  for select to authenticated using (
    public.is_admin() or (
      publication_status = 'published' and exists (
        select 1 from public.enrollments e
        where e.course_id = lessons.course_id and e.student_id = (select auth.uid()) and e.status = 'active'
      )
    )
  );
create policy "Admins manage lessons" on public.lessons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Prerequisites visible with lesson" on public.lesson_prerequisites
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.lessons l
      join public.enrollments e on e.course_id = l.course_id
      where l.id = lesson_prerequisites.lesson_id and e.student_id = (select auth.uid()) and e.status = 'active'
    )
  );
create policy "Admins manage prerequisites" on public.lesson_prerequisites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Learners read own enrollments" on public.enrollments
  for select to authenticated using (student_id = (select auth.uid()) or public.is_admin());
create policy "Learners manage own course bookmarks" on public.course_bookmarks
  for all to authenticated using (student_id = (select auth.uid()) or public.is_admin())
  with check (student_id = (select auth.uid()) or public.is_admin());
create policy "Admins manage enrollments" on public.enrollments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Learners read own progress" on public.lesson_progress
  for select to authenticated using (student_id = (select auth.uid()) or public.is_admin());
create policy "Learners manage own notes" on public.lesson_notes
  for all to authenticated using (student_id = (select auth.uid()) or public.is_admin())
  with check (student_id = (select auth.uid()) or public.is_admin());
create policy "Learners manage own bookmarks" on public.lesson_bookmarks
  for all to authenticated using (student_id = (select auth.uid()) or public.is_admin())
  with check (student_id = (select auth.uid()) or public.is_admin());
create policy "Learners read published enrolled quizzes" on public.quizzes
  for select to authenticated using (
    public.is_admin() or (published and exists (
      select 1 from public.lessons l join public.enrollments e on e.course_id = l.course_id
      where l.id = quizzes.lesson_id and e.student_id = (select auth.uid()) and e.status = 'active'
    ))
  );
create policy "Admins manage quizzes" on public.quizzes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Questions visible without answer keys" on public.quiz_questions
  for select to authenticated using (
    public.is_admin() or exists (select 1 from public.quizzes q where q.id = quiz_id and q.published)
  );
create policy "Admins manage questions" on public.quiz_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Answer keys never exposed to clients" on public.quiz_answer_keys
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Learners read own attempts" on public.quiz_attempts
  for select to authenticated using (student_id = (select auth.uid()) or public.is_admin());
create policy "Learners read own XP" on public.xp_transactions
  for select to authenticated using (student_id = (select auth.uid()) or public.is_admin());
create policy "Learners read own activity" on public.learning_activity
  for select to authenticated using (student_id = (select auth.uid()) or public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.courses to anon, authenticated;
grant select on public.profiles, public.lessons, public.lesson_prerequisites, public.enrollments,
  public.course_bookmarks,
  public.lesson_progress, public.lesson_notes, public.lesson_bookmarks, public.quizzes, public.quiz_questions, public.quiz_attempts,
  public.xp_transactions, public.learning_activity to authenticated;
grant insert, update, delete on public.courses to authenticated;
grant insert, update, delete on public.lessons to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant insert, update, delete on public.lesson_notes, public.lesson_bookmarks, public.course_bookmarks to authenticated;
grant execute on function public.enroll_in_course(uuid) to authenticated;
grant execute on function public.start_lesson(uuid) to authenticated;
grant execute on function public.complete_lesson(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to anon, authenticated;

insert into public.categories (name, description, skill_type) values
  ('Programming', 'Build technical confidence with hands-on coding paths.', 'technical'),
  ('Career & Communication', 'Practice the human skills that help ideas travel.', 'soft')
on conflict (name) do nothing;

insert into public.courses (slug, title, description, category_id, difficulty, estimated_duration_minutes, publication_status)
select seed.slug, seed.title, seed.description, category.id, seed.difficulty::public.course_difficulty,
       seed.duration, 'published'::public.publication_status
from (values
  ('python', 'Python Fundamentals', 'Build a strong foundation in Python, from your first line of code to a mini project.', 'Programming', 'beginner', 270),
  ('web-development', 'Web Development', 'Create responsive websites with HTML, CSS, and JavaScript.', 'Programming', 'beginner', 380),
  ('data-structures', 'Data Structures & Algorithms', 'Learn core data structures and problem-solving patterns.', 'Programming', 'intermediate', 525),
  ('communication', 'Communication Skills', 'Share ideas clearly, listen actively, and communicate with confidence.', 'Career & Communication', 'beginner', 190),
  ('interview-preparation', 'Interview Preparation', 'Prepare for interviews with practical exercises and reflection.', 'Career & Communication', 'intermediate', 330),
  ('aptitude', 'Aptitude & Logical Reasoning', 'Sharpen reasoning and problem-solving with guided practice.', 'Career & Communication', 'intermediate', 255)
) as seed(slug, title, description, category_name, difficulty, duration)
join public.categories category on category.name = seed.category_name
on conflict (slug) do nothing;

with lesson_seed as (
  select c.id as course_id, item.level_order, item.title,
         'Learn the foundations of ' || lower(item.title) || ' with a short explanation and a practical example.' as description
  from public.courses c
  cross join lateral unnest(
    array['Introduction', 'Core Concepts', 'Guided Practice', 'Applied Skills', 'Mini Project / Reflection']
  ) with ordinality as item(title, level_order)
  where c.slug = 'python'
  union all
  select c.id, item.level_order, item.title,
         'Learn the foundations of ' || lower(item.title) || ' with a short explanation and a practical example.'
  from public.courses c
  cross join lateral unnest(
    array['Getting Started', 'Core Concepts', 'Guided Practice', 'Applied Skills', 'Mini Project / Reflection']
  ) with ordinality as item(title, level_order)
  where c.slug <> 'python'
)
insert into public.lessons (course_id, title, description, level_order, content_type, content, estimated_duration_minutes)
select course_id, title, description, level_order::integer, 'mixed',
       jsonb_build_object(
         'sections', jsonb_build_array(
           jsonb_build_object('heading', 'What you will learn', 'body', description),
           jsonb_build_object('heading', 'Try it yourself', 'body', 'Practice the idea with a small example, then explain what you noticed.')
         )
       ), 15
from lesson_seed
on conflict (course_id, level_order) do nothing;

insert into public.lesson_prerequisites (lesson_id, prerequisite_lesson_id)
select lesson.id, previous.id
from public.lessons lesson
join public.lessons previous on previous.course_id = lesson.course_id and previous.level_order = lesson.level_order - 1
where lesson.level_order > 1
on conflict do nothing;

insert into public.quizzes (lesson_id, title, passing_percentage, attempt_limit, published)
select id, title || ' · Quick check', 70, 3, true
from public.lessons
where level_order = 3
on conflict (lesson_id) do nothing;

with quiz_seed as (
  select q.id as quiz_id, l.title
  from public.quizzes q
  join public.lessons l on l.id = q.lesson_id
)
insert into public.quiz_questions (quiz_id, question_text, question_type, options, explanation, display_order)
select quiz_id,
       'Which approach best helps you learn ' || lower(title) || '?',
       'multiple_choice',
       '[{"id":"a","text":"Try a small example and explain the result"},{"id":"b","text":"Skip practice"},{"id":"c","text":"Memorize without context"}]'::jsonb,
       'Trying a small example and explaining it helps connect the idea to what you already know.',
       1
from quiz_seed
where not exists (select 1 from public.quiz_questions qq where qq.quiz_id = quiz_seed.quiz_id);

insert into public.quiz_answer_keys (question_id, correct_answer)
select id, '"a"'::jsonb
from public.quiz_questions
on conflict (question_id) do nothing;

create function public.require_lesson_before_course_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publication_status = 'published' and not exists (
    select 1 from public.lessons
    where course_id = new.id and publication_status = 'published'
  ) then
    raise exception 'A course needs at least one published lesson before it can be published';
  end if;
  return new;
end;
$$;

create trigger require_lesson_before_course_publish
  before insert or update of publication_status on public.courses
  for each row execute procedure public.require_lesson_before_course_publish();
