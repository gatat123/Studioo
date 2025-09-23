'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Trash2, Shield, Edit, User, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { projectsAPI } from '@/lib/api/projects'
import type { ProjectParticipant } from '@/types'

interface ParticipantsListProps {
  projectId: string
}

function ParticipantsListContent({ projectId }: ParticipantsListProps) {
  const { toast } = useToast()
  const { user: currentUser } = useAuthStore()
  const searchParams = useSearchParams()
  const [participants, setParticipants] = useState<ProjectParticipant[]>([])
  const [loading, setLoading] = useState(true)
  interface Project {
    id: string
    creatorId: string
    name: string
  }

  const [project, setProject] = useState<Project | null>(null)

  const isAdminMode = searchParams.get('admin') === 'true'

  useEffect(() => {
    const loadParticipants = async () => {
      try {
        // Get project details first
        const projectData = await projectsAPI.getProject(projectId)
        setProject(projectData)

        // Get participants
        const participantsData = await projectsAPI.getParticipants(projectId)
        // Ensure participantsData is an array
        if (Array.isArray(participantsData)) {
          setParticipants(participantsData)
        } else {
          console.error('Participants data is not an array:', participantsData)
          setParticipants([])
        }
      } catch (error) {
        console.error('Failed to load participants:', error)
        toast({
          title: 'Error',
          description: 'Failed to load project members',
          variant: 'destructive',
        })
        setParticipants([])
      } finally {
        setLoading(false)
      }
    }

    loadParticipants()
  }, [projectId, toast])

  const isOwner = project?.creatorId === currentUser?.id
  const currentParticipant = Array.isArray(participants)
    ? participants.find(p => p.userId === currentUser?.id)
    : undefined
  const canManageMembers = isOwner || currentParticipant?.role === 'owner'

  const handleRoleChange = async (participant: ProjectParticipant, newRole: string) => {
    if (!canManageMembers) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to change member roles.',
        variant: 'destructive',
      })
      return
    }

    try {
      await projectsAPI.updateParticipantRole(
        projectId,
        participant.userId,
        newRole as 'owner' | 'editor' | 'viewer' | 'member'
      )

      setParticipants(prev =>
        prev.map(p =>
          p.id === participant.id ? { ...p, role: newRole as 'owner' | 'editor' | 'viewer' | 'member' } : p
        )
      )

      toast({
        title: 'Role Updated',
        description: `${participant.user?.nickname || 'Member'}'s role has been updated to ${newRole}.`,
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update member role.',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveParticipant = async (participant: ProjectParticipant) => {
    if (!canManageMembers) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to remove members.',
        variant: 'destructive',
      })
      return
    }

    try {
      await projectsAPI.removeParticipant(projectId, participant.userId)

      setParticipants(prev => prev.filter(p => p.id !== participant.id))

      toast({
        title: 'Member Removed',
        description: `${participant.user?.nickname || 'Member'} has been removed from the project.`,
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to remove member from project.',
        variant: 'destructive',
      })
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'editor':
        return 'secondary'
      case 'viewer':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />
      case 'editor':
        return <Edit className="h-3 w-3" />
      case 'viewer':
        return <User className="h-3 w-3" />
      case 'member':
        return <Shield className="h-3 w-3" />
      default:
        return <User className="h-3 w-3" />
    }
  }

  const formatJoinDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  // Filter out admin from participants list when in admin mode
  const displayParticipants = isAdminMode && currentUser?.isAdmin
    ? (Array.isArray(participants) ? participants.filter(p => p.userId !== currentUser.id) : [])
    : (Array.isArray(participants) ? participants : [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="p-8 text-center">
            <div className="animate-pulse">Loading members...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              {canManageMembers && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayParticipants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={participant.user?.profileImageUrl} />
                      <AvatarFallback>
                        {(participant.user?.nickname || participant.user?.username || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{participant.user?.nickname || participant.user?.username || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{participant.user?.email || 'No email'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canManageMembers && participant.role !== 'owner' && participant.userId !== project?.creatorId ? (
                    <Select
                      defaultValue={participant.role}
                      onValueChange={(value) => handleRoleChange(participant, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            <Edit className="h-3 w-3" />
                            Editor
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Viewer
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            Member
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(participant.role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(participant.role)}
                        {participant.role}
                        {participant.userId === project?.creatorId && ' (Creator)'}
                      </div>
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-gray-500">
                  {formatJoinDate(participant.joinedAt)}
                </TableCell>
                {canManageMembers && (
                  <TableCell className="text-right">
                    {participant.role !== 'owner' && participant.userId !== project?.creatorId && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {participant.user?.nickname || 'this member'} from the project?
                              They will lose access to all project resources.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveParticipant(participant)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-gray-500">
        <p>
          <strong>Owner:</strong> Full access to all project features and settings
        </p>
        <p>
          <strong>Editor:</strong> Can edit scenes, upload images, and manage comments
        </p>
        <p>
          <strong>Viewer:</strong> Can view project content and leave comments
        </p>
      </div>
    </div>
  )
}

export default function ParticipantsList({ projectId }: ParticipantsListProps) {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="h-12 bg-muted animate-pulse"></div>
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <ParticipantsListContent projectId={projectId} />
    </Suspense>
  )
}
