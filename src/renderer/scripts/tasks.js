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
        this.addTaskBtn = document.getElementById('add-task');
        this.toggleCompletedBtn = document.getElementById('toggle-completed');
        this.completedContainer = document.getElementById('completed-tasks-container');
        this.tasksGrid = document.querySelector('.tasks-grid');

        if (this.addTaskBtn && this.taskList && this.completedTaskList) {
            this.initializeEventListeners();
            this.loadTasks();
            this.updateCompletedVisibility();
        }
    }

    initializeEventListeners() {
        // Add Task Button
        this.addTaskBtn.addEventListener('click', () => this.addTask());

        // Task List Event Delegation
        this.taskList.addEventListener('click', (e) => this.handleTaskClick(e));
        
        // Completed Task List Event Delegation
        this.completedTaskList.addEventListener('click', (e) => this.handleCompletedTaskClick(e));

        // Toggle Completed Tasks
        if (this.toggleCompletedBtn) {
            this.toggleCompletedBtn.addEventListener('click', () => this.toggleCompletedTasks());
        }
    }

    updateCompletedVisibility() {
        // Update button text
        if (this.toggleCompletedBtn) {
            this.toggleCompletedBtn.textContent = this.showCompleted ? 'Hide Completed' : 'Show Completed';
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
        } else if (e.target.classList.contains('task-status-btn')) {
            this.showTaskDetailsDialog(taskId);
        } else if (!e.target.closest('.task-actions')) {
            // If not clicking on any action button, show details
            this.showTaskDetailsDialog(taskId);
        }
    }

    handleCompletedTaskClick(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        const taskId = parseInt(taskItem.dataset.taskId);

        if (e.target.classList.contains('task-restore')) {
            this.toggleTaskComplete(taskId);
        } else if (e.target.classList.contains('delete-task')) {
            this.deleteTask(taskId);
        } else if (!e.target.closest('.task-actions')) {
            // If not clicking on any action button, show details
            this.showTaskDetailsDialog(taskId);
        }
    }

    async showTaskDetailsDialog(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-content">
                <h2>Task Details</h2>
                <div class="form-group">
                    <label>Title</label>
                    <div class="task-detail-field">${task.title}</div>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <div class="task-detail-field">${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</div>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <div class="task-detail-field">${task.priority}</div>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="task-status" class="task-status-select">
                        <option value="pending" ${!task.status || task.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${task.completed ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="task-description" class="task-description-edit">${task.description}</textarea>
                </div>
                <div class="form-group">
                    <label>Estimated Pomodoros</label>
                    <div class="task-detail-field">🍅 ${task.estimatedPomodoros}</div>
                </div>
                ${task.completed ? `
                <div class="form-group">
                    <label>Completed At</label>
                    <div class="task-detail-field">${new Date(task.completedAt).toLocaleString()}</div>
                </div>
                ` : ''}
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
            task.status = status;
            
            if (status === 'completed' && !task.completed) {
                task.completed = true;
                task.completedAt = Date.now();
            } else if (status !== 'completed' && task.completed) {
                task.completed = false;
                task.completedAt = null;
            }

            // Save changes
            await this.saveTasks();
            this.render();
            document.body.removeChild(dialog);
        });

        // Handle close
        dialog.querySelector('.cancel-btn').addEventListener('click', () => {
            document.body.removeChild(dialog);
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
        this.notifyTasksUpdated();
    }

    async saveTasks() {
        await ipcRenderer.invoke('save-data', {
            key: 'tasks',
            data: this.tasks
        });
        this.notifyTasksUpdated();
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

        const statusClass = task.status === 'in-progress' ? 'in-progress' : 
                          task.completed ? 'completed' : 'pending';
        const statusText = task.status === 'in-progress' ? 'In Progress' : 
                         task.completed ? 'Completed' : 'Pending';

        const actionButtons = isCompleted ? `
            <button class="task-restore">Restore</button>
            <button class="timer-button delete-task">Delete</button>
        ` : `
            <button class="task-status-btn ${statusClass}">${statusText}</button>
            <button class="timer-button edit-task">Edit</button>
            <button class="timer-button delete-task">Delete</button>
        `;

        taskElement.innerHTML = `
            <div class="task-header">
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
                    ${task.dueDate ? `<span class="task-due-date">Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
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

    // Add method to dispatch task update event
    notifyTasksUpdated() {
        const event = new CustomEvent('tasks-updated', { detail: { tasks: this.tasks } });
        document.dispatchEvent(event);
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
                completed: false,
                status: 'pending'
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
                    <div class="form-group">
                        <label>Status</label>
                        <select id="task-status">
                            <option value="pending" ${!task.status || task.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" id="task-due-date" value="${task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}">
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
                task.status = dialog.querySelector('#task-status').value;
                task.dueDate = dialog.querySelector('#task-due-date').value || null;

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
}

// Initialize TaskManager
const taskManager = new TaskManager();
export default taskManager; 