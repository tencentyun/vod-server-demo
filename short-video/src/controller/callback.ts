import "reflect-metadata";
import { Request } from "koa";
import { Container } from "typedi";
import { JsonController, Post, Body, ForbiddenError } from "routing-controllers";
import { v4 as uuidv4 } from "uuid";

import { CallbackDTO } from "../dto";
import { CallbackService } from "../service";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import * as ErrorCode from "../util/errorcode";
import { Response } from "../util/response";

// 回调相关的控制器
@JsonController()
export class CallbackController {
    callbackService: CallbackService;

    constructor() {
        this.callbackService = Container.get(CallbackService);
    }

    /*
     * 回调
     * 本 Demo 采用普通回调3.0的模式接收视频上传完成的事件通知。也可以使用可靠回调模式，开发者可根据自身业务特点选择回调模式。
     * 详情参考：
     *      上传回调：
     *          https://cloud.tencent.com/document/product/266/7830
     *      视频内容审核回调：
     *          https://cloud.tencent.com/document/product/266/9636
     *          https://cloud.tencent.com/document/product/266/33498#.E7.BB.93.E6.9E.9C.E8.8E.B7.E5.8F.96
     */
    @Post("/Callback")
    public async Callback(@Body() dto: CallbackDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);

        try {
            logger.info(ctx, `callback dto:`, JSON.stringify(dto));
            await this.callbackService.Handle(ctx, dto);
        } catch (error) {
            logger.error(ctx, `callback error:`, error);
            logger.info(ctx, `callback dto:`, dto);
            logger.error(ctx, `callback fail: `, error);
            throw new ForbiddenError("Fail to handle callback");
        }
        return "Handle callback success";
    }
}
