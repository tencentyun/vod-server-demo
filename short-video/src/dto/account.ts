import { Length, MinLength, Matches } from "class-validator";

import * as ErrorCode from "../util/errorcode";

// 注册接口的 DTO
export class SigninDTO {
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
                "NickName must be Chinese characters or letters or numbers, length must be 1 to 20 characters",
            context: {
                errorCode: ErrorCode.ParamValueLegal
            }
        }
    )
    NickName: string;

    @Matches(/[a-zA-Z0-9]{8,32}/, {
        message:
            "Password must be letters or numbers, length must be 8 to 32 characters",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    Password: string;

    constructor(nickname: string, password: string) {
        this.NickName = nickname;
        this.Password = password;
    }
}

// 登录接口的 DTO
export class LoginDTO {
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
                "NickName must be Chinese characters or letters or numbers, length must be 1 to 20 characters",
            context: {
                errorCode: ErrorCode.ParamValueLegal
            }
        }
    )
    NickName: string;


    @Matches(/[a-zA-Z0-9]{8,32}/, {
        message:
            "Password must be letters or numbers, length must be 8 to 32 characters",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    Password: string;

    constructor(nickname: string, password: string) {
        this.NickName = nickname;
        this.Password = password;
    }
}

// 修改密码接口的 DTO
export class ModifyPasswordDTO {
    @MinLength(1, {
        message: "Token can not be empty",
        context: {
            errorCode: ErrorCode.ParamLengthNotInRange
        }
    })
    Token: string;

    @Matches(/[a-zA-Z0-9]{8,32}/, {
        message:
            "NewPassword must be letters or numbers, length must be 8 to 32 characters",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    NewPassword: string;

    @Matches(/[a-zA-Z0-9]{8,32}/, {
        message:
            "OldPassword must be letters or numbers, length must be 8 to 32 characters",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    OldPassword: string;

    constructor(token: string, newPassword: string, oldPassword: string) {
        this.Token = token;
        this.NewPassword = newPassword;
        this.OldPassword = oldPassword;
    }
}
