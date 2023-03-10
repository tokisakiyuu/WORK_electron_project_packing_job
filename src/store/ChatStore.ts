import { observable, action, computed, IObservableArray } from 'mobx';
import mainStore, { detailType } from './MainStore';
import { ChatList, MessageItem, ChatItem, MessageData, MessageStatus, MessageStatusType, GroupMember, ChatGrOrFrType, GroupControlState } from '../interface/IChat';
import { FriendItem } from '../interface/IFriend';
import { GroupItem } from '../interface/IGroup';
import Utils from '../utils/utils';
import { ChatType, MessageType, mentionsAllKey, MessageTypeWithSubName, transmitMesGroupTitle, transmitMesTitle, MesaageTips, notShowContent } from '../net/Const';
import friendStore from '../store/FriendStore';
import groupStore from '../store/GroupStore';

import imsdk from '../net/IMSDK';
import webIM from '../net/WebIM';
import systemStore from './SystemStore';
import { delMessageBy, updateMessageVerification, insertMessage, find, delMessageByChatId } from '../dbtemp/HandleDB';
import ipcRender from '../ipcRender';
import { requestStore } from './RequestStore';
import _ from 'underscore';
import { SelectItemType, SelectType } from '../interface/ITransmit';
import xmppSDK from './../net/XmppSDK';
import deviceManager from '../net/DeviceManager';
import message from 'antd/es/message';

import { mesDataCache } from '../dbCache/dbCacheData'

import { Observable, Subscriber } from 'rxjs';
import { sampleTime } from 'rxjs/operators';
import { isOpenDB, isOpenRead } from '../config/SystemConfig';
import { GroupMemRole } from '../interface/IGroup';

 import msgAudioUrl from '../assets/audio/msg.mp3';



export class ChatStore {

    constructor() {
        this.initSortFun();
    }
    _sbscriber: Subscriber<unknown>
    initSortFun = () => {
        let sortObserval = new Observable(subsctiber => {
            this._sbscriber = subsctiber;
        })
        let obervaleSortWithTime = sortObserval.pipe(sampleTime(500));
        obervaleSortWithTime.subscribe((t?: ChatItem[]) => {
            this.chatSortFun(t)
        });
    }
    chatSort = (Clist?: ChatItem[]) => {
        this._sbscriber && this._sbscriber.next(Clist)
    }
    chats: IObservableArray<ChatItem> = observable([]);

    private _messageData: MessageData = new Map();
    // ????????????
    messageData = observable(this._messageData);


    // ?????? ??????
    _messageStatus: MessageStatus = new Map()
    messageStatus = observable(this._messageStatus)
    currentChatInitData: ChatItem = { lastContent: '', id: '', lastTime: '', messageId: '', name: '', timeSend: 0, type: 0, desc: '', gid: '', msgTalkTime: 0, isForbidden: false, isBacklock: false };
    limit = 100;
    listIsBottom = false;
    @computed get messageListInLimit() {
        let _id = this.currentChat.id;
        const messageList = this.messageData.get(_id + '');
        if (messageList) {
            return messageList
        }
        return []
    }
    setListIsBottom = (isBottom: boolean) => {
        this.listIsBottom = isBottom;
    }
    //??????????????????
    @observable currentChatData: ChatItem = this.currentChatInitData;


    @observable groupControlState: GroupControlState = new Map();

    // @observable emojsList:EmojiItem[]=[];
    @observable amrRecorder: any;

    //???????????????????????????????????????
    dbms: Map<any, any[]> = new Map();

    // emojsList: IObservableArray<EmojiItem> = observable([]);
    @observable emojsList: [{ url: string, name: string }];
    //??????????????????
    @observable isMesSel = false;

    //??????????????????
    @observable isReply: boolean = false;
    replyMessage: MessageItem = new MessageItem();

    // md5List: string[] = [];
    //??????????????????

    @observable transmitMesList: MessageItem[] = [];
    @observable loadingChatDetailData: boolean = true;

    @action showTransMesListModal = (mes: MessageItem[]) => {
        this.transmitMesList = mes;
    }
    @action hideTransmitmes = () => {
        this.transmitMesList = []
    }

    // selected mes map
    @observable selectedMes: Map<string, MessageItem> = new Map();
    @action switchShowMesSel = () => {
        if (!this.isMesSel) {
            this.selectedMes.clear();
        }
        this.isMesSel = !this.isMesSel;
    }
    @action switchMesCheck = (mesItem: MessageItem) => {
        const mesId = mesItem.messageId;

        const mes = this.selectedMes.get(mesId + '');
        if (mes) {
            this.selectedMes.delete(mesId + '')
        } else {
            this.selectedMes.set(mesId + '', mesItem);
        }
    }
    // ????????????
    @action transmitMes = (isSingle: boolean, mes?: MessageItem, target?: SelectItemType[]) => {
        const mesTransmit = mes ? [mes] : Array.from(this.selectedMes.values());
        if (target) {
            target.forEach(item => {
                if (item.transmitType == SelectType.chat) {
                    this.sendMessageWithChat(mesTransmit, (item.data as ChatItem), isSingle);
                }
                if (item.transmitType == SelectType.group || item.transmitType == SelectType.friend) {
                    let _chat = ChatItem.getChatItem(item.data as FriendItem | GroupItem);
                    this.addToChats(_chat);

                    this.sendMessageWithChat(mesTransmit, _chat, isSingle);
                }
            })
        }
    }
    @action sendMessageWithChat = (old_msg: MessageItem[], chat: ChatItem, isSingle: boolean) => {
        const msg = [...old_msg]
        if (isSingle) {
            msg.forEach(_msg => {
                const msgServer = webIM.createMessage(_msg.type, _msg.content, chat.id, chat.name);
                msgServer.fromUserName = chat.nickname
                    ? chat.nickname
                    : msgServer.fromUserName;
                ////????????????
                let tip = ''
                if (_msg.type == MessageType.TEXT) {
                    tip = _msg.content;
                } else if (_msg.type == MessageType.IMAGE) {
                    if (Utils.isBase64(_msg.content)) {
                        message.error('?????????????????????????????????');
                        return
                    }
                    msgServer.location_x = _msg.location_x ? _msg.location_x : '';
                    msgServer.location_y = _msg.location_y ? _msg.location_y : '';
                    tip = '[??????]'
                    if (_msg.content.indexOf('gif') != -1) {
                        tip = '[????????????]';
                    }
                } else if (_msg.type == MessageType.GIF) {
                    tip = '[????????????]'
                } else if (_msg.type == MessageType.VIDEO) {
                    tip = '[??????]'
                } else if (_msg.type == MessageType.VOICE || _msg.type == MessageType.SIP_AUDIO) {
                    msgServer.timeLen = _msg.timeLen ? _msg.timeLen : 0;
                    tip = '[??????]'
                } else if (_msg.type == MessageType.CARD) {
                    msgServer.objectId = _msg.fromUserId;
                    tip = '[??????]'
                } else if (_msg.type == MessageType.FILE) {
                    msgServer.fileName = _msg.fileName ? _msg.fileName : '';
                    msgServer.fileSize = _msg.fileSize ? _msg.fileSize : '';
                    tip = '[??????]'
                } else if (_msg.type == MessageType.LOCATION) {
                    msgServer.location_x = _msg.location_x ? _msg.location_x : '';
                    msgServer.location_y = _msg.location_y ? _msg.location_y : '';
                    msgServer.objectId = _msg.objectId ? _msg.objectId : '';
                    tip = '[????????????]'
                }
                this.addMessage(chat.id, msgServer, true);
                webIM.sendMessage(msgServer, '');
                this.updateMes(tip, msgServer.timeSend, chat.id);

            })
        } else {
            const _content = msg.map(item => JSON.stringify(item))
            const msgItem = webIM.createMessage(MessageType.TEXT_TRANSMIT_MANY, JSON.stringify(_content), chat.id, chat.name);
            msgItem.objectId = this.currentChatData.type == ChatGrOrFrType.group
                ? transmitMesGroupTitle
                : this.currentChatData.name + '???' + systemStore.nickname + ' ' + transmitMesTitle
            this.addMessage(chat.id, msgItem, true);
            this.updateMes('[??????]', msgItem.timeSend, chat.id);

            webIM.sendMessage(msgItem, '');
        }
        this.selectedMes.clear();
    }

    //????????????????????????
    @action setMesRead = (msgSendStatus: MessageStatus) => {
        this.messageStatus.replace(msgSendStatus);
    }
    // ??????????????????????????????
    // @observable friendOnlineTime: ChatOnlineTime = {};
    //???????????????
    @observable groupMemberData: GroupMember = {};

    //?????????????????????????????????
    @observable unReadMsgs: Map<string, MessageItem[]> = new Map();


    @action setSnapChat = async (chatId: string, snapChat: number) => {
        if (systemStore.isDelAfterReading == 0) {
            const content = snapChat < 1 ? '????????????????????????' : '????????????????????????' + Utils.getDeadLineTime(snapChat).name + '??????';
            // let currentId = this.currentChatData.id;

            let msg = webIM.createMessage(
                MessageType.SNAP_CHAT,
                content,
                chatId,
                this.currentChatData.name
            );
            this.addMessage(chatId, msg, true);
            this.updateMes(content, msg.timeSend);
            webIM.sendMessage(msg, '');
            msg && mesDataCache.addmes(msg, chatId);
        }

        this.currentChatData.snapChat = snapChat
        // console.log('????????????', this.currentChatData)

    }
    //????????????????????????
    @action changeMesReadData = (myReadDeadTime: number, readDeadTime: number, mes: MessageItem) => {

        let currentId = this.currentChatData.id;

        let mesList = this.messageData.get(currentId);
        if (mesList) {
            const indexTar = mesList.findIndex(mesItem => mesItem.messageId == mes.messageId);
            if (indexTar > -1) {
                mesList[indexTar].myReadDeadTime = myReadDeadTime;
                mesList[indexTar].readDeadTime = readDeadTime;
                this.messageData.set(currentId, mesList);
            }
        }
    }

