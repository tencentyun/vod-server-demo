import { MinLength, Min, Max, IsOptional, IsArray, ArrayNotEmpty, ValidateNested, Matches } from "class-validator";
import { Type } from 'class-transformer';

import * as ErrorCode from "../util/errorcode";

// 获取视频列表的 DTO
export class GetVideoListDTO {
    @IsOptional()
    @Min(0, {
        message: "Offset must be greater than or equals to 0",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }

    })
    Offset: number;

    @IsOptional()
    @Min(1, {
        message: "Limit must be greater than 1",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }

    })
    @Max(100, {
        message: "Limit must be lower than 100",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }

    })
    Limit: number;

    constructor(offset: number, limit: number){
        this.Offset = offset;
        this.Limit = limit;
    }
}

// 根据用户获取视频列表的 DTO
export class GetVideoListByUserDTO {
    @MinLength(1, {
        message: "Token can not be empty",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    Token: string;

    @MinLength(1, {
        message: "UserId can not be empty",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    UserId: string;

    @IsOptional()
    @Min(0, {
        message: "Offset must be greater than or equals to 0",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }

    })
    Offset: number;

    @IsOptional()
    @Min(1, {
        message: "Limit must be greater than 1",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }

    })
    @Max(100, {
        message: "Limit must be lower than 100",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }

    })
    Limit: number;

    constructor(token: string, userId: string, offset: number, limit: number){
        this.Token = token;
        this.UserId = userId;
        this.Offset = offset;
        this.Limit = limit;
    }
}

// 删除视频的 DTO
export class DeleteVideoDTO {
    @MinLength(1, {
        message: "Token can not be empty",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    Token: string;

    @IsArray({
        message: "VideoList must be Array",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }

    })
    @ArrayNotEmpty({
        message: "VideoList can not be empty",
        context: {
            errorCode: ErrorCode.ParamValueLegal
        }
    })
    @ValidateNested({ each: true })
    @Type(() => VideoInfo)
    VideoList: VideoInfo[];

    constructor(token: string, videoList: VideoInfo[]){
        this.Token = token;
        this.VideoList = videoList;
    }
}

class VideoInfo {
    @Matches(
        /^[0-9]{1,}$/,
        {
            message: "VideoList.Id must be numbers",
            context: {
                errorCode: ErrorCode.ParamValueLegal
            }
        }
    )
    Id: string;

    constructor(id: string) {
        this.Id = id;
    }
} 
