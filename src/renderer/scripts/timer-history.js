const { ipcRenderer } = window.require('electron');

class TimerHistory {
    constructor() {
        this.history = [];
        this.init();
    }

    async init() {
        await this.loadHistory();
        this.initializeView();
    }

    async loadHistory() {
        const result = await ipcRenderer.invoke('load-data', { key: 'timer-history' });
        this.history = result.success && result.data ? result.data : [];
    }

    async saveHistory() {
        await ipcRenderer.invoke('save-data', {
            key: 'timer-history',
            data: this.history
        });
    }

    async addHistoryEntry(entry) {
        this.history.push(entry);
        await this.saveHistory();
        this.updateView();
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    formatDuration(durationSeconds) {
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        return `${minutes}m ${seconds}s`;
    }

    initializeView() {
        const historyContainer = document.getElementById('timer-history');
        if (!historyContainer) return;
        
        this.updateView();
    }

    updateView() {
        const historyContainer = document.getElementById('timer-history');
        if (!historyContainer) return;

        historyContainer.innerHTML = '';

        // Sort history by start time, most recent first
        const sortedHistory = [...this.history].sort((a, b) => b.startTime - a.startTime);

        sortedHistory.forEach(entry => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-task">${entry.taskName || 'No task'}</div>
                <div class="history-time">
                    <div>Started: ${this.formatDateTime(entry.startTime)}</div>
                    <div>Ended: ${this.formatDateTime(entry.endTime)}</div>
                    <div>Duration: ${this.formatDuration(entry.duration)}</div>
                </div>
                <div class="history-type">${entry.type}</div>
            `;
            historyContainer.appendChild(historyItem);
        });
    }
}

const timerHistory = new TimerHistory();
export default timerHistory; 