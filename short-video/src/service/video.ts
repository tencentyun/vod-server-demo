import "reflect-metadata";
import { Service } from "typedi";
import { getManager, Repository } from "typeorm";

import { Video, VideoStatus, User } from "../entity";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import { ErrorInfo, VodError } from "../util/error";
import * as ErrorCode from "../util/errorcode";
import { GetPlayInfo } from "../util/play";
import { DeleteMedia } from "../util/api";


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
}

interface VideoListCondition {
    UserId?: string;
    Status?: string;
    Offset?: number;
    Limit?: number;
}

// 视频相关的服务类
@Service()
export class VideoService {

    // 获取视频列表
    public async List(ctx: ServiceContext, condition: VideoListCondition) {
        let offset = condition.Offset;
        if (!offset || offset<0) {
            offset = 0;
        }
        let limit = condition.Limit;
        if (!limit || limit<=0) {
            limit = 10; // 默认值
        }
        if (limit > 100) {
            limit = 100; // 最大值
        }

        let userId = condition.UserId;
        let status = condition.Status;
        
        try {
            // 查找视频列表
            const videoRepository: Repository<Video> = getManager().getRepository(Video);
            let builder = videoRepository.createQueryBuilder("v")
                .orderBy("v.create_time", "DESC")
                .offset(offset)
                .limit(limit)
                .leftJoinAndSelect(User, "u", "u.id=v.author")
                .select([
                    "v.id as Id", "v.title as Title", 
                    "v.cover as Cover", "v.animated_cover as AnimatedCover", 
                    "v.create_time as CreateTime", "v.author as AuthorId", 
                    "u.nickname as AuthorNickname", "u.sys_avatar_id as AuthorAvatar",
                    "v.url as Url"])
            if (status) {
                builder.where("v.status = :status", {"status": status});
            }
            if (userId) {
                builder.where("v.author = :author", {"author": userId});
            }
            let res:VideoListInfo[] = await builder.getRawMany();
            logger.info(`[${ctx.RequestId}] list video success:`, res);

            // 获取播放信息
            const expire = 2*3600; // 2小时
            for (let i in res) {
                let playInfo = GetPlayInfo(res[i].Url, expire);
                res[i].Url = playInfo.Url;
                res[i].UrlExpireTime = playInfo.ExpireTime;
            }
            return res;
        } catch (error) {
            logger.error(`[${ctx.RequestId}] list video fail:`, error);
            throw new VodError(ErrorCode.ListVideoFail, "Fail to list video");
        }

    }

    // 根据 id 查找视频
    public async FindById(ctx: ServiceContext, id: string) {
        try {
            const videoRepository: Repository<Video> = getManager().getRepository(Video);
            let v = await videoRepository.findOne({Id:id});
            logger.info(`[${ctx.RequestId}] video has been found:`, v);
            return v;
        } catch (error) {
            logger.error(`[${ctx.RequestId}] find video fail:`, error);
            throw new VodError(ErrorCode.FindVideoFail, "Fail to find video");
        }
    }

    // 根据 UserId 批量删除视频
    // 风险提示：生产环境中，需确保在腾讯云与数据库中视频的一致性。
    public async BatchDeleteByUserId(ctx: ServiceContext,userId: string, ids: string[]) {
        try {
            const videoRepository: Repository<Video> = getManager().getRepository(Video);
            let tobeDeleted:any[] = await videoRepository.createQueryBuilder().where("author = :author", {"author": userId}).andWhere("Id in (:ids)", {ids}).select(["Id"]).getRawMany();

            if (!tobeDeleted || tobeDeleted.length === 0) {
                logger.info(`[${ctx.RequestId}] nothing to be deleted, ids:`, ids);
                return;
            }

            // 在腾讯云点播中删除
            let tobeDeletedIds: string[] = [];
            for (let v of tobeDeleted) {
                await DeleteMedia(v.Id);
                tobeDeletedIds.push(v.Id);
            }

            // 在数据库中删除
            await videoRepository.createQueryBuilder().delete().where("Id in (:tobeDeletedIds)", {tobeDeletedIds}).execute();
            logger.info(`[${ctx.RequestId}] delete video success:`, tobeDeletedIds);
            return;
        } catch (error) {
            logger.error(`[${ctx.RequestId}] delete video fail:`, error);
            throw new VodError(ErrorCode.DeleteVideoFail, "Fail to delete video");
        }
    }

    constructor() { }
    create() { }
}
