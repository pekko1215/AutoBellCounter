'use strict';

var electron = require('electron');
const app = electron.app;
const ipcMain = electron.ipcMain;
const {Menu} = electron;
var BrowserWindow = electron.BrowserWindow;
const PortListener = require('./PortListener/PortListener')
const DataCounter = require('./DataCounter/DataCounter')


var mainWindow = null;

app.on('window-all-closed', function() {
    if (process.platform != 'darwin')
        app.quit();
});



app.on('ready', function() {
    // ブラウザ(Chromium)の起動, 初期画面のロード
    mainWindow = new BrowserWindow(require('./counterOption'));
    mainWindow.loadURL('file://' + __dirname + '/index.html');

    mainWindow.on('closed', function() {
        mainWindow = null;
    });

    ipcMain.on('counterInit',(event,data)=>{
        var portListener = new PortListener();
        portListener.getPortList().then((list)=>{
            portListener.setPort(data.comName);
            return portListener.Listen()
        }).then((portEvent)=>{
            var dataCounter = new DataCounter(data.data,data.template,portEvent);

            var sender = event.sender

            event.returnValue = dataCounter.data
            dataCounter.onAny((event,...arg)=>{
                sender.send(event,...arg);
            })

            ipcMain.on('saveData',(event,data)=>{
                var saveData = JSON.stringify(dataCounter.data,(v,e)=>{
                    if(typeof e === 'function'){
                        return e.toString()
                    }else{
                        return e;
                    }
                },"    ")
                event.returnValue = saveData
            })
            ipcMain.once('close',()=>{
                dataCounter.Close();
            })

        }).catch((e)=>{
            console.log('COM Open Filed');
            console.log(e)
        })
    })

    ipcMain.on('getComport',(event,data)=>{
        var portListener = new PortListener();
        portListener.getPortList().then((list)=>{
            event.returnValue = list.map((obj)=>{
                return obj.comName
            })
        })
    })



});
