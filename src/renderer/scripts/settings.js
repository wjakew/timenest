const { ipcRenderer } = require('electron');

class Settings {
    constructor() {
        this.settings = {
            workDuration: 25,
            breakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4,
            autoStartBreaks: false,
            autoStartPomodoros: false,
            darkMode: false,
            soundEnabled: true,
            notificationsEnabled: true,
            focusModeEnabled: false
        };

        // DOM Elements
        this.workDurationInput = document.getElementById('work-duration');
        this.breakDurationInput = document.getElementById('break-duration');
        this.darkModeToggle = document.getElementById('dark-mode');
        this.soundEnabledToggle = document.getElementById('sound-enabled');

        this.initializeEventListeners();
        this.loadSettings();
    }

    initializeEventListeners() {
        // Timer settings
        this.workDurationInput.addEventListener('change', () => {
            this.settings.workDuration = parseInt(this.workDurationInput.value);
            this.saveSettings();
        });

        this.breakDurationInput.addEventListener('change', () => {
            this.settings.breakDuration = parseInt(this.breakDurationInput.value);
            this.saveSettings();
        });

        // Theme settings
        this.darkModeToggle.addEventListener('change', () => {
            this.settings.darkMode = this.darkModeToggle.checked;
            this.applyTheme();
            this.saveSettings();
        });

        // Sound settings
        this.soundEnabledToggle.addEventListener('change', () => {
            this.settings.soundEnabled = this.soundEnabledToggle.checked;
            this.saveSettings();
        });
    }

    async loadSettings() {
        const result = await ipcRenderer.invoke('load-data', { key: 'settings' });
        if (result.success && result.data) {
            this.settings = { ...this.settings, ...result.data };
            this.applySettings();
        }
    }

    async saveSettings() {
        await ipcRenderer.invoke('save-data', {
            key: 'settings',
            data: this.settings
        });

        // Notify other components about settings changes
        window.dispatchEvent(new CustomEvent('settingsChanged', {
            detail: this.settings
        }));
    }

    applySettings() {
        // Apply timer settings
        this.workDurationInput.value = this.settings.workDuration;
        this.breakDurationInput.value = this.settings.breakDuration;

        // Apply theme settings
        this.darkModeToggle.checked = this.settings.darkMode;
        this.applyTheme();

        // Apply sound settings
        this.soundEnabledToggle.checked = this.settings.soundEnabled;
    }

    applyTheme() {
        document.documentElement.setAttribute(
            'data-theme',
            this.settings.darkMode ? 'dark' : 'light'
        );
    }

    async exportData() {
        const data = {
            settings: this.settings,
            statistics: await this.getStatistics(),
            tasks: await this.getTasks(),
            timeBlocks: await this.getTimeBlocks()
        };

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `timenest-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);

            // Import settings
            if (data.settings) {
                this.settings = { ...this.settings, ...data.settings };
                await this.saveSettings();
                this.applySettings();
            }

            // Import statistics
            if (data.statistics) {
                await ipcRenderer.invoke('save-data', {
                    key: 'statistics',
                    data: data.statistics
                });
            }

            // Import tasks
            if (data.tasks) {
                await ipcRenderer.invoke('save-data', {
                    key: 'tasks',
                    data: data.tasks
                });
            }

            // Import time blocks
            if (data.timeBlocks) {
                for (const [date, blocks] of Object.entries(data.timeBlocks)) {
                    await ipcRenderer.invoke('save-data', {
                        key: `timeblocks-${date}`,
                        data: blocks
                    });
                }
            }

            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    async getStatistics() {
        const result = await ipcRenderer.invoke('load-data', { key: 'statistics' });
        return result.success ? result.data : {};
    }

    async getTasks() {
        const result = await ipcRenderer.invoke('load-data', { key: 'tasks' });
        return result.success ? result.data : [];
    }

    async getTimeBlocks() {
        const timeBlocks = {};
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

        while (startDate <= today) {
            const dateKey = startDate.toISOString().split('T')[0];
            const result = await ipcRenderer.invoke('load-data', {
                key: `timeblocks-${dateKey}`
            });

            if (result.success && result.data && result.data.length > 0) {
                timeBlocks[dateKey] = result.data;
            }

            startDate.setDate(startDate.getDate() + 1);
        }

        return timeBlocks;
    }
}

// Initialize settings after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const settings = new Settings();
    window.settings = settings;
}); 