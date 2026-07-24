# 知愈医学 · Render 部署操作指南（中文对照版）

> 你已经在浏览器里登录了 Render。现在跟着以下步骤操作，每一步都有英文界面对应的中文说明。

---

## 步骤 1：打开创建服务页面

1. 在浏览器地址栏输入：`https://dashboard.render.com/select-repo?type=web`
2. 或者点击页面上的 **"New +"** → **"Web Service"**

---

## 步骤 2：连接你的仓库

页面会显示你的 GitHub 仓库列表：

- 找到 **`420777084-png/zhiyu-server`** → 点击右边的 **"Connect"** 按钮

---

## 步骤 3：填写服务配置

连接后会出现配置页面。按以下填写：

| 英文标签 | 你要填的内容 | 说明 |
|----------|-------------|------|
| **Name** | `zhiyu-medical` | 服务名称 |
| **Region** | 选 Oregon (US West) | 默认就好 |
| **Branch** | `main` | 默认就好 |
| **Root Directory** | 留空 | 不用填 |
| **Runtime** | Node | 自动检测 |
| **Build Command** | `npm install` | 安装依赖 |
| **Start Command** | `node server.js` | 启动服务 |
| **Plan** | 选 **Free** | 免费，够用 |

---

## 步骤 4：添加环境变量（最重要的一步！）

在配置页面往下滚，找到 **"Advanced"** → 点击展开 → 找到 **"Environment Variables"** 区域。

点击 **"Add Environment Variable"** 按钮，添加以下 4 个：

| 添加顺序 | Key（左侧） | Value（右侧） |
|----------|------------|---------------|
| 第1个 | `ADMIN_USER` | `admin` |
| 第2个 | `ADMIN_PASS` | `改成你想要的管理密码` ← ⚠️ 别用默认密码！ |
| 第3个 | `AUTH_TOKEN` | `zhiyu2026secureToken987654321` ← 或者你自己的随机字符串 |
| 第4个 | `NODE_ENV` | `production` |

---

## 步骤 5：创建服务

全部填完后，点击页面底部的 **"Create Web Service"** 按钮（绿色的大按钮）。

---

## 步骤 6：等待部署完成

- Render 会自动开始构建（约 2-3 分钟）
- 页面上会显示构建日志（黑色终端区域）
- 等待显示 **"Live"** 状态 = 部署成功
- 你的网站链接会出现在页面顶部，类似：`https://zhiyu-medical.onrender.com`

---

## 步骤 7：验证网站

打开 Render 给你的链接，检查：

- ✅ 首页是否正常显示
- ✅ 专栏页（链接后加 `/column.html`）
- ✅ 后台管理（链接后加 `/admin.html`）
- ✅ 用你设置的 ADMIN_USER 和 ADMIN_PASS 登录后台

---

## 常见问题

### Q: 找不到我的仓库？
确保你在 Render 登录时用了 GitHub 账号，并且在授权时允许了访问 `zhiyu-server` 仓库。如果没有，去 GitHub Settings → Applications → Render → 重新授权。

### Q: 构建失败？
检查 Build Command 是 `npm install`，Start Command 是 `node server.js`。确认环境变量都加了。

### Q: 首次打开很慢？
免费版首次访问有 30秒冷启动，这是正常的。后续访问会更快。

### Q: 中文乱码？
不会的，代码已经设置好 UTF-8 编码。

---

## 网站上线后的下一步

### 接入微信公众号
1. 登录微信公众平台 https://mp.weixin.qq.com
2. 自定义菜单 → 添加菜单项 → 跳转网页
3. 链接填写：`https://zhiyu-medical.onrender.com/`（首页）和 `https://zhiyu-medical.onrender.com/column.html`（专栏）

### 开始备案（同时进行）
1. 去阿里云/腾讯云注册域名（推荐 zhiyuyixue.cn，29元/年）
2. 买云服务器 + 提交ICP备案（7-20天）
3. 备案通过后 → 用 deploy.sh 一键迁到国内服务器
