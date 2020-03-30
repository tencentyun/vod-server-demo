import "reflect-metadata";
import { Service } from "typedi";
import  jwt from "jsonwebtoken";

import { User } from "../entity";
import { logger } from "../util/logger";
import { Context as ServiceContext } from "../util/ctx";

export interface TokenInfo {
    Token: string;
    ExpireTime: string; // 过期时间戳, ISO 8601格式
}

interface TokenData {
    UserId: string;
}


// Token 相关的服务类
@Service()
export class TokenService {
    // JSON Web Token 生成所使用的私钥
    static PRIKEY = "voddemo";

    // 生成 Token
    public Generate(ctx: ServiceContext, userId: string): TokenInfo {
        let expire = 3600 * 2; // Token 过期时间，2小时

        let data: TokenData = {
            UserId: userId
        };
        let expireTime = new Date();
        expireTime.setSeconds(expireTime.getSeconds()+expire);

        let token = jwt.sign(data, TokenService.PRIKEY, { expiresIn: expire });
        return {
            Token: token,
            ExpireTime: expireTime.toISOString()
        };
    }


    // 校验 Token
    public Verify(ctx:ServiceContext, token: string): string | undefined{
        try {
            let decoded = jwt.verify(token, TokenService.PRIKEY);
            if (decoded) {
                let data: TokenData = <TokenData>decoded; 
                return data.UserId;
            }
        } catch(error) {
            logger.error(`wrong token:${token}, error:`, error);
            return undefined;
        }
        return undefined;
    }

    constructor() { }
    create() { }
}
