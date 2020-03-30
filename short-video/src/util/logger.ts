import * as path from "path";
import * as log4js from "koa-log4";

// 初始化日志的配置
log4js.configure({
    appenders: {
        access: {
            type: "dateFile",
            pattern: "-yyyy-MM-dd.log", //生成文件的规则
            encoding: "utf-8",
            filename: path.join("logs/", "access.log") //生成文件名
        },
        application: {
            type: "dateFile",
            pattern: "-yyyy-MM-dd.log",
            encoding: "utf-8",
            filename: path.join("logs/", "application.log")
        },
        out: {
            type: "console"
        }
    },
    categories: {
        default: { appenders: ["out"], level: "ALL" },
        access: { appenders: ["access"], level: "ALL" },
        application: { appenders: ["application"], level: "ALL" }
    }
});

const logger = log4js.getLogger("application"); //记录所有应用级别的日志
const accessLogger = log4js.koaLogger(log4js.getLogger("access")); //记录所有访问级别的日志
export { logger, accessLogger };
