'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    signOut: () => Promise<void>
    refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signOut: async () => { },
    refreshSession: async () => { },
})

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const refreshSession = useCallback(async () => {
        try {
            const { data: { session: newSession } } = await supabase.auth.getSession()
            setSession(newSession)
            setUser(newSession?.user ?? null)
        } catch (error) {
            console.error('Error refreshing session:', error)
        }
    }, [supabase])

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession()
                setSession(initialSession)
                setUser(initialSession?.user ?? null)
            } catch (error) {
                console.error('Error getting initial session:', error)
            } finally {
                setLoading(false)
            }
        }

        getInitialSession()

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                setSession(newSession)
                setUser(newSession?.user ?? null)
                setLoading(false)

                // Handle specific auth events
                if (event === 'SIGNED_OUT') {
                    // Clear any stored fund selection
                    localStorage.removeItem('selectedFundId')
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase])

    const signOut = async () => {
        try {
            await supabase.auth.signOut()
            // Clear stored fund selection on sign out
            localStorage.removeItem('selectedFundId')
        } catch (error) {
            console.error('Error signing out:', error)
            throw error
        }
    }

    const value: AuthContextType = {
        user,
        session,
        loading,
        signOut,
        refreshSession,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
