// 知愈医学后台管理 - 服务端 API 版
const API_BASE = '';
let authToken = sessionStorage.getItem('zhiyu_admin_token') || '';
let data = { articles: [], videos: [], categories: [] };
let materials = [];

const loginScreen = document.querySelector('#login-screen');
const adminApp = document.querySelector('#admin-app');
const modal = document.querySelector('#editor-modal');
const editor = document.querySelector('#editor-form');

// ========== API 请求封装 ==========
async function apiFetch(url, options = {}) {
  if (authToken) options.headers = { ...options.headers, 'Authorization': `Bearer ${authToken}` };
  if (options.body && typeof options.body === 'object') {
    options.headers = { ...options.headers, 'Content-Type': 'application/json' };
    options.body = JSON.stringify(options.body);
  }
  const response = await fetch(`${API_BASE}${url}`, options);
  if (response.status === 401) { sessionStorage.removeItem('zhiyu_admin_token'); authToken = ''; location.reload(); return null; }
  return response.json();
}

// ========== 数据操作 ==========
async function loadData() {
  const result = await apiFetch('/api/admin/content');
  if (result) { data = result; renderAll(); }
}
async function saveArticle(item, isCreate) {
  const method = isCreate ? 'POST' : 'PUT';
  const url = isCreate ? '/api/admin/articles' : `/api/admin/articles/${item.id}`;
  const result = await apiFetch(url, { method, body: item });
  if (result?.success) { await loadData(); return true; }
  toast('保存失败'); return false;
}
async function saveVideo(item, isCreate) {
  const method = isCreate ? 'POST' : 'PUT';
  const url = isCreate ? '/api/admin/videos' : `/api/admin/videos/${item.id}`;
  const result = await apiFetch(url, { method, body: item });
  if (result?.success) { await loadData(); return true; }
  toast('保存失败'); return false;
}
async function deleteItem(type, id) {
  const result = await apiFetch(`/api/admin/${type}s/${id}`, { method: 'DELETE' });
  if (result?.success) { await loadData(); toast('内容已删除'); }
}
async function addCategory(name) {
  const result = await apiFetch('/api/admin/categories', { method: 'POST', body: { name } });
  if (result?.success) { await loadData(); toast('专栏已创建'); }
  else if (result?.error) toast(result.error);
}
async function deleteCategory(name) {
  const result = await apiFetch(`/api/admin/categories/${encodeURIComponent(name)}`, { method: 'DELETE' });
  if (result?.success) { await loadData(); toast('专栏已删除'); }
  else if (result?.error) toast(result.error);
}

function toast(message) {
  const element = document.querySelector('#admin-toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2200);
}
function formatStatus(status) { return `<span class="status ${status}">${status === 'published' ? '已发布' : '草稿'}</span>`; }

// ========== 登录 ==========
document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const username = document.querySelector('#username').value;
  const password = document.querySelector('#password').value;
  const result = await apiFetch('/api/login', { method: 'POST', body: { username, password } });
  if (result?.success) {
    authToken = result.token;
    sessionStorage.setItem('zhiyu_admin_token', authToken);
    loginScreen.hidden = true;
    adminApp.hidden = false;
    await loadData();
  } else {
    toast(result?.error || '登录失败');
  }
});
if (authToken) { loginScreen.hidden = true; adminApp.hidden = false; loadData(); }
document.querySelector('#logout').addEventListener('click', () => { sessionStorage.removeItem('zhiyu_admin_token'); authToken = ''; location.reload(); });

// ========== 视图切换 ==========
const viewMeta = { dashboard: ['数据概览','查看网站内容与运营情况'], articles: ['文章管理','新增、编辑和发布医疗科普文章'], videos: ['视频管理','管理视频地址与介绍'], materials: ['资料中心','上传和整理图片与文档'], categories: ['分类管理','维护网站内容分类'] };
function showView(name) {
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === `${name}-view`));
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  document.querySelector('#page-title').textContent = viewMeta[name][0];
  document.querySelector('#page-subtitle').textContent = viewMeta[name][1];
  document.querySelector('.sidebar').classList.remove('open');
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-view-jump]').forEach(button => button.addEventListener('click', () => showView(button.dataset.viewJump)));
document.querySelector('.menu-toggle').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

