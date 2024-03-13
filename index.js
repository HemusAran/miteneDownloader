// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
//const https = require('https')
const { download } = require('electron-dl');

let mainWindow;

function createWindow () {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 800,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js') 
		}
	});

	mainWindow.setMenuBarVisibility(false);

	const package_name = "Mitene Downloader";
	const package_version = "1.5.0";
	const title = package_name + " " + package_version;
	mainWindow.setTitle(title);

	// and load the index.html of the app.
	mainWindow.loadFile('index.html');

	// Open the DevTools.
//	mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	createWindow();

	app.on('activate', function () {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) createWindow()
	});
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit();
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.




ipcMain.on('downloadAll', async (event, data) => {

	// ダウンロード先のフォルダを選択するダイアログを表示
	const dirpath = dialog.showOpenDialogSync(null, {
		properties: ['openDirectory'],
		title: 'download to',
		defaultPath: '.'
	});

	if (dirpath === undefined) {
		// キャンセルされた
		return;
	}

	event.reply('startDownloading', "ダウンロード開始");

	// ファイル数分ダウンロード
	for (let no=0; no<data.length; no++) {
		const url = data[no]["url"];
		const filename = data[no]["filename"];

		if (fs.existsSync(dirpath + "/" + filename)) {
			//ファイルが存在する場合はスキップ
		} else {
			await download(mainWindow, url, {
				directory: dirpath + "/",
				filename: filename,
			});
		}
		
		event.reply('downloadProgress', "ダウンロード中 " + no.toString() + "/" + data.length.toString());
	}

	event.reply('finishDownloading', "ダウンロード終了");
});
