import { useState, useEffect } from 'react'

const STEPS = [
  {
    step: 1,
    title: 'Welcome to Todoist!',
    description: 'Stay organized and get more done. Name your first project to get started.',
    icon: (
      <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    step: 2,
    title: 'Create Your First Project',
    description: 'Projects help you group related tasks together. You can create one now or skip and do it later.',
    icon: (
      <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    step: 3,
    title: 'You are all set!',
    description: null,
    icon: (
      <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    highlights: [
      { key: 'keyboard', label: 'Keyboard shortcuts', detail: 'Press Q to add tasks, ? to see all shortcuts' },
      { key: 'moon', label: 'Dark mode', detail: 'Toggle from your profile menu anytime' },
      { key: 'phone', label: 'Install as PWA', detail: 'Add to home screen for a native app feel' },
      { key: 'target', label: 'Focus mode', detail: 'Filter by Today or Upcoming to stay on track' },
    ],
  },
]

const HighlightIcons = {
  keyboard: (
    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 14h.01M12 10h.01M9 10h.01M15 10h.01M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  ),
  moon: (
    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  phone: (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
}

export default function WelcomeModal({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [projectName, setProjectName] = useState('')
  const [projectId, setProjectId] = useState(null)
  const [step1Error, setStep1Error] = useState('')
  const [step1Loading, setStep1Loading] = useState(false)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') handleComplete()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!user || user.onboarding_completed) return null

  const stepData = STEPS[currentStep - 1]
  const isLastStep = currentStep === STEPS.length

  const handleNext = async () => {
    if (currentStep === 1) {
      const name = projectName.trim() || 'My Projects'
      setStep1Error('')
      setStep1Loading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
          },
          body: JSON.stringify({ name, color: '#4CAF50' }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || errData.message || 'Request failed (' + res.status + ')')
        }
        const project = await res.json()
        setProjectId(project.id)
        setCurrentStep((prev) => prev + 1)
      } catch (err) {
        setStep1Error(err.message || 'Failed to create project. Please try again.')
      } finally {
        setStep1Loading(false)
      }
    } else if (!isLastStep) {
      setCurrentStep((prev) => prev + 1)
    } else {
      await handleFinish()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  async function handleFinish() {
    setFinishing(true)
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({ onboarding_completed: true }),
      })
    } catch (_err) {
      // Non-blocking: proceed even if the request fails
    } finally {
      setFinishing(false)
      onComplete && onComplete()
    }
  }

  function handleComplete() {
    onComplete && onComplete()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome onboarding"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 flex flex-col items-center text-center">

        <div className="mt-2">
          {stepData.icon}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {stepData.title}
        </h2>

        {stepData.description && (
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-4">
            {stepData.description}
          </p>
        )}

        {currentStep === 1 && (
          <div className="w-full mb-4">
            <input
              type="text"
              value={projectName}
              onChange={(e) => { setProjectName(e.target.value); setStep1Error('') }}
              placeholder="My Projects"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
              aria-label="Project name"
              disabled={step1Loading}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNext() }}
            />
            {step1Error && (
              <p className="mt-2 text-xs text-red-500" role="alert">{step1Error}</p>
            )}
          </div>
        )}

        {currentStep === 2 && projectId && (
          <p className="text-xs text-green-600 dark:text-green-400 mb-4">
            Project created successfully!
          </p>
        )}

        {currentStep === 3 && stepData.highlights && (
          <ul className="w-full text-left mb-4 space-y-3">
            {stepData.highlights.map((item) => (
              <li key={item.key} className="flex items-start gap-3">
                <span className="flex-shrink-0 mt-0.5">
                  {HighlightIcons[item.key]}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-center gap-2 mb-8" aria-label={'Step ' + currentStep + ' of ' + STEPS.length}>
          {STEPS.map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              aria-label={'Go to step ' + s.step}
              className={[
                'rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400',
                currentStep === s.step
                  ? 'w-6 h-3 bg-red-500'
                  : 'w-3 h-3 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="flex w-full gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={finishing}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors disabled:opacity-60"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
              disabled={step1Loading}
            >
              Skip
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={step1Loading || finishing}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            {step1Loading ? 'Creating...' : finishing ? 'Saving...' : isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