    @action setTop = (chatId: string, isTop: boolean) => {


        const targetChat = this.chats.find(item => item.id == chatId);
        // console.log(targetChat, "????????????",this.chats)
        if (targetChat) {
            targetChat.isTop = isTop
        }
        this.chatSort()
        // throw new Error("sfsdf")
    }

    @action setNotice = (chatId: string, isNotice: boolean) => {
        let chatList = this.chats
        let targetIndex = chatList.findIndex(item => item.id == chatId);
        if (targetIndex > -1) {

            chatList[targetIndex].isNotice = isNotice;

        }
        this.chatSort()
    }

    @action resetChats = () => {
        this.chats = observable([]);
    }
    @action reset = () => {
        this.resetChats();
        this.currentChatInitData = this.currentChatInitData;
        let gm: GroupMember = {};
        this.messageData = observable(new Map());
        this.groupMemberData = observable(gm);
        this.isMesSel = false;
        this.unReadMsgs = new Map();
        this.currentChatData = this.currentChatInitData;
        mesDataCache.resetData();
    }

    //?????????????????????
    @action initData = () => {
        this.reset()
    }

    @action setChats(_chats: ChatList): void {
        this.chats.replace(_chats);
    }
    @action setMessageLoading = (messageId: string) => {
        this.messageStatus.set(messageId, MessageStatusType.loading)
    }
    @action setMessageReaded = (message: MessageItem) => {
        if (this.messageStatus.has(message.content)) {
            this.messageStatus.delete(message.content)
        }
    }
    /**
     * ???????????? ??????
     */
    @action setMessageSendOk = (messageId: string) => {
        if (this.messageStatus.has(messageId)) {
            this.messageStatus.set(messageId, MessageStatusType.sent)
        }
    }
    /**
     * ??????????????????
     */
    @action addToChats = (_chatItem: ChatItem) => {

        // return new Promise((r, j) => {
        //     let addTime = setTimeout(() => {
        //         clearTimeout(addTime);
        const targetIndex = this.chats.findIndex(item => item.id == _chatItem.id)
        if (targetIndex < 0) {
            this.chats.unshift(_chatItem);
            this.setChats(this.chats)
            // this.chatSort(this.chats);
        } else {
            this.chats[targetIndex] = _chatItem;
        }
        // }, 0)
        // })

    }
    //??????????????????????????????
    @computed get currentChat() {
        const currentChat = this.chats.find((item: any) => this.currentChatData && item.id == this.currentChatData.id);
        if (currentChat) {
            return currentChat
        } else {
            //todo ?????????
            return this.chats[0];

        }
    }

    // ?????????????????????
    // isMyself ?????????????????????????????????
    @action addMessage = (id: string, message: MessageItem, isMyself?: boolean) => {
        this.messageStatus.set(message.messageId, MessageStatusType.loading);

        if (this.currentChatData.id == id) {
            this.recoverMessage(id, message);
        }
        // ????????????????????? ???????????????id ?????????
        const isMyIdSendMes = message.fromUserId == systemStore.userId;

        if (isMyIdSendMes && !isMyself) {
            this.messageStatus.set(message.messageId, MessageStatusType.sent);
        }
    }

    playAudio = () => {
        let noticeAudio = msgAudioUrl;
        let audio = new Audio(noticeAudio);
        audio.play(); //??????
    }

    @action updtateContent = (mes: MessageItem) => {

        let currentId = this.currentChatData.id;

        let mesList = this.messageData.get(currentId);
        if (mesList) {
            const indexTar = mesList.findIndex(mesItem => mesItem.messageId == mes.messageId);
            if (indexTar > -1) {
                mesList[indexTar].content = mes.content ? mes.content : '';
                mesList[indexTar].location_x = mes.location_x ? mes.location_x : '';
                mesList[indexTar].location_y = mes.location_y ? mes.location_y : '';
                this.messageData.set(currentId, mesList);
            }
        }
    }
    @action batchRecoverMessage = (msgMap: Map<string, MessageItem[]>) => {

        msgMap.forEach((items: MessageItem[], key: string) => {
            if (Boolean(this.messageData.get(key))) {
                let msgd = this.messageData.get(key) || [];
                let tempmsgs = msgd.slice().concat(items);
                this.messageData.set(key, tempmsgs);
            } else {
                this.messageData.set(key, items);
            }
        })
    }

    /**
     * ??????????????????
     */
    @action recoverMessage = (id: string, message: MessageItem) => {
        let msgd = this.messageData.get(id + '') || []
        msgd.push(message);
        if (msgd.length > this.limit + 50) {
            msgd = msgd.slice(-this.limit)
            msgd = msgd.map(item => ({
                ...item,
                content: item.contentType === MessageType.DOUBLE_WITHDRAW ? '' : item.content
            }))
        }

        this.messageData.set(id + '', [...msgd]);
    }
    //???????????? ??????
    @action updateMesStatus = (msgId: string, status: MessageStatusType) => {
        this.messageStatus.set(msgId, status);
    }
    //??????????????????
    @action mesSendTimeOut = (msgId: string) => {
        if (this.messageStatus.get(msgId) == MessageStatusType.loading) {
            this.messageStatus.set(msgId, MessageStatusType.error);
        }
    }
    //??????????????? ??????
    @action updateMes = (content: string, time: string, id?: string) => {
        if (!content || !time) {
            return;
        }
        const _id = id ? id : this.currentChatData.id
        const targetIndex = this.chats.findIndex(item => item.id == _id);
        if (targetIndex > -1) {
            this.chats[targetIndex].lastContent = content;
            this.chats[targetIndex].lastTime = time;
            if (!this.chats[targetIndex].isTop) {
                this.chatSort();
            }

        }
    }
    //??????@????????????
    @action clearMentionText = (id: string) => {

        let currentId = this.currentChatData.id;
        if (id == currentId) {
            return;
        }
        const changeChat = this.chats.find((chat: any) => chat.id == id);
        if (changeChat) {
            changeChat.mentionText = ''
        }
    }
    editGetHistoryData = (_result: any, id: string, isoldMes?: boolean, _startTime?: number, _endTime?: number) => {
        const startTime = Math.floor(_startTime || 0);
        const endTime = Math.floor(_endTime || 0);
        if (Array.isArray(_result) && _result.length > 0) {
            //?????????chatmessage ??????
            let _mesTarget = this.messageData.get(id + '') || [];
            const messageMap = {}
            _mesTarget.forEach(item => {
                if (!item) {
                    return;
                }
                messageMap[item.messageId + ''] = true;
            })
            let addMesList: MessageItem[] = [];
            //???????????????????????????????????????????????????
            const result = !isoldMes ? [..._result].reverse() : _result
            result.forEach((xmppmsg: any) => {
                if (messageMap[xmppmsg.messageId]) {
                    if (!_mesTarget) return;
                    const indexTar = _mesTarget.findIndex(mesItem => mesItem.messageId == xmppmsg.messageId);
                    if (indexTar > -1) {
                        _mesTarget[indexTar].unreadCount = xmppmsg.unreadCount;
                        this.messageData.set(xmppmsg.messageId + '', _mesTarget);
                    }
                } else {
                    messageMap[xmppmsg.messageId] = true;
                    let msg = JSON.parse(xmppmsg.body.replace(/&quot;/gm, '"'));
                    if (MesaageTips.indexOf(msg.type) == -1) {
                        msg.isRead = xmppmsg.isRead;
                        msg.fromJid = xmppmsg.sender_jid;
                        msg.toJid = msg.toJid ? msg.toJid : xmppmsg.receiver_jid;
                        msg.id = xmppmsg.messageId;
                        msg.messageId = xmppmsg.messageId;
                        msg.unreadCount = xmppmsg.unreadCount;
                    }
                    // console.log('???????????????',msg)
                    msg.content = webIM.decryptMessage(msg);
                    if (msg.chatType != undefined) {
                        msg.chatType = msg.chatType == ChatType.GROUPCHAT ? ChatType.GROUPCHAT : ChatType.CHAT;
                    } else if (xmppmsg.message) {
                        try {
                            let eleMes: HTMLElement = document.createElement('message');
                            eleMes.innerHTML = xmppmsg.message;
                            const _typeDom = eleMes.getElementsByTagName('message');
                            if (_typeDom && _typeDom[0]) {
                                const _type = _typeDom[0].getAttribute('type');
                                if (_type) {
                                    msg.chatType = _type == ChatType.GROUPCHAT ? ChatType.GROUPCHAT : ChatType.CHAT
                                }
                            }
                        } catch (e) {
                            console.error('??????xml ?????????', e)
                        }
                    }
                    // else{
                    //     webIM.converGroupMsg(msg)
                    // }
                    let isInLimit = false;
                    let msgTS = Math.floor(msg.timeSend) || 0;
                    if (startTime && endTime) {
                        isInLimit = endTime >= msgTS && msgTS >= startTime;
                    } else if (startTime) {
                        isInLimit = msgTS >= startTime;
                    } else if (endTime) {
                        isInLimit = msgTS <= endTime;
                    } else {
                        isInLimit = true;
                    }
                    if (isInLimit) {
                        addMesList.push(msg);
                        isOpenDB && msg && insertMessage(msg);
                        // console.log('?????????3',msg.content)
                        msg && mesDataCache.addmes(msg, '', isoldMes);
                    }
                }
            })
            return !isoldMes ? addMesList : [...addMesList].reverse();
        }
        return []

    }

