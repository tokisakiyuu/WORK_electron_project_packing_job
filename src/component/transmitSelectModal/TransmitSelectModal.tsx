import * as React from 'react';
// import Modal from 'antd/es/modal';
// import Checkbox from 'antd/lib/checkbox/Checkbox';
import { Modal, Checkbox, Collapse } from 'antd';
const { Panel } = Collapse;

import { SelectItemType, SelectType } from '../../interface/ITransmit';
import systemStore from '../../store/SystemStore';
import chatStore from '../../store/ChatStore';
import groupStore from '../../store/GroupStore';
import friendStore from '../../store/FriendStore';
// import { List as VList } from 'react-virtualized/dist/es/List';
// import { AutoSizer } from 'react-virtualized/dist/es/AutoSizer';

import './transmitModal.less';
import SelectItem from './SelectItem';
import Search from 'antd/es/input/Search';
import { AvatorWithPhoto } from '../avatorWithPhoto/AvatorWithPhoto';
import { ChatGrOrFrType, ChatItem } from '../../interface/IChat';
import { GroupItem, testForbit } from '../../interface/IGroup';
import { message } from 'antd';
export interface ITransmitSelectModalProps {
	submitTransmit: (chats: SelectItemType[]) => void;
	cancelModal: () => void;
}
// export interface ITransmitSelectModalStates {
// 	isLoading: boolean,
// }

