import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, checkFundAccess, FundRole } from '@/lib/auth-utils'

interface RouteParams {
    params: Promise<{ fundId: string }>
}

// GET - Get all members of a fund
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { fundId } = await params
        const access = await checkFundAccess(user.id, fundId)

        if (!access.hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const members = await db.fundMember.findMany({
            where: { fundId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        })

        // Get fund owner info
        const fund = await db.fund.findUnique({
            where: { id: fundId },
            select: {
                ownerId: true,
                owner: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        })

        return NextResponse.json({
            members: members.map(m => ({
                id: m.id,
                userId: m.userId,
                email: m.user.email,
                name: m.user.name,
                avatarUrl: m.user.avatarUrl,
                role: m.role,
                isOwner: m.userId === fund?.ownerId,
                createdAt: m.createdAt,
            })),
            owner: fund?.owner,
        })
    } catch (error) {
        console.error('Error fetching fund members:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST - Invite a new member to the fund
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { fundId } = await params
        const access = await checkFundAccess(user.id, fundId, 'owner')

        if (!access.hasAccess) {
            return NextResponse.json(
                { error: 'Only fund owner can invite members' },
                { status: 403 }
            )
        }

        const { email, role } = await request.json()

        if (!email || !role) {
            return NextResponse.json(
                { error: 'Email and role are required' },
                { status: 400 }
            )
        }

        if (!['editor', 'viewer'].includes(role)) {
            return NextResponse.json(
                { error: 'Role must be "editor" or "viewer"' },
                { status: 400 }
            )
        }

        // Find user by email
        const invitedUser = await db.user.findUnique({
            where: { email },
        })

        if (!invitedUser) {
            return NextResponse.json(
                { error: 'User not found. They must sign up first.' },
                { status: 404 }
            )
        }

        // Check if already a member
        const existingMember = await db.fundMember.findUnique({
            where: {
                fundId_userId: { fundId, userId: invitedUser.id },
            },
        })

        if (existingMember) {
            return NextResponse.json(
                { error: 'User is already a member of this fund' },
                { status: 400 }
            )
        }

        // Create membership
        const member = await db.fundMember.create({
            data: {
                fundId,
                userId: invitedUser.id,
                role,
                invitedBy: user.id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        })

        return NextResponse.json({
            success: true,
            member: {
                id: member.id,
                userId: member.userId,
                email: member.user.email,
                name: member.user.name,
                avatarUrl: member.user.avatarUrl,
                role: member.role,
                createdAt: member.createdAt,
            },
        })
    } catch (error) {
        console.error('Error inviting fund member:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH - Update member role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { fundId } = await params
        const access = await checkFundAccess(user.id, fundId, 'owner')

        if (!access.hasAccess) {
            return NextResponse.json(
                { error: 'Only fund owner can update member roles' },
                { status: 403 }
            )
        }

        const { memberId, role } = await request.json()

        if (!memberId || !role) {
            return NextResponse.json(
                { error: 'Member ID and role are required' },
                { status: 400 }
            )
        }

        if (!['editor', 'viewer'].includes(role)) {
            return NextResponse.json(
                { error: 'Role must be "editor" or "viewer"' },
                { status: 400 }
            )
        }

        // Get the member
        const member = await db.fundMember.findUnique({
            where: { id: memberId },
        })

        if (!member || member.fundId !== fundId) {
            return NextResponse.json(
                { error: 'Member not found' },
                { status: 404 }
            )
        }

        // Can't change owner's role through this endpoint
        const fund = await db.fund.findUnique({
            where: { id: fundId },
            select: { ownerId: true },
        })

        if (member.userId === fund?.ownerId) {
            return NextResponse.json(
                { error: 'Cannot change owner role' },
                { status: 400 }
            )
        }

        // Update role
        const updatedMember = await db.fundMember.update({
            where: { id: memberId },
            data: { role },
        })

        return NextResponse.json({
            success: true,
            member: updatedMember,
        })
    } catch (error) {
        console.error('Error updating fund member:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE - Remove member from fund
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { fundId } = await params
        const access = await checkFundAccess(user.id, fundId, 'owner')

        if (!access.hasAccess) {
            return NextResponse.json(
                { error: 'Only fund owner can remove members' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const memberId = searchParams.get('memberId')

        if (!memberId) {
            return NextResponse.json(
                { error: 'Member ID is required' },
                { status: 400 }
            )
        }

        // Get the member
        const member = await db.fundMember.findUnique({
            where: { id: memberId },
        })

        if (!member || member.fundId !== fundId) {
            return NextResponse.json(
                { error: 'Member not found' },
                { status: 404 }
            )
        }

        // Can't remove owner
        const fund = await db.fund.findUnique({
            where: { id: fundId },
            select: { ownerId: true },
        })

        if (member.userId === fund?.ownerId) {
            return NextResponse.json(
                { error: 'Cannot remove fund owner' },
                { status: 400 }
            )
        }

        // Delete membership
        await db.fundMember.delete({
            where: { id: memberId },
        })

        return NextResponse.json({
            success: true,
            message: 'Member removed successfully',
        })
    } catch (error) {
        console.error('Error removing fund member:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