    getMesTimer: NodeJS.Timeout;
    /**
     * ???????????? ??? ????????????
     */
    @action getChatMessages = async (id: string, startTime?: number | string, isGroup?: boolean, limit?: number, offset?: number, gid?: string) => {
        let targetList: MessageItem[] = [];
        // const timeCUr = new Date().valueOf();
        const limitDefault = 30;
        const amountMsg = limit ? limit : (offset ? offset : limitDefault);
        if (id == this.currentChatData.id) {
            if (!startTime) {
                this.loadingChatDetailData = true;
            }


            let mesTarget = this.messageData.get(id + '') || [];
            let offsetMes = 0;
            if (mesTarget && mesTarget.length > 0) {
                offsetMes = mesTarget.length
            }
            const msgList = mesDataCache.getMesListByChatIdWithPage(id + '', offsetMes, amountMsg);
            // console.log('??????????????????', msgList);
            if (Array.isArray(msgList)) {
                targetList = [...msgList].reverse();
            }
            if (id == this.currentChatData.id && Array.isArray(msgList)) {
                // const mesTarget = this.messageData.get(id);
                // let targetList = mesTarget?mesTarget:[];

                /**
                 * ????????????????????????
                 */
                const dataLastMsgTime = msgList.length > 0 ? (Number(msgList[0].timeSend) > Number(msgList[msgList.length - 1].timeSend) ? Number(msgList[0].timeSend) : Number(msgList[msgList.length - 1].timeSend)) || 0 : 0;
                /**
                 * ????????????????????????
                 */
                let result = null;

                /**
                 * ???????????????????????????????????????
                 */
                let getServerMes: MessageItem[] = [];
                /**
                 * ?????????????????????????????? true ????????? fasle=??? ??????????????????
                 */
                const currentChat = this.chats.find(item => item.id == id);
                let mesNeedNew = false;
                let getServerStartTime = 0;
                let getServerEndTime = 0;
                let hasGoServer = false;
                if (!startTime) {
                    if (currentChat && (
                        !dataLastMsgTime
                        || Math.floor(Number(currentChat.lastTime)) > Math.floor(dataLastMsgTime)
                    )) {
                        // console.log('????????????????????????', currentChat.lastTime, msgList[0].timeSend)
                        getServerStartTime = Number(dataLastMsgTime) || 0;
                        getServerEndTime = Number(currentChat.lastTime) >= 1 ? Number(currentChat.lastTime) || 0 : 0;
                        result = await webIM.timeOutGetHistoryServer(0, getServerStartTime, getServerEndTime, currentChat.type == ChatGrOrFrType.group, id, amountMsg);
                        hasGoServer = true;
                        mesNeedNew = true;
                    }
                }
                if (!result && !hasGoServer && Array.isArray(msgList) && msgList.length < Math.ceil(amountMsg * 0.6)) {
                    let _endTime = 0;
                    let _startTime = 0
                    if (msgList && msgList.length > 0) {
                        _endTime = Number(msgList[0].timeSend) || 0
                    } else if (startTime) {
                        _endTime = Number(startTime) || 0 // ???????????????????????? ??? ??????????????????????????? ??? ?????????????????????????????????
                    }
                    if (!_endTime) {
                        const _chat = this.lastChatMesMap.get(this.currentChatData.id);
                        if (_chat && _chat.timeSend) {
                            _endTime = _chat.timeSend
                        }
                    }
                    // console.log('????????????????????????', _endTime);
                    if (startTime && _endTime >= 1) {
                        _endTime = _endTime - 1;
                    }
                    getServerStartTime = _startTime;
                    getServerEndTime = _endTime ? _endTime : 0;
                    result = await webIM.timeOutGetHistoryServer(0, _startTime, _endTime ? _endTime : 0, Boolean(isGroup), id, amountMsg);
                    if (result) {
                        mesNeedNew = false;
                    }
                }
                if (result) {
                    getServerMes = this.editGetHistoryData(result, id, !mesNeedNew, Math.floor(getServerStartTime), Math.floor(getServerEndTime));
                    console.log('???????????????????????????????????????', getServerMes, mesNeedNew)
                }
                if (getServerMes.length > 0) {
                    if (mesNeedNew) {
                        targetList = targetList.concat(getServerMes);
                        targetList = this.distictMsg(targetList, []);
                    } else {
                        targetList = getServerMes.concat(targetList);
                        targetList = this.distictMsg(targetList, []);
                    }
                }
                let _targetMessageList = [];
                if (startTime) {
                    _targetMessageList = targetList.concat(mesTarget);

                } else {
                    _targetMessageList = targetList;

                }
                if (_targetMessageList.length != 0) {
                    _targetMessageList = this.messageWithEdit(_targetMessageList);
                    this.messageData.set(id + '', _targetMessageList);
                }
                if (!startTime && currentChat) {
                    let lastMesTime = targetList.length > 0 ? targetList[targetList.length - 1].timeSend : 0 + '';
                    if (!lastMesTime && currentChat.lastTime) {
                        lastMesTime = currentChat.lastTime + '';
                    }
                    this.getServerNewMes(id, lastMesTime, currentChat.type == ChatGrOrFrType.group);
                }
                if (amountMsg && targetList.length >= amountMsg) {
                    this.loadingChatDetailData = false;
                    this.getMesTimer && clearTimeout(this.getMesTimer)
                    return {
                        hasMore: true,
                        amount: targetList.length
                    }
                }
                this.loadingChatDetailData = false;
                this.getMesTimer && clearTimeout(this.getMesTimer)
                return {
                    hasMore: false,
                    amount: targetList.length
                }
            }
        }
        this.loadingChatDetailData = false;
        this.getMesTimer && clearTimeout(this.getMesTimer)
        return {
            hasMore: false,
            amount: 0
        }
    }
    messageWithEdit = (mesList: MessageItem[]) => {
        let _targetMessageList = [];
        if (Array.isArray(mesList) && mesList.length > 0) {
            _targetMessageList = mesList.map(item => {
                if (item.type && MesaageTips.indexOf(item.type) > -1) {
                    return webIM.converGroupMsg(item)
                }
                return item
            });
            _targetMessageList = _targetMessageList.sort((m1, m2) => m1.timeSend <= m2.timeSend ? -1 : 1);
        }
        return _targetMessageList
    }

    /**
     * ?????????????????? ?????????????????????????????? ??????????????????????????????????????????
     */
    @action getServerNewMes = async (id: string, startTime: string, isGroup: boolean) => {
        let _mesTarget = this.messageData.get(id + '') || [];
        let start_current = Number(startTime ? startTime : 0);
        const result_confirm = await webIM.getHistoryMsg(0, start_current, 0, isGroup, id, 100);
        if (Array.isArray(result_confirm) && result_confirm.length > 0) {
            let confirmEditMes = this.editGetHistoryData(result_confirm, id, false, Math.floor(start_current));
            // console.log('????????????????????????', 'confirmEditMes==>', confirmEditMes, 'start_current==>', start_current);
            if (Array.isArray(confirmEditMes) && confirmEditMes.length > 0) {
                _mesTarget = _mesTarget.concat(confirmEditMes);
                _mesTarget = this.distictMsg(_mesTarget, []);
                _mesTarget = this.messageWithEdit(_mesTarget);
                this.messageData.set(id + '', _mesTarget);
            }
        }
    }

    distictMsg = (originData: Array<MessageItem>, netData: Array<MessageItem>): Array<MessageItem> => {

        // console.log("originData?????????", originData.length, "netData?????????", netData.length)
        originData = _.uniq(originData, false, (item: any) => { return item.messageId });
        // originData =  _.uniq(originData, true, (item: any) => { return item.id});
        netData = _.uniq(netData, false, (item: any) => { return item.messageId });
        if (originData.length != 0 && netData.length != 0) {
            let exit: boolean = false;
            let originLen: number = originData.length;
            netData.forEach((item, index) => {
                for (let i = 0; i < originLen; i++) {
                    console.log(item.id == originData[i].id, item.id, originData[i].id);

                    if (item.messageId == originData[i].messageId || item.id == originData[i].id) {
                        exit = true;
                        break;
                    }
                }
                if (!exit) {
                    originData.push(item);
                }
            })

            return originData as any;
        }
        else if (originData.length == 0) {
            return netData as any;
        } else if (netData.length == 0) {
            return originData as any;
        } else {
            return [];
        }


    }

    timerChangeSelect: NodeJS.Timeout;
    //???????????? ?????? ????????????
    @action changeSelectChat = async (id: string): Promise<any> => {

        // console.log('??????????????????????????????????????????changeSelectChat=---->',this.currentChatData,id);
        if (this.currentChatData && this.currentChatData.id) {
            if (detailType.none != mainStore.detailType && id == this.currentChatData.id) {
                return;
            }
        }
        const changeChat = this.chats.find((chat: any) => chat.id == id);
        if (changeChat) {
            changeChat.mentionText = '';
            this.currentChatData = changeChat;
            // console.log('??????????????????????????????????????????changeSelectChat=---->', this.currentChatData.id,this.currentChat.name);
            // try {
            //     if (Utils.isGroup(changeChat.id)) {
            //         xmppSDK.joinGroupChat(changeChat.id, xmppSDK.userId, 0);
            //     }
            // } catch (e) {
            //     console.log('????????????');

            // }
            this.messageData.clear();
            this.getChatMessages(changeChat.id,
                undefined,
                changeChat.type == ChatGrOrFrType.group,
                undefined,
                undefined,
                changeChat.gid ? changeChat.gid : undefined);
            mainStore.changeShowDetailType(detailType.message);
            this.timerChangeSelect && clearTimeout(this.timerChangeSelect);
            //todo  ??????????????? ???????????????
            this.timerChangeSelect = setTimeout(() => {
                this.timerChangeSelect && clearTimeout(this.timerChangeSelect);
                this.getUserOrGroupInfo(changeChat);
                // this.getUserOrGroupInfo(this.currentChatData);
                // console.log(this.currentChatData.id, '666666');
                this.sendMessagesReadReceipt(changeChat);
                // this.sendMessagesReadReceipt(this.currentChatData);
                //?????????????????????
                // this.getOffsetMsg(id);
            }, 0)
            //todo ??????????????????
        }
    }
    /**
     * ??????????????????????????????
     */
    lastChatMesMap: Map<string, any> = new Map();

