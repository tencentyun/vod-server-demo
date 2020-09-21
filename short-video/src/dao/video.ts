import "reflect-metadata";
import { Service } from "typedi";
import { getManager, Repository } from "typeorm";

import { User, Video } from "../entity";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import { VodError } from "../util/error";
import * as ErrorCode from "../util/errorcode";
import { GetPlayInfo } from "../util/play";

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

interface VideoCountInfo {
    TotalCount: number;
}

interface VideoListCondition {
    UserId?: string;
    Status?: string;
    WechatMiniProgramStatus?: string;
    Offset?: number;
    Limit?: number;
}

// 视频数据访问类
@Service()
export class VideoDao {
    // 保存视频
    public async Save(ctx: ServiceContext, video: Video) {
        try {
            const videoRepository: Repository<Video> = getManager().getRepository(Video);
            let v = videoRepository.save(video);
            logger.info(ctx, `video has been saved:`, v);
            return v;
        } catch (error) {
            logger.error(ctx, `save video fail:`, error);
            throw new VodError(ErrorCode.SaveVideoFail, "Fail to save video");
        }
    }

    // 更新视频信息
    public async Update(ctx: ServiceContext, id: string, partialEntity: any) {
        try {
            const videoRepository: Repository<Video> = getManager().getRepository(Video);
            await videoRepository.update(id, partialEntity);
            logger.info(ctx, `video ${id} has been updated:`, partialEntity);
            return;
        } catch (error) {
            logger.error(ctx, `save video fail:`, error);
            throw new VodError(ErrorCode.UpdateVideoFail, "Fail to update video");
        }
    }

    // 获取视频列表
    public async List(ctx: ServiceContext, condition: VideoListCondition) {
        let offset = condition.Offset;
        if (!offset || offset < 0) {
            offset = 0;
        }
        let limit = condition.Limit;
        if (!limit || limit <= 0) {
            limit = 10; // 默认值
        }
        if (limit > 100) {
            limit = 100; // 最大值
        }

        let userId = condition.UserId;
        let status = condition.Status;
        let wechatMiniProgramStatus = condition.WechatMiniProgramStatus;

        try {
            // 查找视频列表
            const videoRepository: Repository<Video> = getManager().getRepository(Video);
            let builder = videoRepository
                .createQueryBuilder("v")
                .orderBy("v.create_time", "DESC")
                .offset(offset)
                .limit(limit)
                .leftJoinAndSelect(User, "u", "u.id=v.author")
                .select([
                    "v.id as Id",
                    "v.title as Title",
                    "v.cover as Cover",
                    "v.animated_cover as AnimatedCover",
                    "v.create_time as CreateTime",
                    "v.author as AuthorId",
                    "u.nickname as AuthorNickname",
                    "u.sys_avatar_id as AuthorAvatar",
                    "v.url as Url",
                    "v.width as Width",
                    "v.height as Height",
                    "v.status as Status",
                    "v.wechat_mini_program_status as WechatMiniProgramStatus",
                ]);
            if (status) {
                builder.where("v.status = :status", { status: status });
            }
            if (wechatMiniProgramStatus) {
                builder.where("v.wechat_mini_program_status = :wechat_mini_program_status", {
                    wechat_mini_program_status: wechatMiniProgramStatus,
                });
            }
            if (userId) {
                builder.where("v.author = :author", { author: userId });
            }
            let res: VideoListInfo[] = await builder.getRawMany();
            logger.info(ctx, `list video success:`, res);

            // 获取播放信息
            const expire = 2 * 3600; // 2小时
            for (let i in res) {
                let playInfo = GetPlayInfo(ctx, res[i].Url, expire);
                res[i].Url = playInfo.Url;
                res[i].UrlExpireTime = playInfo.ExpireTime;
            }
            return res;
        } catch (error) {
            logger.error(ctx, `list video fail:`, error);
            throw new VodError(ErrorCode.ListVideoFail, "Fail to list video");
        }
    }

    // 查询视频总数
    public async Count(ctx: ServiceContext, condition: VideoListCondition) {
        let userId = condition.UserId;
        let status = condition.Status;
        let wechatMiniProgramStatus = condition.WechatMiniProgramStatus;

        try {
            // 根据条件获取视频数量
            const videoRepository: Repository<Video> = getManager().getRepository(Video);
            let builder = videoRepository
                .createQueryBuilder("v")
                .orderBy("v.create_time", "DESC")
                .select(["count(*) as TotalCount"]);
            if (status) {
                builder.where("v.status = :status", { status: status });
            }
            if (wechatMiniProgramStatus) {
                builder.where("v.wechat_mini_program_status = :wechat_mini_program_status", {
                    wechat_mini_program_status: wechatMiniProgramStatus,
                });
            }
            if (userId) {
                builder.where("v.author = :author", { author: userId });
            }
            let res: VideoCountInfo[] = await builder.getRawMany();
            logger.info(ctx, `count video success:`, res);
            let totalCount = 0;
            if (res[0].TotalCount) {
                totalCount = res[0].TotalCount;
            }
            return totalCount;
        } catch (error) {
            logger.error(ctx, `count video fail:`, error);
            throw new VodError(ErrorCode.ListVideoFail, "Fail to count video");
        }
    }

    // 根据 id 查找视频
    public async FindById(ctx: ServiceContext, id: string) {
        try {
            const videoRepository: Repository<Video> = getManager().getRepository(Video);
            let v = await videoRepository.findOne({ Id: id });
            logger.info(ctx, `video has been found:`, v);
            return v;
        } catch (error) {
            logger.error(ctx, `find video fail:`, error);
            throw new VodError(ErrorCode.FindVideoFail, "Fail to find video");
        }
    }

    // 根据 UserId 过滤 Id
    public async FilterIdByUserId(ctx: ServiceContext, userId: string, ids: string[]) {
        try {
            const videoRepository: Repository<Video> = getManager().getRepository(Video);
            return await videoRepository
                .createQueryBuilder()
                .where("author = :author", { author: userId })
                .andWhere("Id in (:ids)", { ids })
                .select(["Id"])
                .getRawMany();
        } catch (error) {
            logger.error(ctx, `filter video id fail:`, error);
            throw new VodError(ErrorCode.DeleteVideoFail, "Fail to filter video id");
        }
    }

    // 根据 Id 批量删除视频
    public async BatchDeleteById(ctx: ServiceContext, ids: string[]) {
        try {
            const videoRepository: Repository<Video> = getManager().getRepository(Video);

            // 在数据库中删除
            await videoRepository.createQueryBuilder().delete().where("Id in (:ids)", { ids }).execute();
            logger.info(ctx, `delete video success:`, ids);
            return;
        } catch (error) {
            logger.error(ctx, `delete video fail:`, error);
            throw new VodError(ErrorCode.DeleteVideoFail, "Fail to delete video");
        }
    }

    constructor() {}
    create() {}
}
