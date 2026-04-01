const API_BASE = 'http://localhost:3456/api';

let currentView = 'inbox';
let currentProjectId = null;
let projects = [];
let tasks = [];
let labels = [];
let stats = {};
let calendarDate = new Date(); // For calendar view

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData();
    setupEventListeners();
    renderView();
    startAutoSave();
});

// Auto-save every 30 seconds
function startAutoSave() {
    setInterval(async () => {
        saveToLocalStorage();
        console.log('[AUTO-SAVE] Data backed up to localStorage');
    }, 30000);
}

// Load initial data with localStorage backup
async function loadInitialData() {
    try {
        const [projectsRes, tasksRes, labelsRes, statsRes] = await Promise.all([
            fetch(`${API_BASE}/projects`),
            fetch(`${API_BASE}/tasks`),
            fetch(`${API_BASE}/labels`),
            fetch(`${API_BASE}/stats`)
        ]);

        projects = await projectsRes.json();
        tasks = await tasksRes.json();
        labels = await labelsRes.json();
        stats = await statsRes.json();

        saveToLocalStorage();
        renderProjects();
        updateCounts();
        updateStats();
        
        console.log(`[LOADED] ${tasks.length} tasks, ${projects.length} projects`);
    } catch (error) {
        console.error('Failed to load from server:', error);
        restoreFromLocalStorage();
    }
}

// Save to localStorage
function saveToLocalStorage() {
    try {
        const backup = {
            projects, tasks, labels, stats,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('todoMich_backup', JSON.stringify(backup));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

// Restore from localStorage
function restoreFromLocalStorage() {
    try {
        const backup = JSON.parse(localStorage.getItem('todoMich_backup'));
        if (backup) {
            projects = backup.projects || [];
            tasks = backup.tasks || [];
            labels = backup.labels || [];
            stats = backup.stats || {};
            renderProjects();
            renderView();
            updateCounts();
            console.log('[RESTORED] Data from localStorage');
        }
    } catch (error) {
        console.error('Failed to restore from localStorage:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Quick add task
    document.getElementById('quick-add-btn').addEventListener('click', showQuickAdd);
    document.getElementById('quick-add-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleQuickAdd();
    });
    
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });
    
    // Add project button
    document.getElementById('add-project-btn').addEventListener('click', showAddProjectModal);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        showQuickAdd();
    }
    if (e.key === 'Escape') {
        closeAllModals();
    }
}

// Switch view
function switchView(view, projectId = null) {
    currentView = view;
    currentProjectId = projectId;
    
    // Update active state
    document.querySelectorAll('.nav-item, .project-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[data-view="${view}"]${projectId ? `[data-id="${projectId}"]` : ''}`);
    if (activeItem) activeItem.classList.add('active');
    
    renderView();
}

// Render current view
function renderView() {
    const container = document.getElementById('task-list');
    const viewTitle = document.getElementById('view-title');
    
    // Set title
    if (currentView === 'inbox') {
        viewTitle.textContent = 'Inbox';
        renderCalendarView(container);
    } else if (currentView === 'today') {
        viewTitle.textContent = 'Today';
        renderTaskList(container, getTasksForToday());
    } else if (currentView === 'upcoming') {
        viewTitle.textContent = 'Upcoming';
        renderUpcomingView(container);
    } else if (currentView === 'completed') {
        viewTitle.textContent = 'Completed';
        renderTaskList(container, getCompletedTasks());
    } else if (currentView === 'project' && currentProjectId) {
        const project = projects.find(p => p.id === currentProjectId);
        viewTitle.textContent = project ? project.name : 'Project';
        renderTaskList(container, getTasksForProject(currentProjectId));
    }
    
    updateCounts();
}

// Render calendar view (for Inbox)
function renderCalendarView(container) {
    const calendar = document.createElement('div');
    calendar.className = 'calendar-view';
    
    // Calendar header
    const header = document.createElement('div');
    header.className = 'calendar-header';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'calendar-nav-btn';
    prevBtn.innerHTML = '←';
    prevBtn.onclick = () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderView();
    };
    
    const monthYear = document.createElement('div');
    monthYear.className = 'calendar-month-year';
    monthYear.textContent = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'calendar-nav-btn';
    nextBtn.innerHTML = '→';
    nextBtn.onclick = () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderView();
    };
    
    header.append(prevBtn, monthYear, nextBtn);
    calendar.appendChild(header);
    
    // Weekday labels
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'calendar-weekdays';
    weekdays.forEach(day => {
        const label = document.createElement('div');
        label.className = 'weekday-label';
        label.textContent = day;
        weekdayRow.appendChild(label);
    });
    calendar.appendChild(weekdayRow);
    
    // Calendar grid
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        grid.appendChild(emptyCell);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        // Check if today
        const today = new Date().toISOString().split('T')[0];
        if (dateStr === today) {
            dayCell.classList.add('today');
        }
        
        // Day number
        const dayNum = document.createElement('div');
        dayNum.className = 'day-number';
        dayNum.textContent = day;
        dayCell.appendChild(dayNum);
        
        // Tasks for this day
        const dayTasks = tasks.filter(t => !t.completed && t.dueDate === dateStr);
        const taskCount = document.createElement('div');
        taskCount.className = 'task-count';
        taskCount.textContent = dayTasks.length > 0 ? `${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''}` : '';
        dayCell.appendChild(taskCount);
        
        // Click to add task on this date
        dayCell.onclick = () => showQuickAdd(dateStr);
        
        grid.appendChild(dayCell);
    }
    
    calendar.appendChild(grid);
    container.innerHTML = '';
    container.appendChild(calendar);
}

