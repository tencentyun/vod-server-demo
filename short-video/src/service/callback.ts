import "reflect-metadata";
import { Container, Service } from "typedi";
import { getManager, Repository } from "typeorm";

import { Video, VideoStatus } from "../entity";
import { CallbackDTO } from "../dto";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import { WeChatMiniProgramPublish } from "../util/api";
import { VideoDao } from "../dao";
import * as Platform from "../util/platform";

// 回调相关的服务类
@Service()
export class CallbackService {
    videoDao: VideoDao;

    constructor() {
        this.videoDao = Container.get(VideoDao);
    }

    // 处理回调
    public async Handle(ctx: ServiceContext, dto: CallbackDTO) {
        // 参数检查和处理
        if (dto.EventType === "NewFileUpload") {
            return this.HandleUpload(ctx, dto);
        }
        if (dto.EventType === "ProcedureStateChanged") {
            return this.HandleAiContentReview(ctx, dto);
        }
        if (dto.EventType === "WechatMiniProgramPublishComplete") {
            return this.HandleWechatMiniProgramPublishComplete(ctx, dto);
        }
        throw new Error(`[${ctx.RequestId}] unknown EventType:${dto.EventType}`);
    }

    // 处理上传完成回调
    public async HandleUpload(ctx: ServiceContext, dto: CallbackDTO) {
        // 参数检查和处理
        if (dto.EventType !== "NewFileUpload") {
            throw new Error(`[${ctx.RequestId}] wrong EventType:${dto.EventType}`);
        }
        if (!dto.FileUploadEvent || !dto.FileUploadEvent.FileId) {
            throw new Error(`[${ctx.RequestId}] empty FileUploadEvent or FileId`);
        }
        if (!dto.FileUploadEvent.MediaBasicInfo) {
            logger.info(ctx, `empty MediaBasicInfo`);
            throw new Error(`[${ctx.RequestId}] empty MediaBasicInfo`);
        }
        let sourceInfo = dto.FileUploadEvent.MediaBasicInfo.SourceInfo;
        if (!sourceInfo || !sourceInfo.SourceContext) {
            logger.info(ctx, `empty SourceInfo or SourceContext`);
            throw new Error(`[${ctx.RequestId}] empty SourceInfo or SourceContext`);
        }
        let sourceContext = JSON.parse(sourceInfo.SourceContext);

        let id = dto.FileUploadEvent.FileId;
        let title = dto.FileUploadEvent.MediaBasicInfo.Name;
        let author = sourceContext.UserId;
        let cover = dto.FileUploadEvent.MediaBasicInfo.CoverUrl;
        let createTime = dto.FileUploadEvent.MediaBasicInfo.CreateTime;
        let url = dto.FileUploadEvent.MediaBasicInfo.MediaUrl;
        let width = dto.FileUploadEvent.MetaData.Width;
        let height = dto.FileUploadEvent.MetaData.Height;

        let video: Video = new Video(id, title, author, cover, createTime, url, width, height);

        // 保存视频信息
        let v = await this.videoDao.Save(ctx, video);
        logger.info(ctx, `video has been saved:`, v);
        return;
    }

    // 处理视频内容审核完成回调
    public async HandleAiContentReview(ctx: ServiceContext, dto: CallbackDTO) {
        // 参数检查和处理
        if (dto.EventType !== "ProcedureStateChanged") {
            throw new Error(`[${ctx.RequestId}] wrong EventType:${dto.EventType}`);
        }
        let changeEvent = dto.ProcedureStateChangeEvent;
        if (!changeEvent || !changeEvent.FileId) {
            throw new Error(`[${ctx.RequestId}] empty ProcedureStateChangeEvent or FileId`);
        }
        if (changeEvent.Status !== "FINISH") {
            logger.info(ctx, `video ai content review not finished:`, changeEvent.Status);
            return;
        }
        let resultSet = changeEvent.AiContentReviewResultSet;
        if (!resultSet || resultSet.length === 0) {
            logger.info(ctx, `no video ai content review result was found:`);
            return;
        }
        let sessionContext = JSON.parse(changeEvent.SessionContext);

        /*
         * 本 Demo 根据以下情况更新视频状态：
         * 1. 只要出现一个视频内容审核任务失败, 则将视频状态更新为“FAIL”;
         * 2. 只要出现一个视频内容审核任务结果为 review/block, 则将视频状态更新为“NOT_PASS”;
         * 3. 只要出现一个视频内容审核任务还在处理中，则将视频更新为“PROCESSING”;
         * 4. 只有在所有视频审核任务都为 success, 才将视频状态更新为“PASS”。
         * 开发者可自身业务特点调整视频状态更新的策略, 此处仅作参考。
         */
        let existPass: boolean = false;
        for (let rs of resultSet) {
            let status: string = VideoStatus.EMPTY;
            switch (rs.Type) {
                case "Porn":
                    status = this.getTaskStatus(rs.PornTask);
                    break;
                case "Terrorism":
                    status = this.getTaskStatus(rs.TerrorismTask);
                    break;
                case "Political":
                    status = this.getTaskStatus(rs.PoliticalTask);
                    break;
                default:
                    continue;
            }
            switch (status) {
                case VideoStatus.FAIL:
                case VideoStatus.NOT_PASS:
                case VideoStatus.PROCESSING:
                    this.updateVideoStatus(ctx, changeEvent.FileId, status);
                    return;
                case VideoStatus.PASS:
                    existPass = true;
            }
        }

        if (existPass) {
            //导出到点播成功
            this.updateVideoStatus(ctx, changeEvent.FileId, VideoStatus.PASS);
            //小程序用户上传的视频默认都发布到小程序
            if (sessionContext.RequestSource == Platform.WechatMiniProgram) {
                this.publishToWeChatMiniProgram(ctx, changeEvent.FileId);
            }
            return;
        }
        logger.info(ctx, `No need to update Video:`, changeEvent.FileId);
    }

