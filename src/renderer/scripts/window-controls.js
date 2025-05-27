// Import the window control functions from the main process
const { ipcRenderer } = require('electron');

// Window control buttons
const minimizeButton = document.getElementById('minimize-button');
const maximizeButton = document.getElementById('maximize-button');
const closeButton = document.getElementById('close-button');

// Add click event listeners
minimizeButton.addEventListener('click', () => {
    ipcRenderer.send('window-minimize');
});

maximizeButton.addEventListener('click', () => {
    ipcRenderer.send('window-maximize');
});

closeButton.addEventListener('click', () => {
    ipcRenderer.send('window-close');
}); 