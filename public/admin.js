// 知愈医学后台管理 - 服务端 API 版
const API_BASE = '';
let authToken = sessionStorage.getItem('zhiyu_admin_token') || '';
let data = { articles: [], videos: [], categories: [] };
let materials = [];

const loginScreen = document.querySelector('#login-screen');
const adminApp = document.querySelector('#admin-app');
const modal = document.querySelector('#editor-modal');
const editor = document.querySelector('#editor-form');
const importModal = document.querySelector('#import-135-modal');
const importTextarea = document.querySelector('#import-135-html');

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
  document.querySelector('#video-file').value = '';
  renderVideoPreview(item?.url || '');
  document.querySelector('#content-status').value = item?.status || 'published';
  updateImageCount();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function renderVideoPreview(url) {
  const preview = document.querySelector('#video-preview');
  if (!url) { preview.innerHTML = ''; return; }
  const isLocalUpload = url.startsWith('/uploads/');
  preview.innerHTML = `
    <div class="preview-row">
      ${isLocalUpload ? `<video src="${url}" controls preload="metadata" class="video-thumb"></video>` : ''}
      <div class="preview-info">
        <b>当前视频</b>
        <span>${url}</span>
        <small>重新选择文件可替换当前视频</small>
      </div>
    </div>`;
}

async function uploadVideoFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload-video', { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }, body: formData });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || '视频上传失败');
  }
  return response.json();
}
document.querySelectorAll('[data-create]').forEach(button => button.addEventListener('click', () => button.dataset.create === 'material' ? (showView('materials'), document.querySelector('#material-file').click()) : openEditor(button.dataset.create)));
document.querySelectorAll('.close-modal').forEach(button => button.addEventListener('click', () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }));

editor.addEventListener('submit', async event => {
  event.preventDefault();
  const type = document.querySelector('#content-type').value;
  const id = Number(document.querySelector('#content-id').value);
  const isCreate = !id;

  let videoUrl = document.querySelector('#video-url').value;
  const videoFile = document.querySelector('#video-file').files[0];

  // 视频类型：如果有新文件，先上传
  if (type === 'video' && videoFile) {
    try {
      toast('正在上传视频，请稍候…');
      const result = await uploadVideoFile(videoFile);
      videoUrl = result.url;
      renderVideoPreview(videoUrl);
    } catch (err) {
      toast(err.message || '视频上传失败');
      return;
    }
  }

  const item = {
    id: id || Date.now(),
    title: document.querySelector('#content-title').value.trim(),
    category: document.querySelector('#content-category').value,
    author: document.querySelector('#content-author').value.trim(),
    summary: document.querySelector('#content-summary').value.trim(),
    body: document.querySelector('#content-body').innerHTML,
    url: videoUrl,
    status: document.querySelector('#content-status').value,
    updated: new Date().toISOString().slice(0, 10)
  };

  // 视频保存前校验
  if (type === 'video' && !item.url) { toast('请上传视频文件'); return; }

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

// ========== 135 编辑器 HTML 导入 ==========
function filter135Style(style) {
  const allowed = ['color', 'background', 'background-color', 'font-size', 'font-weight', 'text-align', 'line-height', 'padding', 'margin', 'border', 'border-radius', 'width', 'max-width', 'height', 'text-decoration', 'font-family', 'display', 'flex', 'justify-content', 'align-items'];
  const safe = [];
  for (const decl of (style || '').split(';')) {
    const [prop, ...rest] = decl.split(':');
    if (!prop || rest.length === 0) continue;
    const key = prop.trim().toLowerCase();
    if (allowed.includes(key)) safe.push(decl.trim());
  }
  return safe.join('; ');
}

function sanitize135HTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 移除危险标签
  doc.querySelectorAll('script, style, iframe, object, embed, form, input, button, textarea, select, link, meta, noscript').forEach(el => el.remove());

  const allowedTags = ['P', 'SPAN', 'DIV', 'SECTION', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'BR', 'IMG', 'TABLE', 'TR', 'TD', 'TH', 'TBODY', 'THEAD', 'BLOCKQUOTE', 'PRE', 'CODE'];

  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);

  for (const el of nodes) {
    if (!allowedTags.includes(el.tagName)) {
      const span = doc.createElement('span');
      while (el.firstChild) span.appendChild(el.firstChild);
      el.parentNode.replaceChild(span, el);
      continue;
    }

    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'class' || name === 'id') {
        el.removeAttribute(attr.name);
      } else if (name === 'style') {
        const safe = filter135Style(attr.value);
        if (safe) el.setAttribute('style', safe); else el.removeAttribute('style');
      } else if (name === 'href') {
        if (!/^https?:\/\/|^mailto:/i.test(attr.value)) el.removeAttribute('href');
      } else if (name === 'src') {
        if (!/^https?:\/\/|^data:|^\//i.test(attr.value)) el.removeAttribute('src');
      } else {
        el.removeAttribute(attr.name);
      }
    }
  }

  // 清理空白节点
  return doc.body.innerHTML.replace(/(<p><br><\/p>\s*)+/g, '<p><br></p>').replace(/\n\s+/g, '\n');
}

