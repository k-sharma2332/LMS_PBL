import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabase'

export type Profile = {
  id: string
  display_name: string
  role: 'student' | 'admin'
  avatar_url: string | null
}

type AuthState = {
  user: User | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  profileError: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let initialized = false
    let supabase
    try {
      supabase = getSupabaseClient()
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Supabase authentication is not configured.')
      setLoading(false)
      return () => { active = false }
    }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      initialized = true
      setSession(nextSession)
      setLoading(false)
    })

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!active || initialized) return
        if (error) setProfileError(error.message)
        setSession(data.session)
        setLoading(false)
      } catch (error) {
        if (!active || initialized) return
        setProfileError(error instanceof Error ? error.message : 'Could not restore your session.')
        setLoading(false)
      }
    })()

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const user = session?.user ?? null

  useEffect(() => {
    let active = true
    setProfile(null)
    setProfileError(null)
    setProfileLoading(Boolean(user))
    if (!user) return

    void getSupabaseClient().from('profiles').select('id, display_name, role, avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) setProfileError(`Could not load your account profile: ${error.message}`)
        else if (!data) setProfileError('Your account profile is missing. Ask an administrator to check the database setup.')
        else setProfile(data as Profile)
        setProfileLoading(false)
      }, (error: unknown) => {
        if (active) {
          setProfileError(error instanceof Error ? error.message : 'Could not load your account profile.')
          setProfileLoading(false)
        }
      })

    return () => { active = false }
  }, [user?.id])

  async function refreshProfile() {
    if (!user) return
    setProfileError(null)
    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .select('id, display_name, role, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Your account profile is missing.')
    setProfile(data as Profile)
  }

  async function signOut() {
    const { error } = await getSupabaseClient().auth.signOut()
    if (error) throw error
    setSession(null)
    setProfile(null)
  }

  return <AuthContext.Provider value={{ user, profile, loading, profileLoading, profileError, signOut, refreshProfile }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
