import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Register IPC handlers before creating windows
function registerIpcHandlers() {
  // Handle folder selection dialog
  ipcMain.handle('dialog:selectFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (!canceled && filePaths.length > 0) {
      return filePaths[0];
    }
    return null;
  });

  // Handle scanning folder with osv-scanner
  ipcMain.handle('scan:folder', async (_, folderPath: string) => {
    return new Promise((resolve, reject) => {
      // Use bundled osv-scanner if available, otherwise use system one
      const isPackaged = app.isPackaged;
      let command: string;
      let args: string[];

      if (isPackaged) {
        // Use bundled binary
        const resourcesPath = process.resourcesPath;
        command = path.join(resourcesPath, 'osv-scanner');
        args = ['scan', 'source', '-r', '.'];
      } else {
        // Development mode - use system osv-scanner
        command = 'osv-scanner';
        args = ['scan', 'source', '-r', '.'];
      }
      
      // Spawn the process in the selected folder directory
      const childProcess = spawn(command, args, {
        cwd: folderPath,
        shell: !isPackaged, // Only use shell in dev mode
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
        });
      });

      childProcess.on('error', (error) => {
        reject({
          success: false,
          error: error.message,
        });
      });
    });
  });
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1240,
    height: 800,
    title: 'OSV Scanner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Register IPC handlers
registerIpcHandlers();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
