import { MinLength } from "class-validator";

import * as ErrorCode from "../util/errorcode";

// 获取播放信息接口的 DTO
export class PlayVideoDTO {

    @MinLength(1, {
        message: "VideoId can not be empty",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    VideoId: string;

    constructor(videoId: string){
        this.VideoId = videoId;
    }
}
