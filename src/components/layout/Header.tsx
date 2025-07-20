'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from "./ThemeToggle";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/providers/SidebarProvider';
import NotificationIndicator from '@/components/common/NotificationIndicator';
import WalletAwareComponent from '@/components/providers/WalletAwareComponent';
import WalletErrorBoundary from '@/components/providers/WalletErrorBoundary';
import { 
  Search, 
  Plus, 
  Bell,
  Sparkles,
  MessageSquareMore,
  TrendingUp,
  Menu,
  X,
  PanelLeft,
  PanelLeftClose,
  User
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const { isOpen, toggle } = useSidebar();

  const navigation = [
    {
      name: 'Deals',
      href: '/deals',
      icon: MessageSquareMore,
    },
    {
      name: 'Create',
      href: '/create',
      icon: Plus,
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
    },
    /*{
      name: 'Recover',
      href: '/recover',
      icon: Sparkles,
    },
    {
      name: 'Debug',
      href: '/debug-deal',
      icon: TrendingUp,
    },
    {
      name: 'About',
      href: '/about',
      icon: TrendingUp,
    },*/
  ];

  // Handle desktop search
  const handleDesktopSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(''); // Clear search after navigation
    }
  };

  // Handle mobile search
  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(mobileSearchQuery.trim())}`);
      setMobileSearchQuery(''); // Clear search after navigation
    }
  };

  // Handle search input key press
  const handleSearchKeyPress = (e: React.KeyboardEvent, isMobile: boolean = false) => {
    if (e.key === 'Enter') {
      if (isMobile) {
        handleMobileSearch(e as any);
      } else {
        handleDesktopSearch(e as any);
      }
    }
  };

  return (
    <header className="glass-header sticky top-0 z-50 w-full border-b border-border/40 shadow-lg shadow-monad-purple/10 animate-fade-in">
      {/* Main Header Container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Left Section: Sidebar Toggle & Logo */}
          <div className="flex items-center space-x-3">
            {/* Sidebar Toggle Button */}
            <Button
              variant="ghost"
              size="sm"
              className="glass-card hover:monad-glow-hover p-2 hidden lg:flex"
              onClick={toggle}
            >
              {isOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeft className="h-5 w-5" />
              )}
            </Button>
            
            {/* Mobile Sidebar Toggle
            <Button
              variant="ghost"
              size="sm"
              className="glass-card hover:monad-glow-hover p-2 lg:hidden"
              onClick={toggle}
            >
              <Menu className="h-5 w-5" />
            </Button> */}

            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 hover-lift">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-monad-purple to-purple-400 animate-glow">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold monad-gradient-text">
                Monadeal
              </span>
            </Link>
          </div>

          {/* Center Section: Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 hover-lift",
                    isActive
                      ? "glass-card monad-glow-hover text-white"
                      : "text-muted-foreground hover:text-foreground hover:glass-dark"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="h-1.5 w-1.5 rounded-full bg-monad-purple animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Actions */}
          <div className="flex items-center space-x-5">
            
            {/* Search Bar (Desktop) */}
            <form onSubmit={handleDesktopSearch} className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search NFTs by address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => handleSearchKeyPress(e)}
                className="glass-card border-0 pl-10 pr-4 py-2 w-64 placeholder:text-muted-foreground focus:monad-glow transition-all duration-200"
                title="Enter contract address (0x...) or wallet address (0x...)"
              />
            </form>

            {/* Create Deal Button (Desktop)
            <Button
              size="sm"
              className="btn-monad hidden lg:flex items-center space-x-2"
              asChild
            >
              <Link href="/create">
                <Plus className="h-4 w-4" />
                <span>Create</span>
              </Link>
            </Button>*/}

            {/* Notifications */}
            <WalletErrorBoundary>
              <WalletAwareComponent
                fallback={
                  <div className="glass-card rounded-lg p-2 w-10 h-10 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </div>
                }
              >
                <NotificationIndicator />
              </WalletAwareComponent>
            </WalletErrorBoundary>

            {/* Wallet Connection */}
            <WalletErrorBoundary>
              <WalletAwareComponent
                fallback={
                  <div className="glass-card rounded-lg px-3 py-2">
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                }
              >
                <div className="glass-card rounded-lg p-1 hover:monad-glow-hover transition-all duration-200">
                  <ConnectButton
                    showBalance={{
                      smallScreen: false,
                      largeScreen: true,
                    }}
                  />
                </div>
              </WalletAwareComponent>
            </WalletErrorBoundary>

            {/* Theme Toggle */}
            <div className="glass-card rounded-lg p-1 hover:monad-glow-hover transition-all duration-200">
              <ThemeToggle />
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="glass-card lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="border-t border-border/40 p-4 lg:hidden">
        <form onSubmit={handleMobileSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search NFTs by address..."
            value={mobileSearchQuery}
            onChange={(e) => setMobileSearchQuery(e.target.value)}
            onKeyPress={(e) => handleSearchKeyPress(e, true)}
            className="glass-card border-0 pl-10 placeholder:text-muted-foreground focus:monad-glow transition-all duration-200"
            title="Enter contract address (0x...) or wallet address (0x...)"
          />
        </form>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="glass-card border-t border-border/40 lg:hidden animate-fade-in">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 hover-lift",
                    isActive
                      ? "glass-card text-monad-purple monad-glow-hover"
                      : "text-muted-foreground hover:text-foreground hover:glass-dark"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-monad-purple animate-pulse" />
                  )}
                </Link>
              );
            })}
            
            {/* Mobile Create Button */}
            <Link
              href="/create"
              className="flex items-center space-x-3 rounded-xl px-4 py-3 text-base font-medium btn-monad"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Plus className="h-5 w-5" />
              <span>Create Deal</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 