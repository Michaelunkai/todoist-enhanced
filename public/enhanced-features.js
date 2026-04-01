// Enhanced Features: Dark Mode, Keyboard Shortcuts, Drag & Drop, Templates, Bulk Actions

// ============= DARK MODE =============
function initDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
    }

    // Create dark mode toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'dark-mode-toggle';
    toggleBtn.innerHTML = isDark ? '☀️' : '🌙';
    toggleBtn.title = 'Toggle Dark Mode (Ctrl+D)';
    toggleBtn.onclick = toggleDarkMode;
    document.body.appendChild(toggleBtn);
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark);
    const toggleBtn = document.querySelector('.dark-mode-toggle');
    toggleBtn.innerHTML = isDark ? '☀️' : '🌙';
    showToast(isDark ? 'Dark mode enabled 🌙' : 'Light mode enabled ☀️', 'info');
}

// ============= KEYBOARD SHORTCUTS =============
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+K: Quick add task
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('taskInput').focus();
        }

        // Ctrl+D: Toggle dark mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            toggleDarkMode();
        }

        // Ctrl+F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }

        // Alt+1-4: Navigate views
        if (e.altKey && e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const views = ['inbox', 'today', 'upcoming', 'stats'];
            switchView(views[parseInt(e.key) - 1]);
        }

        // Escape: Close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
            document.getElementById('shortcutsPanel').style.display = 'none';
        }

        // Delete: Delete selected tasks (bulk actions)
        if (e.key === 'Delete' && selectedTasks.size > 0) {
            bulkDeleteTasks();
        }

        // Ctrl+A: Select all visible tasks
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            selectAllTasks();
        }
    });
}

// ============= DRAG AND DROP =============
let draggedTask = null;

function initDragAndDrop() {
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-item')) {
            draggedTask = e.target;
            e.target.classList.add('dragging');
        }
    });

    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task-item')) {
            e.target.classList.remove('dragging');
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        }
    });

    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        const taskItem = e.target.closest('.task-item');
        if (taskItem && taskItem !== draggedTask) {
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            taskItem.classList.add('drag-over');
        }
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        const taskItem = e.target.closest('.task-item');
        if (taskItem && draggedTask && taskItem !== draggedTask) {
            // Reorder tasks
            const tasksList = document.getElementById('tasksList');
            tasksList.insertBefore(draggedTask, taskItem);
            showToast('Task reordered successfully', 'success');
        }
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
}

