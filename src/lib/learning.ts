import { getSupabaseClient } from './supabase'

export type CourseRecord = {
  id: string
  slug: string
  title: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  durationMinutes: number
  instructor: string
}

export async function reviewAdminAccessRequest(userId: string, approved: boolean): Promise<void> {
  const { error } = await getSupabaseClient().rpc('review_admin_access_request', {
    p_user_id: userId,
    p_approved: approved,
  })
  if (error) throw error
}

export async function updateCourse(input: {
  id: string
  title: string
  description: string
  categoryId: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  durationMinutes: number
}): Promise<void> {
  const { error } = await getSupabaseClient().from('courses').update({
    title: input.title.trim(),
    description: input.description.trim(),
    category_id: input.categoryId,
    difficulty: input.difficulty,
    estimated_duration_minutes: input.durationMinutes,
  }).eq('id', input.id)
  if (error) throw error
}

export async function createAssignment(input: { courseId: string; title: string; description: string; dueAt: string | null }): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('Sign in as an administrator to create assignments.')
  const { error } = await supabase.from('assignments').insert({
    course_id: input.courseId,
    title: input.title.trim(),
    description: input.description.trim(),
    due_at: input.dueAt,
    created_by: authData.user.id,
  })
  if (error) throw error
}

export async function submitAssignment(assignmentId: string, submissionText: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('submit_course_assignment', {
    p_assignment_id: assignmentId,
    p_submission_text: submissionText.trim(),
  })
  if (error) throw error
}

export async function gradeAssignment(submissionId: string, grade: number, feedback: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('grade_course_assignment', {
    p_submission_id: submissionId,
    p_grade: grade,
    p_feedback: feedback.trim(),
  })
  if (error) throw error
}

export async function loadStudentAssignments(): Promise<StudentAssignment[]> {
  const { data, error } = await getSupabaseClient().from('assignments')
    .select('id, course_id, title, description, due_at, courses(title, slug), assignment_submissions(id, submission_text, submitted_at, grade, feedback)')
    .eq('published', true)
    .order('due_at', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []).map((assignment) => {
    const course = firstRelation(assignment.courses)
    const submission = firstRelation(assignment.assignment_submissions)
    return {
      id: assignment.id,
      courseId: assignment.course_id,
      courseTitle: course?.title ?? 'Course',
      courseSlug: course?.slug ?? '',
      title: assignment.title,
      description: assignment.description,
      dueAt: assignment.due_at,
      submission: submission ? {
        id: submission.id,
        submissionText: submission.submission_text,
        submittedAt: submission.submitted_at,
        grade: submission.grade === null ? null : Number(submission.grade),
        feedback: submission.feedback,
      } : null,
    }
  })
}

export async function loadCourseReviewSummary(courseId: string): Promise<CourseReviewSummary> {
  const supabase = getSupabaseClient()
  const [{ data, error }, { data: userData, error: userError }] = await Promise.all([
    supabase.from('course_reviews').select('rating').eq('course_id', courseId),
    supabase.auth.getUser(),
  ])
  if (error) throw error
  if (userError) throw userError
  const { data: ownReview, error: ownError } = userData.user
    ? await supabase.from('course_reviews').select('rating, review').eq('course_id', courseId).eq('student_id', userData.user.id).maybeSingle()
    : { data: null, error: null }
  if (ownError) throw ownError
  const ratings = data ?? []
  return {
    average: ratings.length ? Math.round(ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length * 10) / 10 : null,
    count: ratings.length,
    ownReview: ownReview ? { rating: ownReview.rating, review: ownReview.review } : null,
  }
}

export async function saveCourseReview(courseId: string, rating: number, review: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('save_course_review', {
    p_course_id: courseId,
    p_rating: rating,
    p_review: review.trim(),
  })
  if (error) throw error
}

export type LessonRecord = {
  id: string
  title: string
  description: string
  level_order: number
  estimated_duration_minutes: number
}

export type LessonDetails = LessonRecord & {
  course_id: string
  content: { sections?: { heading: string; body: string }[] }
  video_url: string | null
  resource_urls: string[]
  progress_status: 'in_progress' | 'completed'
  courses: { title: string; slug: string } | null
  quizzes: { id: string; title: string; passing_percentage: number } | null
}

