import { moduleConfig as config } from "../conf/config";
import { logger } from "../util/logger";
import { Context } from "@/util/ctx";

// tencentcloud-sdk-nodejs 暂无 Typescirpt 定义文件，此处使用 require 进行引入。
const tencentcloud = require("tencentcloud-sdk-nodejs");
const VodClient = tencentcloud.vod.v20180717.Client;
const models = tencentcloud.vod.v20180717.Models;

const Credential = tencentcloud.common.Credential;
const ClientProfile = tencentcloud.common.ClientProfile;
const HttpProfile = tencentcloud.common.HttpProfile;

/*
 * 删除媒体
 * API 参考: https://cloud.tencent.com/document/product/266/31764
 */
export function DeleteMedia(ctx: Context, fileId: string) {
    return new Promise((resolve, reject) => {
        let cred = new Credential(config.secretId, config.secretKey);
        let httpProfile = new HttpProfile();
        httpProfile.endpoint = "vod.tencentcloudapi.com";
        let clientProfile = new ClientProfile();
        clientProfile.httpProfile = httpProfile;
        let client = new VodClient(cred, "", clientProfile);

        let req = new models.DeleteMediaRequest();
        req.FileId = fileId;

        client.DeleteMedia(req, function (errMsg: any, response: any) {
            if (errMsg) {
                logger.error(ctx, `API DeleteMedia fail, fileId:${fileId}, errMsg: ${errMsg}`);
                reject(errMsg);
            }
            let rspStr: string = response.to_json_string();
            logger.info(ctx, `delete media success, fileId: ${fileId}, repsonse:${rspStr}`);
            resolve();
        });
    });
}

/*
 * 将点播视频发布到微信小程序，供微信小程序播放器播放。
 * API 参考: https://cloud.tencent.com/document/product/266/36035
 */
export function WeChatMiniProgramPublish(ctx: Context, fileId: string) {
    return new Promise((resolve, reject) => {
        let cred = new Credential(config.secretId, config.secretKey);
        let httpProfile = new HttpProfile();
        httpProfile.endpoint = "vod.tencentcloudapi.com";
        let clientProfile = new ClientProfile();
        clientProfile.httpProfile = httpProfile;
        let client = new VodClient(cred, "", clientProfile);

        let req = new models.WeChatMiniProgramPublishRequest();
        req.FileId = fileId;
        client.WeChatMiniProgramPublish(req, function (errMsg: any, response: any) {
            if (errMsg) {
                logger.error(ctx, `API WeChatMiniProgramPublish fail, fileIds:${fileId}, errMsg: ${errMsg}`);
                reject(errMsg);
            }
            let rspStr: string = response.to_json_string();
            logger.info(ctx, `we chat mini program publish success, fileIds: ${fileId}, repsonse:${rspStr}`);
            resolve(response);
        });
    });
}
