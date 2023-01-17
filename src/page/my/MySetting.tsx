import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import systemStore, { SystemStore, languaConfig } from '../../store/SystemStore';
import { inject, observer } from 'mobx-react';
// import  Avatar  from 'antd/es/avatar';
// import IMSDK from '../../net/IMSDK';
import { SettingItem } from '../../component/settingItem/SettingItem';
import './mySetting.less';
import { NavLink } from 'react-router-dom';
import { IconImgEdit } from '../../component/iconImage/IconImageEdit';
import { tr } from '../../i18n/tr';
import { LoginStore } from '../../store/LoginStore';
import { AvatorWithPhoto } from '../../component/avatorWithPhoto/AvatorWithPhoto';
import mainStore, { detailType } from '../../store/MainStore';
export interface IMySettingProps extends RouteComponentProps { }

export interface IMySettingState { }
interface WithStore extends IMySettingProps {
	systemStore: SystemStore;
	loginstore: LoginStore;
}
@inject('systemStore')
@observer
export default class MySetting extends React.Component<IMySettingProps, IMySettingState> {
	constructor(props: IMySettingProps) {
		super(props);

		this.state = {};
	}
	get injected() {
		return this.props as WithStore;
	}
	public render() {
		// console.log('扫码登录没复制吗', systemStore.telephone ,systemStore.user.account)
		return (
			<div className="setting-left">
				<NavLink
					className="my-info-item"
					to={this.props.match.url + '/info'}
					onClick={() => mainStore.changeShowDetailType(detailType.setting)}
				>
					{/* <Avatar className="avator" size={48} icon="user" src={IMSDK.getAvatarUrl(Number(this.injected.systemStore.userId), false)} /> */}
					<span style={{ display: 'flex', width: '200px', overflow: 'hidden' }}>
						<AvatorWithPhoto id={this.injected.systemStore.userId} type={0} size={48} />
						<span style={{ marginLeft: '8px' }}>
							<div className="name">{this.injected.systemStore.nickname}</div>
							<div className="telephone">
								{systemStore.telephone ? systemStore.telephone : systemStore.user.account}
							</div>
						</span>
					</span>
					<span className="right-info-icon">
						<IconImgEdit img={require('../../assets/image/right-icon.png')} size={12} marginSize={4} />
					</span>
				</NavLink>
				{/* <SettingItem urlKey={this.props.match.url + '/clearCache'} name={tr(5)} exactName="1.16M" img={require('./../../assets/image/clear-cache.png')} /> */}
				{/* 清除记录 */}
				<SettingItem
					urlKey={this.props.match.url + '/clearHistory'}
					onClick={() => mainStore.changeShowDetailType(detailType.setting)}
					name={tr(9)}
					exactName=""
					img={require('./../../assets/image/clear-history.png')}
				/>
				{/* 群发消息 */}
				<SettingItem
					urlKey={this.props.match.url + '/mesGroupSend'}
					onClick={() => mainStore.changeShowDetailType(detailType.setting)}
					name={tr(6)}
					exactName=""
					img={require('./../../assets/image/send-group.png')}
				/>
				{/* <SettingItem
					urlKey={this.props.match.url + '/secretSet'}
					onClick={() => mainStore.changeShowDetailType(detailType.setting)}
					name={tr(7)}
					exactName=""
					img={require('./../../assets/image/secret-setting.png')}
				/> */}
				<SettingItem
					urlKey={this.props.match.url + '/languageChange'}
					onClick={() => mainStore.changeShowDetailType(detailType.setting)}
					name={tr(4)}
					exactName={languaConfig[this.injected.systemStore.language]}
					img={require('./../../assets/image/language-swtch.png')}
				/>
				<SettingItem
					urlKey={this.props.match.url + '/pasChange'}
					onClick={() => mainStore.changeShowDetailType(detailType.setting)}
					name={tr(8)}
					exactName=""
					img={require('./../../assets/image/change-password.png')}
				/>
				{/* 关于我们 */}
				{/* <SettingItem
					urlKey={this.props.match.url + '/aboutus'}
					onClick={() => mainStore.changeShowDetailType(detailType.setting)}
					name={tr(181)}
					exactName=""
					img={require('./../../assets/image/anout-us.png')}
				/> */}
			</div>
		);
	}
}