export type QuizDetails = {
  id: string
  title: string
  passing_percentage: number
  time_limit_seconds: number | null
  attempt_limit: number | null
  quiz_questions: { id: string; question_text: string; question_type: string; options: { id: string; text: string }[]; explanation: string; display_order: number }[]
}

export type StudentDashboardData = {
  currentStreak: number
  xp: number
  completedCourses: number
  completionPercentage: number
  completedLessons: number
  totalLessons: number
  dailyLessonsCompleted: number
  averageQuizScore: number | null
  continueCourse: CourseRecord | null
  continueLesson: LessonRecord | null
  continueCourseProgress: number
  recommendedCourses: CourseRecord[]
}

export type StudentAnalyticsData = {
  dashboard: StudentDashboardData
  weeklyActivity: { day: string; activities: number }[]
  topicPerformance: { topic: string; score: number }[]
}

export type AdminOverview = {
  students: number
  publishedCourses: number
  activeEnrollments: number
  completionPercentage: number
  courses: { id: string; title: string; description: string; slug: string; difficulty: 'beginner' | 'intermediate' | 'advanced'; durationMinutes: number; categoryId: string; status: string; category: string; enrollments: number; completion: number; lessons: number; quizzes: number }[]
  courseEditingConfigured: boolean
  assignmentsConfigured: boolean
  lessonOptions: { id: string; courseId: string; title: string }[]
  assignments: { id: string; courseId: string; courseTitle: string; title: string; description: string; dueAt: string | null; submissions: { id: string; studentName: string; submissionText: string; submittedAt: string; grade: number | null; feedback: string | null }[] }[]
  courseReviews: { courseTitle: string; studentName: string; rating: number; review: string; createdAt: string }[]
  adminAccessRequestsConfigured: boolean
  adminAccessRequests: { userId: string; displayName: string; requestedAt: string }[]
  recentActivity: { id: string; activity_type: string; occurred_at: string; display_name: string }[]
  categories: { id: string; name: string }[]
}

export type StudentAssignment = {
  id: string
  courseId: string
  courseTitle: string
  courseSlug: string
  title: string
  description: string
  dueAt: string | null
  submission: { id: string; submissionText: string; submittedAt: string; grade: number | null; feedback: string | null } | null
}

export type CourseReviewSummary = {
  average: number | null
  count: number
  ownReview: { rating: number; review: string } | null
}

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation
}

export async function loadPublishedCourses(): Promise<CourseRecord[]> {
  const { data, error } = await getSupabaseClient()
    .from('courses')
    .select('id, slug, title, description, difficulty, estimated_duration_minutes, instructor_name, categories(name)')
    .eq('publication_status', 'published')
    .order('title')
  if (error) throw error

  return (data ?? []).map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    category: firstRelation(course.categories)?.name ?? 'Skills',
    difficulty: course.difficulty,
    durationMinutes: course.estimated_duration_minutes,
    instructor: course.instructor_name,
  }))
}

export async function loadCourseBySlug(slug: string): Promise<CourseRecord | null> {
  const { data, error } = await getSupabaseClient()
    .from('courses')
    .select('id, slug, title, description, difficulty, estimated_duration_minutes, instructor_name, categories(name)')
    .eq('slug', slug)
    .eq('publication_status', 'published')
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    category: firstRelation(data.categories)?.name ?? 'Skills',
    difficulty: data.difficulty,
    durationMinutes: data.estimated_duration_minutes,
    instructor: data.instructor_name,
  }
}

export async function enrollInCourse(courseId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('enroll_in_course', { p_course_id: courseId })
  if (error) throw error
}

export async function loadCourseBookmarks(): Promise<string[]> {
  const { data, error } = await getSupabaseClient().from('course_bookmarks').select('course_id')
  if (error) throw error
  return (data ?? []).map((item) => item.course_id)
}

export async function setCourseBookmark(courseId: string, bookmarked: boolean): Promise<void> {
  const supabase = getSupabaseClient()
  if (bookmarked) {
    const { error } = await supabase.from('course_bookmarks').insert({ course_id: courseId })
    if (error) throw error
    return
  }
  const { error } = await supabase.from('course_bookmarks').delete().eq('course_id', courseId)
  if (error) throw error
}

