create function public.create_admin_quiz(
  p_lesson_id uuid,
  p_title text,
  p_passing_percentage integer,
  p_questions jsonb,
  p_publish boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_quiz_id uuid;
  new_question_id uuid;
  question_data jsonb;
  option_data jsonb;
  question_order integer := 0;
  option_count integer;
  distinct_option_count integer;
  answer_id text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can create course quizzes';
  end if;
  if not exists (select 1 from public.lessons where id = p_lesson_id) then
    raise exception 'Choose a valid lesson for this quiz';
  end if;
  if nullif(btrim(p_title), '') is null then
    raise exception 'Enter a quiz title';
  end if;
  if p_passing_percentage is null or p_passing_percentage < 1 or p_passing_percentage > 100 then
    raise exception 'The passing score must be between 1 and 100';
  end if;
  if jsonb_typeof(p_questions) is distinct from 'array' then
    raise exception 'Questions must be provided as an array';
  end if;
  if jsonb_array_length(p_questions) < 1 or jsonb_array_length(p_questions) > 20 then
    raise exception 'A quiz must have between 1 and 20 questions';
  end if;
  if exists (select 1 from public.quizzes where lesson_id = p_lesson_id) then
    raise exception 'This lesson already has a quiz';
  end if;

  insert into public.quizzes (lesson_id, title, passing_percentage, published)
  values (p_lesson_id, btrim(p_title), p_passing_percentage, coalesce(p_publish, false))
  returning id into new_quiz_id;

  for question_data in select value from jsonb_array_elements(p_questions)
  loop
    question_order := question_order + 1;
    answer_id := question_data ->> 'answer';
    if nullif(btrim(question_data ->> 'prompt'), '') is null then
      raise exception 'Question % needs a prompt', question_order;
    end if;
    if jsonb_typeof(question_data -> 'options') is distinct from 'array' then
      raise exception 'Question % needs answer choices', question_order;
    end if;
    select count(*), count(distinct option ->> 'id')
      into option_count, distinct_option_count
      from jsonb_array_elements(question_data -> 'options') as choices(option);
    if option_count < 2 or option_count <> distinct_option_count then
      raise exception 'Question % needs at least two uniquely identified choices', question_order;
    end if;
    for option_data in select value from jsonb_array_elements(question_data -> 'options')
    loop
      if nullif(btrim(option_data ->> 'id'), '') is null
        or nullif(btrim(option_data ->> 'text'), '') is null then
        raise exception 'Question % has an empty choice', question_order;
      end if;
    end loop;
    if not exists (
      select 1
      from jsonb_array_elements(question_data -> 'options') as choices(option)
      where option ->> 'id' = answer_id
    ) then
      raise exception 'Select a correct answer for question %', question_order;
    end if;

    insert into public.quiz_questions (
      quiz_id, question_text, question_type, options, explanation, display_order
    ) values (
      new_quiz_id, btrim(question_data ->> 'prompt'), 'multiple_choice',
      question_data -> 'options', coalesce(question_data ->> 'explanation', ''), question_order
    ) returning id into new_question_id;

    insert into public.quiz_answer_keys (question_id, correct_answer)
    values (new_question_id, to_jsonb(answer_id));
  end loop;

  return new_quiz_id;
end;
$$;

revoke all on function public.create_admin_quiz(uuid, text, integer, jsonb, boolean) from public, anon;
grant execute on function public.create_admin_quiz(uuid, text, integer, jsonb, boolean) to authenticated;

drop policy "Questions visible without answer keys" on public.quiz_questions;
create policy "Learners read enrolled published quiz questions" on public.quiz_questions
  for select to authenticated using (
    public.is_admin() or exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.enrollments e on e.course_id = l.course_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_questions.quiz_id
        and q.published
        and l.publication_status = 'published'
        and c.publication_status = 'published'
        and e.student_id = (select auth.uid())
        and e.status = 'active'
    )
  );
