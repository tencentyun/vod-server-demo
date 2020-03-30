import { MinLength } from "class-validator";

import * as ErrorCode from "../util/errorcode";

// 获取上传签名的 DTO
export class GetUploadSignDTO {
    @MinLength(1, {
        message: "Token can not be empty",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    Token: string;

    SourceContext: string;

    constructor(token: string, sourceContext: string){
        this.Token = token;
        this.SourceContext = sourceContext;
    }

}
