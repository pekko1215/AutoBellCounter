var util = require('util');
var EventEmitter = require('eventemitter2').EventEmitter2;

module.exports = function(data,define,ev){
    EventEmitter.call(this, {wildcard: true});

    define = eval(define) || {};
    data = data || {};

    this.portListener = ev;
    this.EventRegist();
    this.data = {
        inCoin:0,
        outCoin:0,
        coin:0,
        playCount:0,
        allPlayCount:0,
        bonusType:["BIG","REG"],
        countEvent:[{
            event:'pin4',
            func:bonusUp("BIG")
        },{
            event:'pin5',
            func:bonusUp("REG")
        },{
            event:'coin:insert',
            func:updateCoin(-1)
        },{
            event:'coin:payout',
            func:updateCoin(+1)
        }],
        bonusCount:[],
        isBonus:[],
        payDelay:500,
        betDelay:500,
        gameCounter:bonusIgnore("BIG","REG")
    }

    for(var key in define){
        this.data[key] = define[key];
    }

    for(var key in data){
        this.data[key] = data[key]
    }

    this.data.bonusCount = new Array(this.data.bonusType.length).fill(0)
    this.data.isBonus = new Array(this.data.bonusType.length).fill(false)


    this.data.countEvent.forEach((obj)=>{
        this.on(obj.event,(e)=>{
            obj.func(this,e);
        })
    })

}

module.exports.prototype.EventRegist = function(){
    this.portListener.on('standup:1',()=>{
        this.emit('coin',this);
        this.emit('coin:insert',this);
    })
    this.portListener.on('standup:2',()=>{
        this.emit('coin',this);
        this.emit('coin:payout',this);
    })
    this.pipeEvent('standup:3',this.portListener,'pin3:up',this);
    this.pipeEvent('standup:4',this.portListener,'pin4:up',this);
    this.pipeEvent('standup:5',this.portListener,'pin5:up',this);
    this.pipeEvent('standdown:3',this.portListener,'pin3:down',this,true);
    this.pipeEvent('standdown:4',this.portListener,'pin4:down',this,true);
    this.pipeEvent('standdown:5',this.portListener,'pin5:down',this,true);

    var lastPayTimer;
    var payCount = 0;
    this.on('coin:payout',()=>{
        clearTimeout(lastPayTimer);
        payCount++;
        lastPayTimer = setTimeout(()=>{
            this.emit('payout',payCount,this);
            this.emit('payout:'+payCount,this);
            this.emit('change',this);
            payCount = 0;
        },this.data.payDelay)
    })

    var lastBetTimer;
    var betCount = 0;
    this.on('coin:insert',()=>{
        clearTimeout(lastBetTimer);
        betCount++;
        lastBetTimer = setTimeout(()=>{
            this.emit('bet',betCount,this);
            this.emit('bet:'+betCount,this);
            this.data.gameCounter(this,betCount);
            this.emit('change',this);
            betCount = 0;
        },this.data.betDelay);
    })

    this.portListener.on('standup',(value)=>{
        this.emit('change',this);
    })
    this.portListener.on('standdown',(value)=>{
        this.emit('change',this);
    })

}

module.exports.prototype.pipeEvent = function(ev1,lis1,ev2,lis2,flag){
    if(flag){
        lis1.on(ev1,(e)=>{
            lis2.emit(ev2,e);
        })
        return
    }
    var arr = ev2.split(':');
    let str = "";
    arr.forEach((s)=>{
        let event = str;
        event += s;
        lis1.on(ev1,(e)=>{
            lis2.emit(event,e)
        })
        str = event + ':'
    })
}


function bonusUp(type){
    return (counter)=>{
        var index = counter.data.bonusType.indexOf("type");
        counter.data.bonusCount[index]++;
        counter.emit('bonusstart:'+type,this);
        counter.emit('bonusstart',type,this);
        counter.data.isBonus[index] = true;

        counter.once(type+':down',()=>{
            if(counter.data.isBonus[index]){
                counter.data.isBonus[index] = false;
                counter.emit('bonusend:'+type,this);
                counter.emit('bonusend',type,this);
                counter.data.playCount = 0;
            }
        })
    }
}

function updateCoin(coin){
    return (counter)=>{
        counter.data.coin+=coin;
        if(coin<0){
            counter.data.inCoin+=-coin;
        }else {
            counter.data.outCoin+=coin;
        }
    }
}

function bonusIgnore(...ignore){
    return (counter,betCoin)=>{
        if(!counter.data.isBonus.some((bool,i)=>{
            var index = ignore.indexOf(counter.data.bonusType[i]);
                if(index!=-1&&bool){
                    return true;
                }
            })
        ){
            counter.data.playCount++;
            counter.data.allPlayCount++;
        }
    }
}

util.inherits(module.exports, EventEmitter);