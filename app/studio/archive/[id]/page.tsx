'use client'

import { use } from 'react'
import { ArchivedProjectView } from '@/components/projects/ArchivedProjectView'

interface ArchivedProjectPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ArchivedProjectPage({ params }: ArchivedProjectPageProps) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id

  return (
    <ArchivedProjectView project_id={projectId} isArchived={true} />
  )
}