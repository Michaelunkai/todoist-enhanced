# 🛡️ Data Protection System

## **NOTHING GETS LOST - EVER**

Todoist Enhanced has **5 layers of data protection** to ensure your tasks, projects, and settings are NEVER lost.

---

## 📦 **Automatic Backup Layers**

### 1. **Server-Side Backups** (Hourly)
- **Location**: `F:\study\projects\Web_Development\Fullstack\todoist-enhanced\backups\`
- **Frequency**: Every single write operation
- **Retention**: Last 24 backups (hourly snapshots)
- **Format**: JSON with timestamp
- **File naming**: `backup-YYYY-MM-DDTHH-MM-SS.json`

**What it protects against:**
- Accidental deletions
- Corrupted database
- Server crashes

### 2. **Client-Side Auto-Backup** (Every 30 seconds)
- **Location**: Browser localStorage
- **Key**: `todoistEnhanced_backup`
- **Frequency**: 
  - Every 30 seconds (automatic)
  - After EVERY data change (instant)
  - Before browser close (safety net)
- **Format**: Full data snapshot

**What it protects against:**
- Server offline
- Network issues
- Browser crashes

### 3. **Daily Snapshots** (Rolling 7 days)
- **Location**: Browser localStorage
- **Key**: `todoistEnhanced_daily_YYYY-MM-DD`
- **Frequency**: Once per day (first load of the day)
- **Retention**: 7 days
- **Includes**: Tasks, projects, labels, stats, settings

**What it protects against:**
- Accidentally deleting everything
- Data corruption over time
- Want to go back to yesterday's state

### 4. **Session Backup** (On page load)
- **Triggers**: Every time you load the app
- **Purpose**: Snapshot before making any changes
- **Restoration**: Available via Recovery Panel

**What it protects against:**
- Breaking changes during a session
- Experimental features going wrong

### 5. **Before-Unload Backup** (Safety net)
- **Triggers**: When you close the tab/window
- **Purpose**: Final backup before exit
- **Prevents**: Data loss if you forgot to save

**What it protects against:**
- Closing browser with unsaved changes
- Computer crashes
- Power outages (if browser survives)

---

## 🚨 **Recovery Options**

### **Option 1: Automatic Recovery**
If the server is offline when you open the app, it will **automatically restore** from localStorage backup.

You'll see: `⚠️ Restored from local backup (server offline)`

### **Option 2: Manual Recovery Panel**
1. Open Settings (⚙️)
2. Go to **Data** tab
3. Click **"View Backups"** (at the top)
4. You'll see ALL available backups with:
   - Timestamp
   - Number of tasks/projects
   - Restore button

### **Option 3: Undo Delete**
When you delete a task:
1. Notification appears: `🗑️ Deleted "Task name"`
2. Click **"Undo"** button (available for 8 seconds)
3. Task is instantly restored

### **Option 4: Export Full Backup**
1. Settings → Data → Export JSON
2. Downloads complete backup file
3. Keep this in Dropbox/Google Drive/OneDrive
4. Can import anytime via Import button

---

## 🔄 **How Auto-Save Works**

### **Visual Indicators**

#### **Save Status (Top-Right)**
- `✓ Saved just now` - Green checkmark
- `● Unsaved changes` - Yellow dot
- `✓ Saved 30s ago` - Time since last save

#### **Save Indicator (Bottom-Right)**
- `💾 Saved` - Appears for 1.5s after saving
- `⏳ Saving...` - While operation is in progress
- `⚠️ Save failed` - If something went wrong

### **When Auto-Save Triggers**
- ✅ Add task → Instant save
- ✅ Complete task → Instant save
- ✅ Delete task → Instant save
- ✅ Edit task → Instant save
- ✅ Create project → Instant save
- ✅ Add label → Instant save
- ✅ Change settings → Instant save
- ✅ Every 30 seconds → Periodic save
- ✅ Before closing tab → Final save

---

## 🗂️ **Backup File Locations**

### **Server Backups**
```
F:\study\projects\Web_Development\Fullstack\todoist-enhanced\
├── db.json (main database)
└── backups/
    ├── backup-2026-03-16T20-00-00.json
    ├── backup-2026-03-16T21-00-00.json
    ├── backup-2026-03-16T22-00-00.json
    └── ... (24 total)
