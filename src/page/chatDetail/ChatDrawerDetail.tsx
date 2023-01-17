import * as React from 'react';
// import Avatar from 'antd/es/avatar';
import Icon from 'antd/es/icon';
// import IMSDK from '../../net/IMSDK';
import { ChatStore } from '../../store/ChatStore';
import { inject, observer } from 'mobx-react';
import Utils from '../../utils/utils';
import { InputModalView } from '../../component/InputModal/InputModalView';
import { IconImgEdit } from '../../component/iconImage/IconImageEdit';
import { ConfirmCommon } from '../../component/confirmModal/ConfirmModal';
import { tr } from '../../i18n/tr';
import deviceManager from '../../net/DeviceManager';
import Switch from 'antd/es/switch';
import message from 'antd/es/message';
import { AvatorWithPhoto } from '../../component/avatorWithPhoto/AvatorWithPhoto';
import Slider from 'antd/es/slider';
import systemStore from '../../store/SystemStore';

export interface IChatDrawerDetailProps {
	setMsgGroupBanned: (isTrue: boolean) => void;
	setSnapChat: (SnapChatlevel: number) => void;
	setMsgTop: (isTrue: boolean) => void;
	setNotice: (isTrue: boolean) => void;

	msgBanned: boolean;
	isTop: boolean;
	getNotice: boolean;
	issnapChat: boolean
}

export interface IChatDrawerDetailState {
	remarkEdit: boolean;
	scale: number
}
interface ChatDrawerDetailWithStore extends IChatDrawerDetailProps {
	chatStore: ChatStore;
}
@inject('chatStore')
@observer
export default class ChatDrawerDetail extends React.Component<IChatDrawerDetailProps, IChatDrawerDetailState> {
	constructor(props: IChatDrawerDetailProps) {
		super(props);

		this.state = {
			remarkEdit: false,
			scale: 0
		};
	}
	get injected() {
		return this.props as ChatDrawerDetailWithStore;
	}
	confirmDel = () => {
		ConfirmCommon(tr(85), this.delFriend);
	};
	delFriend = () => {
		this.injected.chatStore.delCrrentChatFriend();
	};
	editRemark = (isShow: boolean) => {
		this.setState({
			remarkEdit: isShow
		});
	};
	changeRemark = (remark: string) => {
		this.injected.chatStore.friendChangeMark(remark);
		deviceManager.endUpdateFriendInfoMsg(this.injected.chatStore.currentChat.id, remark);
		this.setState({
			remarkEdit: false
		});
	};
	clearMesConfirm = () => {
		ConfirmCommon(tr(86), this.clearMes);
	};
	clearMes = () => {
		const chatStore = this.injected.chatStore,
		curId = this.injected.chatStore.currentChatData.id;
		chatStore.cleanChatMess(curId,true);
	};
	openSnapchat = () => {
		message.warn('功能未开放');
	};

