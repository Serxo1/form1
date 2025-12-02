"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  python: {
    extractRace: (args) => electron.ipcRenderer.invoke("python:extractRace", args),
    listRaces: (year) => electron.ipcRenderer.invoke("python:listRaces", { year }),
    onProgress: (callback) => {
      const handler = (_, progress) => callback(progress);
      electron.ipcRenderer.on("python:progress", handler);
      return () => electron.ipcRenderer.removeListener("python:progress", handler);
    }
  },
  app: {
    minimize: () => electron.ipcRenderer.send("app:minimize"),
    maximize: () => electron.ipcRenderer.send("app:maximize"),
    close: () => electron.ipcRenderer.send("app:close")
  }
});