// ========== 渲染 ==========
function renderDashboard() {
  document.querySelector('#article-count').textContent = data.articles.length;
  document.querySelector('#video-count').textContent = data.videos.length;
  document.querySelector('#material-count').textContent = materials.length;
  document.querySelector('#published-count').textContent = [...data.articles,...data.videos].filter(item => item.status === 'published').length;
  const recent = [...data.articles.map(item => ({...item,type:'文章'})),...data.videos.map(item => ({...item,type:'视频'}))].sort((a,b) => b.updated.localeCompare(a.updated)).slice(0,5);
  document.querySelector('#recent-list').innerHTML = recent.map(item => `<div class="recent-item"><span class="recent-icon">${item.type === '文章' ? '▤' : '▶'}</span><div class="recent-info"><b>${item.title}</b><small>${item.type} · ${item.updated}</small></div>${formatStatus(item.status)}</div>`).join('') || '<p class="muted">暂无内容</p>';
}
function renderArticles() {
  const keyword = document.querySelector('#article-search').value.trim().toLowerCase();
  const category = document.querySelector('#article-filter').value;
  const items = data.articles.filter(item => (category === 'all' || item.category === category) && `${item.title}${item.author}`.toLowerCase().includes(keyword));
  document.querySelector('#article-table').innerHTML = items.map(item => `<tr><td class="title-cell"><b>${item.title}</b><small>${item.summary || '暂无摘要'}</small></td><td>${item.category}</td><td>${item.author || '-'}</td><td>${formatStatus(item.status)}</td><td>${item.updated}</td><td><div class="actions"><button data-edit="article" data-id="${item.id}">编辑</button><button class="delete" data-delete="article" data-id="${item.id}">删除</button></div></td></tr>`).join('') || '<tr><td colspan="6">暂无匹配内容</td></tr>';
}
function renderVideos() {
  const keyword = document.querySelector('#video-search').value.trim().toLowerCase();
  document.querySelector('#video-grid').innerHTML = data.videos.filter(item => item.title.toLowerCase().includes(keyword)).map(item => `<article class="panel video-card"><div class="video-cover">▶</div><div class="video-content"><span class="status ${item.status}">${item.category}</span><h3>${item.title}</h3><p>${item.summary || '暂无简介'}</p><div class="video-foot">${formatStatus(item.status)}<div class="actions"><button data-edit="video" data-id="${item.id}">编辑</button><button class="delete" data-delete="video" data-id="${item.id}">删除</button></div></div></div></article>`).join('') || '<p>暂无视频</p>';
}
function renderMaterials() {
  document.querySelector('#material-grid').innerHTML = materials.map(item => `<article class="material"><button data-material-delete="${item.id}">×</button><div class="material-icon">${item.type.startsWith('image') ? '▧' : '▤' }</div><b title="${item.name}">${item.name}</b><small>${item.size}</small></article>`).join('') || '<p class="muted">尚未上传资料</p>';
}
function renderCategories() {
  document.querySelector('#category-list').innerHTML = data.categories.map((name, index) => `<div class="category-row"><span class="category-dot"></span><b>${name}</b><small>${data.articles.filter(item => item.category === name).length + data.videos.filter(item => item.category === name).length} 项内容</small><button data-category-delete="${name}">删除</button></div>`).join('');
  document.querySelector('#content-category').innerHTML = data.categories.map(name => `<option>${name}</option>`).join('');
  const filter = document.querySelector('#article-filter');
  const selected = filter.value;
  filter.innerHTML = '<option value="all">全部专栏</option>' + data.categories.map(name => `<option value="${name}">${name}</option>`).join('');
  filter.value = data.categories.includes(selected) ? selected : 'all';
  document.querySelector('#article-column-list').innerHTML = data.categories.map((name) => { const count = data.articles.filter(item => item.category === name).length; return `<div class="column-chip ${filter.value === name ? 'active' : ''}"><button class="column-filter-button" data-column-filter="${name}" title="在后台查看${name}专栏全部文章"><span>${name}</span><em>${count}篇</em></button><button title="删除专栏" data-category-delete="${name}">×</button></div>`; }).join('') || '<span class="muted">还没有专栏，请先新建专栏</span>';
}
function renderAll() { renderDashboard(); renderArticles(); renderVideos(); renderMaterials(); renderCategories(); }

// ========== 编辑器 ==========
function openEditor(type, id) {
  const item = id ? data[`${type}s`].find(entry => entry.id === Number(id)) : null;
  editor.reset();
  editor.classList.toggle('video-mode', type === 'video');
  document.querySelector('#content-type').value = type;
  document.querySelector('#content-id').value = item?.id || '';
  document.querySelector('#editor-title').textContent = `${item ? '编辑' : '新建'}${type === 'article' ? '文章' : '视频'}`;
  document.querySelector('#content-title').value = item?.title || '';
  document.querySelector('#content-category').value = item?.category || data.categories[0];
  document.querySelector('#content-author').value = item?.author || '';
  document.querySelector('#content-summary').value = item?.summary || '';
  document.querySelector('#content-body').innerHTML = item?.body || '';
  document.querySelector('#video-url').value = item?.url || '';
  document.querySelector('#content-status').value = item?.status || 'published';
  updateImageCount();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}
document.querySelectorAll('[data-create]').forEach(button => button.addEventListener('click', () => button.dataset.create === 'material' ? (showView('materials'), document.querySelector('#material-file').click()) : openEditor(button.dataset.create)));
document.querySelectorAll('.close-modal').forEach(button => button.addEventListener('click', () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }));

