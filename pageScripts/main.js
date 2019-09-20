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
      [
        // {
        //   match: "https://im.mafengwo.cn/admin/chat/message_post"
        // },
        {
          match: "https://im.mafengwo.cn/admin/chat/polling"
        }
      ].forEach(({ match, overrideTxt = "" }) => {
        if (match && this.responseURL.indexOf(match) > -1) {
          if (this.response) {
            // 继续判断是不是符合要求，比如某个字段
            let responseJSON = JSON.parse(this.response);
            
            debugger
            let line_id = responseJSON.data.list[0].item.info.line_id;
            let name = responseJSON.data.list[0].item.name;

            // $.ajax({
            //   url: "https://im.mafengwo.cn/rest/im/event/",
            //   method: "post",
            //   data: {
            //     update: {
            //       e: "req.message.post",
            //       b: {
            //         message: {
            //           type: 1,
            //           to_uid: "484173610",
            //           timestamp: new Date().getTime(),
            //           content: {
            //             text: "您好！"
            //           },
            //           prefix_id: new Date().getTime()
            //         },
            //         role: {
            //           is_b: "1",
            //           is_pc: "1"
            //         },
            //         t: new Date().getTime(),
            //         v: "1.0"
            //       }
            //     },
            //     post_style: "default",
            //     after_style: "default"
            //   },
            //   success: function(res) {
            //     console.log(res);
            //   },
            //   fail: function() {}
            // });
            debugger
            if(name === 'message_new'){
              var replyT = setTimeout(function(){
                $.ajax({
                  url: "https://im.mafengwo.cn/admin/chat/message_post",
                  method: "post",
                  data: {
                    line_id:line_id,
                    message:{
                      type:1,
                      content:{
                        text : '(爱心)'
                      }
                    }
                  },
                  success: function(res) {
                    console.log(res);
                  },
                  fail: function() {}
                });
              },3000)
            }
          }

          if (!pageScriptEventDispatched) {
            window.dispatchEvent(
              new CustomEvent("pageScript", {
                detail: { url: this.responseURL, match }
              })
            );
            pageScriptEventDispatched = true;
          }
        }
      });
    };

    for (let attr in xhr) {
      if (attr === "onreadystatechange") {
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

      if (typeof xhr[attr] === "function") {
        this[attr] = xhr[attr].bind(xhr);
      } else {
        // responseText和response不是writeable的，但拦截时需要修改它，所以修改就存储在this[`_${attr}`]上
        if (attr === "responseText" || attr === "response") {
          Object.defineProperty(this, attr, {
            get: () =>
              this[`_${attr}`] == undefined ? xhr[attr] : this[`_${attr}`],
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
        ({ match, overrideTxt = "" }) => {
          if (match && response.url.indexOf(match) > -1) {
            window.dispatchEvent(
              new CustomEvent("pageScript", {
                detail: { url: response.url, match }
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
              case "ok":
              case "redirected":
              case "type":
              case "url":
              case "useFinalURL":
              case "body":
              case "bodyUsed":
                return response[name];
            }
            return target[name];
          }
        });

        for (let key in proxy) {
          if (typeof proxy[key] === "function") {
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
  "message",
  function(event) {
    const data = event.data;
    if (data.type === "ajaxInterceptor" && data.to === "pageScript") {
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
