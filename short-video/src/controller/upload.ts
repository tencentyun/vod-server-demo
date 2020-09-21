import "reflect-metadata";
import { Container } from "typedi";
import { JsonController, Post, Body } from "routing-controllers";
import { v4 as uuidv4 } from "uuid";

import { GetUploadSignDTO } from "../dto";
import { TokenService, ValidatorService, UploadService } from "../service";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import * as ErrorCode from "../util/errorcode";
import { Response } from "../util/response";

// 上传相关的控制器
@JsonController()
export class UploadController {
    uploadService: UploadService;
    tokenService: TokenService;
    validatorService: ValidatorService;

    constructor() {
        this.uploadService = Container.get(UploadService);
        this.tokenService = Container.get(TokenService);
        this.validatorService = Container.get(ValidatorService);
    }

    /*
     * 获取上传签名
     * 详情参考：https://cloud.tencent.com/document/product/266/9219
     */
    @Post("/GetUploadSign")
    public async getUploadSign(@Body({ validate: false }) dto: GetUploadSignDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);
        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            // 校验 Token
            let tokenData = this.tokenService.Verify(ctx, dto.Token);
            if (!tokenData) {
                return new Response(requestId, ErrorCode.TokenInvalid, "Token invalid", {});
            }
            let userId = tokenData.UserId;
            let requestSource = tokenData.RequestSource;

            // 生产签名
            let signInfo = this.uploadService.Generate(
                ctx,
                JSON.stringify({
                    UserId: userId,
                    RequestSource: requestSource,
                    ClientSourceContext: dto.SourceContext,
                })
            );
            logger.info(ctx, `get upload sign: ${signInfo.Sign}, SourceContext:${dto.SourceContext}`);
            return new Response(requestId, ErrorCode.OK, "OK", {
                UploadSign: signInfo.Sign,
                ExpireTime: signInfo.ExpireTime,
            });
        } catch (error) {
            logger.error(ctx, `getUploadSign error:`, error);
            logger.info(ctx, `getUploadSign dto:`, dto);
            logger.error(ctx, `get upload sign fail: ${error.Code}, ${error.Message}, error:`, error);
            return new Response(requestId, error.Code, error.Message, {});
        }
    }
}
