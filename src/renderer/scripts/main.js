const { ipcRenderer } = require('electron');

class App {
    constructor() {
        console.log('Creating App instance...');
        
        // DOM Elements
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.views = document.querySelectorAll('.view');
        this.darkModeToggle = document.getElementById('dark-mode');
        this.exportDataBtn = document.getElementById('export-data');

        console.log('Found nav buttons:', this.navButtons.length);
        console.log('Found views:', this.views.length);

        // State management
        this.currentView = 'planner';
        this.isDarkMode = false;
    }

    init() {
        console.log('Initializing App...');
        this.initializeEventListeners();
        this.loadSettings();
        this.switchView('planner'); // Default view
        console.log('App initialization complete');
    }

    // Navigation
    switchView(viewId) {
        console.log('Switching to view:', viewId);
        this.views.forEach(view => {
            view.classList.add('hidden');
            if (view.id === `${viewId}-view`) {
                view.classList.remove('hidden');
            }
        });

        this.navButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === viewId) {
                btn.classList.add('active');
            }
        });

        this.currentView = viewId;
    }

    initializeEventListeners() {
        console.log('Setting up App event listeners...');
        
        // Navigation
        this.navButtons.forEach(btn => {
            console.log('Adding click listener to button:', btn.dataset.view);
            btn.addEventListener('click', (e) => {
                console.log('Nav button clicked:', btn.dataset.view);
                this.switchView(btn.dataset.view);
            });
        });

        // Dark Mode Toggle
        if (this.darkModeToggle) {
            this.darkModeToggle.addEventListener('change', () => {
                console.log('Dark mode toggled');
                this.isDarkMode = this.darkModeToggle.checked;
                document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
                this.saveSettings();
            });
        } else {
            console.warn('Dark mode toggle not found');
        }

        // Export Data
        if (this.exportDataBtn) {
            this.exportDataBtn.addEventListener('click', async () => {
                console.log('Export data clicked');
                const result = await ipcRenderer.invoke('export-data');
                if (result.success) {
                    console.log('Data exported successfully to:', result.path);
                } else {
                    console.error('Failed to export data');
                }
            });
        } else {
            console.warn('Export data button not found');
        }
    }

    // Settings Management
    async loadSettings() {
        console.log('Loading settings...');
        const result = await ipcRenderer.invoke('load-data', { key: 'settings' });
        if (result.success && result.data) {
            this.isDarkMode = result.data.darkMode || false;
            if (this.darkModeToggle) {
                this.darkModeToggle.checked = this.isDarkMode;
            }
            document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
        }
    }

    async saveSettings() {
        console.log('Saving settings...');
        const settings = {
            darkMode: this.isDarkMode,
        };
        await ipcRenderer.invoke('save-data', { key: 'settings', data: settings });
    }
}

// Create the app instance and attach it to window
console.log('Creating global App instance...');
window.app = new App(); 