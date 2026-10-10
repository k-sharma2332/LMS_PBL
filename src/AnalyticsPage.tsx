import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, BarChart3, Clock3, Lightbulb, ListChecks, Star, Target, Zap } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import { loadStudentAnalytics, type StudentAnalyticsData } from './lib/learning'

function MetricCard({ icon, label, value, detail, color }: { icon: React.ReactNode; label: string; value: string; detail: string; color: string }) {
  return <div className="metric-card"><div className={`metric-icon ${color}`}>{icon}</div><div className="metric-label">{label}</div><b className="metric-value">{value}</b><span className="metric-detail">{detail}</span></div>
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<StudentAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!user) return
    void loadStudentAnalytics(user.id).then((data) => {
      if (active) setAnalytics(data)
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load your analytics.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id])

  if (loading) return <div className="loading-card">Calculating your progress from saved learning activity…</div>
  if (error) return <div className="error-banner" role="alert">Couldn’t load analytics: {error}<button className="text-button" onClick={() => window.location.reload()}>Retry</button></div>
  if (!analytics) return null

  const { dashboard, weeklyActivity, topicPerformance } = analytics
  const averageScore = dashboard.averageQuizScore === null ? '—' : `${dashboard.averageQuizScore}%`
  const weakTopics = topicPerformance.filter((topic) => topic.score < 70)
  const totalActivity = weeklyActivity.reduce((sum, day) => sum + day.activities, 0)

  return <div className="page-stack">
    <div className="page-title"><div><span className="eyebrow">LOOK HOW FAR YOU'VE COME</span><h1>Progress &amp; analytics</h1><p>Calculated from the lessons and assessments saved to your account.</p></div><span className="chart-legend"><i /> Last 7 days</span></div>
    <div className="metric-grid analytics-metrics">
      <MetricCard icon={<Target size={18} />} label="Overall completion" value={`${dashboard.completionPercentage}%`} detail={`${dashboard.completedLessons} of ${dashboard.totalLessons} enrolled lessons`} color="violet" />
      <MetricCard icon={<ListChecks size={18} />} label="Lessons completed" value={String(dashboard.completedLessons)} detail="Saved completed lessons" color="mint" />
      <MetricCard icon={<Star size={18} />} label="Average quiz score" value={averageScore} detail="Across submitted attempts" color="yellow" />
      <MetricCard icon={<Zap size={18} />} label="Current streak" value={`${dashboard.currentStreak} days`} detail="Consecutive active UTC days" color="blue" />
    </div>
    <div className="analytics-grid">
      <section className="panel chart-panel"><div className="panel-head"><div><span className="eyebrow">YOUR RECORDED STUDY ACTIVITY</span><h2>Weekly activity</h2></div><span className="chart-legend"><i /> Events</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weeklyActivity} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9271eb" stopOpacity={0.2} /><stop offset="95%" stopColor="#9271eb" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="#f0eef5" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#9390a2', fontSize: 12 }} dy={10} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#9390a2', fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #efedf4', fontSize: 12 }} /><Area type="monotone" dataKey="activities" name="Learning events" stroke="#8463df" strokeWidth={2.5} fill="url(#activityFill)" activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer></div><small className="demo-footnote">{totalActivity} learning events recorded over the last 7 days. This is event count, not time spent.</small></section>
      <section className="panel chart-panel"><div className="panel-head"><div><span className="eyebrow">SUBMITTED QUIZ ATTEMPTS</span><h2>Assessment performance</h2></div><BarChart3 className="panel-head-icon" size={17} /></div>{topicPerformance.length ? <div className="chart-area topic-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={topicPerformance} layout="vertical" margin={{ top: 2, right: 18, left: 8, bottom: 0 }}><CartesianGrid stroke="#f0eef5" horizontal={false} /><XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#9390a2', fontSize: 11 }} /><YAxis type="category" dataKey="topic" tickLine={false} axisLine={false} tick={{ fill: '#777487', fontSize: 10 }} width={100} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #efedf4', fontSize: 12 }} /><Bar dataKey="score" name="Average score" radius={[0, 8, 8, 0]} barSize={13}>{topicPerformance.map((entry) => <Cell key={entry.topic} fill={entry.score < 70 ? '#f1a890' : '#9070e7'} />)}</Bar></BarChart></ResponsiveContainer></div> : <div className="empty-state"><ListChecks size={23} /><h3>No quiz results yet</h3><p>Complete a course quiz to see assessment results here.</p><Link to="/courses" className="text-link">Find a course <ArrowRight size={14} /></Link></div>}</section>
    </div>
    <div className="analytics-grid lower-analytics">
      <section className="panel weak-panel"><div className="panel-head"><div><span className="eyebrow">BASED ON YOUR QUIZ ATTEMPTS</span><h2>Topics to revisit</h2></div><span className="soft-count">{weakTopics.length} topics</span></div>{weakTopics.length ? weakTopics.map((topic) => <div className="weak-topic" key={topic.topic}><div><span className="weak-icon"><Lightbulb size={15} /></span><span><b>{topic.topic}</b><small>{topic.score < 50 ? 'Review and try the quiz again' : 'More practice may help'}</small></span></div><div className="weak-score"><span><i style={{ width: `${topic.score}%` }} /></span><b>{topic.score}%</b></div><Link to="/courses" className="button button-outline button-small">Review <ArrowRight size={13} /></Link></div>) : <div className="empty-state"><Target size={22} /><h3>Nothing to flag</h3><p>{topicPerformance.length ? 'No quiz averages are below 70%.' : 'Quiz results will appear here once you take an assessment.'}</p></div>}</section>
      <section className="panel achievements-panel"><div className="panel-head"><div><span className="eyebrow">YOUR LEARNING RECORD</span><h2>At a glance</h2></div><Clock3 size={18} className="gold-text" /></div><div className="achievement-row"><span className="achievement-medal gold-medal"><ListChecks size={16} /></span><span><b>{dashboard.totalLessons - dashboard.completedLessons} lessons to go</b><small>Across your active enrollments</small></span></div><div className="achievement-row"><span className="achievement-medal purple-medal"><Zap size={16} /></span><span><b>{dashboard.xp.toLocaleString()} XP earned</b><small>From recorded rewards</small></span></div><div className="analytics-demo-note">Badges and learning-time tracking become available when those features are configured.</div></section>
    </div>
  </div>
}
