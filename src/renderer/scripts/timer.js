const { ipcRenderer } = window.require('electron');
const sound = window.require('sound-play');
const path = window.require('path');
import timerHistory from './timer-history.js';

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
        this.isTimerVisible = false;
        this.sessionStartTime = null;
        this.isDraggable = true;
        
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
        this.toggleTimerButton = document.getElementById('toggle-timer');

        // Log element findings
        console.log('Timer elements found:', {
            timerDisplay: !!this.timerDisplay,
            currentTaskDisplay: !!this.currentTaskDisplay,
            startButton: !!this.startButton,
            pauseButton: !!this.pauseButton,
            resetButton: !!this.resetButton,
            settingsButton: !!this.settingsButton,
            settingsModal: !!this.settingsModal,
            floatingTimer: !!this.floatingTimer,
            toggleTimerButton: !!this.toggleTimerButton
        });

        this.initializeEventListeners();
        this.loadSettings();
        this.updateDisplay();
        this.updateToggleButton();
        
        // Show timer by default
        this.isTimerVisible = true;
        this.floatingTimer.classList.remove('hidden');
        
        // Listen for focus mode changes
        document.body.addEventListener('focusModeChange', (e) => {
            this.isDraggable = !e.detail.isActive;
            if (e.detail.isActive) {
                this.floatingTimer.style.transform = 'translate(-50%, -50%)';
            }
        });
        
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

        const handleMouseDown = (e) => {
            if (!this.isDraggable) return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === this.floatingTimer) {
                isDragging = true;
            }
        };

        const handleMouseMove = (e) => {
            if (!isDragging || !this.isDraggable) return;
            
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            this.floatingTimer.style.transform = 
                `translate(${currentX}px, ${currentY}px)`;
        };

        const handleMouseUp = () => {
            isDragging = false;
        };

        this.floatingTimer.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    initializeEventListeners() {
        console.log('Setting up PomodoroTimer event listeners...');

        if (this.toggleTimerButton) {
            this.toggleTimerButton.addEventListener('click', () => {
                this.toggleTimer();
            });
        }

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
        this.updateToggleButton();
    }

    async playSound(soundName) {
        try {
            const soundPath = path.join(__dirname, `../assets/sounds/${soundName}.mp3`);
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
        this.sessionStartTime = Date.now();
        
        // Record start in history
        const currentTask = document.getElementById('current-task')?.textContent || 'No task';
        this.currentHistoryEntry = {
            startTime: this.sessionStartTime,
            taskName: currentTask,
            type: this.isBreak ? 'Break' : 'Work'
        };

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

        clearInterval(this.interval);
        this.isRunning = false;
        this.updateDisplay();

        // Record pause in history
        if (this.currentHistoryEntry && this.sessionStartTime) {
            this.currentHistoryEntry.endTime = Date.now();
            this.currentHistoryEntry.duration = Math.floor((this.currentHistoryEntry.endTime - this.currentHistoryEntry.startTime) / 1000);
            timerHistory.addHistoryEntry(this.currentHistoryEntry);
            this.currentHistoryEntry = null;
            this.sessionStartTime = null;
        }
    }

    reset() {
        this.pause();
        this.timeRemaining = this.isBreak ? this.breakDuration : this.workDuration;
        this.updateDisplay();
    }

    async completeSession() {
        clearInterval(this.interval);
        this.isRunning = false;

        // Record completion in history
        if (this.currentHistoryEntry && this.sessionStartTime) {
            this.currentHistoryEntry.endTime = Date.now();
            this.currentHistoryEntry.duration = Math.floor((this.currentHistoryEntry.endTime - this.currentHistoryEntry.startTime) / 1000);
            timerHistory.addHistoryEntry(this.currentHistoryEntry);
            this.currentHistoryEntry = null;
            this.sessionStartTime = null;
        }

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

    toggleTimer() {
        // Only toggle if not in focus mode
        if (!document.body.classList.contains('focus-mode')) {
            this.isTimerVisible = !this.isTimerVisible;
            this.floatingTimer.classList.toggle('hidden', !this.isTimerVisible);
            this.updateToggleButton();
        }
    }

    updateToggleButton() {
        if (!this.toggleTimerButton) return;

        // Don't update button text in focus mode
        if (document.body.classList.contains('focus-mode')) {
            return;
        }

        if (this.isTimerVisible) {
            this.toggleTimerButton.textContent = 'Hide Timer';
        } else {
            let buttonText = 'Show Timer';
            if (this.isRunning) {
                const timeString = this.formatTime(this.timeRemaining);
                const stateText = this.isBreak ? 'Break' : 'Work';
                buttonText = `${stateText}: ${timeString}`;
            }
            this.toggleTimerButton.textContent = buttonText;
        }
    }

    toggleFloatingTimer() {
        const floatingTimer = document.getElementById('floating-timer');
        const toggleButton = document.getElementById('toggle-timer');
        
        if (floatingTimer.classList.contains('hidden')) {
            floatingTimer.classList.remove('hidden');
            toggleButton.textContent = 'Hide Timer';
        } else {
            floatingTimer.classList.add('hidden');
            toggleButton.textContent = 'Show Timer';
        }
    }
}

// Create the timer instance and attach it to window
console.log('Creating global PomodoroTimer instance...');
const pomodoroTimer = new PomodoroTimer();
window.pomodoroTimer = pomodoroTimer;
export default pomodoroTimer; 