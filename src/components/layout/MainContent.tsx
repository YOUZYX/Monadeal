'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/providers/SidebarProvider';

interface MainContentProps {
  children: React.ReactNode;
}

const MainContent: React.FC<MainContentProps> = ({ children }) => {
  const { isOpen } = useSidebar();

  return (
    <main className={cn(
      "flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 transition-all duration-300 ease-in-out",
      isOpen ? "lg:ml-64" : "lg:ml-0"
    )}>
      <div className="max-w-7xl mx-auto w-full">
        {children}
      </div>
    </main>
  );
};

export default MainContent; 