# 🏛️ CT University • Campus Lodging & Hostel Mess Management Portal
### Department of Computer Science & Engineering | 6-Month Internship Project
**CT University, Ferozepur Road, Ludhiana, Punjab - 142024**

---

## 📋 Executive Summary & Project Abstract

In higher educational institutions such as **CT University**, hundreds of academic visitors arrive each semester—including external PhD thesis examiners, visiting professors, seminar keynote speakers, academic inspection delegates, and guardians/parents of hostel boarders. 

Historically, universities either relied on paper registers, fragmented emails, or inappropriate commercial hotel booking systems that misrepresented university reality with "5-star luxury suites, jacuzzis, and room service." 

The **CT University Campus Lodging & Hostel Mess Management Portal** is a full-stack, enterprise-grade university hospitality portal designed strictly around university infrastructure:
- **Faculty Transit Quarters** (academic guest rooms with study desks and Wi-Fi)
- **Hostel Guest Wings** (Boys Hostel & Girls Hostel transit rooms)
- **Common Dormitory Beds** (for university sports contingents & student hackathon teams)
- **Hostel Mess Dining Pass** (daily vegetarian hostel mess thali meal passes)
- **Campus Gate Shuttle** (transit between University Main Gate and Department Blocks)

The portal provides an unauthenticated guest intake flow (issuing immediate alphanumeric tracking reference codes) alongside a role-protected **Caretaker Allotment Desk** for Hostel Wardens and an overarching **Super Admin Console** for the University Administration.

---

## 👥 User Roles & Access Architecture

```
                        ┌──────────────────────────────────────────────┐
                        │              CT University Portal             │
                        └──────────────────────┬───────────────────────┘
                                               │
               ┌───────────────────────────────┼──────────────────────────────┐
               ▼                               ▼                              ▼
      [ External Guests ]            [ Hostel Caretakers ]           [ Super Admin ]
   (No Account Required)             (Faculty / Wardens)             (University Dean)
   ───────────────────────           ───────────────────             ─────────────────
   • Applies for stay/mess           • Reviews requests              • System config
   • Gets Reference Code             • Allots Room numbers           • Staff roster upload
   • Tracks approval status          • Issues Mess meal passes       • Department oversight
   • Views Hostel guidelines         • Checks in visitors            • Security & logs
```

### 1. External Guests & Visitors (Public Access)
- **Who uses it:** External Examiners, Visiting Faculty, Student Parents, Conference Delegates.
- **Workflow:** No prior login needed. Visitors fill in their official identification, host department endorsement (e.g., Computer Science & Engineering), arrival schedule, room requirement, and mess meal preferences.
- **Immediate Outcome:** Receives an immutable alphanumeric tracking reference (e.g., `REF-ABC123XYZ`) to track allotment status and download their digital entry pass.

### 2. Hostel Caretakers & Department Staff (`role: staff` / `role: dept_admin`)
- **Who uses it:** Hostel Wardens, Caretakers, Mess In-Charges, Transport Supervisors.
- **Important Note:** *University staff and administrators do not apply for rooms through the intake form.*
- **Workflow:** Staff log in with their institutional credentials. The system automatically scopes them to their designated desk (e.g., Accommodation Allotment Desk). They inspect incoming guest requests, verify department endorsements, assign specific room numbers (e.g., *Faculty Transit Wing - Room 204*), and approve hostel mess coupons.

### 3. Super Administrator / University Dean (`role: superadmin`, ID: `10001`)
- **Who uses it:** Chief Warden, Registrar, Dean of Student Affairs, CSE Department Head.
- **Workflow:** Complete administrative oversight over all campus hostels, staff accounts, Excel bulk roster imports (up to 50MB roster files), audit logs, and cross-departmental allocations.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend Framework** | **React 19** + **TypeScript** | Type-safe single-page application built for academic reliability |
| **Bundler & Tooling** | **Vite 6** | Ultra-fast HMR and optimized production bundling (< 600ms build) |
| **Styling & Design System** | **Vanilla CSS (Tokens)** | Deep Oxford Navy (`#1E3A8A`), Clean Canvas (`#F8FAFC`), Academic Gold & Emerald |
| **Icons & UI** | **Custom Scalable SVG Icons** | Zero-dependency, lightweight vector iconography |
| **Routing** | **React Router DOM v6** | Client-side routing with role-based route guards and slide drawer |
| **Backend Runtime** | **Node.js 20+** | High-performance asynchronous JavaScript engine |
| **Application Server** | **Express.js 4.x** | RESTful API server with JSON body-parser limit up to 50MB |
| **Database** | **MongoDB Atlas** | Distributed cloud NoSQL database connected via Mongoose ODM |
| **Authentication** | **JWT + bcryptjs** | Secure salted password hashing and stateless token verification |
| **Security & Hygiene** | **Helmet** + **CORS** + **Rate-Limit** | Enterprise HTTP security headers, CORS origin protection, DDoS defense |
| **Data Processing** | **XLSX (SheetJS)** | Institutional faculty/staff roster Excel workbook parser |

---

## 🗂️ Project Structure

