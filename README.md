# Todoist Enhanced

**The ultimate smart task manager with 100+ features, dark mode, PWA support, and a beautiful modern interface.**

[![Netlify Status](https://api.netlify.com/api/v1/badges/48c6acdb-3046-4d96-87a4-c044b078f8a1/deploy-status)](https://ob-autodeploy.netlify.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![Lighthouse Performance](https://img.shields.io/badge/Lighthouse-Performance%20~70-orange?logo=lighthouse&logoColor=white)](tests/QA-lighthouse-audit.md)
[![Lighthouse Accessibility](https://img.shields.io/badge/Lighthouse-Accessibility%20~80-yellow?logo=lighthouse&logoColor=white)](tests/QA-lighthouse-audit.md)
[![Lighthouse Best Practices](https://img.shields.io/badge/Lighthouse-Best%20Practices%20~88-yellowgreen?logo=lighthouse&logoColor=white)](tests/QA-lighthouse-audit.md)
[![Lighthouse PWA](https://img.shields.io/badge/Lighthouse-PWA%20~35-red?logo=lighthouse&logoColor=white)](tests/QA-lighthouse-audit.md)

## Live Demo

**[https://ob-autodeploy.netlify.app](https://ob-autodeploy.netlify.app)**

## Screenshot

![Todoist Enhanced Screenshot](https://via.placeholder.com/800x400/1a1a1a/5f9fff?text=Todoist+Enhanced+-+100%2B+Features)

## Features

### Core Task Management

1. Instant task creation with optimistic UI updates
2. Permanent SQLite storage with 5-layer data protection
3. Smart Views - Inbox, Today, Upcoming, Completed, Statistics
4. Unlimited projects with colored labels and icons
5. Priority levels P1–P4 with visual color indicators
6. Due dates with natural language parsing (`@tomorrow`, `@next week`)
7. Relative date shortcuts (`@in 3 days`, `@in 2 weeks`)
8. Labels/tags with colorful badge display
9. Quick label creation using `#labelname` in task input
10. Subtasks with nested hierarchy support
11. Subtask progress bars showing completion percentage
12. Drag-and-drop task reordering (dnd-kit)
13. Bulk select with `Ctrl+A`
14. Bulk delete with `Delete` key
15. Task completion with animated checkbox
16. Confetti celebration animation on task complete
17. Task editing inline without modal popups
18. Task detail modal with full edit options
19. Task duplication / clone feature
20. Task archiving and restore

### Dark Mode

21. Toggle dark mode with floating moon/sun button
22. Keyboard shortcut `Ctrl+D` to toggle dark mode
23. Dark mode preference persisted in localStorage
24. Smooth CSS transitions on all color changes
25. Modern dark theme with readable contrast ratios
26. Beautiful dark card backgrounds and shadows

### PWA (Progressive Web App)

27. Installable on mobile home screen
28. Installable on desktop via browser prompt
29. Service worker for offline asset caching
30. Full PWA manifest with icons and theme colors
31. Offline fallback page
32. Background sync for pending task changes
33. Responsive design for all screen sizes (mobile-first)

### Keyboard Shortcuts

34. `Ctrl+K` — Quick add task dialog
35. `Ctrl+F` — Focus global search bar
36. `Ctrl+D` — Toggle dark/light mode
37. `Alt+1` — Navigate to Inbox
38. `Alt+2` — Navigate to Today view
39. `Alt+3` — Navigate to Upcoming view
40. `Alt+4` — Navigate to Statistics dashboard
41. `Ctrl+A` — Select all visible tasks
42. `Delete` — Delete selected tasks
43. `Escape` — Close any open modal or panel
44. `?` — Show keyboard shortcuts help panel
45. `Enter` — Submit task in quick-add dialog

### Calendar Features

46. Full month calendar grid view
47. Click any date to add a task directly to that day
48. Task count badges on each calendar day
49. Color-coded task priority dots on calendar
50. Navigate to previous and next months
51. Current day highlighted with accent color
52. Jump to today button

### Data Protection (5 Layers)

53. Automatic server-side hourly database backups (24 kept)
54. Auto-save every 30 seconds
55. Instant save on every change/mutation
56. localStorage client-side failsafe with crash recovery
57. Daily database snapshots (7 days of history)
58. 8-second undo window after task deletion
59. Undo toast notification with clickable restore

### Productivity & Analytics

60. Statistics dashboard with completion rate graphs
61. Daily, weekly, and monthly productivity charts (Recharts)
62. Productivity streak tracker — days with completed tasks
63. Overdue task highlighting in red
64. Today's task highlight in blue
65. Smart filters by priority, label, project, date range
66. Full-text search across tasks and projects
67. Search highlighting of matched keywords
68. Export all data as JSON download
69. Import data from Todoist JSON format
70. Completed tasks archive with date stamp

### UI/UX Excellence

71. Hover-reveal action buttons (edit, delete, complete)
72. Smooth slide-in/out animations for all actions
73. Loading skeleton placeholders for async data
74. Gradient backgrounds on cards and call-to-action buttons
75. Empty state illustrations with helpful CTAs
76. Toast notifications for success and error feedback
77. Auto-dismiss toasts after 3 seconds
78. Responsive sidebar with collapsible navigation
79. Project color picker with 12 preset colors
80. Label color picker with customizable hex colors
81. Sticky header with scroll-aware shadow
82. Floating action button for quick task add on mobile

### Authentication & Security

83. JWT-based authentication with secure httpOnly cookies
84. bcrypt password hashing with configurable salt rounds
85. User registration with email + password
86. Login / logout with session management
87. Protected API routes requiring valid JWT
88. API rate limiting with express-rate-limit
89. Helmet.js security headers (CSP, HSTS, XSS protection)
90. CORS configuration for allowed frontend origins
91. Input sanitization on all API endpoints
92. SQL injection prevention via parameterized queries

### Backend & Infrastructure

93. Express.js REST API with structured route modules
94. SQLite3 embedded database (zero external DB setup)
95. Database migrations with schema versioning
96. Serverless-http adapter for Netlify Functions deployment
97. Health check endpoint `/api/health`
98. Error handling middleware with descriptive JSON errors
99. Request logging with morgan
100. Environment-based configuration (.env support)
101. Cross-platform: runs on Windows, macOS, Linux
102. Hot-reload development server with nodemon

### Additional Features

103. Multi-user support — each user has isolated task data
104. Project sharing (read-only link generation)
105. Recurring tasks (daily, weekly, monthly patterns)
106. Task comments / notes field
107. File attachment references on tasks
108. Custom sorting: by priority, date, name, manual
109. Filter combinations (priority AND label AND project)
110. Collapsible project sections in sidebar

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | Component-based UI with hooks |
| **Vite** | 8 | Lightning-fast dev server and production build |
| **Tailwind CSS** | 4 | Utility-first CSS styling |
| **Zustand** | latest | Lightweight global state management |
| **dnd-kit** | latest | Accessible drag-and-drop reordering |
| **Recharts** | latest | Analytics and productivity charts |
| **React Router DOM** | 7 | Client-side routing and navigation |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ | JavaScript server runtime |
| **Express.js** | 4 | Fast, minimal web framework |
| **SQLite3** | latest | Embedded relational database (no external DB needed) |
| **JWT (jsonwebtoken)** | latest | Stateless authentication tokens |
| **bcryptjs** | latest | Secure password hashing |
| **Helmet** | latest | HTTP security headers |
| **CORS** | latest | Cross-origin resource sharing |
| **serverless-http** | latest | Netlify Functions adapter |
| **morgan** | latest | HTTP request logging |
| **express-rate-limit** | latest | API rate limiting |

## Local Setup Instructions

### Prerequisites

- **Node.js** 18 or higher — [Download here](https://nodejs.org)
- **npm** (comes with Node.js)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Michaelunkai/todoist-enhanced.git
cd todoist-enhanced
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Start the Backend Server

```bash
node server.js
```

The API server starts at **http://localhost:3456**

### 4. Install Frontend Dependencies and Start Dev Server

Open a second terminal in the same project root:

```bash
cd frontend && npm install && npm run dev
```

The React dev server starts at **http://localhost:5173**

> **Note:** The frontend directory may be named `client` in the cloned repo. If `frontend` is not found, use `cd client && npm install && npm run dev`.

### 5. Open the App

Navigate to **http://localhost:5173** in your browser.

### Environment Variables (Optional)

Create a `.env` file in the project root:

```env
PORT=3456
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### Production Build

```bash
# Build the React frontend
npm run build

# Start the production server
npm start
```

## API Documentation

Base URL (local): `http://localhost:3456`
Base URL (production): `https://ob-autodeploy.netlify.app`

### Authentication

All protected endpoints require the `Authorization: Bearer <token>` header.

#### Auth Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Login and receive JWT token | No |
| `POST` | `/api/auth/logout` | Logout and invalidate session | Yes |
| `GET` | `/api/auth/me` | Get current user profile | Yes |

**Register example:**
```json
POST /api/auth/register
{ "email": "user@example.com", "password": "securepassword" }
```

**Login response:**
```json
{ "token": "eyJhbGci...", "user": { "id": 1, "email": "user@example.com" } }
```

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | Get all tasks for the authenticated user |
| `GET` | `/api/tasks/:id` | Get a single task by ID |
| `POST` | `/api/tasks` | Create a new task |
| `PUT` | `/api/tasks/:id` | Update a task (title, priority, due date, etc.) |
| `DELETE` | `/api/tasks/:id` | Delete a task permanently |
| `PATCH` | `/api/tasks/:id/complete` | Toggle task completion status |
| `POST` | `/api/tasks/:id/subtasks` | Add a subtask to a task |

**Create task body:**
```json
{
  "title": "Buy groceries",
  "priority": 2,
  "dueDate": "2026-04-05",
  "projectId": 1,
  "labels": ["shopping"],
  "notes": "Don't forget milk"
}
```

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | Get all projects |
| `POST` | `/api/projects` | Create a new project |
| `PUT` | `/api/projects/:id` | Update project name/color/icon |
| `DELETE` | `/api/projects/:id` | Delete a project and its tasks |

### Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/labels` | Get all labels |
| `POST` | `/api/labels` | Create a new label |
| `PUT` | `/api/labels/:id` | Update label name/color |
| `DELETE` | `/api/labels/:id` | Delete a label |

### Stats & Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Get productivity statistics (streaks, completion rates, charts data) |
| `GET` | `/api/export` | Export all user data as JSON |
| `POST` | `/api/import` | Import tasks/projects from JSON |
| `GET` | `/api/health` | Server health check |

**Stats response example:**
```json
{
  "totalTasks": 128,
  "completedToday": 5,
  "currentStreak": 7,
  "completionRate": 0.84,
  "weeklyData": [...]
}
```

### Error Responses

All errors return a consistent JSON structure:
```json
{ "error": "Task not found", "status": 404 }
```

## Netlify Deployment

This project deploys the **frontend as a static site** and the **backend as Netlify Functions** using the `serverless-http` adapter.

### Automatic Deployment (Recommended)

The repository includes a pre-push Git hook that triggers an automatic Netlify deploy on every push.

```bash
git push origin main
# → pre-push hook fires → Netlify build starts automatically
```

### Manual Netlify Deploy via CLI

1. Install the Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize the site (first time only):
   ```bash
   netlify init
   ```

4. Deploy to production:
   ```bash
   netlify deploy --prod
   ```

### Netlify Configuration

The project uses `netlify.toml` for build configuration:

```toml
[build]
  command = "cd frontend && npm install && npm run build"
  publish = "frontend/dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Environment Variables on Netlify

Set these in **Netlify Dashboard → Site Settings → Environment Variables**:

| Variable | Description | Example |
|---|---|---|
| `JWT_SECRET` | Secret key for JWT signing | `my-super-secret-key` |
| `NODE_ENV` | Environment name | `production` |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `https://yourdomain.netlify.app` |

### Deployed URL

**Production:** [https://ob-autodeploy.netlify.app](https://ob-autodeploy.netlify.app)

## File Structure

```
todoist-enhanced/
├── frontend/               # React frontend (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Route-level page components
│   │   ├── store/          # Zustand state stores
│   │   └── utils/          # Frontend utility functions
│   ├── public/             # Static assets, PWA manifest, icons
│   └── package.json
├── netlify/
│   └── functions/          # Netlify serverless function entry points
├── routes/                 # Express API route handlers
│   ├── tasks.js
│   ├── projects.js
│   ├── labels.js
│   ├── auth.js
│   └── stats.js
├── middleware/             # Express middleware (auth, rate-limit, errors)
├── utils/                  # Server-side utilities (db, backup, helpers)
├── db/                     # SQLite database files
├── backups/                # Automatic database backups
├── tests/                  # QA checklists and Lighthouse audit guides
├── server.js               # Express app + serverless-http entry point
├── netlify.toml            # Netlify build and redirect configuration
└── package.json
```

## Performance

Todoist Enhanced targets strong Lighthouse scores across all categories.

| Category       | Estimated | Target | Status          |
|----------------|:---------:|:------:|:---------------:|
| Performance    |    ~70    |  > 80  | Below Target    |
| Accessibility  |    ~80    |  > 90  | Below Target    |
| Best Practices |    ~88    |  > 90  | Near Target     |
| PWA            |    ~35    |  > 80  | Critical Gap    |
| SEO            |    ~65    |  > 90  | Below Target    |

**Run your own audit:**
```bash
npx lighthouse https://ob-autodeploy.netlify.app --output html
```

Full audit guide: [tests/QA-lighthouse-audit.md](tests/QA-lighthouse-audit.md)

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Author

**Michaelunkai**
- GitHub: [@Michaelunkai](https://github.com/Michaelunkai)
- Email: michaelovsky22@gmail.com

---

*Transform your productivity. One task at a time.*
