const { contextBridge, ipcRenderer } = require('electron')

// Exposer les APIs au renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Contrôles de fenêtre
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  
  // Sauvegarde et chargement
  savePlaylist: (playlist) => ipcRenderer.invoke('save-playlist', playlist),
  loadPlaylist: () => ipcRenderer.invoke('load-playlist'),
  
  // Dialogue de fichiers
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // Métadonnées des fichiers
  readAudioMetadata: (filePath) => ipcRenderer.invoke('read-audio-metadata', filePath)
})