function setImportStatus(message, isError = false) {
  const status = document.querySelector('#import-135-status');
  status.textContent = message || '';
  status.classList.toggle('error', isError);
}

function openImport135() {
  importTextarea.value = '';
  setImportStatus('');
  importModal.classList.add('open');
  importModal.setAttribute('aria-hidden', 'false');
  // 延迟聚焦，确保弹窗已显示且不会与点击事件冲突
  setTimeout(() => { importTextarea.focus(); importTextarea.select(); }, 50);
}

function closeImport135() {
  importModal.classList.remove('open');
  importModal.setAttribute('aria-hidden', 'true');
  setImportStatus('');
}

// 将任意文本尝试整理成可用的 HTML（ plain text fallback ）
function textToHTML(text) {
  if (!text) return '';
  // 如果已经像 HTML，直接返回
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  // 普通文本：按行分段
  const paragraphs = text.split(/\n{2,}/).map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`);
  return paragraphs.join('');
}

// 处理粘贴：优先 text/plain，其次 text/html，兜底 text
function handleImportPaste(event) {
  const clipboard = event.clipboardData || window.clipboardData;
  if (!clipboard) return;

  let pasted = '';
  // 135 编辑器「复制HTML」通常放在 text/plain；「全文粘贴」可能放在 text/html
  const plain = clipboard.getData('text/plain');
  const html = clipboard.getData('text/html');

  if (plain && plain.trim().length > 0) {
    pasted = plain;
  } else if (html && html.trim().length > 0) {
    pasted = html;
  } else {
    pasted = clipboard.getData('Text') || '';
  }

  if (!pasted.trim()) {
    setImportStatus('未检测到剪贴板内容，请使用「读取剪贴板」按钮重试', true);
    return;
  }

  // 直接追加到 textarea（不阻止默认行为，让用户也能正常粘贴）
  setImportStatus(`已粘贴 ${pasted.length} 字符，点击「导入正文」即可排版`);
}

async function readClipboard135() {
  setImportStatus('正在读取剪贴板…');
  try {
    let text = '';
    if (navigator.clipboard && navigator.clipboard.readText) {
      text = await navigator.clipboard.readText();
    }
    if (!text && navigator.clipboard && navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          text = await blob.text();
          break;
        }
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          text = await blob.text();
          break;
        }
      }
    }
    if (!text) {
      setImportStatus('剪贴板为空或未获得权限，请先在135编辑器中点击复制，并允许浏览器读取剪贴板', true);
      return;
    }
    importTextarea.value = text;
    setImportStatus(`已读取 ${text.length} 字符，点击「导入正文」即可排版`);
  } catch (err) {
    console.error(err);
    setImportStatus('读取剪贴板失败：' + (err.message || '请手动按 Ctrl+V 粘贴'), true);
  }
}

document.querySelector('#import-135').addEventListener('click', openImport135);
document.querySelectorAll('#import-135-modal .close-import').forEach(btn => btn.addEventListener('click', closeImport135));
document.querySelector('#read-clipboard-135').addEventListener('click', readClipboard135);
importTextarea.addEventListener('paste', handleImportPaste);

// 支持拖拽 HTML 文件到导入框
importTextarea.addEventListener('drop', async event => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file && file.type.includes('html')) {
    const text = await file.text();
    importTextarea.value = text;
    setImportStatus(`已加载文件 ${file.name}，点击「导入正文」即可排版`);
  }
});

document.querySelector('#confirm-import-135').addEventListener('click', () => {
  let raw = importTextarea.value.trim();
  if (!raw) { toast('请粘贴 135 编辑器 HTML 代码'); return; }
  try {
    raw = textToHTML(raw);
    const clean = sanitize135HTML(raw);
    if (!clean || clean === '<p><br></p>') { toast('没有可导入的内容'); return; }
    bodyEditor.innerHTML += clean;
    updateImageCount();
    closeImport135();
    toast('135 编辑器内容已导入');
  } catch (e) {
    console.error(e);
    toast('导入失败，请检查 HTML 代码');
  }
});

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
