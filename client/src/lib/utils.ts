import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * REF: Map Reply.io campaign status numbers to human-readable text
 * PURPOSE: Convert numeric status codes from Reply.io API to display labels
 * @param {string | number} status - Reply.io campaign status (0, 2, 4 or string)
 * @returns {string} - Human-readable status text
 */
export function formatCampaignStatus(status: string | number): string {
  // Convert to string for consistent comparison
  const statusStr = String(status);
  
  switch (statusStr) {
    case '0':
      return 'New';
    case '2':
      return 'Active';
    case '4':
      return 'Paused';
    default:
      // Fallback for already converted string statuses or unknown values
      if (statusStr.toLowerCase() === 'active') return 'Active';
      if (statusStr.toLowerCase() === 'paused') return 'Paused';
      if (statusStr.toLowerCase() === 'new') return 'New';
      return statusStr; // Return as-is if unrecognized
  }
}
