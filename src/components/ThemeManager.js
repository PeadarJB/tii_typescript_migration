/**
 * Theme Manager Module
 * Handles light/dark theme switching with localStorage persistence
 * and system preference detection
 */

class ThemeManager {
  constructor(options = {}) {
    this.options = {
      attribute: 'data-theme',
      storageKey: 'app-theme',
      defaultTheme: 'light',
      themes: ['light', 'dark'],
      autoDetectSystemTheme: true,
      ...options
    };

    this.currentTheme = null;
    this.systemTheme = null;
    this.callbacks = [];

    this.init();
  }

  /**
   * Initialize the theme manager
   */
  init() {
    this.detectSystemTheme();
    this.loadSavedTheme();
    this.applyTheme();
    this.setupSystemThemeListener();
  }

  /**
   * Detect the user's system theme preference
   */
  detectSystemTheme() {
    if (window.matchMedia && this.options.autoDetectSystemTheme) {
      this.systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  }

  /**
   * Load theme from localStorage or use system/default theme
   */
  loadSavedTheme() {
    const savedTheme = localStorage.getItem(this.options.storageKey);
    
    if (savedTheme && this.options.themes.includes(savedTheme)) {
      this.currentTheme = savedTheme;
    } else if (this.systemTheme && this.options.autoDetectSystemTheme) {
      this.currentTheme = this.systemTheme;
    } else {
      this.currentTheme = this.options.defaultTheme;
    }
  }

  /**
   * Apply the current theme to the document
   */
  applyTheme() {
    document.documentElement.setAttribute(this.options.attribute, this.currentTheme);
    
    // Add theme class to body for additional styling options
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${this.currentTheme}`);
    
    // Trigger callbacks
    this.callbacks.forEach(callback => callback(this.currentTheme));
  }

  /**
   * Toggle between light and dark themes
   */
  toggle() {
    const currentIndex = this.options.themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % this.options.themes.length;
    this.setTheme(this.options.themes[nextIndex]);
  }

  /**
   * Set a specific theme
   * @param {string} theme - The theme to set
   */
  setTheme(theme) {
    if (!this.options.themes.includes(theme)) {
      console.warn(`Theme "${theme}" is not supported. Available themes: ${this.options.themes.join(', ')}`);
      return;
    }

    this.currentTheme = theme;
    localStorage.setItem(this.options.storageKey, theme);
    this.applyTheme();
  }

  /**
   * Get the current theme
   * @returns {string} The current theme
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get the system theme preference
   * @returns {string|null} The system theme or null if not detectable
   */
  getSystemTheme() {
    return this.systemTheme;
  }

  /**
   * Check if the current theme is dark
   * @returns {boolean} True if current theme is dark
   */
  isDark() {
    return this.currentTheme === 'dark';
  }

  /**
   * Check if the current theme is light
   * @returns {boolean} True if current theme is light
   */
  isLight() {
    return this.currentTheme === 'light';
  }

  /**
   * Add a callback function to be called when theme changes
   * @param {Function} callback - Function to call on theme change
   */
  onChange(callback) {
    if (typeof callback === 'function') {
      this.callbacks.push(callback);
    }
  }

  /**
   * Remove a callback function
   * @param {Function} callback - Function to remove
   */
  removeCallback(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Listen for system theme changes and auto-update if no manual preference is set
   */
  setupSystemThemeListener() {
    if (window.matchMedia && this.options.autoDetectSystemTheme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      mediaQuery.addEventListener('change', (e) => {
        this.systemTheme = e.matches ? 'dark' : 'light';
        
        // Only auto-update if user hasn't manually set a preference
        const savedTheme = localStorage.getItem(this.options.storageKey);
        if (!savedTheme) {
          this.currentTheme = this.systemTheme;
          this.applyTheme();
        }
      });
    }
  }

  /**
   * Reset theme to system preference or default
   */
  reset() {
    localStorage.removeItem(this.options.storageKey);
    this.loadSavedTheme();
    this.applyTheme();
  }

  /**
   * Create and insert a theme toggle button into the DOM
   * @param {Object} options - Button configuration options
   */
  createToggleButton(options = {}) {
    const config = {
      container: document.body,
      className: 'theme-toggle',
      innerHTML: '🌓',
      ariaLabel: 'Toggle theme',
      title: 'Switch between light and dark themes',
      ...options
    };

    const button = document.createElement('button');
    button.className = config.className;
    button.innerHTML = config.innerHTML;
    button.setAttribute('aria-label', config.ariaLabel);
    button.setAttribute('title', config.title);
    
    button.addEventListener('click', () => this.toggle());
    
    // Update button content based on current theme
    const updateButton = (theme) => {
      if (config.innerHTML === '🌓') {
        button.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      }
      button.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    };
    
    this.onChange(updateButton);
    updateButton(this.currentTheme); // Initial update
    
    config.container.appendChild(button);
    return button;
  }
}

// Create a default instance
const themeManager = new ThemeManager();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS
  module.exports = { ThemeManager, themeManager };
} else if (typeof define === 'function' && define.amd) {
  // AMD
  define(() => ({ ThemeManager, themeManager }));
} else {
  // Global
  window.ThemeManager = ThemeManager;
  window.themeManager = themeManager;
}

// Auto-create toggle button if data attribute is present
document.addEventListener('DOMContentLoaded', () => {
  const autoCreate = document.querySelector('[data-theme-toggle="auto"]');
  if (autoCreate) {
    themeManager.createToggleButton({
      container: autoCreate.parentNode,
    });
  }
});