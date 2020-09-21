import "reflect-metadata";
import { Container } from "typedi";
import { Body, JsonController, Post } from "routing-controllers";
import { v4 as uuidv4 } from "uuid";

import { User, UserAuth } from "../entity";
import { WxampSession, TokenService, ValidatorService, WxampUserService } from "../service";

import { logger } from "../util/logger";
import * as ErrorCode from "../util/errorcode";
import { Response } from "../util/response";
import { Context as ServiceContext } from "../util/ctx";
import { WxampLoginDTO } from "../dto/wxampAccount";
import { moduleConfig } from "../conf/config";
import https from "https";
import { VodError } from "../util/error";
import * as Platform from "../util/platform";

// 微信小程序第三方授权验证相关的控制器
@JsonController()
export class WxampAccountController {
    tokenService: TokenService;
    validatorService: ValidatorService;
    userAuthService: WxampUserService;

    constructor() {
        this.tokenService = Container.get(TokenService);
        this.validatorService = Container.get(ValidatorService);
        this.userAuthService = Container.get(WxampUserService);
    }

    /*
     * 微信小程序登录
     */
    @Post("/WXAMPLogin")
    public async wxampLogin(@Body({ validate: false }) dto: WxampLoginDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);
        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            // 获取 OpenId
            let session: WxampSession = await this.userAuthService.codeToSession(ctx, dto.Code);
            let openId = session.openid;

            //通过 OpenId 获取用户信息，或者新建用户
            let u: User = await this.userAuthService.getOrGenUserByOpenId(ctx, openId);

            // 生成 Token
            let tokenInfo = this.tokenService.Generate(ctx, <string>u!.Id, Platform.WechatMiniProgram);
            return new Response(requestId, ErrorCode.OK, "OK", {
                UserId: u!.Id,
                Token: tokenInfo.Token,
                TokenExpireTime: tokenInfo.ExpireTime,
                NickName: u!.NickName,
                Avatar: u!.Avatar,
                Description: u!.Description,
            });
        } catch (error) {
            logger.error(ctx, `login error:`, error);
            logger.info(ctx, `wxampLogin dto:`, dto);
            logger.error(ctx, ` login fail: ${error.Code}, ${error.Message}`);
            return new Response(requestId, error.Code, error.Message, {});
        }
    }
}
