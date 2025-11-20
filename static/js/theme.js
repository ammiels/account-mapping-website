/**
 * Theme Management Module
 * Handles dark/light theme switching and persistence
 */

// Immediately apply saved theme to prevent flash of unstyled content
// This runs as soon as the script is loaded in the head
(function() {
  try {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    // Set on html element which is always available
    document.documentElement.className = 'theme-' + savedTheme;
  } catch (error) {
    console.warn('Failed to load theme preference:', error);
    document.documentElement.className = 'theme-dark';
  }
})();

// Theme toggle functionality - waits for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');
  
  if (!themeToggle) {
    return; // Exit if theme toggle doesn't exist on this page
  }
  
  /**
   * Update theme UI elements (icon and text)
   * @param {string} theme - 'light' or 'dark'
   */
  function updateThemeUI(theme) {
    if (!themeIcon || !themeText) return;
    
    if (theme === 'light') {
      themeIcon.className = 'fa-solid fa-sun';
      themeText.textContent = 'Dark Mode';
    } else {
      themeIcon.className = 'fa-solid fa-moon';
      themeText.textContent = 'Light Mode';
    }
  }
  
  /**
   * Apply theme and notify other components
   * @param {string} newTheme - 'light' or 'dark'
   */
  function setTheme(newTheme) {
    try {
      document.documentElement.className = 'theme-' + newTheme;
      localStorage.setItem('theme', newTheme);
      updateThemeUI(newTheme);
      
      // Dispatch custom event for other components to listen to
      document.documentElement.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme: newTheme }
      }));
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  }
  
  // Initialize UI based on current theme
  const currentTheme = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
  updateThemeUI(currentTheme);
  
  // Handle theme toggle clicks
  themeToggle.addEventListener('click', function() {
    const isLight = document.documentElement.classList.contains('theme-light');
    const newTheme = isLight ? 'dark' : 'light';
    setTheme(newTheme);
  });
  
  // Expose theme API for other modules
  window.ThemeManager = {
    getCurrentTheme: function() {
      return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
    },
    setTheme: setTheme
  };
});