export async function startLesson(lessonId: string): Promise<LessonDetails> {
  const supabase = getSupabaseClient()
  const { data: progressData, error: startError } = await supabase.rpc('start_lesson', { p_lesson_id: lessonId })
  if (startError) throw startError
  const { data, error } = await supabase.from('lessons')
    .select('id, title, description, level_order, estimated_duration_minutes, course_id, content, video_url, resource_urls, courses(title, slug), quizzes(id, title, passing_percentage)')
    .eq('id', lessonId)
    .single()
  if (error) throw error
  const lesson = data as unknown as Omit<LessonDetails, 'courses' | 'quizzes' | 'progress_status'> & {
    courses: LessonDetails['courses'] | LessonDetails['courses'][]
    quizzes: LessonDetails['quizzes'] | LessonDetails['quizzes'][]
  }
  const progress = progressData as { status?: unknown } | null
  if (progress?.status !== 'in_progress' && progress?.status !== 'completed') throw new Error('The lesson service returned an invalid progress state.')
  return { ...lesson, progress_status: progress.status, courses: firstRelation(lesson.courses), quizzes: firstRelation(lesson.quizzes) }
}

export async function completeLesson(lessonId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('complete_lesson', { p_lesson_id: lessonId })
  if (error) throw error
}

export async function loadQuiz(quizId: string): Promise<QuizDetails> {
  const { data, error } = await getSupabaseClient().from('quizzes')
    .select('id, title, passing_percentage, time_limit_seconds, attempt_limit, quiz_questions(id, question_text, question_type, options, explanation, display_order)')
    .eq('id', quizId)
    .single()
  if (error) throw error
  const quiz = data as unknown as Omit<QuizDetails, 'quiz_questions'> & {
    quiz_questions: QuizDetails['quiz_questions'] | null
  }
  return { ...quiz, quiz_questions: quiz.quiz_questions ?? [] }
}

export async function submitQuiz(quizId: string, answers: Record<string, string | string[]>) {
  const { data, error } = await getSupabaseClient().rpc('submit_quiz', { p_quiz_id: quizId, p_answers: answers }).single()
  if (error) throw error
  if (!data || typeof data !== 'object') throw new Error('The quiz service returned an invalid result.')
  const row = data as Record<string, unknown>
  if (typeof row.percentage !== 'number' && typeof row.percentage !== 'string') throw new Error('The quiz service returned an invalid score.')
  if (typeof row.passed !== 'boolean' || typeof row.correct_count !== 'number' || typeof row.score !== 'number') {
    throw new Error('The quiz service returned an incomplete result.')
  }
  return { percentage: row.percentage, passed: row.passed, correct_count: row.correct_count, score: row.score }
}

export async function loadLessonNote(lessonId: string): Promise<string> {
  const { data, error } = await getSupabaseClient().from('lesson_notes')
    .select('content')
    .eq('lesson_id', lessonId)
    .maybeSingle()
  if (error) throw error
  return data?.content ?? ''
}

export async function saveLessonNote(lessonId: string, content: string): Promise<void> {
  const { data: userData, error: userError } = await getSupabaseClient().auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Sign in to save lesson notes.')
  const { error } = await getSupabaseClient().from('lesson_notes').upsert({
    student_id: userData.user.id,
    lesson_id: lessonId,
    content,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'student_id,lesson_id' })
  if (error) throw error
}

