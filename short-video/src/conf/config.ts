import * as fs from "fs";

interface ModuleConfig {
    /** 服务端监听端口号 */
    readonly port: number;

    /** 数据库配置 */
    readonly db: DBConfig;

    /*
    * 任务流模板
    * 详情参考：https://cloud.tencent.com/document/product/266/33819
    */
    readonly procedure: string;

    /*
    * API 密钥（SecretId/SecretKey）代表您的账号身份和所拥有的权限，等同于您的登录密码。
    * 查看密钥信息：https://console.cloud.tencent.com/cam/capi
    */
    readonly secretId: string;
    readonly secretKey: string;

    /*
    * URL 防盗链 key
    * 详情参考：https://cloud.tencent.com/document/product/266/14047
    */
    readonly urlKey: string;

    /*
    * 微信小程序的ID（appid/appSecret）
    */
    readonly wxAppConfig: WXAppConfig
}

interface DBConfig {
    readonly host: string;
    readonly port: number;
    readonly username: string;
    readonly password: string;
    readonly database: string;
}

interface WXAppConfig {
    readonly appId: string;
    readonly appSecret: string;
}

// 初始化配置
function initConf(): ModuleConfig {
    let conf: ModuleConfig = {
        port: 3000,
        db: {
            host: "localhost",
            port: 3306,
            username: "root",
            password: '12345678',
            database: "short_video"
        },
        procedure: "short_video",
        secretId: "",
        secretKey: "",
        urlKey: "",
        wxAppConfig: {
            appId: "wx123456",
            appSecret: "wx123456",
        }
    };
    try {
        let data: string = fs.readFileSync(
            __dirname + "/moduleConfig.json",
            "utf8"
        );
        console.log("data is :", __dirname + "/moduleConfig.json")
        if (data !== "") {
            conf = JSON.parse(data);
        }
    } catch (error) {
        console.error("read config.json file error:", error);
    }
    return conf;
}

export const moduleConfig = initConf();
