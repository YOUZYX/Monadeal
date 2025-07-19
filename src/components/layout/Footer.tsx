import React from 'react';
import Link from 'next/link';
import { Sparkles, Github, Twitter, MessageCircle } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="glass-header border-t border-border/40 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-monad-purple to-purple-400">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold monad-gradient-text">Monadeal</span>
            </div>
            <p className="text-muted-foreground max-w-md leading-relaxed">
              The future of P2P NFT trading. Secure, decentralized, and built for the Monad ecosystem.
            </p>
            <div className="flex items-center space-x-4 mt-6">
              <a 
                href="https://github.com" 
                className="text-muted-foreground hover:text-monad-purple transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" />
              </a>
              <a 
                href="https://twitter.com" 
                className="text-muted-foreground hover:text-monad-purple transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="https://discord.com" 
                className="text-muted-foreground hover:text-monad-purple transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Platform</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/deals" className="text-muted-foreground hover:text-monad-purple transition-colors">
                  Browse Deals
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-muted-foreground hover:text-monad-purple transition-colors">
                  Create Deal
                </Link>
              </li>
              <li>
                <Link href="/collections" className="text-muted-foreground hover:text-monad-purple transition-colors">
                  Collections
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="text-muted-foreground hover:text-monad-purple transition-colors">
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/docs" className="text-muted-foreground hover:text-monad-purple transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-monad-purple transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-monad-purple transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-muted-foreground hover:text-monad-purple transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 mt-8 border-t border-border/40">
          <p className="text-sm text-muted-foreground">
            © 2024 Monadeal. Built by{' '}
            <span className="monad-gradient-text font-medium">Monadeal Team</span>.
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-monad-purple transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-monad-purple transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 