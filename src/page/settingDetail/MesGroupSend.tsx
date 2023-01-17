import * as React from 'react';

import { WithSettingDetailHead } from '../../component/WithSettingDetailHead/WithSettingDetailHead';
import TransmitSelectModal from '../../component/transmitSelectModal/TransmitSelectModal';


import { message, Button } from 'antd';
import { Input } from 'antd';
const { TextArea } = Input;

import { SelectItemType, SelectType } from '../../interface/ITransmit';
import webIM from '../../net/WebIM';
import { MessageType } from '../../net/Const';

import chatStore from '../../store/ChatStore';
// import groupStore from '../../store/GroupStore';
// import friendStore from '../../store/FriendStore';

export interface IMesGroupSendProps {

}

export interface IMesGroupSendState {
  msgContent: string,
  showSelectChatModal: boolean;
}

class MesGroupSend extends React.Component<IMesGroupSendProps, IMesGroupSendState> {

  constructor(props: IMesGroupSendProps) {
    super(props);

    this.state = {
      msgContent: '',
      showSelectChatModal: false,

    }
  }
  changeMsgContent = (e: { target: { value: string } }) => {
    this.setState({
      msgContent: e.target.value
    });
  };
  sendToChats = (chats: SelectItemType[]) => {

    for (let index = 0; index < chats.length; index++) {
      const chat = chats[index];

      let timer = setInterval(() => {
        timer && clearTimeout(timer);
        this.send(chat)
      }, 50);

    }
    this.hideTransmit();
  };

  showTransmit = () => {
    this.setState({
      showSelectChatModal: true
    })
  };
  hideTransmit = () => {
    this.setState({
      showSelectChatModal: false
    })
  };

  send = (_chat: any) => {
    var content = this.state.msgContent
    if (!content) {
      message.warn('不能发送空内容');
      return;
    }
    let chat = _chat.data;
    let chatId = "";
    let toUserName = "";
    if (_chat.transmitType == SelectType.chat) {
      chatId = chat.id + '';
      toUserName = chat.name;

    } else if (_chat.transmitType == SelectType.group) {
      chatId = chat.jid + '';
      toUserName = chat.name;
    } else if (_chat.transmitType == SelectType.friend) {
      chatId = chat.toUserId + '';
      toUserName = chat.toNickname;
    }
    console.log(chatId, '-----chatId--------');


    // let chart = chatStore;
    // const chatItem = chart.chats.find(item => item.id == chatId);
    // console.log('发送的消息', chatItem);
    const _msgData = {
      type: MessageType.TEXT,
      content: content,
      toUserId: chatId,
      toUserName: toUserName
    };
    const msg = webIM.createMessage(_msgData.type, _msgData.content, _msgData.toUserId, _msgData.toUserName);


    webIM.sendMessage(msg, '');

    // console.log(msg,'发出的消息是什么?????????????',msg.to,msg.toJid,msg.toUserId,msg.toUserName)
    // msg.fromUserName = chart.currentChatData.nickname ? chart.currentChatData.nickname : msg.fromUserName;
    chatStore.addMessage(chatId, msg, true);
    // console.log(this.injected.chatStore.messageData.get(chatId),'消息体里的数据') 
    chatStore.updateMes(content, msg.timeSend, chatId);
    //chatStore.addToChats(chat);
  };

  public render() {
    return (
      <div style={{ margin: '10px' }}>
        <TextArea value={this.state.msgContent} onChange={this.changeMsgContent} placeholder="输入消息内容" autoSize={{ minRows: 3, maxRows: 10 }} style={{ margin: '10px 0' }} />
        <Button onClick={this.showTransmit} type="primary" size="small" style={{ margin: '10px 0' }}>
          群发
        </Button>

        {
          this.state.showSelectChatModal
            ? <TransmitSelectModal submitTransmit={this.sendToChats} cancelModal={this.hideTransmit} />
            : null
        }
      </div>
    );
  }
}
export default WithSettingDetailHead('群发消息', MesGroupSend)
