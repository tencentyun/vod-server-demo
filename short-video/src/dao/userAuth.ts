import "reflect-metadata";
import { Service } from "typedi";
import { getManager, Repository } from "typeorm";
import crypto from "crypto";

import { User } from "../entity";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";
import { ErrorInfo, VodError } from "../util/error";
import * as ErrorCode from "../util/errorcode";
import { UserAuth } from "../entity/userAuth";

// 用户第三方授权相关的数据访问类
@Service()
export class UserAuthDao {
    // 保存用户第三方授权信息
    public async Save(ctx: ServiceContext, userAuth: UserAuth) {
        try {
            const userAuthRepository: Repository<UserAuth> = getManager().getRepository(UserAuth);
            let u = await userAuthRepository.save(userAuth);
            logger.info(ctx, `user auth has been saved:`, u);
            return u;
        } catch (error) {
            logger.error(ctx, `save user auth fail:`, error);
            if (error.code === "ER_DUP_ENTRY") {
                throw new VodError(ErrorCode.UserAuthNotUnique, "auth info is not unique");
            }
            throw new VodError(ErrorCode.SaveUserAuthFail, "Fail to save user auth info");
        }
    }

    // 根据AuthInfo查找用户
    public async FindByAuthInfo(ctx: ServiceContext, type: string, authInfo: string) {
        try {
            const userAuthRepository: Repository<UserAuth> = getManager().getRepository(UserAuth);
            let u = await userAuthRepository.findOne({ Type: type, AuthInfo: authInfo });
            if (!u) {
                logger.info(ctx, `user auth has been found:`, u);
            }
            return u;
        } catch (error) {
            logger.error(ctx, `find user auth fail:`, error);
            throw new VodError(ErrorCode.FindUserAuthFail, "Fail to find user auth");
        }
    }

    constructor() {}
    create() {}
}
