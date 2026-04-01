// Advanced Features: Pomodoro Timer, File Attachments, Kanban Board, Time Tracking

// ============= POMODORO TIMER =============
let pomodoroTimer = null;
let pomodoroSeconds = 25 * 60; // 25 minutes
let pomodoroRunning = false;
let pomodoroMode = 'work'; // 'work' or 'break'

function initPomodoroTimer() {
    const timerContainer = document.createElement('div');
    timerContainer.className = 'pomodoro-timer';
    timerContainer.innerHTML = `
        <div class="pomodoro-display" id="pomodoroDisplay">25:00</div>
        <div class="pomodoro-controls">
            <button class="btn-icon" id="pomodoroStart" title="Start Pomodoro">▶️</button>
            <button class="btn-icon" id="pomodoroReset" title="Reset">⏹️</button>
        </div>
    `;
    document.body.appendChild(timerContainer);

    document.getElementById('pomodoroStart').addEventListener('click', togglePomodoro);
    document.getElementById('pomodoroReset').addEventListener('click', resetPomodoro);
}

function togglePomodoro() {
    pomodoroRunning = !pomodoroRunning;
    const btn = document.getElementById('pomodoroStart');
    
    if (pomodoroRunning) {
        btn.innerHTML = '⏸️';
        btn.title = 'Pause';
        startPomodoroInterval();
    } else {
        btn.innerHTML = '▶️';
        btn.title = 'Resume';
        if (pomodoroTimer) clearInterval(pomodoroTimer);
    }
}

function startPomodoroInterval() {
    pomodoroTimer = setInterval(() => {
        pomodoroSeconds--;
        updatePomodoroDisplay();
        
        if (pomodoroSeconds <= 0) {
            clearInterval(pomodoroTimer);
            pomodoroComplete();
        }
    }, 1000);
}

function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroSeconds / 60);
    const seconds = pomodoroSeconds % 60;
    document.getElementById('pomodoroDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function pomodoroComplete() {
    pomodoroRunning = false;
    document.getElementById('pomodoroStart').innerHTML = '▶️';
    
    if (pomodoroMode === 'work') {
        showToast('🎉 Pomodoro complete! Time for a 5-minute break!', 'success');
        pomodoroMode = 'break';
        pomodoroSeconds = 5 * 60;
    } else {
        showToast('✅ Break over! Ready for another Pomodoro?', 'info');
        pomodoroMode = 'work';
        pomodoroSeconds = 25 * 60;
    }
    updatePomodoroDisplay();
}

function resetPomodoro() {
    if (pomodoroTimer) clearInterval(pomodoroTimer);
    pomodoroRunning = false;
    pomodoroMode = 'work';
    pomodoroSeconds = 25 * 60;
    document.getElementById('pomodoroStart').innerHTML = '▶️';
    updatePomodoroDisplay();
    showToast('Pomodoro timer reset', 'info');
}

// ============= TIME TRACKING =============
let trackingTask = null;

async function startTimeTracking(taskId) {
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}/start-timer`, {
            method: 'POST'
        });
        const task = await response.json();
        trackingTask = taskId;
        
        // Update UI to show tracking
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskItem) {
            const indicator = document.createElement('span');
            indicator.className = 'time-tracking active';
            indicator.innerHTML = '⏱️ Tracking';
            taskItem.querySelector('.task-meta').appendChild(indicator);
        }
        
        showToast('Time tracking started ⏱️', 'success');
    } catch (error) {
        console.error('Failed to start time tracking:', error);
    }
}

async function stopTimeTracking(taskId) {
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}/stop-timer`, {
            method: 'POST'
        });
        const task = await response.json();
        trackingTask = null;
        
        const totalHours = (task.timeTracking.totalTime / (1000 * 60 * 60)).toFixed(2);
        showToast(`Time tracking stopped. Total: ${totalHours}h`, 'info');
        renderView();
    } catch (error) {
        console.error('Failed to stop time tracking:', error);
    }
}

// ============= KANBAN BOARD VIEW =============
let currentViewMode = 'list'; // 'list' or 'board'

function initBoardView() {
    document.getElementById('boardViewBtn').addEventListener('click', () => {
        currentViewMode = 'board';
        renderBoardView();
    });

    document.getElementById('listViewBtn').addEventListener('click', () => {
        currentViewMode = 'list';
        renderView();
    });
}