export async function hasLessonBookmark(lessonId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient().from('lesson_bookmarks')
    .select('lesson_id')
    .eq('lesson_id', lessonId)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function setLessonBookmark(lessonId: string, bookmarked: boolean): Promise<void> {
  const supabase = getSupabaseClient()
  if (bookmarked) {
    const { error } = await supabase.from('lesson_bookmarks').insert({ lesson_id: lessonId })
    if (error) throw error
    return
  }
  const { error } = await supabase.from('lesson_bookmarks').delete().eq('lesson_id', lessonId)
  if (error) throw error
}

export async function loadStudentDashboard(userId: string): Promise<StudentDashboardData> {
  const supabase = getSupabaseClient()
  const [enrollmentResult, xpResult, activityResult, attemptResult, catalogResult] = await Promise.all([
    supabase.from('enrollments').select('course_id').eq('student_id', userId).eq('status', 'active'),
    supabase.from('xp_transactions').select('amount').eq('student_id', userId),
    supabase.from('learning_activity').select('occurred_at, activity_type').eq('student_id', userId).order('occurred_at', { ascending: false }),
    supabase.from('quiz_attempts').select('percentage').eq('student_id', userId).not('submitted_at', 'is', null),
    supabase.from('courses').select('id, slug, title, description, difficulty, estimated_duration_minutes, instructor_name, categories(name)').eq('publication_status', 'published').order('created_at', { ascending: false }),
  ])
  for (const result of [enrollmentResult, xpResult, activityResult, attemptResult, catalogResult]) {
    if (result.error) throw result.error
  }

  const courseIds = [...new Set((enrollmentResult.data ?? []).map((item) => item.course_id))]
  const enrolledCourseIds = new Set(courseIds)
  const recommendedCourses: CourseRecord[] = (catalogResult.data ?? [])
    .filter((course) => !enrolledCourseIds.has(course.id))
    .slice(0, 3)
    .map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      category: firstRelation(course.categories)?.name ?? 'Skills',
      difficulty: course.difficulty,
      durationMinutes: course.estimated_duration_minutes,
      instructor: course.instructor_name,
    }))
  const [courseResult, lessonResult, progressResult] = courseIds.length
    ? await Promise.all([
      supabase.from('courses').select('id, slug, title, description, difficulty, estimated_duration_minutes, instructor_name, categories(name)').in('id', courseIds).eq('publication_status', 'published'),
      supabase.from('lessons').select('id, course_id, title, description, level_order, estimated_duration_minutes').in('course_id', courseIds).eq('publication_status', 'published').order('level_order'),
      supabase.from('lesson_progress').select('lesson_id, status, last_viewed_at, completed_at').eq('student_id', userId),
    ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
  for (const result of [courseResult, lessonResult, progressResult]) {
    if (result.error) throw result.error
  }

  const courseRecords: CourseRecord[] = (courseResult.data ?? []).map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    category: firstRelation(course.categories)?.name ?? 'Skills',
    difficulty: course.difficulty,
    durationMinutes: course.estimated_duration_minutes,
    instructor: course.instructor_name,
  }))
  const lessons = lessonResult.data ?? []
  const progress = progressResult.data ?? []
  const completedIds = new Set(progress.filter((item) => item.status === 'completed').map((item) => item.lesson_id))
  const totalLessons = lessons.length
  const completedLessons = lessons.filter((lesson) => completedIds.has(lesson.id)).length
  const progressByLesson = new Map(progress.map((item) => [item.lesson_id, item]))
  const orderedCourses = courseRecords
  const continueLesson = lessons
    .filter((lesson) => !completedIds.has(lesson.id))
    .sort((left, right) => {
      const leftProgress = progressByLesson.get(left.id)
      const rightProgress = progressByLesson.get(right.id)
      const leftDate = leftProgress?.last_viewed_at ? Date.parse(leftProgress.last_viewed_at) : 0
      const rightDate = rightProgress?.last_viewed_at ? Date.parse(rightProgress.last_viewed_at) : 0
      if (leftDate !== rightDate) return rightDate - leftDate
      return left.level_order - right.level_order
    })[0] ?? null
  const continueCourse = continueLesson
    ? orderedCourses.find((course) => course.id === continueLesson.course_id) ?? null
    : null
  const continueCourseLessons = continueCourse ? lessons.filter((lesson) => lesson.course_id === continueCourse.id) : []
  const continueCourseProgress = continueCourseLessons.length
    ? Math.round(continueCourseLessons.filter((lesson) => completedIds.has(lesson.id)).length / continueCourseLessons.length * 100)
    : 0

  const activeDates = new Set((activityResult.data ?? []).map((item) => item.occurred_at.slice(0, 10)))
  let currentStreak = 0
  const today = new Date()
  let date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  if (!activeDates.has(date.toISOString().slice(0, 10))) date.setUTCDate(date.getUTCDate() - 1)
  while (activeDates.has(date.toISOString().slice(0, 10))) {
    currentStreak += 1
    date.setUTCDate(date.getUTCDate() - 1)
  }
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const dailyLessonsCompleted = (activityResult.data ?? []).filter((item) =>
    item.activity_type === 'lesson_completed' && item.occurred_at >= startOfDay.toISOString(),
  ).length
  const attempts = attemptResult.data ?? []

  return {
    currentStreak,
    xp: (xpResult.data ?? []).reduce((total, item) => total + item.amount, 0),
    completedCourses: courseRecords.filter((course) => {
      const courseLessons = lessons.filter((lesson) => lesson.course_id === course.id)
      return courseLessons.length > 0 && courseLessons.every((lesson) => completedIds.has(lesson.id))
    }).length,
    completionPercentage: totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0,
    completedLessons,
    totalLessons,
    dailyLessonsCompleted,
    averageQuizScore: attempts.length ? Math.round(attempts.reduce((total, item) => total + Number(item.percentage), 0) / attempts.length) : null,
    continueCourse,
    continueLesson,
    continueCourseProgress,
    recommendedCourses,
  }
}

