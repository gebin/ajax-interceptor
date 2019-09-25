import React, {Component} from 'react';
import 'antd/dist/antd.css';
import {Switch, Input, Radio, Button} from 'antd';

import './Main.less';

export default class Main extends Component {
    constructor() {
        super();
        chrome.runtime.onMessage.addListener(({type, to, url, match}) => {
            if (type === 'ajaxInterceptor' && to === 'iframe') {
                // const {interceptedRequests} = this.state;
                // if (!interceptedRequests[match]) interceptedRequests[match] = [];

                // const exits = interceptedRequests[match].some(obj => {
                //     if (obj.url === url) {
                //         obj.num++;
                //         return true;
                //     }
                //     return false;
                // });

                // if (!exits) {
                //     interceptedRequests[match].push({url, num: 1});
                // }
                // this.setState({interceptedRequests}, () => {
                //     if (!exits) {
                //         // 新增的拦截的url，会多展示一行url，需要重新计算高度
                //         this.updateAddBtnTop_interval();
                //     }
                // });
            }
        });

        chrome.runtime.sendMessage(chrome.runtime.id, {
            type: 'ajaxInterceptor',
            to: 'background',
            iframeScriptLoaded: true
        });

        this.collapseWrapperHeight = -1;
    }

    state = {
        replyCurrentValue : 0,
        replyCurrentText: '',

        replyMoreText : '',
        replyTime:3,

        replyList : [{
            replyValue:1,
            replyText:'(桃心小蜂)'
        },{
            replyValue:2,
            replyText:'您好，目前咨询人数较多，请稍等，马上为您解答'
        },{
            replyValue:3,
            replyText:'客服暂时离开一小会，请您耐心等待，5-10分钟内尽快给您回复噢'
        },]
    };

    componentWillMount() {
        let replyCurrentValue = null;
        let replyCurrentText = null;
        let replyTime = null;
        let me = this;
        chrome.storage && chrome.storage.local.get(['replyCurrentValue','replyText','replyTime'],function(items){
            replyCurrentValue = items.replyCurrentValue;
            replyCurrentText = items.replyText;
            replyTime = items.replyTime;
                
            console.log('items:',items)

            if(replyCurrentValue){
                let state = {
                    replyCurrentText,
                    replyCurrentValue,
                }

                if(replyTime){
                    state.replyTime = replyTime;
                }

                if(replyCurrentValue == 4){
                    state.replyMoreText = replyCurrentText;
                }

                me.setState({
                    ...state
                },function(){
                    // me.handleConfirm()
                })
            }

        })
    } 

    // 发送消息
    set = (key, value) => {
        // 发送给background.js
        chrome.runtime.sendMessage(chrome.runtime.id, {
            type: 'ajaxInterceptor',
            to: 'background',
            key,
            value
        });
        console.log(chrome.storage)
        chrome.storage && chrome.storage.local.set({[key]: value});
    };
 

    // 开启或者关闭该功能
    handleSwitchChange = () => {
        window.setting.ajaxInterceptor_switchOn = !window.setting.ajaxInterceptor_switchOn;
        this.set('ajaxInterceptor_switchOn', window.setting.ajaxInterceptor_switchOn);
        this.forceUpdate();
    };  

    handleReplyRadioChange = (e) => {
        let value = e.target.value
        
        if(value == 4){
            this.setState({
                replyCurrentValue: value,
                replyCurrentText: this.state.replyMoreText
            });  

            return;
        }
        
        this.setState({
            replyCurrentValue: e.target.value,
            replyCurrentText: this.state.replyList[e.target.value-1].replyText
        });
    }

    // 其他文案的选项
    handleMoreTextChange = (e) => {
        this.setState({
            replyMoreText: e.target.value,
            replyCurrentText: e.target.value
        });
    }

    // 其他文案的失焦处理
    handleMoreTextBlur = (e) => {
        console.log(this.state.replyCurrentText,this.state.replyCurrentValue)
    }

    handleConfirm =()=>{
        chrome.storage && chrome.storage.local.set({['replyCurrentValue']: this.state.replyCurrentValue});
        this.set('replyText',this.state.replyCurrentText)
        this.set('replyTime',this.state.replyTime)
    }

    handleReplyTimeChange = (e) =>{
        this.setState({
            replyTime: e.target.value
        });
    }
    
    render() {
        const radioStyle = {
            display: 'block',
            height: '30px',
            lineHeight: '30px',
        };

        let radioList = this.state.replyList.map(function(item){
            return (<Radio style={radioStyle} value={item.replyValue}>
                {item.replyText}
            </Radio>)
        })

        return (
            <div className="main">
                <Switch
                    style={{zIndex: 10}}
                    defaultChecked={window.setting.ajaxInterceptor_switchOn}
                    onChange={this.handleSwitchChange}
                />
                <div className="reply-list">
                    回复内容
                    <Radio.Group onChange={this.handleReplyRadioChange} value={this.state.replyCurrentValue}>
                        {radioList}
                        <Radio style={radioStyle} value={4}>
                            其他
                            {this.state.replyCurrentValue === 4 ? (
                                <Input style={{width: 100, marginLeft: 10}} value={this.state.replyMoreText} onChange={this.handleMoreTextChange} onBlur={this.handleMoreTextBlur}/>
                            ) : null}
                        </Radio>
                    </Radio.Group>
                </div>
                <div className="reply-time">
                    回复时间 <Input value={this.state.replyTime}  onChange={this.handleReplyTimeChange} />
                </div>
                <Button type="primary" onClick={this.handleConfirm}>确定</Button>
            </div>
        );
    }
}
