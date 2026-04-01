// Natural Date Parsing - Parse "tomorrow", "next week", "in 3 days", etc.

const datePatterns = {
    // Relative dates
    'today': () => new Date(),
    'tomorrow': () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        return date;
    },
    'yesterday': () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date;
    },
    
    // Weekdays
    'monday': () => getNextWeekday(1),
    'tuesday': () => getNextWeekday(2),
    'wednesday': () => getNextWeekday(3),
    'thursday': () => getNextWeekday(4),
    'friday': () => getNextWeekday(5),
    'saturday': () => getNextWeekday(6),
    'sunday': () => getNextWeekday(0),
    'mon': () => getNextWeekday(1),
    'tue': () => getNextWeekday(2),
    'wed': () => getNextWeekday(3),
    'thu': () => getNextWeekday(4),
    'fri': () => getNextWeekday(5),
    'sat': () => getNextWeekday(6),
    'sun': () => getNextWeekday(0),
    
    // Relative periods
    'next week': () => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
    },
    'next month': () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        return date;
    },
    'end of week': () => {
        const date = new Date();
        const day = date.getDay();
        const diff = (7 - day) % 7 || 7;
        date.setDate(date.getDate() + diff);
        return date;
    },
    'end of month': () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 1, 0);
        return date;
    }
};

function getNextWeekday(targetDay) {
    const date = new Date();
    const currentDay = date.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7; // Next occurrence
    date.setDate(date.getDate() + diff);
    return date;
}

function parseNaturalDate(text) {
    const lowerText = text.toLowerCase().trim();
    
    // Check exact patterns
    if (datePatterns[lowerText]) {
        return datePatterns[lowerText]();
    }
    
    // Parse "in X days/weeks/months"
    const inPattern = /in (\d+) (day|days|week|weeks|month|months)/i;
    const inMatch = lowerText.match(inPattern);
    if (inMatch) {
        const amount = parseInt(inMatch[1]);
        const unit = inMatch[2].toLowerCase();
        const date = new Date();
        
        if (unit.startsWith('day')) {
            date.setDate(date.getDate() + amount);
        } else if (unit.startsWith('week')) {
            date.setDate(date.getDate() + (amount * 7));
        } else if (unit.startsWith('month')) {
            date.setMonth(date.getMonth() + amount);
        }
        return date;
    }
    
    // Parse "next monday", "next friday", etc.
    const nextWeekdayPattern = /next (monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i;
    const nextMatch = lowerText.match(nextWeekdayPattern);
    if (nextMatch) {
        const weekday = nextMatch[1].toLowerCase();
        return datePatterns[weekday]();
    }
    
    // Parse "X days from now"
    const fromNowPattern = /(\d+) days? from now/i;
    const fromNowMatch = lowerText.match(fromNowPattern);
    if (fromNowMatch) {
        const days = parseInt(fromNowMatch[1]);
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date;
    }
    
    return null;
}

function formatDateForInput(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Smart task input with date detection
function enhanceTaskInput() {
    const taskInput = document.getElementById('taskInput');
    const dueDateInput = document.getElementById('dueDateInput');
    
    if (!taskInput || !dueDateInput) return;
    
    taskInput.addEventListener('input', (e) => {
        const text = e.target.value;
        
        // Look for date indicators like @tomorrow, @next week, etc.
        const dateMatch = text.match(/@([a-zA-Z0-9 ]+)/);
        if (dateMatch) {
            const dateText = dateMatch[1];
            const parsedDate = parseNaturalDate(dateText);
            
            if (parsedDate) {
                // Set the date input
                dueDateInput.value = formatDateForInput(parsedDate);
                
                // Remove the date from task text
                const cleanText = text.replace(/@[a-zA-Z0-9 ]+/, '').trim();
                
                // Show visual feedback
                const feedback = document.createElement('div');
                feedback.style.cssText = `
                    position: absolute;
                    top: -30px;
                    left: 0;
                    background: var(--success);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    animation: slideIn 0.3s ease;
                `;
                feedback.textContent = `📅 Due: ${formatDate(formatDateForInput(parsedDate))}`;
                taskInput.parentElement.style.position = 'relative';
                taskInput.parentElement.appendChild(feedback);
                
                setTimeout(() => {
                    feedback.remove();
                    taskInput.value = cleanText;
                }, 2000);
            }
        }
        
        // Priority detection: p1, p2, p3, p4
        const priorityMatch = text.match(/p([1-4])/i);
        if (priorityMatch) {
            const priority = priorityMatch[1];
            document.getElementById('priorityInput').value = priority;
            
            // Visual feedback
            showToast(`Priority set to ${priority}`, 'info');
            
            // Remove from text
            taskInput.value = text.replace(/p[1-4]/i, '').trim();
        }
        
        // Label detection: #labelname
        const labelMatch = text.match(/#([a-zA-Z0-9]+)/g);
        if (labelMatch) {
            showToast(`Labels detected: ${labelMatch.join(', ')}`, 'info');
        }
    });
}

// Date suggestions dropdown
function createDateSuggestions() {
    const dueDateInput = document.getElementById('dueDateInput');
    if (!dueDateInput) return;
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    
    dueDateInput.parentNode.insertBefore(wrapper, dueDateInput);
    wrapper.appendChild(dueDateInput);
    
    const suggestions = document.createElement('div');
    suggestions.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 6px;
        box-shadow: var(--shadow);
        z-index: 1000;
        display: none;
        min-width: 200px;
        margin-top: 4px;
    `;
    
    const quickDates = [
        { label: '📅 Today', value: 'today' },
        { label: '⏰ Tomorrow', value: 'tomorrow' },
        { label: '📆 This Weekend', value: 'saturday' },
        { label: '📍 Next Week', value: 'next week' },
        { label: '📌 Next Month', value: 'next month' }
    ];
    
    suggestions.innerHTML = quickDates.map(({ label, value }) => `
        <div class="date-suggestion" data-value="${value}" style="
            padding: 10px 15px;
            cursor: pointer;
            transition: background 0.2s;
        ">
            ${label}
        </div>
    `).join('');
    
    wrapper.appendChild(suggestions);
    
    dueDateInput.addEventListener('focus', () => {
        suggestions.style.display = 'block';
    });
    
    dueDateInput.addEventListener('blur', () => {
        setTimeout(() => suggestions.style.display = 'none', 200);
    });
    
    suggestions.addEventListener('click', (e) => {
        const suggestion = e.target.closest('.date-suggestion');
        if (suggestion) {
            const value = suggestion.dataset.value;
            const date = parseNaturalDate(value);
            if (date) {
                dueDateInput.value = formatDateForInput(date);
                suggestions.style.display = 'none';
                showToast(`Due date set to ${suggestion.textContent.trim()}`, 'success');
            }
        }
    });
    
    // Hover effect
    suggestions.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('date-suggestion')) {
            e.target.style.background = 'var(--bg-hover)';
        }
    });
    
    suggestions.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('date-suggestion')) {
            e.target.style.background = '';
        }
    });
}

// Initialize natural date parsing
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        enhanceTaskInput();
        createDateSuggestions();
    }, 100);
});
