# 知愈医学 · 从零到上线操作手册

> 本手册包含两条路线：快速测试版（Render，10分钟）和正式上线版（国内云服务器，7-20天）

---

## 🚀 路线A：Render 快速上线（10分钟，推荐先走这步）

### 前置条件
- 一个 GitHub 账号（免费注册）
- 项目代码（`zhiyu-server/` 目录已打包准备好）

### 步骤1：注册 GitHub

1. 打开 https://github.com → 点击 Sign up
2. 填写邮箱、密码、用户名
3. 完成验证

### 步骤2：创建仓库并上传代码

**方法一：网页上传（最简单）**
1. 登录 GitHub → 点击右上角 `+` → New repository
2. Repository name: `zhiyu-server`
3. 选择 Public（公开，Render 需要读取）
4. 点击 Create repository
5. 点击 uploading an existing file
6. 把 `zhiyu-server/` 目录里的所有文件拖进去
7. 注意：**不要上传 `.env` 文件、`node_modules/`、`data/content.json`、`public/uploads/`**
8. 点击 Commit changes

**方法二：命令行推送（如果你熟悉 Git）**
```bash
cd zhiyu-server
git remote add origin https://github.com/你的用户名/zhiyu-server.git
git branch -M main
git push -u origin main
```

### 步骤3：注册 Render 并部署

1. 打开 https://render.com → 点击 Get Started
2. 用 GitHub 账号登录（Sign up with GitHub）
3. 授权 Render 访问你的仓库
4. 点击 `+ New` → Web Service
5. 选择 `zhiyu-server` 仓库
6. 配置页面填写：
   - **Name**: `zhiyu-medical`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
7. 环境变量（点击 Advanced → Add Environment Variable）：
   - `ADMIN_USER` = `admin`（或你想要的管理员用户名）
   - `ADMIN_PASS` = `改成你的强密码`（⚠️ 不要用默认密码！）
   - `AUTH_TOKEN` = `改成随机长字符串`（⚠️ 不要用默认token！）
   - `NODE_ENV` = `production`
8. 点击 Create Web Service
9. 等待 2-3 分钟自动构建部署

### 步骤4：验证上线

部署完成后，Render 会给你一个域名，类似：
```
https://zhiyu-medical.onrender.com
```

打开这个链接验证：
- ✅ 首页加载正常
- ✅ 专栏页显示文章
- ✅ 后台管理页面能登录（`/admin.html`，用你设置的账号密码）
- ✅ 后台添加文章 → 前台能看到

### 步骤5：接入微信公众号

1. 登录微信公众平台 https://mp.weixin.qq.com
2. 自定义菜单 → 添加菜单项
3. 菜单类型：跳转网页
4. 链接填写：
   - 首页：`https://zhiyu-medical.onrender.com/`
   - 专栏：`https://zhiyu-medical.onrender.com/column.html`
5. 保存发布

> ⚠️ Render 免费版首次访问可能有 30秒冷启动，国内访问延迟约200-500ms。这作为测试版完全可用，后续迁到国内服务器后速度会好很多。

---

## 🏠 路线B：正式上线（国内云服务器 + 域名备案，7-20天）

### 步骤1：注册域名

1. 打开阿里云 https://wanwang.aliyun.com 或腾讯云 https://dnspod.cloud.tencent.com
2. 搜索以下域名，选一个未注册的：
   - `zhiyuyixue.cn`（约29元/年）— 全拼，推荐
   - `zhiyu-med.cn`（约29元/年）
   - `zhiyumed.com`（约55元/年）— 国际通用
3. 购买 → 完成域名实名认证（上传身份证，1-3天通过）

### 步骤2：购买云服务器

1. 登录腾讯云 https://cloud.tencent.com 或阿里云 https://www.aliyun.com
2. 完成账号实名认证
3. 购买轻量应用服务器：
   - 配置：2核2G 足够
   - 地域：**广州或上海**（必须中国大陆，否则无法备案）
   - 系统：Ubuntu 22.04
   - 时长：≥3个月（备案要求）
   - 月费约50元

### 步骤3：提交ICP备案

1. 在腾讯云/阿里云后台 → 备案服务 → 开始备案
2. 填写：
   - 主体信息：姓名、身份证号、联系方式
   - 网站信息：名称「知愈医学」、域名、服务内容选「医疗健康信息服务」
