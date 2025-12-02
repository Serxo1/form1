import { app, BrowserWindow, ipcMain } from 'electron'
import { PythonShell, Options } from 'python-shell'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#15151E',
    titleBarStyle: 'hiddenInset',
    show: false
  })

  // Dev or production URL
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Python Bridge Setup
function setupPythonBridge() {
  const pythonPath = app.isPackaged
    ? path.join(process.resourcesPath, 'python')
    : path.join(__dirname, '../python')

  ipcMain.handle('python:extractRace', async (_, args: { year: number; race: string; session: string }) => {
    const { year, race, session } = args

    return new Promise((resolve, reject) => {
      const options: Options = {
        mode: 'json',
        pythonOptions: ['-u'],
        scriptPath: pythonPath,
        args: [String(year), race, session]
      }

      const pyshell = new PythonShell('extractor.py', options)

      let result: unknown = null

      pyshell.on('message', (message: { type: string; status?: string; percent?: number; data?: unknown }) => {
        if (message.type === 'progress') {
          mainWindow?.webContents.send('python:progress', {
            status: message.status,
            percent: message.percent
          })
        } else if (message.type === 'result') {
          result = message.data
        }
      })

      pyshell.on('stderr', (stderr) => {
        console.error('Python stderr:', stderr)
      })

      pyshell.end((err) => {
        if (err) {
          console.error('Python error:', err)
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  })

  ipcMain.handle('python:listRaces', async (_, args: { year: number }) => {
    // Return available races for a year
    return new Promise((resolve, reject) => {
      const options: Options = {
        mode: 'json',
        pythonOptions: ['-u'],
        scriptPath: pythonPath,
        args: ['--list-races', String(args.year)]
      }

      const pyshell = new PythonShell('extractor.py', options)

      let result: unknown = null

      pyshell.on('message', (message: { type: string; data?: unknown }) => {
        if (message.type === 'result') {
          result = message.data
        }
      })

      pyshell.end((err) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
  })
}

app.whenReady().then(() => {
  createWindow()
  setupPythonBridge()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