    // 处理小程序视频发布任务回调
    public async HandleWechatMiniProgramPublishComplete(ctx: ServiceContext, dto: CallbackDTO) {
        // 参数检查和处理
        if (dto.EventType !== "WechatMiniProgramPublishComplete") {
            throw new Error(`[${ctx.RequestId}] wrong EventType:${dto.EventType}`);
        }
        let PublishEvent = dto.WechatMiniProgramPublishEvent;
        if (!PublishEvent || !PublishEvent.FileId) {
            throw new Error(`[${ctx.RequestId}] empty WechatMiniProgramPublishCompleteEvent or FileId`);
        }
        // 判断当前状态并更新
        /*
         * 对于微信小程序视频发布
         * 本 Demo 根据以下情况更新视频状态：
         * 1. 等待处理和正在处理统一更新为“PROCESSING”
         * 2. 审核不通过更新为“NOT_PASS”
         * 3. 审核通过更新为“PASS”
         * 4. 审核失败更新为“FAILED”
         * 开发者可自身业务特点调整视频状态更新的策略, 此处仅作参考。
         */
        let status = VideoStatus.EMPTY;
        switch (PublishEvent.Status) {
            case "WAITING":
            case "PROCESSING":
                status = VideoStatus.PROCESSING;
                break;
            case "FINISH":
                let result = PublishEvent.PublishResult;
                switch (result) {
                    case "Pass":
                        status = VideoStatus.PASS;
                        break;
                    case "Failed":
                        status = VideoStatus.FAIL;
                        break;
                    case "Rejected":
                        status = VideoStatus.NOT_PASS;
                        break;
                }
                break;
        }
        logger.info(ctx, `wechat mini program publish video result:`, PublishEvent);
        this.updateVideoWechatMiniProgramStatus(ctx, PublishEvent.FileId, status);
    }

    // 更新视频状态
    private async updateVideoStatus(ctx: ServiceContext, id: string, status: string) {
        await this.videoDao.Update(ctx, id, { Status: status });
        logger.info(ctx, `video has been updated:`, id);
    }

    // 更新视频微信小程序发布状态
    private async updateVideoWechatMiniProgramStatus(ctx: ServiceContext, id: string, status: string) {
        await this.videoDao.Update(ctx, id, { WechatMiniProgramStatus: status });
        logger.info(ctx, `wechat mini program video has been updated:`, id);
    }

    // 获取任务状态
    private getTaskStatus(task: any): string {
        switch (task.Status) {
            case "FAIL":
                return VideoStatus.FAIL;
            case "PROCESSING":
                return VideoStatus.PROCESSING;
            case "SUCCESS":
                let output = task.Output;
                if (!output) {
                    return VideoStatus.EMPTY;
                }
                switch (output.Suggestion) {
                    case "pass":
                        return VideoStatus.PASS;
                    case "review":
                    case "block":
                        return VideoStatus.NOT_PASS;
                }
            default:
                return VideoStatus.EMPTY;
        }
        return VideoStatus.EMPTY;
    }

    // 根据 id 发布视频到微信小程序
    private async publishToWeChatMiniProgram(ctx: ServiceContext, id: string) {
        try {
            await WeChatMiniProgramPublish(ctx, id);
            return;
        } catch (error) {
            logger.error(ctx, `publish video to WeChat Mini Program fail:`, error);
        }
    }
}
