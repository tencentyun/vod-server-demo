import "reflect-metadata";
import { Container } from "typedi";
import { JsonController, Post, Body } from "routing-controllers";
import { v4 as uuidv4 } from "uuid";

import { User } from "../entity";
import { UserService, TokenService, ValidatorService } from "../service";
import { ModifyUserInfoDTO, GetUserInfoDTO } from "../dto";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import * as ErrorCode from "../util/errorcode";
import { Response } from "../util/response";

// 用户相关的控制器
@JsonController()
export class UserController {
    userService: UserService;
    tokenService: TokenService;
    validatorService: ValidatorService;

    constructor() {
        this.userService = Container.get(UserService);
        this.tokenService = Container.get(TokenService);
        this.validatorService = Container.get(ValidatorService);
    }

    /*
     * 修改用户信息
     */
    @Post('/ModifyUserInfo')
    public async modifyUserInfo(@Body({validate:false}) dto: ModifyUserInfoDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);
        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            // 校验 Token
            let userId = this.tokenService.Verify(ctx, dto.Token);
            if (!userId) {
                return new Response(requestId, ErrorCode.TokenInvalid, "Token invalid", {});
            }

            // 更新用户信息
            await this.userService.UpdateInfo(ctx, userId, dto);

        } catch (error) {
            logger.error(`[${ctx.RequestId}] modifyUserInfo error:`, error);
            logger.info(`[${ctx.RequestId}] modifyUserInfo dto:`, dto);
            logger.error(`[${requestId}] modify user info fail: ${error.Code}, ${error.Message}`);
            return new Response(requestId, error.Code, error.Message, {});

        }
        return new Response(requestId, ErrorCode.OK, "OK", {});
    }

    /*
     * 获取用户信息
     */
    @Post('/GetUserInfo')
    public async getUserInfo(@Body({validate: false}) dto: GetUserInfoDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId)
        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            // 校验 Token
            let userId = this.tokenService.Verify(ctx, dto.Token);
            if (!userId) {
                return new Response(requestId, ErrorCode.TokenInvalid, "Token invalid", {});
            }

            // 查找客户信息
            let u = await this.userService.FindById(ctx, userId);
            return new Response(requestId, ErrorCode.OK, "OK", {
                NickName: u!.NickName,
                Avatar: u!.Avatar,
                Description: u!.Description
            });

        } catch (error) {
            logger.error(`[${ctx.RequestId}] getUserInfo error:`, error);
            logger.info(`[${ctx.RequestId}] getUserInfo dto:`, dto);
            logger.error(`[${requestId}] get user info fail: ${error.Code}, ${error.Message}`);
            return new Response(requestId, error.Code, error.Message, {});
        }
    }

}
