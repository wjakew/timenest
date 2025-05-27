const { ipcRenderer } = require('electron');
const moment = require('moment');

class Planner {
    constructor() {
        this.currentDate = moment();
        this.timeBlocks = [];
        
        // DOM Elements
        this.timeline = document.getElementById('timeline');
        this.currentDateDisplay = document.getElementById('current-date');
        this.prevDayButton = document.getElementById('prev-day');
        this.nextDayButton = document.getElementById('next-day');

        this.initializeEventListeners();
        this.loadTimeBlocks();
        this.render();
    }

    initializeEventListeners() {
        this.prevDayButton.addEventListener('click', () => this.changeDay(-1));
        this.nextDayButton.addEventListener('click', () => this.changeDay(1));
        
        // Timeline click handler for creating new blocks
        this.timeline.addEventListener('click', (e) => {
            if (e.target.classList.contains('timeline') || e.target.classList.contains('hour-slot')) {
                const hour = Math.floor((e.offsetY + this.timeline.scrollTop) / 60);
                this.createTimeBlock(hour);
            }
        });
    }

    async loadTimeBlocks() {
        const dateKey = this.currentDate.format('YYYY-MM-DD');
        const result = await ipcRenderer.invoke('load-data', { key: `timeblocks-${dateKey}` });
        this.timeBlocks = result.success && result.data ? result.data : [];
        this.render();
    }

    async saveTimeBlocks() {
        const dateKey = this.currentDate.format('YYYY-MM-DD');
        await ipcRenderer.invoke('save-data', {
            key: `timeblocks-${dateKey}`,
            data: this.timeBlocks
        });
    }

    changeDay(offset) {
        this.currentDate.add(offset, 'days');
        this.currentDateDisplay.textContent = this.currentDate.format('dddd, MMMM D');
        this.loadTimeBlocks();
    }

    async createTimeBlock(startHour) {
        const block = {
            id: Date.now(),
            startHour,
            duration: 1, // Default 1 hour
            title: 'New Task',
            category: 'default',
            notes: '',
            isRecurring: false,
            recurringDays: []
        };

        const result = await this.showBlockDialog(block, true);
        if (result) {
            this.timeBlocks.push(block);
            await this.saveTimeBlocks();
            this.render();

            if (block.isRecurring) {
                await this.createRecurringBlocks(block);
            }
        }
    }

    async editTimeBlock(block) {
        const result = await this.showBlockDialog(block, false);
        if (result) {
            const index = this.timeBlocks.findIndex(b => b.id === block.id);
            if (index !== -1) {
                this.timeBlocks[index] = block;
                await this.saveTimeBlocks();
                this.render();

                if (block.isRecurring) {
                    await this.updateRecurringBlocks(block);
                }
            }
        }
    }

    async deleteTimeBlock(blockId) {
        const block = this.timeBlocks.find(b => b.id === blockId);
        if (!block) return;

        const confirmDelete = confirm('Delete this time block?');
        if (confirmDelete) {
            this.timeBlocks = this.timeBlocks.filter(b => b.id !== blockId);
            await this.saveTimeBlocks();
            this.render();

            if (block.isRecurring) {
                await this.deleteRecurringBlocks(block);
            }
        }
    }