function renderBoardView() {
    const tasksList = document.getElementById('tasksList');
    const columns = [
        { name: 'To Do', filter: t => !t.completed && (!t.dueDate || new Date(t.dueDate) > new Date()) },
        { name: 'Today', filter: t => !t.completed && t.dueDate === new Date().toISOString().split('T')[0] },
        { name: 'Overdue', filter: t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date() },
        { name: 'Done', filter: t => t.completed }
    ];

    tasksList.innerHTML = `
        <div class="board-view">
            ${columns.map(column => {
                const columnTasks = tasks.filter(t => !t.parentId).filter(column.filter);
                return `
                    <div class="board-column">
                        <div class="board-column-header">
                            <span>${column.name}</span>
                            <span style="color: var(--text-secondary);">${columnTasks.length}</span>
                        </div>
                        <div class="board-column-tasks">
                            ${columnTasks.map(task => `
                                <div class="board-task priority-${task.priority}" draggable="true" data-task-id="${task.id}">
                                    <div style="font-weight: 600; margin-bottom: 8px;">${escapeHtml(task.content)}</div>
                                    ${task.dueDate ? `<div style="font-size: 12px; color: var(--text-secondary);">📅 ${formatDate(task.dueDate)}</div>` : ''}
                                    ${task.labels?.length ? `<div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
                                        ${task.labels.map(labelId => {
                                            const label = labels.find(l => l.id === labelId);
                                            return label ? `<span style="font-size: 10px; padding: 2px 6px; background: ${label.color}22; color: ${label.color}; border-radius: 3px;">${label.name}</span>` : '';
                                        }).join('')}
                                    </div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ============= EXPORT/IMPORT =============
function initExportImport() {
    const headerRight = document.querySelector('.header-right');
    
    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn-icon';
    exportBtn.innerHTML = '📤';
    exportBtn.title = 'Export Data';
    exportBtn.onclick = showExportModal;
    headerRight.appendChild(exportBtn);
    
    // Import button
    const importBtn = document.createElement('button');
    importBtn.className = 'btn-icon';
    importBtn.innerHTML = '📥';
    importBtn.title = 'Import Data';
    importBtn.onclick = showImportModal;
    headerRight.appendChild(importBtn);
}

function showExportModal() {
    let modal = document.getElementById('exportModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'exportModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📤 Export Data</h3>
                    <button class="btn-close" onclick="closeModal('exportModal')">×</button>
                </div>
                <div class="modal-body">
                    <p>Choose export format:</p>
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
                        <button class="btn-primary" onclick="exportData('json')">
                            📄 Export as JSON
                        </button>
                        <button class="btn-primary" onclick="exportData('csv')">
                            📊 Export as CSV
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}

async function exportData(format) {
    try {
        const response = await fetch(`${API_BASE}/export?format=${format}`);
        
        if (format === 'json') {
            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            downloadBlob(blob, 'todoist-export.json');
        } else if (format === 'csv') {
            const csv = await response.text();
            const blob = new Blob([csv], { type: 'text/csv' });
            downloadBlob(blob, 'todoist-export.csv');
        }
        
        closeModal('exportModal');
        showToast('Data exported successfully! ✓', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showToast('Export failed', 'error');
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showImportModal() {
    let modal = document.getElementById('importModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'importModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📥 Import Data</h3>
                    <button class="btn-close" onclick="closeModal('importModal')">×</button>
                </div>
                <div class="modal-body">
                    <p>Upload a JSON export file:</p>
                    <input type="file" id="importFileInput" accept=".json" style="
                        margin: 20px 0;
                        padding: 10px;
                        border: 2px dashed var(--border);
                        border-radius: 8px;
                        width: 100%;
                        cursor: pointer;
                    " />
                    <button class="btn-primary" onclick="importData()">
                        Import
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}

async function importData() {
    const fileInput = document.getElementById('importFileInput');
    if (!fileInput.files[0]) {
        showToast('Please select a file', 'warning');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            const response = await fetch(`${API_BASE}/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            await loadInitialData();
            renderView();
            closeModal('importModal');
            showToast(`Imported ${result.imported.tasks} tasks successfully! ✓`, 'success');
        } catch (error) {
            console.error('Import failed:', error);
            showToast('Import failed - invalid file format', 'error');
        }
    };

    reader.readAsText(file);
}

// ============= PRODUCTIVITY INSIGHTS =============
function renderProductivityInsights() {
    const statsView = document.getElementById('statsView');
    
    // Calculate insights
    const completedToday = tasks.filter(t => 
        t.completed && 
        t.completedAt && 
        new Date(t.completedAt).toDateString() === new Date().toDateString()
    ).length;

    const overdueCount = tasks.filter(t => 
        !t.completed && 
        t.dueDate && 
        new Date(t.dueDate) < new Date()
    ).length;

    const avgCompletionTime = calculateAvgCompletionTime();
    const mostProductiveHour = findMostProductiveHour();

    const insightsHTML = `
        <div class="productivity-insights" style="margin-top: 30px;">
            <h3 style="margin-bottom: 20px;">📊 Productivity Insights</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                <div class="insight-card" style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border-left: 4px solid var(--success);">
                    <div style="font-size: 32px; font-weight: 700; color: var(--success);">${completedToday}</div>
                    <div style="color: var(--text-secondary); margin-top: 8px;">Tasks completed today</div>
                </div>
                <div class="insight-card" style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border-left: 4px solid ${overdueCount > 0 ? 'var(--primary)' : 'var(--success)'};">
                    <div style="font-size: 32px; font-weight: 700; color: ${overdueCount > 0 ? 'var(--primary)' : 'var(--success)'};">${overdueCount}</div>
                    <div style="color: var(--text-secondary); margin-top: 8px;">Overdue tasks</div>
                </div>
                <div class="insight-card" style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border-left: 4px solid var(--secondary);">
                    <div style="font-size: 32px; font-weight: 700; color: var(--secondary);">${avgCompletionTime}h</div>
                    <div style="color: var(--text-secondary); margin-top: 8px;">Avg. completion time</div>
                </div>
                <div class="insight-card" style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border-left: 4px solid var(--warning);">
                    <div style="font-size: 32px; font-weight: 700; color: var(--warning);">${mostProductiveHour}:00</div>
                    <div style="color: var(--text-secondary); margin-top: 8px;">Most productive hour</div>
                </div>
            </div>
        </div>
    `;

    const existingInsights = statsView.querySelector('.productivity-insights');
    if (existingInsights) {
        existingInsights.remove();
    }
    statsView.insertAdjacentHTML('beforeend', insightsHTML);
}

function calculateAvgCompletionTime() {
    const completedTasks = tasks.filter(t => t.completed && t.createdAt && t.completedAt);
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
        const created = new Date(task.createdAt);
        const completed = new Date(task.completedAt);
        return sum + (completed - created);
    }, 0);

    return (totalTime / completedTasks.length / (1000 * 60 * 60)).toFixed(1);
}

function findMostProductiveHour() {
    const hourCounts = new Array(24).fill(0);
    
    tasks.filter(t => t.completedAt).forEach(task => {
        const hour = new Date(task.completedAt).getHours();
        hourCounts[hour]++;
    });

    const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
    return maxHour || 9; // Default to 9 AM if no data
}

// Override renderStats to include insights and charts
const originalRenderStats = window.renderStats;
window.renderStats = function() {
    originalRenderStats();
    renderProductivityInsights();
    renderWeeklyChart();
    renderCompletionRing();
};

// Render weekly productivity chart
function renderWeeklyChart() {
    const chartContainer = document.getElementById('weeklyChart');
    if (!chartContainer) return;
    
    // Calculate tasks completed for each day of the week
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const completed = tasks.filter(t => 
            t.completedAt && 
            t.completedAt.startsWith(dateStr)
        ).length;
        
        weekData.push({
            day: days[date.getDay()],
            count: completed,
            isToday: i === 0
        });
    }
    
    const maxCount = Math.max(...weekData.map(d => d.count), 1);
    
    chartContainer.innerHTML = weekData.map(d => `
        <div class="chart-bar-wrapper" style="flex: 1; display: flex; flex-direction: column; align-items: center;">
            <div class="chart-bar" style="
                width: 40px;
                height: ${(d.count / maxCount) * 120}px;
                min-height: 4px;
                background: ${d.isToday ? 'linear-gradient(135deg, var(--primary), var(--primary-hover))' : 'var(--secondary)'};
                border-radius: 4px 4px 0 0;
                transition: height 0.5s ease;
            "></div>
            <div class="chart-label" style="
                margin-top: 8px;
                font-size: 12px;
                color: ${d.isToday ? 'var(--primary)' : 'var(--text-secondary)'};
                font-weight: ${d.isToday ? '700' : '400'};
            ">${d.day}</div>
            <div class="chart-value" style="
                font-size: 11px;
                color: var(--text-secondary);
            ">${d.count}</div>
        </div>
    `).join('');
}

// Render completion ring
function renderCompletionRing() {
    const container = document.getElementById('completionChart');
    if (!container) return;
    
    const total = tasks.filter(t => !t.parentId).length;
    const completed = tasks.filter(t => t.completed && !t.parentId).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // SVG ring chart
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    container.innerHTML = `
        <svg width="150" height="150" viewBox="0 0 150 150">
            <circle
                cx="75"
                cy="75"
                r="${radius}"
                fill="none"
                stroke="var(--bg-hover)"
                stroke-width="12"
            />
            <circle
                cx="75"
                cy="75"
                r="${radius}"
                fill="none"
                stroke="var(--primary)"
                stroke-width="12"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                stroke-linecap="round"
                transform="rotate(-90 75 75)"
                style="transition: stroke-dashoffset 1s ease;"
            />
            <text
                x="75"
                y="75"
                text-anchor="middle"
                dominant-baseline="middle"
                font-size="28"
                font-weight="700"
                fill="var(--text-primary)"
            >${percentage}%</text>
            <text
                x="75"
                y="100"
                text-anchor="middle"
                font-size="12"
                fill="var(--text-secondary)"
            >complete</text>
        </svg>
        <div style="text-align: center; margin-top: 12px; font-size: 14px; color: var(--text-secondary);">
            ${completed} of ${total} tasks
        </div>
    `;
}

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initPomodoroTimer();
        initBoardView();
        initExportImport();
    }, 200);
});