    /**
     * ??????????????????????????????????????????
     */
    @action editNewChatsList = (lastMessageList: any) => {
        // console.log('????????????????????????', lastMessageList);
        if (Array.isArray(lastMessageList)) {
            lastMessageList.forEach((item: any) => {
                const isMySend = item.from == systemStore.userId;
                const id = item.isRoom ? item.jid : (isMySend ? item.to : item.from);
                this.lastChatMesMap.set(id + '', item);
                const messageItem = MessageItem.getMessageBylastmes(item);
                this.updateChatlistMyLastmes(messageItem);
            })
        }
        this.chatSort();
    }
    /** ?????????????????? (????????????)*/
    @action getOffsetMsg = async (id: string | number) => {
        //??????????????????6??????????????????????????????
        // ???????????????????????????

        let time = webIM.getServerTime();
        let hmsg = await webIM.timeOutGetHistoryServer(0, time - 1 * 12 * 60 * 60, time, Utils.isGroup(id + ''), id + '');



        if (Array.isArray(hmsg) && hmsg.length > 0) {
            // console.log('??????????????????12???????????????????????????-->', hmsg.length);
            // ???????????????????????????
            let abcMsg = hmsg.map((xmppmsg: any) => {
                let msg = JSON.parse(xmppmsg.body.replace(/&quot;/gm, '"'));
                if (MesaageTips.indexOf(msg.type) == -1) {
                    msg.isRead = xmppmsg.isRead;
                    msg.fromJid = xmppmsg.sender_jid;
                    msg.toJid = xmppmsg.receiver_jid;
                    msg.id = xmppmsg.messageId;
                    msg.messageId = xmppmsg.messageId;

                    // console.log('???8888 getOffsetMsg');
                    msg.content = webIM.decryptMessage(msg);

                    msg.chatType = Utils.isGroup(msg.fromJid) ? ChatType.GROUPCHAT : ChatType.CHAT;
                    return msg;
                } else {
                    return null;
                }
            });


            let tempMsgs: any = this.messageData.get(id as any);
            //?????????????????????????????? ??????
            if (tempMsgs && id == '10000') {
                return;
            }

            // console.log('?????????????????????-->', tempMsgs.length);
            if (tempMsgs && tempMsgs.length > 0) {
                let emp = abcMsg.filter((item: any) => { return !!item });
                // console.log('???????????????--->', emp.length);

                emp.reverse().map((info: any) => {

                    let exist = tempMsgs.filter((item: any) => { return item.messageId == info.messageId; });

                    // console.log('?????????????????????????????????-->', exist.length);
                    if (exist && exist.length == 0) {
                        isOpenDB && insertMessage(info);
                        // console.log('?????????4',info.content)
                        mesDataCache.addmes(info)
                        tempMsgs.push(info);
                        //??????????????????????????????
                        this.updateMes(info.content || '', info.timeSend || '');
                        // console.log('????????????',info.content || '' , info.timeSend);
                        this.messageData.set(id as string, tempMsgs);
                        console.log('??????????????????-->', info);
                    }
                })
            } else {
                let temps = abcMsg.filter((item: any) => { return item }).map((item: any) => {
                    isOpenDB && insertMessage(item);
                    // console.log('?????????5',item.content)
                    mesDataCache.addmes(item);
                    return item;
                })
                //??????????????????--------------------------------
                temps = temps.reverse();
                this.batchCreateMsg(temps, new Map());
            }

            this.sortMsg(id);
        }
    }


    @action sortMsg = (_id: any) => {
        let msgs = this.messageData.get(_id);
        if (msgs && msgs.length > 0) {
            let tempList = msgs.slice();

            tempList.sort((a: MessageItem, b: MessageItem) => {
                if (a.timeSend > b.timeSend) {
                    return 1;
                } else {
                    return -1;
                }
            })

            this.messageData.set(_id + '', tempList);

        }
    }

    /** ???????????????????????????????????? */
    @action changeCurrentChat = async (_fg: FriendItem | GroupItem): Promise<any> => {
        const isSame = this.chats.find((chat: ChatItem) => {
            return _fg['toUserId'] == this.currentChatData.id || _fg['jid'] == this.currentChatData.id || _fg['id'] == this.currentChatData.id
        });
        if (detailType.none != mainStore.detailType && isSame) {
            return;
        }
        // ------------?????????????????????????????????
        const changeChat = this.chats.find((chat: ChatItem) => {
            return _fg['toUserId'] == chat.id || _fg['jid'] == chat.id || _fg['id'] == chat.id
        });
        if (changeChat) {
            this.getChatMessages(changeChat.id)
            if (changeChat.lastContent == notShowContent) {
                changeChat.lastContent = '';
                changeChat.lastTime = '';
            }
            this.currentChatData = changeChat;
        } else {
            const currentChatData = ChatItem.getChatItem(_fg);
            this.currentChatData = currentChatData;
            this.getChatMessages(currentChatData.id)
            try {
                if (Utils.isGroup(this.currentChatData.id)) {
                    xmppSDK.joinGroupChat(this.currentChatData.id, xmppSDK.userId, 0);
                }
            } catch (e) {
                console.log('????????????');
            }

            setTimeout(() => {
                //todo: ??????????????????????????????????????????
                // this.messageData.set(currentChatData.id, [])
                // this.getNewChatDBAndNetData(currentChatData.id);
                // this.currentChatData = currentChatData;
                this.currentChatData.lastContent = '';
                this.chats.push(this.currentChatData);
                this.chatSort();
            }, 80)
        }

        if (this.currentChatData) {
            await this.getUserOrGroupInfo(this.currentChatData);
            this.messageData.clear();
            this.getChatMessages(this.currentChatData.id,
                undefined,
                this.currentChatData.type == ChatGrOrFrType.group,
                undefined,
                undefined,
                this.currentChatData.gid ? this.currentChatData.gid : undefined);
            // ???????????? ?????? ???????????????
            mainStore.changeShowDetailType(detailType.message);
            this.sendMessagesReadReceipt(this.currentChatData);
        }

    }




    //???????????????????????????
    // @action cheackHasCurrent = async (_chatItem: ChatItem): Promise<any> => {
    //     try {
    //         if (this.currentChatData) {
    //             if (Utils.isGroup(_chatItem.id)) {
    //                 const group = await imsdk.getRoom(_chatItem.gid);
    //                 console.log('?????????????????????');
    //                 if (group.resultCode == 1 && group.data) {

    //                 }
    //         }
    //     }
    //     } catch (e) {
    //         console.log('getUserOrGroupInfo--------?????????');
    //     }
    // }

    @action getUserOrGroupInfo = async (_chatItem: ChatItem): Promise<any> => {
        try {
            // console.log('??????????????????', this.currentChatData, _chatItem)
            if (this.currentChatData) {
                // ????????????|?????????
                if (Utils.isGroup(_chatItem.id)) {
                    const group = await imsdk.getRoom(_chatItem.gid);
                    //??????????????????????????????
                    if (this.currentChatData.id != _chatItem.id) {
                        return
                    }
                    if (group.resultCode == 1 && group.data) {
                        _chatItem.desc = '???????????????' + group.data.userSize;
                        this.currentChatData.desc = group.data.desc ? group.data.desc + '' : '';
                        // this.currentChatData.allowFriends = group.data.allowSendCard == '1';
                        // this.currentChatData.msgTalkTime = Number(group.data.talkTime ? group.data.talkTime : 0);
                        // this.currentChatData.groupInvitNeedTest = group.data.isNeedVerify == '1';
                        this.groupControlState.set('allowFriends', group.data.allowSendCard == '1');
                        this.groupControlState.set('msgTalkTime', Number(group.data.talkTime > 0 ? group.data.talkTime : 0));
                        this.groupControlState.set('groupInvitNeedTest', group.data.isNeedVerify == '1');
                        // console.log('???????????????', this.groupControlState, group.data);
                        if (!this.currentChat.role && group.data.role) {
                            this.currentChat.role = group.data.role;
                        }
                        // console.log('????????????3333',group.data)
                        this.currentChatData.isBacklock = group.data && group.data.s == 1 ? false : true;
                        this.currentChat.nickname = group.data
                            && group.data.member
                            && group.data.member.nickname
                            ? group.data.member.nickname
                            : ""
                        if (group.data.member) {
                            this.currentChatData.role = Number(group.data.member.role);
                        }
                    } else {
                        // console.log('user-getUserOrGroupInfo->', group);
                    }
                } else {
                    this.currentChatData.remarkName = _chatItem.remarkName || '';
                    const user = await imsdk.getUser(_chatItem.id);
                    //??????????????????????????????
                    if (this.currentChatData.id != _chatItem.id) {
                        return
                    }
                    // console.log('??????????????????');

                    if (user.resultCode == 1 && user.data) {
                        _chatItem.desc = Utils.getTimeText(user.data.showLastLoginTime, 1, 1) + '??????';
                        const friendData = user.data.friends;
                        // console.log('user-getUserOrGroupInfo->', friendData);
                        if (friendData) {
                            let remarkName = friendData.remarkName || '';
                            friendStore.changeRemark(friendData.toUserId, remarkName);
                            if (_chatItem.remarkName != remarkName) {
                                this.currentChatData.remarkName = remarkName;
                            }
                            // if(friendData.status!=2){
                            //     friendStore.addDefaultFriend(_chatItem.id);
                            // }

                        }
                    } else {
                        // console.log('user-getUserOrGroupInfo->', user);
                    }
                    // console.log(user, ' ????????????|?????????');

                }
            }
        } catch (e) {
            console.log('getUserOrGroupInfo--------?????????');

        }

    }
    groupStatusTypeWithServerKey = {
        msgTalkTime: 'talkTime',
        allowFriends: 'allowSendCard',
        groupInvitNeedTest: 'isNeedVerify',
    }
    //??????????????????
    forbitTime = 1000 * 60 * 60 * 24 * 7;
    //?????? ???????????? ???????????? ??????
    @action changeGroupStatusWithServer = async (type: string) => {
        this.changeGroupStatus(type);
        let updateResult = this.groupControlState.get(type) ? 1 : 0;


        if (type == 'msgTalkTime') {
            updateResult = this.groupControlState.get(type) ? this.forbitTime : 0
        }
        const res = await imsdk.updateGroupState(this.currentChatData.gid, this.groupStatusTypeWithServerKey[type], updateResult + ''),
            isOk = res && res.resultCode == 1
        if (!isOk) {
            this.changeGroupStatus(type);
        }

        return isOk
    }
    @action changeGroupStatus = (type: string, value?: number | boolean) => {
        if (value != undefined) {
            this.groupControlState.set(type, value);
            return;
        }
        if (this.groupControlState.get(type)) {
            this.groupControlState.set(type, typeof this.groupControlState.get(type) == 'number' ? 0 : false);
        } else {
            this.groupControlState.set(type, typeof this.groupControlState.get(type) == 'number' ? this.forbitTime : true);
        }
    }