// ============= TOAST NOTIFICATIONS =============
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    }[type] || 'ℹ️';

    toast.innerHTML = `
        <span style="font-size: 20px;">${icon}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============= CONFETTI ANIMATION =============
function celebrateTaskCompletion() {
    const colors = ['#db4c3f', '#246fe0', '#058527', '#f9a825', '#9c27b0'];
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * window.innerWidth + 'px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

// ============= BULK ACTIONS =============
let selectedTasks = new Set();

function initBulkActions() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('task-checkbox') && e.ctrlKey) {
            e.stopPropagation();
            const taskItem = e.target.closest('.task-item');
            toggleTaskSelection(taskItem);
        }
    });
}

function toggleTaskSelection(taskItem) {
    const taskId = taskItem.dataset.taskId;
    if (selectedTasks.has(taskId)) {
        selectedTasks.delete(taskId);
        taskItem.style.background = '';
    } else {
        selectedTasks.add(taskId);
        taskItem.style.background = 'var(--bg-hover)';
    }
    updateBulkToolbar();
}

function selectAllTasks() {
    document.querySelectorAll('.task-item').forEach(item => {
        selectedTasks.add(item.dataset.taskId);
        item.style.background = 'var(--bg-hover)';
    });
    updateBulkToolbar();
}

function updateBulkToolbar() {
    let toolbar = document.querySelector('.bulk-toolbar');
    
    if (selectedTasks.size > 0) {
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.className = 'bulk-toolbar';
            toolbar.innerHTML = `
                <span>${selectedTasks.size} task(s) selected</span>
                <button class="btn-primary" onclick="bulkCompleteTasks()">✓ Complete</button>
                <button class="btn-secondary" onclick="bulkDeleteTasks()">🗑️ Delete</button>
                <button class="btn-secondary" onclick="clearSelection()">✕ Clear</button>
            `;
            document.body.appendChild(toolbar);
        } else {
            toolbar.querySelector('span').textContent = `${selectedTasks.size} task(s) selected`;
        }
    } else if (toolbar) {
        toolbar.remove();
    }
}

async function bulkCompleteTasks() {
    for (const taskId of selectedTasks) {
        await completeTask(taskId);
    }
    clearSelection();
    showToast(`${selectedTasks.size} tasks completed! 🎉`, 'success');
}

async function bulkDeleteTasks() {
    if (!confirm(`Delete ${selectedTasks.size} tasks?`)) return;
    for (const taskId of selectedTasks) {
        await deleteTask(taskId);
    }
    clearSelection();
    showToast(`${selectedTasks.size} tasks deleted`, 'success');
}

function clearSelection() {
    document.querySelectorAll('.task-item').forEach(item => {
        item.style.background = '';
    });
    selectedTasks.clear();
    updateBulkToolbar();
}

// ============= TASK TEMPLATES =============
const taskTemplates = [
    {
        name: '📝 Daily Planning',
        tasks: [
            'Review yesterday\'s progress',
            'Set today\'s top 3 priorities',
            'Check calendar for meetings',
            'Plan breaks and lunch'
        ]
    },
    {
        name: '🚀 Weekly Review',
        tasks: [
            'Review completed tasks',
            'Plan next week\'s goals',
            'Update project timelines',
            'Clear inbox to zero'
        ]
    },
    {
        name: '💻 New Project Setup',
        tasks: [
            'Create project folder',
            'Set up version control',
            'Define milestones',
            'Assign team members'
        ]
    },
    {
        name: '🎯 Sprint Planning',
        tasks: [
            'Review backlog',
            'Estimate story points',
            'Assign sprint tasks',
            'Set sprint goals'
        ]
    }
];

function initTemplates() {
    // Add template button to header
    const headerRight = document.querySelector('.header-right');
    const templateBtn = document.createElement('button');
    templateBtn.className = 'btn-icon';
    templateBtn.innerHTML = '📋';
    templateBtn.title = 'Task Templates';
    templateBtn.onclick = showTemplatesModal;
    headerRight.insertBefore(templateBtn, headerRight.firstChild);
}

function showTemplatesModal() {
    let modal = document.getElementById('templatesModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'templatesModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📋 Task Templates</h3>
                    <button class="btn-close" onclick="closeModal('templatesModal')">×</button>
                </div>
                <div class="modal-body">
                    <div class="templates-grid">
                        ${taskTemplates.map((template, index) => `
                            <div class="template-card" onclick="applyTemplate(${index})">
                                <h4>${template.name}</h4>
                                <p>${template.tasks.length} tasks</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}

async function applyTemplate(index) {
    const template = taskTemplates[index];
    for (const taskContent of template.tasks) {
        await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: taskContent,
                projectId: currentProjectId,
                priority: 1
            })
        });
    }
    await loadInitialData();
    renderView();
    closeModal('templatesModal');
    showToast(`Template "${template.name}" applied! 🎉`, 'success');
}

// ============= CONTEXT MENU =============
let contextMenu = null;

function initContextMenu() {
    document.addEventListener('contextmenu', (e) => {
        const taskItem = e.target.closest('.task-item');
        if (taskItem) {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, taskItem.dataset.taskId);
        }
    });

    document.addEventListener('click', () => {
        if (contextMenu) contextMenu.remove();
    });
}

function showContextMenu(x, y, taskId) {
    if (contextMenu) contextMenu.remove();

    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.innerHTML = `
        <div class="context-menu-item" onclick="editTask('${taskId}')">
            <span>✏️</span> Edit
        </div>
        <div class="context-menu-item" onclick="duplicateTask('${taskId}')">
            <span>📋</span> Duplicate
        </div>
        <div class="context-menu-item" onclick="showSubtaskInput('${taskId}')">
            <span>➕</span> Add Subtask
        </div>
        <div class="context-menu-item" onclick="completeTask('${taskId}')">
            <span>✓</span> Complete
        </div>
        <div class="context-menu-item danger" onclick="deleteTask('${taskId}')">
            <span>🗑️</span> Delete
        </div>
    `;
    document.body.appendChild(contextMenu);
}

async function duplicateTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...task,
            id: undefined,
            content: task.content + ' (copy)'
        })
    });

    tasks.push(await response.json());
    renderView();
    showToast('Task duplicated', 'success');
}

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initKeyboardShortcuts();
    initDragAndDrop();
    initBulkActions();
    initTemplates();
    initContextMenu();
});

// Override the default completeTask to add celebration
const originalCompleteTask = window.completeTask;
window.completeTask = async function(taskId) {
    const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskItem) {
        const checkbox = taskItem.querySelector('.task-checkbox');
        checkbox.classList.add('checked');
        taskItem.classList.add('completing');
        celebrateTaskCompletion();
        
        setTimeout(async () => {
            await originalCompleteTask(taskId);
        }, 500);
    } else {
        await originalCompleteTask(taskId);
    }
};
