import "reflect-metadata";
import { Container, Service } from "typedi";
import { getManager, Repository } from "typeorm";
import crypto from "crypto";

import { User } from "../entity";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import { ErrorInfo, VodError } from "../util/error";
import * as ErrorCode from "../util/errorcode";
import { UserAuth } from "../entity/userAuth";
import * as Platform from "../util/platform";
import { v4 as uuidv4 } from "uuid";
import { moduleConfig } from "../conf/config";
import https from "https";
import { UserAuthDao, UserDao } from "../dao";

export interface WxampSession {
    openid: string;
    session_key: string;
    unionid: string;
    errcode: string;
    errmsg: string;
}

// 用户第三方授权相关的服务类
@Service()
export class WxampUserService {
    userDao: UserDao;
    userAuthDao: UserAuthDao;
    constructor() {
        this.userDao = Container.get(UserDao);
        this.userAuthDao = Container.get(UserAuthDao);
    }

    /*
     * 获取或者创建用户信息
     * 如果小程序用户第一次登录，则创建新的默认账号并且授权给该小程序用户
     */
    public async getOrGenUserByOpenId(ctx: ServiceContext, openId: string) {
        // 校验参数
        if (!openId || openId == "") {
            logger.error(ctx, `find by openId failed`);
            throw new VodError(ErrorCode.AuthParamCheckFail, "get openId from code failed");
        }
        // 查询OpenId对应的用户信息
        let u: User;
        let ua = await this.userAuthDao.FindByAuthInfo(ctx, Platform.WechatMiniProgram, openId);

        if (!ua || !ua.UserId) {
            // 没有找到则新建用户并授权
            let newUser = await this.registerNewUser(ctx);
            if (newUser && newUser.Id != null) {
                let userAuth: UserAuth = new UserAuth(newUser.Id, Platform.WechatMiniProgram, openId);
                await this.userAuthDao.Save(ctx, userAuth);
                u = newUser;
                return u;
            }
            logger.error(ctx, `register new user failed`);
            throw new VodError(ErrorCode.InternalError, "Internal Error");
        }

        // 找到对应授权的用户
        let user = await this.userDao.FindById(ctx, ua.UserId);
        if (user) {
            u = user;
            return u;
        }
        logger.error(ctx, `get user info failed`);
        throw new VodError(ErrorCode.InternalError, "Internal Error");
    }

    /*
     * 新小程序用户注册
     * 先临时创建一个有效账号，然后可根据需求自行对用户名和密码进行修改。
     */
    private async registerNewUser(ctx: ServiceContext) {
        let retry = 3;
        while (retry > 0) {
            retry--;
            // UUIDV4 生成新账号信息
            let uuid: string = uuidv4();
            let nickName = "wx-" + uuid.substr(0, 17);
            let password = uuid.substr(19, 35);

            // 保存新账号
            try {
                let user: User = new User(nickName, password);
                let u: User = await this.userDao.Save(ctx, user);
                return u;
            } catch (error) {
                // 如果不是重复则重新生成
                if (error.code != ErrorCode.NickNameNotUnique) {
                    logger.error(ctx, `register error:`, error);
                    throw new VodError(ErrorCode.SaveUserAuthFail, "SaveUserAuthFail");
                }
            }
        }
        throw new VodError(ErrorCode.SaveUserAuthFail, "SaveUserAuthFail");
    }

    /*
     * 调用微信小程序 auth.code2Session 接口，获取OpenId 和 SecretId
     * 详情见：https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
     */
    public async codeToSession(ctx: ServiceContext, code: string) {
        // 获取OpenId 和 SecretId
        let appId = moduleConfig.wxAppConfig.appId;
        let appSecret = moduleConfig.wxAppConfig.appSecret;

        var buildUrl = require("build-url");
        let requestUrl = buildUrl("https://api.weixin.qq.com", {
            path: "sns/jscode2session",
            queryParams: {
                appid: appId,
                secret: appSecret,
                js_code: code,
                grant_type: "authorization_code",
            },
        });

        let responseStr = await new Promise(function blocking_http(resolve, reject) {
            https
                .get(requestUrl, (res) => {
                    res.on("data", (data) => {
                        resolve("" + data);
                    });
                    res.on("end", () => {});
                })
                .on("error", (e) => {
                    logger.error(ctx, `https request fail,request url:${requestUrl} error:`, e);
                    reject(new VodError(ErrorCode.InternalError, "Internal Error"));
                });
        });

        if (typeof responseStr === "string") {
            let response: WxampSession = JSON.parse(responseStr);
            return response;
        }
        logger.error(ctx, `https request fail,request url:${requestUrl} response:`, responseStr);
        throw new VodError(ErrorCode.InternalError, "Internal Error");
    }

    create() {}
}
