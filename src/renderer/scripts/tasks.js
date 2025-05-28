const { ipcRenderer } = window.require('electron');

class TaskManager {
    constructor() {
        this.tasks = [];
        this.showCompleted = false;
        this.init();
    }

    init() {
        // Get DOM elements
        this.taskList = document.getElementById('task-list');
        this.completedTaskList = document.getElementById('completed-task-list');
        this.addTaskButton = document.getElementById('add-task');
        this.toggleCompletedButton = document.getElementById('toggle-completed');
        this.completedContainer = document.getElementById('completed-tasks-container');
        this.tasksGrid = document.querySelector('.tasks-grid');

        if (this.addTaskButton && this.taskList && this.completedTaskList) {
            this.initializeEventListeners();
            this.loadTasks();
            this.updateCompletedVisibility();
        }
    }

    initializeEventListeners() {
        // Add Task Button
        this.addTaskButton.addEventListener('click', () => this.addTask());

        // Task List Event Delegation
        this.taskList.addEventListener('click', (e) => this.handleTaskClick(e));
        
        // Completed Task List Event Delegation
        this.completedTaskList.addEventListener('click', (e) => this.handleCompletedTaskClick(e));

        // Toggle Completed Tasks
        if (this.toggleCompletedButton) {
            this.toggleCompletedButton.addEventListener('click', () => this.toggleCompletedTasks());
        }
    }

    updateCompletedVisibility() {
        // Update button text
        if (this.toggleCompletedButton) {
            this.toggleCompletedButton.textContent = this.showCompleted ? 'Hide Completed' : 'Show Completed';
        }

        // Update completed tasks container visibility
        if (this.completedContainer) {
            this.completedContainer.classList.toggle('hidden', !this.showCompleted);
        }

        // Update grid layout
        if (this.tasksGrid) {
            this.tasksGrid.classList.toggle('no-completed', !this.showCompleted);
        }
    }

    toggleCompletedTasks() {
        this.showCompleted = !this.showCompleted;
        this.updateCompletedVisibility();
    }

    handleTaskClick(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        const taskId = parseInt(taskItem.dataset.taskId);

        if (e.target.classList.contains('edit-task')) {
            this.editTask(taskId);
        } else if (e.target.classList.contains('delete-task')) {
            this.deleteTask(taskId);
        } else if (e.target.classList.contains('task-complete')) {
            this.toggleTaskComplete(taskId);
        } else {
            this.selectTask(taskId);
        }
    }

    handleCompletedTaskClick(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        const taskId = parseInt(taskItem.dataset.taskId);

        if (e.target.classList.contains('task-restore')) {
            this.restoreTask(taskId);
        } else if (e.target.classList.contains('delete-task')) {
            this.deleteTask(taskId);
        }
    }

