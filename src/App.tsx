import { lazy, Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getSupabaseClient } from './lib/supabase'
import {
  completeLesson, createAssignment, createCourse, createCourseQuiz, createLesson, enrollInCourse, gradeAssignment, hasLessonBookmark, loadAdminOverview, loadQuiz, loadCourseBookmarks,
  loadCourseBySlug, loadCourseReviewSummary, loadEnrolledCourseProgress, loadLessonNote, loadPublishedCourses, loadStudentAssignments, loadStudentDashboard, reviewAdminAccessRequest, saveCourseReview, saveLessonNote,
  setCourseBookmark, setLessonBookmark, startLesson, submitAssignment, submitQuiz, updateCourse, updateCoursePublication, type AdminOverview, type CourseRecord, type LessonDetails, type QuizDetails, type StudentAssignment, type StudentDashboardData,
} from './lib/learning'
import { AuthProvider, useAuth } from './auth/AuthContext'
import {
  Activity, ArrowDown, ArrowLeft, ArrowRight, BarChart3, BookOpen, Bookmark, Bot, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Code2, Compass, FileText, Flame,
  Home, Lightbulb, ListChecks, LockKeyhole, LogOut, Menu, MessageCircle, Play,
  Plus, Search, Send, Settings, ShieldCheck, Sparkles, Star, Target, Trophy, Users, X, Zap,
} from 'lucide-react'
import './App.css'

const AnalyticsPage = lazy(() => import('./AnalyticsPage'))

type Course = {
  id: string
  uuid?: string
  title: string
  category: string
  difficulty: string
  duration: string
  lessons: number
  rating?: string
  color: string
  icon: string
  description: string
  progress: number
}

const navItems = [
  { label: 'Dashboard', to: '/app', icon: Home },
  { label: 'My Courses', to: '/courses', icon: BookOpen },
  { label: 'Explore Skills', to: '/courses', icon: Compass },
  { label: 'AI Learning Coach', to: '/coach', icon: Bot },
  { label: 'Progress & Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Assignments', to: '/assignments', icon: FileText },
]

function Brand({ light = false }: { light?: boolean }) {
  return <Link className={`brand ${light ? 'brand-light' : ''}`} to="/"><span className="brand-mark"><Zap size={17} fill="currentColor" /></span><span>SkillQuest<span className="brand-ai"> AI</span></span></Link>
}

function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<EntryPage />} />
    <Route path="/about" element={<LandingPage />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/admin/login" element={<AuthPage mode="admin" />} />
    <Route path="/admin/register" element={<AuthPage mode="admin-register" />} />
    <Route path="/admin/requested" element={<AdminRequestStatusPage />} />
    <Route element={<RequireAuth><AppShell /></RequireAuth>}>
      <Route path="/app" element={<DashboardPage />} />
      <Route path="/courses" element={<CourseExplorer />} />
      <Route path="/courses/:courseId/map" element={<CourseMap />} />
      <Route path="/lesson/:lessonId" element={<LessonPage />} />
      <Route path="/quiz/:quizId" element={<QuizPage />} />
      <Route path="/coach" element={<CoachPage />} />
      <Route path="/analytics" element={<Suspense fallback={<div className="page-loading">Loading analytics…</div>}><AnalyticsPage /></Suspense>} />
      <Route path="/assignments" element={<AssignmentsPage />} />
      <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
    </Route>
    <Route path="*" element={<EntryPage />} />
  </Routes></AuthProvider></BrowserRouter>
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, profileLoading, profileError } = useAuth()
  const location = useLocation()
  if (loading) return <div className="full-page-state">Restoring your session…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (profileLoading) return <div className="full-page-state">Loading your account…</div>
  if (profileError) return <div className="full-page-state error-state"><h1>Account setup needs attention</h1><p>{profileError}</p><p>Apply the Supabase migration in <code>supabase/migrations</code>, then sign out and sign in again.</p><button className="button button-outline" onClick={() => void getSupabaseClient().auth.signOut()}>Sign out</button></div>
  return children
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  if (profile?.role !== 'admin') return <Navigate to="/app" replace />
  return children
}

function EntryPage() {
  return <main className="entry-page">
    <div className="entry-page-glow" aria-hidden="true" />
    <header className="entry-page-header"><Brand /></header>
    <section className="entry-page-content" aria-labelledby="entry-page-title">
      <span className="eyebrow"><Sparkles size={14} /> WELCOME TO SKILLQUEST</span>
      <h1 id="entry-page-title">How would you like to continue?</h1>
      <p className="entry-page-intro">Choose your account type to log in or get started.</p>
      <div className="entry-page-cards">
        <article className="entry-page-card">
          <span className="entry-page-icon student-icon"><BookOpen size={23} /></span>
          <span className="eyebrow">FOR LEARNERS</span>
          <h2>Student</h2>
          <p>Create a student account to explore courses, take quizzes, and track your learning progress.</p>
          <div className="entry-page-actions">
            <Link className="button button-primary" to="/register">Create student account <ArrowRight size={15} /></Link>
            <Link className="button button-outline" to="/login">Student log in</Link>
          </div>
        </article>
        <article className="entry-page-card">
          <span className="entry-page-icon admin-icon"><ShieldCheck size={23} /></span>
          <span className="eyebrow">FOR COURSE MANAGERS</span>
          <h2>Administrator</h2>
          <p>Log in to manage courses, lessons, quizzes, and student activity.</p>
          <div className="entry-page-actions">
            <Link className="button button-primary" to="/admin/login">Admin log in <ArrowRight size={15} /></Link>
            <Link className="entry-login" to="/admin/register">Create account and request admin access</Link>
            <small className="entry-admin-note">Admin access starts after approval by an existing admin.</small>
          </div>
        </article>
      </div>
      <Link className="entry-about-link" to="/about">Learn more about SkillQuest</Link>
    </section>
  </main>
}

function AdminRequestStatusPage() {
  return <main className="entry-page">
    <header className="entry-page-header"><Brand /></header>
    <section className="request-status-card">
      <span className="entry-page-icon admin-icon"><ShieldCheck size={23} /></span>
      <span className="eyebrow">ADMIN ACCESS REQUESTED</span>
      <h1>Your request is awaiting approval</h1>
      <p>Your account is created, but it does not have administrator access yet. An existing administrator must approve your request before you can sign in to the admin dashboard.</p>
      <div className="entry-page-actions"><Link className="button button-primary" to="/admin/login">Go to admin log in</Link><Link className="entry-login" to="/">Back to role selection</Link></div>
    </section>
  </main>
}

function LandingPage() {
  return <main className="landing">
    <header className="landing-nav wrap"><Brand /><nav><a href="#features">Features</a><a href="#skills">Explore skills</a><a href="#how">How it works</a></nav><div className="landing-actions"><Link className="button button-quiet" to="/login">Log in</Link><Link className="button button-primary" to="/register">Get started <ArrowRight size={16} /></Link></div><button className="icon-button mobile-menu" aria-label="Open menu"><Menu size={21} /></button></header>
    <section className="hero-section wrap">
      <div className="hero-copy"><span className="eyebrow"><Sparkles size={14} /> YOUR NEXT CHAPTER STARTS HERE</span><h1>Learn skills.<br /><span>Level up your future.</span></h1><p className="hero-intro">Big goals start with little wins. Build real-world skills one fun, focused level at a time — with a learning path that gets you.</p><section className="entry-options" aria-labelledby="entry-options-title"><h2 id="entry-options-title">Choose how you’ll use SkillQuest</h2><div className="entry-option-grid"><div className="entry-option student-entry"><span className="entry-option-icon"><BookOpen size={18} /></span><div><b>Student</b><small>Learn courses and track your progress</small></div><div className="entry-option-actions"><Link className="button button-primary button-small" to="/register">Create account</Link><Link className="entry-login" to="/login">Already have an account? Log in</Link></div></div><div className="entry-option admin-entry"><span className="entry-option-icon"><ShieldCheck size={18} /></span><div><b>Administrator</b><small>Manage courses, lessons, and quizzes</small></div><div className="entry-option-actions"><Link className="button button-outline button-small" to="/admin/login">Admin log in <ArrowRight size={14} /></Link><small className="admin-account-note">Admin accounts are set up by your system owner.</small></div></div></div></section><div className="hero-social"><div className="avatar-stack"><span>J</span><span>A</span><span>M</span><span>+</span></div><span><b>Small steps. Big skills.</b><br />Your own pace, your own path.</span></div></div>
      <div className="hero-art"><div className="hero-glow" /><div className="float-card float-card-top"><span className="float-icon fire"><Flame size={17} fill="currentColor" /></span><span><b>7 day streak!</b><small>You're on a roll</small></span></div><div className="hero-path"><div className="path-curve" /><div className="hero-level level-one"><span>🌱</span><small>Level 1</small></div><div className="hero-level level-two"><span>💡</span><small>Level 2</small></div><div className="hero-level level-three"><span>🚀</span><small>Level 3</small></div><div className="hero-level level-four"><span>🏆</span><small>Your goal</small></div><div className="hero-planet">✦</div><div className="hero-star star-a">✦</div><div className="hero-star star-b">✧</div><div className="hero-star star-c">✦</div></div><div className="float-card float-card-bottom"><span className="float-icon purple"><Zap size={16} fill="currentColor" /></span><span><b>+120 XP</b><small>One lesson closer</small></span></div></div>
    </section>
    <section className="trust-strip"><div className="wrap trust-inner"><span>MADE FOR CURIOUS MINDS</span><div><Code2 size={17} /> Tech skills</div><div><MessageCircle size={17} /> People skills</div><div><Target size={17} /> Your goals</div><div><ShieldCheck size={17} /> Your pace</div></div></section>
    <section className="section wrap" id="features"><div className="section-heading"><span className="eyebrow">LEARNING, WITH A LITTLE MORE JOY</span><h2>Progress you can <span>feel.</span></h2><p>Everything you need to stay curious, keep showing up, and see how far you've come.</p></div><div className="feature-grid"><FeatureCard icon={<ListChecks />} number="01" title="A path that makes sense" text="Clear, bite-sized lessons turn big topics into a series of doable next steps." color="purple" /><FeatureCard icon={<Trophy />} number="02" title="A little win, every day" text="Collect XP, earn badges, and celebrate progress as you move through each course." color="yellow" /><FeatureCard icon={<Bot />} number="03" title="A coach in your corner" text="Get thoughtful guidance and encouragement whenever you hit a tricky concept." color="mint" /></div></section>
    <section className="section skill-section" id="skills"><div className="wrap"><div className="section-heading section-heading-row"><div><span className="eyebrow">FIND YOUR NEXT ADVENTURE</span><h2>Skills for <span>where you're going.</span></h2></div><Link className="text-link" to="/courses">Explore all courses <ArrowRight size={16} /></Link></div><LandingCoursePreview /></div></section>
    <section className="journey-section" id="how"><div className="wrap journey-inner"><div><span className="eyebrow">YOUR JOURNEY, YOUR WAY</span><h2>One small step.<br /><span>A whole new skillset.</span></h2><p>Pick a goal, follow your path, and watch your confidence grow. No pressure to be perfect. Just keep going.</p><Link className="button button-primary" to="/register">Take your first step <ArrowRight size={16} /></Link></div><div className="journey-steps"><JourneyStep n="1" title="Choose what excites you" text="Explore courses built around real skills and your real goals." /><JourneyStep n="2" title="Learn in little moments" text="A few focused minutes can move you further than you think." /><JourneyStep n="3" title="Celebrate every level" text="See your progress, earn your XP, and find out what's next." /></div></div></section>
    <footer className="landing-footer wrap"><Brand /><span>Made for curious minds, one level at a time.</span><Link to="/admin/login">Admin sign in</Link></footer>
  </main>
}