    /**?????????????????? */
    @action sendMessagesReadReceipt = (_chat: ChatItem) => {
        if (!_chat) {
            return;
        }
        if (this.currentChatData.id != _chat.id || _chat.id === '') {
            return
        }
        if ((systemStore.isOpenGroupOwnerRead == 0 && _chat.type) || _chat.role == 1 || !isOpenRead) {
            this.unReadMsgs.delete(_chat.id + '');
            return;
        }


        let existUnReadMsg: MessageItem[] | undefined = this.unReadMsgs.get(_chat.id + '');
        let msgIds = '';
        if (existUnReadMsg && !systemStore.ismin) {

            existUnReadMsg.map((item, index: number) => {
                if (!item.isRead) {
                    //??????????????????????????????
                    if (item.chatType && item.chatType != 'groupchat')
                        webIM.sendMessageRead(item.fromUserId, item.from, item.messageId);
                    else {
                        let groupOwerId = groupStore.getOwerId(_chat.id);
                        if (groupOwerId == item.fromUserId)
                            msgIds += (item.messageId + ',')
                    }

                }
            });
            if (msgIds !== '')
                imsdk.reportReadMsg(this.currentChatData.gid, msgIds)

            this.unReadMsgs.delete(_chat.id + '');
        }
    }

    //??????????????????
    @action setUnRendMsgStatus = (msgStatus: { string: MessageItem[] }) => {
        for (let key in msgStatus) {
            const existStatus = this.unReadMsgs.get(key + '');
            if (existStatus) {
                let existArray = existStatus.slice();
                existArray = existArray.concat(msgStatus[key]);
                this.unReadMsgs.set(key + '', existArray);
            } else {
                this.unReadMsgs.set(key + '', msgStatus[key]);
            }
        }
    }


    //????????????????????????
    @action setMsgSendStatus = (msgStatus: any) => {
        this.messageStatus = msgStatus;
    }

    tranUnreadMsgs = () => {
        let retData = {}
        this.unReadMsgs.forEach((msgs, key) => {
            if (msgs) {
                retData[key] = msgs.map(item => {
                    return { from: item.from, messageId: item.messageId }
                })
            }
        })
        return retData;
    }
    getChatItemById = (_id: string): ChatItem | undefined => {
        return this.chats.find((item: any) => {
            return item.id == _id;
        })
    }



    /**??????????????????  (????????????)*/
    @action batchCreateMsg = (msgs: MessageItem[], msgMap: Map<string, MessageItem[]>) => {

        let chatSet: Set<any> = new Set();
        msgs.map((item: MessageItem) => {
            let chatItem;
            if (item.fromUserId && item.fromUserId == webIM.userId && !Utils.isGroup(item.toUserId)) { //??????????????? ????????????????????????
                chatItem = this.getChatItemById(item.toUserId);
            } else if (item.chatType == ChatType.GROUPCHAT && item.fromUserId != '10000') {
                chatItem = this.getChatItemById(item.toUserId);
            } else {
                item.chatType = (Utils.isGroup(item.jid || item.fromUserId) ? "groupchat" : "chat");
                chatItem = this.getChatItemById(item.jid || item.fromUserId);
            }
            if (chatItem) {
                chatItem.lastTime = item.timeSend;
                // this.addMessage(chatItem.id, item);
            } else {
                let entity: FriendItem | GroupItem | undefined;
                if (item.fromUserId && item.fromUserId == webIM.userId && !Utils.isGroup(item.toUserId)) {
                    entity = groupStore.getGroupByJid(item.toUserId);
                }
                else if (item.chatType == ChatType.GROUPCHAT) {
                    entity = groupStore.getGroupByJid(item.jid || item.toUserId);
                } else {
                    entity = friendStore.getFriendById(item.fromUserId);
                }
                if (entity) {
                    chatItem = ChatItem.getChatItem(entity);
                    chatSet.add(chatItem);
                }
            }

            // TODO ??????????????????,???????????????????????????

            // console.log('??????????????????', message.type);

            if (MessageType.REVOKE == item.type) {
                item.messageId = item.content;
                item.contentType = item.type;
                if (webIM.userId == item.fromUserId) {
                    item.content = '????????????????????????'
                } else {
                    item.content = `${item.fromUserName} ?????????????????????`
                }
            }

            this.messageStatus.set(item.messageId, MessageStatusType.sent);

            //TODO ?????????????????????
            // const isMyIdSendMes = item.fromUserId == systemStore.userId;

            // if (isMyIdSendMes && !isMyself) {
            //     this.messageStatus.set(item.messageId, MessageStatusType.sent);
            // }


            // if (chatItem && this.currentChatData.id == chatItem.id) {
            //     // ??????????????????????????????????????????
            //     if (item.chatType != "groupchat") {
            //         webIM.sendMessageRead(item.fromUserId, item.from, item.messageId);
            //     }
            // } else {
            //     if (chatItem) {
            //         let existUnReadMsg: MessageItem[] | undefined = this.unReadMsgs.get((chatItem as ChatItem).id + '');
            //         if (existUnReadMsg) {
            //             this.unReadMsgs.set(chatItem.id + '', [...existUnReadMsg, item]);
            //         } else {
            //             this.unReadMsgs.set(chatItem.id + '', [item])
            //         }
            //     }
            // }
            if (chatItem) {
                let content = '';
                // ??????????????? type ???????????? contentType?????? ????????????
                let targetType = item.type;
                if (item.contentType &&( item.contentType && item.chatType == ChatType.GROUPCHAT) || item.contentType == MessageType.REVOKE) {
                    targetType = item.contentType;
                }
                if (targetType) {
                    if (targetType == MessageType.TEXT || targetType == MessageType.TEXT_REPLY) {

                        // console.log('???9999 batchCreateMsg');
                        content = webIM.decryptMessage(item);
                    } else {
                        if (MessageTypeWithSubName[targetType]) {
                            content = MessageTypeWithSubName[targetType];
                        } else {
                            content = "???????????????????????????????????????";
                        }
                    }
                }
                chatItem.lastContent = Utils.htmlRestore(content);
                //@?????????????????? ????????? ????????????
                if (item.objectId && item.toUserId != this.currentChatData.id && item.type == MessageType.TEXT) {
                    if (item.objectId == chatItem[mentionsAllKey]) {
                        chatItem.mentionText = '@????????????';
                    } else {
                        if (item.objectId.indexOf(systemStore.userId) > -1) {
                            chatItem.mentionText = '??????@???';
                        }
                    }
                }
            }

            if (chatItem) {
                let msgValue = msgMap.get(chatItem.id);
                if (msgValue) {
                    msgValue.push(item);
                } else {
                    msgMap.set(chatItem.id, [item])
                }
            }

            return chatItem;
        });

        this.batchAddToChats(Array.from(chatSet));
        this.batchAddMessage(msgMap);

    }
    /** ?????????????????????????????????????????????????????????  (????????????)*/
    getNewChatDBAndNetData = async (_id: any) => {

        let isGroup = false;
        if (Utils.isGroup(_id)) {
            isGroup = true;
        }
        let findData = await find({ fromUserId: _id, _sortField: 'timeSend', _currentPage: 0, _pageNum: 1000, _desc: -1, isGroup, myUserId: webIM.userId });

        if (findData) {

            // console.log('???000000 getNewChatDBAndNetData');
            findData.map((item: any) => {
                item.content = webIM.decryptMessage(item);
                // console.log('getNewChatDBAndNetData item.type---->',item.content);

            });
            this.messageData.set(_id, findData);
        } else {
            this.messageData.set(_id, []);
        }
        // await this.getOffsetMsg(_id);
    }


    /**?????????????????? */
    @action batchAddMessage = (msgMap: Map<string, MessageItem[]>) => {
        msgMap.forEach((items: MessageItem[], key: string) => {
            let msgs = this.messageData.get(key);
            if (msgs) {
                let mlist = msgs.slice();
                mlist = mlist.concat(items);
                mlist = _.sortBy(mlist, "timeSend");
                mlist = _.uniq(mlist, true, info => { return info.messageId });
                this.messageData.set(key, mlist);
            } else {
                let itemsA = _.sortBy(items, "timeSend");
                let itemsB = _.uniq(itemsA, true, info => { return info.messageId });
                this.messageData.set(key, itemsB);
            }
        })
        //????????????????????????
        // listForceUpdate.updateChatList();
        // // ????????????????????? ???????????????id ?????????
        // const isMyIdSendMes = message.fromUserId == systemStore.userId;

        // if (isMyIdSendMes && !isMyself) {
        //     this.messageStatus.set(message.messageId, MessageStatusType.sent);
        // }
    }

