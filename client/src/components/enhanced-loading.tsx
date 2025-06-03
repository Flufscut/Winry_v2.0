/**
 * FILE: enhanced-loading.tsx
 * PURPOSE: Enhanced loading components with beautiful animations and skeleton states
 * DEPENDENCIES: framer-motion, lucide-react
 * LAST_UPDATED: Current date
 * 
 * REF: Advanced loading states for analytics dashboard and data visualization
 * TODO: Add more loading animation variants, customize for different content types
 * 
 * MAIN_FUNCTIONS:
 * - SkeletonCard: Animated skeleton placeholder for cards
 * - ChartSkeleton: Skeleton for chart components
 * - AnalyticsLoading: Loading state for analytics dashboard
 * - PulseLoader: Simple pulse animation loader
 * - SpinnerLoader: Rotating spinner with glow effect
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Target, TrendingUp } from 'lucide-react';

// Skeleton Card Component
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    </div>
  );
};

// Chart Skeleton Component
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
        <div 
          className="bg-gray-100 dark:bg-gray-700 rounded-lg flex items-end justify-center gap-2 p-4"
          style={{ height: `${height}px` }}
        >
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-gray-200 dark:bg-gray-600 rounded-t"
              style={{ 
                width: '20px',
                height: `${Math.random() * 60 + 40}%`
              }}
              animate={{
                scaleY: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Analytics Dashboard Loading
export const AnalyticsLoading: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <SkeletonCard />
          </motion.div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ChartSkeleton />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ChartSkeleton height={250} />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2"
        >
          <ChartSkeleton />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="animate-pulse">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Pulse Loader
export const PulseLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center">
      <motion.div
        className={`${sizeClasses[size]} bg-blue-500 rounded-full`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

// Spinner Loader with Glow Effect
export const SpinnerLoader: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'purple' | 'orange';
  text?: string;
}> = ({ 
  size = 'md', 
  color = 'blue',
  text 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    purple: 'border-purple-500',
    orange: 'border-orange-500'
  };

  const colorMap = {
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#8b5cf6',
    orange: '#f59e0b'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <motion.div
          className={`${sizeClasses[size]} border-4 border-gray-200 dark:border-gray-700 rounded-full`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <div 
            className={`absolute inset-0 border-4 ${colorClasses[color]} border-t-transparent rounded-full`}
            style={{
              background: `conic-gradient(from 0deg, transparent, ${colorMap[color]})`
            }}
          />
        </motion.div>
        
        {/* Glow effect */}
        <motion.div
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full`}
          animate={{
            boxShadow: [
              `0 0 0 0 ${colorMap[color].replace('#', 'rgba(').replace(/(..)(..)(..)/, '$1, $2, $3').replace(')', ', 0.4)')}`,
              `0 0 20px 5px ${colorMap[color].replace('#', 'rgba(').replace(/(..)(..)(..)/, '$1, $2, $3').replace(')', ', 0.1)')}`,
              `0 0 0 0 ${colorMap[color].replace('#', 'rgba(').replace(/(..)(..)(..)/, '$1, $2, $3').replace(')', ', 0.4)')}`
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      
      {text && (
        <motion.p
          className="text-sm font-medium text-gray-600 dark:text-gray-400"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

// Brain Processing Loader
export const BrainLoader: React.FC<{ text?: string }> = ({ text = "Processing..." }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative">
        {/* Main brain icon */}
        <motion.div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Brain className="w-8 h-8 text-white" />
        </motion.div>
        
        {/* Pulse rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 w-16 h-16 rounded-2xl border-2 border-purple-400"
            animate={{
              scale: [1, 2, 1],
              opacity: [0.8, 0, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
            }}
          />
        ))}
        
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-purple-400 rounded-full"
            style={{
              top: `${Math.random() * 60}px`,
              left: `${Math.random() * 60}px`,
            }}
            animate={{
              y: [-10, -30, -10],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>
      
      <div className="text-center space-y-2">
        <motion.h3
          className="text-lg font-semibold text-gray-800 dark:text-gray-200"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          AI Analysis in Progress
        </motion.h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
        
        {/* Progress dots */}
        <div className="flex justify-center space-x-1 pt-2">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-purple-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Success Animation
export const SuccessAnimation: React.FC<{ text?: string }> = ({ text = "Complete!" }) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center space-y-4 p-8"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <motion.div
        className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 360],
        }}
        transition={{
          scale: { duration: 0.5, repeat: 1, repeatType: "reverse" },
          rotate: { duration: 0.8, ease: "easeInOut" },
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      </motion.div>
      
      <motion.p
        className="text-lg font-semibold text-green-600 dark:text-green-400"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {text}
      </motion.p>
    </motion.div>
  );
};

export default {
  SkeletonCard,
  ChartSkeleton,
  AnalyticsLoading,
  PulseLoader,
  SpinnerLoader,
  BrainLoader,
  SuccessAnimation
}; 