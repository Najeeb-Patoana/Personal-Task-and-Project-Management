#  TaskManager

A full-stack, containerized **Personal Project & Task Workspace** designed to help users efficiently organize projects, track daily tasks, and manage personal productivity.

Originally built as a cloud-dependent application, this project has been fully re-engineered into a robust, self-hosted architecture featuring enterprise-grade authentication, optimized database queries, local file management, and automated email notifications.

---

##  Key Features

###  Secure Authentication
- Email & Password authentication with **bcrypt** password hashing.
- Google Sign-In using **Google Identity Services**.
- JWT Authentication with:
  - **Access Token:** 30 minutes
  - **Refresh Token:** 7 days
- Secure database-backed refresh token management.

###  Project & Task Management
- Create and manage projects.
- Create, update, delete, and organize tasks.
- Set priorities and monitor task status.

###  Performance Optimized
- Server-side pagination.
- Dynamic sorting.
- Search and filtering.
- Optimized database queries for handling large datasets.

###  Optimistic UI Updates
- Instant UI updates during task deletion and other operations.
- Automatic rollback if the server request fails.

###  Local File Attachments
- Upload notes, images, and PDF files.
- Local storage using **Multer**.

###  Automated Email Notifications
- Sends warning emails when users exceed the free-tier limit of **100 tasks**.
- Powered by **Nodemailer**.

###  Bulk Operations
- Bulk task creation.
- Supports recurring task generation.

###  Analytics Dashboard
Displays real-time statistics including:
- Total Tasks
- Completed Tasks
- Pending Tasks
- Overdue Tasks

---

#  Tech Stack

### Frontend
- React (Vite)
- React Router
- Google OAuth (`@react-oauth/google`)

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL (Self-hosted)

### Authentication
- JSON Web Tokens (JWT)
- Refresh Tokens

### Infrastructure
- Docker
- Docker Compose
- pgAdmin

### File Storage
- Multer (Local Storage)

### Email Service
- Nodemailer (SMTP)

---

#  Prerequisites

Make sure the following are installed before running the project:

- Node.js (v16 or higher)
- Docker Desktop
- Google Cloud Console account (for Google OAuth Client ID)

---

#  Installation & Setup

## 1. Clone the Repository

```bash
git clone https://github.com/Najeeb-Patoana/Personal-Task-and-Project-Management
cd taskmanager
```

---

## 2. Start PostgreSQL & pgAdmin

Run the Docker containers:

```bash
docker-compose up -d
```

After the containers are running:

- Connect to PostgreSQL.
- Execute your SQL schema scripts.
- Create the required tables:
  - users
  - profiles
  - projects
  - tasks
  - refresh_tokens

---

## 3. Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
PGUSER=postgres
PGHOST=localhost
PGPASSWORD=db_password
PGDATABASE=taskmanager
PGPORT=5432

JWT_SECRET=secret_access_key
JWT_REFRESH_SECRET=secret_refresh_key

GOOGLE_CLIENT_ID=google-client-id.apps.googleusercontent.com

SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=smtp_email@example.com
SMTP_PASS=smtp_password (it will a generated password not your gmail original password , rememeber it)
MAIL_FROM="Task Manager" <noreply@taskmanager.com>
```

Start the backend server:

```bash
npm run dev
```

---

## 4. Frontend Setup

Navigate to the frontend folder:

```bash
cd ../frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=google-client-id.apps.googleusercontent.com
```

Start the development server:

```bash
npm run dev
```

---

#  Database Schema Overview

| Table | Description |
|--------|-------------|
| **users** | Stores authentication credentials (email, password hash). |
| **profiles** | Stores user profile information such as name. |
| **projects** | Stores project details created by users. |
| **tasks** | Stores task information with project relationships, priorities, status, and file attachments. |
| **refresh_tokens** | Stores active refresh tokens for secure session management. |

---

#  Project Structure

```text
TaskManager/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── uploads/
│   ├── db/
│   └── package.json
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

#  Authentication Flow

1. User logs in using Email/Password or Google.
2. Server verifies credentials.
3. Access Token is generated (30 minutes).
4. Refresh Token is generated (7 days) and stored in the database.
5. When the Access Token expires, the Refresh Token issues a new Access Token.
6. Logout revokes the Refresh Token from the database.

---

#  Features Summary

- User Authentication
- Google OAuth Login
- JWT Authentication
- Refresh Token Authentication
- Project Management
- Task Management
- Search
- Filtering
- Sorting
- Pagination
- Analytics Dashboard
- File Uploads
- Email Notifications
- Bulk Task Creation
- Dockerized PostgreSQL
- pgAdmin Integration

---

#  Author

**Najeeb Ullah Khan**