    //??????????????????
    @action batchAddToChats = (_chatItem: any[]) => {

        if (_chatItem.length > 0) {
            this.chats.unshift(..._chatItem);
        }

        let _chats = _.uniq(this.chats.slice(), false, (item: ChatItem) => { return item.id });
        this.chatSort(_chats);
    }

    /**
     * ??????????????? by last Data
     * @msg ????????????
     */
    @action updateChatlistMyLastmes = (msg: MessageItem) => {
        if (!msg) {
            return
        }
        const isMesFromMe = msg.fromUserId == systemStore.userId;
        const userId = isMesFromMe ? msg.toUserId || msg.to : msg.fromUserId || msg.from;
        let chatItem;
        if (msg.chatType == ChatType.CHAT) {
            chatItem = this.getChatItemById(userId);
        } else {
            msg.chatType = msg.chatType ? msg.chatType : (Utils.isGroup(msg.jid || userId) ? "groupchat" : "chat");
            chatItem = this.getChatItemById(msg.jid || userId);
        }
        if (chatItem) {
            if (chatItem.lastContent == notShowContent) {
                return;
            }
            chatItem.lastTime = msg.timeSend;
        } else {
            let entity: FriendItem | GroupItem | undefined;
            if (msg.chatType == ChatType.GROUPCHAT) {
                entity = groupStore.getGroupByJid(msg.jid || msg.toJid || userId);
            } else {
                entity = friendStore.getFriendById(userId);
            }
            if (entity) {
                chatItem = ChatItem.getChatItem(entity);
                chatItem.lastTime = msg.timeSend;
            }
        }
        if (chatItem) {
            let content = '';
            // ??????????????? type ???????????? contentType?????? ????????????
            let targetType = msg.type;
            // let targetType = item.contentType;
            if ((msg.contentType && msg.contentType && msg.chatType == ChatType.GROUPCHAT) || msg.contentType == MessageType.REVOKE || msg.contentType == MessageType.DOUBLE_WITHDRAW) {
                targetType = msg.contentType;
            }
            if (targetType) {
                if (targetType == MessageType.TEXT) {
                    content = msg.content;
                } else {
                    if (MessageTypeWithSubName[targetType]) {
                        content = MessageTypeWithSubName[targetType];
                    } else {
                        content = "???????????????????????????????????????";
                    }
                }
            }
            //????????????????????????
            chatItem.lastContent = Utils.htmlRestore(content);

            //@?????????????????? ????????? ????????????
            if (msg.objectId && msg.toUserId != this.currentChatData.id && msg.type == MessageType.TEXT) {
                if (msg.objectId == chatItem[mentionsAllKey]) {
                    chatItem.mentionText = '@????????????';
                } else {
                    if (msg.objectId.indexOf(systemStore.userId) > -1) {
                        chatItem.mentionText = '??????@???';
                    }
                }
            }
            this.addToChats(chatItem);
        }
    }

    /**
     * ???????????? ?????? ????????????
     */
    // todo  ????????????  1????????? ???????????????????????? FriendItem 2????????? GroupItem
    @action createChatItemsByMsgs = (msgs: MessageItem[], ignore: boolean = false) => {
        let chatItem: any;
        msgs.map(item => {
            if (item.contentType === MessageType.DOUBLE_WITHDRAW) {
                item.content = ''
            }

            //??????xmpp???????????????????????????????????????

            // if (item.type == MessageType.NEW_MEMBER)
            console.log('??????????????????????????????-->', item);

            if (item.chatType == ChatType.GROUPCHAT) {
                chatItem = this.getChatItemById(item.toUserId || item.from);
            } else {
                item.chatType = item.chatType ? item.chatType : (Utils.isGroup(item.jid || item.fromUserId) ? "groupchat" : "chat");
                chatItem = this.getChatItemById(item.jid || item.fromUserId);

            }
            // console.log('?????????????????????????????????', chatItem, item,groupStore.groupList);
            if (chatItem) {
                chatItem.lastTime = item.timeSend;
                this.addToChats(chatItem);
                this.addMessage(chatItem.id, item);
            } else {

                let entity: FriendItem | GroupItem | undefined;
                if (item.chatType == ChatType.GROUPCHAT) {
                    entity = groupStore.getGroupByJid(item.jid || item.toUserId);
                } else {
                    entity = friendStore.getFriendById(item.fromUserId);
                }
                // console.log('?????????????????????????????????4444', entity);
                if (entity) {
                    chatItem = ChatItem.getChatItem(entity);
                    chatItem.lastTime = item.timeSend;
                    this.addToChats(chatItem);
                    this.addMessage(chatItem.id, item);
                } else {
                    //?????????????????????????????????
                    // if (item.contentType) return;
                    if (item.chatType == ChatType.CHAT) {
                        chatItem = ChatItem.getChatItem(item);
                        chatItem.id = item.fromUserId;
                        chatItem.name = item.fromUserName ? item.fromUserName : '';
                        chatItem.type = ChatGrOrFrType.friend;
                        chatItem.lastContent = item.content ? item.content : '';
                        chatItem.lastTime = item.timeSend ? item.timeSend : new Date().getTime() + '';
                        // this.addToChats(chatItem);
                        // this.addMessage(chatItem.id, item);
                        friendStore.addDefaultFriend(item.fromUserId, item);
                    }


                }
            }
            // ????????????????????????
            if (chatItem) {
                //??????????????????
                let existUnReadMsg: MessageItem[] | undefined = this.unReadMsgs.get((chatItem as ChatItem).id + '');
                if (existUnReadMsg) {
                    existUnReadMsg.push(item);
                    this.unReadMsgs.set(chatItem.id + '', existUnReadMsg);
                } else {
                    chatItem && this.unReadMsgs.set(chatItem.id + '', [item]);
                }
                this.sendMessagesReadReceipt(this.currentChatData);

                //??????????????????
                let content = '';
                // ??????????????? type ???????????? contentType?????? ????????????
                let targetType = item.type;
                // let targetType = item.contentType;
                if ((item.contentType && item.contentType && item.chatType == ChatType.GROUPCHAT) || item.contentType == MessageType.REVOKE || item.contentType == MessageType.DOUBLE_WITHDRAW) {
                    targetType = item.contentType;
                }
                if (targetType) {
                    if (targetType == MessageType.TEXT || targetType == MessageType.TEXT_REPLY) {
                        content = item.content;
                    } else {
                        const _type = targetType == MessageType.TIP && item.contentType ? item.contentType : targetType;
                        if (MessageTypeWithSubName[_type]) {
                            content = MessageTypeWithSubName[_type];
                        } else {
                            content = "???????????????????????????????????????";
                        }
                    }
                }
                //????????????????????????
                chatItem.lastContent = Utils.htmlRestore(content);

                //@?????????????????? ????????? ????????????
                if (item.objectId && item.toUserId != this.currentChatData.id && item.type == MessageType.TEXT) {
                    if (item.objectId == chatItem[mentionsAllKey]) {
                        chatItem.mentionText = '@????????????';
                    } else {
                        if ((item.objectId + "").indexOf(systemStore.userId) > -1) {
                            chatItem.mentionText = '??????@???';
                        }
                    }
                }
                //------------????????????????????????--------------------------
                const targetChat = this.chats.find(item => item.id == item.id);
                if (targetChat) {
                    if (!targetChat.isNotice && !ignore) {
                        this.playAudio()
                        ipcRender.showMessageNotification({ title: item.fromUserName, body: content })
                    }
                }

            }

        })
        if (chatItem && chatItem.isTop) {
            return;
        }
        this.chatSort();
    }