    async restoreTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = false;
            await this.saveTasks();
            this.render();
        }
    }

    async showTaskDialog(task = null) {
        return new Promise((resolve) => {
            const isNew = !task;
            task = task || {
                id: Date.now(),
                title: '',
                description: '',
                estimatedPomodoros: 1,
                priority: 'medium',
                completed: false
            };

            const dialog = document.createElement('div');
            dialog.className = 'modal';
            dialog.innerHTML = `
                <div class="modal-content">
                    <h2>${isNew ? 'New Task' : 'Edit Task'}</h2>
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="task-title" value="${task.title}">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="task-description">${task.description}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Estimated Pomodoros</label>
                        <input type="number" id="task-pomodoros" min="1" value="${task.estimatedPomodoros}">
                    </div>
                    <div class="form-group">
                        <label>Priority</label>
                        <select id="task-priority">
                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                    <div class="modal-buttons">
                        <button class="primary-button save-btn">Save</button>
                        <button class="timer-button cancel-btn">Cancel</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            dialog.querySelector('.save-btn').addEventListener('click', () => {
                task.title = dialog.querySelector('#task-title').value;
                task.description = dialog.querySelector('#task-description').value;
                task.estimatedPomodoros = parseInt(dialog.querySelector('#task-pomodoros').value);
                task.priority = dialog.querySelector('#task-priority').value;

                document.body.removeChild(dialog);
                resolve(task);
            });

            dialog.querySelector('.cancel-btn').addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(null);
            });

            dialog.querySelector('#task-title').focus();
        });
    }

    async addTask() {
        const task = await this.showTaskDialog();
        if (task) {
            this.tasks.push(task);
            await this.saveTasks();
            this.render();
        }
    }

    async editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedTask = await this.showTaskDialog(task);
        if (updatedTask) {
            const index = this.tasks.findIndex(t => t.id === taskId);
            this.tasks[index] = updatedTask;
            await this.saveTasks();
            this.render();
        }
    }

    async deleteTask(taskId) {
        if (confirm('Delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            await this.saveTasks();
            this.render();
        }
    }

    async toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? Date.now() : null;
            await this.saveTasks();
            this.render();
        }
    }

    async loadTasks() {
        const result = await ipcRenderer.invoke('load-data', { key: 'tasks' });
        this.tasks = result.success && result.data ? result.data : [];
        this.render();
    }

    async saveTasks() {
        await ipcRenderer.invoke('save-data', {
            key: 'tasks',
            data: this.tasks
        });
    }

    render() {
        if (!this.taskList || !this.completedTaskList) return;

        // Clear both lists
        this.taskList.innerHTML = '';
        this.completedTaskList.innerHTML = '';

        // Separate tasks into active and completed
        const activeTasks = this.tasks.filter(task => !task.completed);
        const completedTasks = this.tasks.filter(task => task.completed);

        // Sort active tasks by priority
        const sortedActiveTasks = [...activeTasks].sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        // Sort completed tasks by most recently completed
        const sortedCompletedTasks = [...completedTasks].sort((a, b) => 
            (b.completedAt || 0) - (a.completedAt || 0)
        );

        // Render active tasks
        sortedActiveTasks.forEach(task => {
            const taskElement = this.createTaskElement(task, false);
            this.taskList.appendChild(taskElement);
        });

        // Render completed tasks
        sortedCompletedTasks.forEach(task => {
            const taskElement = this.createTaskElement(task, true);
            this.completedTaskList.appendChild(taskElement);
        });
    }

    createTaskElement(task, isCompleted) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item priority-${task.priority}${task.completed ? ' completed' : ''}`;
        taskElement.dataset.taskId = task.id;

        const actionButtons = isCompleted ? `
            <button class="timer-button task-restore">Restore</button>
            <button class="timer-button delete-task">Delete</button>
        ` : `
            <button class="timer-button edit-task">Edit</button>
            <button class="timer-button delete-task">Delete</button>
        `;

        taskElement.innerHTML = `
            <div class="task-header">
                ${!isCompleted ? `<input type="checkbox" class="task-complete" ${task.completed ? 'checked' : ''}>` : ''}
                <h3 class="task-title">${task.title}</h3>
                <div class="task-actions">
                    ${actionButtons}
                </div>
            </div>
            <div class="task-details">
                <p class="task-description">${task.description}</p>
                <div class="task-meta">
                    <span class="task-pomodoros">🍅 ${task.estimatedPomodoros}</span>
                    <span class="task-priority">Priority: ${task.priority}</span>
                    ${task.completedAt ? `<span class="task-completed-at">Completed: ${new Date(task.completedAt).toLocaleDateString()}</span>` : ''}
                </div>
            </div>
        `;

        return taskElement;
    }

    // Add new method for task selection
    selectTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Remove selected class from all tasks
        const allTasks = this.taskList.querySelectorAll('.task-item');
        allTasks.forEach(t => t.classList.remove('selected'));

        // Add selected class to clicked task
        const selectedTask = this.taskList.querySelector(`[data-task-id="${taskId}"]`);
        if (selectedTask) {
            selectedTask.classList.add('selected');
        }

        // Update the pomodoro timer display
        const currentTaskDisplay = document.getElementById('current-task');
        if (currentTaskDisplay) {
            currentTaskDisplay.textContent = task.title;
        }
    }
}

// Initialize TaskManager
const taskManager = new TaskManager();
export default taskManager; 