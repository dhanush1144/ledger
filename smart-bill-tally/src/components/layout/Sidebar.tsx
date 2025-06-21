
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  BarChart3, 
  BookOpen, 
  Upload, 
  Users, 
  Settings,
  LogOut,
  Home,
  CreditCard
} from 'lucide-react';

const userNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/upload', label: 'Upload Bills', icon: Upload },
  { href: '/upload-statement', label: 'Bank Statements', icon: CreditCard },
  { href: '/ledgers', label: 'Ledgers', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const adminNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/upload', label: 'Upload Bills', icon: Upload },
  { href: '/upload-statement', label: 'Bank Statements', icon: CreditCard },
  { href: '/ledgers', label: 'Ledgers', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin', label: 'Admin Panel', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar = () => {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  
  // Use profile role if available, otherwise default to user
  const userRole = profile?.role || 'user';
  const navItems = userRole === 'admin' ? adminNavItems : userNavItems;

  const displayName = profile?.full_name || user?.email || 'User';
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">InvoiceAI</h1>
            <p className="text-xs text-gray-500">Ledger Management</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {userInitial}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <Button
          onClick={logout}
          variant="outline"
          className="w-full justify-start"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
