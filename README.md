# TaskFlow - Full-Stack Task Management & Collaboration Platform

TaskFlow is a modern, enterprise-ready task management, team collaboration, and roadmap planning platform. Built on the MERN stack (MongoDB, Express.js, React 18, Node.js) with real-time WebSocket synchronization, Firebase Authentication, and Google Gemini Generative AI services.

---

## 🚀 Key Features

### 1. 🔐 Modern Authentication (Firebase & JWT)
- **Firebase Authentication Integration**: Seamless Google Sign-In (one-tap / popup) and Email & Password auth via Firebase Client SDK.
- **Server-Side Token Verification**: Backend verification via `firebase-admin` SDK, ensuring tamper-proof session tokens.
- **Dual JWT Token Architecture**: Short-lived Access Tokens (15m) paired with cryptographically secure Refresh Tokens stored in HTTP-only cookies.
- **Role-Based Access Control (RBAC)**: Admin, Manager, and Member granular workspace and project permissions.

### 2. 🤖 Google Gemini AI Suite
- **Meeting Notes to Tasks**: Converts raw, unstructured meeting notes or brainstorms into structured tasks with priority, due date, and acceptance checklists.
- **Agile User Story Architect**: Rewrites brief task descriptions into full Scrum user stories (`As a... I want... So that...`) with concrete acceptance criteria.
- **AI Kanban Project Architect**: Generates tailored Kanban workflow columns and populated starter task cards from a project brief.
- **AI Daily Standup Auto-Draft**: Analyzes completed, in-progress, and overdue tasks to auto-generate daily standup updates and mood indicators.
- **AI Workspace Productivity Insights**: Analyzes team velocity, workload distribution, and potential bottlenecks.
- **Multi-Model Fallback Cascade**: Automatic failover chain (`gemini-flash-lite-latest` → `gemini-flash-latest` → `gemini-3.5-flash-lite` → `gemini-pro-latest`) ensuring uninterrupted uptime under high demand.

### 3. 👥 Team Sync Hub (`/sync`)
- **Daily Asynchronous Standups**: Log *Yesterday's achievements*, *Today's commitments*, and *Blockers*.
- **Team Sentiment & Mood Radar**: Track real-time team morale (`🚀 On fire`, `⚡ Productive`, `🧘 Steady`, `⚠️ Struggling`, `🛑 Blocked`).
- **Interactive Sprint Retrospectives**: Collaborative boards for `What Went Well`, `What Can Be Improved`, and `Action Items` with live upvoting.
- **Live Reaction Stream**: Socket.io real-time emoji reactions on standup check-ins.

### 4. 🗺️ Roadmap & OKR Milestone Tracking (`/roadmap`)
- **Strategic Timeline Roadmap**: Visual phase-based milestone tracking (`Discovery`, `Design`, `Development`, `Testing`, `Launch`) with progress percentages and target dates.
- **Quarterly OKR Goals**: Set strategic, product, engineering, and operational objectives with quantitative key results and progress bars.
- **Filter by Project & Workspace**: Slice roadmap views across portfolio workspaces and individual projects.

### 5. 📋 Advanced Kanban & Task Management
- **Interactive Drag-and-Drop**: Fluid drag-and-drop boards powered by `@dnd-kit`.
- **Multi-View Navigation**: Kanban board, Task list, and Calendar schedule views.
- **Task Metadata**: Custom fields, subtask checklists, labels, file attachments, and dependencies (`blocks`, `is-blocked-by`, `relates-to`).
- **Real-Time Collaboration**: Live presence indicators, card movement broadcasts, and instant comment threads powered by Socket.io.

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.x
- **Database**: MongoDB 7+ / MongoDB Atlas with Mongoose 8 ODM
- **Authentication**: Firebase Admin SDK (`firebase-admin`), JWT (`jsonwebtoken`), bcryptjs
- **Artificial Intelligence**: Google Generative AI SDK (`@google/generative-ai`)
- **Real-Time Engine**: Socket.io 4.x
- **Security & Utilities**: Helmet, CORS, Express Rate Limit, Cookie-Parser, Multer

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS, Headless UI, Heroicons, Lucide React
- **Authentication**: Firebase Client SDK (`firebase/app`, `firebase/auth`)
- **Routing**: React Router v6
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Real-Time**: Socket.io-client
- **HTTP Client**: Axios with automated token refresh interceptors
- **Notifications**: react-hot-toast

---

## 📦 Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (Local instance or MongoDB Atlas cluster connection string)
- **Firebase Project** (With Google Sign-In and Email/Password enabled)
- **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))

