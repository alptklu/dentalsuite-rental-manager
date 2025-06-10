import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export function MainNav() {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  
  const navItems = [
    { label: 'Dashboard', path: '/', minRole: 'viewer' },
    { label: 'Apartments', path: '/apartments', minRole: 'manager' },
    { label: 'Bookings', path: '/bookings', minRole: 'manager' },
    { label: 'Assign', path: '/assign', minRole: 'viewer' },
  ];

  if (!user) return null;
  
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {navItems
        .filter(item => hasPermission(item.minRole as 'admin' | 'manager' | 'viewer'))
        .map((item) => (
          <Button
            key={item.path}
            asChild
            variant={location.pathname === item.path ? 'default' : 'ghost'}
            className={cn(
              'transition-colors',
              location.pathname === item.path
                ? ''
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            <Link to={item.path}>{item.label}</Link>
          </Button>
        ))}
      
      {hasPermission('admin') && (
        <Button
          asChild
          variant={location.pathname === '/admin' ? 'default' : 'ghost'}
          className={cn(
            'transition-colors',
            location.pathname === '/admin'
              ? ''
              : 'text-muted-foreground hover:text-primary'
          )}
        >
          <Link to="/admin">
            <Shield className="mr-2 h-4 w-4" />
            Admin
          </Link>
        </Button>
      )}
    </nav>
  );
}
