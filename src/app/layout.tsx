import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { SidebarProvider } from "@/components/providers/SidebarProvider";
import { AlertProvider } from "@/contexts/AlertContext";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PerformanceOptimizer from "@/components/performance/PerformanceOptimizer";
import NavigationMonitor from "@/components/performance/NavigationMonitor";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Monadeal - P2P NFT Trading Platform",
  description: "Trade NFTs peer-to-peer with secure escrow smart contracts on Monad",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.className} antialiased bg-background text-foreground`}>
        <PerformanceOptimizer />
        <NavigationMonitor />
        <ErrorBoundary showDetails={true}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <WalletProvider>
              <AlertProvider>
                <SocketProvider>
                  <SidebarProvider>
                    <AppContent>{children}</AppContent>
                  </SidebarProvider>
                </SocketProvider>
              </AlertProvider>
            </WalletProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

// Separate component for app content to ensure it's inside all providers
function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Animated Background */}
      <div className="fixed inset-0 animated-bg -z-10" />
      
      {/* App Layout */}
      <div className="min-h-screen flex">
        {/* Sidebar with Error Boundary */}
        <ErrorBoundary
          fallback={
            <div className="w-64 glass-nav border-r border-border/40 p-4">
              <div className="text-sm text-muted-foreground">
                Sidebar unavailable
              </div>
            </div>
          }
        >
          <Sidebar />
        </ErrorBoundary>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header with Error Boundary */}
          <ErrorBoundary
            fallback={
              <div className="glass-header border-b border-border/40 h-16 px-4 flex items-center">
                <div className="text-sm text-muted-foreground">
                  Header unavailable
                </div>
              </div>
            }
          >
            <Header />
          </ErrorBoundary>
          
          {/* Main Content with Error Boundary */}
          <ErrorBoundary showDetails={true}>
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
              <div className="max-w-7xl mx-auto w-full">
                {children}
              </div>
            </main>
          </ErrorBoundary>
        </div>
      </div>
    </>
  )
}
