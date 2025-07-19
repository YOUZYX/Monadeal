import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    // Enable webpack build caching for faster rebuilds
    webpackBuildWorker: true,
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  },

  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Faster refresh and compilation in development
    reactStrictMode: false, // Disable for faster dev builds (re-enable for production)
  }),
  
  // Image optimization
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/webp', 'image/avif'], // Modern formats for better compression
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.reservoir.tools',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.nad.domains',
        port: '',
        pathname: '/**',
      },
      // Common NFT metadata providers
      {
        protocol: 'https',
        hostname: 'metadata.ens.domains',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.ipfs.io',
        port: '',
        pathname: '/**',
      },
      // Arweave gateway
      {
        protocol: 'https',
        hostname: 'arweave.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Webpack optimizations for faster compilation
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Optimize webpack for development speed
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      }
      
      // Reduce the number of filesystem checks
      config.snapshot = {
        ...config.snapshot,
        managedPaths: [/^(.+?[\\/]node_modules[\\/])(?!(@next[\\/]polyfill-module))(.+)$/],
        buildDependencies: {
          hash: true,
          timestamp: false,
        },
      }
    }
    
    return config
  },
};

export default nextConfig;
