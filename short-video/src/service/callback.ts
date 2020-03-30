import "reflect-metadata";
import { Service } from "typedi";
import { getManager, Repository } from "typeorm";

import { Video, VideoStatus } from "../entity";
import { CallbackDTO } from "../dto";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import { moduleConfig as config } from "../conf/config";
import { ErrorInfo } from "../util/error";
import * as ErrorCode from "../util/errorcode";

// 回调相关的服务类
@Service()
export class CallbackService {

    // 处理回调
    public async Handle(ctx: ServiceContext, dto: CallbackDTO) {
        // 参数检查和处理
        if (dto.EventType === "NewFileUpload") {
            return this.HandleUpload(ctx, dto);
        } 
        if (dto.EventType === "ProcedureStateChanged") {
            return this.HandleAiContentReview(ctx, dto);
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
            logger.info(`[${ctx.RequestId}] empty MediaBasicInfo`);
            throw new Error(`[${ctx.RequestId}] empty MediaBasicInfo`);
        }
        let sourceInfo = dto.FileUploadEvent.MediaBasicInfo.SourceInfo;
        if (!sourceInfo || !sourceInfo.SourceContext) {
            logger.info(`[${ctx.RequestId}] empty SourceInfo or SourceContext`);
            throw new Error(`[${ctx.RequestId}] empty SourceInfo or SourceContext`);
        }
        let sourceContext = JSON.parse(sourceInfo.SourceContext);

        let id = dto.FileUploadEvent.FileId;
        let title = dto.FileUploadEvent.MediaBasicInfo.Name;
        let author = sourceContext.UserId; 
        let cover = dto.FileUploadEvent.MediaBasicInfo.CoverUrl;
        let createTime = dto.FileUploadEvent.MediaBasicInfo.CreateTime;
        let url = dto.FileUploadEvent.MediaBasicInfo.MediaUrl;
        let video: Video = new Video(id, title, author, cover, createTime, url);

        // 保存视频信息
        const videoRepository: Repository<Video> = getManager().getRepository(Video);
        let v = await videoRepository.save(video);
        logger.info(`[${ctx.RequestId}] video has been saved:`, v);
        return ;
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
            logger.info(`[${ctx.RequestId}] video ai content review not finished:`, changeEvent.Status);
            return;
        }
        let resultSet = changeEvent.AiContentReviewResultSet;
        if (!resultSet || resultSet.length === 0) {
            logger.info(`[${ctx.RequestId}] no video ai content review result was found:`);
            return;
        }

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
            switch(rs.Type) {
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
            switch(status) {
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
            this.updateVideoStatus(ctx, changeEvent.FileId, VideoStatus.PASS);
            return ;
        }
        logger.info(`[${ctx.RequestId}] No need to update Video:`, changeEvent.FileId);

    }

    // 更新视频状态
    private async updateVideoStatus(ctx: ServiceContext, id: string, status: string) {
        const videoRepository: Repository<Video> = getManager().getRepository(Video);
        await videoRepository.update(id, {Status:status});
        logger.info(`[${ctx.RequestId}] video has been updated:`, id);
    }

    // 获取任务状态
    private getTaskStatus(task: any): string {
        switch(task.Status) {
            case "FAIL":  return VideoStatus.FAIL;
            case "PROCESSING": return VideoStatus.PROCESSING;
            case "SUCCESS":
                let output = task.Output
                if (!output) {
                    return VideoStatus.EMPTY;
                }
                switch(output.Suggestion) {
                    case "pass": return VideoStatus.PASS;
                    case "review":
                    case "block":
                        return VideoStatus.NOT_PASS;
                }
            default: 
                return VideoStatus.EMPTY;
        }
        return VideoStatus.EMPTY;
    }

}
