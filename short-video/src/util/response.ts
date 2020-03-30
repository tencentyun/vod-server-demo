// HTTP 接口返回结构
export class Response{
    RequestId: string;
    Code: number;
    Message: string;
    Data: any;

    constructor(requestId: string, code: number, msg: string, data: any) {
        this.RequestId = requestId;
        this.Code = code;
        this.Message = msg;
        this.Data = data;
    }
}