editor.addEventListener('submit', async event => {
  event.preventDefault();
  const type = document.querySelector('#content-type').value;
  const id = Number(document.querySelector('#content-id').value);
  const isCreate = !id;
  const item = {
    id: id || Date.now(),
    title: document.querySelector('#content-title').value.trim(),
    category: document.querySelector('#content-category').value,
    author: document.querySelector('#content-author').value.trim(),
    summary: document.querySelector('#content-summary').value.trim(),
    body: document.querySelector('#content-body').innerHTML,
    url: document.querySelector('#video-url').value,
    status: document.querySelector('#content-status').value,
    updated: new Date().toISOString().slice(0, 10)
  };
  const success = type === 'article' ? await saveArticle(item, isCreate) : await saveVideo(item, isCreate);
  if (success) { modal.classList.remove('open'); toast('内容已保存'); }
});

// ========== 删除与分类操作 ==========
document.addEventListener('click', async event => {
  const edit = event.target.closest('[data-edit]');
  const remove = event.target.closest('[data-delete]');
  const columnFilter = event.target.closest('[data-column-filter]');

  if (columnFilter) {
    document.querySelector('#article-filter').value = columnFilter.dataset.columnFilter;
    renderArticles(); renderCategories();
    document.querySelector('.table-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast(`正在显示"${columnFilter.dataset.columnFilter}"专栏文章`);
  }
  if (edit) openEditor(edit.dataset.edit, edit.dataset.id);

  if (remove && confirm('确定删除这项内容吗？')) {
    await deleteItem(remove.dataset.delete, remove.dataset.id);
  }

  if (event.target.dataset.materialDelete) {
    materials = materials.filter(item => item.id !== Number(event.target.dataset.materialDelete));
    renderMaterials();
  }
  if (event.target.dataset.categoryDelete) {
    const name = event.target.dataset.categoryDelete;
    await deleteCategory(name);
  }
});

document.querySelector('#article-search').addEventListener('input', renderArticles);
document.querySelector('#article-filter').addEventListener('change', () => { renderArticles(); renderCategories(); });
document.querySelector('#video-search').addEventListener('input', renderVideos);

// ========== 图片上传 ==========
const bodyEditor = document.querySelector('#content-body');
const bodyImageInput = document.querySelector('#body-image-file');
function updateImageCount() { document.querySelector('#image-count').textContent = `${bodyEditor.querySelectorAll('img').length}/3 张`; }
document.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => { bodyEditor.focus(); document.execCommand(button.dataset.format, false); }));

document.querySelector('#insert-image').addEventListener('click', () => {
  if (bodyEditor.querySelectorAll('img').length >= 3) { toast('每篇文章最多插入 3 张正文图片'); return; }
  bodyImageInput.click();
});

bodyImageInput.addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const allowed = ['image/jpeg','image/png','image/webp'];
  if (!allowed.includes(file.type)) { toast('仅支持 JPG、PNG、WebP 图片'); return; }
  if (file.size > 1.5 * 1024 * 1024) { toast('图片超过 1.5MB，请压缩后重新上传'); return; }
  if (bodyEditor.querySelectorAll('img').length >= 3) { toast('每篇文章最多插入 3 张正文图片'); return; }

  // 上传到服务器
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }, body: formData });
    const result = await response.json();
    if (result.success) {
      const image = new Image();
      image.src = result.url;
      image.alt = file.name;
      image.title = '双击可删除图片';
      image.addEventListener('dblclick', () => { if (confirm('删除这张正文图片吗？')) { image.remove(); updateImageCount(); } });
      bodyEditor.focus();
      bodyEditor.appendChild(image);
      bodyEditor.appendChild(document.createElement('p'));
      updateImageCount();
      toast('图片已上传并插入正文');
    } else {
      toast(result.error || '上传失败');
    }
  } catch {
    toast('图片上传失败');
  }
});

bodyEditor.addEventListener('dblclick', event => { if (event.target.tagName === 'IMG' && confirm('删除这张正文图片吗？')) { event.target.remove(); updateImageCount(); } });

// ========== 资料上传 ==========
document.querySelector('#material-file').addEventListener('change', async event => {
  for (const file of [...event.target.files]) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }, body: formData });
      const result = await response.json();
      if (result.success) {
        materials.unshift({ id: Date.now() + Math.random(), name: result.name, type: file.type, size: `${(file.size / 1024).toFixed(1)} KB`, url: result.url });
      }
    } catch { /* skip failed */ }
  }
  renderMaterials();
  toast('资料已添加');
  event.target.value = '';
});

document.querySelector('#add-category').addEventListener('click', async () => {
  const name = prompt('请输入新专栏名称');
  if (name) await addCategory(name.trim());
});
document.querySelector('#new-column').addEventListener('click', () => document.querySelector('#add-category').click());

// 初始加载
if (authToken) loadData();
