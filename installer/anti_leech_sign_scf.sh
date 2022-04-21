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
NormalLog "开始部署云点播 Key 防盗链签名派发服务。"
cd ./vod-server-demo/anti_leech_sign_scf

cat > ./config.json << EOF
{
    "key" : "$ANTI_LEECH_KEY",
    "t" : 1800,
    "exper" : 0,
    "rlimit" : 0
}
EOF

cat > ./.env << EOF


TENCENT_APP_ID=$APPID
TENCENT_SECRET_ID=$SECRET_ID
TENCENT_SECRET_KEY=$SECRET_KEY
TENCENT_TOKEN=
EOF

sls deploy --debug
RESULT=$(sls deploy --debug)
if [ $? -ne 0 ]
then
    echo "$RESULT" | grep ERROR
    ErrLog "防盗链签名派发服务部署失败。"
fi
#APIGW_SERVICE_ID=$(echo "$RESULT" | grep "serviceId" | sed 's/serviceId.*\(service-.*\)/\1/')
NormalLog "云点播 Key 防盗链签名派发服务部署完成"
ANTI_LEECH_SIGN_SERVICE=$(sls info |grep url |head -n 1 |awk '{print $4}')


# 测试服务
for i in $(seq 1 10)
do
    RESULT=$(curl -s -d '' $ANTI_LEECH_SIGN_SERVICE)
    if [ -z "$RESULT" ]
    then
        sleep 2
    else
        break
    fi
done

if [ $i -eq 10 ]
then
    WarnLog "Key 防盗链签名派发服务测试不通过。"
fi

NormalLog "服务地址：$ANTI_LEECH_SIGN_SERVICE"
