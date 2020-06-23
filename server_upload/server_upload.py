# -*- coding:utf-8 -*-

"""云点播服务端上传脚本示例

本程序作为服务端上传的请求脚本：
1. 输入参数为本地待上传视频文件的路径，和封面图片路径（可选）
2. 调用 VOD Python 上传 SDK 进行上传
3. 打印出 SDK 的原始返回内容
"""

import json
import sys
from qcloud_vod.vod_upload_client import VodUploadClient
from qcloud_vod.model import VodUploadRequest


CONF_FILE = "config.json"


def usage():
    """脚本用法"""
    print("Usage: python3 server_upload.py {LocalVideoPath} [{LocalCoverPath}]")


def parse_conf_file():
    """解析配置文件，将配置参数以 dict 形式返回"""
    with open(CONF_FILE) as conf_file:
        conf = conf_file.read()
    conf_json = json.loads(conf)
    return conf_json


def upload_media(conf, video, cover):
    """调用 VOD Python 上传 SDK 进行上传"""
    try:
        client = VodUploadClient(conf["secret_id"], conf["secret_key"])
        req = VodUploadRequest()

        req.MediaFilePath = video
        if cover != "":
            req.CoverFilePath = cover
        if conf["procedure"] != "":
            req.Procedure = conf["procedure"]
        req.SubAppId = int(conf["subappid"])

        rsp = client.upload("ap-guangzhou", req)
        return rsp
    except KeyError as err:
        print(err)


def main():
    """main"""
    configuration = parse_conf_file()

    # 解析参数，获取待上传文件路径
    if len(sys.argv) < 2:
        usage()
        return
    video_path = sys.argv[1]
    cover_path = sys.argv[2] if len(sys.argv) > 2 else ""

    # 发起上传
    rsp = upload_media(configuration, video_path, cover_path)
    if rsp is not None:
        print(rsp)
    return


if __name__ == "__main__":
    main()
