import "reflect-metadata";
import { Container, Service } from "typedi";
import { getManager, Repository } from "typeorm";

import { Video, VideoStatus, User } from "../entity";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import { ErrorInfo, VodError } from "../util/error";
import * as ErrorCode from "../util/errorcode";
import { GetPlayInfo } from "../util/play";
import { DeleteMedia, WeChatMiniProgramPublish } from "../util/api";
import { Response } from "@/util/response";
import { TokenService } from "@/service/token";
import { ValidatorService } from "@/service/validator";
import { VideoDao } from "../dao";

interface VideoListInfo {
    Id: string;
    Title: string;
    Cover: string;
    AnimatedCover: string;
    CreateTime: Date;
    AuthorId: string;
    AuthorNickname: string;
    AuthorAvatar: string;
    Url: string;
    UrlExpireTime: string;
    Width: number;
    Height: number;
    Status: string;
    WechatMiniProgramStatus: string;
}

interface SearchVideoResult {
    VideoList: VideoListInfo[];
    TotalCount: number;
}

interface VideoListCondition {
    UserId?: string;
    Status?: string;
    WechatMiniProgramStatus?: string;
    Offset?: number;
    Limit?: number;
}

// 视频相关的服务类
@Service()
export class VideoService {
    videoDao: VideoDao;

    constructor() {
        this.videoDao = Container.get(VideoDao);
    }

    // 搜索视频
    public async SearchVideo(ctx: ServiceContext, condition: VideoListCondition) {
        let videos = await this.videoDao.List(ctx, condition);
        let totalCount = await this.videoDao.Count(ctx, condition);
        let result: SearchVideoResult = {
            VideoList: videos,
            TotalCount: totalCount,
        };
        return result;
    }

    // 根据 id 查找视频
    public async FindById(ctx: ServiceContext, id: string) {
        return await this.videoDao.FindById(ctx, id);
    }

    // 根据 UserId 批量删除视频
    // 风险提示：生产环境中，需确保在腾讯云与数据库中视频的一致性。
    public async BatchDeleteByUserId(ctx: ServiceContext, userId: string, ids: string[]) {
        try {
            // 按照用户过滤视频 Id
            let tobeDeleted: any[] = await this.videoDao.FilterIdByUserId(ctx, userId, ids);

            if (!tobeDeleted || tobeDeleted.length === 0) {
                logger.info(ctx, `nothing to be deleted, ids:`, ids);
                return;
            }

            // 在腾讯云点播中删除
            let tobeDeletedIds: string[] = [];
            for (let v of tobeDeleted) {
                await DeleteMedia(ctx, v.Id);
                tobeDeletedIds.push(v.Id);
            }

            // 在数据库中删除
            await this.videoDao.BatchDeleteById(ctx, tobeDeletedIds);
            logger.info(ctx, `delete video success:`, tobeDeletedIds);
            return;
        } catch (error) {
            logger.error(ctx, `delete video fail:`, error);
            throw new VodError(ErrorCode.DeleteVideoFail, "Fail to delete video");
        }
    }

    create() {}
}
