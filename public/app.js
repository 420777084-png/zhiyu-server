// 知愈医学首页 - 服务端 API 版
const filterButtons = document.querySelectorAll('.filter-tabs button');
const cards = document.querySelectorAll('.content-card');
const searchPanel = document.querySelector('.search-panel');
const videoModal = document.querySelector('.video-modal');
const toast = document.querySelector('.toast');
let currentVideos = [];

// 从服务端 API 加载已发布内容
async function loadManagedContent() {
  try {
    const response = await fetch('/api/content');
    if (!response.ok) return;
    const content = await response.json();
    const articles = content.articles.slice(0, 3);
    const videos = content.videos.slice(0, 3);
    if (articles.length) {
      const articleGrid = document.querySelector('.article-grid');
      articleGrid.innerHTML = articles.map((item, index) => `<article class="article-row" data-id="${item.id}" data-category="${item.category}"><div class="article-thumb ${['aurora','robot','plant'][index % 3]}"></div><div><span class="tag ${['cyan','orange','green'][index % 3]}">${item.category}</span><h3>${item.title}</h3><p>${item.summary || '查看专业医生审核的健康科普内容。'}</p><div class="meta"><span>${item.author || '知愈医学'}</span><span>·</span><span>健康科普</span></div></div></article>`).join('');
      articleGrid.querySelectorAll('.article-row').forEach(row => row.addEventListener('click', () => {
        window.location.href = `column.html?name=${encodeURIComponent(row.dataset.category)}&article=${row.dataset.id}`;
      }));
    }
    if (videos.length) {
      currentVideos = videos;
      const videoGrid = document.querySelector('.video-grid');
      videoGrid.innerHTML = videos.map((item, index) => `<button class="video-card" data-id="${item.id}"><div class="video-art ${['water-video','brain-video','mars-video'][index % 3]}"><span class="video-play">▶</span><span class="duration">科普视频</span></div><span class="tag ${['cyan','purple','orange'][index % 3]}">${item.category}</span><h3>${item.title}</h3><p>${item.summary || '观看医学健康科普视频。'}</p></button>`).join('');
      // 重新绑定视频点击事件
      document.querySelectorAll('.video-card').forEach(card => card.addEventListener('click', () => openVideo(Number(card.dataset.id))));
    }
  } catch (error) {
    console.warn('内容加载失败', error);
  }
}

loadManagedContent();

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function filterContent(category) {
  filterButtons.forEach(button => button.classList.toggle('active', button.dataset.filter === category));
  cards.forEach(card => card.classList.toggle('hidden', category !== 'all' && card.dataset.category !== category));
  document.querySelector('#featured').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

filterButtons.forEach(button => button.addEventListener('click', () => filterContent(button.dataset.filter)));
document.querySelectorAll('[data-topic]').forEach(button => button.addEventListener('click', () => {
  window.location.href = `column.html?name=${encodeURIComponent(button.dataset.topic)}`;
}));

document.querySelector('.search-toggle').addEventListener('click', () => {
  searchPanel.classList.add('open');
  searchPanel.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => searchPanel.querySelector('input').focus(), 150);
});

function closeSearch() {
  searchPanel.classList.remove('open');
  searchPanel.setAttribute('aria-hidden', 'true');
}

document.querySelector('.search-close').addEventListener('click', closeSearch);
searchPanel.addEventListener('click', event => { if (event.target === searchPanel) closeSearch(); });
searchPanel.querySelector('input').addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.currentTarget.value.trim()) {
    closeSearch();
    showToast(`正在搜索「${event.currentTarget.value.trim()}」`);
  }
});

function openVideo(id) {
  const item = currentVideos.find(v => v.id === id);
  const title = item ? item.title : '视频';
  const url = item ? item.url : '';
  videoModal.querySelector('h3').textContent = title;
  document.querySelector('#modal-desc').textContent = item?.summary || '医学健康科普视频';
  const video = document.querySelector('#modal-video');
  video.src = url || '';
  videoModal.classList.add('open');
  videoModal.setAttribute('aria-hidden', 'false');
  if (url) video.play().catch(() => {});
}

function closeVideo() {
  const video = document.querySelector('#modal-video');
  video.pause();
  video.src = '';
  videoModal.classList.remove('open');
  videoModal.setAttribute('aria-hidden', 'true');
}

document.querySelector('.play-intro').addEventListener('click', () => openVideo(0));
document.querySelector('.modal-close').addEventListener('click', closeVideo);
videoModal.addEventListener('click', event => { if (event.target === videoModal) closeVideo(); });

document.querySelector('#newsletter-form').addEventListener('submit', event => {
  event.preventDefault();
  showToast('订阅成功，下一封健康周刊见！');
  event.currentTarget.reset();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeSearch();
    closeVideo();
  }
});
