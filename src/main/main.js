const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize electron store
const store = new Store();

let mainWindow;
let focusModeWindow;

// Add cleanup function
function cleanup() {
  // Clear all stored data
  mainWindow = null;
  if (focusModeWindow) {
    focusModeWindow = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window close event
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      if (!app.isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
    }
  });
}

// Create focus mode window
function createFocusModeWindow() {
  focusModeWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false
  });

  // Load the focus mode HTML file
  const focusModePath = path.join(__dirname, '../renderer/focus.html');
  console.log('Loading focus mode from:', focusModePath);
  focusModeWindow.loadFile(focusModePath);

  // Show window when ready
  focusModeWindow.once('ready-to-show', () => {
    focusModeWindow.show();
  });

  // Enable DevTools in development
  if (process.env.NODE_ENV === 'development') {
    focusModeWindow.webContents.openDevTools();
  }

  focusModeWindow.on('closed', () => {
    focusModeWindow = null;
  });
}

app.whenReady().then(createWindow);

// Modify the window-all-closed event handler
app.on('window-all-closed', () => {
  cleanup();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Add before-quit event handler
app.on('before-quit', () => {
  app.isQuitting = true;
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
    mainWindow.close();
  }
  if (focusModeWindow) {
    focusModeWindow.removeAllListeners('close');
    focusModeWindow.close();
  }
});

// Timer control handlers
ipcMain.on('focus-timer-control', (event, action) => {
  // Forward timer control actions to main window
  if (mainWindow) {
    mainWindow.webContents.send('focus-timer-control', action);
  }
});

// Timer update handler
ipcMain.on('timer-update', (event, data) => {
  // Forward timer updates to focus mode window
  if (focusModeWindow) {
    focusModeWindow.webContents.send('timer-update', data);
  }
});

// Theme update handler
ipcMain.on('theme-update', (event, isDark) => {
  // Forward theme updates to focus mode window
  if (focusModeWindow) {
    focusModeWindow.webContents.send('theme-update', isDark);
  }
});

ipcMain.on('show-notification', (event, { title, body }) => {
  new Notification({ title, body }).show();
});

// Data persistence handlers
ipcMain.handle('save-data', async (event, { key, data }) => {
  try {
    store.set(key, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-data', async (event, { key }) => {
  try {
    const data = store.get(key);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export data handler
ipcMain.handle('export-data', async () => {
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'CSV', extensions: ['csv'] },
      { name: 'Markdown', extensions: ['md'] }
    ]
  });

  if (!result.canceled) {
    const data = store.store;
    // Implementation of data export based on file type
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

// Window control handlers
ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

// Modify the window-close handler
ipcMain.on('window-close', () => {
  app.isQuitting = true;
  app.quit();
}); 