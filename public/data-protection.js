// Data Protection & Auto-Save System
// Ensures NOTHING is ever lost

let saveIndicator = null;

// Create save indicator in UI
function createSaveIndicator() {
    saveIndicator = document.createElement('div');
    saveIndicator.id = 'saveIndicator';
    saveIndicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        display: none;
        align-items: center;
        gap: 8px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: fadeIn 0.2s ease;
    `;
    document.body.appendChild(saveIndicator);
}

// Show save indicator
function showSaveIndicator(message = '💾 Saved', duration = 1500) {
    if (!saveIndicator) createSaveIndicator();
    
    saveIndicator.textContent = message;
    saveIndicator.style.display = 'flex';
    saveIndicator.style.background = 'var(--success)';
    
    setTimeout(() => {
        saveIndicator.style.display = 'none';
    }, duration);
}

// Show saving indicator
function showSavingIndicator() {
    if (!saveIndicator) createSaveIndicator();
    
    saveIndicator.innerHTML = '<span class="spinner">⏳</span> Saving...';
    saveIndicator.style.display = 'flex';
    saveIndicator.style.background = 'var(--secondary)';
}

// Enhanced autoBackup with visual feedback
const originalAutoBackup = window.autoBackup;
window.autoBackup = function() {
    try {
        originalAutoBackup();
        showSaveIndicator('💾 Auto-saved', 1000);
    } catch (error) {
        console.error('[BACKUP ERROR]', error);
        showSaveIndicator('⚠️ Save failed', 2000);
    }
};

// Monitor for unsaved changes
let hasUnsavedChanges = false;
let lastSaveTime = Date.now();

// Track changes
function trackChange() {
    hasUnsavedChanges = true;
    updateSaveStatus();
}

// Update save status in UI
function updateSaveStatus() {
    const timeSinceLastSave = Date.now() - lastSaveTime;
    const statusEl = document.getElementById('saveStatus');
    
    if (!statusEl) {
        const status = document.createElement('div');
        status.id = 'saveStatus';
        status.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            font-size: 12px;
            color: var(--text-secondary);
            z-index: 999;
        `;
        document.body.appendChild(status);
    }
    
    if (hasUnsavedChanges) {
        document.getElementById('saveStatus').textContent = '● Unsaved changes';
        document.getElementById('saveStatus').style.color = 'var(--warning)';
    } else {
        const timeAgo = formatTimeSinceLastSave(timeSinceLastSave);
        document.getElementById('saveStatus').textContent = `✓ Saved ${timeAgo}`;
        document.getElementById('saveStatus').style.color = 'var(--success)';
    }
}

function formatTimeSinceLastSave(ms) {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 min ago';
    return `${minutes} mins ago`;
}

// Update save status every second
setInterval(updateSaveStatus, 1000);

// Mark as saved after successful backup
const originalSaveToLocalStorage = window.saveToLocalStorage;
window.saveToLocalStorage = function() {
    originalSaveToLocalStorage();
    hasUnsavedChanges = false;
    lastSaveTime = Date.now();
    updateSaveStatus();
};

// Daily export backup
function createDailyBackup() {
    const today = new Date().toISOString().split('T')[0];
    const lastBackup = localStorage.getItem('lastDailyBackup');
    
    if (lastBackup !== today) {
        // Export full backup
        const backup = {
            tasks,
            projects,
            labels,
            stats,
            settings: JSON.parse(localStorage.getItem('todoistSettings') || '{}'),
            exportDate: new Date().toISOString()
        };
        
        // Save to localStorage with date
        localStorage.setItem('todoistEnhanced_daily_' + today, JSON.stringify(backup));
        localStorage.setItem('lastDailyBackup', today);
        
        // Clean up old daily backups (keep last 7 days)
        for (let i = 8; i < 30; i++) {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - i);
            const oldKey = 'todoistEnhanced_daily_' + oldDate.toISOString().split('T')[0];
            localStorage.removeItem(oldKey);
        }
        
        console.log(`[DAILY BACKUP] Created backup for ${today}`);
        showToast(`📦 Daily backup created for ${today}`, 'success');
    }
}

