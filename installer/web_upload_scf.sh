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

cd ~

################ 获取 CVM 信息 ################
IPV4=$(curl -s http://metadata.tencentyun.com/latest/meta-data/public-ipv4)
#REGION=$(curl -s http://metadata.tencentyun.com/latest/meta-data/placement/region)
REGION="ap-guangzhou"

################ 腾讯云 SCF 工具 ################
export LC_ALL=C
NormalLog  "开始安装 pip3。"
sudo apt-get install python3-pip -qq > /dev/null
CheckCmd pip3 --version
export LC_ALL=

NormalLog "开始安装腾讯云 SCF 工具。"
sudo pip3 install scf -qq > /dev/null
CheckCmd scf --version
NormalLog "开始配置 scf。"
scf configure set --region $REGION --appid $APPID --secret-id $SECRET_ID --secret-key $SECRET_KEY
if [ $? -ne 0 ]
then
    ErrLog "scf 配置失败。"
fi
NormalLog "scf 配置完成。"

################ SCF ################
NormalLog "开始部署云点播客户端上传签名派发服务。"
#cd ./vod-server-demo/web_upload_scf
cd ./web_upload_scf

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

RESULT=$(scf deploy -t ./ugc_upload_sign/ugc_upload_sign.yaml)
if [ $? -ne 0 ]
then
    echo "$RESULT" | grep ERROR
    ErrLog "客户端上传签名派发服务部署失败。"
fi
#APIGW_SERVICE_ID=$(echo "$RESULT" | grep "serviceId" | sed 's/serviceId.*\(service-.*\)/\1/')
UGC_UPLOAD_SIGN_SERVICE=$(echo "$RESULT" | grep "subDomain" | sed 's/.*\(http.*\)/\1/')
NormalLog "云点播客户端上传签名派发服务部署完成。"

# 测试服务
for i in $(seq 1 10)
do
    RESULT=$(curl -s -d '' $UGC_UPLOAD_SIGN_SERVICE)
    if [ -z "$RESULT" ]
    then
        sleep 2
    else
        break
    fi
done

if [ $i -eq 10 ]
then
    WarnLog "客户端上传签名派发服务测试不通过。"
fi

NormalLog "开始部署云点播 Web 上传页面。"
cat > ./web_upload_html/config.json << EOF
{
    "UGC_UPLOAD_SIGN_SERVER" : "$UGC_UPLOAD_SIGN_SERVICE"
}
EOF

RESULT=$(scf deploy -t ./web_upload_html/web_upload_html.yaml)
if [ $? -ne 0 ]
then
    echo "$RESULT" | grep ERROR
    ErrLog "Web 上传页面部署失败。"
fi
#APIGW_SERVICE_ID=$(echo "$RESULT" | grep "serviceId" | sed 's/serviceId.*\(service-.*\)/\1/')
WEB_UPLOAD_HTML_SERVICE=$(echo "$RESULT" | grep "subDomain" | sed 's/.*\(http.*\)/\1/')

NormalLog "云点播 Web 上传页面部署完成。"
NormalLog "请在浏览器访问以下地址进行体验：$WEB_UPLOAD_HTML_SERVICE"
