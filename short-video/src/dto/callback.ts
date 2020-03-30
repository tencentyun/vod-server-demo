/*
 * 回调接口的 DTO 
 * 不作参数校验
 * 具体回调参数结构参考：https://cloud.tencent.com/document/product/266/9636#.E4.BA.8B.E4.BB.B6.E8.AF.B4.E6.98.8E
 */
export interface CallbackDTO {
    EventType: string;
    FileUploadEvent?: FileUploadEvent;
    ProcedureStateChangeEvent?: ProcedureStateChangeEvent;
    FileDeleteEvent?: any;
    PullCompleteEvent?: any;
    EditMediaCompleteEvent?: any;
    ComposeMediaCompleteEvent?: any;
    WechatPublishCompleteEvent?: any;
    TranscodeCompleteEvent?: any;
    ConcatCompleteEvent?: any;
    ClipCompleteEvent?: any;
    CreateImageSpriteCompleteEvent?: any;
    SnapshotByTimeOffsetCompleteEvent?: any;
    WechatMiniProgramPublishEvent?: any;
}

export interface FileUploadEvent {
    FileId: string; 
    MediaBasicInfo: MediaBasicInfo;
    ProcedureTaskId: string;
}

export interface MediaBasicInfo {
    Name: string;
    Description: string;
    CreateTime: Date;
    UpdateTime: Date;
    ExpireTime: Date;
    ClassId: number;
    ClassName: string;
    ClassPath: string;
    CoverUrl: string;
    Type: string;
    MediaUrl: string;
    TagSet: any[];
    StorageRegion: string;
    SourceInfo: SourceInfo;
    Vid: string;
}

interface SourceInfo {
    SourceType?: string;
    SourceContext?: string;
}

export interface ProcedureStateChangeEvent {
    TaskId: string;
    Status: string;
    ErrCode: number;
    Message: string;
    FileId: string;
    FileName: string;
    FileUrl: string;
    MetaData: any;
    AiAnalysisResultSet: any[];
    AiRecognitionResultSet: any[];
    AiContentReviewResultSet: AiContentReviewResultSet[];
    MediaProcessResultSet: any[];
    SessionContext: string;
    SessionId: string;
    TasksPriority: number;
    TasksNotifyMode: string;
}

export interface AiContentReviewResultSet {
    Type: string;
    Progress: number;
    PornTask: PornTask;
    TerrorismTask: TerrorismTask;
    PoliticalTask: PoliticalTask;
    PornAsrTask: any;
    PornOcrTask: any;
    PoliticalAsrTask: any;
    PoliticalOcrTask: any;
    TerrorismOcrTask?: any;
    ProhibitedAsrTask?: any;
    ProhibitedOcrTask?: any;
}

export interface PornTask {
    ErrCode: number;
    Message: string;
    Status: string;
    Progress: number;
    Input: Input;
    Output: Output;
}


export interface TerrorismTask {
    ErrCode: number;
    Message: string;
    Status: string;
    Progress: number;
    Input: Input;
    Output: Output;
}

export interface PoliticalTask {
    ErrCode: number;
    Message: string;
    Status: string;
    Progress: number;
    Input: Input;
    Output: Output;
}

export interface Input {
    Definition: number;
}

export interface Output {
    Confidence: number;
    Suggestion: string;
    Label?: string;
    SegmentSet: any[];
}
