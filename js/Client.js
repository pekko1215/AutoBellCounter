// ウィンドウのオブジェクトを取得
$(function(){
    const {remote, ipcRenderer} = require('electron');
    const {Menu, dialog} = remote;
    var config = require('../config.json');
    var fs = require('fs');

    var Template = null;
    var LoadData = null;

    var Counter = null;
    var Counting = false;

    var Events = {};

    var win = remote.getCurrentWindow();
    win.openDevTools();
    var menu = [
        {
            label: "ファイル",
            submenu: [
                {
                    label: "データの読み込み",
                    click(item, forcusedWindow){
                        dialog.showOpenDialog(win, {
                            title: 'データの読み込み',
                            filters: [
                                {name: 'ABCデータファイル', extensions: ['abc']}
                            ],
                            properties: ['openFile', 'createDirectory']
                        }, (filename) => {
                            loadDataFile(filename).then(() => {
                                alert('読み込みが成功しました')
                            }).catch((e) => {
                                if (e != 'No File') {
                                    alert('エラーが発生しました')
                                }
                            })
                        })
                    }
                },
                {
                    label: "テンプレートデータの読み込み",
                    click(item, focusedWindow){
                        dialog.showOpenDialog(win, {
                            title: 'テンプレートデータの読み込み',
                            filters: [
                                {name: 'ABCテンプレートファイル', extensions: ['abct']}
                            ],
                            properties: ['openFile', 'createDirectory']
                        }, (filename) => {
                            loadTemplateFile(filename).then(() => {
                                alert('読み込みが成功しました')
                            }).catch((e) => {
                                if (e != 'No File') {
                                    alert('エラーが発生しました')
                                }
                            })
                        })
                    }
                },
                {
                    label: "データの保存",
                    click(item, forcusedWindow){
                        if (LoadData === null) {
                            alert('データがないよん');
                            return;
                        }
                        dialog.showSaveDialog(null, {
                            title: 'データの保存',
                            filters: [
                                {
                                    name: 'ABCデータファイル', extensions: ['abc']
                                }
                            ]
                        }, (filenames) => {
                            saveDataFile(filenames).then(() => {
                                alert('保存しました')
                            }).catch((err) => {
                                alert('保存に失敗しました')
                                console.log(err);
                            })
                        })
                    }
                },
                {
                    type: 'separator',
                },
                {
                    label: "最近開いたファイル",
                    submenu: []
                }
            ]
        },
        {
            label: "データ",
            // submenu: ,
            submenu: [
                {
                    label: "カウント開始！",
                    submenu: []
                },
                {
                    type: 'separator'
                },
                {
                    label: "カウンタチェック",
                    click(){
                        var coms = ipcRenderer.sendSync('getComport');
                        menu[1].submenu[0].submenu = [];
                        coms.forEach((com) => {
                            menu[1].submenu[0].submenu.push({
                                label: com,
                                click(){
                                    countInit(com)
                                }
                            })
                        })
                        Menu.setApplicationMenu(Menu.buildFromTemplate(menu))
                    }
                }
            ],
            click(){
                console.log(1)
            }
        }
    ]
    menu[1].submenu[2].click()

    menu[0].submenu[4].submenu = config.dataHistry.map((path)=>{
        return {
            label:pathToName(path),
            click(){
                loadDataFile(path).then(() => {
                    alert('読み込みが成功しました')
                }).catch((e) => {
                    if (e != 'No File') {
                        alert('エラーが発生しました')
                    }
                })
            }
        }
    })

    Menu.setApplicationMenu(Menu.buildFromTemplate(menu))

// ウィンドウを表示
    win.show();


    var Segments = {
        allPlayCountSeg: new Seg16('AllPlayCountSeg'),
        playCountSeg: new Seg16('PlayCountSeg'),
        coinSeg: new Seg16('CoinSeg'),
        bonusSeg: []
    }

    Segments.allPlayCountSeg.draw({digit: 6, value: "   Abc"})
    Segments.playCountSeg.draw({digit: 6, value: "   Abc"})
    Segments.coinSeg.draw({colorOn: "green", digit: 6, value: "  1234"})
    window.Segments = Segments

    for (var i = 1; i <= 4; i++) {
        Segments.bonusSeg.push(new Seg16('BonusSeg' + i))
        Segments.bonusSeg[i - 1].draw({digit: 5, value: "  abc"})
    }

    function countInit(comName) {
        Counter = ipcRenderer.sendSync('counterInit', {
            data: LoadData,
            template: Template,
            comName: comName
        });
        upDataRender(Counter)
        ipcRenderer.on("change", (sender, counter) => {
            upDataRender(counter.data);
        })
    }

    function loadTemplateFile(files) {
        return new Promise((resolve, reject) => {
            if (files.length == 0) {
                reject('No File')
                return;
            }
            fs.readFile(files[0], 'utf8', (err, data) => {
                if (err) {
                    reject(err)
                    return;
                }
                Template = data;
                upDataRender(JSON.parse(Template))
            })
        })
    }


    function loadDataFile(files) {
        return new Promise((resolve, reject) => {
            if (files.length == 0) {
                reject('No File')
                return;
            }
            fs.readFile(files[0], 'utf8', (err, data) => {
                if (err) {
                    reject(err)
                    return;
                }
                upDataRender(JSON.parse(data))
                LoadData = data;
                Template = data;
            })
        })
    }

    function saveDataFile(files) {
        return new Promise((resolve, reject) => {
            if (!files) {
                reject('No File')
                return;
            }

            if (files.slice(-4) != '.abc') {
                files += '.abc'
            }

            saveData = ipcRenderer.sendSync('saveData')

            fs.writeFile(files, saveData, (err, data) => {
                if (err) {
                    reject(err)
                    return;
                }
                Template = data;
            })
        })
    }

    function upDataRender(data) {
        LoadData = data;
        console.log(data)
        for (var key in data) {
            switch (key) {
                case 'playCount':
                case 'allPlayCount':
                case 'coin':
                    Segments[key + 'Seg'].changeValue(fill(data[key], 6));
                    break;
                case 'bonusCount':
                    data[key].forEach((o, i) => {
                        Segments.bonusSeg[i].changeValue(fill(o, 5));
                    })
                    break;
                case 'bonusType':
                    for (i = 0; i < 4 || i < data[key].length; i++) {
                        if (data[key][i]) {
                            $('#BonusLabel' + (i + 1)).text(data[key][i]);
                        } else {
                            $('#Bonus' + (i + 1)).remove();
                        }
                    }
                    break;
                case 'inCoin':
                case 'outCoin':
                    $('#INCount').text(`IN枚数   : ${data['inCoin']}`);
                    $('#OUTCount').text(`OUT枚数  : ${data['outCoin']}`);

                    var payOut = ((data['outCoin'] / data['inCoin']) * 100.).toFixed(2);

                    $('#PayOutCount').text(`機械割   : ${payOut}%`)

                    break;

            }
        }
    }

    function fill(str, len) {
        return (Array(len).fill(" ").join("") + str).slice(-len)
    }

    function pathToName(path) {
        var arr = path.replace(/\//g, "\\").split('\\');
        return arr[arr.length - 1]
    }
})