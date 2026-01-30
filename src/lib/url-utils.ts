/**
 * Utility functions for URL validation and handling
 */

/**
 * Validates if a string is a valid URL
 * @param string - The string to validate
 * @returns boolean - True if valid URL, false otherwise
 */
export const isValidUrl = (string: string): boolean => {
  if (!string || typeof string !== 'string') {
    return false;
  }
  
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Validates if a URL is safe for use with Next.js Image component
 * @param url - The URL to validate
 * @returns boolean - True if safe for Image component, false otherwise
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!isValidUrl(url)) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    // Check if it's a data URL or a valid HTTP/HTTPS URL
    return urlObj.protocol === 'http:' || 
           urlObj.protocol === 'https:' || 
           urlObj.protocol === 'data:';
  } catch (_) {
    return false;
  }
};

/**
 * Safely handles image URL errors for Next.js Image component
 * @param url - The URL that failed to load
 * @param element - The image element that failed
 */
export const handleImageError = (url: string, element: HTMLImageElement): void => {
  console.warn('⚠️ [IMAGE] Error loading image:', url);
  
  // Hide the broken image element
  if (element) {
    element.style.display = 'none';
  }
  
  // Log additional debug info for Supabase URLs
  if (url?.includes('supabase.co')) {
    console.warn('⚠️ [IMAGE] Supabase image failed - this might be due to expired token or network issues');
  }
};