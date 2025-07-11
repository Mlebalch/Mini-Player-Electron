const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('fs')
const os = require('os')

let mainWindow;

// Chemin pour stocker les données de l'application
const userDataPath = path.join(os.homedir(), '.harmony-mini-player');
const playlistPath = path.join(userDataPath, 'playlist.json');

// Créer le dossier de données s'il n'existe pas
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 580,
    frame: false,
    resizable: false,
    transparent: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')

  // Événements pour les contrôles de fenêtre
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Pour le développement
  // mainWindow.webContents.openDevTools()
}

// Gestionnaires IPC pour les contrôles de fenêtre
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// Gestionnaires IPC pour la sauvegarde/chargement des données
ipcMain.handle('save-playlist', async (event, playlist) => {
  try {
    const dataToSave = {
      playlist: playlist,
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(playlistPath, JSON.stringify(dataToSave, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-playlist', async () => {
  try {
    if (fs.existsSync(playlistPath)) {
      const data = fs.readFileSync(playlistPath, 'utf8');
      const parsed = JSON.parse(data);
      return { success: true, data: parsed };
    }
    return { success: true, data: { playlist: [] } };
  } catch (error) {
    console.error('Erreur lors du chargement:', error);
    return { success: false, error: error.message };
  }
});

// Gestionnaire pour ouvrir le dialogue de sélection de fichiers
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  return result;
});

// Gestionnaire pour lire les métadonnées des fichiers
ipcMain.handle('read-audio-metadata', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    
    return {
      success: true,
      metadata: {
        title: fileName,
        artist: 'Artiste Inconnu',
        album: 'Album Inconnu',
        duration: 0,
        size: stats.size,
        path: filePath
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})