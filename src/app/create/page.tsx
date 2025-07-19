'use client'

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DealCreationForm from '@/components/deal/DealCreationForm';
import Link from 'next/link';

export default function CreatePage() {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleDealCreated = () => {
    setShowSuccess(true);
    // Could redirect to deals page or show success state
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="h-4 w-px bg-border"></div>
            <h1 className="text-xl font-semibold">Create New Deal</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {showSuccess ? (
          // Success State
          <div className="text-center py-16">
            <div className="glass-card rounded-2xl p-12 max-w-md mx-auto">
              <div className="h-16 w-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 monad-gradient-text">Deal Created!</h2>
              <p className="text-muted-foreground mb-6">
                Your deal has been created successfully. You can now share it with potential traders.
              </p>
              <div className="space-y-3">
                <Link href="/deals">
                  <Button className="btn-monad w-full">
                    View My Deals
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="glass-card border-monad-purple/40 hover:border-monad-purple w-full"
                  onClick={() => setShowSuccess(false)}
                >
                  Create Another Deal
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Deal Creation Form
          <div className="space-y-8">
            {/* Page Header */}
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">
                <span className="monad-gradient-text">Create Your Deal</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Set up a new NFT trade proposal with secure escrow smart contracts. 
                Choose your deal type, select NFTs, and start negotiating.
              </p>
            </div>

            {/* Deal Creation Form */}
            <div className="max-w-2xl mx-auto">
              <DealCreationForm 
                onClose={() => window.history.back()}
                onSuccess={handleDealCreated}
              />
            </div>

            {/* Help Section */}
            <div className="glass-card rounded-xl p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-4">How it works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="h-8 w-8 mx-auto mb-2 rounded-lg bg-monad-purple/20 flex items-center justify-center">
                    <span className="text-monad-purple font-bold">1</span>
                  </div>
                  <p className="font-medium">Choose Deal Type</p>
                  <p className="text-muted-foreground">Buy, sell, or swap NFTs</p>
                </div>
                <div className="text-center">
                  <div className="h-8 w-8 mx-auto mb-2 rounded-lg bg-monad-purple/20 flex items-center justify-center">
                    <span className="text-monad-purple font-bold">2</span>
                  </div>
                  <p className="font-medium">Select NFT & Set Price</p>
                  <p className="text-muted-foreground">Pick assets and terms</p>
                </div>
                <div className="text-center">
                  <div className="h-8 w-8 mx-auto mb-2 rounded-lg bg-monad-purple/20 flex items-center justify-center">
                    <span className="text-monad-purple font-bold">3</span>
                  </div>
                  <p className="font-medium">Share & Negotiate</p>
                  <p className="text-muted-foreground">Chat with potential traders</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 