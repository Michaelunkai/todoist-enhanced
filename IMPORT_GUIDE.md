# 📥 How to Import Your Todoist Data

## **App Renamed: TaskFlow Pro** ⚡

Your app is now called **TaskFlow Pro** - a more creative and professional name!

---

## 🎯 **Import Your Todoist Data**

### **Method 1: Automatic Import (Recommended)**

1. **Export from Todoist**:
   - Go to [https://todoist.com/app](https://todoist.com/app)
   - Click Settings (⚙️) → Integrations
   - Find "Export as template" or "Backup"
   - Download the JSON or CSV file

2. **Import to TaskFlow Pro**:
   - Open TaskFlow Pro: `http://localhost:3456`
   - Click Settings (⚙️) → Data tab
   - Click **"📥 Import Todoist Data"** (top button)
   - Upload your exported file
   - Click **"Import File"**
   - Done! ✅

### **Method 2: Manual Entry**

If you don't have an export file, you can manually enter your data:

1. **Open Import Dialog**:
   - Settings → Data → Import Todoist Data

2. **Enter Projects** (format: `ProjectName #colorcode`):
```
Work #db4c3f
Personal #14aaf5
Shopping #7ecc49
Health #af38eb
```

3. **Enter Tasks** (format: `Task name | Project | Due Date | Priority`):
```
Finish report | Work | 2026-03-20 | 4
Buy groceries | Shopping | 2026-03-17 | 2
Call dentist | Health | 2026-03-18 | 3
Read book | Personal | 2026-03-19 | 1
```

4. Click **"Import Manual Data"**

---

## 🎨 **Color Codes Reference**

Use these color codes for your projects:

| Color | Code | Description |
|-------|------|-------------|
| Red | `db4c3f` | Urgent/Work |
| Orange | `ff9933` | Important |
| Yellow | `fad000` | Planning |
| Green | `7ecc49` | Health/Money |
| Blue | `14aaf5` | Personal |
| Purple | `af38eb` | Creative |
| Gray | `808080` | Archive |

---

## ✅ **What Gets Imported**

- ✅ **All Projects** with colors
- ✅ **All Tasks** with:
  - Content (task name)
  - Description
  - Due dates
  - Priorities (1-4)
  - Labels
  - Completion status
  - Project assignment

---

## 📋 **Project Management**

### **Create Project**
1. Click ➕ next to "My Projects"
2. Enter name
3. Pick color
4. Save

### **Edit Project**
1. Hover over project in sidebar
2. Click ✏️ edit button
3. Change name
4. Saves automatically ✅

### **Delete Project**
1. Hover over project
2. Click 🗑️ delete button
3. Confirm deletion
4. Tasks move to Inbox
5. Permanent delete ✅

### **Change Project Color**
1. Edit project
2. Click color picker
3. Choose new color
4. Saves immediately ✅

---

## 🔄 **Data Permanence Guarantee**

**Every change you make is PERMANENT until you change it manually:**

### ✅ **Auto-Saved Operations**:
- Add task → Saved instantly
- Complete task → Saved instantly
- Delete task → Saved with 8-second undo
- Edit task → Saved instantly
- Create project → Saved instantly
- Edit project → Saved instantly
- Delete project → Saved instantly
- Change settings → Saved instantly

### 🛡️ **Protection Layers**:
1. **Server backup** - Every write creates backup file
2. **localStorage** - Auto-backup every 30 seconds
3. **Daily snapshots** - 7 days of history
4. **Manual exports** - Download anytime
5. **Undo system** - 8-second window for deletions

### 📊 **Where Changes Are Saved**:
- `db.json` - Main database (server)
- `backups/backup-*.json` - Hourly backups (last 24)
- `localStorage` - Client-side backup
- Daily snapshots (7 days)

**Nothing is ever lost unless you manually delete it twice** (once + confirm)

---

## 🚀 **After Import**

### **Your Data Will Be**:
- ✅ In the correct projects
- ✅ With proper due dates
- ✅ With correct priorities
- ✅ Fully editable
- ✅ Deletable (with confirmation)
- ✅ Auto-saved on every change

### **You Can Then**:
- ✅ Add new tasks to any project
- ✅ Rename/delete projects anytime
- ✅ Move tasks between projects
- ✅ Change any detail
- ✅ Export anytime for backup

---

## 🔧 **Troubleshooting**

### **Import Failed**
- Check file format (JSON or CSV)
- Make sure file is from Todoist export
- Try manual entry instead

### **Projects Not Showing**
- Check Projects section in sidebar
- Try refreshing the page
- Check console for errors

### **Tasks Not in Right Project**
- Edit task → Change project dropdown
- Or delete and re-create in correct project

### **Want to Start Over**
- Settings → Data → Clear All Data
- Re-import your file

---

## 📖 **Example Import**

### **Projects Input**:
```
Work #db4c3f
Personal #14aaf5
Shopping #7ecc49
```

### **Tasks Input**:
```
Finish quarterly report | Work | 2026-03-25 | 4
Review pull requests | Work | 2026-03-18 | 3
Buy birthday gift | Shopping | 2026-03-20 | 2
Book doctor appointment | Personal | 2026-03-19 | 3
Meal prep for week | Personal | 2026-03-17 | 1
```

### **Result**:
- 3 projects created with colors
- 5 tasks created in correct projects
- All with due dates and priorities
- All editable/deletable
- Auto-saved permanently

---

## 🎉 **You're All Set!**

1. Import your data
2. Verify everything looks correct
3. Start using TaskFlow Pro
4. All changes save automatically
5. Nothing gets lost
6. Edit/delete anytime

**Server running**: `http://localhost:3456`

**Open the app and go to Settings → Data → Import Todoist Data to get started!** 🚀

---

*New name: TaskFlow Pro ⚡*
*Full data import + management ready*
*Every change is permanent until manually changed*
*Nothing lost, ever* 🛡️
