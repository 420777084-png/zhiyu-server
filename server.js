const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const store = require('./store');

// 加载环境变量（.env 文件优先，云平台环境变量其次）
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// 生产环境配置
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'zhiyu2026';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'zhiyu2026';
const NODE_ENV = process.env.NODE_ENV || 'development';

// 确保上传目录存在
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

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
app.get('/api/health', async (req, res) => {
  const health = await store.getHealth().catch(() => ({ storage: 'unknown', persistent: false }));
  res.json({ status: 'ok', uptime: process.uptime(), env: NODE_ENV, storage: health.storage, persistent: health.persistent });
});

// 通用存储配置
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

// 图片上传配置
const imageUpload = multer({
  storage,
  limits: { fileSize: 1.5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// 视频上传配置（支持常见视频格式）
const videoUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 单个视频最大 500MB，实际受平台磁盘限制
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// ========== 公开 API（前台页面使用） ==========

// 获取已发布内容（首页和专栏页使用）
app.get('/api/content', async (req, res) => {
  try {
    const data = await store.getPublishedContent();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '读取内容失败', message: err.message });
  }
});

// 获取分类列表
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await store.getCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: '读取分类失败', message: err.message });
  }
});

// ========== 管理 API（后台使用） ==========

// 简单认证中间件（生产环境使用环境变量）
function authCheck(req, res, next) {
  const token = req.headers['authorization'];
  if (token === `Bearer ${AUTH_TOKEN}`) return next();
  res.status(401).json({ error: '未授权，请先登录' });
}

// 获取全部内容（含草稿，后台使用）
app.get('/api/admin/content', authCheck, async (req, res) => {
  try {
    const data = await store.getAllContent();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '读取内容失败', message: err.message });
  }
});

// 导出完整数据备份（JSON 下载）
app.get('/api/admin/backup', authCheck, async (req, res) => {
  try {
    const data = await store.getAllContent();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="zhiyu-backup-' + new Date().toISOString().slice(0, 10) + '.json"');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '备份失败', message: err.message });
  }
});

// 从 JSON 文件恢复数据
app.post('/api/admin/restore', authCheck, async (req, res) => {
  try {
    await store.restoreContent(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '恢复失败', message: err.message });
  }
});

// 文章 CRUD
app.post('/api/admin/articles', authCheck, async (req, res) => {
  try {
    const categories = await store.getCategories();
    const item = {
      id: Date.now(),
      title: req.body.title || '',
      category: req.body.category || categories[0],
      author: req.body.author || '',
      summary: req.body.summary || '',
      body: req.body.body || '',
      status: req.body.status || 'draft',
      updated: new Date().toISOString().slice(0, 10)
    };
    await store.addArticle(item);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: '保存失败', message: err.message });
  }
});

app.put('/api/admin/articles/:id', authCheck, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = {
      title: req.body.title,
      category: req.body.category,
      author: req.body.author,
      summary: req.body.summary,
      body: req.body.body,
      status: req.body.status,
      updated: new Date().toISOString().slice(0, 10)
    };
    // 过滤 undefined 值
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
    const existing = await store.updateArticle(id, updates);
    if (!existing) return res.status(404).json({ error: '文章不存在' });
    res.json({ success: true, item: existing });
  } catch (err) {
    res.status(500).json({ error: '更新失败', message: err.message });
  }
});

app.delete('/api/admin/articles/:id', authCheck, async (req, res) => {
  try {
    await store.deleteArticle(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败', message: err.message });
  }
});

// 视频 CRUD
app.post('/api/admin/videos', authCheck, async (req, res) => {
  try {
    const categories = await store.getCategories();
    const item = {
      id: Date.now(),
      title: req.body.title || '',
      category: req.body.category || categories[0],
      author: req.body.author || '',
      summary: req.body.summary || '',
      url: req.body.url || '',
      status: req.body.status || 'draft',
      updated: new Date().toISOString().slice(0, 10)
    };
    await store.addVideo(item);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: '保存失败', message: err.message });
  }
});

app.put('/api/admin/videos/:id', authCheck, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = {
      title: req.body.title,
      category: req.body.category,
      author: req.body.author,
      summary: req.body.summary,
      url: req.body.url,
      status: req.body.status,
      updated: new Date().toISOString().slice(0, 10)
    };
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
    const existing = await store.updateVideo(id, updates);
    if (!existing) return res.status(404).json({ error: '视频不存在' });
    res.json({ success: true, item: existing });
  } catch (err) {
    res.status(500).json({ error: '更新失败', message: err.message });
  }
});

app.delete('/api/admin/videos/:id', authCheck, async (req, res) => {
  try {
    const id = Number(req.params.id);
    // 删除关联的视频文件，避免磁盘无限增长
    const all = await store.getAllContent();
    const video = all.videos.find(item => item.id === id);
    if (video && video.url && video.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, 'public', video.url);
      try { fs.unlinkSync(filePath); } catch {}
    }
    await store.deleteVideo(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败', message: err.message });
  }
});

// 分类管理
app.post('/api/admin/categories', authCheck, async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: '分类名称不能为空' });
    const data = await store.getAllContent();
    if (data.categories.includes(name)) return res.status(400).json({ error: '分类已存在' });
    data.categories.push(name);
    await store.setCategories(data.categories);
    res.json({ success: true, categories: data.categories });
  } catch (err) {
    res.status(500).json({ error: '保存失败', message: err.message });
  }
});

app.delete('/api/admin/categories/:name', authCheck, async (req, res) => {
  try {
    const name = req.params.name;
    const data = await store.getAllContent();
    const used = data.articles.some(item => item.category === name) || data.videos.some(item => item.category === name);
    if (used) return res.status(400).json({ error: '该分类下已有内容，不能直接删除' });
    data.categories = data.categories.filter(c => c !== name);
    await store.setCategories(data.categories);
    res.json({ success: true, categories: data.categories });
  } catch (err) {
    res.status(500).json({ error: '删除失败', message: err.message });
  }
});

// 图片/资料上传
app.post('/api/upload', authCheck, imageUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择 JPG、PNG、WebP 图片文件' });
  res.json({
    success: true,
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size
  });
});

// 视频上传
app.post('/api/upload-video', authCheck, videoUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择 MP4、WebM、MOV、AVI、MKV 等视频文件' });
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

app.listen(PORT, async () => {
  console.log(`知愈医学服务已启动 → http://localhost:${PORT}`);
  // 初始化数据库连接和种子数据
  const health = await store.getHealth().catch(() => null);
  if (health && health.storage === 'mongodb') {
    console.log(`📦 存储模式: MongoDB Atlas（持久化）`);
    // 如果 MongoDB 中没有文章数据，从种子文件导入
    const all = await store.getAllContent();
    if (all.articles.length === 0 && fs.existsSync(path.join(__dirname, 'data', 'seed.json'))) {
      const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'seed.json'), 'utf-8'));
      if (seed.articles && seed.articles.length > 0) {
        await store.restoreContent(seed);
        console.log(`🌱 已从种子文件导入 ${seed.articles.length} 篇文章到 MongoDB`);
      }
    } else {
      console.log(`📊 已有 ${all.articles.length} 篇文章, ${all.videos.length} 个视频`);
    }
  } else {
    console.log(`📦 存储模式: JSON 文件（非持久化，重启会丢失数据）`);
  }
});