// Create daily backup on load and every hour
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(createDailyBackup, 2000);
    setInterval(createDailyBackup, 60 * 60 * 1000); // Every hour
});

// Prevent accidental close with unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        
        // Force one final save
        autoBackup();
    }
});

// Data integrity check on load
function checkDataIntegrity() {
    try {
        const backup = localStorage.getItem('todoistEnhanced_backup');
        if (backup) {
            const data = JSON.parse(backup);
            const backupTime = new Date(data.timestamp);
            const hoursOld = (Date.now() - backupTime.getTime()) / (1000 * 60 * 60);
            
            if (hoursOld > 24) {
                console.warn(`[WARNING] Backup is ${hoursOld.toFixed(1)} hours old`);
            }
            
            console.log(`[INTEGRITY] Backup verified - ${data.tasks?.length || 0} tasks, last saved ${hoursOld.toFixed(1)}h ago`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('[INTEGRITY ERROR]', error);
        return false;
    }
}

// Run integrity check on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (checkDataIntegrity()) {
            console.log('[DATA PROTECTION] ✓ All systems operational');
        } else {
            console.warn('[DATA PROTECTION] ⚠️ No backup found - will create on first change');
        }
    }, 1000);
});

// Export recovery panel for emergencies
function showRecoveryPanel() {
    const panel = document.createElement('div');
    panel.className = 'modal';
    panel.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🛟 Data Recovery</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 16px;">Available backups:</p>
                <div id="backupList" style="max-height: 300px; overflow-y: auto;"></div>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
                    <button class="btn-primary" onclick="downloadAllBackups()" style="width: 100%;">
                        📦 Download All Backups as ZIP
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    panel.style.display = 'flex';
    
    // List all backups
    const backupList = panel.querySelector('#backupList');
    const backups = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('todoistEnhanced_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                backups.push({
                    key,
                    timestamp: data.timestamp,
                    tasks: data.tasks?.length || 0,
                    projects: data.projects?.length || 0
                });
            } catch (e) {}
        }
    }
    
    if (backups.length === 0) {
        backupList.innerHTML = '<p style="color: var(--text-secondary);">No backups found</p>';
    } else {
        backupList.innerHTML = backups.map(b => `
            <div style="padding: 12px; background: var(--bg-hover); margin-bottom: 8px; border-radius: 6px;">
                <div style="font-weight: 600;">${b.key}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    ${b.timestamp ? new Date(b.timestamp).toLocaleString() : 'Unknown'} - 
                    ${b.tasks} tasks, ${b.projects} projects
                </div>
                <button class="btn-secondary" onclick="restoreBackup('${b.key}')" style="margin-top: 8px; width: 100%;">
                    ↩️ Restore This Backup
                </button>
            </div>
        `).join('');
    }
}

// Restore specific backup
function restoreBackup(key) {
    if (!confirm(`Restore from ${key}? This will overwrite current data.`)) return;
    
    try {
        const backup = JSON.parse(localStorage.getItem(key));
        tasks = backup.tasks || [];
        projects = backup.projects || [];
        labels = backup.labels || [];
        stats = backup.stats || {};
        
        renderView();
        renderProjects();
        updateCounts();
        updateStats();
        
        // Save to server
        tasks.forEach(async task => {
            await fetch(`${API_BASE}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
        });
        
        showToast(`✓ Restored ${tasks.length} tasks from backup`, 'success');
        document.querySelector('.modal').remove();
    } catch (error) {
        showToast('Failed to restore backup', 'error');
        console.error(error);
    }
}

// Add recovery button to settings
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const dataPanel = document.getElementById('dataPanel');
        if (dataPanel) {
            const recoveryBtn = document.createElement('div');
            recoveryBtn.className = 'setting-group';
            recoveryBtn.innerHTML = `
                <h4>🛟 Data Recovery</h4>
                <p class="setting-desc">View and restore from automatic backups.</p>
                <button class="btn-secondary" onclick="showRecoveryPanel()">View Backups</button>
            `;
            dataPanel.insertBefore(recoveryBtn, dataPanel.firstChild);
        }
    }, 1000);
});

console.log('[DATA PROTECTION] 🛡️ Loaded - Auto-save every 30s, daily backups, crash recovery ready');