	_setMsgTop = (checked: boolean) => {
		const { setMsgTop } = this.props;
		setMsgTop(checked);
	};
	_setNotice = (checked: boolean) => {
		const { setNotice } = this.props;
		setNotice(checked);
	};
	_setSnapChat = (cheacked: boolean) => {
		const { setSnapChat } = this.props;
		setSnapChat(cheacked ? 1 : 0);
		if (cheacked) {
			this.setState({
				scale: 0
			})
		}
	};
	_setSnapChatType = (snapType: number) => {
		const { setSnapChat } = this.props;
		setSnapChat(snapType);
		this.setState({
			scale:snapType
		})
	};
	public render() {
		// const { msgBanned, isTop, getNotice, setMsgGroupBanned } = this.props;
		const { isTop, getNotice, issnapChat } = this.props;
		const snapChat = this.injected.chatStore.currentChatData.snapChat;
		const { chatStore } = this.injected;
		const dataChat = chatStore.currentChatData;
		const timeFormate = dataChat.lastTime ? Utils.getTimeText(Number(dataChat.lastTime), 1, 1) : '';
		// console.log('月后',Boolean(snapChat && snapChat > 0),'置顶聊天',isTop,'消息免打扰',getNotice,'后台是否开启阅后即焚',systemStore.isDelAfterReading)
		
		return (
			<div className="drawer-single-chat">
				<div className="box-parter">
					<div className="chat-info-wraper">
						{/* <Avatar size={40} icon="user" className="avator" src={IMSDK.getAvatarUrl(Number(dataChat.id), false)} /> */}
						<AvatorWithPhoto id={dataChat.id} type={0} size={48} />
						<span className="chat-name-wrap">
							<span className="chat-name">{dataChat.name}</span>
							<br />
							<span className="chat-name-sub">{timeFormate}</span>
						</span>
					</div>
				</div>
				<div className="box-parter">
					<div className="list-item-common click" onClick={() => this.editRemark(true)}>
						<span className="left">{tr(87)}</span>
						<span className="right">
							<span className="right-content">{dataChat.remarkName}</span>
							<Icon type="edit" />
						</span>
					</div>
				</div>
				{this.state.remarkEdit ? (
					<InputModalView
						title={tr(88)}
						isOk={this.changeRemark}
						closeModal={() => this.editRemark(false)}
						label={tr(89)}
						value={dataChat.remarkName ? dataChat.remarkName : ''}
					/>
				) : null}
				<div className="box-parter">
					<div
						style={{
							fontSize: '12px',
							// fontFamily: 'AlibabaPuHuiTiR',
							color: 'rgba(150,155,165,1)',
							lineHeight: '17px',
							margin: '14px 0px 4px 0px'
						}}
					>
						对话设置
					</div>
					{/* <div className="list-item-common click" onClick={this.openSnapchat}>
						<div className="left" style={{ lineHeight: '20px', margin: '10px 0px' }}>
							双向撤回
						</div>
						<div className="right">
							<Switch checked={msgBanned} onChange={() => setMsgGroupBanned(!msgBanned)} />
						</div>
					</div> */}
					{systemStore.isDelAfterReading==0?<div className="list-item-common click">
						<div className="left" style={{ lineHeight: '20px', margin: '10px 0px' }}>
							阅后即焚
						</div>
						<div className="right">
							<Switch checked={issnapChat} onChange={this._setSnapChat} />
						</div>
					</div>:<></>}
					{systemStore.isDelAfterReading==0&&issnapChat ? (
						<div
							className="lider-wraper"
							style={issnapChat? {} : { display: 'none' }}
						>
							<div>{Utils.getDeadLineTime(typeof snapChat === 'number' ? snapChat : 1).name}</div>
							<Slider
								min={1}
								max={11}
								onChange={this._setSnapChatType}
								value={this.state.scale}
								defaultValue={typeof snapChat === 'number' ? snapChat : 1}
								tooltipVisible={false}
							/>
						</div>
					) : <></>}
					<div className="list-item-common click">
						<div className="left" style={{ lineHeight: '20px', margin: '10px 0px' }}>
							置顶聊天
						</div>
						<div className="right">
							<Switch checked={isTop} onChange={this._setMsgTop} />
						</div>
					</div>
					<div className="list-item-common click">
						<div className="left" style={{ lineHeight: '20px', margin: '10px 0px' }}>
							消息免打扰
						</div>
						<div className="right">
							<Switch checked={getNotice} onChange={this._setNotice} />
						</div>
					</div>
				</div>
				<div className="box-parter">
					<div className="list-item-common click" onClick={this.clearMesConfirm}>
						<div className="left">{tr(90)}</div>
						<div className="right">
							<IconImgEdit img={require('../../assets/image/right-icon.png')} size={12} marginSize={4} />
						</div>
					</div>
				</div>
				<div className="box-parter">
					<div className="list-item-common click" onClick={this.confirmDel}>
						<a className="del-but">{tr(91)}</a>
					</div>
				</div>
			</div>
		);
	}
}
