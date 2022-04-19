"use strict";
import "reflect-metadata";
import Koa from "koa";
import koaBodyParser from "koa-bodyparser";
import { useKoaServer } from "routing-controllers";
import koaBody from "koa-body";
import { createConnection } from "typeorm";

import { logger, accessLogger } from "./util/logger";
import { moduleConfig as config } from "./conf/config";
import {
    AccountController,
    UserController,
    UploadController,
    MediaController,
    CallbackController,
    PlayController,
    WxampAccountController,
} from "./controller";

// 建立数据库连接
async function initDB() {
    console.log("%%%%%%%%%%%%%%%%%%",config)
    return await createConnection({
        type: "mysql",
        host: config!.db.host,
        port: config!.db.port,
        username: config!.db.username,
        password: config!.db.password,
        database: config!.db.database,
        entities: [__dirname + "/entity/*.js"], // 注册实体信息
        logging: true,
        synchronize: false, // 不与数据库同步，否则会自动更新表结构
    });
    // return await createConnection({
    //     type: "mysql",
    //     host: "localhost",
    //     port: 3306,
    //     username: "root",
    //     password: "12345678",
    //     database: "short_video",
    //     entities: [__dirname + "/entity/*.js"], // 注册实体信息
    //     logging: true,
    //     synchronize: false, // 不与数据库同步，否则会自动更新表结构
    // });
}

// 启动服务器
async function startServer() {
    console.log("config:", config);
    try {
        await initDB();

        const App = new Koa();

        // body解析
        App.use(
            koaBodyParser({
                extendTypes: {
                    json: ["application/x-www-form-urlencoded"], //对于Content-Type 为 application/x-www-form-urlencoded 默认也当做 JSON 处理
                },
            })
        );

        // 开启访问日志
        App.use(accessLogger);

        App.on("error", (err: any, ctx: any) => {
            console.error("server error !!!!!!!!!!!!!", err, ctx);
        });

        let port: number = config!.port;
        useKoaServer(App, {
            // 注册控制器
            controllers: [
                AccountController,
                UserController,
                UploadController,
                MediaController,
                CallbackController,
                PlayController,
                WxampAccountController,
            ],
        }).listen(port, () => {
            console.log(`server is running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error("start server error: ", error);
    }
}

// 程序入口
startServer();
