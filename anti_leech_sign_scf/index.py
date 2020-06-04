# -*- coding:utf-8 -*-

"""云点播 Key 防盗链签名派发服务示例

本程序作为云函数的后端服务：
1. 请求 Body 为必填项，用于携带视频原始 URL
2. 如果成功，HTTP 返回码为200，回包 Body 内容为带防盗链签名的 URL
"""

import hashlib
import json
import random
import time
from os import path
from urllib.parse import urlencode
from urllib.parse import urlparse
from urllib.parse import urlunparse


CONF_FILE = 'config.json'
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


def generate_sign(conf, sign_para, directory):
    """生成并返回签名"""
    plain = (conf['key'] + directory + sign_para["t"]
             + str(sign_para['exper']) + str(sign_para['rlimit'])
             + str(sign_para["us"]))

    signature = hashlib.md5(bytes(plain, encoding='utf-8')).hexdigest()
    return signature


def main_handler(event, context):
    """SCF 统一入口"""
    del context     # unused

    configuration = parse_conf_file()

    # 解析请求
    if 'body' not in event:
        return ERR_RETURN

    original_url = event["body"]
    parse_result = urlparse(original_url)
    directory = path.split(parse_result.path)[0] + '/'

    # 签名参数
    timestamp = int(time.time())
    rand = random.randint(0, 999999)
    sign_para = {
        "t": hex(timestamp + configuration['t'])[2:],
        "exper": configuration['exper'],
        "rlimit": configuration['rlimit'],
        "us": rand
    }

    signature = generate_sign(configuration, sign_para, directory)
    sign_para["sign"] = signature
    query_string = urlencode(sign_para)
    new_parse_result = parse_result._replace(query=query_string)
    signed_url = urlunparse(new_parse_result)

    return {
        "isBase64Encoded": False,
        "statusCode": 200,
        "headers": {"Content-Type": "text/plain; charset=utf-8",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST,OPTIONS"},
        "body": signed_url
    }
