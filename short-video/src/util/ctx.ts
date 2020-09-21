/*
 * 服务类的上下文
 * 可根据自身业务特点增加上下文信息。
 */
export class Context {
    RequestId: string;

    constructor(requestId: string) {
        this.RequestId = requestId;
    }
}
