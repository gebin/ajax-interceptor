// 更新聊天信息
const POLLING_URLS = [
    {
        match: '//im.mafengwo.cn/admin/chat/polling',
        version: '2.0'
    },{
        match:'//im.mafengwo.cn/polling/event/',
        version:'1.0'
    }
]

// 发送回复消息
const POST_MESSAGE_URLS = [
    {
        match: "//im.mafengwo.cn/admin/chat/message_post",
        version : "2.0"
    },{
        match:'//im.mafengwo.cn/rest/im/event/',
        version : '1.0'
    }
]

window.userReplyMap = {};
window.replyTime = 3000;
window.replyText = '(桃心小蜂)';

// 命名空间
let ajax_interceptor_qoweifjqon = {
    settings: {
        ajaxInterceptor_switchOn: false,
        ajaxInterceptor_rules: []
    },
    originalXHR: window.XMLHttpRequest,
    myXHR: function() {
        let pageScriptEventDispatched = false;
        const xhr = new ajax_interceptor_qoweifjqon.originalXHR();

        const modifyResponse = () => {
            // 对比是否满足指定的规则
            POLLING_URLS.forEach(({match, version}) => {
                if (match && this.responseURL.indexOf(match) > -1) {
                    if (this.response) {
                        // 继续判断是不是符合要求，比如某个字段
                        let responseJSON = JSON.parse(this.response);
                        handleNewMessage(responseJSON,version,this.responseURL)
                    }

                    if (!pageScriptEventDispatched) {
                        window.dispatchEvent(
                            new CustomEvent('pageScript', {
                                detail: {url: this.responseURL, match}
                            })
                        );
                        pageScriptEventDispatched = true;
                    }
                }
            });

            // 判断是否人工回复，如果回复成功，就清空所有的回复。
            POST_MESSAGE_URLS.forEach(({match, version}) => {
                if (match && this.responseURL.indexOf(match) > -1) {
                    if(this.response){
                        try{
                            let responseJSON = JSON.parse(this.response);
                            handlePostMessage(responseJSON,version,this.responseURL);
                        }catch(e){
                            console.log(e)
                        }
                    }
                }                
            }); 
        };

        for (let attr in xhr) {
            if (attr === 'onreadystatechange') {
                xhr.onreadystatechange = (...args) => {
                    if (this.readyState == 4) {
                        // 请求成功
                        if (ajax_interceptor_qoweifjqon.settings.ajaxInterceptor_switchOn) {
                            // 开启拦截
                            modifyResponse();
                        }
                    }
                    this.onreadystatechange && this.onreadystatechange.apply(this, args);
                };
                continue;
            }

            if (typeof xhr[attr] === 'function') {
                this[attr] = xhr[attr].bind(xhr);
            } else {
                // responseText和response不是writeable的，但拦截时需要修改它，所以修改就存储在this[`_${attr}`]上
                if (attr === 'responseText' || attr === 'response') {
                    Object.defineProperty(this, attr, {
                        get: () => (this[`_${attr}`] == undefined ? xhr[attr] : this[`_${attr}`]),
                        set: val => (this[`_${attr}`] = val),
                        enumerable: true
                    });
                } else {
                    Object.defineProperty(this, attr, {
                        get: () => xhr[attr],
                        set: val => (xhr[attr] = val),
                        enumerable: true
                    });
                }
            }
        }
    },

    originalFetch: window.fetch.bind(window),
    myFetch: function(...args) {
        return ajax_interceptor_qoweifjqon.originalFetch(...args).then(response => {
            let txt = undefined;
            ajax_interceptor_qoweifjqon.settings.ajaxInterceptor_rules.forEach(
                ({match, overrideTxt = ''}) => {
                    if (match && response.url.indexOf(match) > -1) {
                        window.dispatchEvent(
                            new CustomEvent('pageScript', {
                                detail: {url: response.url, match}
                            })
                        );
                        txt = overrideTxt;
                    }
                }
            );

            if (txt !== undefined) {
                const stream = new ReadableStream({
                    start(controller) {
                        const bufView = new Uint8Array(new ArrayBuffer(txt.length));
                        for (var i = 0; i < txt.length; i++) {
                            bufView[i] = txt.charCodeAt(i);
                        }

                        controller.enqueue(bufView);
                        controller.close();
                    }
                });

                const newResponse = new Response(stream, {
                    headers: response.headers,
                    status: response.status,
                    statusText: response.statusText
                });
                const proxy = new Proxy(newResponse, {
                    get: function(target, name) {
                        switch (name) {
                            case 'ok':
                            case 'redirected':
                            case 'type':
                            case 'url':
                            case 'useFinalURL':
                            case 'body':
                            case 'bodyUsed':
                                return response[name];
                        }
                        return target[name];
                    }
                });

                for (let key in proxy) {
                    if (typeof proxy[key] === 'function') {
                        proxy[key] = proxy[key].bind(newResponse);
                    }
                }

                return proxy;
            } else {
                return response;
            }
        });
    }
};