    checkInSelectedItem = (_msg: MessageItem) => {
        let chatId = '';
        if (_msg.chatType == ChatType.GROUPCHAT) {
            chatId = _msg.toUserId || _msg.from;
        } else {
            chatId = _msg.jid || _msg.fromUserId;
        }
        if (chatId) {
            let msgs = this.messageData.get(chatId);
            if (msgs) {
                let exitObj = msgs.findIndex(item => { return item.messageId == _msg.messageId });
                if (exitObj != -1) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    }


    // todo  ???????????????????????????
    @action createRemoteChatItemsByMsgs = (msgs: MessageItem[]) => {
        let chatItem: any;
        msgs.map(item => {

            //??????xmpp???????????????????????????????????????

            console.log('????????????--------------------------', msgs);

            let id = ''
            if (item.chatType == ChatType.GROUPCHAT) {
                chatItem = this.getChatItemById(item.fromUserId);
            } else {
                item.chatType = (Utils.isGroup(item.jid || item.fromUserId) ? "groupchat" : "chat");

                if (item.from.includes(item.fromUserId) && item.to.includes(item.fromUserId)) {
                    id = item.toUserId;
                } else {
                    id = item.fromUserId;
                }
                chatItem = this.getChatItemById(item.jid || id);
            }

            //TODO ????????????????????????????????????????????????

            if (chatItem) {
                chatItem.lastTime = item.timeSend;
                this.addMessage(chatItem.id, item);
            } else {
                let entity: FriendItem | GroupItem | undefined;
                if (item.chatType == ChatType.GROUPCHAT) {
                    entity = groupStore.getGroupByJid(item.jid);
                } else {
                    entity = friendStore.getFriendById(item.jid || id);
                }
                if (entity) {
                    chatItem = ChatItem.getChatItem(entity);
                    chatItem.lastTime = item.timeSend;
                    this.addToChats(chatItem);
                    this.addMessage(chatItem.id, item);
                } else {
                    if (item.chatType == ChatType.CHAT) {
                        // console.log('??????????????????',item,ignore)
                        chatItem = ChatItem.getChatItem(item);
                        chatItem.id = item.fromUserId;
                        chatItem.name = item.fromUserName ? item.fromUserName : '';
                        chatItem.type = ChatGrOrFrType.friend;
                        chatItem.lastContent = item.content ? item.content : '';
                        chatItem.lastTime = item.timeSend ? item.timeSend : new Date().getTime() + '';
                        // this.addToChats(chatItem);
                        // this.addMessage(chatItem.id, item);
                        friendStore.addDefaultFriend(item.fromUserId, item);
                    }
                }
            }

            if (chatItem) {
                //??????????????????
                let existUnReadMsg: MessageItem[] | undefined = this.unReadMsgs.get((chatItem as ChatItem).id + '');
                if (existUnReadMsg) {
                    existUnReadMsg.push(item);
                    this.unReadMsgs.set(chatItem.id + '', existUnReadMsg);
                } else {
                    chatItem && this.unReadMsgs.set(chatItem.id + '', [item]);
                }
                this.sendMessagesReadReceipt(this.currentChatData);

                //??????????????????
                let content = '';
                // ??????????????? type ???????????? contentType?????? ????????????
                let targetType = item.type;
                // let targetType = item.contentType;
                if ((item.contentType && item.contentType && item.chatType == ChatType.GROUPCHAT) || item.contentType == MessageType.REVOKE || item.contentType == MessageType.DOUBLE_WITHDRAW) {
                    targetType = item.contentType;
                }
                if (targetType) {
                    if (item.type == MessageType.TEXT || item.type == MessageType.TEXT_REPLY) {
                        content = item.content;
                    } else {
                        const _type = targetType == MessageType.TIP && item.contentType ? item.contentType : targetType;
                        if (MessageTypeWithSubName[_type]) {
                            content = MessageTypeWithSubName[_type];
                        } else {
                            content = '???????????????????????????????????????';
                        }
                    }
                }
                chatItem.lastContent = Utils.htmlRestore(content);
                //------------????????????????????????--------------------------
                const targetChat = this.chats.find(item => item.id == item.id);
                if (targetChat) {
                    if (!targetChat.isNotice) {
                        this.playAudio()
                        ipcRender.showMessageNotification({ title: item.fromUserName, body: content })
                    }
                }
            }

        })
        if (chatItem && chatItem.isTop) {
            return;
        }
        this.chatSort();
    }

    //????????????????????????
    @action delCrrentChatFriend = async () => {
        let cid = this.currentChat.id;
        const currentChatIndex = this.chats.findIndex(item => item.id == this.currentChat.id);
        if (currentChatIndex > -1) {
            const currentChat = this.chats[currentChatIndex];
            const result = await imsdk.delFriend('friends/delete', cid, {});

            if (result.resultCode == 1) {
                // debugger
                const type = MessageType.DELALL;
                //let msg = webIM.createMessage(type, "", cid, name);//17371
                let msg = webIM.createMessage(type, "", cid);//1737
                webIM.sendMessage(msg, currentChat.id);
                deviceManager.sendUpdateDelectFriendMsg();//????????????
                friendStore.removeFriend(Number(cid));
                this.chats.splice(currentChatIndex, 1);

                requestStore.requestList.replace(requestStore.requestList.filter(item => { return item.toUserId != cid; }))
                // console.log('???????????????111',currentChat)
                this.cleanChatMess(cid, true);
                //  console.log( requestStore.requestList,"--------------------------requestStore.requestList");
                this.currentChatData = this.currentChatInitData;
                mainStore.initChatDetail()
            } else {
                message.error(result.resultMsg ? result.resultMsg + "" : '????????????')
                if (friendStore.getFriendById(cid)) {
                    friendStore.removeFriend(Number(cid));
                }
                this.chats.splice(currentChatIndex, 1);

                requestStore.requestList.replace(requestStore.requestList.filter(item => { return item.toUserId != cid; }))
                //  console.log( requestStore.requestList,"--------------------------requestStore.requestList");
                this.currentChatData = this.currentChatInitData;
                mainStore.initChatDetail()
            }

            // if (result.resultMsg == '????????????????????????!') {
            //     this.chats.splice(currentChatIndex, 1);
            //     this.currentChatData = this.currentChatInitData;
            //     mainStore.initChatDetail()
            // }


        }
    }
    //???????????????
    @action exitGroup = () => {
        const currentChatIndex = this.chats.findIndex(item => item.id == this.currentChat.id);
        if (currentChatIndex > -1) {
            const currentChat = this.chats[currentChatIndex]
            this.chats.splice(currentChatIndex, 1);
            this.currentChatData = this.currentChatInitData;
            mainStore.initChatDetail();
            groupStore.delGroup(currentChat.gid);
            imsdk.exitGroup('room/member/delete', currentChat.gid, {});
        }
    }
    //???????????????
    @action delGroup = async (roomid: string) => {

        let res = await imsdk.delGroup(roomid);
        if (res && res.resultCode == 1) {
            if (this.currentChatData && this.currentChatData.id == roomid) {
                mainStore.detailType = detailType.none;
            }

            groupStore.delGroup(roomid);
            // this.delChat(roomid);

            let chats = this.chats.slice().filter(item => { return item.gid != roomid });
            this.setChats(chats);
            this.currentChatData = this.currentChatInitData;
            // mainStore.initChatDetail()
        }

    }


    @action removeLocalGroupAndChat = (roomid: string) => {
        if (this.currentChatData && this.currentChatData.id == roomid) {
            mainStore.detailType = detailType.none;
        }
        groupStore.delGroupByJid(roomid);
        let chats = this.chats.slice().filter(item => { return item.id != roomid });
        this.setChats(chats);
    }

    @action chatSortFun = (_chats?: ChatItem[]) => {
        // console.log('??????',new Date());
        let list: ChatItem[] = _chats ? _chats : this.chats.slice();

        list.sort((a: ChatItem, b: ChatItem) => {
            if (a.isTop && !b.isTop) {
                return -1;
            }
            else if (b.isTop && !a.isTop) {
                return 1;
            }
            else if (b.isTop && a.isTop) {
                return 0;
            }

            if (!a.lastTime && b.lastTime) {
                return 1;
            }
            else if (!b.lastTime && a.lastTime) {
                return -1;
            }
            else if (!a.lastTime && !b.lastTime) {
                return a.name > b.name ? 1 : -1;
            }

            else if (a.lastTime > b.lastTime) {
                return -1;
            }
            else if (a.lastTime < b.lastTime) {
                return 1;
            }

            return a.name > b.name ? 1 : -1;
        })
        this.chats.replace(list);
    }
    //??????????????? ???????????????
    @action goNewFriend = () => {
        mainStore.changeShowDetailType(detailType.newFriend)
    }
    //???????????????
    @action groupChangeNick = async (nickname: string, notToServer?: boolean) => {
        this.currentChatData.nickname = nickname ? nickname : systemStore.nickname;
        groupStore.changeRemark(this.currentChatData.id, nickname);
        console.log('this.currentChatData.nickname', this.currentChatData.nickname);
        if (!notToServer) {
            await imsdk.changeGrNickname(nickname, this.currentChatData.gid);
        }

    }
    //??????????????????
    @action friendChangeMark = async (remarkName: string) => {
        const res = await imsdk.changeFriMarkName(remarkName, this.currentChatData.id, this.currentChatData.desc ? this.currentChatData.desc : '');
        if (res && res.resultCode == 1) {
            const targetChat = this.chats.find(item => item.id == this.currentChatData.id);
            if (targetChat) {
                targetChat.remarkName = remarkName;
                this.chatSort();
            }
            friendStore.changeRemark(this.currentChatData.id, remarkName)
            message.success('????????????')
        } else {
            message.error('????????????')
        }

    }
    //?????? ?????????
    @action changeGrName = async (grName: string) => {

        let gid = this.currentChatData.id;
        const res = await imsdk.changeGrName(this.currentChatData.gid, grName);
        if (res && res.resultCode == 1) {

            if (this.currentChatData.id == gid) {
                this.currentChatData.name = grName
            }
            groupStore.changeGroupName(gid, grName);

            return true
        } else {
            return false
        }
    }

    //???????????????
    @action getGroupVerification = async (mes: MessageItem) => {

        return mes.verification;

    }

    @action setGroupVerification = async (mes: MessageItem, verification: number) => {
        // console.log(mes, "-----------------------------------");
        isOpenDB && updateMessageVerification(mes.messageId, verification);
        return mes.verification = verification;

    }
    //????????????????????????
    @action delLocalMes = async (mes: MessageItem, chatId?: string) => {
        const _chatId = chatId ? chatId + '' : mes.toUserId == systemStore.userId ? mes.fromUserId + '' : mes.toUserId + '';
        let tMessageData = this.messageData.get(_chatId + '');
        // console.log('????????????', tMessageData,mes,this.messageData,_chatId);
        if (!tMessageData) {
            let idT: any = Number(_chatId)
            tMessageData = this.messageData.get(idT)
        }
        if (tMessageData) {
            tMessageData = tMessageData.filter(item => item.messageId != mes.messageId);
            // console.log('??????????????????2', tMessageData);
            this.messageData.set(_chatId, tMessageData);
            isOpenDB && delMessageBy(mes.messageId);
            mesDataCache.deleteMes(mes);

        }
    }

    //??????????????????id????????????
    @action delLocalMesByMessageID = async (mes: MessageItem, chatId?: string) => {
        const _chatId = chatId ? chatId + '' : mes.toUserId == systemStore.userId ? mes.fromUserId + '' : mes.toUserId + '';
        let tMessageData = this.messageData.get(_chatId + '');
        // console.log('????????????', tMessageData,mes,this.messageData,_chatId);
        if (!tMessageData) {
            let idT: any = Number(_chatId)
            tMessageData = this.messageData.get(idT)
        }
        if (tMessageData) {
            tMessageData = tMessageData.filter(item => item.messageId != mes.messageId);
            // console.log('??????????????????2', tMessageData);
            this.messageData.set(_chatId, tMessageData);
            isOpenDB && delMessageBy(mes.messageId);
            mesDataCache.deleteMes(mes);

        }

    }

    selMesWithLocal = (mes: MessageItem) => {
        const idChat = this.currentChatData.id;
        let tMessageData = this.messageData.get(idChat + '');
        if (!tMessageData) {
            let idT: any = Number(idChat) == 0 ? Number(mes.fromUserId) : Number(idChat)
            tMessageData = this.messageData.get(idT)
        }
        if (tMessageData) {
            tMessageData = tMessageData.filter(item => item.messageId != mes.messageId);
            this.messageData.set(idChat + '', tMessageData);
        } else {
            console.warn('????????????????????????')
        }
    }
    //?????????????????? del:1 ?????? 2??????
    @action delMes = async (mes: MessageItem, del: number, opendRead: boolean) => {
        const idChat = this.currentChatData.id;
        let tMessageData = this.messageData.get(idChat + '');
        if (!tMessageData) {
            let idT: any = Number(idChat) == 0 ? Number(mes.fromUserId) : Number(idChat)
            tMessageData = this.messageData.get(idT + '')
        }
        if (tMessageData) {
            tMessageData = tMessageData.filter(item => item.messageId != mes.messageId);
            if (idChat) {
                imsdk.deleteMsg(this.currentChatData.type == ChatGrOrFrType.group ? 2 : 1, del, mes.messageId, idChat);
                // if ( opendRead) {
                if (del == 1) {
                    this.updateMes('?????????????????????', webIM.getServerTime() + '', idChat)
                    // this.currentChatData.lastContent = '?????????????????????';
                } else if (del == 2) {
                    const msg = webIM.createMessage(202, mes.messageId);
                    msg.chatType = this.currentChatData.type == ChatGrOrFrType.group ? 'group' : 'chat';
                    msg.to = idChat;
                    if (msg.chatType != 'chat') {
                        msg.toJid = idChat;
                    }
                    msg.toUserName = this.currentChatData.name;
                    this.updateMes('?????????????????????', webIM.getServerTime() + '', idChat)
                    // this.currentChatData.lastContent = '?????????????????????';
                    webIM.sendMessage(msg, '', true);
                    // console.log('???????????????',msg);
                    if (msg.chatType == 'chat') {
                        console.log('???????????????', msg);
                        const _msg = { ...msg, contentType: 202, type: 10, content: '?????????????????????' };
                        tMessageData.push(_msg);
                        _msg && mesDataCache.addmes(_msg, idChat);
                    }
                }
                this.messageData.set(idChat + '', tMessageData);
            }
            // else {
            //     // message.warn('????????????');
            //     this.messageData.set(idChat + '', tMessageData);
            // }
            // } else {
            //     let tar: any = Number(mes.fromUserId)
            //     this.messageData.set(tar, tMessageData);
            // }
            mesDataCache.deleteMes(mes);
            isOpenDB && delMessageBy(mes.messageId);
        }
    }

    //??????????????????
    @action withDrawMes = async (mes: MessageItem) => {
        this.delMes(mes, 2, false);
        // const msg = webIM.createMessage(202, mes.messageId);

    }
    //??????????????????
    @action doubledelMessage = async (roomid: string) => {

        // console.log('??????????????????', chat, id)
        //   let res=
        let res = await imsdk.doubledeleteMessage(roomid);
        if (res.resultCode === 1) {
            //??????????????????
            this.cleanChatMess(roomid, false);
        } else {
            message.error('????????????')
        }

        // await imsdk.emptyMyMsg(id);
    }

    //????????????????????????
    @action delChart = async (chat: ChatItem) => {

        // let id: any = chat.type == ChatGrOrFrType.group ? chat.gid : chat.id;
        this.chats.replace(this.chats.filter(item => item.id != chat.id));
        if (this.currentChatData.id == chat.id) {
            this.currentChatData = this.currentChatInitData;
            mainStore.changeShowDetailType(detailType.none);
        }
        // console.log('??????????????????', chat, id)
        await imsdk.deleteOneLastChat(chat.id);
        //??????????????????
        this.cleanChatMess(chat.id, false);
        // await imsdk.emptyMyMsg(id);
    }
    //??????????????????????????????ID
    @action delChartByID = (id: string) => {
        if (this.currentChatData.id == id) {
            this.currentChatData = this.currentChatInitData;
            mainStore.changeShowDetailType(detailType.none)
        }
        this.chats.replace(this.chats.filter(item => item.id != id));
    }

    @action addGrop = (gim: GroupItem) => {
        this.addToChats(ChatItem.getChatItem(gim));
    }
    @action changeInfo = (info: string) => {
        this.currentChatData.desc = info
    }
    //?????? ?????????
    @action updateGroupNotice = async (roomId: string, notice: string) => {

        const res = await imsdk.updateGroupNotice(roomId, notice);

        if (res && res.resultCode == 1) {

            // console.log(res,'---updateGroupNotice--------');

            this.currentChatData.name = roomId
            return true
        } else {
            return false
        }

    }
    // ?????????????????? ??? ?????????
    @action changeCurrentMark = (markName: string) => {
        this.currentChatData.remarkName = markName;
    }


    //????????????/??????
    @action addImog = async (url: string, content: string) => {
        // let arry = new Array();
        let item = {
            type: "6",
            msg: (url),
            url: (url)
        }
        let emoji = JSON.stringify(item);

        let res = await imsdk.addImog(emoji);
        if (res && res.resultCode == 1) {
            message.success('????????????')
        } else {
            let messageEro = res.resultMsg ? res.resultMsg : '????????????'
            message.error(messageEro)
        }
        // await imsdk.getImog();
    }

    //????????????
    // @action replayMessage=async(mes:MessageItem)=>{
    //   let  msg=webIM.createMessage(94, mes.messageId);
    //   mes.objectId=
    // }

    //???????????? ????????????????????????
    @action detailBack = () => {
        this.currentChatData = this.currentChatInitData;
        mainStore.changeShowDetailType(detailType.none)
    }

    // ????????????????????????
    @action updateChatContent = (chatId: string, content: string) => {
        if (!chatId) {
            return;
        }
        const targetIndex = this.chats.findIndex(item => item.id == chatId);
        if (targetIndex > -1) {
            // console.log('??????????????????????????????',targetIndex,content);
            this.chats[targetIndex].lastContent = content;
        }
    }

    //???????????????????????????
    @action cleanChatMess = (chatId: string, isSendEmptyMyMsg: boolean, isDoubleDele?: boolean) => {
        const mess = this.messageData.get(chatId + '');
        if (mess) {
            this.messageData.set(chatId + '', []);
            this.updateChatContent(chatId, '');
            mesDataCache.delMessByChatId(chatId);
            isOpenDB && delMessageByChatId(chatId);
            if (isSendEmptyMyMsg) {
                imsdk.emptyMyMsg(chatId + '');
            }
        } else {
            if (isDoubleDele) {
                mesDataCache.delMessByChatId(chatId);
                isOpenDB && delMessageByChatId(chatId);
            }
        }
    }
    //?????????????????????????????????
    @action getIntegration = async (content: string) => {
        if (content.trim() == '??????') {
            //????????????????????????????????????
            const res = await imsdk.setIntegration(1, this.currentChatData.gid, '', '')
            if (res && res.resultCode == 1) {
                message.success('????????????????????????')
            } else {
                message.warn('????????????')
            }
        } else if (content.trim() == '??????') {
            const res = await imsdk.setIntegration(2, this.currentChatData.gid, '', '')
            if (res && res.resultCode == 1) {
                message.success('????????????????????????')
            } else {
                message.warn('????????????')
            }
        }
    }
    //??????????????????????????????????????????????????????
    /*
    content:???????????????
    role:??????
    roomId?????????id
    uId:@????????????id
    */
    @action setIntegration = async (content: string, ps: any[], uIds: string) => {
        if (this.currentChatData.role !== GroupMemRole.owner && this.currentChatData.role !== GroupMemRole.manage) {
            return
        }
        let parse = Utils.judgeIntegration(content, ps)

        if (!parse.res) {
            return
        }
        if (parse.content === '??????') {
            const res = await imsdk.setIntegration(3, this.currentChatData.gid, uIds, "0")

            if (res && res.resultCode == 1)
                message.success('????????????????????????')
            else
                message.warn('????????????')
        }
        //??????????????????????????????????????????
        if (parse.content === '??????') {
            let fraction = parse.value
            const res = await imsdk.setIntegration(4, this.currentChatData.gid, uIds, fraction)

            if (res && res.resultCode == 1)
                message.success('????????????????????????')
            else
                message.warn('????????????')
        }
    }

    //?????????????????????
    getReadInfo = async (msgid: string) => {
        const res = await imsdk.getUnreadInfo(this.currentChatData.gid, msgid)
        if (res && res.resultCode == 1 && res.data) {
            return res.data
        }
        else {
            message.warn('????????????')
            return {
                unreadCount: 0,
                members: []
            };
        }

    }
    //????????????????????????
    @action changeMesUnReadNum = (mes: MessageItem) => {
        let currentId = mes.objectId;
        if (!currentId) return;
        let mesList = this.messageData.get(currentId);
        if (mesList) {
            const indexTar = mesList.findIndex(mesItem => mesItem.messageId == mes.content);
            if (indexTar > -1) {
                let groupNum = groupStore.getGroupMemberNum() - 1;
                if (!mesList[indexTar].unreadCount) {
                    mesList[indexTar].unreadCount = groupNum > 0 ? groupNum - 1 : 0;
                } else {
                    mesList[indexTar].unreadCount = mesList[indexTar].unreadCount > 0 ? mesList[indexTar].unreadCount - 1 : 0;
                }
                this.messageData.set(currentId, mesList);
            }
        }
    }
}
export default new ChatStore()