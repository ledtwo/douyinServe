const router = require("koa-router")();
const koa2Req = require("koa2-request");
const userAgentArr = require("./agent.js");
router.get("/", async (ctx, next) => {
  await ctx.render("index", {
    title: "Hello Koa 2!",
  });
});

router.get("/string", async (ctx, next) => {
  ctx.body = "koa2 string";
});

router.get("/json", async (ctx, next) => {
  ctx.body = {
    title: "koa2 json",
  };
});

// 抖音地址解析服务
router.post("/douyin", async (ctx, next) => {
  let postParam = ctx.request.body;
  console.log(postParam);
  // 视频分享地址
  let url = postParam.url;
  // PC版的videoId
  let trans_videoId = postParam.modal_id;
  // 直接使用终极vid
  let trans_vid = postParam.vid;
  ctx.body = {
    title: "这是我的抖音服务",
    url: url,
  };
  console.log(koa2Req.headers);
  try {
    // 如果采用的是分享链接 则直接三步走战略
    if (!trans_videoId && !trans_vid) {
      await koa2Req.get(url).then(async (res) => {
        console.log(res);
        // 1.取出抖音的视频地址
        const requestInfo = res.request;
        // 示例值
        //     {
        //     "content": {
        //         "uri": {
        //             "protocol": "https:",
        //             "slashes": true,
        //             "auth": null,
        //             "host": "www.douyin.com",
        //             "port": 443,
        //             "hostname": "www.douyin.com",
        //             "hash": null,
        //             "search": "?previous_page=app_code_link",
        //             "query": "previous_page=app_code_link",
        //             "pathname": "/video/7113386086419713321",
        //             "path": "/video/7113386086419713321?previous_page=app_code_link",
        //             "href": "https://www.douyin.com/video/7113386086419713321?previous_page=app_code_link"
        //         },
        //         "method": "GET",
        //         "headers": {
        //             "referer": "https://www.iesdouyin.com/share/video/7113386086419713321/?region=CN&mid=7113386124667587365&u_code=f9lmkg2i&did=MS4wLjABAAAAWOdMi9Xg7Vo2V-4FUMrqwtQiJaz2Qn1U8033UUVIBdZ6KPqZfHq8K6SSMIUqZVLu&iid=MS4wLjABAAAAczVfvMLwX0xX9NxcjH96kvVGUs66zkbxuzyGXsDN-EI&with_sec_did=1&titleType=title&utm_source=copy&utm_campaign=client_share&utm_medium=android&app=aweme"
        //         }
        //     }
        // }
        const shareRedirectVideoUrl = requestInfo.uri?.href;
        ctx.body.shareLink = shareRedirectVideoUrl;
        // 2.获取视频信息
        // 在拿到分享的重定向地址之后地址，根据videoId获取视频信息
        let videoId = shareRedirectVideoUrl.split("?")[0].split("/").slice(-1)[0];
        // 视频详细信息 接口地址：https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids={videoId}
        let infoOptions = {
          method: "get",
          url: `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`,
        };
        await koa2Req(infoOptions).then(async (res) => {
          const videoInfo = JSON.parse(res.body);
          // 3.获取无水印视频地址
          // 第三步 取到vid值  获取无水印视频地址
          // 示例值
          // {
          //   ...
          //   item_list:[
          //     {
          //       video:{
          //         vid:'********'
          //       }
          //     }
          //   ]
          //   ...
          // }
          const vid = videoInfo.item_list[0].video?.vid;
          ctx.body.vid = vid;
          // userAgent设备标识 防止遭遇403

          //去水印跳转播放接口 https://aweme.snssdk.com/aweme/v1/play/
          let finallyParams = {
            method: "get",
            url: `https://aweme.snssdk.com/aweme/v1/play/?video_id=${vid}&ratio=1080p&line=0`,
            headers: {
              authority: "aweme.snssdk.com",
              Host: "aweme.snssdk.com",
              "user-agent": userAgentArr[Math.floor(Math.random() * userAgentArr.length)],
            },
          };
          // ctx.body.redirectUrl = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${vid}&ratio=720p&line=0`;
          await koa2Req(finallyParams).then(async (res) => {
            ctx.body.finallyVideoUrl = res.request.uri?.href;
            // ctx.body.res = res;
          });
        });
      });
    } else if (trans_vid) {
      let finallyParams = {
        method: "get",
        url: `https://aweme.snssdk.com/aweme/v1/play/?video_id=${trans_vid}&ratio=1080p&line=0`,
        headers: {
          authority: "aweme.snssdk.com",
          Host: "aweme.snssdk.com",
          "user-agent": userAgentArr[Math.floor(Math.random() * userAgentArr.length)],
        },
      };
      // ctx.body.redirectUrl = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${vid}&ratio=720p&line=0`;
      await koa2Req(finallyParams).then(async (res) => {
        ctx.body.finallyVideoUrl = res.request.uri?.href;
        // ctx.body.res = res;
      });
    } else if (trans_videoId) {
      // 否则 直接取用videoId 进行水印的去除
      // 视频详细信息 接口地址：https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids={videoId}
      let infoOptions = {
        method: "get",
        url: `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${trans_videoId}`,
      };
      await koa2Req(infoOptions).then(async (res) => {
        const videoInfo = JSON.parse(res.body);
        // 3.获取无水印视频地址
        // 第三步 取到vid值  获取无水印视频地址
        const vid = videoInfo.item_list[0].video?.vid;
        ctx.body.vid = vid;
        // userAgent设备标识 防止遭遇403
        //去水印跳转播放接口 https://aweme.snssdk.com/aweme/v1/play/
        let finallyParams = {
          method: "get",
          url: `https://aweme.snssdk.com/aweme/v1/play/?video_id=${vid}&ratio=1080p&line=0`,
          headers: {
            authority: "aweme.snssdk.com",
            Host: "aweme.snssdk.com",
            "user-agent": userAgentArr[Math.floor(Math.random() * userAgentArr.length)],
          },
        };
        // ctx.body.redirectUrl = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${vid}&ratio=720p&line=0`;
        await koa2Req(finallyParams).then(async (res) => {
          ctx.body.finallyVideoUrl = res.request.uri?.href;
          // ctx.body.res = res;
        });
      });
    } else {
      ctx.body.msg = "参数有误，请检查！";
    }
  } catch (err) {
    ctx.body.err = err;
  }
});

module.exports = router;
