'use client'

import { usePermission } from '@/contexts/PermissionContext'

type RequiredRole = 'viewer' | 'editor' | 'owner'

interface PermissionGateProps {
    children: React.ReactNode
    /**
     * Minimum required role to view children
     * - 'viewer': All authenticated users with access can see
     * - 'editor': Owner or editor can see
     * - 'owner': Only owner can see
     */
    requiredRole?: RequiredRole
    /**
     * Alternative: Check specific permission
     */
    canEdit?: boolean
    canManage?: boolean
    /**
     * Fallback component to render if permission denied
     */
    fallback?: React.ReactNode
}

/**
 * Conditionally renders children based on user's role/permissions
 */
export function PermissionGate({
    children,
    requiredRole,
    canEdit: requireEdit,
    canManage: requireManage,
    fallback = null,
}: PermissionGateProps) {
    const { currentRole, canEdit, canManage, loading } = usePermission()

    // Don't render anything while loading
    if (loading) {
        return null
    }

    // No role means no access
    if (!currentRole) {
        return <>{fallback}</>
    }

    // Check specific permission flags
    if (requireEdit && !canEdit) {
        return <>{fallback}</>
    }

    if (requireManage && !canManage) {
        return <>{fallback}</>
    }

    // Check role hierarchy
    if (requiredRole) {
        const roleHierarchy: Record<RequiredRole, number> = {
            viewer: 1,
            editor: 2,
            owner: 3,
        }

        const userRoleLevel = roleHierarchy[currentRole] || 0
        const requiredLevel = roleHierarchy[requiredRole]

        if (userRoleLevel < requiredLevel) {
            return <>{fallback}</>
        }
    }

    return <>{children}</>
}
