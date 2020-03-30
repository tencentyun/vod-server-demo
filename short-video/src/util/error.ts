import * as ErrorCode from "./errorcode";

// 错误信息
export interface ErrorInfo {
    Code: number; // 错误码
    Message?: string; // 错误提示
}

// 自定义的错误类
export class VodError extends Error {
    Code: number;
    Message: string;

    constructor(code: number, m: string) {
        super(m);
        this.Code = code;
        this.Message = m;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, VodError.prototype);
    }
}
