// Todoist Importer - Import your existing Todoist data

function showTodoistImporter() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'todoistImporterModal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>📥 Import from Todoist</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="import-instructions" style="margin-bottom: 24px; padding: 16px; background: var(--bg-hover); border-radius: 8px;">
                    <h4 style="margin-bottom: 12px;">📋 How to Export from Todoist:</h4>
                    <ol style="padding-left: 24px; line-height: 1.8;">
                        <li>Go to <a href="https://todoist.com/app" target="_blank">todoist.com</a></li>
                        <li>Click Settings (⚙️) → Integrations → Export as template</li>
                        <li>Or use Settings → Backup → Download backup</li>
                        <li>Save the CSV or JSON file</li>
                        <li>Upload it below</li>
                    </ol>
                </div>

                <div class="import-method" style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 12px;">Method 1: Upload Todoist Export File</h4>
                    <input type="file" id="todoistFileInput" accept=".csv,.json" style="
                        padding: 12px;
                        border: 2px dashed var(--border);
                        border-radius: 8px;
                        width: 100%;
                        cursor: pointer;
                    " />
                    <button class="btn-primary" onclick="importTodoistFile()" style="margin-top: 12px; width: 100%;">
                        📤 Import File
                    </button>
                </div>

                <div class="import-divider" style="text-align: center; margin: 24px 0; color: var(--text-secondary);">
                    - OR -
                </div>

                <div class="import-method" style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 12px;">Method 2: Manual Entry</h4>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 12px;">
                        Copy-paste your projects and tasks below (one per line):
                    </p>
                    
                    <label style="font-weight: 600; display: block; margin-bottom: 8px;">Projects (format: ProjectName #color)</label>
                    <textarea id="projectsInput" placeholder="Work #db4c3f
Personal #14aaf5
Shopping #7ecc49" style="
                        width: 100%;
                        min-height: 100px;
                        padding: 12px;
                        border: 1px solid var(--border);
                        border-radius: 6px;
                        font-family: monospace;
                        margin-bottom: 16px;
                    "></textarea>

                    <label style="font-weight: 600; display: block; margin-bottom: 8px;">Tasks (format: Task name | Project | Due Date | Priority)</label>
                    <textarea id="tasksInput" placeholder="Finish report | Work | 2026-03-20 | 4
Buy groceries | Shopping | 2026-03-17 | 2
Call dentist | Personal | 2026-03-18 | 3" style="
                        width: 100%;
                        min-height: 200px;
                        padding: 12px;
                        border: 1px solid var(--border);
                        border-radius: 6px;
                        font-family: monospace;
                        margin-bottom: 16px;
                    "></textarea>

                    <button class="btn-primary" onclick="importManualData()" style="width: 100%;">
                        ✨ Import Manual Data
                    </button>
                </div>

                <div class="import-status" id="importStatus" style="
                    margin-top: 24px;
                    padding: 16px;
                    border-radius: 8px;
                    display: none;
                "></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

// Import from file
async function importTodoistFile() {
    const fileInput = document.getElementById('todoistFileInput');
    if (!fileInput.files[0]) {
        showToast('Please select a file first', 'warning');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const content = e.target.result;
            let data;

            if (file.name.endsWith('.json')) {
                data = JSON.parse(content);
                await importFromJSON(data);
            } else if (file.name.endsWith('.csv')) {
                data = parseCSV(content);
                await importFromCSV(data);
            } else {
                throw new Error('Unsupported file format');
            }

        } catch (error) {
            console.error('Import failed:', error);
            showImportStatus('❌ Import failed: ' + error.message, 'error');
        }
    };

    reader.readAsText(file);
}

// Parse CSV
function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = values[i];
        });
        return obj;
    });
    return rows;
}

