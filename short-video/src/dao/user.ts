import "reflect-metadata";
import { Service } from "typedi";
import { getManager, Repository } from "typeorm";
import crypto from "crypto";

import { User } from "../entity";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import { ErrorInfo, VodError } from "../util/error";
import * as ErrorCode from "../util/errorcode";

interface UserInfo {
    NickName?: string;
    Avatar?: string;
    Description?: string;
    Password?: string;
}

// 用户相关的数据访问类
@Service()
export class UserDao {
    // 保存用户
    public async Save(ctx: ServiceContext, user: User) {
        try {
            const userRepository: Repository<User> = getManager().getRepository(User);
            let u = await userRepository.save(user);
            logger.info(ctx, `user has been saved:`, u);
            return u;
        } catch (error) {
            logger.error(ctx, `save user fail:`, error);
            if (error.code === "ER_DUP_ENTRY") {
                throw new VodError(ErrorCode.NickNameNotUnique, "NickName is not unique");
            }
            throw new VodError(ErrorCode.SaveUserFail, "Fail to save user");
        }
    }

    // 根据 id 查找用户
    public async FindById(ctx: ServiceContext, id: string) {
        try {
            const userRepository: Repository<User> = getManager().getRepository(User);
            let u = await userRepository.findOne({ Id: id });
            logger.info(ctx, `user has been found:`, u);
            return u;
        } catch (error) {
            logger.error(ctx, `find user fail:`, error);
            throw new VodError(ErrorCode.FindUserFail, "Fail to find user");
        }
    }

    // 根据 nickname 查找用户
    public async FindByNickName(ctx: ServiceContext, nickname: string) {
        try {
            const userRepository: Repository<User> = getManager().getRepository(User);
            let u = await userRepository.findOne({ NickName: nickname });
            logger.info(ctx, `user has been found:`, u);
            return u;
        } catch (error) {
            logger.error(ctx, `find user fail:`, error);
            throw new VodError(ErrorCode.FindUserFail, "Fail to find user");
        }
    }

    // 根据 Id 更新用户信息
    public async UpdateInfo(ctx: ServiceContext, userId: string, userInfo: UserInfo) {
        let u = {};
        for (let col of ["NickName", "Avatar", "Description", "Password"]) {
            let prop = Reflect.get(userInfo, col);
            if (prop) {
                Reflect.set(u, col, prop);
            }
        }

        try {
            const userRepository: Repository<User> = getManager().getRepository(User);
            await userRepository.update(userId, u);
            logger.info(ctx, `update info success, userId:${userId}, userInfo:`, u);
            return;
        } catch (error) {
            logger.error(ctx, `update user info  fail:`, error);
            throw new VodError(ErrorCode.UpdateUserInfoFail, "Fail to update user info");
        }
    }

    constructor() {}
    create() {}
}
