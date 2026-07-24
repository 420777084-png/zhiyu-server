const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 加载环境变量（.env 文件优先，云平台环境变量其次）
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'content.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// 生产环境配置
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'zhiyu2026';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'zhiyu2026';
const NODE_ENV = process.env.NODE_ENV || 'development';

// 确保上传目录存在
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// 首次启动时从 seed.json 初始化数据文件
const SEED_FILE = path.join(__dirname, 'data', 'seed.json');
if (!fs.existsSync(DATA_FILE) && fs.existsSync(SEED_FILE)) {
  fs.copyFileSync(SEED_FILE, DATA_FILE);
  console.log('已从 seed.json 初始化内容数据');
}
// 确保 data 目录存在
if (!fs.existsSync(path.dirname(DATA_FILE))) fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

// 安全与兼容性中间件
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

// CORS 支持（微信浏览器兼容）
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// 健康检查端点（云平台监控使用）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), env: NODE_ENV });
});

// 图片上传配置
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 1.5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// ========== 读取和保存数据 ==========
function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
  catch { return { articles: [], videos: [], categories: ['疾病', '营养', '急救', '心理', '用药', '儿童'] }; }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ========== 公开 API（前台页面使用） ==========

// 获取已发布内容（首页和专栏页使用）
app.get('/api/content', (req, res) => {
  const data = readData();
  res.json({
    articles: data.articles.filter(item => item.status === 'published'),
    videos: data.videos.filter(item => item.status === 'published')
  });
});

// 获取分类列表
app.get('/api/categories', (req, res) => {
  const data = readData();
  res.json(data.categories);
});

// ========== 管理 API（后台使用） ==========

// 简单认证中间件（生产环境使用环境变量）
function authCheck(req, res, next) {
  const token = req.headers['authorization'];
  if (token === `Bearer ${AUTH_TOKEN}`) return next();
  res.status(401).json({ error: '未授权，请先登录' });
}

// 获取全部内容（含草稿，后台使用）
app.get('/api/admin/content', authCheck, (req, res) => {
  const data = readData();
  res.json(data);
});

// 文章 CRUD
app.post('/api/admin/articles', authCheck, (req, res) => {
  const data = readData();
  const item = {
    id: Date.now(),
    title: req.body.title || '',
    category: req.body.category || data.categories[0],
    author: req.body.author || '',
    summary: req.body.summary || '',
    body: req.body.body || '',
    status: req.body.status || 'draft',
    updated: new Date().toISOString().slice(0, 10)
  };
  data.articles.unshift(item);
  writeData(data);
  res.json({ success: true, item });
});

app.put('/api/admin/articles/:id', authCheck, (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const existing = data.articles.find(item => item.id === id);
  if (!existing) return res.status(404).json({ error: '文章不存在' });
  Object.assign(existing, {
    title: req.body.title ?? existing.title,
    category: req.body.category ?? existing.category,
    author: req.body.author ?? existing.author,
    summary: req.body.summary ?? existing.summary,
    body: req.body.body ?? existing.body,
    status: req.body.status ?? existing.status,
    updated: new Date().toISOString().slice(0, 10)
  });
  writeData(data);
  res.json({ success: true, item: existing });
});

app.delete('/api/admin/articles/:id', authCheck, (req, res) => {
  const data = readData();
  data.articles = data.articles.filter(item => item.id !== Number(req.params.id));
  writeData(data);
  res.json({ success: true });
});

// 视频 CRUD
app.post('/api/admin/videos', authCheck, (req, res) => {
  const data = readData();
  const item = {
    id: Date.now(),
    title: req.body.title || '',
    category: req.body.category || data.categories[0],
    author: req.body.author || '',
    summary: req.body.summary || '',
    url: req.body.url || '',
    status: req.body.status || 'draft',
    updated: new Date().toISOString().slice(0, 10)
  };
  data.videos.unshift(item);
  writeData(data);
  res.json({ success: true, item });
});

app.put('/api/admin/videos/:id', authCheck, (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const existing = data.videos.find(item => item.id === id);
  if (!existing) return res.status(404).json({ error: '视频不存在' });
  Object.assign(existing, {
    title: req.body.title ?? existing.title,
    category: req.body.category ?? existing.category,
    author: req.body.author ?? existing.author,
    summary: req.body.summary ?? existing.summary,
    url: req.body.url ?? existing.url,
    status: req.body.status ?? existing.status,
    updated: new Date().toISOString().slice(0, 10)
  });
  writeData(data);
  res.json({ success: true, item: existing });
});

app.delete('/api/admin/videos/:id', authCheck, (req, res) => {
  const data = readData();
  data.videos = data.videos.filter(item => item.id !== Number(req.params.id));
  writeData(data);
  res.json({ success: true });
});

// 分类管理
app.post('/api/admin/categories', authCheck, (req, res) => {
  const data = readData();
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: '分类名称不能为空' });
  if (data.categories.includes(name)) return res.status(400).json({ error: '分类已存在' });
  data.categories.push(name);
  writeData(data);
  res.json({ success: true, categories: data.categories });
});

app.delete('/api/admin/categories/:name', authCheck, (req, res) => {
  const data = readData();
  const name = req.params.name;
  const used = data.articles.some(item => item.category === name) || data.videos.some(item => item.category === name);
  if (used) return res.status(400).json({ error: '该分类下已有内容，不能直接删除' });
  data.categories = data.categories.filter(c => c !== name);
  writeData(data);
  res.json({ success: true, categories: data.categories });
});

// 图片上传
app.post('/api/upload', authCheck, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  res.json({
    success: true,
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size
  });
});

// 登录验证（使用环境变量配置账号密码）
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true, token: AUTH_TOKEN });
  } else {
    res.status(401).json({ error: '账号或密码不正确' });
  }
});

// 所有未匹配的路由返回 index.html（支持 SPA 式导航）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`知愈医学服务已启动 → http://localhost:${PORT}`);
});
