# -*- coding:utf-8 -*-

"""云点播拉取上传请求脚本示例

本程序作为云 API 的请求脚本：
1. 输入参数为待拉取媒体文件的 URL 和名称（可选）
2. 调用 PullUpload 接口发起转码请求
3. 打印出 API 的原始回包
"""

import json
import sys
from tencentcloud.common import credential
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.vod.v20180717 import vod_client, models


CONF_FILE = "config.json"
API_NAME = "PullUpload"


def usage():
    """脚本用法"""
    print("Usage: python3 pull_upload.py {MediaUrl} [{MediaName}]")


def parse_conf_file():
    """解析配置文件，将配置参数以 dict 形式返回"""
    with open(CONF_FILE) as conf_file:
        conf = conf_file.read()
    conf_json = json.loads(conf)
    return conf_json


def pull_media(conf, url, name=None):
    """调用 VOD PullUpload 接口进行拉取"""
    # 请求参数
    params = {
        "MediaUrl": url
    }
    if "subappid" in conf:
        params["SubAppId"] = int(conf["subappid"])
    if name is not None:
        params["MediaName"] = name

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


def main():
    """main"""
    configuration = parse_conf_file()

    try:
        # 解析参数
        if len(sys.argv) < 2:
            usage()
            return
        url = sys.argv[1]
        name = None
        if len(sys.argv) > 2:
            name = sys.argv[2]

        # 发起拉取
        rsp = pull_media(configuration, url, name)
        if rsp is not None:
            print(rsp)
        return
    except (AttributeError, ValueError) as err:
        print(err)


if __name__ == "__main__":
    main()
