class Habits {
    constructor() {
        console.log('Initializing Habits...');
        this.store = localStorage;
        this.habits = [];
        this.init();
    }

    init() {
        this.loadHabits();
        this.setupEventListeners();
        this.updateHabitsAnalytics();
    }

    loadHabits() {
        this.habits = JSON.parse(this.store.getItem('habits') || '[]');
        this.renderHabits();
    }

    saveHabits() {
        this.store.setItem('habits', JSON.stringify(this.habits));
        this.updateHabitsAnalytics();
    }

    updateHabitsAnalytics() {
        // Update active habits count
        const activeHabits = this.habits.length;
        const activeHabitsElement = document.getElementById('active-habits-count');
        if (activeHabitsElement) {
            activeHabitsElement.textContent = activeHabits;
        }

        // Calculate completion rate
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        let totalPossibleCompletions = 0;
        let totalActualCompletions = 0;

        this.habits.forEach(habit => {
            const daysToCheck = habit.frequency === 'daily' ? 7 : 1;
            totalPossibleCompletions += daysToCheck;

            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                if (habit.progress.some(p => p.date === dateStr)) {
                    totalActualCompletions++;
                }
            }
        });

        const completionRate = totalPossibleCompletions > 0 
            ? Math.round((totalActualCompletions / totalPossibleCompletions) * 100) 
            : 0;

        const completionRateElement = document.getElementById('habits-completion-rate');
        if (completionRateElement) {
            completionRateElement.textContent = `${completionRate}%`;
        }

        // Calculate longest streak
        let longestStreak = 0;
        this.habits.forEach(habit => {
            let currentStreak = 0;
            let maxStreak = 0;
            
            // Sort progress by date
            const sortedProgress = habit.progress
                .map(p => new Date(p.date))
                .sort((a, b) => b - a);

            for (let i = 0; i < sortedProgress.length; i++) {
                if (i === 0) {
                    currentStreak = 1;
                } else {
                    const diff = Math.abs(sortedProgress[i - 1] - sortedProgress[i]) / (1000 * 60 * 60 * 24);
                    if (diff === 1) {
                        currentStreak++;
                    } else {
                        maxStreak = Math.max(maxStreak, currentStreak);
                        currentStreak = 1;
                    }
                }
            }
            maxStreak = Math.max(maxStreak, currentStreak);
            longestStreak = Math.max(longestStreak, maxStreak);
        });

        const longestStreakElement = document.getElementById('longest-streak');
        if (longestStreakElement) {
            longestStreakElement.textContent = `${longestStreak} days`;
        }

