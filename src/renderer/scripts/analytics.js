const { ipcRenderer } = require('electron');
const Chart = require('chart.js');
const moment = require('moment');

class Analytics {
    constructor() {
        console.log('Initializing Analytics...');
        
        this.productivityChart = null;
        this.totalPomodorosElement = document.getElementById('total-pomodoros');
        this.totalFocusTimeElement = document.getElementById('total-focus-time');

        console.log('Analytics elements found:', {
            totalPomodorosElement: !!this.totalPomodorosElement,
            totalFocusTimeElement: !!this.totalFocusTimeElement
        });

        this.initializeCharts();
        this.loadStatistics();
        
        console.log('Analytics initialization complete');
    }

    async loadStatistics() {
        const result = await ipcRenderer.invoke('load-data', { key: 'statistics' });
        const stats = result.success && result.data ? result.data : {};

        this.updateSummaryStats(stats);
        this.updateCharts(stats);
    }

    updateSummaryStats(stats) {
        const today = moment().format('YYYY-MM-DD');
        const todayStats = stats[today] || { pomodoros: 0, totalMinutes: 0 };

        // Update total pomodoros
        let totalPomodoros = 0;
        Object.values(stats).forEach(day => {
            totalPomodoros += day.pomodoros;
        });
        this.totalPomodorosElement.textContent = totalPomodoros;

        // Update total focus time
        let totalMinutes = 0;
        Object.values(stats).forEach(day => {
            totalMinutes += day.totalMinutes;
        });
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        this.totalFocusTimeElement.textContent = `${hours}h ${minutes}m`;
    }

    initializeCharts() {
        console.log('Initializing charts...');
        const ctx = document.getElementById('productivity-chart');
        
        if (!ctx) {
            console.warn('Productivity chart canvas not found');
            return;
        }

        try {
            console.log('Creating chart instance...');
            this.productivityChart = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Pomodoros Completed',
                            data: [],
                            backgroundColor: 'rgba(74, 144, 226, 0.5)',
                            borderColor: 'rgba(74, 144, 226, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Focus Time (hours)',
                            data: [],
                            backgroundColor: 'rgba(103, 194, 58, 0.5)',
                            borderColor: 'rgba(103, 194, 58, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Weekly Productivity'
                        }
                    }
                }
            });
            console.log('Chart created successfully');
        } catch (error) {
            console.error('Error creating chart:', error);
        }
    }

    updateCharts(stats) {
        // Get the last 7 days
        const dates = [];
        const pomodoros = [];
        const focusHours = [];

        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, 'days');
            const dateKey = date.format('YYYY-MM-DD');
            const dayStats = stats[dateKey] || { pomodoros: 0, totalMinutes: 0 };

            dates.push(date.format('MM/DD'));
            pomodoros.push(dayStats.pomodoros);
            focusHours.push(Math.round(dayStats.totalMinutes / 60 * 10) / 10);
        }

        this.productivityChart.data.labels = dates;
        this.productivityChart.data.datasets[0].data = pomodoros;
        this.productivityChart.data.datasets[1].data = focusHours;
        this.productivityChart.update();
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