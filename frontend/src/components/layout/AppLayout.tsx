import { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import {
  Home,
  FileText,
  Users,
  Settings,
  BarChart3,
  Shield,
  Layers,
  CheckSquare,
  ClipboardList,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronRight,
  Clock,
  ArrowRight,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Navigation item interface
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  permissions?: string[];
  badge?: string | number;
}

// Breadcrumb mapping
const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/requests': 'Case Note Requests',
  '/requests/search': 'Search Requests',
  '/batch-requests': 'Batch Requests',
  '/verify-case-notes': 'Verify Case Notes',
  '/mrs-case-note-requests': 'MR Staff Case Note Requests',
  '/case-note-timeline': 'Case Note Timeline',
  '/admin/patients': 'Patient Management',
  '/admin/doctors': 'Doctor Management',
  '/users': 'User Management',
  '/settings': 'Settings',
  '/reports': 'Reports & Analytics',
  '/handover-requests': 'Handover Requests',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  // Define navigation items based on roles and permissions
  const navigationItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      roles: ['CA', 'MR_STAFF', 'ADMIN']
    },
    {
      name: 'Case Note Requests',
      href: '/requests',
      icon: FileText,
      roles: ['CA', 'MR_STAFF', 'ADMIN']
    },
    {
      name: 'MR Staff Case Note Requests',
      href: '/mrs-case-note-requests',
      icon: FileText,
      roles: ['MR_STAFF']
    },
    {
      name: 'Case Note Timeline',
      href: '/case-note-timeline',
      icon: Clock,
      roles: ['MR_STAFF']
    },
    {
      name: 'Batch Requests',
      href: '/batch-requests',
      icon: ClipboardList,
      roles: ['CA']
    },
    {
      name: 'Verify Case Notes',
      href: '/verify-case-notes',
      icon: CheckSquare,
      roles: ['CA']
    },
    {
      name: 'Handover Requests',
      href: '/handover-requests',
      icon: ArrowRight,
      roles: ['CA']
    },
    {
      name: 'Patient Management',
      href: '/admin/patients',
      icon: Layers,
      roles: ['ADMIN']
    },
    {
      name: 'Doctor Management',
      href: '/admin/doctors',
      icon: User,
      roles: ['ADMIN']
    },
    {
      name: 'User Management',
      href: '/users',
      icon: Users,
      permissions: ['manage_users']
    },
    {
      name: 'Reports & Analytics',
      href: '/reports',
      icon: BarChart3,
      permissions: ['view_reports']
    },
    {
      name: 'Audit Logs',
      href: '/audit',
      icon: Layers,
      permissions: ['view_audit_logs']
    },
    {
      name: 'System Settings',
      href: '/settings',
      icon: Settings,
      roles: ['ADMIN']
    }
  ];

  // Filter navigation items based on user roles and permissions
  const filteredNavItems = navigationItems.filter(item => {
    if (item.roles && item.roles.some(role => hasRole(role))) {
      return true;
    }
    if (item.permissions && item.permissions.some(permission => hasPermission(permission))) {
      return true;
    }
    return false;
  });

  // Generate breadcrumbs
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: { name: string; href: string; current: boolean }[] = [];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const name = breadcrumbMap[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({
        name,
        href: currentPath,
        current: index === pathSegments.length - 1
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-2">
              <h1 className="text-lg font-bold text-gray-900">CNRS</h1>
              <p className="text-xs text-gray-500">Case Note System</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href ||
                           (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-blue-50 border-r-2 border-blue-600 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                  )}
                />
                {item.name}
                {item.badge && Number(item.badge) > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {user?.roles.map((role, index) => (
              <Badge key={`${role}-${index}`} variant="outline" className="text-xs">
                {role === 'CA' ? 'CA' : role === 'MR_STAFF' ? 'MR' : 'ADMIN'}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Breadcrumbs */}
              <nav className="flex">
                <ol className="flex items-center space-x-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.href} className="flex items-center">
                      {index > 0 && (
                        <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
                      )}
                      {crumb.current ? (
                        <span className="text-sm font-medium text-gray-900">
                          {crumb.name}
                        </span>
                      ) : (
                        <Link
                          to={crumb.href}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          {crumb.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
