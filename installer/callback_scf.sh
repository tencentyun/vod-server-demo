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
        ErrLog $1" 安装失败。根据不同环境在此url进行安装：https://nodejs.org/zh-cn/download/"
    fi

    NormalLog $1" 安装成功。"
}

cd ~
################ 获取 CVM 信息 ################
IPV4=$(curl -s http://metadata.tencentyun.com/latest/meta-data/public-ipv4)
#REGION=$(curl -s http://metadata.tencentyun.com/latest/meta-data/placement/region)
REGION="ap-guangzhou"

################ 腾讯云 ServerLess 工具 ################

NormalLog "开始检查npm。"
CheckNpm npm --version
NormalLog "开始安装 ServerLess。"
npm install -g serverless
CheckCmd serverless -v

################ SCF ################
NormalLog "开始部署云点播事件通知接收服务。"
cd ./vod-server-demo/callback_scf

if [ -z "$SUBAPPID" ]
then
    SUBAPPID="0"
fi

cat > ./.env << EOF
{
TENCENT_APP_ID=$TENCENT_APP_ID
TENCENT_SECRET_ID=$TENCENT_SECRET_ID
TENCENT_SECRET_KEY=$TENCENT_SECRET_KEY
TENCENT_TOKEN=$TENCENT_TOKEN
}
EOF

cd ugc_upload_sign
sls deploy --debug
RESULT=$(sls deploy --debug)
if [ $? -ne 0 ]
then
    echo "$RESULT" | grep ERROR
    ErrLog "事件通知接收服务部署失败。"
fi
#APIGW_SERVICE_ID=$(echo "$RESULT" | grep "serviceId" | sed 's/serviceId.*\(service-.*\)/\1/')
NormalLog "云点播事件通知接收服务部署完成。"
