import "reflect-metadata";
import { Container, Service } from "typedi";
import { getManager, Repository } from "typeorm";
import crypto from "crypto";

import { User } from "../entity";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import { ErrorInfo, VodError } from "../util/error";
import * as ErrorCode from "../util/errorcode";
import { UserDao } from "../dao";

interface UserInfo {
    NickName?: string;
    Avatar?: string;
    Description?: string;
}

// 用户相关的服务类
@Service()
export class UserService {
    userDao: UserDao;

    constructor() {
        this.userDao = Container.get(UserDao);
    }

    // 保存用户
    public async Save(ctx: ServiceContext, user: User) {
        return await this.userDao.Save(ctx, user);
    }

    // 根据 id 查找用户
    public async FindById(ctx: ServiceContext, id: string) {
        return await this.userDao.FindById(ctx, id);
    }

    // 根据 nickname 查找用户
    public async FindByNickName(ctx: ServiceContext, nickname: string) {
        return await this.userDao.FindByNickName(ctx, nickname);
    }

    // 根据 userid 校验密码
    public async VerifyPasswordByUserId(ctx: ServiceContext, userId: string, pwd: string) {
        // 查找用户
        let u = await this.userDao.FindById(ctx, userId);
        if (!u) {
            throw new VodError(ErrorCode.NoUserFound, "No User Found");
        }
        if (u.Password !== pwd) {
            logger.info(ctx, `password is not correct`);
            throw new VodError(ErrorCode.PasswordNotCorrect, "Password is not correct");
        }
    }

    // 根据 nickname 校验密码
    public async VerifyPasswordByNickName(ctx: ServiceContext, nickname: string, pwd: string) {
        // 查找用户
        let u = await this.userDao.FindByNickName(ctx, nickname);
        if (!u) {
            throw new VodError(ErrorCode.NoUserFound, "No User Found");
        }
        if (u.Password !== pwd) {
            logger.info(ctx, `password is not correct`);
            throw new VodError(ErrorCode.PasswordNotCorrect, "Password is not correct");
        }
    }

    // 根据 Id 更新用户密码
    public async UpdatePassword(ctx: ServiceContext, userId: string, pwd: string) {
        try {
            await this.userDao.UpdateInfo(ctx, userId, { Password: pwd });
            return;
        } catch (error) {
            logger.error(ctx, `update user password fail:`, error);
            throw new VodError(ErrorCode.UpdatePasswordFail, "Fail to update password");
        }
    }

    // 根据 Id 更新用户信息
    public async UpdateInfo(ctx: ServiceContext, userId: string, userInfo: UserInfo) {
        let u = {};
        for (let col of ["NickName", "Avatar", "Description"]) {
            let prop = Reflect.get(userInfo, col);
            if (prop) {
                Reflect.set(u, col, prop);
            }
        }
        return await this.userDao.UpdateInfo(ctx, userId, u);
    }

    create() {}
}
