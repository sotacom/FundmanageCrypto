import { createClient } from '@/lib/supabase-server'
import { db as prisma } from '@/lib/db'

export type FundRole = 'owner' | 'editor' | 'viewer'

export interface AuthUser {
    id: string
    email: string
    name?: string
    avatarUrl?: string
}

/**
 * Get the current authenticated user from the request
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return null
        }

        // Ensure user exists in our database
        await ensureUserExists(user.id, user.email!, user.user_metadata?.name, user.user_metadata?.avatar_url)

        return {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.user_metadata?.full_name,
            avatarUrl: user.user_metadata?.avatar_url,
        }
    } catch (error) {
        console.error('Error getting current user:', error)
        return null
    }
}

/**
 * Ensure user exists in our database (sync with Supabase Auth)
 */
export async function ensureUserExists(
    id: string,
    email: string,
    name?: string,
    avatarUrl?: string
): Promise<void> {
    try {
        await prisma.user.upsert({
            where: { id },
            update: {
                email,
                name: name || undefined,
                avatarUrl: avatarUrl || undefined,
            },
            create: {
                id,
                email,
                name: name || null,
                avatarUrl: avatarUrl || null,
            },
        })
    } catch (error) {
        console.error('Error ensuring user exists:', error)
    }
}

/**
 * Check if a user has access to a fund and get their role
 */
export async function checkFundAccess(
    userId: string,
    fundId: string,
    requiredRole?: FundRole
): Promise<{ hasAccess: boolean; role: FundRole | null }> {
    try {
        // Check if user is owner
        const fund = await prisma.fund.findUnique({
            where: { id: fundId },
            select: { ownerId: true },
        })

        if (fund?.ownerId === userId) {
            return { hasAccess: true, role: 'owner' }
        }

        // Check FundMember table
        const membership = await prisma.fundMember.findUnique({
            where: {
                fundId_userId: {
                    fundId,
                    userId,
                },
            },
            select: { role: true },
        })

        if (!membership) {
            // Legacy support: if fund has no owner, allow access for migration period
            if (!fund?.ownerId) {
                return { hasAccess: true, role: 'owner' }
            }
            return { hasAccess: false, role: null }
        }

        const role = membership.role as FundRole

        // Check if role meets requirement
        if (requiredRole) {
            const roleHierarchy: Record<FundRole, number> = {
                viewer: 1,
                editor: 2,
                owner: 3,
            }

            if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
                return { hasAccess: false, role }
            }
        }

        return { hasAccess: true, role }
    } catch (error) {
        console.error('Error checking fund access:', error)
        return { hasAccess: false, role: null }
    }
}

/**
 * Get all funds accessible by a user
 */
export async function getUserFunds(userId: string): Promise<Array<{
    fundId: string
    fundName: string
    fundTimezone: string
    role: FundRole
}>> {
    try {
        // Get funds where user is owner
        const ownedFunds = await prisma.fund.findMany({
            where: { ownerId: userId },
            select: { id: true, name: true, timezone: true },
        })

        // Get funds through membership
        const memberFunds = await prisma.fundMember.findMany({
            where: { userId },
            select: {
                role: true,
                fund: {
                    select: { id: true, name: true, timezone: true },
                },
            },
        })

        // Combine results, avoiding duplicates
        const fundMap = new Map<string, { fundId: string; fundName: string; fundTimezone: string; role: FundRole }>()

        for (const fund of ownedFunds) {
            fundMap.set(fund.id, { fundId: fund.id, fundName: fund.name, fundTimezone: fund.timezone, role: 'owner' })
        }

        for (const membership of memberFunds) {
            if (!fundMap.has(membership.fund.id)) {
                fundMap.set(membership.fund.id, {
                    fundId: membership.fund.id,
                    fundName: membership.fund.name,
                    fundTimezone: membership.fund.timezone,
                    role: membership.role as FundRole,
                })
            }
        }

        // Also include orphaned funds (no owner) for migration
        const orphanedFunds = await prisma.fund.findMany({
            where: { ownerId: null },
            select: { id: true, name: true, timezone: true },
        })

        for (const fund of orphanedFunds) {
            if (!fundMap.has(fund.id)) {
                fundMap.set(fund.id, { fundId: fund.id, fundName: fund.name, fundTimezone: fund.timezone, role: 'owner' })
            }
        }

        return Array.from(fundMap.values())
    } catch (error) {
        console.error('Error getting user funds:', error)
        return []
    }
}

/**
 * Assign an owner to an orphaned fund (for migration)
 */
export async function claimOrphanedFund(userId: string, fundId: string): Promise<boolean> {
    try {
        const fund = await prisma.fund.findUnique({
            where: { id: fundId },
            select: { ownerId: true },
        })

        if (!fund || fund.ownerId) {
            return false // Fund doesn't exist or already has owner
        }

        await prisma.fund.update({
            where: { id: fundId },
            data: { ownerId: userId },
        })

        // Also create FundMember entry
        await prisma.fundMember.upsert({
            where: {
                fundId_userId: { fundId, userId },
            },
            create: {
                fundId,
                userId,
                role: 'owner',
            },
            update: {
                role: 'owner',
            },
        })

        return true
    } catch (error) {
        console.error('Error claiming orphaned fund:', error)
        return false
    }
}

/**
 * Create a new fund with the user as owner
 */
export async function createFundWithOwner(
    userId: string,
    fundData: { name: string; description?: string }
): Promise<{ id: string; name: string } | null> {
    try {
        const fund = await prisma.fund.create({
            data: {
                name: fundData.name,
                description: fundData.description,
                ownerId: userId,
            },
            select: { id: true, name: true },
        })

        // Also create FundMember entry
        await prisma.fundMember.create({
            data: {
                fundId: fund.id,
                userId,
                role: 'owner',
            },
        })

        return fund
    } catch (error) {
        console.error('Error creating fund:', error)
        return null
    }
}