export async function loadStudentAnalytics(userId: string): Promise<StudentAnalyticsData> {
  const supabase = getSupabaseClient()
  const activityStart = new Date()
  activityStart.setUTCHours(0, 0, 0, 0)
  activityStart.setUTCDate(activityStart.getUTCDate() - 6)
  const [dashboard, activityResult, attemptsResult] = await Promise.all([
    loadStudentDashboard(userId),
    supabase.from('learning_activity').select('occurred_at').eq('student_id', userId).gte('occurred_at', activityStart.toISOString()),
    supabase.from('quiz_attempts').select('percentage, quizzes(title)').eq('student_id', userId).not('submitted_at', 'is', null).order('submitted_at', { ascending: false }),
  ])
  if (activityResult.error) throw activityResult.error
  if (attemptsResult.error) throw attemptsResult.error

  const activityByDate = new Map<string, number>()
  for (const activity of activityResult.data ?? []) {
    const date = activity.occurred_at.slice(0, 10)
    activityByDate.set(date, (activityByDate.get(date) ?? 0) + 1)
  }
  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const day = new Date()
    day.setUTCHours(0, 0, 0, 0)
    day.setUTCDate(day.getUTCDate() - (6 - index))
    const date = day.toISOString().slice(0, 10)
    return {
      day: new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(day),
      activities: activityByDate.get(date) ?? 0,
    }
  })

  const groupedScores = new Map<string, number[]>()
  for (const attempt of attemptsResult.data ?? []) {
    const quiz = firstRelation(attempt.quizzes)
    const topic = quiz?.title ?? 'Course quiz'
    const scores = groupedScores.get(topic) ?? []
    scores.push(Number(attempt.percentage))
    groupedScores.set(topic, scores)
  }
  const topicPerformance = [...groupedScores.entries()].map(([topic, scores]) => ({
    topic,
    score: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
  }))
  return { dashboard, weeklyActivity, topicPerformance }
}