// Render task list
function renderTaskList(container, taskList) {
    container.innerHTML = '';
    
    if (taskList.length === 0) {
        container.innerHTML = '<div class="empty-state">No tasks here</div>';
        return;
    }
    
    taskList.forEach(task => {
        const taskEl = createTaskElement(task);
        container.appendChild(taskEl);
    });
}

// Create task element
function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = 'task-item';
    div.dataset.id = task.id;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.onclick = async (e) => {
        e.stopPropagation();
        await toggleTaskComplete(task.id);
    };
    
    const content = document.createElement('div');
    content.className = 'task-content';
    content.textContent = task.content;
    if (task.completed) content.style.textDecoration = 'line-through';
    
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    if (task.dueDate) {
        const dueSpan = document.createElement('span');
        dueSpan.className = 'task-due';
        dueSpan.textContent = formatDate(task.dueDate);
        meta.appendChild(dueSpan);
    }
    if (task.priority > 1) {
        const priority = document.createElement('span');
        priority.className = `task-priority priority-${task.priority}`;
        priority.textContent = `P${task.priority}`;
        meta.appendChild(priority);
    }
    
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'task-action-btn';
    editBtn.innerHTML = '✏️';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        showEditTaskModal(task);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-action-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        await deleteTask(task.id);
    };
    
    actions.append(editBtn, deleteBtn);
    div.append(checkbox, content, meta, actions);
    
    return div;
}

// Quick add task (with optional date)
function showQuickAdd(date = null) {
    const input = document.getElementById('quick-add-input');
    input.value = '';
    input.dataset.date = date || '';
    input.style.display = 'block';
    input.focus();
}

async function handleQuickAdd() {
    const input = document.getElementById('quick-add-input');
    const content = input.value.trim();
    if (!content) return;
    
    const date = input.dataset.date || null;
    
    const newTask = {
        content,
        dueDate: date,
        priority: 1,
        projectId: currentProjectId,
        completed: false,
        labels: []
    };
    
    // Add to server
    const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
    });
    
    const savedTask = await response.json();
    
    // Add to local state IMMEDIATELY
    tasks.push(savedTask);
    
    // Re-render view immediately
    renderView();
    saveToLocalStorage();
    
    // Clear input
    input.value = '';
    input.style.display = 'none';
    
    console.log('[TASK CREATED]', savedTask.content);
}

// Toggle task complete
async function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    task.completed = !task.completed;
    
    // Update server
    await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });
    
    // Re-render immediately
    renderView();
    saveToLocalStorage();
    updateCounts();
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    
    // Delete from server
    await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
    
    // Remove from local state immediately
    tasks = tasks.filter(t => t.id !== taskId);
    
    // Re-render immediately
    renderView();
    saveToLocalStorage();
    updateCounts();
}

// Get tasks for today
function getTasksForToday() {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(t => !t.completed && t.dueDate === today);
}

// Get completed tasks
function getCompletedTasks() {
    return tasks.filter(t => t.completed);
}

// Get tasks for project
function getTasksForProject(projectId) {
    return tasks.filter(t => t.projectId === projectId);
}

// Render projects in sidebar
function renderProjects() {
    const container = document.getElementById('projects-list');
    container.innerHTML = '';
    
    projects.forEach(project => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.dataset.view = 'project';
        item.dataset.id = project.id;
        
        const dot = document.createElement('span');
        dot.className = 'project-dot';
        dot.style.backgroundColor = project.color;
        
        const name = document.createElement('span');
        name.className = 'project-name';
        name.textContent = project.name;
        
        const count = document.createElement('span');
        count.className = 'project-count';
        count.textContent = tasks.filter(t => t.projectId === project.id && !t.completed).length;
        
        item.append(dot, name, count);
        item.onclick = () => switchView('project', project.id);
        
        container.appendChild(item);
    });
}

// Update counts
function updateCounts() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('[data-view="inbox"] .nav-count').textContent = tasks.filter(t => !t.completed && !t.projectId).length;
    document.querySelector('[data-view="today"] .nav-count').textContent = tasks.filter(t => !t.completed && t.dueDate === today).length;
    document.querySelector('[data-view="upcoming"] .nav-count').textContent = tasks.filter(t => !t.completed && t.dueDate && t.dueDate > today).length;
}

// Update stats
function updateStats() {
    // This can be enhanced later
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dateStr);
    taskDate.setHours(0, 0, 0, 0);
    
    const diff = Math.floor((taskDate - today) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Show add project modal
function showAddProjectModal() {
    // TODO: Implement modal
    const name = prompt('Project name:');
    if (name) addProject(name);
}

// Add project
async function addProject(name) {
    const newProject = {
        name,
        color: '#808080',
        isFavorite: false
    };
    
    const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
    });
    
    const savedProject = await response.json();
    projects.push(savedProject);
    
    renderProjects();
    saveToLocalStorage();
}

// Show edit task modal
function showEditTaskModal(task) {
    // TODO: Implement proper modal
    const content = prompt('Task content:', task.content);
    if (content) {
        task.content = content;
        updateTask(task);
    }
}

// Update task
async function updateTask(task) {
    await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });
    
    renderView();
    saveToLocalStorage();
}

// Render upcoming view
function renderUpcomingView(container) {
    const upcoming = tasks.filter(t => !t.completed && t.dueDate && t.dueDate > new Date().toISOString().split('T')[0]);
    renderTaskList(container, upcoming);
}

// Close all modals
function closeAllModals() {
    document.getElementById('quick-add-input').style.display = 'none';
}
