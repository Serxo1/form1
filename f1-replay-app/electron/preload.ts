import { contextBridge, ipcRenderer } from 'electron'

export interface PythonProgress {
  status: string
  percent: number
}

export interface ExtractRaceArgs {
  year: number
  race: string
  session: string
}

export interface ElectronAPI {
  python: {
    extractRace: (args: ExtractRaceArgs) => Promise<unknown>
    listRaces: (year: number) => Promise<unknown>
    onProgress: (callback: (progress: PythonProgress) => void) => () => void
  }
  app: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  python: {
    extractRace: (args: ExtractRaceArgs) => ipcRenderer.invoke('python:extractRace', args),
    listRaces: (year: number) => ipcRenderer.invoke('python:listRaces', { year }),
    onProgress: (callback: (progress: PythonProgress) => void) => {
      const handler = (_: Electron.IpcRendererEvent, progress: PythonProgress) => callback(progress)
      ipcRenderer.on('python:progress', handler)
      return () => ipcRenderer.removeListener('python:progress', handler)
    }
  },
  app: {
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
    close: () => ipcRenderer.send('app:close')
  }
} as ElectronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
