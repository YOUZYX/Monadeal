'use client'

import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Shield, MessageCircle, TrendingUp, Search, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { stats, loading, error } = usePlatformStats();

  return (
    <div className="w-full space-y-16 animate-fade-in">
      {/* Enhanced Hero Section */}
      <section className="relative text-center py-20 lg:py-28 content-section overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-monad-purple/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-3/4 left-1/2 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4">
          {/* Logo/Brand */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-monad-purple via-purple-500 to-blue-500 p-0.5 animate-glow">
                <div className="h-full w-full rounded-2xl bg-background flex items-center justify-center">
                  <span className="text-2xl font-bold monad-gradient-text">M</span>
                </div>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-monad-purple to-purple-500 rounded-2xl blur opacity-30 animate-pulse"></div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-scale-in">
            <span className="monad-gradient-text">Monadeal</span>
          </h1>
          
          {/* Tagline */}
          <p className="text-xl md:text-2xl lg:text-3xl text-foreground/80 mb-4 animate-slide-in-left font-medium">
            The Future of NFT Trading
          </p>
          
          {/* Value Proposition */}
          <p className="text-base lg:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto animate-slide-in-right leading-relaxed">
            Trade NFTs peer-to-peer with <span className="monad-gradient-text font-semibold">secure escrow smart contracts</span>, 
            real-time negotiations, and instant settlement on the lightning-fast Monad network.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-in-up">
            <Link href="/create">
              <Button className="btn-monad text-lg px-8 py-4 group relative overflow-hidden">
                <span className="relative z-10 flex items-center">
                  Start Trading
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              className="glass-card border-monad-purple/40 hover:border-monad-purple text-lg px-8 py-4 group"
            >
              <Search className="mr-2 h-5 w-5" />
              Browse Deals
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center animate-slide-in-up delay-100">
              <div className="h-14 w-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-monad-purple to-purple-400 flex items-center justify-center transform transition-transform hover:scale-110">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure Escrow</h3>
              <p className="text-muted-foreground text-sm">Smart contracts protect both parties</p>
            </div>
            
            <div className="text-center animate-slide-in-up delay-200">
              <div className="h-14 w-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-monad-purple to-purple-400 flex items-center justify-center transform transition-transform hover:scale-110">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Chat</h3>
              <p className="text-muted-foreground text-sm">Negotiate directly with traders</p>
            </div>
            
            <div className="text-center animate-slide-in-up delay-300">
              <div className="h-14 w-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-monad-purple to-purple-400 flex items-center justify-center transform transition-transform hover:scale-110">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Instant Settlement</h3>
              <p className="text-muted-foreground text-sm">Lightning-fast Monad execution</p>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="content-section px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Monadeal?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for the next generation of NFT trading with cutting-edge technology and user experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="glass-card rounded-xl p-8 text-center hover-lift card-hover group">
              <div className="h-16 w-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure Trading</h3>
              <p className="text-muted-foreground">Smart contract escrow ensures safe P2P transactions with automatic dispute resolution</p>
            </div>
            
            <div className="glass-card rounded-xl p-8 text-center hover-lift card-hover group">
              <div className="h-16 w-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-time Chat</h3>
              <p className="text-muted-foreground">Negotiate directly with other traders through encrypted messaging</p>
            </div>
            
            <div className="glass-card rounded-xl p-8 text-center hover-lift card-hover group">
              <div className="h-16 w-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Settlement</h3>
              <p className="text-muted-foreground">Automated transfers upon deal completion with sub-second finality</p>
            </div>
            
            <div className="glass-card rounded-xl p-8 text-center hover-lift card-hover group">
              <div className="h-16 w-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-orange-500 to-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Price Discovery</h3>
              <p className="text-muted-foreground">Fair market pricing through peer-to-peer negotiations</p>
            </div>
            
            <div className="glass-card rounded-xl p-8 text-center hover-lift card-hover group">
              <div className="h-16 w-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Trade any NFT</h3>
              <p className="text-muted-foreground">Trade any ERC-721 NFT with MON</p>
            </div>
            
            <div className="glass-card rounded-xl p-8 text-center hover-lift card-hover group">
              <div className="h-16 w-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-teal-500 to-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Advanced Search</h3>
              <p className="text-muted-foreground">Find exactly what you're looking for with powerful filtering options</p>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Stats Section with Real Data */}
      <section className="glass-card rounded-xl p-8 lg:p-12 content-section mx-4 max-w-6xl lg:mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-4">Platform Statistics</h2>
          <p className="text-muted-foreground">
            Live data from our growing ecosystem of NFT traders
            {stats && (
              <span className="block text-xs mt-2 opacity-60">
                Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* MON Volume */}
          <div className="glass-dark rounded-xl p-6 lg:p-8 text-center hover-lift group">
            {loading ? (
              <Skeleton className="h-12 w-full mb-3 bg-muted/20" />
            ) : error ? (
              <div className="text-3xl lg:text-4xl font-bold text-red-400 mb-3">
                Error
              </div>
            ) : (
              <div className="text-3xl lg:text-4xl font-bold monad-gradient-text mb-3 group-hover:scale-110 transition-transform">
                {stats?.volume.formatted.last24h || '0'}
              </div>
            )}
            <p className="text-sm lg:text-base text-muted-foreground">MON Volume</p>
            <p className="text-xs text-muted-foreground/60 mt-1">24h</p>
          </div>
          
          {/* Active Users */}
          <div className="glass-dark rounded-xl p-6 lg:p-8 text-center hover-lift group">
            {loading ? (
              <Skeleton className="h-12 w-full mb-3 bg-muted/20" />
            ) : error ? (
              <div className="text-3xl lg:text-4xl font-bold text-red-400 mb-3">
                Error
              </div>
            ) : (
              <div className="text-3xl lg:text-4xl font-bold monad-gradient-text mb-3 group-hover:scale-110 transition-transform">
                {stats?.users.formatted.activeWeek || '0'}
              </div>
            )}
            <p className="text-sm lg:text-base text-muted-foreground">Active Users</p>
            <p className="text-xs text-muted-foreground/60 mt-1">This week</p>
          </div>
          
          {/* Total Trades */}
          <div className="glass-dark rounded-xl p-6 lg:p-8 text-center hover-lift group">
            {loading ? (
              <Skeleton className="h-12 w-full mb-3 bg-muted/20" />
            ) : error ? (
              <div className="text-3xl lg:text-4xl font-bold text-red-400 mb-3">
                Error
              </div>
            ) : (
              <div className="text-3xl lg:text-4xl font-bold monad-gradient-text mb-3 group-hover:scale-110 transition-transform">
                {stats?.deals.formatted.completed || '0'}
              </div>
            )}
            <p className="text-sm lg:text-base text-muted-foreground">Total Trades</p>
            <p className="text-xs text-muted-foreground/60 mt-1">All time</p>
          </div>
          
          {/* Success Rate */}
          <div className="glass-dark rounded-xl p-6 lg:p-8 text-center hover-lift group">
            {loading ? (
              <Skeleton className="h-12 w-full mb-3 bg-muted/20" />
            ) : error ? (
              <div className="text-3xl lg:text-4xl font-bold text-red-400 mb-3">
                Error
              </div>
            ) : (
              <div className="text-3xl lg:text-4xl font-bold monad-gradient-text mb-3 group-hover:scale-110 transition-transform">
                {stats?.successRate.formatted || '0%'}
              </div>
            )}
            <p className="text-sm lg:text-base text-muted-foreground">Success Rate</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Last 30 days</p>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center mt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading live statistics...</span>
            </div>
          </div>
        )}
      </section>

      {/* Enhanced CTA Section 
      <section className="glass-card rounded-xl p-8 lg:p-12 content-section mx-4 max-w-4xl lg:mx-auto">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6 monad-gradient-text">Ready to Start Trading?</h2>
          <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
            Join thousands of traders already using Monadeal to discover, negotiate, and trade NFTs securely on Monad.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button className="btn-monad text-lg px-8 py-4 group">
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Deal
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/deals">
            <Button variant="outline" className="glass-card border-monad-purple/30 hover:border-monad-purple text-lg px-8 py-4">
              <Search className="mr-2 h-5 w-5" />
              Explore Deals
            </Button>
            </Link>
          </div>
        </div>
      </section>*/}
    </div>
  );
}
