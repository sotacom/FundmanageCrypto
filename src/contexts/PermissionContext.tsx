'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'

type FundRole = 'owner' | 'editor' | 'viewer'

interface FundAccess {
    fundId: string
    fundName: string
    fundTimezone: string
    role: FundRole
}

interface PermissionContextType {
    currentFundId: string | null
    currentFundName: string | null
    currentFundTimezone: string
    currentRole: FundRole | null
    funds: FundAccess[]
    loading: boolean
    canEdit: boolean      // owner or editor
    canManage: boolean    // owner only (settings, members)
    switchFund: (fundId: string) => void
    refreshFunds: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType>({
    currentFundId: null,
    currentFundName: null,
    currentFundTimezone: 'Asia/Ho_Chi_Minh',
    currentRole: null,
    funds: [],
    loading: true,
    canEdit: false,
    canManage: false,
    switchFund: () => { },
    refreshFunds: async () => { },
})

export function usePermission() {
    const context = useContext(PermissionContext)
    if (!context) {
        throw new Error('usePermission must be used within a PermissionProvider')
    }
    return context
}

interface PermissionProviderProps {
    children: React.ReactNode
}

export function PermissionProvider({ children }: PermissionProviderProps) {
    const { user, loading: authLoading } = useAuth()
    const [currentFundId, setCurrentFundId] = useState<string | null>(null)
    const [funds, setFunds] = useState<FundAccess[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch user's accessible funds
    const refreshFunds = useCallback(async () => {
        if (!user) {
            setFunds([])
            setCurrentFundId(null)
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const response = await fetch('/api/funds')
            if (response.ok) {
                const data = await response.json()
                const fundsList: FundAccess[] = data.funds || []
                setFunds(fundsList)

                // Restore saved fund selection or select first fund
                const savedFundId = localStorage.getItem('selectedFundId')
                const savedFundExists = fundsList.some(f => f.fundId === savedFundId)

                if (savedFundId && savedFundExists) {
                    setCurrentFundId(savedFundId)
                } else if (fundsList.length > 0) {
                    setCurrentFundId(fundsList[0].fundId)
                    localStorage.setItem('selectedFundId', fundsList[0].fundId)
                }
            }
        } catch (error) {
            console.error('Error fetching funds:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (!authLoading) {
            refreshFunds()
        }
    }, [authLoading, refreshFunds])

    const switchFund = useCallback((fundId: string) => {
        const fundExists = funds.some(f => f.fundId === fundId)
        if (fundExists) {
            setCurrentFundId(fundId)
            localStorage.setItem('selectedFundId', fundId)
        }
    }, [funds])

    // Get current fund info
    const currentFund = funds.find(f => f.fundId === currentFundId)
    const currentFundName = currentFund?.fundName ?? null
    const currentFundTimezone = currentFund?.fundTimezone ?? 'Asia/Ho_Chi_Minh'
    const currentRole = currentFund?.role ?? null
    const canEdit = currentRole === 'owner' || currentRole === 'editor'
    const canManage = currentRole === 'owner'

    const value: PermissionContextType = {
        currentFundId,
        currentFundName,
        currentFundTimezone,
        currentRole,
        funds,
        loading: loading || authLoading,
        canEdit,
        canManage,
        switchFund,
        refreshFunds,
    }

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    )
}
