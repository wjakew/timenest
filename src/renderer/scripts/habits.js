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
    }

    loadHabits() {
        this.habits = JSON.parse(this.store.getItem('habits') || '[]');
        this.renderHabits();
    }

    saveHabits() {
        this.store.setItem('habits', JSON.stringify(this.habits));
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