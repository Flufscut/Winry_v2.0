/**
 * FILE: usePreferences.ts
 * PURPOSE: Global preferences management hook for real-time theme and UI updates
 * DEPENDENCIES: React hooks for state management
 * LAST_UPDATED: Current date
 * 
 * REF: Provides centralized preferences management across the entire application
 * REF: Handles theme switching, compact mode, animations, and other UI preferences
 * TODO: Add preferences sync across browser tabs
 */

import { useState, useEffect, useCallback } from 'react';

interface PreferencesData {
  // Notification preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  weeklyReports: boolean;
  
  // Appearance preferences
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  animationsEnabled: boolean;
  fontSize: number;
  
  // Data & Privacy preferences
  dataRetention: number; // days
  analyticsSharing: boolean;
  crashReporting: boolean;
  
  // System preferences
  autoSave: boolean;
  batchSize: number;
  timeZone: string;
  language: string;
  
  // Performance preferences
  cacheEnabled: boolean;
  backgroundSync: boolean;
}

const defaultPreferences: PreferencesData = {
  // Notification preferences
  emailNotifications: true,
  pushNotifications: true,
  marketingEmails: false,
  weeklyReports: true,
  
  // Appearance preferences
  theme: 'dark',
  compactMode: false,
  animationsEnabled: true,
  fontSize: 14,
  
  // Data & Privacy preferences
  dataRetention: 90,
  analyticsSharing: false,
  crashReporting: true,
  
  // System preferences
  autoSave: true,
  batchSize: 10,
  timeZone: 'UTC',
  language: 'en',
  
  // Performance preferences
  cacheEnabled: true,
  backgroundSync: true,
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<PreferencesData>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // Function to apply visual preferences to the DOM
  const applyVisualPreferences = useCallback((prefs: PreferencesData) => {
    // Apply theme
    if (prefs.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else if (prefs.theme === 'dark') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      // System theme
      document.documentElement.classList.remove('light', 'dark');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.add('light');
      }
    }
    
    // Apply font size (constrained for UI stability)
    const baseFontSize = Math.max(12, Math.min(18, prefs.fontSize));
    document.documentElement.style.fontSize = `${baseFontSize}px`;
    
    // Apply compact mode
    if (prefs.compactMode) {
      document.documentElement.classList.add('compact-mode');
    } else {
      document.documentElement.classList.remove('compact-mode');
    }
    
    // Apply animation preferences
    if (!prefs.animationsEnabled) {
      document.documentElement.classList.add('no-animations');
      const styleId = 'disable-animations';
      let styleElement = document.getElementById(styleId);
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
    } else {
      document.documentElement.classList.remove('no-animations');
      const styleElement = document.getElementById('disable-animations');
      if (styleElement) {
        styleElement.remove();
      }
    }
  }, []);

  // Load preferences from API
  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/preferences');
      if (response.ok) {
        const loadedPreferences = await response.json();
        setPreferences(loadedPreferences);
        applyVisualPreferences(loadedPreferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      // Apply default preferences on error
      applyVisualPreferences(defaultPreferences);
    } finally {
      setIsLoading(false);
    }
  }, [applyVisualPreferences]);

  // Save preferences to API
  const savePreferences = useCallback(async (newPreferences: PreferencesData) => {
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });

      if (response.ok) {
        setPreferences(newPreferences);
        applyVisualPreferences(newPreferences);
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message || 'Failed to save preferences' };
      }
    } catch (error) {
      return { success: false, error: 'Network error while saving preferences' };
    }
  }, [applyVisualPreferences]);

  // Update a single preference
  const updatePreference = useCallback(<K extends keyof PreferencesData>(
    key: K, 
    value: PreferencesData[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    applyVisualPreferences(newPreferences);
  }, [preferences, applyVisualPreferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    setPreferences,
    updatePreference,
    savePreferences,
    loadPreferences,
    isLoading,
    defaultPreferences,
  };
} 