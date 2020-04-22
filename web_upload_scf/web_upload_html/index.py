# -*- coding:utf-8 -*-

"""云点播 Web 上传页面示例

本程序作为云函数的后端服务：
1. 在浏览器上访问本服务，则返回一个 HTML 页面
2. 页面上具备云点播 Web 上传的主要功能
3. 上传过程需要依赖于客户端上传签名派发服务
"""


import json


CONF_FILE = 'config.json'
HTML_FILE = 'web_upload.html'


def render_template(html, keys):
    """将 HTML 中的变量（形式为 ${变量名}）替换为具体内容。"""
    for key, value in keys.items():
        html = html.replace("${" + key + "}", value)
    return html


def main_handler(event, context):
    """SCF 统一入口"""
    del event       # unused
    del context     # unused

    html_file = open(HTML_FILE, encoding='utf-8')
    html = html_file.read()

    conf_file = open(CONF_FILE, encoding='utf-8')
    conf = conf_file.read()
    conf_json = json.loads(conf)

    html = render_template(html, conf_json)
    return {
        "isBase64Encoded": False,
        "statusCode": 200,
        "headers": {'Content-Type': 'text/html'},
        "body": html
    }
