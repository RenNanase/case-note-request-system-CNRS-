import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import {
  Home,
  FileText,
  Users,
  Settings,
  BarChart3,
  Layers,
  CheckSquare,
  Menu,
  LogOut,
  Bell,
  ChevronRight,
  ChevronLeft,
  Clock,
  ArrowRight,
  User,
  RotateCcw,
  Package,
  Search,
  Plus
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
import { requestsApi } from '@/api/requests';
import PasswordChangeDialog from '@/components/PasswordChangeDialog';

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
  '/my-requests': 'My Case Notes',
  '/requests/search': 'Search Requests',
//   '/individual-requests': 'Request Case Notes',
  '/batch-requests': 'Batch Case Notes',
  '/verify-case-notes': 'Verify Case Notes',
  '/return-case-notes': 'Return Case Notes',
  '/mrs-case-note-requests': 'MR Staff Case Note Requests',
  '/mrs-returned-case-notes': 'Returned Case Notes',
  '/case-note-timeline': 'Case Note Timeline',
  '/case-note-tracking': 'Case Note Tracking',
  '/open-new-case-note': 'Open New Case Note',
  '/admin/patients': 'Patient Management',
  '/admin/doctors': 'Doctor Management',
  '/users': 'User Management',
  '/settings': 'Settings',
  '/reports': 'Reports & Analytics',
  '/handover-requests': 'Handover Requests',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [lastNavStatsUpdate, setLastNavStatsUpdate] = useState<number>(0);
  const { user, logout, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  // Initialize sidebar state: default open; restore user preference if present
  useEffect(() => {
    const stored = localStorage.getItem('cnrs_sidebar_open');
    if (stored !== null) {
      setSidebarOpen(stored === 'true');
    } else {
      setSidebarOpen(true);
      localStorage.setItem('cnrs_sidebar_open', 'true');
    }
  }, []);

  // Keep sidebar open on large screens across route changes (e.g., after login)
  useEffect(() => {
    const isLarge = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
    if (isLarge && !sidebarOpen) {
      setSidebarOpen(true);
    }
  }, [location.pathname]);

  // Persist sidebar preference
  useEffect(() => {
    localStorage.setItem('cnrs_sidebar_open', String(sidebarOpen));
  }, [sidebarOpen]);

  // Check if user needs to change password
  useEffect(() => {
    if (user?.needs_password_change) {
      setShowPasswordChangeDialog(true);
    }
  }, [user?.needs_password_change]);

  // Load dashboard stats for navigation badges (only for CA users)
  useEffect(() => {
    const loadDashboardStats = async () => {
      if (user && hasRole('CA')) {
        try {
          const response = await requestsApi.getOptimizedDashboardStats();
          if (response.success) {
            const timestamp = Date.now();
            console.log('AppLayout dashboard stats at:', new Date(timestamp).toISOString(), response.data);
            console.log('AppLayout pending_handover_verifications:', response.data.pending_handover_verifications);
            console.log('AppLayout last update was:', lastNavStatsUpdate ? new Date(lastNavStatsUpdate).toISOString() : 'never');

            // Ensure pending_handover_verifications is properly handled
            const statsData = { ...response.data };
            if (statsData.pending_handover_verifications === undefined || statsData.pending_handover_verifications === null) {
              console.warn('AppLayout: pending_handover_verifications is undefined/null, setting to 0');
              statsData.pending_handover_verifications = 0;
            }

            setDashboardStats(statsData);
            setLastNavStatsUpdate(timestamp);
          }
        } catch (error) {
          console.error('Error loading dashboard stats for navigation:', error);
        }
      }
    };

    loadDashboardStats();

    // Refresh stats every 60 seconds for real-time updates
    const interval = setInterval(loadDashboardStats, 60000);

    return () => clearInterval(interval);
  }, [user, hasRole]);

  // Define navigation items based on roles and permissions
  const navigationItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
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
      name: 'Returned Case Notes',
      href: '/mrs-returned-case-notes',
      icon: RotateCcw,
      roles: ['MR_STAFF']
    },
    {
      name: 'Case Note Tracking',
      href: '/case-note-tracking',
      icon: Search,
      roles: ['MR_STAFF']
    },
    {
      name: 'Open New Case Note',
      href: '/open-new-case-note',
      icon: Plus,
      roles: ['MR_STAFF']
    },
    {
      name: 'My Case Notes',
      href: '/my-requests',
      icon: FileText,
      roles: ['CA']
    },
    // {
    //   name: 'Request Case Notes',
    //   href: '/individual-requests',
    //   icon: FileText,
    //   roles: ['CA']
    // },
    {
      name: 'Request Case Notes',
      href: '/batch-requests',
      icon: Package,
      roles: ['CA']
    },
    {
      name: 'Verify Case Notes',
      href: '/verify-case-notes',
      icon: CheckSquare,
      roles: ['CA']
    },
    {
      name: 'Return Case Notes',
      href: '/return-case-notes',
      icon: RotateCcw,
      roles: ['CA'],
      badge: dashboardStats?.rejected_returns_count > 0 ? dashboardStats.rejected_returns_count : undefined
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
    <div className="h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 shadow-sm transform transition-all duration-300 ease-in-out",
        sidebarOpen
          ? "translate-x-0 w-72"
          : "-translate-x-full lg:translate-x-0 lg:w-72"
      )}>
        <div className="flex items-center justify-between h-18 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <img src="/CNRS/cnrs.logo.png" alt="CNRS Logo" className="h-10 w-auto" />
            </div>
            <div>

              <p className="text-xs text-gray-500 -mt-1">Case Note Request System</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {/* Toggle sidebar button - visible on all screen sizes */}
            <Button
              variant="ghost"
              size="sm"
              className="flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Minimize sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>


          </div>
        </div>

        <nav className="flex-1 px-6 py-6 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href ||
                           (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

            // Add dynamic badge for Verify Case Notes based on pending verifications
            // Convert string values to numbers to fix badge calculation
            const pendingVerifications = parseInt(dashboardStats?.pending_verifications) || 0;
            const approvedHandoversPendingVerification = parseInt(dashboardStats?.approved_handovers_pending_verification) || 0;
            const totalVerificationCount = pendingVerifications + approvedHandoversPendingVerification;
            const showVerificationBadge = item.href === '/verify-case-notes' && hasRole('CA') && totalVerificationCount > 0;

            // Debug logging for verification badge
            if (item.href === '/verify-case-notes' && hasRole('CA')) {
              console.log('🔍 Verify Case Notes badge debug:', {
                dashboardStats: dashboardStats,
                pending_verifications: dashboardStats?.pending_verifications,
                pending_verifications_type: typeof dashboardStats?.pending_verifications,
                approved_handovers_pending_verification: dashboardStats?.approved_handovers_pending_verification,
                pendingVerifications: pendingVerifications,
                approvedHandoversPendingVerification: approvedHandoversPendingVerification,
                totalVerificationCount: totalVerificationCount,
                showVerificationBadge: showVerificationBadge,
                hasRole_CA: hasRole('CA'),
                calculation: `${pendingVerifications} + ${approvedHandoversPendingVerification} = ${totalVerificationCount}`
              });
            }

            // Add dynamic badge for Handover Requests based on pending handover verifications
            const pendingHandoverVerifications = dashboardStats?.pending_handover_verifications || 0;
            const showHandoverBadge = item.href === '/handover-requests' && hasRole('CA') && pendingHandoverVerifications > 0;

            // Add dynamic badge for Return Case Notes based on rejected returns count
            const rejectedReturnsCount = dashboardStats?.rejected_returns_count || 0;
            const showRejectedReturnsBadge = item.href === '/return-case-notes' && hasRole('CA') && rejectedReturnsCount > 0;

            // Debug logging for rejected returns badge
            if (item.href === '/return-case-notes' && hasRole('CA')) {
              console.log('Return Case Notes badge debug:', {
                dashboardStats: dashboardStats,
                rejected_returns_count: dashboardStats?.rejected_returns_count,
                rejectedReturnsCount: rejectedReturnsCount,
                showRejectedReturnsBadge: showRejectedReturnsBadge,
                hasRole_CA: hasRole('CA')
              });
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                // Don't auto-close sidebar when clicking navigation items
                // User must explicitly click to minimize
                className={cn(
                  "group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out relative",
                  isActive
                    ? "bg-purple-50 text-purple-700 shadow-sm border border-purple-100"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-purple-600" : "text-gray-500 group-hover:text-gray-700"
                  )}
                />
                <span className="flex-1">{item.name}</span>

                {/* Notification badge for Verify Case Notes */}
                {showVerificationBadge && (
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="absolute -inset-1 h-4 w-4 bg-red-500 rounded-full opacity-30 animate-ping"></div>
                      <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white">
                        {totalVerificationCount}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Notification badge for Handover Requests */}
                {showHandoverBadge && (
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="absolute -inset-1 h-4 w-4 bg-red-500 rounded-full opacity-30 animate-ping"></div>
                    </div>
                    <Badge variant="destructive" className="ml-1 text-xs bg-red-500 text-white">
                      {pendingHandoverVerifications}
                    </Badge>
                  </div>
                )}

                {/* Notification badge for Return Case Notes (Rejected Returns) */}
                {showRejectedReturnsBadge && (
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="absolute -inset-1 h-4 w-4 bg-red-500 rounded-full opacity-30 animate-ping"></div>
                    </div>
                    <Badge variant="destructive" className="ml-1 text-xs bg-red-500 text-white">
                      {rejectedReturnsCount}
                    </Badge>
                  </div>
                )}

                {/* Regular badge for other items */}
                {item.badge && Number(item.badge) > 0 && !showVerificationBadge && !showHandoverBadge && !showRejectedReturnsBadge && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="border-t border-gray-100 p-6 bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-medium">
                {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {user?.roles.map((role, index) => (
              <Badge
                key={`${role}-${index}`}
                variant="outline"
                className="text-xs bg-white border-gray-200 text-gray-700"
              >
                {role === 'CA' ? 'Clinic Assistant' : role === 'MR_STAFF' ? 'MR Staff' : 'Administrator'}
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

      {/* Main content (dynamically adjusted based on sidebar state) */}
      <div className="flex flex-col min-h-screen transition-all duration-300 ease-in-out lg:ml-72">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
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
      <PasswordChangeDialog
        open={showPasswordChangeDialog}
        onOpenChange={setShowPasswordChangeDialog}
      />
    </div>
  );
}
