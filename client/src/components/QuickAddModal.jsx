import { useState, useEffect, useRef } from 'react'
import ProjectPicker from './ProjectPicker'

const PRIORITY_OPTIONS = [
  { value: 'p1', label: 'P1', color: 'bg-red-500', textColor: 'text-red-500' },
  { value: 'p2', label: 'P2', color: 'bg-orange-500', textColor: 'text-orange-500' },
  { value: 'p3', label: 'P3', color: 'bg-blue-500', textColor: 'text-blue-500' },
  { value: 'p4', label: 'P4', color: 'bg-gray-400', textColor: 'text-gray-400' },
]

export default function QuickAddModal({ isOpen, onClose, onSubmit, projects = [] }) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [priority, setPriority] = useState('p4')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const titleRef = useRef(null)

  // Reset form when modal opens; auto-focus title field
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setProjectId('')
      setSectionId('')
      setPriority('p4')
      setDueDate('')
      setDescription('')
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      titleRef.current?.focus()
      return
    }
    onSubmit && onSubmit({ title: title.trim(), projectId, sectionId, priority, dueDate, description })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Quick add task"
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title (required) */}
          <div>
            <label htmlFor="qa-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Task name <span className="text-red-500">*</span>
            </label>
            <input
              id="qa-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Buy groceries"
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="qa-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="qa-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Project picker */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project
              </label>
              <ProjectPicker
                projects={projects}
                value={projectId}
                onChange={(selectedProjectId, selectedSectionId) => {
                  setProjectId(selectedProjectId)
                  setSectionId(selectedSectionId || '')
                }}
                placeholder="No project"
              />
            </div>

            {/* Due date */}
            <div className="flex-1">
              <label htmlFor="qa-due-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due date
              </label>
              <input
                id="qa-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Priority selector: p1=red, p2=orange, p3=blue, p4=gray */}
          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</span>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const selected = priority === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    aria-pressed={selected}
                    className={[
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all focus:outline-none focus:ring-2',
                      selected
                        ? opt.color + ' text-white border-transparent shadow'
                        : 'bg-transparent ' + opt.textColor + ' border-current hover:opacity-80',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'inline-block w-2.5 h-2.5 rounded-full',
                        selected ? 'bg-white/80' : opt.color,
                      ].join(' ')}
                    />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              Add task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
