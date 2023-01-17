import * as React from 'react';
import { FriendItem } from '../../interface/IFriend';
import Modal from 'antd/es/modal';
import Checkbox from 'antd/es/checkbox';
import { List as VList } from 'react-virtualized/dist/es/List';
import { AutoSizer } from 'react-virtualized/dist/es/AutoSizer';

// import Avatar from 'antd/es/avatar';
// import IMSDK from '../../net/IMSDK';
import './selectFriend.less';
import { AvatorWithPhoto } from '../avatorWithPhoto/AvatorWithPhoto';
import systemStore from '../../store/SystemStore';
// import systemStore  from '../../store/SystemStore';

interface FriendItemWithSelect extends FriendItem {
	isSelected?: boolean;
}
export interface ISelectFriendProps {
	friendList: FriendItemWithSelect[];
	title: string;
	isShow: boolean;
	selectConfirm: (list: FriendItem[]) => void;
	cancel: () => void;
}

export function SelectFriend(props: ISelectFriendProps) {
	const [friendList, updateFriend] = React.useState(JSON.parse(
		JSON.stringify(props.friendList)
	) as FriendItemWithSelect[]);
	const renderItem = ({ index, key, style }: any) => {
		const item = friendList[index];
		if(!item){
			return null;
		}
		return (
			<div
				className="friend-item"
				key={key}
				style={style}
				onClick={() => {
					let _friendList = friendList;
					_friendList[index].isSelected = _friendList[index].isSelected ? false : true;
					updateFriend((m) => [..._friendList]);
				}}
			>
				<span>
					{/* <Avatar icon="user" size={24} className="head" src={IMSDK.getAvatarUrl(Number(item.toUserId), false)} /> */}
					<AvatorWithPhoto type={0} id={item && item.toUserId?item.toUserId.toString():''} size={24} classN="head" />
					<span className="name">
						{(item.remarkName?item.remarkName:item.toNickname)+
						
							(item.toUserId + '' == systemStore.userId  + ''
							? ' (我的名片)'
							: '')
						}
						</span>
				</span>
				<Checkbox checked={item.isSelected} />
			</div>
		);
	};
	return (
		<Modal
			mask={false}
			centered
			title="选择发送名片"
			visible={props.isShow}
			width={340}
			okText={'确认发送'}
			cancelText={'取消'}
			onOk={() => {
				const selectList = friendList.filter((item) => item.isSelected);
				// console.log('selectList', selectList, friendList);

				props.selectConfirm(selectList);
			}}
			onCancel={props.cancel}
		>
			<div className="select-friend">
				{/* {myCallingCard} */}
				<AutoSizer>
					{({ height, width }) => {
						return (
							<VList
								// ref={(ref) => (this.list = ref)}
								width={width}
								height={height}
								overscanRowCount={20}
								rowCount={friendList ? friendList.length : 0}
								rowHeight={40}
								rowRenderer={renderItem}
							/>
						);
					}}
				</AutoSizer>
			</div>
		</Modal>
	);
}
