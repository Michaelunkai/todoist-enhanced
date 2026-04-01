// Subtasks System with Progress Tracking

// Show subtask input inline
function showSubtaskInput(parentId) {
    const parentTask = document.querySelector(`[data-task-id="${parentId}"]`);
    if (!parentTask) return;

    // Remove any existing subtask inputs
    const existingInput = document.querySelector('.subtask-input-row');
    if (existingInput) existingInput.remove();

    // Create inline subtask input
    const inputRow = document.createElement('div');
    inputRow.className = 'subtask-input-row';
    inputRow.style.cssText = `
        display: flex;
        gap: 8px;
        padding: 12px 48px;
        background: var(--bg-hover);
        border-bottom: 1px solid var(--border);
    `;

    inputRow.innerHTML = `
        <input 
            type="text" 
            class="subtask-input" 
            placeholder="Add a subtask..." 
            style="
                flex: 1;
                padding: 8px 12px;
                border: 1px solid var(--border);
                border-radius: 6px;
                font-size: 13px;
            "
        />
        <button class="btn-add-subtask" style="
            padding: 8px 16px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
        ">Add</button>
        <button class="btn-cancel-subtask" style="
            padding: 8px 16px;
            background: transparent;
            color: var(--text-secondary);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
        ">Cancel</button>
    `;

    // Insert after parent task
    parentTask.insertAdjacentElement('afterend', inputRow);

    const input = inputRow.querySelector('.subtask-input');
    const addBtn = inputRow.querySelector('.btn-add-subtask');
    const cancelBtn = inputRow.querySelector('.btn-cancel-subtask');

    input.focus();

    // Add subtask on button click
    addBtn.addEventListener('click', () => addSubtask(parentId, input.value));

    // Add subtask on Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSubtask(parentId, input.value);
        }
    });

    // Cancel on button click
    cancelBtn.addEventListener('click', () => inputRow.remove());

    // Cancel on Escape key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            inputRow.remove();
        }
    });
}

// Add subtask
async function addSubtask(parentId, content) {
    content = content?.trim();
    if (!content) return;

    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                parentId,
                projectId: currentProjectId,
                priority: 1
            })
        });

        const newSubtask = await response.json();
        tasks.push(newSubtask);

        // Remove input row
        const inputRow = document.querySelector('.subtask-input-row');
        if (inputRow) inputRow.remove();

        // Re-render to show new subtask
        renderView();
        showToast('Subtask added ✓', 'success');
    } catch (error) {
        console.error('Failed to add subtask:', error);
        showToast('Failed to add subtask', 'error');
    }
}

