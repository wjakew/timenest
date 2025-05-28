const { ipcRenderer } = require('electron');
const Chart = require('chart.js');
const moment = require('moment');

class Analytics {
    constructor() {
        console.log('Initializing Analytics...');
        
        this.totalPomodorosElement = document.getElementById('total-pomodoros');
        this.totalFocusTimeElement = document.getElementById('total-focus-time');
        this.store = window.localStorage;
        this.completedTasks = [];

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.log('Initializing Analytics...');
        this.loadCompletedTasks();
        this.setupHeatmap();
        this.updateStats();
    }

    loadCompletedTasks() {
        const tasks = JSON.parse(this.store.getItem('tasks') || '[]');
        this.completedTasks = tasks.filter(task => task.completed);
    }

    setupHeatmap() {
        const heatmapContainer = document.getElementById('task-heatmap');
        if (!heatmapContainer) {
            console.warn('Heatmap container not found');
            return;
        }

        // Create calendar grid for the last 12 months
        const today = new Date();
        const monthsBack = 12;
        
        // Clear existing content
        heatmapContainer.innerHTML = '';

        // Create container for labels and grid
        const heatmapWrapper = document.createElement('div');
        heatmapWrapper.className = 'heatmap-wrapper';
        
        // Create month labels
        const monthLabels = document.createElement('div');
        monthLabels.className = 'heatmap-month-labels';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Calculate start date (12 months ago)
        const startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - monthsBack + 1);
        startDate.setDate(1);
        
        // Add month labels
        let currentMonth = new Date(startDate);
        while (currentMonth <= today) {
            const label = document.createElement('div');
            label.className = 'heatmap-month-label';
            label.textContent = months[currentMonth.getMonth()];
            monthLabels.appendChild(label);
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        heatmapWrapper.appendChild(monthLabels);

        // Create heatmap grid
        const grid = document.createElement('div');
        grid.className = 'heatmap-grid';
        
        // Adjust start date to begin on Sunday
        while (startDate.getDay() !== 0) {
            startDate.setDate(startDate.getDate() - 1);
        }
        
        // Fill the grid with day cells
        let currentDate = new Date(startDate);
        while (currentDate <= today) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            
            // Get completion count for this day
            const count = this.getCompletionCountForDate(currentDate);
            
            // Set intensity based on count
            const intensity = this.getIntensityClass(count);
            cell.classList.add(intensity);
            
            // Add tooltip with date and count
            cell.title = `${currentDate.toDateString()}: ${count} tasks completed`;
            
            grid.appendChild(cell);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        heatmapWrapper.appendChild(grid);
        heatmapContainer.appendChild(heatmapWrapper);
    }

    getCompletionCountForDate(date) {
        return this.completedTasks.filter(task => {
            const taskDate = new Date(task.completedAt);
            return taskDate.toDateString() === date.toDateString();
        }).length;
    }

    getIntensityClass(count) {
        if (count === 0) return 'intensity-0';
        if (count <= 2) return 'intensity-1';
        if (count <= 4) return 'intensity-2';
        if (count <= 6) return 'intensity-3';
        return 'intensity-4';
    }

    updateStats() {
        // Update total tasks completed
        const totalCompleted = this.completedTasks.length;
        document.getElementById('total-tasks-completed').textContent = totalCompleted;

        // Calculate weekly average
        const weeklyData = this.getWeeklyCompletionData();
        const weeklyAverage = weeklyData.reduce((sum, week) => sum + week.count, 0) / weeklyData.length;
        document.getElementById('weekly-average').textContent = weeklyAverage.toFixed(1);

        // Find most productive day
        const dailyData = this.getDailyCompletionData();
        const mostProductiveDay = dailyData.reduce((max, day) => 
            day.count > max.count ? day : max, { count: 0, day: '-' });
        document.getElementById('most-productive-day').textContent = mostProductiveDay.day;
    }

    getWeeklyCompletionData() {
        const weeks = {};
        this.completedTasks.forEach(task => {
            const date = new Date(task.completedAt);
            const weekKey = `${date.getFullYear()}-${this.getWeekNumber(date)}`;
            weeks[weekKey] = (weeks[weekKey] || 0) + 1;
        });
        return Object.entries(weeks).map(([week, count]) => ({ week, count }));
    }

    getDailyCompletionData() {
        const days = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        this.completedTasks.forEach(task => {
            const date = new Date(task.completedAt);
            const day = dayNames[date.getDay()];
            days[day] = (days[day] || 0) + 1;
        });
        
        return Object.entries(days).map(([day, count]) => ({ day, count }));
    }

    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    async generateReport() {
        const result = await ipcRenderer.invoke('load-data', { key: 'statistics' });
        const stats = result.success && result.data ? result.data : {};

        let report = '# Productivity Report\n\n';
        report += `Generated on ${moment().format('MMMM D, YYYY')}\n\n`;

        // Weekly summary
        report += '## Weekly Summary\n\n';
        let weeklyPomodoros = 0;
        let weeklyMinutes = 0;

        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, 'days');
            const dateKey = date.format('YYYY-MM-DD');
            const dayStats = stats[dateKey] || { pomodoros: 0, totalMinutes: 0 };

            weeklyPomodoros += dayStats.pomodoros;
            weeklyMinutes += dayStats.totalMinutes;
        }

        report += `- Total Pomodoros: ${weeklyPomodoros}\n`;
        report += `- Total Focus Time: ${Math.floor(weeklyMinutes / 60)}h ${weeklyMinutes % 60}m\n`;
        report += `- Daily Average: ${Math.round(weeklyPomodoros / 7 * 10) / 10} pomodoros\n\n`;

        // Daily breakdown
        report += '## Daily Breakdown\n\n';
        report += '| Date | Pomodoros | Focus Time |\n';
        report += '|------|------------|------------|\n';

        Object.entries(stats)
            .sort(([dateA], [dateB]) => moment(dateB).diff(moment(dateA)))
            .forEach(([date, dayStats]) => {
                const formattedDate = moment(date).format('MM/DD/YYYY');
                const hours = Math.floor(dayStats.totalMinutes / 60);
                const minutes = dayStats.totalMinutes % 60;
                report += `| ${formattedDate} | ${dayStats.pomodoros} | ${hours}h ${minutes}m |\n`;
            });

        return report;
    }
}

// Initialize analytics after DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded in analytics.js, creating Analytics instance...');
    const analytics = new Analytics();
    window.analytics = analytics;
    console.log('Analytics instance created and attached to window');
});

// Export the class
export default Analytics; 