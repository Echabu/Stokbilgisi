const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveProducts: (products) => ipcRenderer.invoke("save-products", products),
  loadProducts: () => ipcRenderer.invoke("load-products"),
  exportProducts: (products) => ipcRenderer.invoke("export-products", products),
  importProducts: () => ipcRenderer.invoke("import-products"),
});
