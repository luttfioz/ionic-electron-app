const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const isDevMode = require('electron-is-dev');
const { CapacitorSplashScreen } = require('@capacitor/electron');

const path = require('path');

// Place holders for our windows so they don't get garbage collected.
let mainWindow = null;

// Placeholder for SplashScreen ref
let splashScreen = null;

//Change this if you do not wish to have a splash screen
let useSplashScreen = true;

const iconPath = path.join(__dirname, 'images',
  process.platform === 'win32' ? 'icon.ico' : 'icon.png');

let isQuitting = false;


// Create an application menu
const menuTemplate = [];
// We can ask the OS for default menus by role, and they will be built for us
const appMenu = { role: 'appMenu' };
const fileMenu = { role: 'fileMenu' }
const editMenu = { role: 'editMenu' };
const windowMenu = { role: 'windowMenu' };

const devMenu = {
  label: 'Options',
  submenu: [
    { role: 'toggleDevTools', label: 'Dev Tools', accelerator: 'F12' },
    { role: 'reload' },
    { role: 'forceReload' },
  ],
}


// Build consolidated menu template
if (process.platform === 'darwin') {
  menuTemplate.push(appMenu);
} else {
  menuTemplate.push(fileMenu);
}
menuTemplate.push(editMenu, windowMenu);

if (isDevMode) {
  menuTemplate.push(devMenu);
}

// Build the menu from the consolidated template
const menu = Menu.buildFromTemplate(menuTemplate);

// And set it for the application
Menu.setApplicationMenu(menu);


async function createWindow() {
  // mac only
  if (app.dock) {
    app.dock.setIcon(iconPath);
  }

  // Define our main window size
  mainWindow = new BrowserWindow({
    icon: iconPath,
    height: 920,
    width: 1600,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'node_modules', '@capacitor', 'electron', 'dist', 'electron-bridge.js')
    }
  });

  if (isDevMode) {
    // Set our above template to the Menu Object if we are in development mode, dont want users having the devtools.
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  }

  if (useSplashScreen) {
    splashScreen = new CapacitorSplashScreen(mainWindow, {
      imageFileName: 'splash.png',
      windowHeight: 800,
      windowWidth: 600,
      loadingText: 'Starting Pinpoint...',
      textColor: '#f0f0f0',
      textPercentageFromTop: 85,
      // customHtml: 'AnyHTML you want'
    });
    splashScreen.init(false);
  } else {
    mainWindow.loadURL(`file://${__dirname}/app/index.html`);
    mainWindow.webContents.on('dom-ready', () => {
      mainWindow.show();
    });
  }

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some Electron APIs can only be used after this event occurs.
app.on('ready', startup);

function startup() {
  createWindow();
  buildTray();

  ipcMain.on('addresses', (evt, addresses) => setTrayMenu(addresses));
}

function buildTray() {
  const trayIcon = process.platform === 'win32' ? 'icon.ico' : 'tray-icon.png';
  tray = new Tray(path.join(__dirname, 'images', trayIcon));
  tray.on('double-click', () => mainWindow.show());
  tray.setPressedImage(path.join(__dirname, 'images', 'tray-icon-pressed.png'));
  tray.setToolTip(app.getName());
  setTrayMenu([]);
}

function setTrayMenu(addresses) {
  tray.setContextMenu(Menu.buildFromTemplate([
    // { role: 'about' },
    buildAddressMenu(addresses),
    { type: 'separator' },
    { role: 'quit' }
  ]));
}

function buildAddressMenu(addressList) {
    const addresses = addressList || [];
    const addressMenuTemplate = {
      label: 'Addresses',
      disabled: addresses.length,
      submenu: addresses.map((addr, i) => {
        return {
          label: `${addr.addressLine1}, ${addr.city}, ${addr.state}`,
          click: () => setAddress(addr.addressId)
        }
      })
    };
    return addressMenuTemplate;
  }

  function setAddress(addressId) {
    mainWindow.webContents.send('setAddress', addressId);
  }
  
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  try {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  } catch (e) {
    console.error(e);
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// Define any IPC or other custom functionality below here
