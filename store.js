/**
 * 知愈医学数据存储层
 * 支持两种后端：
 * 1. MongoDB Atlas（生产环境推荐，持久化）- 设置 MONGODB_URI 环境变量
 * 2. 本地 JSON 文件（开发/临时）- 未设置 MONGODB_URI 时自动回退
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'content.json');
const SEED_FILE = path.join(__dirname, 'data', 'seed.json');
const DEFAULT_CATEGORIES = ['疾病', '营养', '急救', '心理', '用药', '儿童'];

const MONGODB_URI = process.env.MONGODB_URI;
let mongoClient = null;
let mongoDb = null;

async function connectMongo() {
  if (!MONGODB_URI) return false;
  if (mongoClient) return true;
  try {
    const { MongoClient } = await import('mongodb');
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    mongoDb = mongoClient.db('zhiyu_medical');
    // 确保索引存在
    await mongoDb.collection('articles').createIndex({ id: 1 }, { unique: true });
    await mongoDb.collection('videos').createIndex({ id: 1 }, { unique: true });
    await mongoDb.collection('meta').createIndex({ key: 1 }, { unique: true });
    console.log('已连接到 MongoDB Atlas（持久化存储）');
    return true;
  } catch (err) {
    console.error('MongoDB 连接失败，回退到 JSON 文件存储:', err.message);
    mongoClient = null;
    mongoDb = null;
    return false;
  }
}

async function usingMongo() {
  if (mongoDb) return true;
  return await connectMongo();
}

// ===== JSON 文件后端 =====
function readJsonData() {
  try {
    if (!fs.existsSync(DATA_FILE) && fs.existsSync(SEED_FILE)) {
      fs.copyFileSync(SEED_FILE, DATA_FILE);
      console.log('已从 seed.json 初始化内容数据');
    }
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return { articles: [], videos: [], categories: [...DEFAULT_CATEGORIES] };
  }
}

function writeJsonData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ===== 通用数据访问 =====
async function getAllContent() {
  if (await usingMongo()) {
    const [articles, videos, categoriesMeta] = await Promise.all([
      mongoDb.collection('articles').find({}, { projection: { _id: 0 } }).toArray(),
      mongoDb.collection('videos').find({}, { projection: { _id: 0 } }).toArray(),
      mongoDb.collection('meta').findOne({ key: 'categories' })
    ]);
    return {
      articles: articles || [],
      videos: videos || [],
      categories: categoriesMeta?.value || [...DEFAULT_CATEGORIES]
    };
  }
  return readJsonData();
}

async function getPublishedContent() {
  const all = await getAllContent();
  return {
    articles: all.articles.filter(item => item.status === 'published'),
    videos: all.videos.filter(item => item.status === 'published')
  };
}

async function getCategories() {
  const all = await getAllContent();
  return all.categories;
}

async function setCategories(categories) {
  if (await usingMongo()) {
    await mongoDb.collection('meta').updateOne(
      { key: 'categories' },
      { $set: { key: 'categories', value: categories } },
      { upsert: true }
    );
    return;
  }
  const data = readJsonData();
  data.categories = categories;
  writeJsonData(data);
}

// ===== 文章 CRUD =====
async function addArticle(item) {
  if (await usingMongo()) {
    await mongoDb.collection('articles').insertOne(item);
    return item;
  }
  const data = readJsonData();
  data.articles.unshift(item);
  writeJsonData(data);
  return item;
}

async function updateArticle(id, updates) {
  if (await usingMongo()) {
    const result = await mongoDb.collection('articles').findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    return result;
  }
  const data = readJsonData();
  const existing = data.articles.find(item => item.id === id);
  if (!existing) return null;
  Object.assign(existing, updates);
  writeJsonData(data);
  return existing;
}

async function deleteArticle(id) {
  if (await usingMongo()) {
    await mongoDb.collection('articles').deleteOne({ id });
    return;
  }
  const data = readJsonData();
  data.articles = data.articles.filter(item => item.id !== id);
  writeJsonData(data);
}

// ===== 视频 CRUD =====
async function addVideo(item) {
  if (await usingMongo()) {
    await mongoDb.collection('videos').insertOne(item);
    return item;
  }
  const data = readJsonData();
  data.videos.unshift(item);
  writeJsonData(data);
  return item;
}

async function updateVideo(id, updates) {
  if (await usingMongo()) {
    const result = await mongoDb.collection('videos').findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    return result;
  }
  const data = readJsonData();
  const existing = data.videos.find(item => item.id === id);
  if (!existing) return null;
  Object.assign(existing, updates);
  writeJsonData(data);
  return existing;
}

async function deleteVideo(id) {
  if (await usingMongo()) {
    await mongoDb.collection('videos').deleteOne({ id });
    return;
  }
  const data = readJsonData();
  data.videos = data.videos.filter(item => item.id !== id);
  writeJsonData(data);
}

// ===== 批量备份/恢复（JSON 文件后端用） =====
async function restoreContent(data) {
  if (!data || typeof data !== 'object') throw new Error('数据格式不正确');
  if (!Array.isArray(data.articles)) data.articles = [];
  if (!Array.isArray(data.videos)) data.videos = [];
  if (!Array.isArray(data.categories)) data.categories = [...DEFAULT_CATEGORIES];

  if (await usingMongo()) {
    await mongoDb.collection('articles').deleteMany({});
    if (data.articles.length) await mongoDb.collection('articles').insertMany(data.articles);
    await mongoDb.collection('videos').deleteMany({});
    if (data.videos.length) await mongoDb.collection('videos').insertMany(data.videos);
    await mongoDb.collection('meta').updateOne(
      { key: 'categories' },
      { $set: { key: 'categories', value: data.categories } },
      { upsert: true }
    );
    return;
  }
  writeJsonData(data);
}

async function getHealth() {
  const mongo = await usingMongo();
  return {
    storage: mongo ? 'mongodb' : 'json',
    persistent: mongo ? true : false,
    mongodbUriSet: !!MONGODB_URI
  };
}

module.exports = {
  getAllContent,
  getPublishedContent,
  getCategories,
  setCategories,
  addArticle,
  updateArticle,
  deleteArticle,
  addVideo,
  updateVideo,
  deleteVideo,
  restoreContent,
  getHealth
};