export default function TransmitSelectModal(props: ITransmitSelectModalProps) {
	// const [chatType, setchatType] = React.useState(true);
	const [selectList, setSelect] = React.useState(new Map() as Map<string, SelectItemType>);
	const [filText, setFileT] = React.useState('');

	const [recchatsCheckd, setrecchatsCheckd] = React.useState(false);
	const checkAllRecchats = () => {
		let c = !recchatsCheckd;
		recchats.map((item) => {
			const chatid = item.id + "";
			if (c) {
				if (!selectList.has(chatid)) {
					selectList.set(chatid, { transmitType: SelectType.chat, data: item });
				}
			} else {
				if (selectList.has(chatid)) {
					selectList.delete(chatid);
				}
			}
		});
		setSelect(new Map(selectList));
		setrecchatsCheckd(c);
		return
	};
	const [friendsChecked, setfriendsChecked] = React.useState(false);
	const checkAllFriends = () => {
		let c = !friendsChecked;
		friends.map((item) => {
			const friendid = item.toUserId + "";
			if (c) {
				if (!selectList.has(friendid)) {
					selectList.set(friendid, { transmitType: SelectType.friend, data: item });
				}
			} else {
				if (selectList.has(friendid)) {
					selectList.delete(friendid);
				}
			}
		});
		setSelect(new Map(selectList));
		setfriendsChecked(c);
		return
	};
	const [groupsCheckd, setgroupsCheckd] = React.useState(false);
	const checkAllGroups = () => {
		let c = !groupsCheckd;
		groups.map((item) => {
			const groupid = item.jid + "";
			if (c) {
				if (!selectList.has(groupid)) {
					selectList.set(groupid, { transmitType: SelectType.group, data: item });
				}
			} else {
				if (selectList.has(groupid)) {
					selectList.delete(groupid);
				}
			}
		});
		setSelect(new Map(selectList));
		setgroupsCheckd(c);
		return
	};

	const _submitTransmit = () => {
		selectList.forEach(e => {
			var item = e.data;
			if (e.transmitType == SelectType.group) {
				let gitem = item as GroupItem;
				if (testForbit(gitem, groupStore.groupMemberList, systemStore.userId)) {
					message.warn(`${gitem.name} 群禁言中，无法转发到此群`)
					removeOne(e);
				}
				// var person = gitem.membersInfo.find((f) => { f.userId == systemStore.userId });
				// message.warn(`person:${person}`)
				// //我是管理员->显示
				// if (person.role != 1 && person.role != 2 && ((gitem.talkTime && Number(gitem.talkTime) > 0) || (!person.persontimeTalk && +person.persontimeTalk > 0))) {
				// 	message.warn(`${gitem.name} 群禁言中，无法转发到此群`)
				// 	removeOne(e);
				// }
			}
			else if (e.transmitType == SelectType.chat) {
				let citem = item as ChatItem;
				var gitem = groupStore.groupList.find(group => {
					group.jid == citem.id
				});
				if (gitem) {
					if (testForbit(gitem, groupStore.groupMemberList, systemStore.userId)) {
						message.warn(`${gitem.name} 群禁言中，无法转发到此群`)
						removeOne(e);
					}

					// var person = gitem.membersInfo.find((f) => { f.userId == systemStore.userId });
					// //我是管理员->显示
					// if (person.role != 1 && person.role != 2 && ((person.talkTime && Number(person.talkTime) > 0) || (!person.persontimeTalk && +person.persontimeTalk > 0))) {
					// 	message.warn(`${gitem.name} 群禁言中，无法转发到此群`)
					// 	removeOne(e);
					// }

				}

			}
		});
		const selectData = Array.from(selectList.values());
		props.submitTransmit(selectData);
	};
	const changeValue = (e: any) => {
		const vaText = e.target.value + "";
		// if (!vaText) {
		// 	setchatType(true);
		// } else {
		// 	setchatType(false);
		// }
		setFileT(vaText);
	};

	let recchats = chatStore.chats.filter((item) => {
		const fileText = filText + "";
		if (fileText == "") {
			return true;
		}
		if ((item.name && item.name.indexOf(fileText) > -1) ||
			(item.remarkName && item.remarkName.indexOf(fileText) > -1) ||
			(item.nickname && item.nickname.indexOf(fileText) > -1)) {
			return true;
		}
		return false;
	})

	let groups = groupStore.groupList.filter((item) => {
		const fileText = filText + "";
		//名字筛选
		if (fileText == "") {
			return true;
		}
		if ((item.name.indexOf(fileText) > -1) ||
			(item.nickname && item.nickname.indexOf(fileText) > -1)) {
			return true;
		}
		return false;
	});

	let friends = friendStore.friendList.filter((item) => {
		const fileText = filText + "";
		if (fileText == "") {
			return true;
		}
		if (
			(item.remarkName && item.remarkName.indexOf(fileText) > -1) ||
			(item.toNickname && item.toNickname.indexOf(fileText) > -1)
		) {
			return true;
		}
		return false;
	});

	const removeOne = (_chat: any) => {
		const chat = _chat.data;
		let chatId = '';
		if (_chat.transmitType == SelectType.chat) {
			chatId = chat.id + '';
		} else if (_chat.transmitType == SelectType.group) {
			chatId = chat.jid + '';
		} else if (_chat.transmitType == SelectType.friend) {
			chatId = chat.toUserId + '';
		}
		if (selectList.has(chatId)) {
			selectList.delete(chatId);
			setSelect(new Map(selectList));
		}
	};


	return (
		<Modal visible={true} onCancel={props.cancelModal} onOk={_submitTransmit} okText="发送" cancelText="取消"	>
			<div className="modal-transmit-body">
				<div className="modal-transmit-left">
					<div>
						<Search
							value={filText}
							placeholder="请输入搜索名称或昵称"
							onChange={changeValue}
							style={{ width: 220 }}
						/>
					</div>
					<Collapse bordered={false} accordion >
						<Panel key="1" header={<span className="title-transmit">最近聊天列表 </span>}

							extra={<Checkbox value={recchatsCheckd} onClick={e => e.stopPropagation()} onChange={checkAllRecchats} />}>
							{recchats.map((item) => {
								const chatId = item.id + "";
								return (
									<div
										key={chatId + item.name}
										className="modal-transmit-item"
										onClick={() => {
											if (selectList.has(chatId)) {
												selectList.delete(chatId);
												setSelect(new Map(selectList));
											} else {
												selectList.set(chatId, {
													transmitType: SelectType.chat,
													data: item
												});
												setSelect(new Map(selectList));
											}
										}}
									>
										<span className="title-item">
											<AvatorWithPhoto id={chatId} type={ChatGrOrFrType.friend} size={24} />
											<span className="name">{item.name}</span>
										</span>
										<Checkbox checked={selectList.has(chatId)} />
									</div>
								);
							})}
						</Panel>
						<Panel key="2" header={<span className="title-transmit">好友列表</span>}
							extra={<Checkbox value={friendsChecked} onClick={e => e.stopPropagation()} onChange={checkAllFriends} />}
						>
							{friends.map((item) => {
								const friendId = item.toUserId + '';
								return (
									<div
										key={friendId + item.toNickname}
										className="modal-transmit-item"
										onClick={() => {
											if (selectList.has(friendId)) {
												selectList.delete(friendId);
												setSelect(new Map(selectList));
											} else {
												selectList.set(friendId, {
													transmitType: SelectType.friend,
													data: item
												});
												setSelect(new Map(selectList));
											}
										}}
									>
										<span className="title-item">
											<AvatorWithPhoto id={friendId} type={ChatGrOrFrType.friend} size={24} />
											<span className="name">{item.remarkName || item.toNickname}</span>
										</span>
										<Checkbox checked={selectList.has(friendId)} />
									</div>
								);
							})}
						</Panel>
						<Panel key="3"
							header={<span className="title-transmit">群组列表 </span>}
							extra={<Checkbox value={groupsCheckd} onClick={e => e.stopPropagation()} onChange={checkAllGroups} />}
						>
							{groups.map((item) => {
								const groupId = item.jid + '';
								return (
									<div
										key={groupId + item.name}
										className="modal-transmit-item"
										onClick={() => {
											if (selectList.has(groupId)) {
												selectList.delete(groupId);
												setSelect(new Map(selectList));
											} else {
												selectList.set(groupId, {
													transmitType: SelectType.friend,
													data: item
												});
												setSelect(new Map(selectList));
											}
										}}
									>
										<span className="title-item">
											<AvatorWithPhoto id={groupId} type={ChatGrOrFrType.group} size={24} />
											<span className="name">{item.name}</span>
										</span>
										<Checkbox checked={selectList.has(groupId)} />
									</div>
								);
							})}
						</Panel>
					</Collapse>

				</div>
				<div className="modal-transmit-right">
					{Array.from(selectList.values()).map((item, index) => {
						return <SelectItem key={index} {...item} onClose={removeOne} />;
					})}
				</div>
			</div>


		</Modal>
	);
}
