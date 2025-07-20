'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/providers/SidebarProvider';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Bell, 
  User, 
  TrendingUp,
  Sparkles,
  X,
  Github,
  Twitter
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'My Deals',
    href: '/deals',
    icon: MessageSquare,
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
];

const Sidebar = () => {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 glass-nav transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:sticky lg:top-0 lg:h-screen",
        isOpen ? "translate-x-0" : "-translate-x-full lg:hidden"
      )}>
        <div className="flex h-full flex-col p-6 lg:sticky lg:top-0">
          {/* Close button for mobile */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-monad-purple to-purple-400 animate-glow">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold monad-gradient-text">Monadeal</h1>
                <p className="text-xs text-muted-foreground">P2P NFT Trading</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="glass-card hover:monad-glow-hover"
              onClick={close}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Logo Section for desktop - Now sticky */}
          <div className="mb-8 flex items-center space-x-3 hidden lg:flex sticky top-0 py-4 -mx-6 px-6 z-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-monad-purple to-purple-400 animate-glow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold monad-gradient-text">Monadeal</h1>
              <p className="text-xs text-muted-foreground">P2P NFT Trading</p>
            </div>
          </div>

          {/* Navigation - Scrollable content area */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <nav className="space-y-2 pb-6">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover-lift",
                      isActive
                        ? "glass-card monad-glow text-white"
                        : "text-muted-foreground hover:text-foreground hover:glass-dark"
                    )}
                    onClick={() => {
                      // Close sidebar on mobile when clicking a link
                      if (window.innerWidth < 1024) {
                        close();
                      }
                    }}
                  >
                    <Icon 
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? "text-monad-purple" : "text-muted-foreground"
                      )} 
                    />
                    <span>{item.name}</span>
                    {isActive && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-monad-purple animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Section - Also sticky */}
          <div className="mt-8 text-center sticky bottom-0 py-4 -mx-6 px-6">
            <p className="text-xs text-muted-foreground mb-3">
              Built By{' '}
              <span className="monad-gradient-text font-medium">YOUZY</span>
            </p>
            
            {/* Social Links */}
            <div className="flex items-center justify-center space-x-3">
              {/* Twitter (X) Link */}
              <a
                href="https://x.com/YOUZYPOOR"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 rounded-lg glass-card hover:monad-glow-hover transition-all duration-200 hover-lift"
                title="Follow on Twitter"
              >
                <Twitter className="h-4 w-4 text-muted-foreground hover:text-purple-400 transition-colors" />
              </a>
              
              {/* GitHub Link */}
              <a
                href="https://github.com/YOUZYX/Monadeal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 rounded-lg glass-card hover:monad-glow-hover transition-all duration-200 hover-lift"
                title="Monadeal is Open Source On GitHub"
              >
                <Github className="h-4 w-4 text-muted-foreground hover:text-purple-400 transition-colors" />
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}
    </>
  );
};

export default Sidebar; 