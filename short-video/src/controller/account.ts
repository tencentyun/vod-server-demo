import "reflect-metadata";
import { Container } from "typedi";
import { JsonController, Post, Body } from "routing-controllers";
import { validate, ValidationError } from "class-validator";
import { v4 as uuidv4 } from "uuid";

import { User } from "../entity";
import { UserService, TokenService, ValidatorService } from "../service";
import { SigninDTO, LoginDTO, ModifyPasswordDTO } from "../dto";
import { logger } from "../util/logger";
import * as ErrorCode from "../util/errorcode";
import { Response } from "../util/response";
import { Context as ServiceContext } from "../util/ctx";

// 账号相关的控制器
@JsonController()
export class AccountController {
    userService: UserService;
    tokenService: TokenService;
    validatorService: ValidatorService;

    constructor() {
        this.userService = Container.get(UserService);
        this.tokenService = Container.get(TokenService);
        this.validatorService = Container.get(ValidatorService);
    }

    /* 
     * 注册
     * 风险提示：
     * 1. 此处密码使用明文存储和传输，存在密码泄露风险，生产环境建议使用 HTTPS 协议，使用加密或加盐哈希等安全手段规避此问题。
     * 2. 登录状态通过 JSON Web Token 实现，生产环境建议使用 Session 或其他方式进行管理。
     */
    @Post("/Signin")
    public async signin(@Body({ validate: false }) dto: SigninDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);
        let userId: string | undefined = "";

        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            // 保存 User
            let user: User = new User(dto.NickName, dto.Password);
            let u = await this.userService.Save(ctx, user);
            userId = u!.Id;

            // 生成 Token
            let tokenInfo = this.tokenService.Generate(ctx, <string>userId);
            return new Response(requestId, ErrorCode.OK, "OK", {
                UserId: userId,
                Token: tokenInfo.Token,
                TokenExpireTime: tokenInfo.ExpireTime
            });
        } catch (error) {
            logger.error(`[${ctx.RequestId}] signin error:`, error);
            logger.info(`[${ctx.RequestId}] signin dto:`, dto);
            logger.error(`[${requestId}] signin fail: ${error.Code}, ${error.Message}`);
            return new Response(requestId, error.Code, error.Message, {});
        }

    }

    /* 
     * 登录
     * 风险提示：
     * 1. 此处密码使用明文传输，存在密码泄露风险，生产环境建议使用 HTTPS 协议，使用加密或加盐哈希等安全手段规避此问题。
     * 2. 登录状态通过 JSON Web Token 实现，生产环境建议使用 Session 或其他组件进行管理。
     */
    @Post("/Login")
    public async login(@Body({ validate: false }) dto: LoginDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);
        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            // 校验密码
            await this.userService.VerifyPasswordByNickName(ctx, dto.NickName, dto.Password);

            let u = await this.userService.FindByNickName(ctx, dto.NickName);

            // 生成 Token
            let tokenInfo = this.tokenService.Generate(ctx, <string>u!.Id);
            return new Response(requestId, ErrorCode.OK, "OK", {
                UserId: u!.Id,
                Token: tokenInfo.Token,
                TokenExpireTime: tokenInfo.ExpireTime,
                NickName: u!.NickName,
                Avatar: u!.Avatar,
                Description: u!.Description
            });
        } catch (error) {
            logger.error(`[${ctx.RequestId}] login error:`, error);
            logger.info(`[${ctx.RequestId}] login dto:`, dto);
            logger.error(`[${requestId}] login fail: ${error.Code}, ${error.Message}`);
            return new Response(requestId, error.Code, error.Message, {});
        }

    }

    /* 
     * 修改密码
     */
    @Post("/ModifyPassword")
    public async modifyPassword(@Body({ validate: false }) dto: ModifyPasswordDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);
        let userId: string | undefined;
        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            // 校验 Token
            userId = this.tokenService.Verify(ctx, dto.Token);
            if (!userId) {
                return new Response(requestId, ErrorCode.TokenInvalid, "Token invalid", {});
            }

            // 校验旧密码
            await this.userService.VerifyPasswordByUserId(ctx, userId, dto.OldPassword);

            // 更新密码
            await this.userService.UpdatePasswrod(ctx, userId, dto.NewPassword);

            // 生成 Token
            let tokenInfo = this.tokenService.Generate(ctx, <string>userId);
            return new Response(requestId, ErrorCode.OK, "OK", {
                Token: tokenInfo.Token,
                TokenExpireTime: tokenInfo.ExpireTime
            });
        } catch (error) {
            logger.error(`[${ctx.RequestId}] modifyPassword error:`, error);
            logger.info(`[${ctx.RequestId}] modifyPassword dto:`, dto);
            logger.error(`[${requestId}] modifyPassword fail: ${error.Code}, ${error.Message}`);
            return new Response(requestId, error.Code, error.Message, {});
        }

    }

}
