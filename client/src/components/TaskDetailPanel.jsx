import { useState, useEffect, useRef, useCallback } from 'react'
import ProjectPicker from './ProjectPicker'
import RecurringPicker from './RecurringPicker'

const API_BASE = 'http://localhost:3456'

const PRIORITY_OPTIONS = [
  { value: 1, label: 'P1', color: 'bg-red-500', textColor: 'text-red-500', dotColor: '#ef4444' },
  { value: 2, label: 'P2', color: 'bg-orange-500', textColor: 'text-orange-500', dotColor: '#f97316' },
  { value: 3, label: 'P3', color: 'bg-blue-500', textColor: 'text-blue-500', dotColor: '#3b82f6' },
  { value: 4, label: 'P4', color: 'bg-gray-400', textColor: 'text-gray-400', dotColor: '#9ca3af' },
]

/**
 * TaskDetailPanel — right-side drawer showing full task details.
 *
 * Props:
 *   task        {object|null}  task to display; null = closed
 *   onClose     {fn}           () => void
 *   onUpdated   {fn}           (updatedTask) => void  — called after save
 *   onDeleted   {fn}           (taskId) => void
 */
export default function TaskDetailPanel({ task, onClose, onUpdated, onDeleted }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recurring, setRecurring] = useState(null)
  const [priority, setPriority] = useState(4)
  const [labels, setLabels] = useState([]) // all available labels
  const [selectedLabelIds, setSelectedLabelIds] = useState([]) // ids of selected labels
  const [subtasks, setSubtasks] = useState([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [commentPosting, setCommentPosting] = useState(false)
  const [subtaskAdding, setSubtaskAdding] = useState(false)
  const titleRef = useRef(null)
  const panelRef = useRef(null)

  // Populate form fields when task changes
  useEffect(() => {
    if (!task) return
    setTitle(task.title || '')
    setDescription(task.description || '')
    setProjectId(task.project_id ? String(task.project_id) : '')
    setSectionId(task.section_id ? String(task.section_id) : '')
    setDueDate(task.due_date || '')
    setRecurring(task.recurring || null)
    setPriority(task.priority || 4)
    setSelectedLabelIds((task.labels || []).map((l) => String(l.id || l)))
    setSaveError('')
    setNewComment('')
    setNewSubtaskTitle('')
    // Fetch subtasks and comments
    fetchSubtasks(task.id)
    fetchComments(task.id)
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all labels on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/labels`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { labels: [] })
      .then(({ labels: fetched }) => setLabels(fetched || []))
      .catch(() => setLabels([]))
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (task) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [task, onClose])

  // Focus title on open
  useEffect(() => {
    if (task) {
      setTimeout(() => titleRef.current?.focus(), 80)
    }
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSubtasks = useCallback(async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}/subtasks`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSubtasks(data.subtasks || data || [])
      }
    } catch {
      setSubtasks([])
    }
  }, [])

  const fetchComments = useCallback(async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}/comments`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || data || [])
      }
    } catch {
      setComments([])
    }
  }, [])

  const handleSave = async () => {
    if (!title.trim()) {
      titleRef.current?.focus()
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        title: title.trim(),
        description,
        project_id: projectId || null,
        section_id: sectionId || null,
        due_date: dueDate || null,
        recurring: recurring || null,
        priority,
        labels: selectedLabelIds,
      }
      const res = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSaveError(err.error || 'Failed to save')
      } else {
        const data = await res.json()
        onUpdated && onUpdated(data.task || data)
      }
    } catch {
      setSaveError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return
    setSubtaskAdding(true)
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      })
      if (res.ok) {
        setNewSubtaskTitle('')
        fetchSubtasks(task.id)
      }
    } catch {
      // ignore
    } finally {
      setSubtaskAdding(false)
    }
  }

  const handleToggleSubtask = async (subtask) => {
    try {
      await fetch(`${API_BASE}/api/subtasks/${subtask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ completed: !subtask.completed }),
      })
      fetchSubtasks(task.id)
    } catch {
      // ignore
    }
  }

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await fetch(`${API_BASE}/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      fetchSubtasks(task.id)
    } catch {
      // ignore
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setCommentPosting(true)
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment.trim() }),
      })
      if (res.ok) {
        setNewComment('')
        fetchComments(task.id)
      }
    } catch {
      // ignore
    } finally {
      setCommentPosting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await fetch(`${API_BASE}/api/tasks/${task.id}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      fetchComments(task.id)
    } catch {
      // ignore
    }
  }

  const handleDeleteTask = async () => {
    if (!window.confirm('Delete this task?')) return
    try {
      await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      onDeleted && onDeleted(task.id)
      onClose()
    } catch {
      setSaveError('Failed to delete')
    }
  }

  const toggleLabel = (labelId) => {
    const sid = String(labelId)
    setSelectedLabelIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    )
  }

  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[3]

  if (!task) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        ref={panelRef}
        role="complementary"
        aria-label="Task detail panel"
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">Task detail</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteTask}
              title="Delete task"
              className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Delete task"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Close panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Title */}
          <div>
            <label htmlFor="tdp-title" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Title
            </label>
            <input
              id="tdp-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="tdp-description" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Description
            </label>
            <textarea
              id="tdp-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 resize-none"
            />
          </div>

          {/* Project / Section selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Project &amp; Section
            </label>
            <ProjectPicker
              value={sectionId || projectId}
              onChange={({ projectId: pid, sectionId: sid }) => {
                setProjectId(pid || '')
                setSectionId(sid || '')
              }}
              placeholder="No project"
              apiBase={API_BASE}
            />
          </div>

          {/* Due date */}
          <div>
            <label htmlFor="tdp-due-date" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Due date
            </label>
            <input
              id="tdp-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Priority selector */}
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Priority
            </span>
            <div className="flex gap-2 flex-wrap">
              {PRIORITY_OPTIONS.map((opt) => {
                const selected = priority === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    aria-pressed={selected}
                    className={[
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all focus:outline-none focus:ring-2',
                      selected
                        ? opt.color + ' text-white border-transparent shadow-sm'
                        : 'bg-transparent ' + opt.textColor + ' border-current hover:opacity-80',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'inline-block w-2 h-2 rounded-full',
                        selected ? 'bg-white/80' : opt.color,
                      ].join(' ')}
                    />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Labels multi-select */}
          {labels.length > 0 && (
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Labels
              </span>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => {
                  const sid = String(label.id)
                  const selected = selectedLabelIds.includes(sid)
                  return (
                    <button
                      key={sid}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      aria-pressed={selected}
                      className={[
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all focus:outline-none focus:ring-2',
                        selected
                          ? 'border-transparent text-white shadow-sm'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400',
                      ].join(' ')}
                      style={selected ? { backgroundColor: label.color || '#6b7280' } : {}}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color || '#6b7280' }}
                      />
                      {label.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sub-tasks */}
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Sub-tasks ({subtasks.length})
            </span>
            {subtasks.length > 0 && (
              <ul className="mb-2 space-y-1">
                {subtasks.map((st) => (
                  <li
                    key={st.id}
                    className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(st)}
                      aria-label={st.completed ? 'Mark sub-task incomplete' : 'Mark sub-task complete'}
                      className={[
                        'flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-1',
                        st.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-400 hover:border-green-500',
                      ].join(' ')}
                    >
                      {st.completed && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={[
                      'flex-1 text-sm',
                      st.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200',
                    ].join(' ')}>
                      {st.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(st.id)}
                      aria-label="Delete sub-task"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition-all focus:outline-none focus:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {/* Add sub-task input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask() }}
                placeholder="Add sub-task..."
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={subtaskAdding || !newSubtaskTitle.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add
              </button>
            </div>
          </div>

          {/* Comments */}
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Comments ({comments.length})
            </span>
            {comments.length > 0 && (
              <ul className="mb-3 space-y-2">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="group flex gap-2 items-start bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                  >
                    {/* Avatar placeholder */}
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                      <span className="text-white text-xs font-bold">
                        {(c.user_name || c.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {c.user_name || c.username || 'User'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 break-words">{c.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      aria-label="Delete comment"
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded text-gray-400 hover:text-red-500 transition-all focus:outline-none focus:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {/* New comment textarea + submit */}
            <div className="flex flex-col gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment()
                }}
                placeholder="Write a comment... (Ctrl+Enter to post)"
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 resize-none"
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={commentPosting || !newComment.trim()}
                className="self-end px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 text-white text-sm font-medium disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Post comment
              </button>
            </div>
          </div>
        </div>

        {/* Footer: save / cancel */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center justify-between gap-3 bg-white dark:bg-gray-900">
          {saveError && (
            <p className="text-xs text-red-500 flex-1 truncate" role="alert">{saveError}</p>
          )}
          {!saveError && <span className="flex-1" />}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