```
Guest Leisureing/
├── client/                               # React + TypeScript Frontend Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── MainHeader.tsx            # Unified top header with CT University branding & slide toggle
│   │   │   ├── Sidebar.tsx               # Slide navigation drawer (Campus Intake, Caretaker, Admin)
│   │   │   └── Icons.tsx                 # Zero-dependency SVG iconography library
│   │   ├── pages/
│   │   │   ├── HomePage.tsx              # Public Guest Intake, Tracking & Guidelines portal
│   │   │   ├── DepartmentAdminPortal.tsx # Hostel Caretaker & Allotment Management Desk
│   │   │   ├── SuperAdminPage.tsx        # Dean / Super Admin Control Hub (Excel Roster upload)
│   │   │   ├── LoginPage.tsx             # Staff & Administrator Authentication
│   │   │   ├── RegisterPage.tsx          # Staff Self-Onboarding with Staff ID Verification
│   │   │   └── GuestDashboardPage.tsx    # Visitor Stay Management Dashboard
│   │   ├── types/
│   │   │   └── index.ts                  # TypeScript Interfaces (User, GuestRequest, Department)
│   │   ├── App.tsx                       # Master Route Registry & Global Layout Shell
│   │   ├── index.css                     # University Design Tokens & Academic CSS System
│   │   └── main.tsx                      # Vite React Mounting Point
│   ├── index.html                        # HTML5 Document Shell with Google Inter Typography
│   ├── package.json                      # Client Dependencies (React 19, Lucide, Vite)
│   └── vite.config.ts                    # Vite Build Configuration & API Proxy Rules
│
├── middleware/                           # Express Middleware Modules
│   └── auth.js                           # JWT Validation & Role-Based Access Control (RBAC)
│
├── models/                               # Mongoose Schemas & MongoDB Models
│   ├── GuestRequest.js                   # Transit lodging, mess meals & tracking schema
│   ├── User.js                           # Staff, Caretaker, and Administrator accounts
│   ├── VerifiedStaff.js                  # Master University staff roster model
│   ├── Booking.js                        # Historical bookings compatibility model
│   └── LeisureService.js                 # Campus facilities & services model
│
├── routes/                               # Express REST API Route Controllers
│   ├── guestRequestRoutes.js             # Public intake & tracking endpoints (/api/guest-requests)
│   ├── departmentAdminRoutes.js          # Caretaker desk endpoints (/api/dept-admin)
│   ├── adminRoutes.js                    # Super Admin endpoints & roster parser (/api/admin)
│   ├── authRoutes.js                     # Staff login & registration endpoints (/api/auth)
│   └── leisureRoutes.js                  # Campus services catalog endpoints
│
├── .env                                  # Environment Variables (MongoDB Atlas URI, JWT Secret)
├── package.json                          # Backend & Root Concurrently Orchestration Scripts
├── server.js                             # Express Application Entry Point & MongoDB Connection
└── README.md                             # Comprehensive Project Documentation
```

---

## 🏛️ Key Modules & Functional Workflows

### 1. Guest Transit Application (Visitors Only)
- **URL:** `http://localhost:5173/?tab=apply`
- Designed strictly for external academics and visitors.
- Capture:
  - Visitor Identification (Full Name, Designation, Home University/Institute, Mobile, Email).
  - Visitor Category (External Examiner, Visiting Professor, Parent/Guardian, Research Scholar, Delegate).
  - Academic Endorsement (Host Department e.g., *Computer Science & Engineering*).
  - Campus Accommodation: Check-In/Check-Out Dates, Room Type (*Faculty Transit Room*, *Hostel Guest Room*, *Common Dormitory Bed*).
  - Hostel Mess Dining: Meal selection (*Breakfast, Lunch, Dinner*) with dietary options (*Standard Vegetarian Mess Thali*, *Jain Meal*).
  - Campus Shuttle Pickup from University Main Gate.

### 2. Live Tracking & Digital Check-In Pass
- **URL:** `http://localhost:5173/?tab=track`
- Visitors look up their application using their **Reference Code** (e.g., `REF-A98B2C`) or registered email.
- Displays:
  - Real-time allotment status badge (`Pending Allotment`, `Room Allocated`, `Checked-In`).
  - Allocated Room Number & Hostel Block (e.g., *Room FTQ-204, Faculty Guest Wing*).
  - Host Department contact information.
  - One-click copy and print options for campus security verification.

### 3. Hostel Caretaker & Allotment Desk
- **URL:** `http://localhost:5173/dept-admin/accommodation`
- Designed for Hostel Wardens and Department Caretakers.
- Features:
  - Scoped strictly to the caretaker's assigned domain (e.g., Accommodation or Catering).
  - Inline 1-click room allotment modal with status update (`Allocated`, `Checked In`, `Completed`).
  - Search and filter by reference code, guest name, and date range.
  - Prevents non-superadmin staff from modifying departments outside their jurisdiction.