```

### **Browser Backups (localStorage)**
```
localStorage:
├── todoistEnhanced_backup (latest auto-save)
├── todoistEnhanced_daily_2026-03-16 (today's snapshot)
├── todoistEnhanced_daily_2026-03-15 (yesterday)
├── todoistEnhanced_daily_2026-03-14
└── ... (7 days total)
```

---

## 🛠️ **Manual Backup Procedures**

### **Create Manual Backup**
```javascript
// In browser console:
localStorage.getItem('todoistEnhanced_backup')
// Copy the output and save to a file
```

### **Restore Manual Backup**
1. Open Recovery Panel (Settings → Data → View Backups)
2. Click "Restore This Backup" on desired backup
3. Confirm restoration
4. All tasks/projects restored

### **Export to External File**
1. Settings → Data → Export JSON
2. Save file to safe location
3. Name it: `todoist-backup-YYYY-MM-DD.json`
4. Keep multiple versions

---

## ⚠️ **What Could Still Go Wrong?**

### **Scenario 1: Server database corrupted**
**Solution**: Restore from server backups folder
```bash
# Copy a backup file
cp backups/backup-2026-03-16T20-00-00.json db.json
# Restart server
node server.js
```

### **Scenario 2: Both server AND localStorage lost**
**Solution**: Restore from exported JSON backup
1. Import your exported JSON file
2. Or manually restore from `backups/` folder

### **Scenario 3: Computer crashed, no exports**
**Prevention**: 
- Enable auto-export to cloud folder
- Keep exported backups in Google Drive/Dropbox
- Use external backup script (see below)

---

## 🔐 **Best Practices for Maximum Safety**

### **Daily Routine**
1. ✅ App auto-saves everything (no action needed)
2. ✅ Daily backup created automatically
3. ✅ Server backups created hourly

### **Weekly Routine**
1. Export JSON backup (Settings → Data → Export JSON)
2. Save to cloud storage (Google Drive, Dropbox, etc.)
3. Name it: `todoist-YYYY-MM-DD.json`

### **Monthly Routine**
1. Review old backups in `backups/` folder
2. Archive important monthly snapshots
3. Clean up very old backups (>30 days)

---

## 📊 **Backup Statistics**

Your app maintains:
- **24 hourly backups** (server) = Last 24 hours coverage
- **7 daily backups** (localStorage) = Last week coverage
- **1 live backup** (localStorage) = Most recent state
- **Unlimited exports** (your choice) = Long-term archive

**Total protection window**: Up to 7 days automatic, forever with exports

---

## 🚀 **Advanced Recovery**

### **Restore from Server Backup**
```javascript
// In browser console:
fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        tasks: [...], // paste from backup file
        projects: [...],
        labels: [...]
    })
})
```

### **Merge Two Backups**
1. Export current state
2. Import older backup
3. Manually copy missing tasks
4. Re-export as merged backup

### **Recover Deleted Task**
- If deleted <8 seconds ago: Click "Undo"
- If deleted today: Check localStorage backup
- If deleted this week: Check daily snapshots
- If deleted this month: Check exported backups

---

## 🎯 **Summary**

**Your data is protected by:**
- ✅ 5 automatic backup layers
- ✅ Instant save on every change
- ✅ 24 hourly server snapshots
- ✅ 7 daily client snapshots
- ✅ Undo for recent deletes
- ✅ Recovery panel for emergencies
- ✅ Export anytime you want

**Bottom line: It's virtually impossible to lose your data.**

---

## 💡 **Pro Tips**

1. **Set up cloud sync**: Put `backups/` folder in Dropbox/Google Drive
2. **Weekly exports**: Create a reminder to export every Sunday
3. **Test recovery**: Try restoring from backup once a month
4. **Multiple devices**: Export from one, import to another
5. **Before major changes**: Export a backup first

---

**Built with paranoia 🛡️ — Your data matters.**