---

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/TaskFlow-ProjectManagementApp.git
cd TaskFlow-ProjectManagementApp
```

---

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

**Configure `backend/.env`:**
```env
# Server Configuration
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:3000

# Database Configuration (MongoDB Atlas or Local)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/taskflow?retryWrites=true&w=majority

# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your_firebase_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# File Uploads
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

#### Database Initialization
```bash
# Push all Mongoose schemas and build compound/text indexes in Atlas:
npm run db:init
```

#### Start Backend
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```
The backend API and WebSocket server will run at `http://localhost:5001`.

---

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

**Configure `frontend/.env`:**
```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_SOCKET_URL=http://localhost:5001

# Firebase Client Web Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1035499687556
REACT_APP_FIREBASE_APP_ID=1:1035499687556:web:...
```

#### Start Frontend
```bash
npm start
```
The frontend web application will launch at `http://localhost:3000`.

---

## 📁 Project Architecture

```
TaskFlow/
├── backend/
│   ├── config/
│   │   ├── database.js          # MongoDB connection with DNS fallback
│   │   └── firebase.js          # Firebase Admin SDK initialization
│   ├── controllers/
│   │   ├── authController.js    # Firebase token exchange & JWT issuance
│   │   ├── aiController.js      # Gemini AI prompt handlers
│   │   ├── syncController.js    # Team standups & retrospective items
│   │   ├── roadmapController.js # Milestones & quarterly OKRs
│   │   ├── taskController.js    # Task CRUD & drag-drop ordering
│   │   ├── projectController.js # Project & Kanban column management
│   │   └── workspaceController.js
│   ├── models/
│   │   ├── User.js              # User model with Firebase UID
│   │   ├── Workspace.js         # Workspace model
│   │   ├── Project.js           # Project model with columns
│   │   ├── Task.js              # Task model with subtasks & risk score
│   │   ├── Sprint.js            # Scrum sprint tracking
│   │   ├── Standup.js           # Daily standup logs & mood
│   │   ├── Milestone.js         # Roadmap phases & target dates
│   │   ├── Goal.js              # Strategic OKRs & key results
│   │   └── RetroItem.js         # Retrospective feedback cards
│   ├── routes/
│   │   ├── authRoutes.js        # Auth & Firebase callback endpoints
│   │   ├── aiRoutes.js          # Gemini AI endpoints
│   │   ├── syncRoutes.js        # Standups & retros endpoints
│   │   ├── roadmapRoutes.js     # Roadmap & OKR endpoints
│   │   └── taskRoutes.js
│   ├── scripts/
│   │   └── initDatabase.js      # Database schema initialization & index sync
│   ├── services/
│   │   └── aiService.js         # Gemini API client with fallback cascade
│   ├── socket/                  # Real-time WebSocket event dispatchers
│   └── server.js                # Express app entrypoint
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AITaskGeneratorModal.js # Notes to tasks generator
    │   │   ├── CreateProjectModal.js   # AI Kanban project architect
    │   │   ├── TaskModal.js            # Task details & user story enhancer
    │   │   ├── Navbar.js
    │   │   └── Sidebar.js
    │   ├── config/
    │   │   └── firebase.js             # Firebase client SDK initialization
    │   ├── context/
    │   │   ├── AuthContext.js          # Firebase auth & session management
    │   │   ├── SocketContext.js        # WebSocket event listeners
    │   │   └── ThemeContext.js         # Dark / Light theme toggle
    │   ├── pages/
    │   │   ├── Dashboard.js            # Main dashboard overview
    │   │   ├── KanbanBoard.js          # Drag-and-drop Kanban view
    │   │   ├── SyncHub.js              # Daily standups & sprint retrospectives
    │   │   ├── RoadmapView.js          # Interactive roadmaps & OKR milestones
    │   │   ├── CalendarView.js         # Task calendar schedule
    │   │   └── TasksView.js            # Global tabular tasks view
    │   └── services/
    │       └── api.js                  # Axios HTTP client with interceptors
```

---

## 🔒 Security Best Practices
- **No Stored Plaintext Passwords**: Passwords hashed with `bcryptjs` (salt rounds: 10).
- **HTTP-Only Cookies**: Refresh tokens are isolated from JavaScript execution to prevent XSS exfiltration.
- **CORS Allowlist**: Cross-origin requests restricted to explicitly designated frontend domains.
- **Security Headers**: Secured with `helmet` for CSP, X-Frame-Options, and HSTS.
- **Rate Limiting**: Protected against brute-force and DDoS attempts using `express-rate-limit`.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
