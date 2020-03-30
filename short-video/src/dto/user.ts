import { MinLength, Length, Matches, IsOptional, MaxLength } from "class-validator";

import * as ErrorCode from "../util/errorcode";

// 修改用户信息的 DTO
export class ModifyUserInfoDTO {
    @MinLength(1, {
        message: "Token can not be empty",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    Token: string;

    @Length(1, 20, {
        message: "NickName must be 1 to 20 characters",
        context: {
            errorCode: ErrorCode.ParamLengthNotInRange
        }
    })
    @Matches(
        /[\u3400-\u4DB5\u4E00-\u9FEA\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29\u{20000}-\u{2A6D6}\u{2A700}-\u{2B734}\u{2B740}-\u{2B81D}\u{2B820}-\u{2CEA1}\u{2CEB0}-\u{2EBE0}a-zA-Z0-9]{1,20}/u,
        {
            message:
                "NickName must be Chinese characters or letters or numbers, length must be 8 to 16 characters",
            context: {
                errorCode: ErrorCode.ParamValueLegal
            }
        }
    )

    @IsOptional()
    @Matches(
        /[\u3400-\u4DB5\u4E00-\u9FEA\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29\u{20000}-\u{2A6D6}\u{2A700}-\u{2B734}\u{2B740}-\u{2B81D}\u{2B820}-\u{2CEA1}\u{2CEB0}-\u{2EBE0}a-zA-Z0-9]{1,20}/u,
        {
            message:
                "NickName must be Chinese characters or letters or numbers, length must be 1 to 20 characters",
            context: {
                errorCode: ErrorCode.ParamValueLegal
            }
        }
    )
    NickName: string;

    Avatar: string;

    
    @IsOptional()
    @MaxLength(100, {
        message: "Description length can not lower or equals to 100",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }

    })
    Description: string;

    constructor(token: string, nickname: string, avatar: string, description: string){
        this.Token = token;
        this.NickName = nickname;
        this.Avatar = avatar;
        this.Description = description;
    }
}

// 获取用户信息的 DTO
export class GetUserInfoDTO {
    @MinLength(1, {
        message: "Token can not be empty",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    Token: string;

    constructor(token: string){
        this.Token = token;
    }
}
