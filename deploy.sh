#!/bin/bash
# ============================================================
#  知愈医学 · 腾讯云轻量服务器一键部署脚本
#  适用于 Ubuntu 22.04 / 24.04
#  使用方法：sudo bash deploy.sh
# ============================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  知愈医学 · 腾讯云部署脚本${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

PROJECT_DIR="/opt/zhiyu-server"
REPO_URL="https://github.com/420777084-png/zhiyu-server.git"
NODE_VERSION="22"

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 root 权限运行：sudo bash deploy.sh${NC}"
  exit 1
fi

# ===== 1. 安装 Node.js =====
echo -e "${YELLOW}[1/8] 安装 Node.js ${NODE_VERSION}...${NC}"
if command -v node &> /dev/null && [ "$(node -v | cut -d. -f1 | tr -d v)" -ge 18 ]; then
  echo -e "  ${GREEN}✓ Node.js 已安装: $(node -v)${NC}"
else
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt install -y nodejs
  echo -e "  ${GREEN}✓ Node.js 安装完成: $(node -v)${NC}"
fi

# ===== 2. 安装 MongoDB 7.0 =====
echo -e "${YELLOW}[2/8] 安装 MongoDB 7.0...${NC}"
if command -v mongod &> /dev/null; then
  echo -e "  ${GREEN}✓ MongoDB 已安装${NC}"
else
  # 安装 gnupg 用于验证 GPG 密钥
  apt install -y gnupg curl

  # 添加 MongoDB 官方 GPG 密钥
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

  # 添加 MongoDB 源
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list

  apt update
  apt install -y mongodb-org

  # 启动 MongoDB
  systemctl daemon-reload
  systemctl enable mongod
  systemctl start mongod

  # 等待 MongoDB 启动
  sleep 3
  if systemctl is-active --quiet mongod; then
    echo -e "  ${GREEN}✓ MongoDB 7.0 安装并启动成功${NC}"
  else
    echo -e "  ${RED}✗ MongoDB 启动失败，请检查日志: journalctl -u mongod${NC}"
    exit 1
  fi
fi

# ===== 3. 安装 Nginx =====
echo -e "${YELLOW}[3/8] 安装 Nginx...${NC}"
if command -v nginx &> /dev/null; then
  echo -e "  ${GREEN}✓ Nginx 已安装${NC}"
else
  apt install -y nginx
  echo -e "  ${GREEN}✓ Nginx 安装完成${NC}"
fi

# ===== 4. 克隆/更新项目代码 =====
echo -e "${YELLOW}[4/8] 部署项目代码...${NC}"
if [ -d "$PROJECT_DIR/.git" ]; then
  echo -e "  项目目录已存在，更新代码..."
  cd "$PROJECT_DIR"
  git pull origin main || true
else
  echo -e "  克隆项目从 GitHub..."
  rm -rf "$PROJECT_DIR"
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# 安装依赖
echo -e "  安装 npm 依赖..."
npm install --production
echo -e "  ${GREEN}✓ 依赖安装完成${NC}"

# ===== 5. 配置环境变量 =====
echo -e "${YELLOW}[5/8] 配置环境变量...${NC}"
if [ ! -f "$PROJECT_DIR/.env" ]; then
  cat > "$PROJECT_DIR/.env" << 'ENVEOF'
NODE_ENV=production
ADMIN_USER=admin
ADMIN_PASS=zhiyu_admin_2026
AUTH_TOKEN=zhiyu_secure_token_20260724
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/zhiyu_medical
ENVEOF
  echo -e "  ${GREEN}✓ 已创建 .env 文件${NC}"
  echo -e "  ${YELLOW}  ⚠ 请稍后修改管理员密码: nano $PROJECT_DIR/.env${NC}"
else
  echo -e "  ${GREEN}✓ .env 已存在，跳过${NC}"
fi

# ===== 6. 初始化数据目录 =====
echo -e "${YELLOW}[6/8] 初始化数据目录...${NC}"
mkdir -p "$PROJECT_DIR/data"
mkdir -p "$PROJECT_DIR/public/uploads"

# 如果没有 content.json 且有 seed.json，则初始化
if [ ! -f "$PROJECT_DIR/data/content.json" ] && [ -f "$PROJECT_DIR/data/seed.json" ]; then
  cp "$PROJECT_DIR/data/seed.json" "$PROJECT_DIR/data/content.json"
  echo -e "  ${GREEN}✓ 已从 seed.json 初始化内容数据${NC}"
fi

# ===== 7. 配置 systemd 服务 =====
echo -e "${YELLOW}[7/8] 配置系统服务...${NC}"
cat > /etc/systemd/system/zhiyu.service << SVCEOF
[Unit]
Description=知愈医学内容管理服务
After=network.target mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
EnvironmentFile=$PROJECT_DIR/.env

# 安全限制
LimitNOFILE=65536
MemoryMax=1G

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable zhiyu
systemctl restart zhiyu
sleep 2

if systemctl is-active --quiet zhiyu; then
  echo -e "  ${GREEN}✓ zhiyu 服务已启动${NC}"
else
  echo -e "  ${RED}✗ zhiyu 服务启动失败${NC}"
  journalctl -u zhiyu --no-pager -n 20
  exit 1
fi

# ===== 8. 配置 Nginx 反向代理 =====
echo -e "${YELLOW}[8/8] 配置 Nginx...${NC}"

# 使用 IP 访问配置（备案前）
cp "$PROJECT_DIR/nginx-ip.conf" /etc/nginx/sites-available/zhiyu
ln -sf /etc/nginx/sites-available/zhiyu /etc/nginx/sites-enabled/zhiyu

# 删除默认站点（避免冲突）
rm -f /etc/nginx/sites-enabled/default

# 测试并重载 Nginx
if nginx -t; then
  systemctl reload nginx
  echo -e "  ${GREEN}✓ Nginx 配置完成${NC}"
else
  echo -e "  ${RED}✗ Nginx 配置有误${NC}"
  exit 1
fi

# ===== 防火墙配置 =====
echo -e "${YELLOW}配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
  ufw allow 22/tcp    # SSH
  ufw allow 80/tcp    # HTTP
  ufw allow 443/tcp   # HTTPS
  ufw --force enable
  echo -e "  ${GREEN}✓ 防火墙已配置（开放 22/80/443 端口）${NC}"
else
  echo -e "  ${YELLOW}  ufw 未安装，请手动在腾讯云控制台开放 80 和 443 端口${NC}"
fi

# ===== 完成 =====
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}  🎉 部署完成！${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  网站地址:  ${GREEN}http://${SERVER_IP}${NC}"
echo -e "  后台管理:  ${GREEN}http://${SERVER_IP}/admin.html${NC}"
echo -e "  健康检查:  ${GREEN}http://${SERVER_IP}/api/health${NC}"
echo ""
echo -e "${YELLOW}  ⚠ 请尽快修改管理员密码:${NC}"
echo -e "     nano $PROJECT_DIR/.env"
echo -e "     systemctl restart zhiyu"
echo ""
echo -e "${YELLOW}  📋 后续步骤:${NC}"
echo -e "     1. 注册域名并在腾讯云备案（约1-2周）"
echo -e "     2. 备案通过后配置域名 + SSL 证书"
echo -e "     3. 如需从旧服务器迁移数据，运行:"
echo -e "        cd $PROJECT_DIR && node migrate-from-atlas.js"
echo ""
