import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import TaskItem from './TaskItem'
import TaskEditModal from './TaskEditModal'

const API_BASE = 'http://localhost:3456'

/**
 * TaskList — renders a sortable list of tasks with drag-and-drop reordering.
 *
 * Props:
 *   tasks        {array}   array of task objects
 *   onRefresh    {fn}      called when the list should re-fetch (no args)
 *   emptyMessage {string}  shown when tasks is empty
 */
export default function TaskList({ tasks = [], onRefresh, emptyMessage = 'No tasks yet.' }) {
  const [editingTask, setEditingTask] = useState(null)
  const [localTasks, setLocalTasks] = useState(tasks)
  const [activeId, setActiveId] = useState(null)

  // Sync localTasks when parent tasks prop changes
  const [prevTasks, setPrevTasks] = useState(tasks)
  if (tasks !== prevTasks) {
    setPrevTasks(tasks)
    setLocalTasks(tasks)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // require 5px movement before drag starts (prevents accidental clicks)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleEdit = useCallback((task) => {
    setEditingTask(task)
  }, [])

  const handleDuplicated = useCallback(() => {
    onRefresh && onRefresh()
  }, [onRefresh])

  const handleMoved = useCallback(() => {
    onRefresh && onRefresh()
  }, [onRefresh])

  const handleDeleted = useCallback(() => {
    onRefresh && onRefresh()
  }, [onRefresh])

  const handleToggleComplete = useCallback(async (task) => {
    try {
      await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ completed: !task.completed }),
      })
      onRefresh && onRefresh()
    } catch (err) {
      console.error('Toggle complete failed:', err)
    }
  }, [onRefresh])

  const handleEditSave = useCallback(() => {
    setEditingTask(null)
    onRefresh && onRefresh()
  }, [onRefresh])

  const handleInlineUpdated = useCallback(() => {
    onRefresh && onRefresh()
  }, [onRefresh])

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = localTasks.findIndex((t) => t.id === active.id)
    const newIndex = localTasks.findIndex((t) => t.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistically reorder locally
    const reordered = arrayMove(localTasks, oldIndex, newIndex)
    setLocalTasks(reordered)

    // Persist new sort_order values via bulk reorder endpoint
    try {
      const updates = reordered.map((task, index) => ({ id: task.id, sort_order: index }))

      await fetch(`${API_BASE}/api/tasks/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tasks: updates }),
      })

      onRefresh && onRefresh()
    } catch (err) {
      console.error('Failed to persist task reorder:', err)
      // Revert optimistic update on failure
      setLocalTasks(tasks)
    }
  }, [localTasks, tasks, onRefresh])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const activeTask = activeId ? localTasks.find((t) => t.id === activeId) : null

  if (localTasks.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
        {emptyMessage}
      </p>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={localTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div role="list" className="flex flex-col gap-0.5">
            {localTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDuplicated={handleDuplicated}
                onMoved={handleMoved}
                onDeleted={handleDeleted}
                onToggleComplete={handleToggleComplete}
                onInlineUpdated={handleInlineUpdated}
                isDragging={activeId === task.id}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag overlay — renders the dragged task as a floating clone */}
        <DragOverlay>
          {activeTask ? (
            <div className="opacity-90 shadow-lg rounded-lg border border-blue-300 bg-white dark:bg-gray-900">
              <TaskItem
                task={activeTask}
                onEdit={() => {}}
                onDuplicated={() => {}}
                onMoved={() => {}}
                onDeleted={() => {}}
                onToggleComplete={() => {}}
                onInlineUpdated={() => {}}
                isDragging={false}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleEditSave}
        />
      )}
    </>
  )
}
