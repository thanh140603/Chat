// Theme Utilities - Helper functions for theme-aware classes
export const themeClass = (darkClass: string, lightClass: string) => {
  return `${darkClass} dark:${darkClass} ${lightClass}`;
};

// Common theme-aware background classes
export const bgTheme = {
  primary: 'bg-dark-900 dark:bg-dark-900 bg-gray-50',
  secondary: 'bg-dark-800 dark:bg-dark-800 bg-white',
  tertiary: 'bg-dark-700 dark:bg-dark-700 bg-gray-100',
  hover: 'hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-200',
};

// Common theme-aware text classes
export const textTheme = {
  primary: 'text-white dark:text-white text-gray-900',
  secondary: 'text-dark-400 dark:text-dark-400 text-gray-600',
  muted: 'text-dark-500 dark:text-dark-500 text-gray-500',
};

// Common theme-aware border classes
export const borderTheme = {
  default: 'border-dark-700 dark:border-dark-700 border-gray-200',
  light: 'border-dark-600 dark:border-dark-600 border-gray-300',
};

