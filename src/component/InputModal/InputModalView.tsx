import React , { useState } from 'react';
import Modal from 'antd/es/modal';
import Input from 'antd/es/input';
import './InputModal.less'
export interface IInputModalViewProps {
    title: string,
    label: string,
    value: string
    closeModal: () => void,
    isOk: (value: string) => void,
    isLoading?: boolean
}

export function InputModalView(props: IInputModalViewProps) {
    const [value, setValue] = useState(props.value);
    return (
        <Modal
            mask={false}
            centered
            title={props.title}
            visible={true}
            width={340}
            okText={'确定'}
            cancelText={'取消'}
            onOk={() => props.isOk(value)}
            onCancel={props.closeModal}
            confirmLoading={props.isLoading}
        >
            <div className = "input-wrap">
                <span className = "title">
                    {props.label}
                </span>
                <Input type='text' value={value} 
                maxLength={30}
                placeholder = {`请输入${props.label}`}
                onChange={(e) => {
                    setValue(e.target.value)
                }} />
            </div>
        </Modal>
    );
}
