const { ipcRenderer } = require('electron');
const sound = require('sound-play');
const path = require('path');

class PomodoroTimer {
    constructor() {
        console.log('Creating PomodoroTimer instance...');
        
        // Initialize properties
        this.workDuration = 25 * 60;
        this.breakDuration = 5 * 60;
        this.timeRemaining = this.workDuration;
        this.isRunning = false;
        this.isBreak = false;
        this.pomodoroCount = 0;
        this.interval = null;
        
        this.init();
        this.setupDraggableTimer();
    }

    init() {
        console.log('Initializing PomodoroTimer...');

        // Get DOM Elements
        this.timerDisplay = document.getElementById('timer');
        this.currentTaskDisplay = document.getElementById('current-task');
        this.startButton = document.getElementById('start-timer');
        this.pauseButton = document.getElementById('pause-timer');
        this.resetButton = document.getElementById('reset-timer');
        this.settingsButton = document.getElementById('timer-settings');
        this.settingsModal = document.getElementById('timer-settings-modal');
        this.workDurationInput = document.getElementById('work-duration');
        this.breakDurationInput = document.getElementById('break-duration');
        this.saveSettingsButton = document.getElementById('save-timer-settings');
        this.cancelSettingsButton = document.getElementById('cancel-timer-settings');
        this.floatingTimer = document.getElementById('floating-timer');

        // Log element findings
        console.log('Timer elements found:', {
            timerDisplay: !!this.timerDisplay,
            currentTaskDisplay: !!this.currentTaskDisplay,
            startButton: !!this.startButton,
            pauseButton: !!this.pauseButton,
            resetButton: !!this.resetButton,
            settingsButton: !!this.settingsButton,
            settingsModal: !!this.settingsModal,
            floatingTimer: !!this.floatingTimer
        });

        this.initializeEventListeners();
        this.loadSettings();
        this.updateDisplay();
        
        console.log('PomodoroTimer initialization complete');
    }

    setupDraggableTimer() {
        if (!this.floatingTimer) return;

        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        this.floatingTimer.addEventListener('mousedown', (e) => {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === this.floatingTimer) {
                isDragging = true;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                this.floatingTimer.style.transform = 
                    `translate(${currentX}px, ${currentY}px)`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    initializeEventListeners() {
        console.log('Setting up PomodoroTimer event listeners...');

        if (this.startButton) {
            this.startButton.addEventListener('click', () => {
                console.log('Start button clicked');
                this.start();
            });
        }

        if (this.pauseButton) {
            this.pauseButton.addEventListener('click', () => {
                console.log('Pause button clicked');
                this.pause();
            });
        }

        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => {
                console.log('Reset button clicked');
                this.reset();
            });
        }

        if (this.settingsButton) {
            this.settingsButton.addEventListener('click', () => {
                console.log('Settings button clicked');
                this.openSettings();
            });
        }

        if (this.saveSettingsButton) {
            this.saveSettingsButton.addEventListener('click', () => {
                console.log('Save settings button clicked');
                this.saveSettings();
            });
        }

        if (this.cancelSettingsButton) {
            this.cancelSettingsButton.addEventListener('click', () => {
                console.log('Cancel settings button clicked');
                this.closeSettings();
            });
        }

        // Close modal when clicking outside
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });
    }

    openSettings() {
        // Update input values with current settings
        this.workDurationInput.value = Math.floor(this.workDuration / 60);
        this.breakDurationInput.value = Math.floor(this.breakDuration / 60);
        this.settingsModal.style.display = 'flex';
    }

    closeSettings() {
        this.settingsModal.style.display = 'none';
    }

    async saveSettings() {
        const newWorkDuration = parseInt(this.workDurationInput.value);
        const newBreakDuration = parseInt(this.breakDurationInput.value);

        if (isNaN(newWorkDuration) || isNaN(newBreakDuration) || 
            newWorkDuration < 1 || newWorkDuration > 60 ||
            newBreakDuration < 1 || newBreakDuration > 30) {
            alert('Please enter valid durations (Work: 1-60 minutes, Break: 1-30 minutes)');
            return;
        }

        this.workDuration = newWorkDuration * 60;
        this.breakDuration = newBreakDuration * 60;

        // If timer is not running, update the current time remaining
        if (!this.isRunning) {
            this.timeRemaining = this.isBreak ? this.breakDuration : this.workDuration;
            this.updateDisplay();
        }

        // Save to storage
        await ipcRenderer.invoke('save-data', {
            key: 'timer-settings',
            data: {
                workDuration: newWorkDuration,
                breakDuration: newBreakDuration
            }
        });

        this.closeSettings();
    }

    async loadSettings() {
        const result = await ipcRenderer.invoke('load-data', { key: 'timer-settings' });
        if (result.success && result.data) {
            this.workDuration = result.data.workDuration * 60;
            this.breakDuration = result.data.breakDuration * 60;
            this.timeRemaining = this.workDuration;
            this.updateDisplay();
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
        this.startButton.disabled = this.isRunning;
        this.pauseButton.disabled = !this.isRunning;
    }

    async playSound(soundName) {
        if (!this.soundEnabled.checked) return;

        const soundPath = path.join(__dirname, `../assets/sounds/${soundName}.mp3`);
        try {
            await sound.play(soundPath);
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }

    showNotification(title, body) {
        ipcRenderer.send('show-notification', { title, body });
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.updateDisplay();

        this.interval = setInterval(() => {
            this.timeRemaining--;

            if (this.timeRemaining <= 0) {
                this.completeSession();
            } else {
                this.updateDisplay();
            }
        }, 1000);
    }

    pause() {
        if (!this.isRunning) return;

        this.isRunning = false;
        clearInterval(this.interval);
        this.updateDisplay();
    }

    reset() {
        this.isRunning = false;
        clearInterval(this.interval);
        this.timeRemaining = this.isBreak ? this.breakDuration : this.workDuration;
        this.updateDisplay();
    }

    async completeSession() {
        clearInterval(this.interval);
        this.isRunning = false;

        if (this.isBreak) {
            // Break completed
            this.isBreak = false;
            this.timeRemaining = this.workDuration;
            this.playSound('break-end');
            this.showNotification('Break Complete', 'Time to focus!');
        } else {
            // Work session completed
            this.isBreak = true;
            this.timeRemaining = this.breakDuration;
            this.pomodoroCount++;
            this.playSound('work-complete');
            this.showNotification('Pomodoro Complete', 'Time for a break!');

            // Save statistics
            await this.saveStatistics();
        }

        this.updateDisplay();
    }

    async saveStatistics() {
        const result = await ipcRenderer.invoke('load-data', { key: 'statistics' });
        const stats = result.success ? result.data || {} : {};
        
        const today = new Date().toISOString().split('T')[0];
        if (!stats[today]) {
            stats[today] = { pomodoros: 0, totalMinutes: 0 };
        }

        stats[today].pomodoros++;
        stats[today].totalMinutes += this.workDuration / 60;

        await ipcRenderer.invoke('save-data', { key: 'statistics', data: stats });
    }

    toggleFocusMode() {
        ipcRenderer.send('toggle-focus-mode', !this.focusModeButton.classList.contains('active'));
        this.focusModeButton.classList.toggle('active');
    }
}

// Create the timer instance and attach it to window
console.log('Creating global PomodoroTimer instance...');
window.pomodoroTimer = new PomodoroTimer();
export default window.pomodoroTimer; 