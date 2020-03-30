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
}

interface DBConfig {
    readonly host: string;
    readonly port: number;
    readonly username: string;
    readonly password: string;
    readonly database: string;
}

// 初始化配置
function initConf(): ModuleConfig {
    let conf: ModuleConfig = {
        port: 3000,
        db: {
            host: "localhost",
            port: 3306,
            username: "root",
            password: "",
            database: "short-video"
        },
        procedure:"short-video",
        secretId: "",
        secretKey: "",
        urlKey: ""
    };
    try {
        let data: string = fs.readFileSync(
            __dirname + "/moduleConfig.json",
            "utf8"
        );
        if (data !== "") {
            conf = JSON.parse(data);
        }
    } catch (error) {
        console.error("read config.json file error:", error);
    }
    return conf;
}

export const moduleConfig = initConf();
