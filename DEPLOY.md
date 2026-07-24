# 知愈医学 · 域名备案与正式部署指南

## 一、整体路线图

```
注册域名 → 购买云服务器 → 提交ICP备案 → 备案通过 → 部署网站 → 绑定域名 → 接入微信公众号
```

整个过程大约 **7-20 天**（主要等待备案审批）。下面是每一步的详细操作。

---

## 二、第一步：注册域名

### 推荐域名（基于「知愈医学」品牌）

| 域名 | 含义 | 价格参考 |
|------|------|----------|
| zhiyuyixue.cn | 知愈医学全拼 | ~29元/年 |
| zhiyu-med.cn | 知愈+医学缩写 | ~29元/年 |
| zhiyu.health | 知愈+健康 | ~200元/年 |
| zhiyumed.com | 国际通用 | ~55元/年 |

### 推荐注册商
- **阿里云**（万网）：https://wanwang.aliyun.com — 备案流程最顺畅
- **腾讯云**（DNSPod）：https://dnspod.cloud.tencent.com — 和腾讯云服务器配套

### 操作步骤
1. 登录阿里云/腾讯云 → 搜索你想要的域名
2. 选择未注册的域名 → 购买（1年起步）
3. 完成**域名实名认证**（上传身份证照片，1-3天审核）

> ⚠️ 域名实名认证是备案的前置条件，必须先通过！

---

## 三、第二步：购买云服务器

### 推荐方案

| 平台 | 配置 | 月费 | 优势 |
|------|------|------|------|
| 腾讯云轻量应用服务器 | 2核2G | ~50元/月 | 和微信同生态，备案快 |
| 阿里云ECS | 2核2G | ~50元/月 | 市场占有率高，教程多 |

### 操作步骤
1. 注册腾讯云/阿里云账号 → 完成实名认证
2. 购买轻量应用服务器（选**中国大陆地域**，如广州/上海）
3. 选择操作系统：**Ubuntu 22.04** 或 **CentOS 8**
4. 确保购买时长 ≥ 3个月（备案要求服务器至少3个月有效期）

> ⚠️ 服务器地域必须选中国大陆！香港/海外服务器无法做ICP备案。

---

## 四、第三步：提交ICP备案

### 什么是ICP备案？
中国法规要求所有在中国大陆提供服务的网站必须向工信部登记。备案通过后会获得一个备案号（如「粤ICP备2026XXXXX号」），必须显示在网站底部。

### 备案流程（通过云平台提交）
1. 登录腾讯云/阿里云 → 进入「备案」页面
2. 填写主体信息：
   - 个人备案：姓名、身份证号、联系方式
   - 企业备案：公司名称、营业执照号
3. 填写网站信息：
   - 网站名称：「知愈医学」（注意：不能含「中国」「中华」等敏感词）
   - 域名：你刚注册的域名
   - 服务内容：医疗健康信息服务
4. 上传材料：
   - 身份证正反面照片
   - 手持身份证半身照
   - 网站负责人核验照（云平台提供在线拍照工具）
5. 提交审核 → 等待7-20天

### 备案期间可以做什么？
- 备案审核期间网站不能对外开通（域名不能解析）
- 但可以用服务器IP临时访问测试
- 可以先在服务器上部署好所有代码，等备案通过后直接绑定域名

---

## 五、第四步：部署网站到服务器

### 方案A：自己购买云服务器（推荐，完全可控）

备案通过后，在服务器上执行：

```bash
# 1. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# 2. 上传项目（用 git 或 scp）
git clone <你的GitHub仓库> /opt/zhiyu-server
cd /opt/zhiyu-server
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 设置密码：
# ADMIN_USER=admin
# ADMIN_PASS=你的强密码
# AUTH_TOKEN=你的随机token
# NODE_ENV=production

# 4. 用 systemd 保持服务运行
sudo cp zhiyu.service /etc/systemd/system/
sudo systemctl enable zhiyu
sudo systemctl start zhiyu

# 5. 配置 Nginx 反向代理 + HTTPS
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp zhiyu-nginx.conf /etc/nginx/sites-available/zhiyu
sudo ln -s /etc/nginx/sites-available/zhiyu /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. 申请免费SSL证书（Let's Encrypt）
sudo certbot --nginx -d 你的域名.cn

# 7. 启动！
sudo systemctl start zhiyu
```

### 方案B：Render.com（最快，免备案但有局限）

适合**快速上线测试**，海外服务器不需要备案：

1. 把 `zhiyu-server/` 推到 GitHub
2. 登录 https://render.com → 创建 Web Service → 连接仓库
3. `render.yaml` 已准备好，自动部署
4. 分配域名如 `zhiyu-medical.onrender.com`

**局限**：
- 服务器在美国，国内访问偏慢（约200-500ms延迟）
- 微信公众号菜单可以链接，但用户体验不如国内服务器
- 首次访问可能有30秒冷启动

### 方案C：腾讯云 CloudBase（免服务器运维）

使用云函数 + 云托管，不需要自己管服务器：
- 登录腾讯云 CloudBase → 创建环境
- 上传项目代码 → 自动部署
- 提供 `.cloudbase.app` 子域名（已有腾讯备案，可立即使用）
- 后续绑定自定义域名（需你自己完成备案）

---

## 六、第五步：绑定域名 + HTTPS

备案通过后：

1. 在域名注册商后台 → DNS解析 → 添加记录：
   - A记录：`@` → 你的服务器IP
   - A记录：`www` → 你的服务器IP
2. 在服务器配置 Nginx 反向代理（方案A的配置文件已准备好）
3. 用 Let's Encrypt 申请免费 SSL 证书
4. 网站底部添加备案号显示（工信部要求）

---

## 七、第六步：接入微信公众号

1. 登录微信公众平台（https://mp.weixin.qq.com）
2. 自定义菜单 → 添加菜单项
3. 菜单类型选择「跳转网页」
4. 填入你的域名 URL：
   - 首页：`https://你的域名.cn/`
   - 文章专栏：`https://你的域名.cn/column.html`
5. 保存发布 → 微信用户点击菜单即可访问

---

## 八、环境变量配置

部署前创建 `.env` 文件（不要提交到 Git！）：

```env
NODE_ENV=production
ADMIN_USER=admin
ADMIN_PASS=修改成你的强密码
AUTH_TOKEN=修改成随机长字符串
PORT=3000
```

---

## 九、关键提醒

1. **备案号必须显示**：网站底部要加上备案号和工信部链接
2. **HTTPS 必须**：微信要求链接必须是 HTTPS
3. **医疗内容合规**：医学科普内容不能涉及诊疗建议，不能替代医生诊断
4. **定期备份**：每月备份 `data/content.json` 和 `public/uploads/`
5. **改密码**：部署前务必修改默认密码，不要用 `zhiyu2026`

---

## 十、快速对比

| 方案 | 速度 | 月费 | 国内访问 | 微信兼容 | 需备案 |
|------|------|------|----------|----------|--------|
| 腾讯云服务器 | 7-20天 | ~50元 | 快 | 完美 | 需要 |
| 阿里云服务器 | 7-20天 | ~50元 | 快 | 完美 | 需要 |
| Render.com | 10分钟 | 免费 | 慢 | 可用 | 不需要 |
| CloudBase | 1天 | ~30元 | 快 | 好 | 子域名免备案，自定义需备案 |

**推荐路线**：先用 Render 快速上线测试 → 同时走备案流程 → 备案通过后迁到腾讯云
