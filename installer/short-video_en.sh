#!/bin/bash
# param config
SHORT_VIDEO_PORT=12300
MYSQL_DATABASE="short-video"
MYSQL_PORT=12301
PROCEDURE="short-video-demo"

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
result=$(ps -elf | grep apt | grep -v grep | wc -l)
if [ $result -ne 0 ]
then
    ErrLog "The OS apt updater is running, please try again later."
fi

cd ~
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

################ get CVM information ################
REGION=$(curl -s http://metadata.tencentyun.com/latest/meta-data/placement/region)
IPV4=$(curl -s http://metadata.tencentyun.com/latest/meta-data/public-ipv4)

################ Tencent Cloud API ################
NormalLog  "Start installing pip3."
sudo apt-get update -qq > /dev/null
sudo apt-get install python3-pip -qq > /dev/null
CheckCmd pip3 --version
NormalLog  "Start installing Tencent Cloud API tool."
sudo pip3 install tccli -qq > /dev/null
CheckCmd tccli

NormalLog  "Start checking SECRET_ID/SECRET_KEY effectiveness."
tccli configure set secretId $SECRET_ID
tccli configure set secretKey $SECRET_KEY
tccli configure set region $REGION output json

# Call Vod ApplyUpload interface, check SECRET_ID/SECRET_KEY effectiveness
result=$(tccli vod ApplyUpload --MediaType "mp4" | grep TempCertificate | wc -l)
if [ $result -eq 0 ]
then
    ErrLog "SecretId/SecretKey invalid."
fi
NormalLog "parameter check is completed."

################ MySQL ################
NormalLog "Start install MySQL。"
#MYSQL_CLIENT_VER=$(apt list 2>&1 | grep "mysql-client-[0-9]" | head -n 1 | awk -F '/' '{print($1);}')
#MYSQL_SERVER_VER=$(apt list 2>&1 | grep "mysql-server-[0-9]" | head -n 1 | awk -F '/' '{print($1);}')
# generate random root password
MYSQL_USER="root"
MYSQL_PASSWD=$(openssl rand -hex 8)
echo "mysql-server-5.7 mysql-server/root_password password $MYSQL_PASSWD" | sudo debconf-set-selections
echo "mysql-server-5.7 mysql-server/root_password_again password $MYSQL_PASSWD" | sudo debconf-set-selections
sudo apt-get install mysql-server-5.7 -qq > /dev/null
CheckCmd mysqld --version

# Start MySQL Service
sudo bash -c "echo \"[mysqld]\" >> /etc/mysql/my.cnf"
sudo bash -c "echo \"character_set_server=utf8\" >> /etc/mysql/my.cnf"
sudo bash -c "echo \"init-connect='SET NAMES utf8'\" >> /etc/mysql/my.cnf"
sudo bash -c "echo \"port=$MYSQL_PORT\" >> /etc/mysql/my.cnf"
sudo /etc/init.d/mysql restart > /dev/null
NormalLog "MySQL Service start successfully"

# get MySQL not root user and password
#MYSQL_USER=$(sudo cat /etc/mysql/debian.cnf | grep ^user | head -n 1| awk '{print($3)}')
#MYSQL_PASSWD=$(sudo cat /etc/mysql/debian.cnf | grep ^password | head -n 1| awk '{print($3)}')

# create short video demo table
cat > mysql_init.sql << EOF
CREATE DATABASE \`$MYSQL_DATABASE\`;

CREATE TABLE \`$MYSQL_DATABASE\`.\`User\` (
  \`id\` varchar(36) NOT NULL COMMENT 'user ID',
  \`password\` varchar(32) NOT NULL COMMENT '',
  \`create_time\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '',
  \`update_time\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '',
  \`nickname\` varchar(128) NOT NULL COMMENT '',
  \`sys_avatar_id\` varchar(32) NOT NULL DEFAULT '' COMMENT '',
  \`custom_avatar_url\` varchar(256) NOT NULL DEFAULT '' COMMENT '',
  \`description\` varchar(256) NOT NULL DEFAULT '' COMMENT '',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_nickname\` (\`nickname\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='user information';

CREATE TABLE \`$MYSQL_DATABASE\`.\`Video\` (
  \`id\` varchar(32) NOT NULL COMMENT 'video ID',
  \`title\` varchar(128) NOT NULL DEFAULT '' COMMENT 'video title',
  \`author\` varchar(36) NOT NULL DEFAULT '' COMMENT '',
  \`cover\` varchar(256) NOT NULL DEFAULT '' COMMENT 'cover URL',
  \`animated_cover\` varchar(256) NOT NULL DEFAULT '' COMMENT '',
  \`create_time\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '',
  \`status\` varchar(32) NOT NULL DEFAULT '' COMMENT '',
  \`wechat_mini_program_status\` varchar(32) NOT NULL DEFAULT '' COMMENT '',
  \`url\` varchar(256) NOT NULL DEFAULT '' COMMENT '',
  \`width\` integer NOT NULL DEFAULT 0 COMMENT '',
  \`height\` integer NOT NULL DEFAULT 0 COMMENT '',
  PRIMARY KEY (\`id\`),
  KEY \`idx_1\` (\`author\`,\`create_time\`,\`status\`),
  KEY \`idx_2\` (\`create_time\`,\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='video information';

CREATE TABLE \`$MYSQL_DATABASE\`.\`UserAuth\` (
  \`id\` varchar(36) NOT NULL COMMENT '',
  \`user_id\` varchar(36) NOT NULL COMMENT '',
  \`type\` varchar(128) NOT NULL COMMENT 'auth type',
  \`auth_info\` varchar(256) NOT NULL COMMENT 'auth information, such as OpenId',
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='user auth information';
EOF

mysql -hlocalhost -P$MYSQL_PORT -u$MYSQL_USER -p$MYSQL_PASSWD > /dev/null 2>&1 < mysql_init.sql
rm mysql_init.sql
NormalLog "MySQL table create successfully"

################ Node.js ################
NormalLog "Start installing Node.js。"

# standard install
#curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash - > /dev/null 2>&1
#sudo apt-get install nodejs -qq > /dev/null
#CheckCmd nodejs --version

# chinese release version
wget --quiet https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v12.16.1/node-v12.16.1-linux-x64.tar.gz
tar xzf node-v12.16.1-linux-x64.tar.gz
sudo mv node-v12.16.1-linux-x64 /usr/share/
sudo ln -s /usr/share/node-v12.16.1-linux-x64/bin/node /usr/local/bin/node
sudo ln -s /usr/share/node-v12.16.1-linux-x64/bin/npm /usr/local/bin/npm

CheckCmd node --version

################ Short-Video-Server ################
NormalLog "Start Install Short Video Service"

# Call Cloud API to configure VOD: Video Process Procedure(review and intercept the cover)
PROCEDURE_EXIST=$(tccli vod DescribeProcedureTemplates --Names "[\"$PROCEDURE\"]" --Type "Custom"  --filter "TotalCount")
if [ "$PROCEDURE_EXIST" != "1" ]
then
    REVIEW_TEMPLATE=$(tccli vod CreateContentReviewTemplate --Name "short-video" --ReviewWallSwitch "OFF" --PornConfigure '{"ImgReviewInfo":{"Switch":"ON", "LabelSet":["porn", "vulgar"]}}' --PoliticalConfigure '{"ImgReviewInfo":{"Switch":"ON"}}' --filter "Definition")
    if [ -z $REVIEW_TEMPLATE ]
    then
        WarnLog "Create content review template failed, use system preset template to replace."
        REVIEW_TEMPLATE=10
    fi
    tccli vod CreateProcedureTemplate --Name "$PROCEDURE" --MediaProcessTask '{"CoverBySnapshotTaskSet":[{"Definition":10, "PositionType":"Time", "PositionValue":0}]}' --AiContentReviewTask '{"Definition":'$REVIEW_TEMPLATE'}' > /dev/null
fi

# Start business background program
cd ./vod-server-demo/short-video

# configure running param
cat > ./src/conf/moduleConfig.json << EOF
{
    "port": $SHORT_VIDEO_PORT,
    "db": {
        "host":"localhost",
        "username":"$MYSQL_USER",
        "password":"$MYSQL_PASSWD",
        "port":"$MYSQL_PORT",
        "database":"$MYSQL_DATABASE"
    },
    "procedure":"$PROCEDURE",
    "secretId": "$SECRET_ID",
    "secretKey": "$SECRET_KEY",
	"wxAppConfig": {
		"appId": "$APP_ID",
		"appSecret": "$APP_SECRET",
	}
}
EOF

# Start Service
sudo npm install > /dev/null
sudo npm start > /dev/null

# Wait Service Start Completed
while true
do
    result=$(curl -s -H "Content-Type: application/json" -d "" http://localhost:$SHORT_VIDEO_PORT/GetVideoList | grep RequestId)
    if [ -z $result ]; then
        sleep 1
    else
        break
    fi
done
NormalLog "Short Video Service is successfully installed."
NormalLog "Callback Url is http://$IPV4:$SHORT_VIDEO_PORT/Callback, please configure in VOD Console."
NormalLog "Service Address: $IPV4:$SHORT_VIDEO_PORT, please configure in clien code."
