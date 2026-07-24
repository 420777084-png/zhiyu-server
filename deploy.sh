#!/bin/bash
# 知愈医学一键部署脚本（适用于 Ubuntu 22.04 / CentOS 8）
# 使用方法：sudo bash deploy.sh

set -e

echo "========================================="
echo "  知愈医学 · 一键部署脚本"
echo "========================================="

PROJECT_DIR="/opt/zhiyu-server"
DOMAIN="你的域名.cn"  # ← 修改为你的实际域名

# 1. 安装 Node.js
echo "[1/6] 安装 Node.js 22..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
    sudo apt install -y nodejs
fi
echo "Node.js 版本: $(node -v)"

# 2. 安装 Nginx
echo "[2/6] 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi

# 3. 部署项目代码
echo "[3/6] 部署项目代码..."
if [ -d "$PROJECT_DIR" ]; then
    echo "项目目录已存在，更新代码..."
    cd "$PROJECT_DIR" && git pull || true
else
    echo "克隆项目..."
    # 如果项目在 GitHub 上：
    # git clone <你的GitHub仓库URL> "$PROJECT_DIR"
    # 或者用 scp 上传：
    echo "请将项目代码上传到 $PROJECT_DIR"
    echo "方法一: git clone <仓库URL> $PROJECT_DIR"
    echo "方法二: scp -r zhiyu-server/ root@服务器IP:$PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"
npm install --production

# 4. 配置环境变量
echo "[4/6] 配置环境变量..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  请编辑 $PROJECT_DIR/.env 设置管理员密码！"
    echo "   运行: nano $PROJECT_DIR/.env"
fi

# 5. 初始化数据
echo "[5/6] 初始化数据..."
if [ ! -f data/content.json ]; then
    cp data/seed.json data/content.json
    echo "已从 seed.json 初始化内容数据"
fi
mkdir -p public/uploads

# 6. 配置 systemd 服务
echo "[6/6] 配置系统服务..."
sudo cp zhiyu.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zhiyu
sudo systemctl restart zhiyu
echo "服务已启动 ✓"

# 配置 Nginx（需要手动替换域名）
echo ""
echo "========================================="
echo "  部署完成！接下来请手动执行："
echo "========================================="
echo ""
echo "1. 编辑 Nginx 配置，替换域名："
echo "   nano $PROJECT_DIR/zhiyu-nginx.conf"
echo "   将 '你的域名.cn' 替换为实际域名"
echo ""
echo "2. 复制 Nginx 配置："
echo "   sudo cp $PROJECT_DIR/zhiyu-nginx.conf /etc/nginx/sites-available/zhiyu"
echo "   sudo ln -sf /etc/nginx/sites-available/zhiyu /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "3. 申请 SSL 证书："
echo "   sudo apt install -y certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "4. 编辑管理员密码："
echo "   nano $PROJECT_DIR/.env"
echo ""
echo "5. 添加备案号到网站底部（工信部要求）"
echo ""
echo "网站地址: https://$DOMAIN"
echo "后台管理: https://$DOMAIN/admin.html"