window.addEventListener(
    'message',
    function(event) {
        const data = event.data;
        if (data.type === 'ajaxInterceptor' && data.to === 'pageScript') {
            if(data.key === 'replyText'){
                window.replyText = data.value;
                return;
            }
            if(data.key === 'replyTime'){
                window.replyTime = data.value * 1000;
                return;
            }

            ajax_interceptor_qoweifjqon.settings[data.key] = data.value;
        }

        if (ajax_interceptor_qoweifjqon.settings.ajaxInterceptor_switchOn) {
            window.XMLHttpRequest = ajax_interceptor_qoweifjqon.myXHR;
            window.fetch = ajax_interceptor_qoweifjqon.myFetch;
        } else {
            window.XMLHttpRequest = ajax_interceptor_qoweifjqon.originalXHR;
            window.fetch = ajax_interceptor_qoweifjqon.originalFetch;
        }
    },
    false
);

// 处理新消息
function handleNewMessage(responseJSON,version,responseUrl){
    if(version === '2.0'){
        try {
            if (!responseJSON.data.list || responseJSON.data.list.length === 0) {
                return;
            }
            let line_id = responseJSON.data.list[0].item.info.line_id;
            let name = responseJSON.data.list[0].item.name;
            let timeout = null;
            if (name === 'message_new') {
                timeout = setTimeout(function() {
                    console.log(line_id);
                    replyMessage2(line_id,version);
                }, window.replyTime);
            }

            // 构建一个回复用户的timeout列表。
            if(userReplyMap[line_id]){
                timeout && (userReplyMap[line_id].push(timeout));
            } else {
                timeout && (userReplyMap[line_id] = [timeout]);
            }
        } catch (e) {}
    }

    if(version === '1.0'){
        let timeout = null;
        let arr = responseUrl.split('?');
        arr = decodeURIComponent(arr[1]).split('&');

        if(arr[0] === 'filter[e]=req.polling'){
            let respList = responseJSON.data.list;
            respList.forEach(function(item){
                if(item.e === "res.user.refresh"){
                    let user = item.b.user;
                    let line_id = user.c_uid;

                    timeout = setTimeout(function() {
                        console.log(line_id);
                        replyMessage1(line_id)
                    }, window.replyTime);

                    // 构建一个回复用户的timeout列表。
                    if(userReplyMap[line_id]){
                        timeout && (userReplyMap[line_id].push(timeout));
                    } else {
                        timeout && (userReplyMap[line_id] = [timeout]);
                    }
                }
            })
        }
    }
}

function handlePostMessage(responseJSON,version,responseUrl){
    if(version === '1.0'){
        try{
            if(responseJSON.errno === 0){
                let line_id = responseJSON.data.after.b.message.to_uid;
                let type = responseJSON.data.after.e;

                if(type === 'res.message.post'){
                    checkReplyList(line_id);
                }
            }
        }catch(e){
        }
    }

    if(version === '2.0'){
        try{
            if(responseJSON.errno === 0){
                let line_id = responseJSON.data.line_id;
                checkReplyList(line_id);
            }
        }catch(e){
        }
    }
}

// 检查回复列表中的数据
function checkReplyList(line_id){
    let replyList = window.userReplyMap[line_id];
    if(!replyList){
        return;
    }

    // 如果还有排队的，请删除
    replyList.forEach(function(item){
        console.log('clearTimeout',item)
        clearTimeout(item);
    })
    window.userReplyMap[line_id] = [];
}

// 回复用户
function replyMessage2(line_id,version){
    checkReplyList(line_id);

    let url = 'https://im.mafengwo.cn/admin/chat/message_post';

    $.ajax({
        url: url,
        method: 'post',
        data: {
            line_id: line_id,
            message: {
                type: 1,
                content: {
                    text: window.replyText
                }
            }
        },
        success: function(res) {
            console.log(res);
        },
        error: function() {}
    });
}

// 回复用户
function replyMessage1(line_id,version){
    checkReplyList(line_id);

    let url = 'https://im.mafengwo.cn/rest/im/event/';

    $.ajax({
        url: url,
        method: 'post',
        data: {
            update: {
                e: 'req.message.post',
                b: {
                    message: {
                        type: 1,
                        to_uid: line_id,
                        timestamp: Math.ceil(new Date().getTime()/1000),
                        content: {
                            text: window.replyText
                        },
                        prefix_id: new Date().getTime()
                    },
                    role: {
                        is_b: '1',
                        is_pc: '1'
                    }
                },
                t: new Date().getTime(),
                v: '1.0'
            },
            post_style: 'default',
            after_style: 'default'
        },
        success: function(res) {
            console.log(res);
        },
        error: function() {}
    });
}
