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

# check apt if running
RESULT=$(ps -elf | grep apt | grep -v grep | wc -l)
if [ $RESULT -ne 0 ]
then
    ErrLog "The OS apt updater is running, please try again later."
fi

export LC_ALL=C.UTF-8
export LANG=C.UTF-8
cd ~

################ get CVM information ################
#IPV4=$(curl -s http://metadata.tencentyun.com/latest/meta-data/public-ipv4)
#REGION=$(curl -s http://metadata.tencentyun.com/latest/meta-data/placement/region)

################ VOD Python Upload SDK ################
NormalLog  "Start installing pip3."
sudo apt-get update -qq > /dev/null
sudo apt-get install python3-pip -qq > /dev/null
CheckCmd pip3 --version

NormalLog  "Start installing the VOD upload SDK for Python."
sudo pip3 install vod-python-sdk -qq > /dev/null
NormalLog  "The VOD upload SDK for Python is successfully installed."

################ configure ################
NormalLog "Start configuring SDK parameters."
cd ./vod-server-demo/server_upload

if [ -z "$SUBAPPID" ]
then
    SUBAPPID="0"
fi

if [ -z "$PROCEDURE" ]
then
    PROCEDURE=""
fi

cat > ./config.json << EOF
{
    "secret_id": "$SECRET_ID",
    "secret_key": "$SECRET_KEY",
    "procedure": "$PROCEDURE",
    "subappid": "$SUBAPPID"
}
EOF

NormalLog "SDK parameter configuration is completed."
