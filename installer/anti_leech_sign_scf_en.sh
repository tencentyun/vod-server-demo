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
    echo -e "${YELLOW}Warning${NC}:"$1
}

ErrLog() {
    echo -n `date +"[%Y-%m-%d %H:%M:%S]"`
    echo -e "${RED}Error${NC}:"$1
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
        ErrLog $1" is not installed.you should install at this url according to different environments: https://nodejs.org/zh-cn/download/"
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

NormalLog "Start checking npm."
CheckNpm npm --version
NormalLog "Start installing ServerLess."
npm install -g serverless-cloud-framework
CheckCmd scf -v

################ SCF ################
NormalLog "Start deploying the VOD key hotlink protection signature distribution service."
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

scf deploy --debug
RESULT=$(scf deploy --debug)
if [ $? -ne 0 ]
then
    echo "$RESULT" | grep ERROR
    ErrLog "The deployment of the VOD key hotlink protection signature distribution service is failed."
fi
#APIGW_SERVICE_ID=$(echo "$RESULT" | grep "serviceId" | sed 's/serviceId.*\(service-.*\)/\1/')
NormalLog "The deployment of the VOD key hotlink protection signature distribution service is completed."

ANTI_LEECH_SIGN_SERVICE_CUT=$(scf info | grep -A 1 urls | tail -n 1 | awk '{print $3}')
URL_Index=$(echo $ANTI_LEECH_SIGN_SERVICE_CUT | grep -bo http | sed 's/:.*$//')
ANTI_LEECH_SIGN_SERVICE=${ANTI_LEECH_SIGN_SERVICE_CUT: $URL_Index}

# test service
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
    WarnLog "the key hotlink protection signature distribution service failed the test."
fi

NormalLog "Service address: $ANTI_LEECH_SIGN_SERVICE"
