// 知愈医学专栏页 - 服务端 API 版（带本地默认数据后备）
const params = new URLSearchParams(location.search);
let activeColumn = params.get('name') || '全部';
const targetArticleId = params.get('article');
const descriptions = { 全部: '浏览知愈医学全部健康科普文章，按专栏分类筛选。', 疾病: '认识疾病信号，了解科学预防和规范诊疗。', 营养: '用可靠的营养知识，建立健康饮食习惯。', 急救: '掌握关键急救常识，紧急时刻正确行动。', 心理: '关注情绪和心理状态，学习科学应对方法。', 用药: '了解常见药物知识，守护安全用药。', 儿童: '陪伴孩子健康成长，正确应对常见问题。' };

// 本地默认数据（API 不可用时使用）
const defaultArticles = [
  { id: 1, title: '身体发出的信号，哪些可能与心脏有关？', category: '疾病', author: '心内科 · 林医生', summary: '认识需要及时就医的心脏危险信号。', body: '<p>胸痛、心悸、气短可能由多种原因引起。当症状持续、加重或伴随大汗、晕厥时，应及时就医。</p>', status: 'published', updated: '2026-07-17' },
  { id: 2, title: '体检发现血脂高，饮食该怎么调整？', category: '营养', author: '临床营养科', summary: '从饮食开始科学管理血脂。', body: '<p>保持均衡饮食，减少反式脂肪与过量饱和脂肪摄入，多选择全谷物、蔬菜和适量优质蛋白。</p>', status: 'published', updated: '2026-07-16' },
  { id: 3, title: '发现有人突然倒地，正确急救怎么做？', category: '急救', author: '急诊医学中心', summary: '识别心脏骤停并及时呼救。', body: '<p>确认环境安全，判断意识和呼吸，立即呼叫急救电话，并在有条件时开始心肺复苏。</p>', status: 'published', updated: '2026-07-15' },
  { id: 4, title: '普通感冒和流感，有什么区别？', category: '疾病', author: '呼吸内科 · 周医生', summary: '从症状、病程到应对方式，帮你做出更科学的判断。', body: '<p>普通感冒通常症状较轻，以鼻塞、流涕为主；流感则起病急，常伴随高热、全身酸痛和明显乏力。</p>', status: 'published', updated: '2026-07-14' },
  { id: 5, title: '感到焦虑时，可以做些什么？', category: '心理', author: '心理医学科', summary: '了解有科学依据的情绪调节方法。', body: '<p>尝试规律呼吸、减少刺激源并保持稳定作息。若焦虑持续影响生活，建议寻求专业帮助。</p>', status: 'published', updated: '2026-07-11' }
];
const defaultCategories = ['疾病', '营养', '急救', '心理', '用药', '儿童'];

let articles = defaultArticles;
let categories = defaultCategories;

async function loadData() {
  try {
    const contentRes = await fetch('/api/content');
    if (contentRes.ok) {
      const content = await contentRes.json();
      articles = content.articles;
    }
    const catRes = await fetch('/api/categories');
    if (catRes.ok) {
      categories = await catRes.json();
    }
    if (!categories.includes(activeColumn)) activeColumn = '全部';
    render();
  } catch (error) {
    console.warn('API 不可用，使用本地默认内容', error);
    if (!categories.includes(activeColumn)) activeColumn = '全部';
    render();
  }
}

function render() {
  const list = activeColumn === '全部'
    ? [...articles].sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0))
    : articles.filter(item => item.category === activeColumn).sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0));
  document.title = `${activeColumn === '全部' ? '健康' : activeColumn}专栏 · 知愈医学`;
  document.querySelector('#column-title').textContent = activeColumn === '全部' ? '健康专栏' : `${activeColumn}专栏`;
  document.querySelector('#column-description').textContent = descriptions[activeColumn] || descriptions['全部'];
  document.querySelector('#article-total').textContent = list.length;
  document.querySelector('#column-list-title').textContent = activeColumn === '全部' ? '全部文章' : `${activeColumn}专栏文章`;
  const select = document.querySelector('#column-select');
  select.innerHTML = `<option value="全部">全部专栏</option>` + categories.map(name => `<option value="${name}">${name}专栏</option>`).join('');
  select.value = activeColumn;
  renderTags();
  document.querySelector('#column-article-list').innerHTML = list.map(item => `<article class="column-article" data-id="${item.id}"><span class="tag green">${item.category}</span><h2>${item.title}</h2><p>${item.summary || '查看专业医疗健康科普内容。'}</p><div class="meta"><span>${item.author || '知愈医学'}</span><span>·</span><span>${item.updated || '近期更新'}</span></div></article>`).join('');
  document.querySelector('#empty-state').hidden = list.length > 0;
}

function renderTags() {
  const tagsContainer = document.querySelector('#column-tags');
  const tags = ['全部', ...categories];
  tagsContainer.innerHTML = tags.map(name => `<button type="button" class="column-tag${name === activeColumn ? ' active' : ''}" data-name="${name}">${name}</button>`).join('');
}

document.querySelector('#column-select').addEventListener('change', event => switchColumn(event.target.value));
document.querySelector('#column-tags').addEventListener('click', event => {
  const tag = event.target.closest('[data-name]');
  if (!tag) return;
  switchColumn(tag.dataset.name);
});

function switchColumn(name) {
  activeColumn = name;
  history.replaceState(null, '', name === '全部' ? 'column.html' : `?name=${encodeURIComponent(name)}`);
  render();
}

function openReader(item) {
  document.querySelector('#reader-category').textContent = item.category;
  document.querySelector('#reader-title').textContent = item.title;
  document.querySelector('#reader-meta').textContent = `${item.author || '知愈医学'} · ${item.updated || ''}`;
  document.querySelector('#reader-summary').textContent = item.summary || '';
  document.querySelector('#reader-body').innerHTML = item.body || '<p>文章正文正在完善中。</p>';
  document.querySelector('#article-reader').classList.add('open');
  document.querySelector('#article-reader').setAttribute('aria-hidden', 'false');
}

document.querySelector('#column-article-list').addEventListener('click', event => {
  const card = event.target.closest('[data-id]');
  if (!card) return;
  const item = articles.find(article => article.id === Number(card.dataset.id));
  if (!item) return;
  openReader(item);
});

document.querySelector('.reader-close').addEventListener('click', () => document.querySelector('#article-reader').classList.remove('open'));
document.querySelector('#article-reader').addEventListener('click', event => { if (event.target.id === 'article-reader') event.currentTarget.classList.remove('open'); });

loadData().then(() => {
  if (targetArticleId) {
    const target = articles.find(article => String(article.id) === targetArticleId);
    if (target) {
      if (activeColumn !== '全部' && target.category !== activeColumn) {
        activeColumn = target.category;
        history.replaceState(null, '', `?name=${encodeURIComponent(activeColumn)}&article=${targetArticleId}`);
        render();
      }
      openReader(target);
    }
  }
});
