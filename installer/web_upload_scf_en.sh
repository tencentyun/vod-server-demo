#!/bin/bash
# param config

RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

NormalLog() {
    echo -n `date +"[%Y-%m-%d %H:%M:%S]"`
    echo $1
}

WarnLog() {
    echo -n `date +"[%Y-%m-%d %H:%M:%S]"`
    echo -e "${YELLOW}Warning${NC}："$1
}

ErrLog() {
    echo -n `date +"[%Y-%m-%d %H:%M:%S]"`
    echo -e "${RED}Error${NC}："$1
    exit 1
}

CheckCmd() {
    echo "$* > /dev/null 2>&1" | bash
    if [ $? -ne 0 ]
    then
        ErrLog $1" is failed to installed."
    fi

    NormalLog $1" is successfully installed."
}

CheckNpm() {
    echo "$* > /dev/null 2>&1" | bash
    if [ $? -ne 0 ]
    then
        ErrLog $1" is failed to installed.you should install at this url according to different environments: https://nodejs.org/zh-cn/download/"
    fi

    NormalLog $1" is successfully installed."
}
NOW_PATH=$(dirname $0)
cd $NOW_PATH
cd ../..
unset NOW_PATH
################ get CVM information ################
IPV4=$(curl -s http://metadata.tencentyun.com/latest/meta-data/public-ipv4)
#REGION=$(curl -s http://metadata.tencentyun.com/latest/meta-data/placement/region)
REGION="ap-guangzhou"

################ Cloud ServerLess Tool ################

NormalLog "Start installing pip3."
CheckNpm npm --version
NormalLog "Start installing Tencent Cloud SCF."
npm install -g serverless-cloud-framework
CheckCmd scf -v

################ SCF ################
NormalLog "Start deploying the VOD client upload client signature distribution service."
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
    ErrLog "The deployment of the VOD client upload signature distribution service is failed"
fi
#APIGW_SERVICE_ID=$(echo "$RESULT" | grep "serviceId" | sed 's/serviceId.*\(service-.*\)/\1/')
NormalLog "The deployment of the VOD client upload signature distribution service is completed."

UGC_UPLOAD_SIGN_SERVICE_CUT=$(scf info | grep -A 1 urls | tail -n 1 | awk '{print $3}')
UGC_URL_Index=$(echo $UGC_UPLOAD_SIGN_SERVICE_CUT | grep -bo http | sed 's/:.*$//')
UGC_UPLOAD_SIGN_SERVICE=${UGC_UPLOAD_SIGN_SERVICE_CUT: $UGC_URL_Index}

NormalLog "Start deploying the VOD web upload page."
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
    ErrLog "The deployment of  VOD web upload page is failed"
fi

HTML_WEB_CUT=$(scf info | grep -A 1 urls | tail -n 1 | awk '{print $3}')
HTML_WEB_URL_Index=$(echo $HTML_WEB_CUT | grep -bo http | sed 's/:.*$//')
HTML_WEB=${HTML_WEB_CUT: $HTML_WEB_URL_Index}

NormalLog "The deployment of the VOD web upload page is completed."
NormalLog "Please access the following address in your browser to use the demo:"$HTML_WEB