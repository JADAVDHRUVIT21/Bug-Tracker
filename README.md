# 🐞 Bug Tracker API

A RESTful Bug Tracking and Project Management API built with **FastAPI** and **PostgreSQL**. It helps teams manage projects, track bugs and tasks, assign team members, collaborate through comments, and upload attachments.

## 🚀 Features

- **Authentication:** User registration, login, and JWT-based authentication.
- **Role-Based Access Control:** Admin, Developer, and Viewer roles.
- **Project Management:** Create, view, update, and delete projects.
- **Team Management:** Add, list, and remove project members.
- **Ticket Management:** Create and manage bugs, tasks, and feature requests.
- **Kanban Workflow:** Todo, In Progress, In Review, and Done statuses.
- **Priority Management:** Low, Medium, High, and Critical.
- **Advanced Ticket Listing:** Search, filtering, and pagination.
- **Comments:** Add, edit, delete, and create threaded replies.
- **Attachments:** Upload, download, list, and delete supported files.
- **Access Control:** Restrict project and ticket operations based on user permissions.
- **Database Migrations:** Manage database schema changes with Alembic.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Python 3.13 | Programming language |
| FastAPI | Backend framework |
| PostgreSQL | Relational database |c
| SQLAlchemy | ORM |
| Pydantic | Data validation |
| Alembic | Database migrations |
| JWT | Authentication |
| Pytest | Automated testing |

## 📁 Project Structure

```text
Bug-Tracker/
│
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── tests/
│   ├── uploads/
│   │   └── attachments/
│   ├── .env
│   ├── .gitignore
│   ├── alembic.ini
│   └── requirements.txt
│
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Bug-Tracker
```

### 2. Create a virtual environment

```bash
cd backend
py -3.13 -m venv venv
```

### 3. Activate the environment

**Windows PowerShell:**

```powershell
.\venv\Scripts\Activate.ps1
```

### 4. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 5. Configure environment variables

Create a `.env` file inside the `backend` directory.

```env
APP_NAME=Bug Tracker API
APP_ENV=development
DEBUG=True
API_V1_PREFIX=/api/v1

DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/bug_tracker_db

SECRET_KEY=YOUR_SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

UPLOAD_DIR=uploads/attachments
MAX_UPLOAD_SIZE=5242880
```

Replace the database credentials and secret key with your own values. Never commit `.env` to GitHub.

### 6. Create the PostgreSQL database

Create a database named:

```sql
CREATE DATABASE bug_tracker_db;
```

### 7. Apply database migrations

```bash
python -m alembic upgrade head
```

### 8. Start the development server

```bash
uvicorn app.main:app --reload
```

The backend will run at:

```text
http://127.0.0.1:8000
```

## 📚 API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI:** http://127.0.0.1:8000/docs
- **ReDoc:** http://127.0.0.1:8000/redoc
- **Health Check:** http://127.0.0.1:8000/health

## 🧪 Running Tests

Run the complete automated test suite from the `backend` directory:

```bash
python -m pytest -v
```

The current backend test suite contains **60 passing tests**.

## 🔐 Security

- JWT-based authentication.
- Password hashing.
- Role-based authorization.
- Project-level access restrictions.
- File type and size validation.
- Safe attachment storage.
- Environment-based secret configuration.

## 🗺️ Development Status

- [x] Backend project setup
- [x] PostgreSQL database integration
- [x] SQLAlchemy models and Alembic migrations
- [x] Authentication and authorization
- [x] User management
- [x] Project management
- [x] Project member management
- [x] Ticket management
- [x] Comments and threaded replies
- [x] Attachment management
- [x] Automated backend tests

## 👨‍💻 Author

**DHRUVIT JADAV**


⭐ If you find this project useful, consider giving it a star!