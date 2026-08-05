/**
 * 知愈医学 - 数据迁移脚本
 * 从 MongoDB Atlas 迁移数据到本地 MongoDB
 *
 * 使用方法：
 *   1. 确保本地 MongoDB 已运行（mongod 服务正常）
 *   2. 运行: node migrate-from-atlas.js
 *   3. 脚本会自动从 Atlas 读取数据并写入本地 MongoDB
 */

const { MongoClient } = require('mongodb');

// ===== 配置 =====
// 旧数据库：MongoDB Atlas
const ATLAS_URI = 'mongodb+srv://420777084_db_user:tEMqIT5NhyRZCcfE@zhiyu-cluster.2ndf4so.mongodb.net/?appName=zhiyu-cluster&retryWrites=true&w=majority';

// 新数据库：本地 MongoDB
const LOCAL_URI = 'mongodb://127.0.0.1:27017/zhiyu_medical?retryWrites=true&w=majority';

const DB_NAME = 'zhiyu_medical';

async function migrate() {
  console.log('=========================================');
  console.log('  知愈医学 · 数据迁移工具');
  console.log('  Atlas → 本地 MongoDB');
  console.log('=========================================\n');

  let atlasClient = null;
  let localClient = null;

  try {
    // 1. 连接 Atlas（源）
    console.log('[1/5] 连接 MongoDB Atlas...');
    atlasClient = new MongoClient(ATLAS_URI, {
      serverSelectionTimeoutMS: 15000,
      tls: true,
      tlsAllowInvalidCertificates: false,
      family: 4
    });
    await atlasClient.connect();
    const atlasDb = atlasClient.db(DB_NAME);
    console.log('  ✅ 已连接到 Atlas\n');

    // 2. 连接本地 MongoDB（目标）
    console.log('[2/5] 连接本地 MongoDB...');
    localClient = new MongoClient(LOCAL_URI, {
      serverSelectionTimeoutMS: 10000,
      family: 4
    });
    await localClient.connect();
    const localDb = localClient.db(DB_NAME);
    console.log('  ✅ 已连接到本地 MongoDB\n');

    // 3. 读取 Atlas 数据
    console.log('[3/5] 读取 Atlas 数据...');
    const articles = await atlasDb.collection('articles').find({}, { projection: { _id: 0 } }).toArray();
    const videos = await atlasDb.collection('videos').find({}, { projection: { _id: 0 } }).toArray();
    const categoriesMeta = await atlasDb.collection('meta').findOne({ key: 'categories' });
    console.log(`  📄 文章: ${articles.length} 篇`);
    console.log(`  🎬 视频: ${videos.length} 个`);
    console.log(`  📁 分类: ${categoriesMeta?.value?.length || 0} 个\n`);

    // 4. 写入本地 MongoDB
    console.log('[4/5] 写入本地 MongoDB...');

    // 创建索引
    await localDb.collection('articles').createIndex({ id: 1 }, { unique: true });
    await localDb.collection('videos').createIndex({ id: 1 }, { unique: true });
    await localDb.collection('meta').createIndex({ key: 1 }, { unique: true });

    // 清空本地数据（避免重复）
    await localDb.collection('articles').deleteMany({});
    await localDb.collection('videos').deleteMany({});
    await localDb.collection('meta').deleteMany({});

    // 写入文章
    if (articles.length > 0) {
      await localDb.collection('articles').insertMany(articles);
      console.log(`  ✅ 写入 ${articles.length} 篇文章`);
    }

    // 写入视频
    if (videos.length > 0) {
      await localDb.collection('videos').insertMany(videos);
      console.log(`  ✅ 写入 ${videos.length} 个视频`);
    }

    // 写入分类
    if (categoriesMeta) {
      await localDb.collection('meta').insertOne({
        key: 'categories',
        value: categoriesMeta.value
      });
      console.log(`  ✅ 写入 ${categoriesMeta.value.length} 个分类`);
    }

    console.log('');

    // 5. 验证
    console.log('[5/5] 验证数据...');
    const localArticles = await localDb.collection('articles').countDocuments();
    const localVideos = await localDb.collection('videos').countDocuments();
    const localCategories = await localDb.collection('meta').findOne({ key: 'categories' });

    console.log(`  📄 本地文章: ${localArticles} 篇 ${localArticles === articles.length ? '✅' : '❌ 数量不匹配!'}`);
    console.log(`  🎬 本地视频: ${localVideos} 个 ${localVideos === videos.length ? '✅' : '❌ 数量不匹配!'}`);
    console.log(`  📁 本地分类: ${localCategories?.value?.length || 0} 个\n`);

    if (localArticles === articles.length && localVideos === videos.length) {
      console.log('=========================================');
      console.log('  🎉 数据迁移成功！');
      console.log('=========================================');
      console.log('\n现在可以更新 .env 文件使用本地 MongoDB 了：');
      console.log('  MONGODB_URI=mongodb://127.0.0.1:27017/zhiyu_medical');
      console.log('\n然后重启服务: systemctl restart zhiyu');
    } else {
      console.log('⚠️  数据数量不匹配，请检查！');
    }

  } catch (err) {
    console.error('\n❌ 迁移失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (atlasClient) await atlasClient.close().catch(() => {});
    if (localClient) await localClient.close().catch(() => {});
  }
}

migrate();