    showBlockDialog(block, isNew) {
        return new Promise((resolve) => {
            // Create modal dialog
            const dialog = document.createElement('div');
            dialog.className = 'modal';
            dialog.innerHTML = `
                <div class="modal-content">
                    <h2>${isNew ? 'New Time Block' : 'Edit Time Block'}</h2>
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="block-title" value="${block.title}">
                    </div>
                    <div class="form-group">
                        <label>Start Time</label>
                        <input type="number" id="block-start" min="0" max="23" value="${block.startHour}">
                    </div>
                    <div class="form-group">
                        <label>Duration (hours)</label>
                        <input type="number" id="block-duration" min="0.5" max="24" step="0.5" value="${block.duration}">
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select id="block-category">
                            <option value="default">Default</option>
                            <option value="work">Work</option>
                            <option value="personal">Personal</option>
                            <option value="health">Health</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="block-notes">${block.notes}</textarea>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="block-recurring" ${block.isRecurring ? 'checked' : ''}>
                            Recurring
                        </label>
                    </div>
                    <div class="recurring-days" style="display: ${block.isRecurring ? 'block' : 'none'}">
                        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => `
                            <label>
                                <input type="checkbox" value="${i}" 
                                    ${block.recurringDays.includes(i) ? 'checked' : ''}>
                                ${day}
                            </label>
                        `).join('')}
                    </div>
                    <div class="modal-buttons">
                        <button class="save-btn">Save</button>
                        <button class="cancel-btn">Cancel</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // Event handlers
            const recurringCheckbox = dialog.querySelector('#block-recurring');
            const recurringDays = dialog.querySelector('.recurring-days');
            
            recurringCheckbox.addEventListener('change', () => {
                recurringDays.style.display = recurringCheckbox.checked ? 'block' : 'none';
            });

            dialog.querySelector('.save-btn').addEventListener('click', () => {
                block.title = dialog.querySelector('#block-title').value;
                block.startHour = parseInt(dialog.querySelector('#block-start').value);
                block.duration = parseFloat(dialog.querySelector('#block-duration').value);
                block.category = dialog.querySelector('#block-category').value;
                block.notes = dialog.querySelector('#block-notes').value;
                block.isRecurring = recurringCheckbox.checked;
                block.recurringDays = [...dialog.querySelectorAll('.recurring-days input:checked')]
                    .map(input => parseInt(input.value));

                document.body.removeChild(dialog);
                resolve(true);
            });

            dialog.querySelector('.cancel-btn').addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(false);
            });
        });
    }

    async createRecurringBlocks(block) {
        // Create blocks for the next 4 weeks
        const endDate = moment(this.currentDate).add(4, 'weeks');
        let currentDate = moment(this.currentDate).add(1, 'days');

        while (currentDate.isBefore(endDate)) {
            if (block.recurringDays.includes(currentDate.day())) {
                const dateKey = currentDate.format('YYYY-MM-DD');
                const result = await ipcRenderer.invoke('load-data', { key: `timeblocks-${dateKey}` });
                const dayBlocks = result.success && result.data ? result.data : [];

                const newBlock = {
                    ...block,
                    id: Date.now() + Math.random(),
                    recurringParentId: block.id
                };

                dayBlocks.push(newBlock);
                await ipcRenderer.invoke('save-data', { key: `timeblocks-${dateKey}`, data: dayBlocks });
            }
            currentDate.add(1, 'days');
        }
    }

    render() {
        this.timeline.innerHTML = '';
        this.currentDateDisplay.textContent = this.currentDate.format('dddd, MMMM D');

        // Create hour slots
        for (let hour = 0; hour < 24; hour++) {
            const hourSlot = document.createElement('div');
            hourSlot.className = 'hour-slot';
            hourSlot.innerHTML = `<div class="hour-label">${hour}:00</div>`;
            this.timeline.appendChild(hourSlot);
        }

        // Render time blocks
        this.timeBlocks.forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.className = `time-block category-${block.category}`;
            blockElement.style.top = `${block.startHour * 60}px`;
            blockElement.style.height = `${block.duration * 60}px`;
            blockElement.innerHTML = `
                <div class="block-title">${block.title}</div>
                <div class="block-duration">${block.duration}h</div>
                ${block.notes ? '<div class="block-notes">' + block.notes + '</div>' : ''}
                <div class="block-actions">
                    <button class="edit-block">✏️</button>
                    <button class="delete-block">🗑️</button>
                </div>
            `;

            // Add event listeners
            blockElement.querySelector('.edit-block').addEventListener('click', () => {
                this.editTimeBlock(block);
            });

            blockElement.querySelector('.delete-block').addEventListener('click', () => {
                this.deleteTimeBlock(block.id);
            });

            this.timeline.appendChild(blockElement);
        });
    }
}

// Initialize planner
const planner = new Planner();

// Export for use in other modules
window.planner = planner; 