import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CreateProjectDialog from './CreateProjectDialog'

const API_BASE = 'http://localhost:3456'

// Drag handle icon
function GripIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-gray-400 shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 4a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm6-14a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  )
}

function SortableProject({ project, isActive, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  // Todoist color scheme: active = red #DB4035 with white text, hover = #3D3D3D on dark sidebar
  const baseStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    ...(isActive ? { backgroundColor: '#DB4035', color: '#ffffff' } : { color: '#d1d5db' }),
  }

  return (
    <div
      ref={setNodeRef}
      style={baseStyle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer select-none group transition-colors ${
        isActive ? 'font-medium' : ''
      }`}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#3D3D3D' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '' }}
      onClick={() => onSelect(project)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(project)}
      aria-label={`Project: ${project.name}`}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <GripIcon />
      </span>

      {/* Color dot */}
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: project.color || '#6366f1' }}
      />

      {/* Name */}
      <span className="flex-1 truncate text-sm">{project.name}</span>

      {/* Task count */}
      {project.task_count > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
          {project.task_count}
        </span>
      )}
    </div>
  )
}

export default function Sidebar({ activeProjectId, onSelectProject, token }) {
  const [projects, setProjects] = useState([])
  const [activeId, setActiveId] = useState(null)
  const { isDark, toggleTheme } = useTheme()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const fetchProjects = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }, [token])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return

    const oldIndex = projects.findIndex((p) => p.id === active.id)
    const newIndex = projects.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(projects, oldIndex, newIndex)
    setProjects(reordered) // optimistic update

    const payload = reordered.map((p, i) => ({ id: p.id, sort_order: i }))
    try {
      await fetch(`${API_BASE}/api/projects/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projects: payload }),
      })
    } catch (err) {
      console.error('Failed to save project order:', err)
      fetchProjects() // revert on error
    }
  }

  const handleProjectCreated = (newProject) => {
    setProjects((prev) => [...prev, newProject])
  }

  const activeProject = activeId ? projects.find((p) => p.id === activeId) : null
  // Separate inbox from regular projects for DnD (inbox is pinned at top)
  const inboxProjects = projects.filter((p) => p.is_inbox)
  const regularProjects = projects.filter((p) => !p.is_inbox)

  return (
    <>
    <div className="flex flex-col h-full overflow-y-auto py-4 px-2 space-y-1">
      {/* Projects header with Add button */}
      <div className="flex items-center justify-between px-3 mb-1">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Projects
        </p>
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Add project"
          title="Add project"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Inbox (not draggable) */}
      {inboxProjects.map((project) => (
        <div
          key={project.id}
          className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer select-none ${
            activeProjectId === project.id
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium'
              : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
          onClick={() => onSelectProject(project)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelectProject(project)}
        >
          <span className="w-3.5 h-3.5 shrink-0" /> {/* placeholder for grip */}
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: project.color || '#6366f1' }}
          />
          <span className="flex-1 truncate text-sm">{project.name}</span>
          {project.task_count > 0 && (
            <span className="text-xs text-gray-400">{project.task_count}</span>
          )}
        </div>
      ))}

      {/* Draggable regular projects */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={regularProjects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {regularProjects.map((project) => (
            <SortableProject
              key={project.id}
              project={project}
              isActive={activeProjectId === project.id}
              onSelect={onSelectProject}
            />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-600 opacity-90 text-sm">
              <GripIcon />
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeProject.color || '#6366f1' }}
              />
              <span className="truncate">{activeProject.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>

    {showCreateDialog && (
      <CreateProjectDialog
        token={token}
        onProjectCreated={handleProjectCreated}
        onClose={() => setShowCreateDialog(false)}
      />
    )}
    </>
  )
}
