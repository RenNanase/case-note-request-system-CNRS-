# Case Note Request System (CNRS)

A production-ready Case Note Request System built with Laravel (backend API) and React (frontend), featuring OAuth2 authentication, role-based access control, and comprehensive audit logging.

## 🚀 Features

- **Authentication**: Laravel Passport OAuth2 with secure API authentication
- **Role-Based Access Control**: CA (Clinic Assistant), MR Staff, Admin roles
- **Request Workflow**: Submit → Approve/Reject → Track Status → Complete
- **Audit Trail**: Complete activity logging for all user actions
- **Real-time Dashboard**: Statistics, charts, and status tracking
- **Patient Search**: Fast autocomplete search by MRN/NRIC/Name
- **Movement Tracking**: Log case note handovers and location changes
- **Notifications**: In-app and email notifications for overdue requests
- **Reports & Analytics**: Comprehensive reporting with CSV export

## 🛠 Tech Stack

### Backend
- **Laravel 12** - PHP framework
- **Laravel Passport** - OAuth2 API authentication
- **spatie/laravel-permission** - Role-based permissions
- **spatie/laravel-activitylog** - Audit logging
- **MySQL** - Primary database

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI components
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Lucide React** - Icon library

## 📋 Prerequisites

- PHP 8.2+
- Node.js 18+
- MySQL 8.0+
- Composer
- npm/yarn

## 🔧 Installation & Setup

### Step 1: Backend Setup

```bash
# Install required Laravel packages
composer require laravel/passport spatie/laravel-permission spatie/laravel-activitylog

# Publish package configurations
php artisan vendor:publish --provider="Laravel\Passport\PassportServiceProvider"
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
php artisan vendor:publish --provider="Spatie\Activitylog\ActivitylogServiceProvider"
```

### Step 2: Environment Configuration

Update your `.env` file:

```env
APP_NAME="CNRS - Case Note Request System"
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cnrs
DB_USERNAME=root
DB_PASSWORD=

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Step 3: Create Database

Create a MySQL database named `cnrs`:

```sql
CREATE DATABASE cnrs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 4: Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
npm install react-router-dom @tanstack/react-query axios lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs
npm install class-variance-authority clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer
```

## 🎨 Design System

### Color Palette
- **Canvas Background**: `#F7F1E3` (Soft beige)
- **Sidebar**: `#111217` (Dark charcoal)
- **Accent Colors**: Butter `#FDE68A`, Lilac `#E9D5FF`, Sky `#BFDBFE`, Mint `#BBF7D0`

### Status Colors
- **Pending**: `#FEF3C7`, **In Progress**: `#DBEAFE`, **Completed**: `#D1FAE5`, **Overdue**: `#FEE2E2`

## 🚀 Running the Application

### Backend (Laravel API)
```bash
php artisan serve  # http://localhost:8000
```

### Frontend (React)
```bash
cd frontend
npm run dev  # http://localhost:3000
```

## 📁 Project Structure

```
cnrs/
├── app/                    # Laravel application code
├── config/                 # Configuration files
├── database/              # Migrations, seeders, factories
├── frontend/              # React TypeScript application
│   ├── src/components/    # Reusable UI components
│   ├── src/pages/         # Page components
│   ├── src/lib/           # Utility functions
│   └── src/types/         # TypeScript definitions
├── routes/                # API routes
└── tests/                 # Backend tests
```

## 🏗 Build Progress

### ✅ Step 1: Repositories & Scaffolding (COMPLETED)
- [x] Laravel 12 with OAuth2, RBAC, and audit logging
- [x] React + TypeScript + Vite frontend
- [x] Tailwind CSS with CNRS design system
- [x] shadcn/ui component library integration
- [x] Development server configuration

### 🔄 Upcoming Steps
- Step 2: Authentication & RBAC
- Step 3: Database schema and models
- Step 4: Core request workflow API
- Step 5: Patient search functionality
- Step 6: Notifications system
- Step 7: Frontend UI components
- Step 8: Testing and deployment

---

*Built with ❤️ for healthcare workflow optimization*
