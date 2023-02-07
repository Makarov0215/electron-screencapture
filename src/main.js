const { app, BrowserWindow, ipcMain } = require('electron');
const { IPC_CHANNELS } = require('./enums');
const path = require('path');
const { clearInterval } = require('timers');

const AWS = require('aws-sdk');
const capture = require('screenshot-desktop');
const sharp = require('sharp');

let mainWindow, timerId = 0;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 350,
    height: 680,
    icon: path.join(__dirname, 'assets/icon.ico'),
    autoHideMenuBar: true,
    backgroundColor: '#ffff',
    fullscreenable: true,
    titleBarStyle: 'customButtonsOnHover',
    transparent: true,
    frame: true,
    roundedCorners: false,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


// upload screencapture image on aws s3 bucket
const s3 = new AWS.S3({
  accessKeyId: 'AKIAUUC6CHKCYAO6POXS',
  secretAccessKey: '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'
});

ipcMain.on(IPC_CHANNELS.SCREENSHOT, (e, { } = {}) => {
  if (timerId == 0) {

    e.sender.send(IPC_CHANNELS.PLAY_STATE, {
      state: "played"
    });

    timerId = setInterval(() => {
      capture.listDisplays().then(displays => {
        displays.forEach(display => {
          capture({ display: display.id }).then(img => {
            
            sharp(img).resize({ width: 720, height: 1000 }).toBuffer((err, buffer) => {
              if (err) {
                console.error(err);
              } else {
                const fulldate = getCurrentDateTime();
                const params = {
                  Bucket: 'emt-image-workship',
                  Key: 'capture_' + fulldate + '.png',
                  Body: buffer,
                  ContentType: 'image/png'
                };
                s3.upload(params, function (err, data) {
                  if (err) {
                    console.error(err);
                  } else {
                    console.log(`Screenshot successfully uploaded to ${data.Location}`);
                  }
                });
              }
            });
          });
        });
      });
    }, 3000);

  } else {
    clearInterval(timerId);
    e.sender.send(IPC_CHANNELS.PLAY_STATE, {
      state: "stopped"
    });
    timerId = 0;
  }
});

function getCurrentDateTime() {
  var currentdate = new Date();
  var datetime = currentdate.getFullYear() + "-" + currentdate.getMonth() + "-" + currentdate.getDate() + "(" + currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds() + ")";
  return datetime;
}












