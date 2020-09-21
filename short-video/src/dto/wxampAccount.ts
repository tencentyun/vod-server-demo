import { Length, MinLength, Matches } from "class-validator";

import * as ErrorCode from "../util/errorcode";

// 微信小程序登录接口的 DTO
export class WxampLoginDTO {
    Code: string;

    constructor(code: string, password: string) {
        this.Code = code;
    }
}
