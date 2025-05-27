let timeChart = null;

function createTimeChart(data) {
    const ctx = document.getElementById('timeChart').getContext('2d');
    
    if (timeChart) {
        timeChart.destroy();
    }

    timeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [{
                label: 'Cumulative Time (minutes)',
                data: data.cumulativeTimes,
                fill: true,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Total Time (minutes)'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Total time: ${context.parsed.y} minutes`;
                        }
                    }
                }
            }
        }
    });
}

function processTimerData(timerHistory) {
    // Sort timer history by date
    const sortedHistory = [...timerHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Process data for the chart
    let cumulativeTime = 0;
    const chartData = {
        dates: [],
        cumulativeTimes: []
    };

    sortedHistory.forEach(entry => {
        const date = new Date(entry.date).toLocaleDateString();
        cumulativeTime += entry.duration;
        
        // If the date already exists, update the last cumulative time
        const existingIndex = chartData.dates.indexOf(date);
        if (existingIndex !== -1) {
            chartData.cumulativeTimes[existingIndex] = cumulativeTime;
        } else {
            chartData.dates.push(date);
            chartData.cumulativeTimes.push(cumulativeTime);
        }
    });

    return chartData;
}

function updateChart(timerHistory) {
    const chartData = processTimerData(timerHistory);
    createTimeChart(chartData);
}

export { updateChart }; 