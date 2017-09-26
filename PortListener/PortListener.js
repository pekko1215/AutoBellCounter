var util = require('util');
var EventEmitter = require('eventemitter2').EventEmitter2;
var serialPort = require("serialport")

module.exports = function PortListener() {
    this.EventEmitter = function (opts) {
        EventEmitter.call(this, opts)
    };
    util.inherits(this.EventEmitter, EventEmitter);
    this.event = new this.EventEmitter({wildcard: true})
    this.port = null;
}

module.exports.prototype.setPort = function (port) {
    this.port = port;
}

module.exports.prototype.getPortList = function () {
    return new Promise((resolve, reject) => {
        serialPort.list((e, p) => {
            if (e) {
                reject(e)
                return;
            }
            resolve(p);
        })
    })
}

module.exports.prototype.Listen = function () {
    if (!this.port) {
        return false
    }
    return new Promise((resolve, reject) => {
        this.portEvent = new serialPort.parsers.ByteLength({length:1});
        (new serialPort(this.port, {
            baudRate: 300,
            dataBits: 8,
        }, (e) => {
            if (e) {
                reject(e);
                return;
            }
            this.portEventRegist(this.portEvent);
            this.EventRegist(this.event);
            resolve(this.event);

        })).pipe(this.portEvent);
    });
}

module.exports.prototype.portEventRegist = function (ev) {
    var oldPin = [0,0,0,0,0,0,0,0];
    ev.on('data', (data) => {
        var pin = 0xff ^ data[0]
        var pinArray = ("00000000" + pin.toString(2)).slice(-8).split('').reverse()
        oldPin.forEach((old,i)=>{
            if(old==0&&pinArray[i]==1){
                this.event.emit('standup',{
                    index:i+1,
                    pin:pinArray
                })
                this.event.emit('standup:'+(i+1),pinArray);
            }
            if(old==1&&pinArray[i]==0){
                this.event.emit('standdown',{
                    index:i,
                    pin:pinArray
                })
                this.event.emit('standdown:'+i,pinArray);
            }
            if(pinArray[i]==1){
                this.event.emit('pin'+(i+1),pinArray);
            }
        })
        this.event.emit('data', pinArray);
        oldPin = pinArray;
    })
}

module.exports.prototype.EventRegist = function (ev) {

}
