const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

function getStoragePath() {
  const folder = app.getPath("userData");
  return path.join(folder, "products.json");
}

function getBackupPath() {
  const folder = app.getPath("userData");
  return path.join(folder, "products-backup.json");
}

ipcMain.handle("save-products", async (event, products) => {
  try {
    const filePath = getStoragePath();
    const backupPath = getBackupPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
    fs.writeFileSync(backupPath, JSON.stringify(products, null, 2), "utf-8");
    return { success: true, path: filePath, backupPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("load-products", async () => {
  try {
    const filePath = getStoragePath();
    const backupPath = getBackupPath();
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileContent);
    }
    if (fs.existsSync(backupPath)) {
      const backupContent = fs.readFileSync(backupPath, "utf-8");
      return JSON.parse(backupContent);
    }
    return [];
  } catch (error) {
    return [];
  }
});

ipcMain.handle("export-products", async (event, products) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Yedek Dışa Aktar",
      defaultPath: "stok-yedek.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath) {
      return { success: false, error: "canceled" };
    }
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("import-products", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Yedekten Yükle",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (canceled || !filePaths?.length) {
      return { success: false, error: "canceled" };
    }
    const fileContent = fs.readFileSync(filePaths[0], "utf-8");
    const parsed = JSON.parse(fileContent);
    if (!Array.isArray(parsed)) {
      return { success: false, error: "Geçersiz yedek dosyası formatı." };
    }
    return { success: true, products: parsed, path: filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 760,
    minWidth: 800,
    minHeight: 620,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
