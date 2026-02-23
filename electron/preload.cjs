const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Add IPC communication here if necessary
});
