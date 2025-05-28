const { ipcRenderer } = window.require('electron');

class Planner {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.tasks = [];
        this.init();
    }

    init() {
        this.calendarGrid = document.getElementById('calendar-grid');
        this.currentMonthYear = document.getElementById('current-month-year');
        this.plannerTaskList = document.getElementById('planner-task-list');
        this.prevMonthBtn = document.getElementById('prev-month');
        this.nextMonthBtn = document.getElementById('next-month');

        if (this.calendarGrid && this.currentMonthYear) {
        this.initializeEventListeners();
            this.loadTasks();
        }
    }

    initializeEventListeners() {
        this.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        this.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        
        // Listen for task updates
        document.addEventListener('tasks-updated', (event) => {
            this.tasks = event.detail.tasks;
            this.renderCalendar();
            this.renderTaskList();
        });
    }

    async loadTasks() {
        const result = await ipcRenderer.invoke('load-data', { key: 'tasks' });
        this.tasks = result.success && result.data ? result.data : [];
        this.renderCalendar();
        this.renderTaskList();
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderCalendar();
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Update month/year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        this.currentMonthYear.textContent = `${monthNames[month]} ${year}`;

        // Clear existing calendar
        this.calendarGrid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            this.calendarGrid.appendChild(header);
        });

        // Get first day of month and total days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const totalDays = lastDay.getDate();
        const firstDayIndex = firstDay.getDay();

        // Add days from previous month
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            this.createDayElement(day, true);
        }

        // Add days of current month
        const today = new Date();
        for (let day = 1; day <= totalDays; day++) {
            const isToday = today.getDate() === day && 
                           today.getMonth() === month && 
                           today.getFullYear() === year;
            this.createDayElement(day, false, isToday);
        }

        // Add days from next month
        const remainingDays = 42 - (firstDayIndex + totalDays); // 42 = 6 rows * 7 days
        for (let day = 1; day <= remainingDays; day++) {
            this.createDayElement(day, true);
    }
    }

    createDayElement(day, isOtherMonth, isToday = false) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        if (isOtherMonth) dayElement.classList.add('other-month');
        if (isToday) dayElement.classList.add('today');

        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);

        // Add task indicators
        const tasksForDay = this.getTasksForDay(day, isOtherMonth);
        if (tasksForDay.length > 0) {
            const taskCount = document.createElement('div');
            taskCount.className = 'calendar-day-tasks';
            taskCount.textContent = `${tasksForDay.length} task${tasksForDay.length > 1 ? 's' : ''}`;
            dayElement.appendChild(taskCount);
        }

        dayElement.addEventListener('click', () => this.selectDate(day, isOtherMonth));
        this.calendarGrid.appendChild(dayElement);
    }

    getTasksForDay(day, isOtherMonth) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + (isOtherMonth ? 1 : 0);
        const date = new Date(year, month, day);

        return this.tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.getDate() === date.getDate() &&
                   taskDate.getMonth() === date.getMonth() &&
                   taskDate.getFullYear() === date.getFullYear();
        });
    }

    selectDate(day, isOtherMonth) {
        // Remove previous selection
        const prevSelected = this.calendarGrid.querySelector('.calendar-day.selected');
        if (prevSelected) prevSelected.classList.remove('selected');

        // Update selected date
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + (isOtherMonth ? 1 : 0);
        this.selectedDate = new Date(year, month, day);

        // Add selection to clicked day
        const dayElements = this.calendarGrid.querySelectorAll('.calendar-day');
        const dayIndex = Array.from(dayElements).findIndex(el => 
            el.querySelector('.calendar-day-number').textContent === day.toString() &&
            el.classList.contains('other-month') === isOtherMonth
        );
        if (dayIndex !== -1) {
            dayElements[dayIndex].classList.add('selected');
        }

        this.renderTaskList();
    }

    renderTaskList() {
        if (!this.plannerTaskList) return;

        this.plannerTaskList.innerHTML = '';
        
        const tasksToShow = this.selectedDate
            ? this.getTasksForDay(this.selectedDate.getDate(), false)
            : this.tasks.filter(task => task.dueDate);

        tasksToShow.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'planner-task-item';

            const taskHeader = document.createElement('div');
            taskHeader.className = 'planner-task-header';
            
            const taskTitle = document.createElement('div');
            taskTitle.className = 'planner-task-title';
            taskTitle.textContent = task.title;
            
            const taskDate = document.createElement('div');
            taskDate.className = 'planner-task-date';
            taskDate.textContent = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
            
            taskHeader.appendChild(taskTitle);
            taskHeader.appendChild(taskDate);
            
            const taskDescription = document.createElement('div');
            taskDescription.className = 'planner-task-description';
            taskDescription.textContent = task.description;
            
            taskElement.appendChild(taskHeader);
            taskElement.appendChild(taskDescription);
            
            // Add click handler for task details
            taskElement.addEventListener('click', () => this.showTaskDetailsDialog(task));
            
            this.plannerTaskList.appendChild(taskElement);
        });
    }

    async showTaskDetailsDialog(task) {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="task-detail-title">${task.title}</div>
                <div class="task-details-grid">
                    <div class="task-details-meta">
                        <div class="form-group">
                            <label>Due Date</label>
                            <div class="task-detail-field">${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</div>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="task-status" class="task-status-select">
                                <option value="pending" ${!task.completed ? 'selected' : ''}>Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed" ${task.completed ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Priority</label>
                            <div class="task-detail-field">${task.priority}</div>
                        </div>
                        <div class="form-group">
                            <label>Estimated Pomodoros</label>
                            <div class="task-detail-field">🍅 ${task.estimatedPomodoros}</div>
                        </div>
                        ${task.completedAt ? `
                        <div class="form-group">
                            <label>Completed At</label>
                            <div class="task-detail-field">${new Date(task.completedAt).toLocaleString()}</div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="task-details-description">
                        <div class="form-group" style="height: 100%;">
                            <label>Description</label>
                            <textarea id="task-description" class="task-description-edit">${task.description}</textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="primary-button save-btn">Save Changes</button>
                    <button class="timer-button cancel-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Handle save changes
        dialog.querySelector('.save-btn').addEventListener('click', async () => {
            const status = dialog.querySelector('#task-status').value;
            const newDescription = dialog.querySelector('#task-description').value;

            // Update task
            task.description = newDescription;
            if (status === 'completed' && !task.completed) {
                task.completed = true;
                task.completedAt = Date.now();
            } else if (status !== 'completed' && task.completed) {
                task.completed = false;
                task.completedAt = null;
            }

            // Save changes
            await this.saveTaskChanges(task);

                document.body.removeChild(dialog);
            this.renderTaskList();
            });

        // Handle close
            dialog.querySelector('.cancel-btn').addEventListener('click', () => {
                document.body.removeChild(dialog);
            });
    }

    async saveTaskChanges(updatedTask) {
        // Update task in the tasks array
        const index = this.tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
            this.tasks[index] = updatedTask;
            // Save to storage
            await ipcRenderer.invoke('save-data', {
                key: 'tasks',
                data: this.tasks
            });
            // Notify other components
            const event = new CustomEvent('tasks-updated', { detail: { tasks: this.tasks } });
            document.dispatchEvent(event);
        }
    }
}

// Initialize Planner
const planner = new Planner();
export default planner; 