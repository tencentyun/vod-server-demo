import { Service } from "typedi";
import { validate, ValidationError } from "class-validator";

import { logger } from "../util/logger";
import { Context } from "../util/ctx";
import { Response } from "../util/response";
import * as ErrorCode from "../util/errorcode";
import { ErrorInfo, VodError } from "../util/error";


// 接口参数校验相关的服务类
@Service()
export class ValidatorService {
    // 校验
    public async Validate(ctx: Context, dto: any) {
        let errors: ValidationError[] = [];
        try {
            errors = await validate(dto);
        } catch (error) {
            logger.error(`validate fail, dto:${dto}, error:${error}`);
            throw new VodError(ErrorCode.InternalError, "Internal Error");
        }
        let errInfo = this.parseValidationError(errors);
        if (errInfo) {
            throw new VodError(errInfo.Code, <string>errInfo.Message);
        }
    }

    /* 
     * 解析校验错误
     * 如果参数校验存在嵌套，则校验产生的错误也将嵌套存于 ValidationError.children 字段中。
     * 此处通过递归查找，返回第一个找到的错误。如果没有找到错误，则返回为 null。
     */
    public parseValidationError(errors: ValidationError[]): ErrorInfo|null {
        if (!errors || errors.length == 0){
            return null
        }
        for (let ev of errors) {
            let contexts = ev.contexts;
            if (!contexts) {
                return this.parseValidationError(ev.children);
            }

            for (let measure in contexts) {
                let c = contexts[measure];
                if (!c || !c.errorCode) {
                    continue;
                }
                let errInfo: ErrorInfo = {
                    Code: c.errorCode,
                    Message: "Validation Error"
                }
                let constraints = ev.constraints;
                if (constraints && constraints[measure]) {
                    errInfo.Message = constraints[measure];
                }
                return errInfo;
            }
        }
        return null;

    }
    constructor() { }
}
