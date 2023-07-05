#!/bin/bash
# 参数配置

RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

NormalLog() {
    echo -n `date +"[%Y-%m-%d %H:%M:%S]"`
    echo $1
}

WarnLog() {
    echo -n `date +"[%Y-%m-%d %H:%M:%S]"`
    echo -e "${YELLOW}警告${NC}："$1
}

ErrLog() {
    echo -n `date +"[%Y-%m-%d %H:%M:%S]"`
    echo -e "${RED}错误${NC}："$1
    exit 1
}

CheckCmd() {
    echo "$* > /dev/null 2>&1" | bash
    if [ $? -ne 0 ]
    then
        ErrLog $1" 安装失败。"
    fi

    NormalLog $1" 安装成功。"
}

CheckNpm() {
    echo "$* > /dev/null 2>&1" | bash
    if [ $? -ne 0 ]
    then
        ErrLog $1" 未安装。根据不同环境在此url进行安装：https://nodejs.org/zh-cn/download/"
    fi

    NormalLog $1" 安装成功。"
}
NOW_PATH=$(dirname $0)
cd $NOW_PATH
cd ../..
unset NOW_PATH
################ 获取 CVM 信息 ################
IPV4=$(curl -s http://metadata.tencentyun.com/latest/meta-data/public-ipv4)
#REGION=$(curl -s http://metadata.tencentyun.com/latest/meta-data/placement/region)
REGION="ap-guangzhou"

################ 腾讯云 ServerLess 工具 ################

NormalLog "开始检查npm。"
CheckNpm npm --version
NormalLog "开始安装 ServerLess。"
npm install -g serverless-cloud-framework
CheckCmd scf -v

################ SCF ################
NormalLog "开始部署云点播客户端上传签名派发服务。"
cd ./vod-server-demo/web_upload_scf

if [ -z "$SUBAPPID" ]
then
    SUBAPPID="0"
fi

cat > ./ugc_upload_sign/config.json << EOF
{
    "secret_id" : "$SECRET_ID",
    "secret_key" : "$SECRET_KEY",
    "sign_expire_time" : 600,
    "class_id" : 0,
    "otp" : 0,
    "subappid" : "$SUBAPPID"
}
EOF

cat > ./ugc_upload_sign/.env << EOF


TENCENT_APP_ID=$APPID
TENCENT_SECRET_ID=$SECRET_ID
TENCENT_SECRET_KEY=$SECRET_KEY
TENCENT_TOKEN=
EOF

cd ugc_upload_sign
scf deploy --debug
RESULT=$(scf deploy --debug)
if [ $? -ne 0 ]
then
    echo "$RESULT" | grep ERROR
    ErrLog "客户端上传签名派发服务部署失败。"
fi
#APIGW_SERVICE_ID=$(echo "$RESULT" | grep "serviceId" | sed 's/serviceId.*\(service-.*\)/\1/')
NormalLog "云点播客户端上传签名派发服务部署完成。"

UGC_UPLOAD_SIGN_SERVICE_CUT=$(scf info | grep -A 1 urls | tail -n 1 | awk '{print $3}')
UGC_URL_Index=$(echo $UGC_UPLOAD_SIGN_SERVICE_CUT | grep -bo http | sed 's/:.*$//')
UGC_UPLOAD_SIGN_SERVICE=${UGC_UPLOAD_SIGN_SERVICE_CUT: $UGC_URL_Index}

NormalLog "开始部署云点播 Web 上传页面。"
cat > ../web_upload_html/config.json << EOF
{
    "UGC_UPLOAD_SIGN_SERVER" : "$UGC_UPLOAD_SIGN_SERVICE"
}
EOF

cat > ../web_upload_html/.env << EOF


TENCENT_APP_ID=$APPID
TENCENT_SECRET_ID=$SECRET_ID
TENCENT_SECRET_KEY=$SECRET_KEY
TENCENT_TOKEN=
EOF
cd ../web_upload_html
scf deploy --debug
RESULT=$(scf deploy --debug)
if [ $? -ne 0 ]
then
    echo "$RESULT" | grep ERROR
    ErrLog "Web 上传页面部署失败。"
fi

HTML_WEB_CUT=$(scf info | grep -A 1 urls | tail -n 1 | awk '{print $3}')
HTML_WEB_URL_Index=$(echo $HTML_WEB_CUT | grep -bo http | sed 's/:.*$//')
HTML_WEB=${HTML_WEB_CUT: $HTML_WEB_URL_Index}

NormalLog "云点播 Web 上传页面部署完成。"
NormalLog "请点击:"$HTML_WEB",可直接访问"