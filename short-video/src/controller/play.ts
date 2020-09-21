import "reflect-metadata";
import { Container } from "typedi";
import { JsonController, Post, Body } from "routing-controllers";
import { v4 as uuidv4 } from "uuid";

import { Video } from "../entity";
import { PlayVideoDTO } from "../dto";
import { ValidatorService, VideoService } from "../service";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import * as ErrorCode from "../util/errorcode";
import { Response } from "../util/response";
import { GetPlayInfo } from "../util/play";

// 播放相关的控制器
@JsonController()
export class PlayController {
    validatorService: ValidatorService;
    videoService: VideoService;

    constructor() {
        this.validatorService = Container.get(ValidatorService);
        this.videoService = Container.get(VideoService);
    }

    /*
     * 获取播放信息
     * 播放 URL 是带防盗链签名的，详情参考：https://cloud.tencent.com/document/product/266/14047
     */
    @Post("/PlayVideo")
    public async playVideo(@Body({ validate: false }) dto: PlayVideoDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);
        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            // 查找视频信息
            let video = await this.videoService.FindById(ctx, dto.VideoId);
            logger.error(ctx, `play video success: `, video);

            // 获取播放信息
            let playInfo = GetPlayInfo(ctx, video!.Url, 2 * 3600);
            return new Response(requestId, ErrorCode.OK, "OK", {
                VideoId: video!.Id,
                VideoUrl: playInfo.Url,
                ExpireTime: playInfo.ExpireTime,
            });
        } catch (error) {
            logger.info(ctx, `playVideo error:`, error);
            logger.info(ctx, `playVideo dto:`, dto);
            logger.error(ctx, `play video fail: ${error.Code}, ${error.Message}, error:`, error);
            return new Response(requestId, error.Code, error.Message, {});
        }
    }
}
