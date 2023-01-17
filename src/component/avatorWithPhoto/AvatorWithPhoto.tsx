import * as React from 'react';
// import 'antd/es/avatar/style/';
import { avatorData } from '../../config/chatUserPhotoData';
import groupStore from '../../store/GroupStore';
import IMSDK from '../../net/IMSDK';
import { ChatGrOrFrType } from '../../interface/IChat';
import { defalutAvatorData } from '../../config/imojiDataList';


export interface IAvatorWithPhotoProps {
    id: string,
    type: ChatGrOrFrType,
    size?: number,
    classN?: string,
    forceUpdate?: boolean
}

export interface IAvatorWithPhotoState {
    img: string,
    isload: boolean,
    id: string
}

export class AvatorWithPhoto extends React.Component<IAvatorWithPhotoProps, IAvatorWithPhotoState> {
    constructor(props: IAvatorWithPhotoProps) {
        super(props);
        this.state = {
            isload: false,
            img: '',
            id: this.props.id,
        }
    }
    componentDidMount() {
        this.getAvatorData(false, '', this.props.forceUpdate)
    }
    componentDidUpdate(prevProps: IAvatorWithPhotoProps, preState: IAvatorWithPhotoState) {
        // console.log('前后对比',prevProps,this.props,preState)
        if (prevProps.id != this.props.id) {
            this.getAvatorData(true);
        }
    }
    componentWillUnmount() {
        this.setImageHeader = () => { }
    }
    setImageHeader = (imgUrl: string) => {
        this.setState({
            img: imgUrl
        })
    }
    isGroup = this.props.type == ChatGrOrFrType.group;
    getAvatorData = (isload: boolean, id?: string, forceUpdate?: boolean) => {

        this.setState({
            isload: false,
            img: '',
        })
        const imgRandomNu = '?r=' + Math.round(Math.random() * 100)
        const _id = id ? id : this.props.id;
        const imgdata = avatorData.getAvatorData(_id);
        // console.log('前后对比1111',this.isGroup,isload,this.props,':::',imgdata,"****",forceUpdate)
        if (imgdata && !forceUpdate) {
            this.setImageHeader(imgdata)
            return
        }
        // else{
        //     console.log('图片消息',imgdata)
        // }
        let members = [];
        if (this.isGroup) {
            //  let gitems = groupStore.getGroupByJidAnsy(_id);
            let gitem = groupStore.getGroupByJid(_id);
            //  console.log('********************************',gitems,_id)
            if (gitem) {
                members = gitem.membersInfo;
            }
        }

        if (this.isGroup && !isload) {
            IMSDK.getAvatarUrlAsync(_id + '', false, members).then(img => {
                if (_id == this.props.id) {
                    this.setImageHeader(img)
                }


                avatorData.setAvator(_id, img)
            })
        } else {
            if (_id != '10000' && _id != "10001"&&_id != '10005' && !isload) {
                let img = IMSDK.getAvatarUrl(Number(_id), false);
                this.setImageHeader(img + imgRandomNu)

                avatorData.setAvator(_id, img + imgRandomNu)
            }
            // if(_id == '10000' || _id == "10001"){
            //     let  defaultImage = require('../../assets/image/im_notice_square.png');
            //       this.setImageHeader(defaultImage )

            //       avatorData.setAvator(_id, defaultImage)
            //   }

        }
    }
    getImageNum = (id: string) => {
        const idStr = parseInt((id + '').replace(/[^\d]/g, ''));
        if (idStr === NaN) {
            return 0
        } else {
            return idStr % 16
        }
    }

    imgStyle = {
        height: this.props.size ? `${this.props.size}px` : '32px',
        width: this.props.size ? `${this.props.size}px` : '32px',
        // borderRadius:this.props.size?`${this.props.size/2}px`: '26px',
        // border:" 1px solid black",
        borderRadius: 3,
        WebkitUserDrag: "none"
    }
    imgLoad = () => {
        this.setState({
            isload: true
        })
    }
    public render() {
        let { img } = this.state;
        const { classN } = this.props;
        let isService = this.props.id == '10000' || this.props.id == "10001";
        let defaultImage;
        if (isService) {
            defaultImage = require('../../assets/image/im_notice_square.png');
            // if(img && img.indexOf('/static/media') > -1 ){
            //     img = require('../../assets/image/im_notice_square.png');
            // }
        } else if(this.props.id == '10005'){
            defaultImage = require('../../assets/image/robot.png');
        }else {
            defaultImage = defalutAvatorData["e-" + this.getImageNum(this.props.id)];
        }
        // console.log('头像数据', this.props.id, img, defaultImage, this.state.isload)
        return (
            <>
                {
                    this.state.isload && img
                        ? null
                        : <img
                            style={{ ...this.imgStyle }}
                            src={defaultImage}
                            className={classN}
                        />
                }
                <img
                    style={(this.state.isload && img) ? { ...this.imgStyle } : { display: 'none', ...this.imgStyle }}
                    src={img}
                    className={classN}
                    onLoad={this.imgLoad}
                />
            </>
        )
    }
}
