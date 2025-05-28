class Timeboxing {
    constructor() {
        this.timeboxes = new Map(); // Map of timebox IDs to timebox data
        this.tasks = new Map(); // Map of task IDs to task data
        this.store = window.localStorage;
        this.init();
    }

    init() {
        this.taskList = document.getElementById('timeboxing-task-list');
        this.timeboxContainer = document.getElementById('timeboxing-boxes-container');
        this.addTimeboxBtn = document.getElementById('add-timebox');
        
        if (this.taskList && this.timeboxContainer && this.addTimeboxBtn) {
            this.setupEventListeners();
            this.loadTasks();
            this.loadTimeboxes();
        }
    }

    setupEventListeners() {
        this.addTimeboxBtn.addEventListener('click', () => this.showTimeboxDialog());
        
        // Setup drag and drop
        this.taskList.addEventListener('dragstart', (e) => this.handleDragStart(e));
        this.timeboxContainer.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.timeboxContainer.addEventListener('drop', (e) => this.handleDrop(e));
    }

    async loadTasks() {
        try {
            const tasksJson = this.store.getItem('tasks');
            const tasksArray = tasksJson ? JSON.parse(tasksJson) : [];
            
            // Filter out completed tasks and ensure we have an array
            const tasks = tasksArray.filter(task => !task.completed);
            this.tasks = new Map(tasks.map(task => [task.id, task]));
            this.renderTasks();
            
            // Listen for task updates
            document.addEventListener('tasks-updated', (event) => {
                const updatedTasks = event.detail.tasks.filter(task => !task.completed);
                this.tasks = new Map(updatedTasks.map(task => [task.id, task]));
                this.renderTasks();
            });
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    async loadTimeboxes() {
        try {
            const { ipcRenderer } = window.require('electron');
            const result = await ipcRenderer.invoke('load-data', {
                key: `timeboxes-${new Date().toISOString().split('T')[0]}`
            });

            if (result.success && result.data) {
                this.timeboxes = new Map(Object.entries(result.data));
                this.renderTimeboxes();
            }
        } catch (error) {
            console.error('Error loading timeboxes:', error);
        }
    }

    renderTasks() {
        if (!this.taskList) return;
        
        this.taskList.innerHTML = '';
        
        // Convert tasks Map to array and create elements
        Array.from(this.tasks.values()).forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.draggable = true;
            taskElement.dataset.taskId = task.id;
            
            taskElement.innerHTML = `
                <div class="task-header">
                    <h3 class="task-title">${task.title || 'Untitled Task'}</h3>
                    <span class="task-duration">${task.estimatedPomodoros || 0} pomodoros</span>
                </div>
                <div class="task-meta">
                    <span class="priority-badge ${task.priority || 'medium'}">${task.priority || 'medium'}</span>
                </div>
            `;
            
            this.taskList.appendChild(taskElement);
        });

        // If no tasks, show empty state
        if (this.tasks.size === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <h3>No Available Tasks</h3>
                <p>Create tasks in the Tasks view to start timeboxing</p>
            `;
            this.taskList.appendChild(emptyState);
        }
    }

    renderTimeboxes() {
        this.timeboxContainer.innerHTML = '';
        
        // Sort timeboxes by start time
        const sortedTimeboxes = Array.from(this.timeboxes.entries())
            .sort(([, a], [, b]) => a.startTime - b.startTime);
        
        sortedTimeboxes.forEach(([id, timebox]) => {
            const timeboxElement = document.createElement('div');
            timeboxElement.className = 'timebox';
            timeboxElement.dataset.timeboxId = id;
            
            timeboxElement.innerHTML = `
                <div class="timebox-header">
                    <span class="timebox-time">${this.formatTime(timebox.startTime)} - ${this.formatTime(timebox.endTime)}</span>
                    <div class="timebox-actions">
                        <button class="edit-timebox">Edit</button>
                        <button class="delete-timebox">Delete</button>
                    </div>
                </div>
                <div class="timebox-content" data-timebox-id="${id}">
                    ${timebox.taskId ? `<div class="timeboxed-task" data-task-id="${timebox.taskId}">${timebox.taskTitle}</div>` : ''}
                </div>
            `;
            
            // Add event listeners
            timeboxElement.querySelector('.edit-timebox').addEventListener('click', () => this.showTimeboxDialog(id));
            timeboxElement.querySelector('.delete-timebox').addEventListener('click', () => this.deleteTimebox(id));
            
            this.timeboxContainer.appendChild(timeboxElement);
        });
    }

    async showTimeboxDialog(timeboxId = null) {
        const timebox = timeboxId ? this.timeboxes.get(timeboxId) : null;
        
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-content">
                <h2>${timeboxId ? 'Edit Time Box' : 'New Time Box'}</h2>
                <div class="form-group">
                    <label>Start Time</label>
                    <input type="time" id="timebox-start" value="${timebox ? this.formatTime(timebox.startTime) : '09:00'}">
                </div>
                <div class="form-group">
                    <label>End Time</label>
                    <input type="time" id="timebox-end" value="${timebox ? this.formatTime(timebox.endTime) : '10:00'}">
                </div>
                <div class="modal-buttons">
                    <button class="primary-button save-btn">Save</button>
                    <button class="timer-button cancel-btn">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('.save-btn').addEventListener('click', async () => {
            const startTime = dialog.querySelector('#timebox-start').value;
            const endTime = dialog.querySelector('#timebox-end').value;
            
            if (!startTime || !endTime) {
                alert('Please fill in all fields');
                return;
            }

            const timeboxData = {
                id: timeboxId || Date.now().toString(),
                startTime: this.timeToMinutes(startTime),
                endTime: this.timeToMinutes(endTime)
            };

            if (timeboxId) {
                this.timeboxes.set(timeboxId, { ...this.timeboxes.get(timeboxId), ...timeboxData });
            } else {
                this.timeboxes.set(timeboxData.id, timeboxData);
            }

            await this.saveTimeboxes();
            this.renderTimeboxes();
            document.body.removeChild(dialog);
        });

        dialog.querySelector('.cancel-btn').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }

    async deleteTimebox(timeboxId) {
        this.timeboxes.delete(timeboxId);
        await this.saveTimeboxes();
        this.renderTimeboxes();
    }

    handleDragStart(e) {
        const taskElement = e.target.closest('.task-item');
        if (!taskElement) return;
        
        e.dataTransfer.setData('text/plain', taskElement.dataset.taskId);
        taskElement.classList.add('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        const dropZone = e.target.closest('.timebox-content');
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    }

    async handleDrop(e) {
        e.preventDefault();
        const dropZone = e.target.closest('.timebox-content');
        if (!dropZone) return;

        const taskId = e.dataTransfer.getData('text/plain');
        const timeboxId = dropZone.dataset.timeboxId;
        
        // Remove drag-over styling
        document.querySelectorAll('.drag-over').forEach(zone => {
            zone.classList.remove('drag-over');
        });
        
        // Get task details
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskElement) return;

        // Update timebox with task
        const timebox = this.timeboxes.get(timeboxId);
        if (timebox) {
            timebox.taskId = taskId;
            timebox.taskTitle = taskElement.querySelector('.task-title').textContent;
            await this.saveTimeboxes();
            this.renderTimeboxes();
        }
    }

    async saveTimeboxes() {
        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('save-data', {
                key: `timeboxes-${new Date().toISOString().split('T')[0]}`,
                data: Object.fromEntries(this.timeboxes)
            });
        } catch (error) {
            console.error('Error saving timeboxes:', error);
        }
    }

    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}

export default Timeboxing; 