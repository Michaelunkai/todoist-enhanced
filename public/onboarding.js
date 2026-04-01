// Onboarding and Tips System

// Check if first time user
function checkFirstTimeUser() {
    const hasVisited = localStorage.getItem('todoistEnhanced_visited');
    if (!hasVisited) {
        showWelcomeModal();
        localStorage.setItem('todoistEnhanced_visited', 'true');
    }
}

function showWelcomeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'welcomeModal';
    modal.innerHTML = `
        <div class="modal-content modal-large" style="max-width: 600px;">
            <div class="modal-body" style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
                <h2 style="margin-bottom: 16px;">Welcome to Todoist Enhanced!</h2>
                <p style="color: var(--text-secondary); margin-bottom: 30px;">
                    A powerful, beautiful task manager with all the features you need — <strong>completely free</strong>.
                </p>
                
                <div class="onboarding-features" style="text-align: left; margin-bottom: 30px;">
                    <div class="onboarding-feature" style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                        <span style="font-size: 28px;">⌨️</span>
                        <div>
                            <strong>Keyboard Shortcuts</strong>
                            <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">Press <kbd>?</kbd> to see all shortcuts. Try <kbd>Ctrl+K</kbd> for quick add!</p>
                        </div>
                    </div>
                    <div class="onboarding-feature" style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                        <span style="font-size: 28px;">📅</span>
                        <div>
                            <strong>Natural Dates</strong>
                            <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">Type @tomorrow, @next week, or @friday in tasks!</p>
                        </div>
                    </div>
                    <div class="onboarding-feature" style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                        <span style="font-size: 28px;">🌙</span>
                        <div>
                            <strong>Dark Mode</strong>
                            <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">Press <kbd>Ctrl+D</kbd> or click the moon button to toggle.</p>
                        </div>
                    </div>
                    <div class="onboarding-feature" style="display: flex; align-items: center; gap: 16px;">
                        <span style="font-size: 28px;">🎊</span>
                        <div>
                            <strong>Celebrations</strong>
                            <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">Complete tasks and watch the confetti fly!</p>
                        </div>
                    </div>
                </div>
                
                <button class="btn-primary" onclick="closeWelcome()" style="padding: 12px 32px; font-size: 16px;">
                    Get Started 🚀
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

function closeWelcome() {
    const modal = document.getElementById('welcomeModal');
    if (modal) modal.remove();
}

// Tips system - show random tips periodically
const tips = [
    { icon: '⌨️', text: 'Press Ctrl+K to quickly add a task from anywhere!' },
    { icon: '📅', text: 'Type @tomorrow or @next monday when adding tasks to set due dates!' },
    { icon: '🌙', text: 'Press Ctrl+D to toggle dark mode!' },
    { icon: '🖱️', text: 'Right-click on any task to see more options!' },
    { icon: '📋', text: 'Use templates (📋 icon) to quickly add common task sets!' },
    { icon: '⏱️', text: 'Use the Pomodoro timer (top-right) to stay focused!' },
    { icon: '🏷️', text: 'Type #labelname to add labels when creating tasks!' },
    { icon: '⚡', text: 'Type p1, p2, p3, or p4 to set task priority!' },
    { icon: '✋', text: 'Hold Ctrl and click checkboxes to select multiple tasks!' },
    { icon: '📊', text: 'Check Statistics to see your productivity insights!' },
    { icon: '📦', text: 'Click the board icon (▦) to see Kanban view!' },
    { icon: '🔄', text: 'Tasks can be made recurring from the detail modal!' }
];

let lastTipIndex = -1;

function showRandomTip() {
    let tipIndex;
    do {
        tipIndex = Math.floor(Math.random() * tips.length);
    } while (tipIndex === lastTipIndex);
    lastTipIndex = tipIndex;
    
    const tip = tips[tipIndex];
    showTip(tip.icon, tip.text);
}

function showTip(icon, text) {
    const tipBanner = document.createElement('div');
    tipBanner.className = 'tip-banner';
    tipBanner.innerHTML = `
        <span class="tip-icon">${icon}</span>
        <span class="tip-text">💡 <strong>Tip:</strong> ${text}</span>
        <button class="tip-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add styles if not exist
    if (!document.getElementById('tipStyles')) {
        const style = document.createElement('style');
        style.id = 'tipStyles';
        style.textContent = `
            .tip-banner {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, var(--secondary), #4073ff);
                color: white;
                padding: 12px 20px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                z-index: 9999;
                animation: slideUp 0.3s ease;
                max-width: 90vw;
            }
            .tip-icon { font-size: 24px; }
            .tip-text { font-size: 14px; }
            .tip-close {
                background: transparent;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                opacity: 0.8;
                margin-left: 8px;
            }
            .tip-close:hover { opacity: 1; }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(tipBanner);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (tipBanner.parentElement) {
            tipBanner.style.animation = 'slideUp 0.3s ease reverse';
            setTimeout(() => tipBanner.remove(), 300);
        }
    }, 8000);
}

// Show tip every 5 minutes (if user is active)
let tipInterval = null;
function startTipTimer() {
    if (tipInterval) clearInterval(tipInterval);
    tipInterval = setInterval(() => {
        // Only show tips if user is not in the middle of something
        if (!document.querySelector('.modal[style*="display: flex"]') && 
            !document.activeElement.matches('input, textarea')) {
            showRandomTip();
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// Initialize onboarding
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkFirstTimeUser, 500);
    startTipTimer();
});

// Help panel
function showHelpPanel() {
    const panel = document.createElement('div');
    panel.className = 'modal';
    panel.id = 'helpPanel';
    panel.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>❓ Help & Tips</h3>
                <button class="btn-close" onclick="document.getElementById('helpPanel').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                    <div class="help-section">
                        <h4>⌨️ Keyboard Shortcuts</h4>
                        <ul style="padding-left: 20px; color: var(--text-secondary);">
                            <li><kbd>Ctrl+K</kbd> - Quick add task</li>
                            <li><kbd>Ctrl+F</kbd> - Search</li>
                            <li><kbd>Ctrl+D</kbd> - Toggle dark mode</li>
                            <li><kbd>?</kbd> - Show all shortcuts</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>📅 Smart Date Input</h4>
                        <ul style="padding-left: 20px; color: var(--text-secondary);">
                            <li><code>@today</code> - Due today</li>
                            <li><code>@tomorrow</code> - Due tomorrow</li>
                            <li><code>@next monday</code> - Due next Monday</li>
                            <li><code>@in 3 days</code> - Due in 3 days</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>⚡ Quick Syntax</h4>
                        <ul style="padding-left: 20px; color: var(--text-secondary);">
                            <li><code>p1-p4</code> - Set priority (p4 = urgent)</li>
                            <li><code>#label</code> - Add label</li>
                            <li><code>/project</code> - Assign to project</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>🎯 Power Features</h4>
                        <ul style="padding-left: 20px; color: var(--text-secondary);">
                            <li>Right-click for context menu</li>
                            <li>Ctrl+click to select multiple</li>
                            <li>Drag tasks to reorder</li>
                            <li>Click ▦ for Kanban board</li>
                        </ul>
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border); text-align: center;">
                    <p style="color: var(--text-secondary); margin-bottom: 16px;">
                        💡 Want to see a random tip?
                    </p>
                    <button class="btn-primary" onclick="showRandomTip(); document.getElementById('helpPanel').remove();">
                        Show Me a Tip
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(panel);
    panel.style.display = 'flex';
}
