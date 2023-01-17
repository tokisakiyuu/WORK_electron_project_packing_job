import * as React from 'react';
import Spin from 'antd/es/spin';
import message from 'antd/es/message';
import './imageCode.less'
import imsdk from '../../net/IMSDK';
export interface IImageCodeProps {
    areaCode: string,
    telephone: string,
    updateNum: number
}

export interface IImageCodeState {
    isLoading: boolean,
    imgUrl: string
}

export default class ImageCode extends React.Component<IImageCodeProps, IImageCodeState> {
    constructor(props: IImageCodeProps) {
        super(props);

        this.state = {
            isLoading: false,
            imgUrl: ''
        }
    }
    componentWillReceiveProps(nextProps:IImageCodeProps){
        if(nextProps.updateNum > this.props.updateNum){
            this.getTestData();
        }
    }
    getTestData = async() => {
        if(!this.props.telephone){
            message.warn('请填写手机号!')
            return;
        }
        this.setState({
            isLoading: true
        })
        let imgUrl = imsdk.getTestData('getImgCode', this.props.areaCode, this.props.telephone);
      
        console.log(imgUrl,'imgUrl---------------------------------------');
        this.setState({
            isLoading: false,
             imgUrl
        })
    }
    public render() {
        const {
            isLoading,
            imgUrl
        } = this.state;
        return (
            <div className="test-wraper">
                <div className = "img-wraper">
                    {
                        isLoading
                            ? <Spin />
                            : (
                                imgUrl
                                    ? <img src={imgUrl} onClick={this.getTestData} title= "点击重试"/>
                                    : <span onClick={this.getTestData} className = "get-but-imgae">点击获取 </span>
                            )
                    }
                </div>
                {/* <span className="get-but" >
                    重新获取
                </span> */}
            </div>
        );
    }
}
