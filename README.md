# TimeTracker Admin Dashboard

A modern, professional SaaS-grade admin dashboard for time tracking applications. Built with React, TypeScript, Firebase, and Tailwind CSS.

## Features

### 🔐 Authentication & Authorization
- Firebase Authentication integration
- Role-based access control (Admin, Manager, Employee)
- Secure login with email/password
- Protected routes based on user roles

### 👥 Admin Dashboard
- Complete user management system
- Role assignment and management
- Manager-employee relationship mapping
- User search and filtering capabilities
- User creation and editing

### 📊 Manager Dashboard
- View assigned employees' timesheets
- Review weekly work sessions
- Approve/disapprove sessions with feedback
- Screenshot preview and idle time tracking
- Comprehensive session details modal

### ⏰ Timesheet Management
- Weekly session overview
- Detailed session information (clock-in/out, duration, idle time)
- Screenshot thumbnails with full-size preview
- Idle event tracking and analysis
- Manager approval workflow

### 🎨 Design Features
- Premium SaaS-grade UI design
- Responsive layout for all devices
- Modern component library with ShadCN UI
- Smooth animations and transitions
- Professional color scheme and typography

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + ShadCN UI Components
- **Backend**: Firebase (Auth + Firestore)
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Build Tool**: Vite

## Getting Started

### Prerequisites
- Node.js 16+ 
- Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Update `src/lib/firebase.ts` with your Firebase configuration
   - Enable Email/Password authentication in Firebase Console
   - Set up Firestore with appropriate security rules

### Firestore Collections

The app expects the following Firestore collections:

#### `users` collection:
```javascript
{
  id: string,
  email: string,
  displayName: string,
  role: 'admin' | 'manager' | 'employee',
  managerId?: string,
  createdAt: timestamp,
  lastActive?: timestamp
}
```

#### `sessions` collection:
```javascript
{
  id: string,
  userId: string,
  userName: string,
  userEmail: string,
  date: timestamp,
  clockIn: timestamp,
  clockOut?: timestamp,
  totalDuration: number, // minutes
  idleTime: number, // minutes
  screenshots: [
    {
      id: string,
      timestamp: timestamp,
      url: string,
      thumbnailUrl: string
    }
  ],
  idleEvents: [
    {
      id: string,
      startTime: timestamp,
      endTime: timestamp,
      duration: number, // minutes
      reason: string
    }
  ],
  taskComments: string,
  approvalStatus: 'pending' | 'approved' | 'disapproved',
  managerComment?: string,
  managerId?: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Development

Run the development server:
```bash
npm run dev
```

### Demo Credentials

For testing purposes, you can create demo accounts:
- **Admin**: admin@company.com / admin123
- **Manager**: manager@company.com / manager123

## User Roles & Permissions

### Admin
- Full user management capabilities
- Create/edit/delete users
- Assign roles and manager relationships
- View system-wide statistics

### Manager
- View assigned employees only
- Review and approve/disapprove timesheets
- Access detailed session information
- Add feedback comments to sessions

### Employee
- No access to admin dashboard
- (Desktop app handles time tracking)

## Key Components

- **UserManagement**: Complete admin interface for managing users
- **TimesheetManagement**: Manager interface for reviewing employee sessions
- **SessionDetailsModal**: Detailed view of individual work sessions
- **AuthContext**: Handles authentication state and user management
- **Sidebar**: Navigation component with role-based menu items

## Security Features

- Role-based access control at component level
- Firebase security rules for data protection
- Input validation and sanitization
- Secure password requirements
- Session-based authentication

## Deployment

Build for production:
```bash
npm run build
```

Deploy to your preferred hosting platform (Vercel, Netlify, Firebase Hosting, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.