export async function loadAdminOverview(): Promise<AdminOverview> {
  const supabase = getSupabaseClient()
  const [profilesResult, coursesResult, enrollmentsResult, lessonsResult, progressResult, activityResult, categoriesResult, quizzesResult] = await Promise.all([
    supabase.from('profiles').select('id, role').eq('role', 'student'),
    supabase.from('courses').select('id, slug, title, description, difficulty, estimated_duration_minutes, category_id, publication_status, categories(name)').order('created_at', { ascending: false }),
    supabase.from('enrollments').select('id, course_id, student_id, status'),
    supabase.from('lessons').select('id, course_id, title'),
    supabase.from('lesson_progress').select('student_id, lesson_id, status'),
    supabase.from('learning_activity').select('id, activity_type, occurred_at, profiles(display_name)').order('occurred_at', { ascending: false }).limit(8),
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('quizzes').select('id, lesson_id'),
  ])
  for (const result of [profilesResult, coursesResult, enrollmentsResult, lessonsResult, progressResult, activityResult, categoriesResult, quizzesResult]) {
    if (result.error) throw result.error
  }
  const [assignmentsResult, reviewsResult] = await Promise.all([
    supabase.from('assignments').select('id, course_id, title, description, due_at, courses(title), assignment_submissions(id, submission_text, submitted_at, grade, feedback, profiles(display_name))').order('created_at', { ascending: false }),
    supabase.from('course_reviews').select('rating, review, created_at, profiles(display_name), courses(title)').order('created_at', { ascending: false }).limit(50),
  ])
  const assignmentsConfigured = !assignmentsResult.error
  const courseEditingConfigured = !reviewsResult.error
  for (const result of [assignmentsResult, reviewsResult]) {
    if (result.error && result.error.code !== 'PGRST205' && result.error.code !== '42P01') throw result.error
  }
  for (const result of [assignmentsResult, reviewsResult]) {
    if (result.error && result.error.code !== 'PGRST205' && result.error.code !== '42P01') throw result.error
  }
  const requestsResult = await supabase.from('admin_access_requests')
    .select('user_id, requested_at, profiles!admin_access_requests_user_id_fkey(display_name)')
    .eq('status', 'pending')
    .order('requested_at')
  const adminAccessRequestsConfigured = !requestsResult.error
  if (requestsResult.error && requestsResult.error.code !== 'PGRST205' && requestsResult.error.code !== '42P01') {
    throw requestsResult.error
  }
  const enrollments = enrollmentsResult.data ?? []
  const lessons = lessonsResult.data ?? []
  const quizLessonIds = new Set((quizzesResult.data ?? []).map((quiz) => quiz.lesson_id))
  const progress = progressResult.data ?? []
  const activeEnrollments = enrollments.filter((item) => item.status === 'active')
  const courseRows = coursesResult.data ?? []
  const courses = courseRows.map((course) => {
    const courseLessons = lessons.filter((lesson) => lesson.course_id === course.id)
    const courseEnrollments = activeEnrollments.filter((enrollment) => enrollment.course_id === course.id)
    const completedCount = courseEnrollments.reduce((sum, enrollment) => sum + courseLessons.filter((lesson) =>
      progress.some((item) => item.student_id === enrollment.student_id && item.lesson_id === lesson.id && item.status === 'completed'),
    ).length, 0)
    const totalLearnerLessons = courseLessons.length * courseEnrollments.length
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      slug: course.slug,
      difficulty: course.difficulty,
      durationMinutes: course.estimated_duration_minutes,
      categoryId: course.category_id,
      status: course.publication_status,
      category: firstRelation(course.categories)?.name ?? 'Skills',
      enrollments: courseEnrollments.length,
      completion: totalLearnerLessons ? Math.round(completedCount / totalLearnerLessons * 100) : 0,
      lessons: courseLessons.length,
      quizzes: courseLessons.filter((lesson) => quizLessonIds.has(lesson.id)).length,
    }
  })
  const totalLearnerLessons = activeEnrollments.reduce((sum, enrollment) => sum + lessons.filter((lesson) => lesson.course_id === enrollment.course_id).length, 0)
  const completedLearnerLessons = activeEnrollments.reduce((sum, enrollment) => sum + lessons.filter((lesson) =>
    lesson.course_id === enrollment.course_id && progress.some((item) => item.student_id === enrollment.student_id && item.lesson_id === lesson.id && item.status === 'completed'),
  ).length, 0)
  const recentActivity = (activityResult.data ?? []).map((item) => ({
    id: item.id,
    activity_type: item.activity_type,
    occurred_at: item.occurred_at,
    display_name: firstRelation(item.profiles)?.display_name || 'Learner',
  }))

  return {
    students: (profilesResult.data ?? []).length,
    publishedCourses: courseRows.filter((course) => course.publication_status === 'published').length,
    activeEnrollments: activeEnrollments.length,
    completionPercentage: totalLearnerLessons ? Math.round(completedLearnerLessons / totalLearnerLessons * 100) : 0,
    courses,
    courseEditingConfigured,
    assignmentsConfigured,
    assignments: (assignmentsResult.data ?? []).map((assignment) => ({
      id: assignment.id,
      courseId: assignment.course_id,
      courseTitle: firstRelation(assignment.courses)?.title ?? 'Course',
      title: assignment.title,
      description: assignment.description,
      dueAt: assignment.due_at,
      submissions: (assignment.assignment_submissions ?? []).map((submission) => ({
        id: submission.id,
        studentName: firstRelation(submission.profiles)?.display_name || 'Student',
        submissionText: submission.submission_text,
        submittedAt: submission.submitted_at,
        grade: submission.grade === null ? null : Number(submission.grade),
        feedback: submission.feedback,
      })),
    })),
    courseReviews: (reviewsResult.data ?? []).map((review) => ({
      courseTitle: firstRelation(review.courses)?.title ?? 'Course',
      studentName: firstRelation(review.profiles)?.display_name || 'Student',
      rating: review.rating,
      review: review.review,
      createdAt: review.created_at,
    })),
    lessonOptions: lessons.filter((lesson) => !quizLessonIds.has(lesson.id)).map((lesson) => ({
      id: lesson.id,
      courseId: lesson.course_id,
      title: lesson.title,
    })),
    adminAccessRequestsConfigured,
    adminAccessRequests: (requestsResult.data ?? []).map((request) => ({
      userId: request.user_id,
      displayName: firstRelation(request.profiles)?.display_name || 'New account',
      requestedAt: request.requested_at,
    })),
    recentActivity,
    categories: categoriesResult.data ?? [],
  }
}

