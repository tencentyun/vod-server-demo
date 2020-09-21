import "reflect-metadata";
import { Container } from "typedi";
import { JsonController, Post, Body } from "routing-controllers";
import { v4 as uuidv4 } from "uuid";

import { TokenService, ValidatorService, VideoService } from "../service";
import { VideoStatus } from "../entity";
import { GetVideoListDTO, GetVideoListByUserDTO, DeleteVideoDTO } from "../dto";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import * as ErrorCode from "../util/errorcode";
import { Response } from "../util/response";
import * as Platform from "../util/platform";

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
     * 获取视频列表，微信小程序端需要调用/WXAMPGetVideoList
     */
    @Post("/GetVideoList")
    public async getVideoList(@Body({ validate: false }) dto: GetVideoListDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);

        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            //  获取视频列表
            let condition = {
                UserId: "",
                Status: VideoStatus.PASS,
                WechatMiniProgramStatus: "",
                Offset: dto.Offset,
                Limit: dto.Limit,
            };
            let listVideoResult = await this.videoService.SearchVideo(ctx, condition);
            return new Response(requestId, ErrorCode.OK, "OK", {
                VideoList: listVideoResult.VideoList,
                TotalCount: listVideoResult.TotalCount,
            });
        } catch (error) {
            logger.error(ctx, `getVideoList error:`, error);
            logger.info(ctx, `getVideoList dto:`, dto);
            logger.error(ctx, `get video list fail: ${error.Code}, ${error.Message}, error:`, error);
            return new Response(requestId, error.Code, error.Message, {});
        }
    }

    /*
     * 获取微信小程序视频列表
     */
    @Post("/WXAMPGetVideoList")
    public async wxampGetVideoList(@Body({ validate: false }) dto: GetVideoListDTO) {
        let requestId = uuidv4();
        let ctx = new ServiceContext(requestId);

        try {
            // 校验接口参数
            await this.validatorService.Validate(ctx, dto);

            //  获取视频列表
            let condition = {
                UserId: "",
                Status: VideoStatus.PASS,
                WechatMiniProgramStatus: VideoStatus.PASS,
                Offset: dto.Offset,
                Limit: dto.Limit,
            };
            let listVideoResult = await this.videoService.SearchVideo(ctx, condition);
            return new Response(requestId, ErrorCode.OK, "OK", {
                VideoList: listVideoResult.VideoList,
                TotalCount: listVideoResult.TotalCount,
            });
        } catch (error) {
            logger.error(ctx, `getVideoList error:`, error);
            logger.info(ctx, `getVideoList dto:`, dto);
            logger.error(ctx, `get video list fail: ${error.Code}, ${error.Message}, error:`, error);
            return new Response(requestId, error.Code, error.Message, {});
        }
    }

    /*
     * 根据用户获取视频列表
     */
    @Post("/getVideoListByUser")
    public async getVideoListByUser(@Body({ validate: false }) dto: GetVideoListByUserDTO) {
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

            let status = "";
            if (userId !== dto.UserId) {
                status = VideoStatus.PASS;
            }

            //  如果是微信小程序用户请求，则需要按照发布状态筛选
            let wechatMiniProgramStatus = "";
            if (requestSource === Platform.WechatMiniProgram) {
                if (userId !== dto.UserId) {
                    wechatMiniProgramStatus = VideoStatus.PASS;
                }
            }

            //  获取视频列表
            let condition = {
                UserId: dto.UserId,
                Status: status,
                WechatMiniProgramStatus: wechatMiniProgramStatus,
                Offset: dto.Offset,
                Limit: dto.Limit,
            };
            let listVideoResult = await this.videoService.SearchVideo(ctx, condition);
            return new Response(requestId, ErrorCode.OK, "OK", {
                VideoList: listVideoResult.VideoList,
                TotalCount: listVideoResult.TotalCount,
            });
        } catch (error) {
            logger.error(ctx, `getVideoListByUser error:`, error);
            logger.info(ctx, `getVideoListByUser dto:`, dto);
            logger.error(ctx, `get video list by user fail: ${error.Code}, ${error.Message}, error:`, error);
            return new Response(requestId, error.Code, error.Message, {});
        }
    }

    /*
     * 删除视频
     */
    @Post("/DeleteVideo")
    public async deleteVideo(@Body({ validate: false }) dto: DeleteVideoDTO) {
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

            // 批量删除视频
            let ids: string[] = [];
            for (let v of dto.VideoList) {
                ids.push(v.Id);
            }
            await this.videoService.BatchDeleteByUserId(ctx, userId, ids);
            return new Response(requestId, ErrorCode.OK, "OK", {});
        } catch (error) {
            logger.error(ctx, `deleteVideo error:`, error);
            logger.info(ctx, `deleteVideo dto:`, dto);
            logger.error(ctx, `delete video fail: ${error.Code}, ${error.Message}, error:`, error);
            return new Response(requestId, error.Code, error.Message, {});
        }
    }
}