3. 上传材料：身份证正反面、手持身份证照、核验照
4. 提交 → 等待 7-20 天审批
5. 备案期间可以用服务器 IP 临时测试

### 步骤4：备案通过后部署代码

在服务器上执行（SSH 登录后）：

```bash
# 1. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# 2. 上传项目（从 Render 的 GitHub 仓库克隆）
git clone https://github.com/你的用户名/zhiyu-server.git /opt/zhiyu-server
cd /opt/zhiyu-server
npm install --production

# 3. 配置密码
cp .env.example .env
nano .env  # 编辑设置 ADMIN_PASS 和 AUTH_TOKEN

# 4. 初始化数据
cp data/seed.json data/content.json

# 5. 安装系统服务
sudo cp zhiyu.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zhiyu
sudo systemctl start zhiyu

# 6. 安装 Nginx + HTTPS
sudo apt install -y nginx certbot python3-certbot-nginx

# 7. 配置 Nginx（先修改 zhiyu-nginx.conf 里的域名）
# 把 '你的域名.cn' 替换成实际域名
sed -i 's/你的域名.cn/zhiyuyixue.cn/g' zhiyu-nginx.conf
sudo cp zhiyu-nginx.conf /etc/nginx/sites-available/zhiyu
sudo ln -sf /etc/nginx/sites-available/zhiyu /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 8. 申请 SSL 证书
sudo certbot --nginx -d zhiyuyixue.cn -d www.zhiyuyixue.cn

# 9. DNS 解析（在域名注册商后台）
# 添加 A 记录：@ → 服务器IP
# 添加 A 记录：www → 服务器IP

# 10. 网站上线！
```

### 步骤5：添加备案号

工信部要求网站底部必须显示备案号。打开 `public/index.html`，在页面底部 footer 区域添加：

```html
<p style="text-align:center;color:#999;font-size:12px;">
  粤ICP备2026XXXXX号 | <a href="https://beian.miit.gov.cn/" target="_blank">工信部备案查询</a>
</p>
```

> 替换成你实际的备案号。

### 步骤6：最终接入微信公众号

和路线A的步骤5相同，只是 URL 从 Render 域名换成你自己的域名：
- `https://zhiyuyixue.cn/`
- `https://zhiyuyixue.cn/column.html`

---

## ⚠️ 重要提醒

1. **改密码**：部署前必须修改 `.env` 里的 `ADMIN_PASS` 和 `AUTH_TOKEN`
2. **备案号**：国内网站底部必须显示备案号，否则可能被关站
3. **HTTPS**：微信要求所有链接必须是 HTTPS
4. **医疗内容合规**：科普内容不能涉及具体诊疗建议，需注明「仅供参考」
5. **定期备份**：每月备份服务器上的 `data/content.json` 和 `public/uploads/`
6. **数据迁移**：从 Render 迁到国内服务器时，把 `data/content.json` 和 `public/uploads/` 复制过去即可

---

## 📁 项目文件清单

```
zhiyu-server/
├── server.js            # Express 后端（生产级配置）
├── package.json         # 依赖：express + multer + dotenv
├── render.yaml          # Render 一键部署配置
├── .env.example         # 环境变量模板
├── .gitignore           # Git 排除规则
├── deploy.sh            # 一键部署脚本（Ubuntu）
├── zhiyu-nginx.conf     # Nginx 反向代理 + HTTPS
├── zhiyu.service        # systemd 服务守护
├── DEPLOY.md            # 完整部署与备案指南
├── SETUP-GUIDE.md       # 本文件：从零操作手册
├── data/
│   └── seed.json        # 初始内容数据（6篇文章 + 2个视频）
│   └── content.json     # 运行数据（gitignore，首次启动从seed初始化）
└── public/
    ├── index.html        # 首页
    ├── styles.css        # 首页样式
    ├── app.js            # 首页逻辑（API版）
    ├── column.html       # 专栏页
    ├── column.css        # 专栏样式
    ├── column.js         # 专栏逻辑（API版 + 本地后备）
    ├── admin.html        # 后台管理
    ├── admin.css         # 后台样式
    ├── admin.js          # 后台逻辑（API版）
    └── uploads/          # 图片上传目录
```