export async function createCourse(input: {
  title: string
  description: string
  categoryId: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  durationMinutes: number
}) {
  const { data: userData, error: userError } = await getSupabaseClient().auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Sign in as an administrator to create a course.')
  const slug = input.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!slug) throw new Error('Enter a course title containing letters or numbers.')
  const { data, error } = await getSupabaseClient().from('courses').insert({
    slug,
    title: input.title.trim(),
    description: input.description.trim(),
    category_id: input.categoryId,
    difficulty: input.difficulty,
    estimated_duration_minutes: input.durationMinutes,
    created_by: userData.user.id,
    publication_status: 'draft',
  }).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function createLesson(input: {
  courseId: string
  title: string
  description: string
  durationMinutes: number
}) {
  const { data: lessons, error: loadError } = await getSupabaseClient()
    .from('lessons')
    .select('level_order')
    .eq('course_id', input.courseId)
    .order('level_order', { ascending: false })
    .limit(1)
  if (loadError) throw loadError
  const { error } = await getSupabaseClient().from('lessons').insert({
    course_id: input.courseId,
    title: input.title.trim(),
    description: input.description.trim(),
    level_order: (lessons?.[0]?.level_order ?? 0) + 1,
    estimated_duration_minutes: input.durationMinutes,
    content: { sections: [{ heading: 'Lesson notes', body: input.description.trim() }] },
    content_type: 'text',
    publication_status: 'published',
  })
  if (error) throw error
}

export async function createCourseQuiz(input: {
  lessonId: string
  title: string
  passingPercentage: number
  questions: { prompt: string; options: { id: string; text: string }[]; answer: string; explanation: string }[]
}) {
  const { data, error } = await getSupabaseClient().rpc('create_admin_quiz', {
    p_lesson_id: input.lessonId,
    p_title: input.title.trim(),
    p_passing_percentage: input.passingPercentage,
    p_questions: input.questions,
    p_publish: true,
  })
  if (error) throw error
  if (typeof data !== 'string' || !data) throw new Error('The quiz service did not return a quiz ID.')
  return data
}

export async function updateCoursePublication(courseId: string, status: 'draft' | 'published' | 'archived') {
  const { error } = await getSupabaseClient().from('courses').update({ publication_status: status }).eq('id', courseId)
  if (error) throw error
}

export async function loadEnrolledCourseProgress(courseId: string) {
  const supabase = getSupabaseClient()
  const [enrollmentResult, lessonResult] = await Promise.all([
    supabase.from('enrollments').select('id, status').eq('course_id', courseId).eq('status', 'active').maybeSingle(),
    supabase.from('lessons').select('id, title, description, level_order, estimated_duration_minutes').eq('course_id', courseId).eq('publication_status', 'published').order('level_order'),
  ])
  if (enrollmentResult.error) throw enrollmentResult.error
  if (lessonResult.error) throw lessonResult.error
  if (!enrollmentResult.data) return { enrolled: false as const, lessons: [], completedLessonIds: [] as string[], inProgressLessonIds: [] as string[] }

  const lessons = (lessonResult.data ?? []) as LessonRecord[]
  const lessonIds = lessons.map((lesson) => lesson.id)
  if (!lessonIds.length) return { enrolled: true as const, lessons, completedLessonIds: [], inProgressLessonIds: [], prerequisites: [] as { lesson_id: string; prerequisite_lesson_id: string }[] }

  const [progressResult, prerequisiteResult] = await Promise.all([
    supabase.from('lesson_progress').select('lesson_id, status').in('lesson_id', lessonIds),
    supabase.from('lesson_prerequisites').select('lesson_id, prerequisite_lesson_id').in('lesson_id', lessonIds),
  ])
  if (progressResult.error) throw progressResult.error
  if (prerequisiteResult.error) throw prerequisiteResult.error

  return {
    enrolled: true as const,
    lessons,
    completedLessonIds: (progressResult.data ?? []).filter((item) => item.status === 'completed').map((item) => item.lesson_id),
    inProgressLessonIds: (progressResult.data ?? []).filter((item) => item.status === 'in_progress').map((item) => item.lesson_id),
    prerequisites: prerequisiteResult.data ?? [],
  }
}