// Show task detail with subtasks
async function showTaskDetail(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const subtasks = tasks.filter(t => t.parentId === taskId);
    const completedSubtasks = subtasks.filter(t => t.completed).length;

    const modal = document.getElementById('taskDetailModal');
    const content = document.getElementById('taskDetailContent');

    content.innerHTML = `
        <div class="task-detail-view">
            <div class="task-detail-header">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                     onclick="completeTask('${taskId}'); setTimeout(() => closeModal('taskDetailModal'), 500)"></div>
                <h2 contenteditable="true" id="taskTitleEdit" style="
                    flex: 1;
                    border: none;
                    outline: none;
                    font-size: 24px;
                    padding: 8px;
                    border-radius: 6px;
                ">${escapeHtml(task.content)}</h2>
            </div>

            <div class="task-detail-meta" style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin: 24px 0;
            ">
                <div>
                    <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 8px;">Due Date</label>
                    <input type="date" value="${task.dueDate || ''}" id="dueDateEdit" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid var(--border);
                        border-radius: 6px;
                    " />
                </div>
                <div>
                    <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 8px;">Priority</label>
                    <select id="priorityEdit" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid var(--border);
                        border-radius: 6px;
                    ">
                        <option value="1" ${task.priority === 1 ? 'selected' : ''}>Priority 1 (Low)</option>
                        <option value="2" ${task.priority === 2 ? 'selected' : ''}>Priority 2 (Medium)</option>
                        <option value="3" ${task.priority === 3 ? 'selected' : ''}>Priority 3 (High)</option>
                        <option value="4" ${task.priority === 4 ? 'selected' : ''}>Priority 4 (Urgent)</option>
                    </select>
                </div>
            </div>

            <div class="task-detail-description" style="margin: 24px 0;">
                <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 8px;">Description</label>
                <textarea id="descriptionEdit" placeholder="Add a description..." style="
                    width: 100%;
                    min-height: 100px;
                    padding: 12px;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    resize: vertical;
                    font-family: inherit;
                ">${task.description || ''}</textarea>
            </div>

            ${subtasks.length > 0 ? `
                <div class="task-subtasks" style="margin: 24px 0;">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 16px;
                    ">
                        <h3>Subtasks (${completedSubtasks}/${subtasks.length})</h3>
                        <div class="subtask-progress-bar-container" style="
                            flex: 1;
                            max-width: 200px;
                            height: 8px;
                            background: var(--bg-hover);
                            border-radius: 4px;
                            margin-left: 16px;
                            overflow: hidden;
                        ">
                            <div style="
                                height: 100%;
                                background: linear-gradient(90deg, var(--success), var(--secondary));
                                width: ${subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0}%;
                                transition: width 0.3s ease;
                            "></div>
                        </div>
                    </div>
                    <div class="subtasks-list">
                        ${subtasks.map(subtask => `
                            <div class="subtask-item" style="
                                display: flex;
                                align-items: center;
                                padding: 12px;
                                border-bottom: 1px solid var(--border);
                                transition: background 0.2s;
                            " onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                                <div class="task-checkbox ${subtask.completed ? 'checked' : ''}" 
                                     onclick="completeTask('${subtask.id}'); setTimeout(() => showTaskDetail('${taskId}'), 100)"></div>
                                <span style="
                                    flex: 1;
                                    margin-left: 12px;
                                    ${subtask.completed ? 'text-decoration: line-through; color: var(--text-secondary);' : ''}
                                ">${escapeHtml(subtask.content)}</span>
                                <button onclick="deleteTask('${subtask.id}'); setTimeout(() => showTaskDetail('${taskId}'), 100)" style="
                                    background: transparent;
                                    border: none;
                                    cursor: pointer;
                                    font-size: 16px;
                                    opacity: 0.6;
                                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">🗑️</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <button onclick="showSubtaskInput('${taskId}')" style="
                padding: 10px 16px;
                background: var(--bg-hover);
                border: 2px dashed var(--border);
                border-radius: 6px;
                cursor: pointer;
                width: 100%;
                margin: 16px 0;
                font-size: 14px;
                color: var(--text-secondary);
            " onmouseover="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)'" 
               onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text-secondary)'">
                ➕ Add Subtask
            </button>

            <div class="task-detail-actions" style="
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 24px;
                padding-top: 24px;
                border-top: 1px solid var(--border);
            ">
                <button class="btn-secondary" onclick="closeModal('taskDetailModal')">Cancel</button>
                <button class="btn-primary" onclick="saveTaskDetail('${taskId}')">Save Changes</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// Save task detail changes
async function saveTaskDetail(taskId) {
    const title = document.getElementById('taskTitleEdit').textContent.trim();
    const dueDate = document.getElementById('dueDateEdit').value || null;
    const priority = parseInt(document.getElementById('priorityEdit').value);
    const description = document.getElementById('descriptionEdit').value.trim();

    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: title,
                dueDate,
                priority,
                description
            })
        });

        const updatedTask = await response.json();
        const index = tasks.findIndex(t => t.id === taskId);
        tasks[index] = updatedTask;

        closeModal('taskDetailModal');
        renderView();
        showToast('Task updated successfully ✓', 'success');
    } catch (error) {
        console.error('Failed to update task:', error);
        showToast('Failed to update task', 'error');
    }
}

// Calculate subtask progress
function getSubtaskProgress(taskId) {
    const subtasks = tasks.filter(t => t.parentId === taskId);
    if (subtasks.length === 0) return null;

    const completed = subtasks.filter(t => t.completed).length;
    return {
        total: subtasks.length,
        completed,
        percentage: (completed / subtasks.length) * 100
    };
}
