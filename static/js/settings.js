// Settings Management
const SETTINGS_KEY = 'appSettings';

const defaultSettings = {
  defaultPlatform: 'all',
  jobsPerPage: 50,
  autoGenerateSummary: true,
  exportFormat: 'csv',
  includeChartsInExport: true,
  includeAISummary: false,
  cacheDuration: 24
};

// Load settings from localStorage
function loadSettings() {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    try {
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch (e) {
      console.error('Failed to parse settings:', e);
      return defaultSettings;
    }
  }
  return defaultSettings;
}

// Save settings to localStorage
function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
}

// Get a specific setting value
function getSetting(key) {
  const settings = loadSettings();
  return settings[key];
}

// Update a specific setting
function updateSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  return saveSettings(settings);
}

// Initialize settings page UI (only runs on settings page)
function initializeSettingsPage() {
  const settingsForm = document.querySelector('.settings-layout');
  if (!settingsForm) return;

  // Cache form elements
  const elements = {
    defaultPlatform: document.querySelector('select[class*="settings-select"]'),
    jobsPerPage: document.querySelectorAll('select[class*="settings-select"]')[1],
    autoGenerateSummary: document.querySelectorAll('input[type="checkbox"]')[0],
    exportFormat: document.querySelectorAll('select[class*="settings-select"]')[2],
    includeChartsInExport: document.querySelectorAll('input[type="checkbox"]')[1],
    includeAISummary: document.querySelectorAll('input[type="checkbox"]')[2],
    cacheDuration: document.querySelectorAll('select[class*="settings-select"]')[3],
    saveButton: document.querySelector('.btn--primary'),
    resetButton: document.querySelector('.btn--ghost'),
    clearCacheButton: document.querySelectorAll('.btn--secondary')[0],
    downloadAllButton: document.querySelectorAll('.btn--secondary')[1]
  };

  // Load and populate current settings
  function populateSettings() {
    const settings = loadSettings();
    
    if (elements.defaultPlatform) elements.defaultPlatform.value = settings.defaultPlatform;
    if (elements.jobsPerPage) elements.jobsPerPage.value = settings.jobsPerPage;
    if (elements.autoGenerateSummary) elements.autoGenerateSummary.checked = settings.autoGenerateSummary;
    if (elements.exportFormat) elements.exportFormat.value = settings.exportFormat;
    if (elements.includeChartsInExport) elements.includeChartsInExport.checked = settings.includeChartsInExport;
    if (elements.includeAISummary) elements.includeAISummary.checked = settings.includeAISummary;
    if (elements.cacheDuration) elements.cacheDuration.value = settings.cacheDuration;
  }

  // Save settings handler
  function handleSaveSettings(e) {
    e.preventDefault();
    
    const settings = {
      defaultPlatform: elements.defaultPlatform?.value || 'all',
      jobsPerPage: parseInt(elements.jobsPerPage?.value) || 50,
      autoGenerateSummary: elements.autoGenerateSummary?.checked ?? true,
      exportFormat: elements.exportFormat?.value || 'csv',
      includeChartsInExport: elements.includeChartsInExport?.checked ?? true,
      includeAISummary: elements.includeAISummary?.checked ?? false,
      cacheDuration: parseInt(elements.cacheDuration?.value) || 24
    };

    if (saveSettings(settings)) {
      showNotification('Settings saved successfully!', 'success');
    } else {
      showNotification('Failed to save settings', 'error');
    }
  }

  // Reset settings handler
  function handleResetSettings(e) {
    e.preventDefault();
    
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      saveSettings(defaultSettings);
      populateSettings();
      showNotification('Settings reset to defaults', 'success');
    }
  }

  // Clear cache handler
  function handleClearCache(e) {
    e.preventDefault();
    
    if (confirm('This will delete all saved analyses. Continue?')) {
      const analysesKey = 'savedAnalyses';
      localStorage.removeItem(analysesKey);
      showNotification('All cached data cleared', 'success');
    }
  }

  // Download all data handler
  function handleDownloadAll(e) {
    e.preventDefault();
    
    const allData = {
      settings: loadSettings(),
      analyses: JSON.parse(localStorage.getItem('savedAnalyses') || '[]')
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `account-mapping-backup-${timestamp}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Data exported successfully', 'success');
  }

  // Show notification
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#14b8a6' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Bind event listeners
  if (elements.saveButton) {
    elements.saveButton.addEventListener('click', handleSaveSettings);
  }
  
  if (elements.resetButton) {
    elements.resetButton.addEventListener('click', handleResetSettings);
  }
  
  if (elements.clearCacheButton) {
    elements.clearCacheButton.addEventListener('click', handleClearCache);
  }
  
  if (elements.downloadAllButton) {
    elements.downloadAllButton.addEventListener('click', handleDownloadAll);
  }

  // Initialize with current settings
  populateSettings();
}

// Run settings page initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializeSettingsPage);