### 4. Dean / Super Admin Command Center
- **URL:** `http://localhost:5173/super-admin`
- Reserved for Master Super Administrator (`10001`):
  - **University Roster Bulk Import:** Drag-and-drop Excel (`.xlsx`, `.xls`) roster spreadsheets (handles up to 50MB files) to auto-verify university faculty and staff IDs.
  - **Role Elevation:** Promote teaching staff to Department Caretakers or Hostel Wardens.
  - **Audit Logs:** Full visibility into all room assignments, mess slip issuances, and user sessions.

### 5. Hostel & Mess Campus Guidelines
- **URL:** `http://localhost:5173/?tab=guidelines`
- Comprehensive campus regulations:
  - **Hostel Gate Timings:** Curfew strictly observed at 10:00 PM.
  - **Mess Schedule:** Breakfast (07:30 - 09:15), Lunch (12:15 - 14:00), Dinner (19:30 - 21:15).
  - **Identification Policy:** Government-issued photo ID required at security check-in.
  - **Campus Conduct:** Strict zero-tolerance policy for smoking, alcohol, and prohibited substances on university premises.

---

## 📡 REST API Reference

### Public Guest Requests (`/api/guest-requests`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/guest-requests` | Submit guest stay & mess application | Public |
| `GET` | `/api/guest-requests/track/:query` | Track application by Reference Code or Email | Public |
| `GET` | `/api/guest-requests` | List user's past requests | Authenticated Guest |

### Caretaker Desks (`/api/dept-admin`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/dept-admin/:dept/requests` | Fetch department requests (Accommodation/Mess/Transport) | Staff / Caretaker |
| `PUT` | `/api/dept-admin/requests/:id/accommodation` | Allot room number & update stay status | Caretaker |
| `PUT` | `/api/dept-admin/requests/:id/food` | Approve mess passes & update meal status | Mess In-Charge |
| `PUT` | `/api/dept-admin/requests/:id/transport` | Assign campus shuttle vehicle & driver | Transport Staff |

### Authentication & Users (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate staff or guest & return JWT | Public |
| `POST` | `/api/auth/register` | Register new staff member with Staff ID verification | Public |
| `GET` | `/api/auth/me` | Return authenticated user profile | Authenticated |

### Super Administration (`/api/admin`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Global campus statistics and occupancy count | Super Admin (`10001`) |
| `POST` | `/api/admin/verify-staff/upload` | Bulk upload Excel faculty/staff roster | Super Admin (`10001`) |
| `GET` | `/api/admin/users` | List all registered university users | Super Admin (`10001`) |
| `PATCH` | `/api/admin/users/:id/role` | Elevate staff role to Department Admin | Super Admin (`10001`) |

---

## 🚀 Installation & Local Setup

### Prerequisites
- **Node.js** v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm** v9.0.0 or higher
- **MongoDB Atlas** connection string or local MongoDB instance

### Step 1: Clone or Navigate to Project Directory
```powershell
cd "c:\Users\NAVJOT SINGH\Desktop\Guest Leisureing"
```

### Step 2: Install Root Dependencies
```powershell
npm install
```

### Step 3: Install Frontend Dependencies
```powershell
npm install --prefix client
```

### Step 4: Configure Environment Variables
Create or verify `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb+srv://princevegetasaiyan01234_db_user:navjot1234@navjot.4m1pws3.mongodb.net/guest_leisureing?retryWrites=true&w=majority
JWT_SECRET=ct_university_guest_portal_secret_key_2026
SUPER_ADMIN_ID=10001
SUPER_ADMIN_PASSWORD=Master@2026
```

### Step 5: Start Development Server
Run backend API and frontend Vite server concurrently:
```powershell
npm run dev
```

The system will start:
- 🌐 **Frontend Client:** [http://localhost:5173](http://localhost:5173)
- ⚙️ **Backend API:** [http://localhost:5000](http://localhost:5000)
- 🩺 **Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Default Credentials & Test Accounts

| Role | Username / ID / Email | Password | Primary Function |
|---|---|---|---|
| **Super Admin** | `10001` *(or super admin email)* | `Master@2026` | Master administrative console & roster upload |
| **Hostel Caretaker** | `accommodation.staff@test.com` | `password123` | Room allotment & hostel guest intake |
| **Mess In-Charge** | `catering.staff@test.com` | `password123` | Hostel mess passes & dining slips |
| **Transport Desk** | `transport.staff@test.com` | `password123` | University gate shuttle coordination |
| **Visiting Guest** | *(No credentials needed)* | *(N/A)* | Submit form and track using Reference Code |

---

## 🧪 Build Validation

To verify the TypeScript frontend build for production deployment:
```powershell
npm run build --prefix client
```
Expected output:
```
✓ 36 modules transformed.
✓ built in ~500ms
```

---

## 📜 Academic Declaration & Acknowledgements

This project was developed by **Navjot Singh** as part of the **6-Month Internship Curriculum** for the award of the Degree of **Bachelor of Technology (B.Tech) in Computer Science & Engineering** at **CT University, Ludhiana, Punjab**.

Special thanks to the faculty mentors, hostel warden staff, and the Department of Computer Science & Engineering for providing real-world operational domain requirements to transition this project into an authentic campus hospitality system.

---
*CT University • Ferozepur Road, Ludhiana, Punjab • Department of Computer Science & Engineering*
