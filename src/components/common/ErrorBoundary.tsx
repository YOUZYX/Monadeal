'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-8 animate-fade-in">
          <div className="max-w-lg w-full glass-card rounded-xl p-6 text-center space-y-4">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center animate-pulse">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold monad-gradient-text">
                Component Error
              </h3>
              <p className="text-sm text-muted-foreground">
                Something went wrong in this section. Please try refreshing.
              </p>
            </div>

            {/* Error Details (Development only) */}
            {this.props.showDetails && process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="glass-dark rounded-lg p-3 text-left">
                <div className="flex items-center space-x-2 mb-2">
                  <Bug className="h-3 w-3 text-red-400" />
                  <span className="text-xs font-medium text-red-400">Error Details:</span>
                </div>
                <code className="text-xs text-muted-foreground break-all block">
                  {this.state.error.message}
                </code>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Stack trace
                    </summary>
                    <pre className="text-xs text-muted-foreground mt-1 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2">
              <Button
                onClick={this.handleReset}
                size="sm"
                className="btn-monad"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error reporting
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Manual error report:', error, errorInfo);
    
    // Here you could send to an error reporting service
    // like Sentry, LogRocket, etc.
  };
}

export default ErrorBoundary; 