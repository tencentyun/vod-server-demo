import "reflect-metadata";
import { Container } from "typedi";
import { JsonController, Post, Body } from "routing-controllers";
import { v4 as uuidv4 } from "uuid";

import { TokenService,ValidatorService, VideoService } from "../service";
import { VideoStatus } from "../entity";
import { GetVideoListDTO, GetVideoListByUserDTO, DeleteVideoDTO } from "../dto";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import * as ErrorCode from "../util/errorcode";
import { Response } from "../util/response";


// 媒资相关的控制器
@JsonController()
export class MediaController {

    tokenService: TokenService;
    validatorService: ValidatorService;
    videoService: VideoService;

    constructor() {
        this.tokenService = Container.get(TokenService);
        this.validatorService = Container.get(ValidatorService);
        this.videoService = Container.get(VideoService);
    }

    /*
     * 获取视频列表
     */
    @Post('/GetVideoList')
    public async getVideoList(@Body({validate:false}) dto: GetVideoListDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);

        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            //  获取视频列表
            let videos = await this.videoService.List(ctx, {
                UserId: "", 
                Status: VideoStatus.PASS, 
                Offset: dto.Offset, 
                Limit: dto.Limit
            });

            return new Response(requestId, ErrorCode.OK, "OK", {
                VideoList: videos
            });

        } catch (error) {
            logger.error(`[${ctx.RequestId}] getVideoList error:`, error);
            logger.info(`[${ctx.RequestId}] getVideoList dto:`, dto);
            logger.error(`[${requestId}] get video list fail: ${error.Code}, ${error.Message}, error:`, error);
            return new Response(requestId, error.Code, error.Message, {});
        }
    }

    /*
     * 根据用户获取视频列表
     */
    @Post('/getVideoListByUser')
    public async getVideoListByUser(@Body({validate:false}) dto: GetVideoListByUserDTO) {
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

            let status = "";
            if (userId !== dto.UserId) {
                status = VideoStatus.PASS;
            } 
            //  获取视频列表
            let videos = await this.videoService.List(ctx, {
                UserId: dto.UserId, 
                Status: status, 
                Offset: dto.Offset, 
                Limit: dto.Limit
            });

            return new Response(requestId, ErrorCode.OK, "OK", {
                VideoList: videos
            });

        } catch (error) {
            logger.error(`[${ctx.RequestId}] getVideoListByUser error:`, error);
            logger.info(`[${ctx.RequestId}] getVideoListByUser dto:`, dto);
            logger.error(`[${requestId}] get video list by user fail: ${error.Code}, ${error.Message}, error:`, error);
            return new Response(requestId, error.Code, error.Message, {});
        }
    }

    /*
     * 删除视频
     */
    @Post('/DeleteVideo')
    public async deleteVideo(@Body({validate:false}) dto: DeleteVideoDTO) {
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

            // 批量删除视频
            let ids: string[] = [];
            for (let v of dto.VideoList) {
                ids.push(v.Id);
            }
            await this.videoService.BatchDeleteByUserId(ctx, userId, ids);
            return new Response(requestId, ErrorCode.OK, "OK", {});

        } catch (error) {
            logger.error(`[${ctx.RequestId}] deleteVideo error:`, error);
            logger.info(`[${ctx.RequestId}] deleteVideo dto:`, dto);
            logger.error(`[${requestId}] delete video fail: ${error.Code}, ${error.Message}, error:`, error);
            return new Response(requestId, error.Code, error.Message, {});
        }

    }
}
