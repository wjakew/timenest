const { ipcRenderer } = window.require('electron');

class TaskManager {
    constructor() {
        this.tasks = [];
        this.store = window.localStorage;
        this.analytics = null;
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

        // Initialize analytics
        import('./analytics.js').then(module => {
            this.analytics = new module.default();
        });

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
        const taskRow = e.target.closest('.task-row');
        if (!taskRow) return;

        const taskId = parseInt(taskRow.dataset.taskId);

        // If clicking on action buttons, handle those separately
        if (e.target.closest('.task-actions')) {
            if (e.target.classList.contains('edit-task')) {
                this.editTask(taskId);
            } else if (e.target.classList.contains('delete-task')) {
                this.deleteTask(taskId);
            } else if (e.target.classList.contains('task-status-btn')) {
                this.showTaskDetailsDialog(taskId);
            }
            return;
        }

        // If not clicking on action buttons, show task details
        this.showTaskDetailsDialog(taskId);
    }

    handleCompletedTaskClick(e) {
        const taskRow = e.target.closest('.task-row');
        if (!taskRow) return;

        const taskId = parseInt(taskRow.dataset.taskId);

        // If clicking on action buttons, handle those separately
        if (e.target.closest('.task-actions')) {
            if (e.target.classList.contains('task-restore')) {
                this.toggleTaskComplete(taskId);
            } else if (e.target.classList.contains('delete-task')) {
                this.deleteTask(taskId);
            }
            return;
        }

        // If not clicking on action buttons, show task details
        this.showTaskDetailsDialog(taskId);
    }

    async showTaskDetailsDialog(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

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
                                <option value="pending" ${!task.status || task.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
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
            if (task.completed) {
                task.completedAt = new Date().toISOString();
            } else {
                delete task.completedAt;
            }
            this.saveTasks();
            this.render();
            
            // Update analytics if available
            if (this.analytics) {
                this.analytics.loadCompletedTasks();
                this.analytics.setupHeatmap();
                this.analytics.updateStats();
            }
        }
    }

    async loadTasks() {
        try {
            const tasksJson = this.store.getItem('tasks');
            this.tasks = tasksJson ? JSON.parse(tasksJson) : [];
            this.render();
            this.notifyTasksUpdated();
            
            // Update analytics if available
            if (this.analytics) {
                this.analytics.loadCompletedTasks();
                this.analytics.setupHeatmap();
                this.analytics.updateStats();
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
        }
    }

    async saveTasks() {
        try {
            this.store.setItem('tasks', JSON.stringify(this.tasks));
            this.notifyTasksUpdated();
            
            // Update analytics if available
            if (this.analytics) {
                this.analytics.loadCompletedTasks();
                this.analytics.setupHeatmap();
                this.analytics.updateStats();
            }
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
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
        const taskElement = document.createElement('tr');
        taskElement.className = `task-row priority-${task.priority}${task.completed ? ' completed' : ''}`;
        taskElement.dataset.taskId = task.id;

        const statusClass = task.status === 'in-progress' ? 'in-progress' : 
                          task.completed ? 'completed' : 'pending';
        const statusText = task.status === 'in-progress' ? 'In Progress' : 
                         task.completed ? 'Completed' : 'Pending';

        const actionButtons = isCompleted ? `
            <button class="task-restore" title="Restore Task">↩</button>
            <button class="timer-button delete-task" title="Delete Task">Delete</button>
        ` : `
            <button class="task-status-btn ${statusClass}" title="Change Status">${statusText}</button>
            <button class="timer-button edit-task" title="Edit Task">Edit</button>
            <button class="timer-button delete-task" title="Delete Task">Delete</button>
        `;

        if (isCompleted) {
            taskElement.innerHTML = `
                <td class="task-title">${task.title}</td>
                <td class="task-completed-at">${new Date(task.completedAt).toLocaleDateString()}</td>
                <td class="task-priority"><span class="priority-badge ${task.priority}">${task.priority}</span></td>
                <td class="task-pomodoros">🍅 ${task.estimatedPomodoros}</td>
                <td class="task-actions">${actionButtons}</td>
            `;
        } else {
            taskElement.innerHTML = `
                <td class="task-title">
                    <div class="task-title-content">
                        <span>${task.title}</span>
                        ${task.description ? '<span class="task-description-indicator" title="Has Description">📝</span>' : ''}
                    </div>
                </td>
                <td class="task-status"><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="task-priority"><span class="priority-badge ${task.priority}">${task.priority}</span></td>
                <td class="task-due-date">${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
                <td class="task-pomodoros">🍅 ${task.estimatedPomodoros}</td>
                <td class="task-actions">${actionButtons}</td>
            `;
        }

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