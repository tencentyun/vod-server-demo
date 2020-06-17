# -*- coding:utf-8 -*-

"""云点播事件通知接收服务示例

本程序作为云函数的后端服务：
1. 请求来自云点播事件通知服务
2. 如果请求解析成功，HTTP 返回码为200，回包 Body 内容为空
3. 对于上传完成事件通知，调用云 API 对视频发起转码请求
4. 对于任务流状态变更完成通知，打印出转码结果
"""

import json
from tencentcloud.common import credential
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.vod.v20180717 import vod_client, models


CONF_FILE = "config.json"
API_NAME = "ProcessMedia"
OK_RETURN = {
    "isBase64Encoded": False,
    "statusCode": 200,
    "headers": {"Content-Type": "text/plain; charset=utf-8",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,OPTIONS"},
    "body": None
}
ERR_RETURN = {
    "isBase64Encoded": False,
    "statusCode": 400,
    "headers": {"Content-Type": "text/plain; charset=utf-8",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,OPTIONS"},
    "body": "Bad Request"
}


def parse_conf_file():
    """解析配置文件，将配置参数以 dict 形式返回"""
    with open(CONF_FILE) as conf_file:
        conf = conf_file.read()
    conf_json = json.loads(conf)
    return conf_json


def trans_media(conf, fileid):
    """调用 VOD ProcessMedia 接口进行转码"""
    # ProcessMedia 请求参数
    params = {
        "FileId": fileid,
        "MediaProcessTask": {
            "TranscodeTaskSet": [
            ]
        }
    }
    if "subappid" in conf:
        params["SubAppId"] = conf["subappid"]
    for definition in conf["definitions"]:
        trans_para = {
            "Definition": definition
        }
        params["MediaProcessTask"]["TranscodeTaskSet"].append(trans_para)

    try:
        # 云 API 请求
        cred = credential.Credential(conf["secret_id"], conf["secret_key"])
        client = vod_client.VodClient(cred, conf["region"])

        method = getattr(models, API_NAME + "Request")
        req = method()
        req.from_json_string(json.dumps(params))

        method = getattr(client, API_NAME)
        rsp = method(req)
        return rsp
    except TencentCloudSDKException as err:
        print(err)
        return None


def deal_new_file_event(body):
    """解析视频上传事件通知请求，获取新文件的 FileId 并发起转码"""
    upload_event = body.get("FileUploadEvent", None)
    if upload_event is None:
        return None

    fileid = upload_event.get("FileId", None)
    return fileid


def deal_procedure_event(body):
    """解析任务流状态变更事件通知请求，打印转码结果"""
    try:
        # 检查任务流相关数据结构和状态
        procedure_event = body.get("ProcedureStateChangeEvent", None)
        if procedure_event is None:
            return None
        if procedure_event["Status"] != "FINISH":
            return "OK"
        if procedure_event["ErrCode"] != 0:
            print("""Procedure failed. FileId: {}, TaskId: {}, ErrCode: {}""".format(
                procedure_event["FileId"], procedure_event["TaskId"], procedure_event["ErrCode"]))
            return None

        # 检查转码任务相关数据结构和状态
        media_result = procedure_event.get("MediaProcessResultSet", None)
        if media_result is None:
            return None
        for task_result in media_result:
            if task_result["Type"] != "Transcode":
                continue
            trans_task = task_result.get("TranscodeTask", None)
            if trans_task is None:
                continue

            task_input = trans_task.get("Input", None)
            if task_input is None:
                continue
            if trans_task["ErrCode"] != 0:
                print("""Transcode failed. FileId: {}, Definition: {}, ErrCode: {}""".format(
                    procedure_event["FileId"], task_input["Definition"], trans_task["ErrCode"]))
                continue

            # 打印转码任务输出结果
            print("""Transcode succeeded. FileId: {}, Definition: {}, Url: {}""".format(
                procedure_event["FileId"], task_input["Definition"], trans_task["Output"]["Url"]))
        return "OK"
    except (KeyError, ValueError) as err:
        print(err)
        return None


def main_handler(event, context):
    """SCF 统一入口"""
    del context     # unused

    configuration = parse_conf_file()

    try:
        if 'body' not in event:
            return ERR_RETURN
        body = json.loads(event["body"])
        event_type = body.get("EventType", None)
        if event_type == "NewFileUpload":
            fileid = deal_new_file_event(body)
            if fileid is None:
                return ERR_RETURN

            rsp = trans_media(configuration, fileid)
            if rsp is None:
                return ERR_RETURN
            print(rsp)
        elif event_type == "ProcedureStateChanged":
            rsp = deal_procedure_event(body)
            if rsp is None:
                return ERR_RETURN
        else:
            pass
        return OK_RETURN

    except (AttributeError, ValueError) as err:
        print(err)
        return ERR_RETURN
