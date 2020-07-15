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

# 检查 apt 程序是否正在运行中（Ubuntu 启动后会自动运行更新程序）
RESULT=$(ps -elf | grep apt | grep -v grep | wc -l)
if [ $RESULT -ne 0 ]
then
    ErrLog "操作系统 apt 更新程序运行中，请稍后重试。"
fi

export LC_ALL=C.UTF-8
export LANG=C.UTF-8
cd ~

################ 获取 CVM 信息 ################
#IPV4=$(curl -s http://metadata.tencentyun.com/latest/meta-data/public-ipv4)
#REGION=$(curl -s http://metadata.tencentyun.com/latest/meta-data/placement/region)
REGION="ap-guangzhou"

################ 腾讯云 API SDK ################
NormalLog  "开始安装 pip3。"
sudo apt-get update -qq > /dev/null
sudo apt-get install python3-pip -qq > /dev/null
CheckCmd pip3 --version

NormalLog  "开始安装云 API Python SDK 。"
sudo pip3 install tencentcloud-sdk-python -qq > /dev/null
NormalLog  "云 API Python SDK 安装完成。"

################ 配置 ################
NormalLog "开始配置 API 参数。"
cd ./vod-server-demo/pull_upload_api

if [ -z "$SUBAPPID" ]
then
    SUBAPPID="0"
fi

cat > ./config.json << EOF
{
    "secret_id": "$SECRET_ID",
    "secret_key": "$SECRET_KEY",
    "region": "$REGION",
    "subappid": "$SUBAPPID"
}
EOF

NormalLog "API 参数配置完成。"
