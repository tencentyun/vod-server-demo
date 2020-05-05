# -*- coding:utf-8 -*-

"""云点播客户端上传签名派发服务示例

本程序作为云函数的后端服务：
1. 请求 Body 为可选项，填写时用于携带签名参数 sourceContext，格式为 JSON：
{"sourceContext":"something"}
2. 如果成功，HTTP 返回码为200，回包 Body 内容为签名内容
"""

import ast
import base64
import hashlib
import hmac
import json
import random
import time
from urllib.parse import urlencode


CONF_FILE = 'config.json'
MAX_SOURCE_CONTEXT_LEN = 250


def parse_conf_file():
    """解析配置文件，将配置参数以 dict 形式返回"""
    with open(CONF_FILE) as conf_file:
        conf = conf_file.read()
    conf_json = json.loads(conf)
    return conf_json


def parse_source_context(event):
    """从请求 Body 中解析出 sourceContext 字段，
        用于在上传完成事件通知中透传给回调接收服务"""
    source_context = ''
    if 'body' in event:
        try:
            req_dict = ast.literal_eval(event['body'])
            if isinstance(req_dict, dict) and "sourceContext" in req_dict:
                source_context = req_dict["sourceContext"]
                if not isinstance(source_context, str):
                    return ''
                if len(source_context) > MAX_SOURCE_CONTEXT_LEN:
                    source_context = source_context[:MAX_SOURCE_CONTEXT_LEN]
        except SyntaxError:
            pass
    return source_context


def generate_sign(conf, source_context):
    """生成签名，返回 base64 后的值（bytes 类型）"""
    timestamp = int(time.time())
    rand = random.randint(0, 999999)

    # 签名参数
    sign_para = {
        'secretId': conf['secret_id'],
        'currentTimeStamp': timestamp,
        'expireTime': timestamp + conf['sign_expire_time'],
        'random': rand,
        'classId': conf['class_id'],
        'oneTimeValid': conf['otp'],
        'vodSubAppId': conf['subappid']
    }

    if source_context != '':
        sign_para['sourceContext'] = source_context

    original = urlencode(sign_para)
    hmac_result = hmac.new(bytes(conf['secret_key'], 'utf-8'),
                           bytes(original, 'utf-8'), hashlib.sha1)
    sha1 = hmac_result.digest()
    signature_tmp = bytes(sha1) + bytes(original, 'utf-8')
    signature = base64.b64encode(signature_tmp)
    return signature


def main_handler(event, context):
    """SCF 统一入口"""
    del context     # unused

    configuration = parse_conf_file()
    source_context = parse_source_context(event)
    signature = generate_sign(configuration, source_context)

    return {
        "isBase64Encoded": False,
        "statusCode": 200,
        "headers": {"Content-Type": "text/plain; charset=utf-8",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST,OPTIONS"},
        "body": str(signature, 'utf-8')
    }