        // Update habits heatmap
        this.updateHabitsHeatmap();
    }

    updateHabitsHeatmap() {
        const heatmapContainer = document.getElementById('habits-heatmap');
        if (!heatmapContainer) return;

        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 364); // Show last year

        const daysArray = [];
        let currentDate = new Date(startDate);

        while (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const completions = this.habits.reduce((count, habit) => {
                return count + (habit.progress.some(p => p.date === dateStr) ? 1 : 0);
            }, 0);
            
            daysArray.push({
                date: new Date(currentDate),
                count: completions
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Clear existing content
        heatmapContainer.innerHTML = '';

        // Create heatmap grid similar to task heatmap
        const heatmapWrapper = document.createElement('div');
        heatmapWrapper.className = 'heatmap-wrapper';
        
        // Add month labels
        const monthLabels = document.createElement('div');
        monthLabels.className = 'heatmap-month-labels';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
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
        
        daysArray.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            
            // Set intensity based on count
            const intensity = Math.min(Math.floor(day.count), 4);
            cell.classList.add(`intensity-${intensity}`);
            
            cell.title = `${day.date.toDateString()}: ${day.count} habits completed`;
            grid.appendChild(cell);
        });
        
        heatmapWrapper.appendChild(grid);
        heatmapContainer.appendChild(heatmapWrapper);
    }

    setupEventListeners() {
        const addHabitBtn = document.getElementById('add-habit');
        if (addHabitBtn) {
            addHabitBtn.addEventListener('click', () => this.showAddHabitModal());
        }

        // Delegate click events for habit completion and deletion
        const habitList = document.getElementById('habit-list');
        if (habitList) {
            habitList.addEventListener('click', (e) => {
                const habitDay = e.target.closest('.habit-day');
                const deleteBtn = e.target.closest('.delete-habit');
                
                if (deleteBtn) {
                    const habitId = deleteBtn.closest('.habit-item').dataset.habitId;
                    if (habitId) {
                        this.removeHabit(habitId);
                    }
                } else if (habitDay) {
                    const habitId = habitDay.closest('.habit-item').dataset.habitId;
                    const date = habitDay.dataset.date;
                    if (habitId && date) {
                        this.toggleHabitCompletion(habitId, date);
                    }
                }
            });
        }
    }

    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    showAddHabitModal() {
        console.log('Showing add habit modal...');
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            console.error('Modal container not found');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Add New Habit</h2>
                <form id="add-habit-form">
                    <div class="form-group">
                        <label for="habit-name">Habit Name</label>
                        <input type="text" id="habit-name" required>
                    </div>
                    <div class="form-group">
                        <label for="habit-description">Description</label>
                        <textarea id="habit-description"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="habit-frequency">Frequency</label>
                        <select id="habit-frequency" required>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                        </select>
                    </div>
                    <div class="modal-buttons">
                        <button type="button" class="secondary-button" id="cancel-habit">Cancel</button>
                        <button type="submit" class="primary-button">Add Habit</button>
                    </div>
                </form>
            </div>
        `;

        modalContainer.appendChild(modal);
        console.log('Modal added to modal container');

        // Setup event listeners
        const form = modal.querySelector('#add-habit-form');
        const cancelButton = modal.querySelector('#cancel-habit');

        // Close modal on cancel
        cancelButton.addEventListener('click', () => {
            modal.remove();
        });

        // Close modal on clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted');
            const newHabit = {
                id: this.generateUniqueId(),
                name: form.querySelector('#habit-name').value,
                description: form.querySelector('#habit-description').value,
                frequency: form.querySelector('#habit-frequency').value,
                createdAt: new Date().toISOString(),
                progress: [],
            };
            console.log('Creating new habit:', newHabit);
            this.addHabit(newHabit);
            modal.remove();
        });

        // Focus the name input
        const nameInput = form.querySelector('#habit-name');
        nameInput.focus();
    }

    addHabit(habit) {
        this.habits.push(habit);
        this.saveHabits();
        this.renderHabits();
    }

    toggleHabitCompletion(habitId, date) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        const existingProgress = habit.progress.find(p => p.date === date);
        if (existingProgress) {
            habit.progress = habit.progress.filter(p => p.date !== date);
        } else {
            habit.progress.push({ date, completed: true });
        }

        this.saveHabits();
        this.renderHabits();
    }

    removeHabit(habitId) {
        this.habits = this.habits.filter(habit => habit.id !== habitId);
        this.saveHabits();
        this.renderHabits();
    }

    renderHabits() {
        const habitList = document.getElementById('habit-list');
        if (!habitList) return;

        habitList.innerHTML = '';
        
        if (this.habits.length === 0) {
            habitList.innerHTML = `
                <div class="empty-state">
                    <h3>No habits yet</h3>
                    <p>Click the "New Habit" button to start tracking your habits!</p>
                </div>
            `;
            return;
        }
        
        const today = new Date().toISOString().split('T')[0];
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        this.habits.forEach(habit => {
            const habitElement = document.createElement('div');
            habitElement.className = 'habit-item';
            habitElement.dataset.habitId = habit.id;
            
            // Create week view for tracking
            const weekView = daysOfWeek.map((day, index) => {
                const date = new Date();
                date.setDate(date.getDate() - date.getDay() + index);
                const dateStr = date.toISOString().split('T')[0];
                const isCompleted = habit.progress.some(p => p.date === dateStr);
                
                return `
                    <div class="habit-day ${isCompleted ? 'completed' : ''}" 
                         data-date="${dateStr}">
                        <div class="day-label">${day}</div>
                        <div class="completion-indicator"></div>
                    </div>
                `;
            }).join('');

            habitElement.innerHTML = `
                <style>
                    .delete-habit {
                        background-color: #ff4444;
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 24px;
                        height: 24px;
                        font-size: 16px;
                        cursor: pointer;
                        margin-left: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background-color 0.2s;
                    }
                    .delete-habit:hover {
                        background-color: #ff0000;
                    }
                    .habit-actions {
                        display: flex;
                        align-items: center;
                    }
                </style>
                <div class="habit-header">
                    <h3>${habit.name}</h3>
                    <div class="habit-actions">
                        <span class="habit-frequency">${habit.frequency}</span>
                        <button class="delete-habit" title="Delete habit">×</button>
                    </div>
                </div>
                <p class="habit-description">${habit.description || ''}</p>
                <div class="habit-week">
                    ${weekView}
                </div>
            `;

            habitList.appendChild(habitElement);
        });
    }
}

// Create and export a single instance
const habits = new Habits();
window.habits = habits; // Make it available globally
export default habits; 