# 🔐 Paatam AI — Institutional Login Credentials & Testing Guide

This document lists the test credentials and endpoints for each institutional persona.
When opening the application at `http://localhost:5173/`, the app starts directly on the **Login Page**.

---

## 📋 Role Credentials Summary

| Role | Role Name | Login Identifier | Password / OTP | API Endpoint | Default Landing Route |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Branch Admin** | Dean & Principal | `dean.ramesh@paatam.edu` | `Admin@123` | `POST /api/auth/admin/login` | `/` (Command Centre) |
| **Teacher** | Faculty Teacher | `raina@school.edu` | `Teacher@123` | `POST /api/auth/teacher/login` | `/` (Command Centre) |
| **Student** | Student Learner | `ADM-2026-001` | `Student@123` | `POST /api/auth/student/login` | `/student` (Student Desk) |
| **Corporate Admin**| Corporate Super Admin | `corp.admin@paatam.edu` | OTP: `123456` | `POST /api/auth/corporate/login` + `verify` | `/campuses` (Network Governance) |

---

## ⚡ 1-Click Auto-Fill on Login Page
On the login page (`/login`), clicking any role tab:
1. **Branch Admin**
2. **Faculty Teacher**
3. **Student Desk**
4. **Corporate Super Admin**

automatically auto-fills the login form with the corresponding test credentials and displays an **"Auto-Fill Credentials"** button if you want to reset them at any point. You can directly click **"Sign In"** to test the authentication flow.

---

## 🛡️ Authentication Architecture & Endpoints

### 1. Branch Administrator (Dean / Principal / Vice-Principal)
- **Endpoint**: `POST /api/auth/admin/login`
- **Request Body**:
  ```json
  {
    "identifier": "dean.ramesh@paatam.edu",
    "password": "Admin@123"
  }
  ```
- **Capabilities**: Campus governance, academic year sessions, classes, sections, teacher assignments, student rosters.

### 2. Faculty / Subject Teacher
- **Endpoint**: `POST /api/auth/teacher/login`
- **Request Body**:
  ```json
  {
    "identifier": "raina@school.edu",
    "password": "Teacher@123"
  }
  ```
- **Capabilities**: Curriculum RAG ingestion, AI exam paper generation, handwritten script OCR marking, manual score overrides.

### 3. Student Desk
- **Endpoint**: `POST /api/auth/student/login`
- **Request Body**:
  ```json
  {
    "admission_no": "ADM-2026-001",
    "password": "Student@123"
  }
  ```
- **Capabilities**: View assignments, submit completed test papers, inspect evaluated scorecards with partial credits & Socratic hints.

### 4. Corporate Super Admin
- **Step 1 - Request OTP**: `POST /api/auth/corporate/login`
  ```json
  {
    "identifier": "corp.admin@paatam.edu"
  }
  ```
- **Step 2 - Verify OTP**: `POST /api/auth/corporate/verify`
  ```json
  {
    "identifier": "corp.admin@paatam.edu",
    "otp": "123456"
  }
  ```
- **Capabilities**: Multi-branch enterprise management, corporate administrator onboarding, global school policies.

---

## 🚪 Session Lifecycle & Sign Out
- When a user logs in, their JWT access token is stored in `localStorage` under `paatam_jwt_access_token` and automatically injected via `Authorization: Bearer <token>` on all requests to `https://api.paatam.in/api/...`.
- Clicking **"Sign Out"** in the top-right user menu clears the JWT token and user profile, immediately redirecting back to `/login`.