// Import from JSON (Todoist backup format)
async function importFromJSON(data) {
    showImportStatus('🔄 Importing from JSON...', 'info');
    
    let importedProjects = 0;
    let importedTasks = 0;

    // Import projects
    if (data.projects) {
        for (const project of data.projects) {
            try {
                const response = await fetch(`${API_BASE}/projects`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: project.name,
                        color: project.color || '#808080',
                        isFavorite: project.is_favorite || false
                    })
                });
                const newProject = await response.json();
                projects.push(newProject);
                importedProjects++;
            } catch (error) {
                console.error('Failed to import project:', project.name, error);
            }
        }
    }

    // Import tasks (items in Todoist format)
    if (data.items) {
        for (const item of data.items) {
            try {
                const projectId = projects.find(p => p.name === item.project_name)?.id || null;
                
                const response = await fetch(`${API_BASE}/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: item.content,
                        description: item.description || '',
                        projectId,
                        priority: item.priority || 1,
                        dueDate: item.due?.date || null,
                        labels: item.labels || [],
                        completed: item.checked === 1
                    })
                });
                const newTask = await response.json();
                tasks.push(newTask);
                importedTasks++;
            } catch (error) {
                console.error('Failed to import task:', item.content, error);
            }
        }
    }

    await loadInitialData();
    renderView();
    
    showImportStatus(`✅ Import complete! ${importedProjects} projects, ${importedTasks} tasks imported.`, 'success');
    showToast(`📦 Imported ${importedProjects} projects and ${importedTasks} tasks!`, 'success');
}

// Import from CSV
async function importFromCSV(rows) {
    showImportStatus('🔄 Importing from CSV...', 'info');
    
    let importedTasks = 0;

    for (const row of rows) {
        try {
            // Assuming CSV format: TYPE,CONTENT,PRIORITY,INDENT,AUTHOR,RESPONSIBLE,DATE,DATE_LANG,TIMEZONE
            const response = await fetch(`${API_BASE}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: row.CONTENT || row.content || row['Task'],
                    priority: parseInt(row.PRIORITY || row.priority || '1'),
                    dueDate: row.DATE || row.date || null
                })
            });
            const newTask = await response.json();
            tasks.push(newTask);
            importedTasks++;
        } catch (error) {
            console.error('Failed to import row:', row, error);
        }
    }

    await loadInitialData();
    renderView();
    
    showImportStatus(`✅ Import complete! ${importedTasks} tasks imported.`, 'success');
    showToast(`📦 Imported ${importedTasks} tasks!`, 'success');
}

// Import manual data
async function importManualData() {
    const projectsText = document.getElementById('projectsInput').value;
    const tasksText = document.getElementById('tasksInput').value;

    showImportStatus('🔄 Importing manual data...', 'info');

    let importedProjects = 0;
    let importedTasks = 0;

    // Import projects
    if (projectsText.trim()) {
        const projectLines = projectsText.split('\n').filter(line => line.trim());
        for (const line of projectLines) {
            const [name, color] = line.split('#').map(s => s.trim());
            if (name) {
                try {
                    const response = await fetch(`${API_BASE}/projects`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name,
                            color: color ? '#' + color : '#808080'
                        })
                    });
                    const newProject = await response.json();
                    projects.push(newProject);
                    importedProjects++;
                } catch (error) {
                    console.error('Failed to import project:', name, error);
                }
            }
        }
    }

    // Import tasks
    if (tasksText.trim()) {
        const taskLines = tasksText.split('\n').filter(line => line.trim());
        for (const line of taskLines) {
            const parts = line.split('|').map(s => s.trim());
            const [content, projectName, dueDate, priority] = parts;
            
            if (content) {
                try {
                    const projectId = projects.find(p => p.name === projectName)?.id || null;
                    
                    const response = await fetch(`${API_BASE}/tasks`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            content,
                            projectId,
                            dueDate: dueDate || null,
                            priority: parseInt(priority) || 1
                        })
                    });
                    const newTask = await response.json();
                    tasks.push(newTask);
                    importedTasks++;
                } catch (error) {
                    console.error('Failed to import task:', content, error);
                }
            }
        }
    }

    await loadInitialData();
    renderView();
    
    showImportStatus(`✅ Import complete! ${importedProjects} projects, ${importedTasks} tasks imported.`, 'success');
    showToast(`📦 Imported ${importedProjects} projects and ${importedTasks} tasks!`, 'success');
    
    // Clear inputs
    document.getElementById('projectsInput').value = '';
    document.getElementById('tasksInput').value = '';
}

// Show import status
function showImportStatus(message, type) {
    const status = document.getElementById('importStatus');
    if (!status) return;
    
    status.style.display = 'block';
    status.textContent = message;
    
    if (type === 'error') {
        status.style.background = '#fee2e2';
        status.style.color = '#dc2626';
        status.style.border = '1px solid #fca5a5';
    } else if (type === 'success') {
        status.style.background = '#d1fae5';
        status.style.color = '#059669';
        status.style.border = '1px solid #6ee7b7';
    } else {
        status.style.background = 'var(--bg-hover)';
        status.style.color = 'var(--text-primary)';
        status.style.border = '1px solid var(--border)';
    }
}

// Add import button to settings
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const dataPanel = document.getElementById('dataPanel');
        if (dataPanel) {
            const importSection = document.createElement('div');
            importSection.className = 'setting-group';
            importSection.innerHTML = `
                <h4>📥 Import from Todoist</h4>
                <p class="setting-desc">Import your existing Todoist projects and tasks.</p>
                <button class="btn-primary" onclick="showTodoistImporter()">
                    📥 Import Todoist Data
                </button>
            `;
            // Insert at top
            dataPanel.insertBefore(importSection, dataPanel.firstChild);
        }
    }, 1000);
});

console.log('[TODOIST IMPORTER] 📥 Ready to import your Todoist data');
