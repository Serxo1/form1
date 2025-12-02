"use strict";
const electron = require("electron");
const pythonShell = require("python-shell");
const path = require("path");
const url = require("url");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __dirname$1 = path.dirname(url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: "#15151E",
    titleBarStyle: "hiddenInset",
    show: false
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function setupPythonBridge() {
  const pythonPath = electron.app.isPackaged ? path.join(process.resourcesPath, "python") : path.join(__dirname$1, "../python");
  electron.ipcMain.handle("python:extractRace", async (_, args) => {
    const { year, race, session } = args;
    return new Promise((resolve, reject) => {
      const options = {
        mode: "json",
        pythonOptions: ["-u"],
        scriptPath: pythonPath,
        args: [String(year), race, session]
      };
      const pyshell = new pythonShell.PythonShell("extractor.py", options);
      let result = null;
      pyshell.on("message", (message) => {
        if (message.type === "progress") {
          mainWindow == null ? void 0 : mainWindow.webContents.send("python:progress", {
            status: message.status,
            percent: message.percent
          });
        } else if (message.type === "result") {
          result = message.data;
        }
      });
      pyshell.on("stderr", (stderr) => {
        console.error("Python stderr:", stderr);
      });
      pyshell.end((err) => {
        if (err) {
          console.error("Python error:", err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  });
  electron.ipcMain.handle("python:listRaces", async (_, args) => {
    return new Promise((resolve, reject) => {
      const options = {
        mode: "json",
        pythonOptions: ["-u"],
        scriptPath: pythonPath,
        args: ["--list-races", String(args.year)]
      };
      const pyshell = new pythonShell.PythonShell("extractor.py", options);
      let result = null;
      pyshell.on("message", (message) => {
        if (message.type === "result") {
          result = message.data;
        }
      });
      pyshell.end((err) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  });
}
electron.app.whenReady().then(() => {
  createWindow();
  setupPythonBridge();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
