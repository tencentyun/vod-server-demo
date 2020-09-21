import "reflect-metadata";
import { Service } from "typedi";
import querystring from "querystring";
import crypto from "crypto";

import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import { moduleConfig as config } from "../conf/config";

export interface UploadSignInfo {
    Sign: string;
    ExpireTime: string;
}

// 上传相关的服务类
@Service()
export class UploadService {
    /*
     * 生成签名
     * 详情参考：https://cloud.tencent.com/document/product/266/9221
     */
    public Generate(ctx: ServiceContext, context: string): UploadSignInfo {
        let current = Math.floor(Date.now() / 1000);
        let expireTs = current + 7200; // 签名有效期：2小时
        let args = {
            secretId: config.secretId,
            currentTimeStamp: current,
            expireTime: expireTs,
            random: Math.round(Math.random() * Math.pow(2, 32)),
            /*
             * 开发者可以自行设置视频上传存储的园区，不指定的话将使用默认存储园区。
             * storageRegion: "ap-chongqing",
             */
        };
        if (context) {
            Reflect.set(args, "sourceContext", context);
            Reflect.set(args, "sessionContext", context);
        }
        if (config.procedure) {
            Reflect.set(args, "procedure", config.procedure);
        }
        return {
            Sign: this.genSha1Sign(args),
            ExpireTime: new Date(expireTs * 1000).toISOString(),
        };
    }

    public genSha1Sign(args: any) {
        let original = querystring.stringify(args);
        let originalBuffer = Buffer.from(original, "utf8");
        let key = Buffer.from(config.secretKey, "utf8");
        let hmac = crypto.createHmac("sha1", key);
        let hmacBuffer = hmac.update(originalBuffer).digest();
        let signature = Buffer.concat([hmacBuffer, originalBuffer]).toString("base64");
        return signature;
    }
}
