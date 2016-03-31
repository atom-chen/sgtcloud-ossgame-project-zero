/**
 * 竞技场面板
 * Created by maron on 2016/3/7.
 */
var ArenaPanel = BattleMenu.extend({
    ctor: function (tabPanel) {
        this._super(tabPanel, res.pvp_layer_json);
        this.panel = this.root;//cc.csLoader.createNode(res.pvp_layer_json).getChildByName('root');
        this.changeLayer = this.panel.getChildByName('change_btn');
        this.changeBtn = this.changeLayer.getChildByName('change');
        this.buyLayer = this.panel.getChildByName('buy_btn');
        this.buyBtn = this.buyLayer.getChildByName('buy');
        this.surplusNum = this.panel.getChildByName('surplus_num');//剩余次数
        this.myNum_text = this.panel.getChildByName('myNum_text');//剩余次数
        /*this.buyText = this.buyLayer.getChildByName('buy_text');
         this.changeText = this.changeLayer.getChildByName('change_text');
         this.recordLayer = this.panel.getChildByName('record_btn');
         this.recordText = this.buyLayer.getChildByName('record_text');
         this.surplusText = this.panel.getChildByName('surplus_text');//剩余次数文本
         */
        this.recordBtn = this.panel.getChildByName('record_btn').getChildByName('record');
        this.opponentBox = this.panel.getChildByName('opponent_box');//挑战者列表
        //setFont(this.changeText,this.buyText,this.recordText,this.surplusNum,this.surplusText);
        //setColor(this.changeText,this.buyText,this.recordText,this.surplusNum,this.surplusText);
        this._arenakey = 'pvp_rank';
        this._itemTemplate = ccs.csLoader.createNode(res.pvp_opponent_view_json).getChildByName('root');
        this.changeBtn.addClickEventListener(function (e) {
            this.refreshItems(this._index);
        }.bind(this));
        if (typeof player.arena === 'undefined') {
            player.arena = {times: CONSTS.arena_challenge_times}
        }
        this._arenaService = Network.arenaService;
        this.surplusNum.setString(player.arena.times);
        this.buyBtn.addClickEventListener(this.purchaseTimes.bind(this));
        this._recordPanel = ccs.csLoader.createNode(res.pvp_record);
        var winSize = cc.winSize;
        var w = this._recordPanel.width;
        var h = this._recordPanel.height;
        var _recordRoot = this._recordPanel.getChildByName('root');
        _recordRoot.setPosition(cc.p((winSize.width - w) / 2, (winSize.height - h) / 2));
        this._recordBox = _recordRoot.getChildByName('box');
        this.recordItemTemplate = ccs.csLoader.createNode(res.pvp_record_view).getChildByName('root');
        this.challengeStatus = {
            STATUS_WIN: {value: "victory", text: '战胜'},
            STATUS_FIGHTING: {value: "fighting", text: '战斗中...'},
            STATUS_LOSE: {value: "defeat", text: '战败'}
        };
        this.challengeStatusTextMapping = {};
        for (var k in this.challengeStatus) {
            this.challengeStatusTextMapping[this.challengeStatus[k]['value']] = this.challengeStatus[k]['text'];
        }
        this.recordBtn.addClickEventListener(this._openRecord.bind(this));
        this.init();
    }, _openRecord: function () {
        //this._recordPanel.setVisible(true);
        this._recordBox.removeAllChildrenWithCleanup(true);
        GamePopup.openPopup(this._recordPanel, null, false);
        this._arenaService.getTopChallenges(player.id, 5, function (result, data) {
            if (data) {
                for (var i = 0, j = data.length; i < j; i++) {
                    var item = this.recordItemTemplate.clone();
                    var text = item.getChildByName('text');
                    item.setPosition((this._recordBox.width - item.width) / 2, this._recordBox.height - (i + 1) * item.height - i * 2);
                    var status = data[i].status;
                    var statusText = this.challengeStatusTextMapping[status];
                    var challengeTime = new Date(data[i].createTime).Format('yyyy-MM-dd hh:mm:ss')
                    text.setString(challengeTime);
                    this._recordBox.addChild(item);
                }
            }
        }.bind(this));
    }, _hideRecord: function () {
        this._recordPanel.setVisible(false);
    }, init: function () {
        customEventHelper.bindListener(EVENT.WIN_ARENA_BATTLE, function (e) {
            var data = e.getUserData();
            this._arenaService.updateChallenge(data,this._arenakey, this.challengeStatus.STATUS_WIN.value, '',function(){
                console.log('挑战成功')
            });
        }.bind(this));
        customEventHelper.bindListener(EVENT.LOSE_ARENA_BATTLE, function (e) {
            var data = e.getUserData();
            this._arenaService.updateChallenge(data,this._arenakey, this.challengeStatus.STATUS_LOSE.value, '',function(){
                console.log('挑战失败')
            });
        }.bind(this));
        this.pullData();
    }, __unit2Text: function (unit) {
        switch (unit) {
            case "gem":
                return "钻石";
            case "gold":
                return "金币";
            case "relic":
                return "宝物";
        }
    }, purchaseTimes: function () {
        ComplexPopup.confirm("友情提示", "是否花费" + CONSTS.arena_times_purchase.value + this.__unit2Text(CONSTS.arena_times_purchase.unit) + "购买" + CONSTS.arena_times_purchase.times + "场挑战次数",
            CONSTS.arena_times_purchase, function (result) {
                if (result) {
                    player.arena.times += CONSTS.arena_times_purchase.times;
                    PlayerData.updateResource(CONSTS.arena_times_purchase);
                    this.refreshTimes();
                }
            }.bind(this));
    }, pushItem: function (data, i) {
        var item = this._itemTemplate.clone();
        var icon = item.getChildByName("player_icon");
        //icon.loadTexture('');
        var player_name = item.getChildByName("player_name");
        player_name.setString(data.player.name);
        var level_text = item.getChildByName("level_text");
        level_text.setString('Lv.' + data.player.level);
        var rank = item.getChildByName("rank");
        var rank_num = item.getChildByName("rank_num");
        rank_num.setString(data.index + 1);
        var fight_num = item.getChildByName("fight_num");
        fight_num.setString(data.score);
        var btnLayer = item.getChildByName("btn");
        var btn = btnLayer.getChildByName("btn");
        item.setPositionY(this.opponentBox.height - i * item.height - i * 3);
        item.setPositionX((this.opponentBox.width - item.width) / 2);
        btn.addClickEventListener(function (e) {
            this.challenge(data, e);
        }.bind(this));
        this.opponentBox.addChild(item);
    }, pullData: function () {
        this._arenaService.addToEnd(this._arenakey, player.id, function (result, data) {
            if (result) {
                this._index = data;
                this.refreshItems(this._index);
            }
        }.bind(this));
    }, _indexInner5: function (index) {
        console.log('player index:[' + index + '] inner 5');
        var items = [];
        for (var i = 0; i < 5; i++) {
            if (index != i) {
                items.push(i);
            }
        }
        items.sort();
        return items;
    }, _indexInner30: function (index) {
        console.log('player index:[' + index + '] inner 30');
        return this._random(index, 1);
    }, _indexOuter30: function (index) {
        console.log('player index:[' + index + '] outer 30');
        return this._random(index, 5);
    }, _exchangeIndex: function (targetPlayerId) {
        console.log('exchange index with player:[' + targetPlayerId + ']');
    }, _random: function (index, base) {
        var items = [];
        for (var i = 0; i < 4;) {
            var _index = index / (4 - i);
            if (i === 3) {
                _index = index / 1.05;
            }
            var ranNum = Math.round(getRandomInt(_index - base, _index + base));
            if (items.indexOf(ranNum) === -1 && index !== ranNum) {
                items.push(ranNum);
                i++;
            }
        }
        items.sort(function (a, b) {
            return a - b;
        });
        return items;
    }, challenge: function (data, e) {
        if (player.arena.times <= 0) {
            BasicPopup.confirm("友情提示", "当日挑战次数已用完，点确定前往购买次数", function (result) {
                if (result)
                    this.purchaseTimes();
            }.bind(this));
        } else {
            game.tabContainer.buttons['main']._selectedEvent();
            this._arenaService.createArenaChallenge(player.id, data.player.id, function (result, id) {
                if (result) {
                    if (id === this.challengeStatus.STATUS_FIGHTING.value){
                        tip.toggle('正在接受挑战，请稍后再试');
                        return ;
                    }
                    console.log('创建挑战成功，ID:' + id);
                    customEventHelper.sendEvent(EVENT.FIGHT_ARENA_BATTLE, {playerId: data.player.id, challengeId: id});
                    player.arena.times--;
                    this.refreshTimes();
                }
            }.bind(this));
        }
    }, refreshTimes: function () {
        PlayerData.updatePlayer();
        this.surplusNum.setString(player.arena.times);
    }, refreshItems: function (index) {
        this.opponentBox.removeAllChildrenWithCleanup(true);
        var items;
        this.myNum_text.setString(index + 1);
        if (index < 5) {
            items = this._indexInner5(index);
        } else if (index <= 30) {
            items = this._indexInner30(index);
        } else {
            items = this._indexOuter30(index);
        }
        this._arenaService.getPlayersByIndex(items, this._arenakey, function (result, data) {
            if (result) {
                for (var i = 0; i < data.length; i++) {
                    this.pushItem(data[i], i + 1);
                }
            }
        }.bind(this));
    }
});