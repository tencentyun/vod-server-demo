#!/bin/bash
# 参数配置
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
    echo -e "${YELLOW}警告${NC}："$1
}

ErrLog() {
    echo -n `date +"[%Y-%m-%d %H:%M:%S]"`
    echo -e "${RED}错误${NC}："$1
}

CheckCmd() {
    echo "$* > /dev/null 2>&1" | bash
    if [ $? -ne 0 ]
    then
        ErrLog $1" 安装失败。"
        exit 1
    fi

    NormalLog $1" 安装成功。"
}

# 检查 apt 程序是否正在运行中（Ubuntu 启动后会自动运行更新程序）
result=$(ps -elf | grep apt | grep -v grep | wc -l)
if [ $result -ne 0 ]
then
    ErrLog "操作系统 apt 更新程序运行中，请稍后重试。"
    exit 1
fi

cd ~
export LC_ALL=C

################ 获取 CVM 信息 ################
REGION=$(curl -s http://metadata.tencentyun.com/latest/meta-data/placement/region)
IPV4=$(curl -s http://metadata.tencentyun.com/latest/meta-data/public-ipv4)

################ 腾讯云 API ################
NormalLog  "开始安装 pip3。"
sudo apt-get install python3-pip -qq > /dev/null
CheckCmd pip3 --version
NormalLog  "开始安装腾讯云 API 工具。"
sudo pip3 install tccli -qq > /dev/null
CheckCmd tccli

NormalLog  "开始检查 SECRET_ID/SECRET_KEY 有效性。"
tccli configure set secretId $SECRET_ID
tccli configure set secretKey $SECRET_KEY
tccli configure set region $REGION output json

# 调用云点播 ApplyUpload 接口，检查 SECRET_ID/SECRET_KEY 的有效性
result=$(tccli vod ApplyUpload --MediaType "mp4" | grep TempCertificate | wc -l)
if [ $result -eq 0 ]
then
    ErrLog "SecretId/SecretKey 无效。"
    exit 1
fi
NormalLog "参数检查完成。"

################ MySQL ################
NormalLog "开始安装 MySQL。"
#MYSQL_CLIENT_VER=$(apt list 2>&1 | grep "mysql-client-[0-9]" | head -n 1 | awk -F '/' '{print($1);}')
#MYSQL_SERVER_VER=$(apt list 2>&1 | grep "mysql-server-[0-9]" | head -n 1 | awk -F '/' '{print($1);}')
# 生成随机 root 密码
MYSQL_USER="root"
MYSQL_PASSWD=$(openssl rand -hex 8)
echo "mysql-server-5.7 mysql-server/root_password password $MYSQL_PASSWD" | sudo debconf-set-selections
echo "mysql-server-5.7 mysql-server/root_password_again password $MYSQL_PASSWD" | sudo debconf-set-selections
sudo apt-get install mysql-server-5.7 -qq > /dev/null
CheckCmd mysqld --version

# 启动 MySQL 服务
sudo bash -c "echo \"[mysqld]\" >> /etc/mysql/my.cnf"
sudo bash -c "echo \"character_set_server=utf8\" >> /etc/mysql/my.cnf"
sudo bash -c "echo \"init-connect='SET NAMES utf8'\" >> /etc/mysql/my.cnf"
sudo bash -c "echo \"port=$MYSQL_PORT\" >> /etc/mysql/my.cnf"
sudo /etc/init.d/mysql restart > /dev/null
NormalLog "MySQL 服务启动完成。"

# 获取 MySQL 非 root 用户和密码
#MYSQL_USER=$(sudo cat /etc/mysql/debian.cnf | grep ^user | head -n 1| awk '{print($3)}')
#MYSQL_PASSWD=$(sudo cat /etc/mysql/debian.cnf | grep ^password | head -n 1| awk '{print($3)}')

# 创建短视频 demo 所使用的表
cat > mysql_init.sql << EOF
CREATE DATABASE \`$MYSQL_DATABASE\`;

CREATE TABLE \`$MYSQL_DATABASE\`.\`User\` (
  \`id\` varchar(36) NOT NULL COMMENT '用户 ID，后台生成',
  \`password\` varchar(32) NOT NULL COMMENT '用户密码',
  \`create_time\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`update_time\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最近更新时间',
  \`nickname\` varchar(32) NOT NULL COMMENT '昵称',
  \`sys_avatar_id\` varchar(128) NOT NULL DEFAULT '' COMMENT '系统头像 ID',
  \`custom_avatar_url\` varchar(1024) NOT NULL DEFAULT '' COMMENT '自定义头像 URL',
  \`description\` varchar(2048) NOT NULL DEFAULT '' COMMENT '用户简介',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_nickname\` (\`nickname\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='用户资料';

CREATE TABLE \`$MYSQL_DATABASE\`.\`Video\` (
  \`id\` varchar(32) NOT NULL COMMENT '视频 ID，即点播 FileId',
  \`title\` varchar(128) NOT NULL DEFAULT '' COMMENT '视频名称',
  \`author\` varchar(36) NOT NULL DEFAULT '' COMMENT '视频上传者 ID',
  \`cover\` varchar(512) NOT NULL DEFAULT '' COMMENT '视频封面 URL',
  \`animated_cover\` varchar(512) NOT NULL DEFAULT '' COMMENT '视频动图封面 URL',
  \`create_time\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`status\` varchar(16) NOT NULL DEFAULT '' COMMENT '视频审核状态',
  \`url\` varchar(512) NOT NULL DEFAULT '' COMMENT '视频 URL',
  PRIMARY KEY (\`id\`),
  KEY \`idx_1\` (\`author\`,\`create_time\`,\`status\`),
  KEY \`idx_2\` (\`create_time\`,\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='视频资料';
EOF

mysql -hlocalhost -P$MYSQL_PORT -u$MYSQL_USER -p$MYSQL_PASSWD > /dev/null 2>&1 < mysql_init.sql
rm mysql_init.sql
NormalLog "MySQL 建表完成。"

################ Node.js ################
NormalLog "开始安装 Node.js。"

# 标准安装（可能较慢）
#curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash - > /dev/null 2>&1
#sudo apt-get install nodejs -qq > /dev/null
#CheckCmd nodejs --version

# 国内源 release 版
wget --quiet https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v12.16.1/node-v12.16.1-linux-x64.tar.gz
tar xzf node-v12.16.1-linux-x64.tar.gz
sudo mv node-v12.16.1-linux-x64 /usr/share/
sudo ln -s /usr/share/node-v12.16.1-linux-x64/bin/node /usr/local/bin/node
sudo ln -s /usr/share/node-v12.16.1-linux-x64/bin/npm /usr/local/bin/npm

CheckCmd node --version

################ Short-Video-Server ################
NormalLog "开始部署短视频服务。"

# 调用云 API 配置云点播：视频处理任务流（审核、截取封面）
PROCEDURE_EXIST=$(tccli vod DescribeProcedureTemplates --Names "[\"$PROCEDURE\"]" --Type "Custom"  --filter "TotalCount")
if [ "$PROCEDURE_EXIST" == "1" ]
then
    REVIEW_TEMPLATE=$(tccli vod CreateContentReviewTemplate --Name "short-video" --ReviewWallSwitch "OFF" --PornConfigure '{"ImgReviewInfo":{"Switch":"ON", "LabelSet":["porn", "vulgar"]}}' --PoliticalConfigure '{"ImgReviewInfo":{"Switch":"ON"}}' --filter "Definition")
    if [ -z $REVIEW_TEMPLATE ]
    then
        WarnLog "创建内容审核模版失败，使用系统预设模版代替。"
        REVIEW_TEMPLATE=10
    fi
    tccli vod CreateProcedureTemplate --Name "$PROCEDURE" --MediaProcessTask '{"CoverBySnapshotTaskSet":[{"Definition":10, "PositionType":"Time", "PositionValue":0}]}' --AiContentReviewTask '{"Definition":'$REVIEW_TEMPLATE'}' > /dev/null
fi

# 启动业务后台
cd ./vod-server-demo/short-video

# 配置运行参数
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
    "secretKey": "$SECRET_KEY"
}
EOF

# 启动服务
sudo npm install > /dev/null
sudo npm start > /dev/null

# 等待服务启动完毕
while true
do
    result=$(curl -s -H "Content-Type: application/json" -d "" http://localhost:$SHORT_VIDEO_PORT/GetVideoList | grep RequestId)
    if [ -z $result ]; then
        sleep 1
    else
        break
    fi
done
NormalLog "短视频服务部署完成。"
NormalLog "回调接收服务地址是：http://$IPV4:$SHORT_VIDEO_PORT/Callback，请在 VOD 控制台进行配置。"
NormalLog "业务后台地址是：$IPV4:$SHORT_VIDEO_PORT，请在客户端代码中进行配置。"
