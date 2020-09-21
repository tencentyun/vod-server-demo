import { URL, URLSearchParams } from "url";
import path from "path";
import crypto from "crypto";

import { moduleConfig as config } from "../conf/config";
import { logger } from "../util/logger";
import { Context } from "@/util/ctx";

interface PlayInfo {
    Url: string; // 播放 URL
    ExpireTime: string; // 过期时间戳
}

/*
 * 获取播放信息
 * Key 防盗链的生成方式参考：https://cloud.tencent.com/document/product/266/14047
 */
export function GetPlayInfo(ctx: Context, u: string, expire: number): PlayInfo {
    if (!config.urlKey || config.urlKey.length == 0 || expire == 0) {
        return {
            Url: u,
            ExpireTime: "",
        };
    }
    try {
        let urlObj = new URL(u);
        let key: string = config.urlKey;
        let pathname = urlObj.pathname || "/";
        let dir: string = path.dirname(pathname);
        dir = dir[dir.length - 1] != "/" ? dir + "/" : dir;
        let expireTs: number = Math.floor(Date.now() / 1000) + expire;
        let t: string = expireTs.toString(16);
        let us: string = Math.random().toString(36).slice(2, 12);

        let plain = key + dir + t + us;
        let sign = crypto.createHash("md5").update(plain).digest("hex");
        let search = urlObj.search || "";

        let params = new URLSearchParams(search);
        params.append("t", t);
        params.append("us", us);
        params.append("sign", sign);

        urlObj.search = params.toString();
        return {
            Url: urlObj.toString(),
            ExpireTime: new Date(expireTs * 1000).toISOString(),
        };
    } catch (error) {
        logger.error(ctx, `url parse error:`, error);
        return {
            Url: u,
            ExpireTime: "",
        };
    }
}