function FeatureCard({ icon, number, title, text, color }: { icon: ReactNode; number: string; title: string; text: string; color: string }) {
  return <article className="feature-card"><div className={`feature-icon ${color}`}>{icon}</div><span className="feature-number">{number}</span><h3>{title}</h3><p>{text}</p></article>
}

function JourneyStep({ n, title, text }: { n: string; title: string; text: string }) {
  return <div className="journey-step"><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div></div>
}

function LandingCoursePreview() {
  const [courseList, setCourseList] = useState<Course[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void loadPublishedCourses().then((records) => {
      if (active) setCourseList(records.slice(0, 3).map(courseFromRecord))
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load courses.')
    })
    return () => { active = false }
  }, [])
  return <><div className="skill-pills"><span className="skill-pill active"><Code2 size={16} /> Courses</span><span className="skill-pill"><MessageCircle size={16} /> Updated from the live catalog</span></div>{error ? <div className="inline-notice" role="status">The course catalog is temporarily unavailable.</div> : courseList.length ? <div className="course-grid landing-courses">{courseList.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <div className="empty-state"><BookOpen size={23} /><h3>No courses published yet</h3><p>Published learning paths will appear here.</p></div>}</>
}

function AuthPage({ mode }: { mode: 'login' | 'register' | 'admin' | 'admin-register' }) {
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const isAdmin = mode === 'admin'
  const isAdminRegistration = mode === 'admin-register'
  const isAdminPortal = isAdmin || isAdminRegistration
  const isRegister = mode === 'register' || isAdminRegistration
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const submittedEmail = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const displayName = String(form.get('displayName') ?? '').trim()

    try {
      const supabase = getSupabaseClient()

      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: submittedEmail,
          password,
          options: { data: { display_name: displayName, request_admin_access: isAdminRegistration } },
        })
        if (error) throw error

        if (!data.user) {
          throw new Error('Registration did not return an account. Please try again.')
        }
        if (!data.session) {
          setEmail(submittedEmail)
          setMessageType('success')
          setMessage(isAdminRegistration
            ? 'Your account and admin request were created, but this Supabase project requires email confirmation before sign-in. Confirm the email sent to your inbox, or ask the project owner to turn off Authentication → Providers → Email → Confirm email. Admin sign-in also requires approval by an existing admin.'
            : 'Your account was created, but this Supabase project requires email confirmation before sign-in. Confirm the email sent to your inbox, or ask the project owner to turn off Authentication → Providers → Email → Confirm email.')
          return
        }
        navigate(isAdminRegistration ? '/admin/requested' : '/app', { replace: true })
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: submittedEmail, password })
      if (error) throw error
      if (!data.user) throw new Error('Sign in did not return an account. Please try again.')

      if (isAdmin) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()

        if (profileError) {
          await supabase.auth.signOut()
          throw new Error(`Could not verify administrator access: ${profileError.message}`)
        }
        if (profile?.role !== 'admin') {
          await supabase.auth.signOut()
          throw new Error('This account is registered as a student, not an administrator. If this is the first admin account, the Supabase project owner must run the one-time admin setup SQL in README.md. Otherwise, an existing admin must approve your access request.')
        }
        navigate('/admin', { replace: true })
        return
      }

      navigate('/app', { replace: true })
    } catch (error) {
      setMessageType('error')
      const errorMessage = error instanceof Error ? error.message : ''
      if (/email rate limit exceeded|over_email_send_rate_limit/i.test(errorMessage)) {
        setMessage('Supabase has temporarily limited signup emails. If email confirmation is on, wait until the limit resets or configure custom SMTP in Supabase. If you already turned confirmation off, check Authentication → Providers → Email and try again later.')
      } else {
        setMessage(errorMessage || 'Authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset() {
    setMessage('')
    setLoading(true)
    try {
      if (!email.trim()) throw new Error('Enter your email address first.')
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) throw error
      setMessageType('success')
      setMessage('If an account exists for that email, a password-reset link has been sent.')
    } catch (error) {
      setMessageType('error')
      setMessage(error instanceof Error ? error.message : 'Could not send the password-reset email.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page">
    <Link to="/" className="auth-back"><ArrowLeft size={16} /> Back to home</Link>
    <div className="auth-art"><Brand light /><div className="auth-art-copy"><div className="auth-orbit">✦</div><span className="eyebrow">A LITTLE PROGRESS GOES A LONG WAY</span><h1>Your next big thing<br />starts <em>right here.</em></h1><p>Follow your curiosity. Find your rhythm. Surprise yourself with what you can do.</p><div className="auth-art-levels"><span>🌱</span><i /><span>💡</span><i /><span>🚀</span><i /><span>🏆</span></div></div><small>LEARN AT YOUR PACE · GROW YOUR WAY</small></div>
    <section className="auth-panel"><div className="auth-card"><div className="auth-logo"><span className="brand-mark"><Zap size={17} fill="currentColor" /></span></div><span className="eyebrow">{isAdminPortal ? 'ADMIN PORTAL' : 'YOUR LEARNING JOURNEY'}</span><h2>{isAdmin ? 'Admin sign in' : isAdminRegistration ? 'Request admin access' : isRegister ? 'Create your account' : 'Welcome back'}</h2><p>{isAdmin ? 'Sign in with your approved administrator account.' : isAdminRegistration ? 'Create an account and send an access request to the existing administrators.' : isRegister ? 'Your next level is closer than you think.' : 'Sign in and pick up right where you left off.'}</p>
      {!isAdminPortal && <div className="auth-switch"><Link className={!isRegister ? 'selected' : ''} to="/login">Student</Link><Link className={isRegister ? 'selected' : ''} to="/register">Create account</Link></div>}
      <form onSubmit={handleSubmit}>
        {isRegister && <label>Your name<input required name="displayName" placeholder="e.g. Priya Sharma" autoComplete="name" /></label>}
        <label>Email address<input required name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
        <label>Password<input required name="password" type="password" minLength={8} placeholder="At least 8 characters" autoComplete={isRegister ? 'new-password' : 'current-password'} /></label>
        {isRegister && <label className="check-label"><input required type="checkbox" /> I agree to the terms and privacy policy.</label>}
        {!isRegister && !isAdmin && <div className="form-extra"><label className="check-label"><input type="checkbox" /> Remember me</label><button type="button" className="text-button" onClick={handlePasswordReset} disabled={loading}>Forgot password?</button></div>}
        <button className="button button-primary auth-submit" type="submit" disabled={loading} aria-busy={loading}>{loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} {!loading && <ArrowRight size={16} />}</button>
      </form>
      {message && <div className={`inline-notice ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}
      {!isAdminPortal && !isRegister && <div className="auth-foot">New to SkillQuest? <Link to="/register">Create an account <ArrowRight size={14} /></Link></div>}
      {isAdmin && <div className="auth-foot">Need an account? <Link to="/admin/register">Request admin access <ArrowRight size={14} /></Link></div>}
      {isAdminPortal && <div className="security-note"><ShieldCheck size={17} /> Admin privileges are granted only after approval by an existing administrator.</div>}
    </div></section>
  </main>
}

function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const pageLabel = location.pathname.startsWith('/admin') ? 'Admin dashboard' : navItems.find((item) => item.to === location.pathname)?.label ?? (location.pathname.includes('/map') ? 'Course map' : location.pathname.includes('/lesson') ? 'Lesson' : location.pathname.includes('/quiz') ? 'Quiz' : 'Learning')
  const displayName = profile?.display_name || user?.email || 'Learner'
  const initials = displayName.slice(0, 1).toUpperCase()
  return <div className="app-layout"><aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}><div className="sidebar-top"><Brand /><button className="icon-button sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18} /></button></div><div className="sidebar-section-label">LEARNING SPACE</div><nav className="side-nav">{navItems.map(({ label, to, icon: Icon }, index) => <NavLink key={`${label}-${index}`} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `side-link ${isActive && (to !== '/courses' || index === 1) ? 'active' : ''}`}><Icon size={17} /><span>{label}</span>{label === 'AI Learning Coach' && <span className="new-dot" />}</NavLink>)}</nav>{profile?.role === 'admin' && <><div className="sidebar-section-label admin-label">WORKSPACE</div><NavLink to="/admin" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><ShieldCheck size={17} /><span>Admin dashboard</span></NavLink></>}<div className="sidebar-bottom"><button type="button" className="profile-link profile-button" onClick={() => { void signOut().catch((error: unknown) => setSignOutError(error instanceof Error ? error.message : 'Could not sign out.')) }}><span className="profile-avatar">{initials}</span><span className="profile-text"><b>{displayName}</b><small>{profile?.role === 'admin' ? 'Administrator' : 'Student account'}</small></span><LogOut size={16} /></button>{signOutError && <span className="signout-error" role="alert">{signOutError}</span>}</div></aside><div className="app-main"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumbs"><span>SkillQuest</span><ChevronRight size={14} /><b>{pageLabel}</b></div><div className="topbar-right"><span className="topbar-avatar">{initials}</span></div></header><div className="page-content"><Outlet /></div></div>{menuOpen && <button aria-label="Close navigation overlay" className="mobile-scrim" onClick={() => setMenuOpen(false)} />}</div>
}

function PageTitle({ kicker, title, subtitle, action }: { kicker?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="page-title"><div>{kicker && <span className="eyebrow">{kicker}</span>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>
}

function MetricCard({ icon, label, value, detail, color }: { icon: ReactNode; label: string; value: string; detail: string; color: string }) {
  return <div className="metric-card"><div className={`metric-icon ${color}`}>{icon}</div><div className="metric-label">{label}</div><b className="metric-value">{value}</b><span className="metric-detail">{detail}</span></div>
}

function DashboardPage() {
  const { profile, user } = useAuth()
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (!user) return
    void loadStudentDashboard(user.id).then((data) => {
      if (active) setDashboard(data)
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load your learning data.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id])

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Learner'
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  if (loading) return <div className="loading-card">Loading your learning data…</div>
  if (error) return <div className="error-banner" role="alert">Couldn’t load your dashboard: {error}<button className="text-button" onClick={() => window.location.reload()}>Retry</button></div>
  if (!dashboard) return null
  const featured = dashboard.continueCourse ? courseFromRecord(dashboard.continueCourse) : null
  const goalDone = dashboard.dailyLessonsCompleted >= 1
  return <div className="page-stack">
    <div className="welcome-banner"><div><span className="eyebrow">{today.toUpperCase()}</span><h1>Welcome, {displayName} <span>☀️</span></h1><p>Every small step adds up. Ready to make today count?</p></div><div className="welcome-illustration"><div className="welcome-sun">☀</div><div className="welcome-hill hill-back" /><div className="welcome-hill hill-front" /><span className="welcome-plant">🌱</span></div></div>
    <div className="metric-grid"><MetricCard icon={<Flame size={18} />} label="Current streak" value={`${dashboard.currentStreak} days`} detail="Based on your learning activity" color="orange" /><MetricCard icon={<Zap size={18} />} label="Total XP" value={dashboard.xp.toLocaleString()} detail="Earned from completed learning" color="violet" /><MetricCard icon={<Trophy size={18} />} label="Courses completed" value={String(dashboard.completedCourses)} detail="From your enrollments" color="yellow" /><MetricCard icon={<Target size={18} />} label="Overall progress" value={`${dashboard.completionPercentage}%`} detail={`${dashboard.completedLessons} of ${dashboard.totalLessons} lessons`} color="mint" /></div>
    <div className="dashboard-grid">
      <section className="panel continue-panel"><div className="panel-head"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Continue learning</h2></div><Link className="text-link" to="/courses">All courses <ArrowRight size={15} /></Link></div>{featured && dashboard.continueLesson ? <CourseContinue course={featured} progress={dashboard.continueCourseProgress} lessonTitle={dashboard.continueLesson.title} lessonId={dashboard.continueLesson.id} /> : <div className="empty-state"><BookOpen size={23} /><h3>Your first course is waiting</h3><p>Enroll in a course to start building your learning path.</p><Link to="/courses" className="text-link">Explore courses <ArrowRight size={14} /></Link></div>}</section>
      <section className="panel goal-panel"><div className="panel-head"><div><span className="eyebrow">A LITTLE EVERY DAY</span><h2>Today's goal</h2></div><Target className="panel-head-icon" size={18} /></div><div className="goal-progress"><div><span>Complete one lesson</span><b>{Math.min(dashboard.dailyLessonsCompleted, 1)} / 1</b></div><div className="progress-track"><span style={{ width: goalDone ? '100%' : '0%' }} /></div></div>{dashboard.continueLesson && featured ? <Link className={`goal-task ${goalDone ? 'complete' : ''}`} to={`/lesson/${dashboard.continueLesson.id}`}><span className="task-check">{goalDone && <Check size={13} />}</span><span><b>{dashboard.continueLesson.title}</b><small>{goalDone ? 'Done for today — nice work!' : 'Continue this lesson'}</small></span><ChevronRight size={17} /></Link> : <div className="goal-task"><span className="task-check" /><span><b>No active lesson yet</b><small>Enroll in a course to set a daily goal.</small></span><ChevronRight size={17} /></div>}</section>
    </div>
    <section className="dashboard-catalog"><div className="panel-head"><div><span className="eyebrow">FRESHLY PUBLISHED</span><h2>More courses to explore</h2></div><Link className="text-link" to="/courses">Browse catalog <ArrowRight size={15} /></Link></div>{dashboard.recommendedCourses.length ? <div className="course-grid">{dashboard.recommendedCourses.map((record) => <CourseCard key={record.id} course={courseFromRecord(record)} />)}</div> : <div className="empty-state"><BookOpen size={23} /><h3>You’ve explored every course</h3><p>Check back later for new courses from your learning team.</p></div>}</section>
    <div className="dashboard-grid lower-grid"><section className="panel explore-panel"><div className="panel-head"><div><span className="eyebrow">FIND YOUR NEXT SKILL</span><h2>Explore skills</h2></div><Link className="text-link" to="/courses">Browse all <ArrowRight size={15} /></Link></div><div className="skill-category-grid"><Link to="/courses" className="category-tile category-blue"><span><Code2 size={20} /></span><b>Technical skills</b><small>Build things that work</small></Link><Link to="/courses" className="category-tile category-coral"><span><MessageCircle size={20} /></span><b>People skills</b><small>Make ideas matter</small></Link></div></section><section className="panel recommendations-panel"><div className="panel-head"><div><span className="eyebrow">A THOUGHTFUL NEXT STEP</span><h2>Just for you</h2></div><Sparkles className="panel-head-icon purple-text" size={18} /></div>{dashboard.averageQuizScore !== null ? <div className="recommendation-row"><span className="recommendation-icon purple"><ListChecks size={17} /></span><span><b>Quiz average: {dashboard.averageQuizScore}%</b><small>Calculated from your submitted attempts</small></span></div> : <div className="recommendation-row"><span className="recommendation-icon purple"><BookOpen size={17} /></span><span><b>No quiz results yet</b><small>Take a course quiz to see your results here</small></span></div>}<Link className="recommendation-row" to="/coach"><span className="recommendation-icon mint"><Bot size={17} /></span><span><b>Ask your learning coach</b><small>Open the coach to see current availability</small></span><ChevronRight size={16} /></Link></section></div>
  </div>
}

function AssignmentsPage() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    if (!user) return
    void loadStudentAssignments().then((items) => {
      if (!active) return
      setAssignments(items)
      setDrafts(Object.fromEntries(items.map((item) => [item.id, item.submission?.submissionText ?? ''])))
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load assignments.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id])

  async function submit(event: FormEvent<HTMLFormElement>, assignmentId: string) {
    event.preventDefault()
    setBusyId(assignmentId)
    setError('')
    setNotice('')
    try {
      await submitAssignment(assignmentId, drafts[assignmentId] ?? '')
      const refreshed = await loadStudentAssignments()
      setAssignments(refreshed)
      setDrafts(Object.fromEntries(refreshed.map((item) => [item.id, item.submission?.submissionText ?? ''])))
      setNotice('Your assignment has been submitted.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit this assignment.')
    } finally {
      setBusyId('')
    }
  }

  if (loading) return <div className="loading-card">Loading your assignments…</div>
  return <div className="page-stack">
    <PageTitle kicker="PRACTICE WHAT YOU’VE LEARNED" title="My assignments" subtitle="Submit your work and check your instructor’s feedback." />
    {error && <div className="inline-notice error" role="alert">{error}</div>}
    {notice && <div className="inline-notice success" role="status">{notice}</div>}
    {assignments.length ? assignments.map((assignment) => {
      const isGraded = assignment.submission?.grade !== null && assignment.submission?.grade !== undefined
      return <section className="panel assignment-card" key={assignment.id}>
        <div className="panel-head"><div><span className="eyebrow">{assignment.courseTitle}</span><h2>{assignment.title}</h2></div>{assignment.dueAt && <span className="assignment-due">Due {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(assignment.dueAt))}</span>}</div>
        <p className="assignment-description">{assignment.description}</p>
        {isGraded && <div className="assignment-grade"><b>Grade: {assignment.submission?.grade}%</b>{assignment.submission?.feedback && <p>{assignment.submission.feedback}</p>}</div>}
        <form onSubmit={(event) => void submit(event, assignment.id)}><label className="assignment-response-label">{assignment.submission ? 'Your response' : 'Write your response'}<textarea required maxLength={10000} rows={5} disabled={Boolean(isGraded) || busyId === assignment.id} value={drafts[assignment.id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="Enter your assignment response…" /></label>{assignment.submission && !isGraded && <small className="assignment-status">Submitted {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(assignment.submission.submittedAt))} · You can update before grading.</small>}<button className="button button-primary button-small" type="submit" disabled={Boolean(isGraded) || busyId === assignment.id || !drafts[assignment.id]?.trim()}>{busyId === assignment.id ? 'Submitting…' : assignment.submission ? 'Update submission' : 'Submit assignment'}</button></form>
      </section>
    }) : <div className="empty-state"><FileText size={24} /><h3>No assignments yet</h3><p>Assignments for courses you’ve enrolled in will appear here.</p><Link to="/courses" className="text-link">Explore courses <ArrowRight size={14} /></Link></div>}
  </div>
}

function CourseContinue({ course, progress, lessonTitle, lessonId }: { course: Course; progress: number; lessonTitle: string; lessonId: string }) {
  return <div className="continue-course"><Link to={`/lesson/${lessonId}`} className={`course-cover cover-${course.color}`}><span className="course-emoji">{course.icon}</span><span className="cover-decoration">✦</span><span className="cover-label">YOUR LEARNING PATH</span></Link><div className="continue-info"><div className="course-meta"><span>{course.category}</span><span>·</span><span>Level {course.progress || 1}</span></div><h3>{course.title}</h3><p>{lessonTitle}</p><div className="continue-bottom"><div className="inline-progress"><span><i style={{ width: `${progress}%` }} /></span><b>{progress}%</b></div><Link to={`/lesson/${lessonId}`} className="button button-primary button-small">Continue <ArrowRight size={14} /></Link></div></div></div>
}

function CourseExplorer() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All skills')
  const [difficulty, setDifficulty] = useState('Any level')
  const [sort, setSort] = useState('Popular')
  const [saved, setSaved] = useState<string[]>([])
  const [bookmarkBusy, setBookmarkBusy] = useState<string | null>(null)
  const [courseList, setCourseList] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    void Promise.all([loadPublishedCourses(), loadCourseBookmarks()])
      .then(([records, bookmarks]) => {
        if (!active) return
        setCourseList(records.map(courseFromRecord))
        setSaved(bookmarks)
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load courses.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = courseList
    .filter((course) => course.title.toLowerCase().includes(query.toLowerCase()) || course.description.toLowerCase().includes(query.toLowerCase()))
    .filter((course) => category === 'All skills' || course.category === category)
    .filter((course) => difficulty === 'Any level' || course.difficulty === difficulty)
    .sort((a, b) => sort === 'Difficulty'
      ? a.difficulty.localeCompare(b.difficulty) || a.title.localeCompare(b.title)
      : sort === 'Title'
        ? a.title.localeCompare(b.title)
        : Number(b.rating) - Number(a.rating))
  const categories = [...new Set(courseList.map((course) => course.category))].sort()

  async function toggleBookmark(course: Course) {
    if (!course.uuid) return
    const courseUuid = course.uuid
    const isSaved = saved.includes(courseUuid)
    setBookmarkBusy(course.id)
    setLoadError('')
    try {
      await setCourseBookmark(courseUuid, !isSaved)
      setSaved((previous) => isSaved ? previous.filter((id) => id !== courseUuid) : [...previous, courseUuid])
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Could not update bookmark.')
    } finally {
      setBookmarkBusy(null)
    }
  }
  return <div className="page-stack">
    <PageTitle kicker="FIND YOUR NEXT ADVENTURE" title="Explore courses" subtitle="Curiosity looks good on you. Find a skill that feels like your next step." />
    {loadError && <div className="error-banner" role="alert"><span>Couldn’t load courses: {loadError}</span><button className="text-button" onClick={() => window.location.reload()}>Try again</button></div>}
    <section className="explore-toolbar">
      <label className="search-input"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses, skills, or topics..." /></label>
      <label className="filter-select"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All skills</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label>
      <label className="filter-select"><span>Level</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Any level</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><ChevronDown size={14} /></label>
    </section>
    <div className="course-results-head">
      <span>{loading ? 'Loading published courses…' : <><b>{filtered.length}</b> published courses</>}</span>
      <label className="sort-button"><span>Sort:</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Popular</option><option>Difficulty</option><option>Title</option></select><ChevronDown size={14} /></label>
    </div>
    {loading ? <div className="loading-card">Loading courses from your learning catalog…</div> : filtered.length
      ? <div className="course-grid">{filtered.map((course) => <CourseCard key={course.id} course={course} saved={Boolean(course.uuid && saved.includes(course.uuid))} bookmarkBusy={bookmarkBusy === course.id} onSave={() => { void toggleBookmark(course) }} />)}</div>
      : loadError ? null : courseList.length === 0 ? <div className="empty-state"><BookOpen size={25} /><h3>No published courses yet</h3><p>Published courses will appear here when your learning catalog is ready.</p></div> : <div className="empty-state"><Search size={25} /><h3>No courses found</h3><p>Try a different search or filter.</p><button className="text-button" onClick={() => { setQuery(''); setCategory('All skills'); setDifficulty('Any level') }}>Clear filters</button></div>}
  </div>
}

function courseFromRecord(record: CourseRecord): Course {
  const category = record.category.toLowerCase()
  const color = category.includes('program') || category.includes('technical') ? 'blue' : 'coral'
  return {
    id: record.slug,
    uuid: record.id,
    title: record.title,
    category: record.category,
    difficulty: `${record.difficulty[0].toUpperCase()}${record.difficulty.slice(1)}`,
    duration: record.durationMinutes ? `${Math.floor(record.durationMinutes / 60)}h ${record.durationMinutes % 60}m` : 'Self-paced',
    lessons: 0,
    color,
    icon: category.includes('program') ? '💻' : '💬',
    description: record.description,
    progress: 0,
  }
}

function resourceHost(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.hostname : 'Resource link'
  } catch {
    return 'Resource link'
  }
}

function CourseCard({ course, saved = false, bookmarkBusy = false, onSave }: { course: Course; saved?: boolean; bookmarkBusy?: boolean; onSave?: () => void }) {
  return <article className="course-card"><div className={`course-card-art cover-${course.color}`}><span className="course-art-emoji">{course.icon}</span><span className="art-spark">✦</span><span className="course-level-tag">{course.difficulty}</span>{onSave && <button className={`save-course ${saved ? 'saved' : ''}`} aria-label={saved ? 'Remove bookmark' : 'Bookmark course'} disabled={bookmarkBusy} onClick={onSave}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} /></button>}</div><div className="course-card-content"><div className="course-meta"><span>{course.category}</span></div><h3>{course.title}</h3><p>{course.description}</p><div className="course-facts"><span><Clock3 size={14} />{course.duration}</span>{course.lessons > 0 && <span><BookOpen size={14} />{course.lessons} levels</span>}{course.rating && <span><Star size={14} fill="currentColor" />{course.rating}</span>}</div><Link to={`/courses/${course.id}/map`} className="course-cta">Explore course<ArrowRight size={15} /></Link></div></article>
}

function CourseMap() {
  const { courseId = 'python' } = useParams()
  const navigate = useNavigate()
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof loadEnrolledCourseProgress>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function refreshMap() {
    setLoading(true)
    setError('')
    try {
      const record = await loadCourseBySlug(courseId)
      if (!record) throw new Error('This course could not be found or is no longer published.')
      setCourse(courseFromRecord(record))
      setProgress(await loadEnrolledCourseProgress(record.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load this course.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refreshMap() }, [courseId])

  async function handleEnroll() {
    if (!course) return
    setBusy(true)
    setError('')
    try {
      const record = await loadCourseBySlug(courseId)
      if (!record) throw new Error('This course is not available.')
      await enrollInCourse(record.id)
      await refreshMap()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not enroll in this course.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page-stack"><div className="loading-card">Loading course and your saved progress…</div></div>
  if (error && !course) return <div className="page-stack"><button className="back-link" onClick={() => navigate('/courses')}><ArrowLeft size={15} /> All courses</button><div className="error-banner" role="alert">{error}<button className="text-button" onClick={() => void refreshMap()}>Retry</button></div></div>
  if (!course || !progress) return null
  if (!progress.enrolled) return <div className="page-stack">
    <button className="back-link" onClick={() => navigate('/courses')}><ArrowLeft size={15} /> All courses</button>
    <div className="map-header"><div><span className="eyebrow">YOUR LEARNING PATH</span><h1>{course.title}</h1><p>{course.description}</p></div><button className="button button-primary" onClick={() => void handleEnroll()} disabled={busy}>{busy ? 'Enrolling…' : 'Enroll to start'} <ArrowRight size={15} /></button></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="empty-state"><BookOpen size={25} /><h3>Ready when you are</h3><p>Enroll in this course to save your progress and unlock the learning map.</p></div>
  </div>

  const completed = new Set(progress.completedLessonIds)
  const inProgress = new Set(progress.inProgressLessonIds)
  const prerequisites = progress.prerequisites
  const statusFor = (lessonId: string) => {
    if (completed.has(lessonId)) return 'completed'
    if (inProgress.has(lessonId)) return 'in-progress'
    const required = (prerequisites ?? []).filter((item) => item.lesson_id === lessonId)
    return required.every((item) => completed.has(item.prerequisite_lesson_id)) ? 'unlocked' : 'locked'
  }
  const completedCount = completed.size
  const completionPercentage = progress.lessons.length ? Math.round(completedCount / progress.lessons.length * 100) : 0
  const selectedLesson = selectedLevel === null ? null : progress.lessons[selectedLevel]

  return <div className="page-stack">
    <button className="back-link" onClick={() => navigate('/courses')}><ArrowLeft size={15} /> All courses</button>
    <div className="map-header"><div><span className="eyebrow">YOUR LEARNING PATH</span><h1>{course.title}</h1><p>{course.description}</p></div><div className="map-progress-card"><span className={`map-course-icon cover-${course.color}`}>{course.icon}</span><div><b>{completedCount} of {progress.lessons.length} levels</b><small>Progress saved to your account</small><div className="progress-track"><span style={{ width: `${completionPercentage}%` }} /></div></div><span className="map-progress-pct">{completionPercentage}%</span></div></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <><div className="map-legend"><span><i className="legend-dot completed" /> Completed</span><span><i className="legend-dot in-progress" /> In progress</span><span><i className="legend-dot unlocked" /> Ready to start</span><span><i className="legend-dot locked" /> Locked by prerequisites</span></div><div className="learning-map"><svg className="map-path-svg" viewBox="0 0 800 1900" preserveAspectRatio="none" aria-hidden="true"><path d="M405 95 C600 180 610 240 400 285 C180 330 190 420 400 475 C610 530 610 610 400 665 C190 720 190 800 400 855 C610 910 610 990 400 1045 C190 1100 190 1180 400 1235 C610 1290 610 1370 400 1425 C190 1480 190 1560 400 1615 C610 1670 610 1750 400 1805" fill="none" stroke="#ded8fa" strokeWidth="13" strokeLinecap="round" strokeDasharray="1 1" /><path d="M405 95 C600 180 610 240 400 285 C180 330 190 420 400 475 C610 530 610 610 400 665 C190 720 190 800 400 855 C610 910 610 990 400 1045 C190 1100 190 1180 400 1235 C610 1290 610 1370 400 1425 C190 1480 190 1560 400 1615 C610 1670 610 1750 400 1805" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 13" /></svg><div className="map-start-banner"><span>🌼</span><div><b>A lovely day to learn something new</b><small>Complete levels to unlock the next step.</small></div><Sparkles size={18} /></div><div className="level-list">{progress.lessons.map((lesson, index) => {
      const status = statusFor(lesson.id)
      return <div className={`level-row row-${index}`} key={lesson.id}>
        <button className={`level-node ${status}`} aria-label={`Level ${lesson.level_order}: ${lesson.title}, ${status}`} disabled={status === 'locked'} onClick={() => setSelectedLevel(index)}><span className="node-icon">{status === 'completed' ? <Check size={24} strokeWidth={3} /> : status === 'locked' ? <LockKeyhole size={20} /> : status === 'in-progress' ? <Play size={22} fill="currentColor" /> : <span>{lesson.level_order}</span>}</span><span className="node-number">LEVEL {String(lesson.level_order).padStart(2, '0')}</span></button>
        <button className={`level-label ${status === 'locked' ? 'muted' : ''}`} disabled={status === 'locked'} onClick={() => setSelectedLevel(index)}><span>{lesson.title}</span><small>{status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In progress · continue learning' : status === 'unlocked' ? 'Ready when you are' : 'Complete the prerequisite levels to unlock'}</small></button>
        <div className="level-stars">{status === 'completed' ? <><Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" /></> : <><Star /><Star /><Star /></>}</div>
      </div>
    })}</div><div className="map-end-card"><Trophy size={21} /><div><b>Your next milestone: {progress.lessons[progress.lessons.length - 1]?.title ?? 'Course complete'}</b><small>Progress stays with your account.</small></div><ArrowDown size={17} /></div></div><div className="map-note"><CircleHelp size={16} /><span>Level availability is validated by the learning service when a lesson starts.</span></div></>
    <CourseReviews courseId={course.uuid ?? ''} />
    {selectedLesson && <div className="modal-scrim" role="presentation" onClick={() => setSelectedLevel(null)}><div className="level-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="icon-button modal-close" onClick={() => setSelectedLevel(null)} aria-label="Close"><X size={19} /></button><span className="eyebrow">LEVEL {String(selectedLesson.level_order).padStart(2, '0')}</span><h2>{selectedLesson.title}</h2><p>{selectedLesson.description}</p><div className="modal-facts"><span><Clock3 size={15} /> {selectedLesson.estimated_duration_minutes} min</span><span><FileText size={15} /> Lesson notes</span><span><ListChecks size={15} /> Quick quiz</span></div><Link className="button button-primary modal-start" to={`/lesson/${selectedLesson.id}`} onClick={() => setSelectedLevel(null)}>Open level <ArrowRight size={16} /></Link></div></div>}
  </div>
}

function CourseReviews({ courseId }: { courseId: string }) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof loadCourseReviewSummary>> | null>(null)
  const [rating, setRating] = useState('5')
  const [review, setReview] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    void loadCourseReviewSummary(courseId).then((data) => {
      if (!active) return
      setSummary(data)
      setRating(String(data.ownReview?.rating ?? 5))
      setReview(data.ownReview?.review ?? '')
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load course reviews.')
    })
    return () => { active = false }
  }, [courseId])

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await saveCourseReview(courseId, Number(rating), review)
      setSummary(await loadCourseReviewSummary(courseId))
      setNotice('Your course review has been saved.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your review.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="panel course-review-panel">
    <div className="panel-head"><div><span className="eyebrow">STUDENT FEEDBACK</span><h2>Course reviews</h2></div><span className="review-average"><Star size={15} fill="currentColor" /> {summary?.average ?? '—'} <small>({summary?.count ?? 0})</small></span></div>
    <p className="review-description">You’re enrolled—share a rating and help other students decide if this course is right for them.</p>
    {error && <div className="inline-notice error" role="alert">{error}</div>}
    {notice && <div className="inline-notice success" role="status">{notice}</div>}
    <form className="review-form" onSubmit={(event) => void saveReview(event)}>
      <label>Rating<select value={rating} onChange={(event) => setRating(event.target.value)}>{[5, 4, 3, 2, 1].map((stars) => <option key={stars} value={stars}>{stars} star{stars > 1 ? 's' : ''}</option>)}</select></label>
      <label>Your review<textarea value={review} onChange={(event) => setReview(event.target.value)} maxLength={2000} rows={3} placeholder="What did you think of this course?" /></label>
      <button className="button button-primary button-small" disabled={busy}>{busy ? 'Saving…' : summary?.ownReview ? 'Update review' : 'Post review'}</button>
    </form>
  </section>
}

function LessonPage() {
  const { lessonId = '' } = useParams()
  const [tab, setTab] = useState('Lesson')
  const [complete, setComplete] = useState(false)
  const [lesson, setLesson] = useState<LessonDetails | null>(null)
  const [note, setNote] = useState('')
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void (async () => {
      const loadedLesson = await startLesson(lessonId)
      const [savedNote, savedBookmark] = await Promise.all([loadLessonNote(lessonId), hasLessonBookmark(lessonId)])
      if (!active) return
      setLesson(loadedLesson)
      setComplete(loadedLesson.progress_status === 'completed')
      setNote(savedNote)
      setBookmarked(savedBookmark)
    })().catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load this lesson.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [lessonId])

  async function saveNote() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await saveLessonNote(lessonId, note)
      setMessage('Your notes are saved to your account.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your notes.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleBookmark() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await setLessonBookmark(lessonId, !bookmarked)
      setBookmarked(!bookmarked)
      setMessage(!bookmarked ? 'Lesson saved to your bookmarks.' : 'Lesson removed from your bookmarks.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update your bookmark.')
    } finally {
      setBusy(false)
    }
  }

  async function markComplete() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await completeLesson(lessonId)
      setComplete(true)
      setMessage('Lesson completion saved.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not complete this lesson.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="loading-card">Loading lesson and saved notes…</div>
  if (error && !lesson) return <div className="error-banner" role="alert">{error}<button className="text-button" onClick={() => navigate('/courses')}>Back to courses</button></div>
  if (!lesson) return null

  const number = lesson.level_order
  const title = lesson.title
  const sections = lesson.content?.sections ?? []
  return <div className="lesson-page">
    <button className="back-link" onClick={() => navigate(`/courses/${lesson.courses?.slug ?? ''}/map`)}><ArrowLeft size={15} /> {lesson.courses?.title ?? 'Course map'}</button>
    <div className="lesson-topline"><span>LEVEL {number}</span><span className="lesson-progress"><i style={{ width: complete ? '100%' : '35%' }} /></span><span>{complete ? 'Complete' : 'In progress'}</span><button className={`icon-button ${bookmarked ? 'bookmark-active' : ''}`} onClick={() => void toggleBookmark()} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark lesson'} disabled={busy}><Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} /></button></div>
    {(error || message) && <div className={error ? 'error-banner' : 'success-banner'} role={error ? 'alert' : 'status'}>{error || message}</div>}
    <div className="lesson-layout"><main className="lesson-main">
      <div className="lesson-heading"><span className="eyebrow">{lesson.courses?.title ?? 'LESSON'} · LEVEL {number}</span><h1>{title}</h1><p>{lesson.description}</p></div>
      <div className="lesson-tabs">{['Lesson', 'Notes', 'Resources'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'Lesson' ? <Play size={15} /> : item === 'Notes' ? <FileText size={15} /> : <Bookmark size={15} />}{item}</button>)}</div>
      {tab === 'Lesson' ? <>
        {lesson.video_url ? <div className="lesson-video"><a className="button button-primary" href={lesson.video_url} target="_blank" rel="noreferrer"><Play size={16} fill="currentColor" /> Open lesson video</a></div> : <div className="lesson-video lesson-video-empty"><BookOpen size={25} /><span>No video is attached to this lesson.</span></div>}
        <div className="lesson-body">{sections.length ? sections.map((section, index) => <section key={`${section.heading}-${index}`}><h2>{section.heading}</h2><p>{section.body}</p></section>) : <div className="empty-state"><FileText size={23} /><h3>Lesson content is being prepared</h3><p>There is no written material on this level yet.</p></div>}</div>
      </> : tab === 'Notes' ? <div className="lesson-body tab-body"><h2>Your lesson notes</h2><p>Notes are private to your account and saved to your learning profile.</p><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Jot down a thought, example, or question..." rows={7} /><button className="button button-primary" disabled={busy} onClick={() => void saveNote()}>{busy ? 'Saving…' : 'Save notes'} <Check size={15} /></button></div> : <div className="lesson-body tab-body"><h2>Helpful resources</h2>{lesson.resource_urls.filter((url) => /^https?:\/\//i.test(url)).length ? lesson.resource_urls.filter((url) => /^https?:\/\//i.test(url)).map((url) => <a className="resource-card" href={url} key={url} target="_blank" rel="noreferrer"><span className="resource-icon"><FileText size={19} /></span><div><b>{resourceHost(url)}</b><small>{url}</small></div><ArrowRight size={16} /></a>) : <div className="empty-state"><Bookmark size={23} /><h3>No resources attached</h3><p>The course author has not added any resource links yet.</p></div>}</div>}
    </main><aside className="lesson-aside">
      <div className="panel lesson-progress-panel"><span className="eyebrow">YOUR PROGRESS</span><h3>Level {number}: {title}</h3><div className="progress-track"><span style={{ width: complete ? '100%' : '35%' }} /></div><small>{complete ? 'Lesson completion saved' : 'Mark complete when you finish'}</small><button className={`button ${complete ? 'button-outline' : 'button-primary'} complete-button`} disabled={busy || complete} onClick={() => void markComplete()}>{complete ? <CheckCircle2 size={16} /> : <Check size={15} />}{complete ? 'Completed' : busy ? 'Saving…' : 'Mark as complete'}</button></div>
      <div className="panel lesson-ai-panel"><span className="coach-bubble"><Bot size={18} /></span><h3>Need a hand?</h3><p>Your learning coach can help make tricky ideas click.</p><Link className="button button-outline full-button" to="/coach">Ask your coach <ArrowRight size={15} /></Link></div>
      {lesson.quizzes && <div className="panel lesson-next-panel"><span className="eyebrow">ASSESS YOUR LEARNING</span><b>{lesson.quizzes.title}</b><small>Pass to finish this level and continue.</small><Link className="button button-outline full-button" to={`/quiz/${lesson.quizzes.id}`}>Start quiz <ArrowRight size={15} /></Link></div>}
    </aside></div>
    <div className="lesson-footer"><button className="button button-outline" onClick={() => navigate(`/courses/${lesson.courses?.slug ?? ''}/map`)}><ArrowLeft size={15} /> Course map</button>{lesson.quizzes && <Link className="button button-primary" to={`/quiz/${lesson.quizzes.id}`}>Go to quiz <ArrowRight size={15} /></Link>}</div>
  </div>
}

function QuizPage() {
  const { quizId = '' } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<QuizDetails | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ percentage: number; passed: boolean; correct_count: number; score: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    void loadQuiz(quizId)
      .then((data) => { if (active) setQuiz({ ...data, quiz_questions: data.quiz_questions.sort((a, b) => a.display_order - b.display_order) }) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load the quiz.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [quizId])

  async function submitAnswers() {
    if (!quiz) return
    setSubmitting(true)
    setError('')
    try {
      const response = await submitQuiz(quiz.id, answers)
      setResult({
        percentage: Number(response.percentage),
        passed: Boolean(response.passed),
        correct_count: Number(response.correct_count),
        score: Number(response.score),
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit your answers.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading-card">Loading quiz…</div>
  if (error && !quiz) return <div className="error-banner" role="alert">{error}<button className="text-button" onClick={() => navigate('/courses')}>Back to courses</button></div>
  if (!quiz) return null
  const complete = quiz.quiz_questions.every((question) => answers[question.id])

  return <div className="quiz-page">
    <button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Back</button>
    <div className="quiz-top"><div><span className="eyebrow">CHECK IN WITH WHAT YOU'VE LEARNED</span><h1>{quiz.title}</h1><p>Answer the questions, then submit for your score.</p></div>{quiz.time_limit_seconds && <div className="quiz-timer"><Clock3 size={16} /> {Math.ceil(quiz.time_limit_seconds / 60)} min</div>}</div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="quiz-layout"><main className="panel quiz-card">
      {quiz.quiz_questions.map((question, index) => <section className="dynamic-question" key={question.id}>
        <div className="quiz-question-head"><span>QUESTION {index + 1} OF {quiz.quiz_questions.length}</span><span>{question.question_type.replaceAll('_', ' ')}</span></div>
        <h2>{question.question_text}</h2>
        <div className="answer-list">{question.options.map((option, optionIndex) => {
          const selected = answers[question.id] === option.id
          return <button type="button" key={option.id} className={`answer-option ${selected ? 'selected' : ''}`} disabled={Boolean(result)} onClick={() => setAnswers((previous) => ({ ...previous, [question.id]: option.id }))}><span className="answer-radio">{selected ? <Check size={13} /> : String.fromCharCode(65 + optionIndex)}</span><span>{option.text}</span></button>
        })}</div>
        {result && <div className={`answer-feedback ${result.passed ? 'success' : 'try-again'}`}><Lightbulb size={17} /><span><b>{question.explanation}</b></span></div>}
      </section>)}
      {result && <div className={`quiz-result ${result.passed ? 'success' : 'try-again'}`}><b>{result.passed ? 'Quiz passed!' : 'Keep practicing'}</b><span>{result.correct_count} of {quiz.quiz_questions.length} correct · {result.percentage}%</span></div>}
      <div className="quiz-actions"><button className="button button-outline" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</button>{result ? <button className="button button-primary" onClick={() => { setResult(null); setAnswers({}); setError('') }}>Try again <ArrowRight size={14} /></button> : <button className="button button-primary" disabled={!complete || submitting} onClick={() => void submitAnswers()}>{submitting ? 'Submitting…' : 'Submit answers'} <ArrowRight size={14} /></button>}</div>
    </main><aside className="panel quiz-summary"><span className="eyebrow">YOUR QUIZ</span><h3>{quiz.title}</h3><div className="quiz-summary-stat"><span>Questions</span><b>{quiz.quiz_questions.length}</b></div><div className="quiz-summary-stat"><span>Passing score</span><b>{quiz.passing_percentage}%</b></div><div className="quiz-summary-stat"><span>Attempt limit</span><b>{quiz.attempt_limit ?? 'No limit'}</b></div><div className="quiz-tip"><Sparkles size={16} /><span>Results are calculated and saved by the learning service.</span></div></aside></div>
  </div>
}

function CoachPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([{ from: 'coach', text: "Hey Priya! 👋 I'm your learning coach. What's on your mind today? We can talk through a tricky idea, make a study plan, or just celebrate a little win." }])
  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!input.trim()) return
    const question = input.trim()
    setMessages((current) => [...current, { from: 'you', text: question }, { from: 'coach', text: `Great question! For now, I can help with the ideas covered in your demo lessons. Try breaking "${question}" into one small part at a time, and connect it to a real-world example. Once the AI service is configured, I'll be able to give you a more personalized explanation.` }])
    setInput('')
  }
  return <div className="coach-page"><PageTitle kicker="A HELPFUL VOICE, WHENEVER YOU NEED IT" title="Your learning coach" subtitle="Ask a question, untangle an idea, or figure out what to learn next." action={<button className="icon-button"><Settings size={17} /></button>} /><div className="coach-layout"><section className="panel coach-chat"><div className="chat-header"><span className="coach-avatar"><Bot size={20} /></span><div><b>Your learning coach</b><small><i /> Here to help you learn</small></div><span className="demo-tag">Demo mode</span></div><div className="chat-messages">{messages.map((message, index) => <div className={`chat-message ${message.from === 'you' ? 'mine' : ''}`} key={`${message.from}-${index}`}><span className="chat-message-avatar">{message.from === 'you' ? 'P' : <Bot size={15} />}</span><p>{message.text}</p></div>)}</div><form className="chat-composer" onSubmit={sendMessage}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type a question or tell me what's on your mind..." aria-label="Message your learning coach" /><button type="submit" aria-label="Send message" disabled={!input.trim()}><Send size={16} /></button></form><small className="coach-disclaimer">Demo replies only. Connect a secure AI service for personalized coaching.</small></section><aside className="coach-aside"><div className="panel coach-suggestions"><span className="eyebrow">A FEW PLACES TO START</span><h3>What can I help with?</h3>{[{ icon: <Lightbulb size={17} />, title: 'Explain a tricky idea', detail: 'Let’s make it click', prompt: 'Can you explain conditional statements?' }, { icon: <Target size={17} />, title: 'Make a study plan', detail: 'One small step at a time', prompt: 'Help me make a study plan.' }, { icon: <Sparkles size={17} />, title: 'Find my next step', detail: 'A thoughtful recommendation', prompt: 'What should I learn next?' }].map((item) => <button className="suggestion-card" key={item.title} onClick={() => setInput(item.prompt)}><span>{item.icon}</span><span><b>{item.title}</b><small>{item.detail}</small></span><ChevronRight size={15} /></button>)}</div><div className="panel coach-context"><span className="eyebrow">LEARNING RIGHT NOW</span><div><span className="context-course-icon">🐍</span><span><b>Python Fundamentals</b><small>Level 4 · Conditional statements</small></span></div><Link to="/lesson/python-4" className="text-link">Back to lesson <ArrowRight size={14} /></Link></div></aside></div></div>
}

function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [courseFormOpen, setCourseFormOpen] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState('')
  const [lessonCourseId, setLessonCourseId] = useState('')
  const [quizLessonId, setQuizLessonId] = useState('')

  useEffect(() => {
    let active = true
    void loadAdminOverview().then((data) => {
      if (active) setOverview(data)
    }).catch((cause: unknown) => {
      if (!active) return
      if (cause instanceof Error) {
        setError(cause.message)
        return
      }
      if (typeof cause === 'object' && cause !== null && 'message' in cause && typeof cause.message === 'string') {
        const code = 'code' in cause && typeof cause.code === 'string' ? ` (${cause.code})` : ''
        const details = 'details' in cause && typeof cause.details === 'string' && cause.details ? ` ${cause.details}` : ''
        setError(`${cause.message}${code}${details}`)
        return
      }
      setError('Could not load the administrator overview.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshKey])

  async function handleSaveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const difficultyValue = form.get('difficulty')
      if (difficultyValue !== 'beginner' && difficultyValue !== 'intermediate' && difficultyValue !== 'advanced') {
        throw new Error('Choose a valid course difficulty.')
      }
      const difficulty: CourseRecord['difficulty'] = difficultyValue
      const courseInput = {
        title: String(form.get('title') ?? ''),
        description: String(form.get('description') ?? ''),
        categoryId: String(form.get('categoryId') ?? ''),
        difficulty,
        durationMinutes: Number(form.get('durationMinutes') ?? 0),
      }
      if (editingCourseId) {
        await updateCourse({ id: editingCourseId, ...courseInput })
        setNotice('Course changes saved.')
      } else {
        const courseId = await createCourse(courseInput)
        setLessonCourseId(courseId)
        setNotice('Draft created. Add at least one lesson, then publish it for learners.')
      }
      setCourseFormOpen(false)
      setEditingCourseId('')
      setRefreshKey((key) => key + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the course.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      await createLesson({
        courseId: String(form.get('courseId') ?? ''),
        title: String(form.get('title') ?? ''),
        description: String(form.get('description') ?? ''),
        durationMinutes: Number(form.get('durationMinutes') ?? 10),
      })
      setLessonCourseId('')
      setNotice('Lesson saved. You can add another lesson or publish the course.')
      setRefreshKey((key) => key + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the lesson.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const options = ['a', 'b', 'c', 'd']
      const questions = [0, 1, 2].map((index) => ({
        prompt: String(form.get(`question-${index}`) ?? '').trim(),
        options: options.map((id) => ({ id, text: String(form.get(`option-${index}-${id}`) ?? '').trim() })),
        answer: String(form.get(`answer-${index}`) ?? ''),
        explanation: String(form.get(`explanation-${index}`) ?? '').trim(),
      }))
      await createCourseQuiz({
        lessonId: String(form.get('lessonId') ?? ''),
        title: String(form.get('title') ?? ''),
        passingPercentage: Number(form.get('passingPercentage') ?? 70),
        questions,
      })
      setQuizLessonId('')
      setNotice('Quiz published. Enrolled students can now take it in this lesson.')
      setRefreshKey((key) => key + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the quiz.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAdminAccessReview(userId: string, approved: boolean) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await reviewAdminAccessRequest(userId, approved)
      setNotice(approved ? 'Admin access approved. The account can now use the admin login.' : 'Admin access request rejected.')
      setRefreshKey((key) => key + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not review the admin access request.')
    } finally {
      setBusy(false)
    }
  }

  async function changePublication(course: AdminOverview['courses'][number]) {
    const nextStatus = course.status === 'published' ? 'draft' : 'published'
    if (nextStatus === 'published' && course.lessons === 0) {
      setError('Add a lesson before publishing this course.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await updateCoursePublication(course.id, nextStatus)
      setNotice(nextStatus === 'published' ? 'Course published to the student catalog.' : 'Course moved back to draft and hidden from students.')
      setRefreshKey((key) => key + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update course visibility.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="loading-card">Loading administrator data…</div>
  if (!overview) return <div className="panel admin-load-error"><ShieldCheck size={20} /><h2>Admin data unavailable</h2><p>{error || 'No administrator data was returned.'}</p><button className="button button-outline button-small" onClick={() => { setError(''); setLoading(true); setRefreshKey((key) => key + 1) }}>Retry</button></div>

  const activityLabel: Record<string, string> = {
    course_enrolled: 'Enrolled in a course',
    lesson_started: 'Started a lesson',
    lesson_completed: 'Completed a lesson',
    quiz_submitted: 'Submitted a quiz',
  }
  const selectedCourse = overview.courses.find((course) => course.id === lessonCourseId)
  const editingCourse = overview.courses.find((course) => course.id === editingCourseId)
  const selectedQuizLesson = overview.lessonOptions.find((lesson) => lesson.id === quizLessonId)
  const quizQuestionSlots = [0, 1, 2]
  const quizOptionIds = ['a', 'b', 'c', 'd']

  return <div className="page-stack admin-page">
    <div className="admin-live-note"><ShieldCheck size={17} /><span><b>Verified administrator workspace</b> — figures and course actions are saved in your Supabase project.</span></div>
    <PageTitle kicker="YOUR LEARNING COMMUNITY" title="Admin dashboard" subtitle="Manage your published paths and see activity from enrolled learners." action={<button className="button button-primary button-small" onClick={() => { setError(''); setNotice(''); setEditingCourseId(''); setCourseFormOpen((open) => !open) }}><Plus size={15} /> {courseFormOpen ? 'Close course form' : 'Create course'}</button>} />
    {error && <div className="inline-notice error" role="alert">{error}</div>}
    {notice && <div className="inline-notice success" role="status">{notice}</div>}
    {!overview.adminAccessRequestsConfigured && <div className="inline-notice admin-migration-notice" role="status"><ShieldCheck size={16} /><span><b>Admin access approvals need setup.</b> The admin dashboard data is available, but request approvals are disabled until Supabase migration <code>202610100003_admin_access_requests.sql</code> is run in SQL Editor.</span></div>}
    {overview.adminAccessRequests.length > 0 && <section className="panel admin-requests-panel"><div className="panel-head"><div><span className="eyebrow">ACCOUNT APPROVAL</span><h2>Admin access requests</h2></div><span className="soft-count">{overview.adminAccessRequests.length} pending</span></div><div className="admin-request-list">{overview.adminAccessRequests.map((request) => <div className="admin-request-row" key={request.userId}><span className="entry-page-icon admin-icon"><Users size={17} /></span><span className="admin-request-person"><b>{request.displayName}</b><small>Requested {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(request.requestedAt))}</small></span><div className="admin-row-actions"><button className="button button-outline button-small" disabled={busy} onClick={() => void handleAdminAccessReview(request.userId, false)}>Reject</button><button className="button button-primary button-small" disabled={busy} onClick={() => void handleAdminAccessReview(request.userId, true)}>Approve admin</button></div></div>)}</div><p className="admin-request-help">Approving grants this account administrator privileges across the learning workspace.</p></section>}
    {courseFormOpen && <section className="panel admin-editor-panel"><div className="panel-head"><div><span className="eyebrow">{editingCourse ? 'UPDATE LEARNING PATH' : 'BUILD A NEW LEARNING PATH'}</span><h2>{editingCourse ? `Edit ${editingCourse.title}` : 'Create course'}</h2></div></div><form className="admin-form-grid" key={editingCourse?.id ?? 'new-course'} onSubmit={(event) => void handleSaveCourse(event)}><label>Course title<input required name="title" maxLength={100} defaultValue={editingCourse?.title ?? ''} placeholder="e.g. Introduction to design" /></label><label>Category<select required name="categoryId" defaultValue={editingCourse?.categoryId ?? ''}><option value="" disabled>Select a category</option>{overview.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Description<textarea required name="description" maxLength={1000} rows={3} defaultValue={editingCourse?.description ?? ''} placeholder="What will learners be able to do?" /></label><label>Difficulty<select name="difficulty" defaultValue={editingCourse?.difficulty ?? 'beginner'}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><label>Estimated duration (minutes)<input required name="durationMinutes" type="number" min={1} max={10000} defaultValue={editingCourse?.durationMinutes ?? 60} /></label><button className="button button-primary button-small" type="submit" disabled={busy || overview.categories.length === 0}>{busy ? 'Saving…' : editingCourse ? 'Save changes' : 'Save draft course'}</button>{overview.categories.length === 0 && <small>Add a category in Supabase before creating a course.</small>}</form></section>}
    {lessonCourseId && <section className="panel admin-editor-panel"><div className="panel-head"><div><span className="eyebrow">ADD LEARNING CONTENT</span><h2>New lesson{selectedCourse ? ` · ${selectedCourse.title}` : ''}</h2></div><button className="text-button" onClick={() => setLessonCourseId('')}>Close</button></div><form className="admin-form-grid" onSubmit={(event) => void handleCreateLesson(event)}><label>Course<select required name="courseId" value={lessonCourseId} onChange={(event) => setLessonCourseId(event.target.value)}>{!selectedCourse && <option value={lessonCourseId}>New draft course</option>}{overview.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label>Lesson title<input required name="title" maxLength={100} placeholder="e.g. Getting started" /></label><label>Lesson description and notes<textarea required name="description" maxLength={3000} rows={4} placeholder="Write the lesson notes learners will see." /></label><label>Estimated duration (minutes)<input required name="durationMinutes" type="number" min={1} max={1000} defaultValue={10} /></label><button className="button button-primary button-small" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save lesson'}</button></form></section>}
    {quizLessonId && <section className="panel admin-editor-panel"><div className="panel-head"><div><span className="eyebrow">ASSESS A LESSON</span><h2>Create a quiz{selectedQuizLesson ? ` · ${selectedQuizLesson.title}` : ''}</h2></div><button className="text-button" onClick={() => setQuizLessonId('')}>Close</button></div><form className="admin-form-grid" onSubmit={(event) => void handleCreateQuiz(event)}><label>Lesson<select required name="lessonId" value={quizLessonId} onChange={(event) => setQuizLessonId(event.target.value)}>{overview.lessonOptions.map((lesson) => <option key={lesson.id} value={lesson.id}>{overview.courses.find((course) => course.id === lesson.courseId)?.title} · {lesson.title}</option>)}</select></label><label>Quiz title<input required name="title" maxLength={100} placeholder="e.g. Lesson 1 knowledge check" /></label><label>Passing score (%)<input required name="passingPercentage" type="number" min={1} max={100} defaultValue={70} /></label>{quizQuestionSlots.map((index) => <fieldset className="quiz-author-question" key={index}><legend>Question {index + 1}</legend><label>Question<input required name={`question-${index}`} maxLength={500} placeholder="Write a question" /></label><div className="quiz-author-options"><span>Answer choices · select the correct answer</span>{quizOptionIds.map((optionId) => <label key={optionId}><input required name={`answer-${index}`} type="radio" value={optionId} /> <input required name={`option-${index}-${optionId}`} maxLength={200} placeholder={`Choice ${optionId.toUpperCase()}`} /></label>)}</div><label>Explanation<textarea name={`explanation-${index}`} maxLength={500} rows={2} placeholder="Explain why the answer is correct" /></label></fieldset>)}<button className="button button-primary button-small" type="submit" disabled={busy || overview.lessonOptions.length === 0}>{busy ? 'Publishing…' : 'Publish quiz'}</button></form></section>}
    <div className="metric-grid admin-metrics">
      <MetricCard icon={<Users size={18} />} label="Registered students" value={String(overview.students)} detail="Student accounts" color="violet" />
      <MetricCard icon={<BookOpen size={18} />} label="Published courses" value={String(overview.publishedCourses)} detail={`${overview.courses.length} total course drafts and paths`} color="blue" />
      <MetricCard icon={<Activity size={18} />} label="Active enrollments" value={String(overview.activeEnrollments)} detail="Current course enrollments" color="mint" />
      <MetricCard icon={<Target size={18} />} label="Completion rate" value={`${overview.completionPercentage}%`} detail="Across enrolled lessons" color="yellow" />
    </div>
    <div className="admin-grid">
      <section className="panel recent-panel"><div className="panel-head"><div><span className="eyebrow">RECORDED LEARNER EVENTS</span><h2>Recent activity</h2></div></div>{overview.recentActivity.length ? overview.recentActivity.map((item) => <div className="activity-row" key={item.id}><span className="activity-icon violet"><Activity size={16} /></span><span><b>{activityLabel[item.activity_type] ?? item.activity_type.replace(/_/g, ' ')}</b><small>{item.display_name}</small></span><time dateTime={item.occurred_at}>{item.occurred_at.slice(0, 16).replace('T', ' ')}</time></div>) : <div className="empty-state"><Activity size={22} /><h3>No learner activity yet</h3><p>Enrollment and lesson activity will appear here as learners use the platform.</p></div>}</section>
      <section className="panel quick-panel"><div className="panel-head"><div><span className="eyebrow">ADMIN ACTIONS</span><h2>Manage learning</h2></div></div><button className="quick-action" onClick={() => { setError(''); setEditingCourseId(''); setCourseFormOpen(true) }}><span><Plus size={17} /></span><b>Add a course</b><ChevronRight size={16} /></button><button className="quick-action" onClick={() => setLessonCourseId(overview.courses[0]?.id ?? '')} disabled={overview.courses.length === 0}><span><FileText size={17} /></span><b>Add a lesson</b><ChevronRight size={16} /></button><button className="quick-action" onClick={() => { setError(''); setQuizLessonId(overview.lessonOptions[0]?.id ?? '') }} disabled={overview.lessonOptions.length === 0}><span><ListChecks size={17} /></span><b>Add a quiz</b><ChevronRight size={16} /></button><Link className="quick-action" to="/analytics"><span><BarChart3 size={17} /></span><b>Student insights</b><ChevronRight size={16} /></Link></section>
    </div>
    {!overview.courseEditingConfigured && <div className="inline-notice admin-migration-notice" role="status">Course editing and reviews require Supabase migration <code>202610100004_assignments_reviews_course_editing.sql</code>.</div>}
    {!overview.assignmentsConfigured && <div className="inline-notice admin-migration-notice" role="status">Assignments and grading require Supabase migration <code>202610100004_assignments_reviews_course_editing.sql</code>.</div>}
    {overview.assignmentsConfigured && <AdminAssignmentManager courses={overview.courses} assignments={overview.assignments} disabled={busy} onSaved={() => setRefreshKey((key) => key + 1)} />}
    {overview.courseEditingConfigured && <AdminCourseReviews reviews={overview.courseReviews} />}
    <section className="panel admin-course-panel"><div className="panel-head"><div><span className="eyebrow">YOUR LEARNING PATHS</span><h2>Courses at a glance</h2></div><button className="text-button" onClick={() => setRefreshKey((key) => key + 1)}>Refresh <ArrowRight size={14} /></button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Course</th><th>Category</th><th>Students</th><th>Lessons</th><th>Quizzes</th><th>Completion</th><th>Status</th><th>Actions</th></tr></thead><tbody>{overview.courses.map((course) => <tr key={course.id}><td><b>{course.title}</b></td><td>{course.category}</td><td>{course.enrollments}</td><td>{course.lessons}</td><td>{course.quizzes}</td><td><span className="table-progress"><i style={{ width: `${course.completion}%` }} /></span> {course.completion}%</td><td><span className={`status-chip ${course.status !== 'published' ? 'status-draft' : ''}`}><i />{course.status}</span></td><td><div className="admin-row-actions"><button className="text-button" onClick={() => { setEditingCourseId(course.id); setCourseFormOpen(true); setError(''); setNotice('') }}>Edit</button><button className="text-button" onClick={() => setLessonCourseId(course.id)}>Add lesson</button><button className="text-button" disabled={busy || !overview.lessonOptions.some((lesson) => lesson.courseId === course.id)} title={!overview.lessonOptions.some((lesson) => lesson.courseId === course.id) ? 'Add a lesson without a quiz first' : ''} onClick={() => { setError(''); setQuizLessonId(overview.lessonOptions.find((lesson) => lesson.courseId === course.id)?.id ?? '') }}>Add quiz</button><button className="text-button" disabled={busy || (course.status !== 'published' && course.lessons === 0)} title={course.status !== 'published' && course.lessons === 0 ? 'Add a lesson before publishing' : ''} onClick={() => void changePublication(course)}>{course.status === 'published' ? 'Unpublish' : 'Publish'}</button></div></td></tr>)}</tbody></table></div>{overview.courses.length === 0 && <div className="empty-state"><BookOpen size={23} /><h3>No courses yet</h3><p>Create a course to start building your learning catalog.</p></div>}</section>
  </div>
}

function AdminAssignmentManager({ courses, assignments, disabled, onSaved }: {
  courses: AdminOverview['courses']
  assignments: AdminOverview['assignments']
  disabled: boolean
  onSaved: () => void
}) {
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setSaving(true)
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    const dueValue = String(form.get('dueAt') ?? '')
    try {
      await createAssignment({
        courseId: String(form.get('courseId') ?? ''),
        title: String(form.get('title') ?? ''),
        description: String(form.get('description') ?? ''),
        dueAt: dueValue ? new Date(dueValue).toISOString() : null,
      })
      formElement.reset()
      setNotice('Assignment created and made available to enrolled students.')
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the assignment.')
    } finally {
      setSaving(false)
    }
  }

  async function grade(event: FormEvent<HTMLFormElement>, submissionId: string) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      await gradeAssignment(submissionId, Number(form.get('grade')), String(form.get('feedback') ?? ''))
      setNotice('Assignment graded. The student can now see their grade and feedback.')
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not grade the assignment.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="panel admin-assignment-panel">
    <div className="panel-head"><div><span className="eyebrow">STUDENT PRACTICE</span><h2>Assignments &amp; grading</h2></div><span className="soft-count">{assignments.reduce((count, item) => count + item.submissions.filter((submission) => submission.grade === null).length, 0)} to grade</span></div>
    {error && <div className="inline-notice error" role="alert">{error}</div>}
    {notice && <div className="inline-notice success" role="status">{notice}</div>}
    <form className="admin-form-grid assignment-create-form" onSubmit={(event) => void create(event)}>
      <label>Course<select required name="courseId" defaultValue=""><option value="" disabled>Select course</option>{courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}</select></label>
      <label>Assignment title<input required name="title" maxLength={150} placeholder="e.g. Build a small project" /></label>
      <label>Instructions<textarea required name="description" maxLength={3000} rows={3} placeholder="Explain what students should submit." /></label>
      <label>Due date (optional)<input name="dueAt" type="datetime-local" /></label>
      <button className="button button-primary button-small" type="submit" disabled={saving || disabled || courses.length === 0}>{saving ? 'Saving…' : 'Create assignment'}</button>
      {!courses.length && <small>Create a course first.</small>}
    </form>
    <div className="admin-assignment-list">{assignments.length ? assignments.map((assignment) => <article className="admin-assignment-item" key={assignment.id}>
      <div className="panel-head"><div><span className="eyebrow">{assignment.courseTitle}</span><h3>{assignment.title}</h3></div><span className="soft-count">{assignment.submissions.length} submitted</span></div>
      <p>{assignment.description}</p>
      {assignment.submissions.length ? assignment.submissions.map((submission) => <form className="submission-grade-form" key={submission.id} onSubmit={(event) => void grade(event, submission.id)}>
        <div className="submission-meta"><b>{submission.studentName}</b><small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(submission.submittedAt))}</small>{submission.grade !== null && <strong>{submission.grade}%</strong>}</div>
        <blockquote>{submission.submissionText}</blockquote>
        {submission.grade === null ? <div className="grade-controls"><label>Grade (%)<input required type="number" name="grade" min={0} max={100} defaultValue={80} /></label><label>Feedback<input name="feedback" maxLength={2000} defaultValue="" placeholder="Feedback for the student" /></label><button className="button button-primary button-small" disabled={saving || disabled}>{saving ? 'Saving…' : 'Grade submission'}</button></div> : submission.feedback && <p className="graded-feedback"><b>Feedback:</b> {submission.feedback}</p>}
      </form>) : <div className="empty-state"><FileText size={20} /><h3>No submissions yet</h3><p>Student work will appear here when it is submitted.</p></div>}
    </article>) : <div className="empty-state"><FileText size={22} /><h3>No assignments yet</h3><p>Create an assignment and enrolled students will see it in My assignments.</p></div>}</div>
  </section>
}

function AdminCourseReviews({ reviews }: { reviews: AdminOverview['courseReviews'] }) {
  return <section className="panel admin-reviews-panel">
    <div className="panel-head"><div><span className="eyebrow">LEARNER FEEDBACK</span><h2>Course reviews</h2></div><span className="soft-count">{reviews.length} recent reviews</span></div>
    {reviews.length ? <div className="admin-review-list">{reviews.map((item, index) => <article className="admin-review-row" key={`${item.courseTitle}-${item.studentName}-${item.createdAt}-${index}`}><div><b>{item.courseTitle}</b><span className="review-average"><Star size={13} fill="currentColor" /> {item.rating}/5</span></div><p>{item.review || 'No written comment.'}</p><small>{item.studentName} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(item.createdAt))}</small></article>)}</div> : <div className="empty-state"><Star size={20} /><h3>No reviews yet</h3><p>Student feedback will appear here as enrolled learners review courses.</p></div>}
  </section>
}

export default App
