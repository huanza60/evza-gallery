import { supabase, isConfigured, resolveUrl, resolvePoster, extractDriveId, storageUrl } from './supabase.js';
import { signIn, signOut, getSession, getUser, onAuthChange } from './auth.js';

const cfg = window.EVZA;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const state = { catalogs: [], media: [], lightboxIndex: 0, slideshow: null, currentCatalog: null };

document.addEventListener('DOMContentLoaded', init);

function init() {
  initCursor();
  initDarkMode();
  initHeader();
  initQuickSearch();
  registerServiceWorker();
  if (!isConfigured) toast('Configure o Supabase em config.js para activar dados reais.');
  const page = document.body.dataset.page;
  if (page === 'home') loadHome();
  if (page === 'catalog') loadCatalogPage();
  if (page === 'search') initSearchPage();
  if (page === 'photo') initPhotoPage();
  if (page === 'admin') initAdmin();
  if (page === 'offline') initOffline();
}

function initCursor() {
  const cur = document.createElement('div');
  cur.className = 'cursor';
  document.body.appendChild(cur);
  window.addEventListener('mousemove', (e) => {
    cur.style.left = `${e.clientX}px`;
    cur.style.top = `${e.clientY}px`;
  });
  document.addEventListener('mouseover', (e) => cur.classList.toggle('hot', Boolean(e.target.closest('a,button,input,textarea,select,.card'))));
}

export function initDarkMode() {
  if (!cfg.enableDarkMode) return;
  const saved = localStorage.getItem('evza-theme');
  const theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  $$('[data-dark-toggle]').forEach((b) => b.textContent = theme === 'dark' ? '☀' : '☾');
  $$('[data-dark-toggle]').forEach((b) => b.addEventListener('click', toggleDarkMode));
}

export function toggleDarkMode() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('evza-theme', next);
  $$('[data-dark-toggle]').forEach((b) => b.textContent = next === 'dark' ? '☀' : '☾');
}

function initHeader() {
  const header = $('.site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const heroContent = $('.hero-content');
  if (heroContent) addEventListener('scroll', () => heroContent.style.transform = `translateY(${scrollY * .3}px)`, { passive: true });
}

function initQuickSearch() {
  $$('[data-search-go]').forEach((input) => input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) location.href = `search.html?q=${encodeURIComponent(input.value.trim())}`;
  }));
}

function fmtDate(date) {
  if (!date) return 'Data por confirmar';
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtNum(num = 0) {
  return Number(num || 0).toLocaleString('pt-MZ');
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function directDriveUrl(fileId) {
  return driveThumbUrl(fileId, 2000);
}

function driveThumbUrl(fileId, size = 1000) {
  return fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${size}` : '';
}

function drivePreviewUrl(fileId) {
  return fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview` : '';
}

function itemDriveId(item = {}) {
  return item.drive_file_id || extractDriveId(item.src_url || '') || extractDriveId(item.poster_url || '');
}

function normalisePublicUrl(url = '') {
  const value = String(url || '').trim();
  if (!value) return '';
  const driveId = extractDriveId(value);
  return driveId ? directDriveUrl(driveId) : value;
}

function catalogCover(cat = {}) {
  return normalisePublicUrl(cat.cover_url) || 'assets/placeholder.svg';
}

function itemPoster(item = {}) {
  const poster = resolvePoster(item);
  const driveId = itemDriveId(item);
  if (item.type === 'video' && driveId && (!poster || poster.includes('placeholder.svg') || poster.includes('uc?export=view'))) return driveThumbUrl(driveId, 2000);
  return poster;
}

function videoTileStyle(item = {}) {
  const poster = itemPoster(item);
  return poster && !poster.includes('placeholder.svg') ? ` style="background-image:url('${escapeHtml(poster)}')"` : '';
}

function toast(message) {
  let wrap = $('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

async function safeQuery(fn, fallback = []) {
  if (!supabase) return fallback;
  const { data, error } = await fn();
  if (error) {
    console.error(error);
    toast(error.message);
    return fallback;
  }
  return data || fallback;
}

export async function loadCatalogs(filter = {}) {
  const catalogs = await safeQuery(async () => {
    let q = supabase.from('catalogs').select('*, media_items(id,type)', { count: 'exact' }).order('sort_order').order('event_date', { ascending: false });
    if (filter.featured) q = q.eq('is_featured', true);
    return q;
  });
  return catalogs.map((cat) => {
    const items = cat.media_items || [];
    return {
      ...cat,
      photoCount: items.filter((i) => i.type === 'photo').length,
      videoCount: items.filter((i) => i.type === 'video').length
    };
  });
}

async function loadHome() {
  loadHeroStatuses();
  state.catalogs = await loadCatalogs();
  renderCatalogGrid(state.catalogs.filter((c) => c.is_featured), $('#featured-grid'), true);
  $('#featured-section')?.toggleAttribute('hidden', !state.catalogs.some((c) => c.is_featured));
  renderCatalogGrid(state.catalogs, $('#catalog-grid'));
  renderYearFilters(state.catalogs);
}

async function loadHeroStatuses() {
  const host = $('#hero-status');
  if (!host || !supabase) return;
  const items = await safeQuery(() => supabase.from('status_items').select('*').gt('expires_at', new Date().toISOString()).order('sort_order').order('created_at', { ascending: false }).limit(12), []);
  if (!items.length) {
    host.innerHTML = '';
    host.hidden = true;
    return;
  }
  host.hidden = false;
  host.innerHTML = `<div class="status-head"><span>Estados EVZA</span><small>${items.length} novo${items.length > 1 ? 's' : ''}</small></div><div class="status-strip">${items.map((item, i) => renderStatusPreview(item, i)).join('')}</div>`;
  host.addEventListener('click', (e) => {
    const item = e.target.closest('[data-status-index]');
    if (item) openStatusViewer(items, Number(item.dataset.statusIndex));
  });
}

function renderStatusPreview(item, index) {
  const src = resolveUrl(item);
  const poster = itemPoster(item);
  return `<button class="status-card" data-status-index="${index}" aria-label="${escapeHtml(item.caption || 'Estado EVZA')}">
    ${item.type === 'video' ? `<div class="status-media video-tile"${videoTileStyle(item)}><span class="play-mark">▶</span></div>` : `<img class="status-media" src="${escapeHtml(src)}" alt="" onerror="this.src='assets/placeholder.svg'">`}
    <span>${escapeHtml(item.caption || (item.type === 'video' ? 'Vídeo' : 'Foto'))}</span>
  </button>`;
}

function openStatusViewer(items, index = 0) {
  state.statusItems = items;
  state.statusIndex = index;
  let viewer = $('#status-viewer');
  if (!viewer) {
    viewer = document.createElement('div');
    viewer.id = 'status-viewer';
    viewer.className = 'status-viewer';
    viewer.innerHTML = `<button class="icon-btn status-close" data-status-close>×</button><button class="icon-btn status-nav status-prev" data-status-nav="-1">←</button><div id="status-body"></div><button class="icon-btn status-nav status-next" data-status-nav="1">→</button>`;
    document.body.appendChild(viewer);
    viewer.addEventListener('click', (e) => {
      if (e.target === viewer || e.target.closest('[data-status-close]')) viewer.classList.remove('open');
      const nav = e.target.closest('[data-status-nav]');
      if (nav) paintStatusViewer(Number(nav.dataset.statusNav));
      const like = e.target.closest('[data-status-like]');
      if (like) toggleStatusLike(like.dataset.statusLike);
      const toggleComments = e.target.closest('[data-status-comments-toggle]');
      if (toggleComments) $('#status-body')?.classList.toggle('comments-open');
      const reply = e.target.closest('[data-status-reply]');
      if (reply) showStatusReplyForm(reply.dataset.statusReply, reply.dataset.author);
      const commentLike = e.target.closest('[data-status-comment-like]');
      if (commentLike) toggleStatusCommentLike(commentLike.dataset.statusCommentLike);
    });
  }
  viewer.classList.add('open');
  paintStatusViewer(0);
}

async function paintStatusViewer(dir = 0) {
  if (dir) state.statusIndex = (state.statusIndex + dir + state.statusItems.length) % state.statusItems.length;
  const item = state.statusItems[state.statusIndex];
  const src = resolveUrl(item);
  const driveId = itemDriveId(item);
  const comments = await loadStatusComments(item.id);
  $('#status-body').innerHTML = `<div class="status-full">
    ${item.type === 'video'
      ? (driveId ? `<iframe src="${escapeHtml(drivePreviewUrl(driveId))}" allow="autoplay; fullscreen" allowfullscreen></iframe>` : `<video src="${escapeHtml(src)}" poster="${escapeHtml(itemPoster(item))}" controls autoplay></video>`)
      : `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.caption || 'Estado EVZA')}" onerror="this.src='assets/placeholder.svg'">`}
    <div class="status-caption">
      <p>${escapeHtml(item.caption || 'Estado EVZA')}</p>
    </div>
    <div class="status-actions">
      <button class="status-action-btn" data-status-like="${item.id}" aria-label="Gostar estado">${shareIcon('heart')} <span>${fmtNum(item.likes)}</span></button>
      <button class="status-action-btn" data-status-comments-toggle aria-label="Comentar estado">${shareIcon('comment')} <span>${comments.length}</span></button>
    </div>
  </div>
  <aside class="status-comments">
    <h3>Comentários</h3>
    <div id="status-comment-list">${renderStatusCommentTree(comments)}</div>
    <form class="status-comment-form form-grid" id="status-comment-form">
      <input class="field" name="author" placeholder="O seu nome" required>
      <textarea class="full" name="body" rows="3" maxlength="500" placeholder="Comentar estado" required></textarea>
      <button class="btn" type="submit">Enviar</button>
    </form>
  </div>`;
  $('#status-comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from('status_comments').insert({ status_id: item.id, author: f.get('author'), body: f.get('body'), is_admin: await isAdminSession(), approved: true });
    if (error) return toast(error.message.includes('status_comments') ? 'Execute update-status-interactions.sql no Supabase.' : error.message);
    toast('Comentário publicado.');
    paintStatusViewer(0);
  });
}

async function loadStatusComments(statusId) {
  return safeQuery(() => supabase.from('status_comments').select('*').eq('status_id', statusId).eq('approved', true).order('created_at', { ascending: true }), []);
}

function renderStatusCommentTree(comments = []) {
  if (!comments.length) return '<p class="meta">Ainda sem comentários.</p>';
  const parents = comments.filter((c) => !c.parent_id);
  const children = comments.filter((c) => c.parent_id);
  return parents.map((comment) => renderStatusComment(comment, children.filter((c) => c.parent_id === comment.id))).join('');
}

function renderStatusComment(comment, replies = []) {
  return `<div class="comment ${comment.is_admin ? 'official-comment' : ''}" id="status-comment-${comment.id}">
    <strong>${escapeHtml(comment.author)}</strong>${comment.is_admin ? '<span class="official-badge">Administrador EVZA</span>' : ''}
    <p>${escapeHtml(comment.body)}</p>
    <div class="comment-actions">
      <span class="meta">${new Date(comment.created_at).toLocaleDateString('pt-MZ')}</span>
      <button class="comment-action" data-status-comment-like="${comment.id}">Gostar · ${fmtNum(comment.likes)}</button>
      <button class="comment-action" data-status-reply="${comment.id}" data-author="${escapeHtml(comment.author)}">Responder</button>
    </div>
    <div class="reply-host" id="status-reply-host-${comment.id}"></div>
    ${replies.length ? `<div class="replies">${replies.map((reply) => renderStatusComment(reply, [])).join('')}</div>` : ''}
  </div>`;
}

function showStatusReplyForm(parentId, author = '') {
  const host = $(`#status-reply-host-${parentId}`);
  const item = state.statusItems[state.statusIndex];
  if (!host || !item) return;
  host.innerHTML = `<form class="reply-form form-grid">
    <input class="field" name="author" placeholder="O seu nome" required>
    <textarea class="full" name="body" maxlength="500" rows="3" placeholder="Responder a ${escapeHtml(author)}" required></textarea>
    <button class="btn" type="submit">Responder</button>
  </form>`;
  host.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from('status_comments').insert({ status_id: item.id, parent_id: parentId, author: f.get('author'), body: f.get('body'), is_admin: await isAdminSession(), approved: true });
    if (error) return toast(error.message.includes('parent_id') ? 'Execute update-status-interactions.sql no Supabase.' : error.message);
    toast('Resposta publicada.');
    paintStatusViewer(0);
  });
}

async function toggleStatusLike(statusId) {
  const existing = await safeQuery(() => supabase.from('status_likes').select('id').eq('status_id', statusId).eq('device_id', deviceId()).limit(1), []);
  if (existing.length) return toast('Já gostou deste estado neste dispositivo.');
  const { error } = await supabase.from('status_likes').insert({ status_id: statusId, device_id: deviceId() });
  if (error) return toast(error.message.includes('status_likes') ? 'Execute update-status-interactions.sql no Supabase.' : error.message);
  state.statusItems[state.statusIndex].likes = (state.statusItems[state.statusIndex].likes || 0) + 1;
  toast('Gostou deste estado.');
  paintStatusViewer(0);
}

async function toggleStatusCommentLike(commentId) {
  const existing = await safeQuery(() => supabase.from('status_comment_likes').select('id').eq('comment_id', commentId).eq('device_id', deviceId()).limit(1), []);
  if (existing.length) return toast('Já gostou deste comentário neste dispositivo.');
  const { error } = await supabase.from('status_comment_likes').insert({ comment_id: commentId, device_id: deviceId() });
  if (error) return toast(error.message.includes('status_comment_likes') ? 'Execute update-status-interactions.sql no Supabase.' : error.message);
  toast('Gostou do comentário.');
  paintStatusViewer(0);
}

function renderYearFilters(catalogs) {
  const host = $('#year-filters');
  if (!host) return;
  const years = [...new Set(catalogs.map((c) => c.event_date?.slice(0, 4)).filter(Boolean))].sort((a, b) => b - a);
  host.innerHTML = ['Todos', ...years].map((y, i) => `<button class="filter ${i === 0 ? 'active' : ''}" data-year="${y}">${y}</button>`).join('');
  host.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-year]');
    if (!btn) return;
    $$('.filter', host).forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    filterByYear(btn.dataset.year);
  });
}

export function filterByYear(year) {
  renderCatalogGrid(year === 'Todos' ? state.catalogs : state.catalogs.filter((c) => c.event_date?.startsWith(year)), $('#catalog-grid'));
}

export function renderCatalogGrid(catalogs, host = $('#catalog-grid'), featured = false) {
  if (!host) return;
  if (!catalogs.length) {
    host.innerHTML = `<div class="empty"><h3>Nenhum catálogo ainda</h3><p>O administrador ainda não adicionou catálogos.</p></div>`;
    return;
  }
  host.innerHTML = catalogs.map((cat, i) => `
    <a class="card catalog-card fade-up" style="--delay:${i * 70}ms" href="catalog.html?id=${cat.id}">
      <div class="media skeleton">
        <img src="${escapeHtml(catalogCover(cat))}" alt="${escapeHtml(cat.name)}" loading="lazy" onerror="this.src='assets/placeholder.svg'">
        <div class="overlay-bottom">
          ${featured || cat.is_featured ? '<span class="badge">★ Destaque</span>' : ''}
          <h3>${escapeHtml(cat.name)}</h3>
          <div class="meta">${fmtDate(cat.event_date)}</div>
          <div class="stat-row">
            <span class="badge">${fmtNum(cat.photoCount)} fotos · ${fmtNum(cat.videoCount)} vídeos</span>
            <span class="badge">👁 ${fmtNum(cat.views)}</span>
          </div>
        </div>
      </div>
    </a>`).join('');
}

export async function loadCatalog(id) {
  if (!id) return null;
  const [catalog] = await safeQuery(() => supabase.from('catalogs').select('*').eq('id', id).limit(1), []);
  const items = await safeQuery(() => supabase.from('media_items').select('*').eq('catalog_id', id).order('sort_order').order('created_at'), []);
  return catalog ? { catalog, items } : null;
}

async function loadCatalogPage() {
  const id = new URLSearchParams(location.search).get('id');
  const data = await loadCatalog(id);
  const host = $('#catalog-content');
  if (!data) {
    host.innerHTML = `<div class="empty"><h2>Catálogo não encontrado</h2><a class="btn" href="index.html">Voltar</a></div>`;
    return;
  }
  state.currentCatalog = data.catalog;
  state.media = data.items;
  document.title = `${data.catalog.name} — EVZA Gallery`;
  updateMeta(data.catalog.name, data.catalog.description || cfg.schoolName, catalogCover(data.catalog));
  trackView('catalog', id);
  host.innerHTML = catalogHeader(data.catalog, data.items);
  renderMasonry(data.items);
  initLightbox();
  initComments();
  initRealtime(id);
}

function catalogHeader(cat, items) {
  const photos = items.filter((i) => i.type === 'photo').length;
  const videos = items.length - photos;
  return `
    <section class="catalog-hero"><div class="wrap">
      <a href="index.html" class="btn ghost">← Voltar</a>
      <h1>${escapeHtml(cat.name)}</h1>
      <p>${escapeHtml(cat.description || 'Memórias vivas da nossa comunidade escolar.')}</p>
      <div class="stat-row"><span class="badge">${fmtDate(cat.event_date)}</span><span class="badge">${photos} fotos · ${videos} vídeos · ${fmtNum(cat.views)} visualizações</span><span class="badge">${fmtNum(cat.likes)} gostos</span></div>
      <div class="stat-row"><button class="btn" data-catalog-like="${cat.id}">Gostar Catálogo · ${fmtNum(cat.likes)}</button><button class="btn" data-share="catalog" data-id="${cat.id}">Partilhar Catálogo</button><button class="btn secondary" data-slideshow-start>Iniciar Slideshow</button></div>
    </div></section>
    <section class="section"><div class="wrap"><div id="masonry" class="masonry"></div><div class="comment-box" id="comments"></div></div></section>`;
}

export function renderMasonry(items) {
  const host = $('#masonry');
  if (!host) return;
  if (!items.length) {
    host.innerHTML = `<div class="empty"><h3>Sem media neste catálogo</h3><p>As fotos e vídeos aparecerão aqui.</p></div>`;
    return;
  }
  host.innerHTML = items.map((item, i) => {
    const src = resolveUrl(item);
    const media = item.type === 'video'
      ? `<div class="video-tile"${videoTileStyle(item)}><span class="play-mark">▶</span><span class="badge">Vídeo</span><span class="video-label">Pré-visualização do vídeo</span></div>`
      : `<img src="${escapeHtml(src || 'assets/placeholder.svg')}" alt="${escapeHtml(item.caption || 'Foto EVZA')}" loading="lazy" decoding="async" onerror="this.src='assets/placeholder.svg'">`;
    return `<article class="masonry-item" data-index="${i}" data-id="${item.id}">
      ${media}
      <div class="media-hover"><p>${escapeHtml(item.caption || 'Momento EVZA')}</p><button class="btn" data-like="${item.id}">Gostar · ${fmtNum(item.likes)}</button></div>
    </article>`;
  }).join('');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')), { threshold: .1 });
  $$('.masonry-item', host).forEach((el) => io.observe(el));
}

function initLightbox() {
  $('#masonry')?.addEventListener('click', (e) => {
    const like = e.target.closest('[data-like]');
    if (like) return toggleLike(like.dataset.like);
    const item = e.target.closest('.masonry-item');
    if (item) openLightbox(state.media, Number(item.dataset.index));
  });
  document.addEventListener('click', (e) => {
    const share = e.target.closest('[data-share]');
    if (share && share.dataset.share === 'catalog') openCatalogShareDialog();
    else if (share) shareItem(share.dataset.share, share.dataset.id);
    const catalogLike = e.target.closest('[data-catalog-like]');
    if (catalogLike) toggleCatalogLike(catalogLike.dataset.catalogLike);
    if (e.target.closest('[data-slideshow-start]')) startSlideshow();
  });
  document.addEventListener('keydown', handleKeyboard);
}

export function openLightbox(items, index = 0) {
  state.media = items;
  state.lightboxIndex = index;
  let lb = $('#lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `<div class="lightbox-top"><button class="icon-btn" data-close>×</button><div class="progress"><span></span></div></div><button class="icon-btn lightbox-nav prev" data-nav="-1">←</button><div id="lightbox-body"></div><button class="icon-btn lightbox-nav next" data-nav="1">→</button><div class="lightbox-bottom"><span id="lightbox-count"></span><span id="lightbox-caption"></span><button class="btn" data-lb-like>Gostar</button><button class="btn ghost" data-lb-share>Partilhar</button><a class="btn secondary" id="lightbox-download" download>Descarregar</a></div>`;
    document.body.appendChild(lb);
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.closest('[data-close]')) closeLightbox();
      const nav = e.target.closest('[data-nav]');
      if (nav) navigateLightbox(Number(nav.dataset.nav));
      if (e.target.closest('[data-lb-share]')) shareItem('photo', state.media[state.lightboxIndex].id);
      if (e.target.closest('[data-lb-like]')) toggleLike(state.media[state.lightboxIndex].id);
    });
    let startX = 0;
    lb.addEventListener('touchstart', (e) => startX = e.changedTouches[0].screenX, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].screenX - startX;
      if (Math.abs(dx) > 50) navigateLightbox(dx < 0 ? 1 : -1);
    }, { passive: true });
  }
  lb.classList.add('open');
  paintLightbox();
}

function paintLightbox() {
  const item = state.media[state.lightboxIndex];
  if (!item) return;
  const src = resolveUrl(item);
  const driveId = itemDriveId(item);
  $('#lightbox-body').innerHTML = item.type === 'video'
    ? (driveId
      ? `<iframe class="lightbox-media lightbox-frame" src="${escapeHtml(drivePreviewUrl(driveId))}" allow="autoplay; fullscreen" allowfullscreen title="${escapeHtml(item.caption || 'Vídeo EVZA')}"></iframe>`
      : `<video class="lightbox-media" src="${escapeHtml(src)}" poster="${escapeHtml(itemPoster(item))}" controls autoplay></video>`)
    : `<img class="lightbox-media" src="${escapeHtml(src)}" alt="${escapeHtml(item.caption || 'Foto EVZA')}">`;
  $('#lightbox-count').textContent = `${state.lightboxIndex + 1} / ${state.media.length}`;
  $('#lightbox-caption').textContent = item.caption || 'Momento EVZA';
  $('#lightbox-download').href = src;
  trackView('media', item.id);
}

export function navigateLightbox(dir) {
  state.lightboxIndex = (state.lightboxIndex + dir + state.media.length) % state.media.length;
  paintLightbox();
}
export function closeLightbox() { $('#lightbox')?.classList.remove('open'); stopSlideshow(); }
export function startSlideshow() {
  if (!state.media.length) return;
  openLightbox(state.media, state.lightboxIndex || 0);
  $('.progress')?.classList.add('playing');
  $('.progress')?.style.setProperty('--slide-ms', `${cfg.slideshowDelay}ms`);
  clearInterval(state.slideshow);
  state.slideshow = setInterval(() => navigateLightbox(1), cfg.slideshowDelay);
}
export function stopSlideshow() { clearInterval(state.slideshow); $('.progress')?.classList.remove('playing'); }
export function handleKeyboard(e) {
  if (!$('#lightbox')?.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') navigateLightbox(1);
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === ' ') { e.preventDefault(); state.slideshow ? stopSlideshow() : startSlideshow(); }
  if (e.key.toLowerCase() === 'f') $('.lightbox-media')?.requestFullscreen?.();
}

function deviceId() {
  let id = localStorage.getItem('evza-device-id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('evza-device-id', id); }
  return id;
}

export async function hasLiked(mediaId) {
  if (!supabase) return false;
  const data = await safeQuery(() => supabase.from('likes').select('id').eq('media_id', mediaId).eq('device_id', deviceId()).limit(1), []);
  return data.length > 0;
}

export async function toggleLike(mediaId) {
  if (!cfg.enableLikes || !supabase) return toast('Likes disponíveis depois de configurar o Supabase.');
  if (await hasLiked(mediaId)) return toast('Já gostou desta foto neste dispositivo.');
  const { error } = await supabase.from('likes').insert({ media_id: mediaId, device_id: deviceId() });
  if (error) return toast(error.message);
  toast('Gostou deste momento!');
}

export async function hasCatalogLiked(catalogId) {
  if (!supabase) return false;
  const data = await safeQuery(() => supabase.from('catalog_likes').select('id').eq('catalog_id', catalogId).eq('device_id', deviceId()).limit(1), []);
  return data.length > 0;
}

export async function toggleCatalogLike(catalogId) {
  if (!supabase) return toast('Likes disponíveis depois de configurar o Supabase.');
  if (await hasCatalogLiked(catalogId)) return toast('Já gostou deste catálogo neste dispositivo.');
  const { error } = await supabase.from('catalog_likes').insert({ catalog_id: catalogId, device_id: deviceId() });
  if (error) return toast(error.message.includes('Could not find') ? 'Execute update-comments-likes.sql no Supabase para activar likes.' : error.message);
  toast('Gostou deste catálogo!');
  const data = await loadCatalog(catalogId);
  if (data) {
    state.currentCatalog = data.catalog;
    state.media = data.items;
    $('#catalog-content').innerHTML = catalogHeader(data.catalog, data.items);
    renderMasonry(data.items);
    initComments();
  }
}

export function getShareUrl(type, id) {
  const page = type === 'photo' ? 'photo.html' : 'catalog.html';
  return `${cfg.siteUrl}/${page}?id=${encodeURIComponent(id)}`;
}

export async function shareItem(type, id) {
  const url = getShareUrl(type, id);
  const title = type === 'photo' ? 'Foto da EVZA Gallery' : 'Catálogo da EVZA Gallery';
  if (navigator.share) {
    await navigator.share({ title, url }).catch(() => null);
    toast('Partilhado com sucesso!');
  } else {
    await navigator.clipboard.writeText(url);
    toast('Link copiado!');
  }
}

function openCatalogShareDialog(catalog = state.currentCatalog, items = state.media) {
  if (!catalog) return;
  const url = getShareUrl('catalog', catalog.id);
  let dialog = $('#share-dialog');
  if (!dialog) {
    dialog = document.createElement('div');
    dialog.id = 'share-dialog';
    dialog.className = 'share-dialog';
    document.body.appendChild(dialog);
  }
  const text = encodeURIComponent(`${catalog.name} — EVZA Gallery`);
  const shareUrl = encodeURIComponent(url);
  dialog.innerHTML = `<div class="share-panel">
    <button class="icon-btn share-close" data-share-close>×</button>
    <h2>Partilhar Catálogo</h2>
    <p class="meta">Escolha onde quer partilhar o link do catálogo.</p>
    <div class="share-options">
      <a class="btn share-whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=${text}%20${shareUrl}">${shareIcon('whatsapp')} WhatsApp</a>
      <a class="btn share-facebook" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}">${shareIcon('facebook')} Facebook</a>
      <a class="btn share-x" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}">${shareIcon('x')} X</a>
      <a class="btn ghost share-email" href="mailto:?subject=${text}&body=${shareUrl}">${shareIcon('email')} Email</a>
    </div>
    <div class="share-actions">
      <button class="btn" data-copy-catalog-link="${catalog.id}">${shareIcon('copy')} Copiar Link</button>
      <button class="btn secondary" data-native-share="${catalog.id}">${shareIcon('share')} Partilhar no Telemóvel</button>
    </div>
    <p class="meta">Partilhar link é mais leve e funciona melhor no WhatsApp, Facebook e telemóveis.</p>
  </div>`;
  dialog.classList.add('open');
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-share-close]')) dialog.classList.remove('open');
    const copy = e.target.closest('[data-copy-catalog-link]');
    if (copy) shareItem('catalog', copy.dataset.copyCatalogLink);
    const native = e.target.closest('[data-native-share]');
    if (native) shareItem('catalog', native.dataset.nativeShare);
  }, { once: true });
}

function shareIcon(name) {
  const icons = {
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 3.5a8.4 8.4 0 0 0-7.18 12.74L3.9 20.5l4.36-.92A8.4 8.4 0 1 0 12.04 3.5Zm0 1.8a6.6 6.6 0 0 1 5.58 10.14 6.6 6.6 0 0 1-8.93 2.28l-.28-.16-2.12.45.47-2.07-.18-.3A6.6 6.6 0 0 1 12.04 5.3Zm-2.6 3.42c-.15 0-.39.06-.6.29-.2.23-.78.76-.78 1.85 0 1.08.8 2.13.9 2.28.1.14 1.55 2.47 3.84 3.36 1.9.75 2.3.6 2.71.56.42-.04 1.35-.55 1.54-1.08.19-.53.19-.99.13-1.08-.06-.1-.21-.15-.45-.27-.24-.12-1.36-.68-1.58-.75-.21-.08-.37-.12-.52.12-.15.23-.6.75-.73.9-.13.16-.27.18-.5.06-.24-.12-1-.37-1.9-1.18-.7-.63-1.18-1.4-1.32-1.64-.14-.24-.01-.37.1-.49.11-.1.24-.27.36-.4.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.28-.73-1.75-.19-.45-.38-.46-.52-.47h-.46Z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.4 21v-7.7h2.6l.39-3h-2.99V8.4c0-.87.24-1.46 1.49-1.46h1.59V4.26A21.3 21.3 0 0 0 14.16 4c-2.3 0-3.87 1.4-3.87 3.98v2.22H7.7v3h2.6V21h3.1Z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.4 4h4.4l3.43 4.9L16.5 4h3.1l-5.95 6.82L20.1 20h-4.4l-3.78-5.4L7.2 20H4.1l6.4-7.34L4.4 4Zm3.17 1.66 8.95 12.68h.98L8.55 5.66h-.98Z"/></svg>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16a1.8 1.8 0 0 1 1.8 1.8v8.4A1.8 1.8 0 0 1 20 18H4a1.8 1.8 0 0 1-1.8-1.8V7.8A1.8 1.8 0 0 1 4 6Zm0 1.8v.3l8 5 8-5v-.3H4Zm0 2.4v6h16v-6l-8 5-8-5Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-1v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1V7Zm2 1h3a3 3 0 0 1 3 3v3h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v1Zm-3 2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H7Z"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.1c-.76 0-1.44.3-1.95.77L8.91 12.7a3.1 3.1 0 0 0 0-1.4l7.05-4.12A3 3 0 1 0 15 5c0 .24.03.47.08.69L8.02 9.82a3 3 0 1 0 0 4.36l7.11 4.17c-.05.2-.07.42-.07.65A2.94 2.94 0 1 0 18 16.1Z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.4-4.43-9.56-9.03C.88 8.64 2.75 5 6.3 5c2.03 0 3.4 1.15 4.2 2.16C11.3 6.15 12.67 5 14.7 5c3.55 0 5.42 3.64 3.86 6.97C16.4 16.57 12 21 12 21Z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.8C4 4.8 4.8 4 5.8 4h12.4c1 0 1.8.8 1.8 1.8v8.4c0 1-.8 1.8-1.8 1.8H9.1L4 20v-4.2a1.8 1.8 0 0 1-1-1.6V5.8ZM6 6v8h.9L6 16.4 8.5 14H18V6H6Z"/></svg>'
  };
  return `<span class="share-icon">${icons[name] || ''}</span>`;
}

export function trackView(type, id) {
  if (!cfg.enableViewCount || !supabase || !id) return;
  const key = `evza-view-${type}-${id}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  setTimeout(() => supabase.rpc(type === 'catalog' ? 'increment_catalog_views' : 'increment_media_views', { p_id: id }), 5000);
}

function initRealtime(catalogId) {
  if (!cfg.enableRealtime || !supabase) return;
  supabase.channel(`catalog-${catalogId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'media_items', filter: `catalog_id=eq.${catalogId}` }, (payload) => {
      state.media.push(payload.new);
      renderMasonry(state.media);
      toast('Nova foto adicionada!');
    })
    .subscribe();
}

async function initComments() {
  const host = $('#comments');
  if (!host || !state.media.length || !cfg.enableComments) return;
  const mediaId = state.media[0].id;
  const comments = await safeQuery(() => supabase.from('comments').select('*').eq('media_id', mediaId).eq('approved', true).order('created_at', { ascending: true }), []);
  host.innerHTML = `<h2>Comentários</h2><div id="comment-list">${renderCommentTree(comments)}</div><form id="comment-form" class="form-grid"><input class="field" name="author" placeholder="O seu nome" required><textarea class="full" name="body" maxlength="500" rows="4" placeholder="Escreva um comentário" required></textarea><button class="btn" type="submit">Enviar</button></form>`;
  $('#comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from('comments').insert({ media_id: mediaId, author: form.get('author'), body: form.get('body'), approved: !cfg.requireApproval, is_admin: await isAdminSession() });
    if (error) return toast(error.message);
    e.currentTarget.reset();
    toast(cfg.requireApproval ? 'Comentário enviado! Aguarda aprovação.' : 'Comentário publicado.');
    if (!cfg.requireApproval) initComments();
  });
  host.addEventListener('click', async (e) => {
    const reply = e.target.closest('[data-reply]');
    const like = e.target.closest('[data-comment-like]');
    if (reply) showReplyForm(reply.dataset.reply, reply.dataset.author);
    if (like) toggleCommentLike(like.dataset.commentLike);
  });
}

function renderCommentTree(comments = []) {
  const parents = comments.filter((c) => !c.parent_id);
  const children = comments.filter((c) => c.parent_id);
  if (!comments.length) return '<p class="meta">Ainda sem comentários.</p>';
  return parents.map((comment) => renderComment(comment, children.filter((c) => c.parent_id === comment.id))).join('');
}

function renderComment(comment, replies = []) {
  return `<div class="comment ${comment.is_admin ? 'official-comment' : ''}" id="comment-${comment.id}">
    <strong>${escapeHtml(comment.author)}</strong>${comment.is_admin ? '<span class="official-badge">Administrador EVZA</span>' : ''}
    <p>${escapeHtml(comment.body)}</p>
    <div class="comment-actions">
      <span class="meta">${new Date(comment.created_at).toLocaleDateString('pt-MZ')}</span>
      <button class="comment-action" data-comment-like="${comment.id}">Gostar · ${fmtNum(comment.likes)}</button>
      <button class="comment-action" data-reply="${comment.id}" data-author="${escapeHtml(comment.author)}">Responder</button>
    </div>
    <div class="reply-host" id="reply-host-${comment.id}"></div>
    ${replies.length ? `<div class="replies">${replies.map((reply) => renderComment(reply, [])).join('')}</div>` : ''}
  </div>`;
}

function showReplyForm(parentId, author = '') {
  const host = $(`#reply-host-${parentId}`);
  if (!host) return;
  host.innerHTML = `<form class="reply-form form-grid" data-reply-form="${parentId}">
    <input class="field" name="author" placeholder="O seu nome" required>
    <textarea class="full" name="body" maxlength="500" rows="3" placeholder="Responder a ${escapeHtml(author)}" required></textarea>
    <button class="btn" type="submit">Responder</button>
  </form>`;
  host.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mediaId = state.media[0]?.id;
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from('comments').insert({ media_id: mediaId, parent_id: parentId, author: form.get('author'), body: form.get('body'), approved: !cfg.requireApproval, is_admin: await isAdminSession() });
    if (error) return toast(error.message.includes('parent_id') ? 'Execute update-comments-likes.sql no Supabase para activar respostas.' : error.message);
    toast('Resposta publicada.');
    initComments();
  });
}

async function isAdminSession() {
  return Boolean(await getSession());
}

async function toggleCommentLike(commentId) {
  if (!supabase) return;
  const existing = await safeQuery(() => supabase.from('comment_likes').select('id').eq('comment_id', commentId).eq('device_id', deviceId()).limit(1), []);
  if (existing.length) return toast('Já gostou deste comentário neste dispositivo.');
  const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, device_id: deviceId() });
  if (error) return toast(error.message.includes('Could not find') ? 'Execute update-comments-likes.sql no Supabase para activar likes em comentários.' : error.message);
  toast('Gostou do comentário.');
  initComments();
}

async function initSearchPage() {
  const input = $('#search-input');
  const params = new URLSearchParams(location.search);
  input.value = params.get('q') || '';
  input.focus();
  const run = debounce(search, 300);
  input.addEventListener('input', run);
  $('#clear-search')?.addEventListener('click', () => { input.value = ''; search(); });
  search();
}

async function search() {
  const query = $('#search-input')?.value.trim();
  const host = $('#search-results');
  if (!host) return;
  if (!query) { host.innerHTML = '<div class="empty"><h3>Pesquise fotos, catálogos e eventos.</h3></div>'; return; }
  host.innerHTML = '<div class="grid"><div class="card skeleton" style="height:180px"></div><div class="card skeleton" style="height:180px"></div></div>';
  const [catalogs, media] = await Promise.all([
    safeQuery(() => supabase.from('catalogs').select('*').textSearch('search_vec', query, { type: 'websearch', config: 'portuguese' }), []),
    safeQuery(() => supabase.from('media_items').select('*, catalogs(name)').textSearch('search_vec', query, { type: 'websearch', config: 'portuguese' }), [])
  ]);
  const hi = (s) => escapeHtml(s || '').replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark class="highlight">$1</mark>');
  host.innerHTML = `
    <h2>Catálogos encontrados</h2><div class="grid">${catalogs.map((c) => `<a class="card" href="catalog.html?id=${c.id}"><div class="media"><img src="${escapeHtml(catalogCover(c))}" onerror="this.src='assets/placeholder.svg'"></div><div style="padding:16px"><h3>${hi(c.name)}</h3><p>${hi(c.description)}</p></div></a>`).join('') || `<p>Nenhum catálogo para "${escapeHtml(query)}".</p>`}</div>
    <h2 style="margin-top:36px">Fotos encontradas</h2><div class="grid">${media.map((m) => `<a class="card" href="photo.html?id=${m.id}"><img src="${escapeHtml(resolveUrl(m))}" onerror="this.src='assets/placeholder.svg'"><div style="padding:16px"><h3>${hi(m.caption || 'Foto EVZA')}</h3><p>${escapeHtml(m.catalogs?.name || '')}</p></div></a>`).join('') || `<p>Nenhum resultado para "${escapeHtml(query)}". Tente outro termo.</p>`}</div>`;
}

async function initPhotoPage() {
  const id = new URLSearchParams(location.search).get('id');
  const [photo] = await safeQuery(() => supabase.from('media_items').select('*, catalogs(*)').eq('id', id).limit(1), []);
  const host = $('#photo-content');
  if (!photo) { host.innerHTML = '<div class="empty"><h2>Foto não encontrada</h2></div>'; return; }
  const src = resolveUrl(photo);
  updateMeta(`${photo.caption || 'Foto'} — EVZA Gallery`, `Foto do catálogo ${photo.catalogs?.name || 'EVZA'} — EVZA, Tete`, src);
  trackView('media', id);
  host.innerHTML = `<section class="catalog-hero"><div class="wrap"><a href="catalog.html?id=${photo.catalog_id}" class="btn ghost">← Ver Catálogo Completo</a><h1>${escapeHtml(photo.caption || 'Momento EVZA')}</h1><p>${escapeHtml(photo.catalogs?.name || '')}</p></div></section><section class="section"><div class="wrap"><img class="card" src="${escapeHtml(src)}" alt="${escapeHtml(photo.caption || 'Foto EVZA')}" onerror="this.src='assets/placeholder.svg'"><div class="stat-row"><button class="btn" data-share="photo" data-id="${photo.id}">Partilhar</button><a class="btn secondary" href="${escapeHtml(src)}" download>Descarregar</a></div></div></section>`;
}

function updateMeta(title, description, image) {
  document.title = title;
  const set = (sel, attr, val) => { const el = $(sel); if (el) el.setAttribute(attr, val); };
  set('meta[property="og:title"]', 'content', title);
  set('meta[property="og:description"]', 'content', description);
  set('meta[property="og:image"]', 'content', image);
  set('meta[property="og:url"]', 'content', location.href);
}

async function initAdmin() {
  const session = await getSession();
  state.adminAuthed = Boolean(session);
  renderAdmin(Boolean(session));
  onAuthChange((s) => {
    const authed = Boolean(s);
    if (state.adminAuthed === authed && $('#admin-main')) return;
    state.adminAuthed = authed;
    renderAdmin(authed);
  });
}

function renderAdmin(isAuthed) {
  const root = $('#admin-root');
  if (!root) return;
  if (!isAuthed) {
    root.innerHTML = `<section class="login-view"><form class="login-card stack" id="login-form"><img src="assets/logo.svg" alt="EVZA"><h1>Área do Administrador</h1><input class="field" name="email" type="email" placeholder="Email" required><input class="field" name="password" type="password" placeholder="Palavra-passe" required><button class="btn" type="submit">Entrar</button><p class="meta" id="login-error"></p></form></section>`;
    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const { error } = await signIn(f.get('email'), f.get('password'));
      if (error) $('#login-error').textContent = error.message;
    });
    return;
  }
  const adminTabs = ['Dashboard','Catálogos','Adicionar Media','Estados','Comentários','Configurações'];
  let activeTab = Number(localStorage.getItem('evza-admin-tab') || 0);
  if (!Number.isFinite(activeTab) || activeTab < 0 || activeTab >= adminTabs.length) activeTab = 0;
  root.innerHTML = `<div class="admin-shell"><aside class="admin-sidebar"><div class="brand"><img src="assets/logo.svg"><span>Admin EVZA</span></div><nav class="admin-nav">${adminTabs.map((x,i)=>`<button class="btn ${i===activeTab?'active':''}" data-admin="${i}">${x}</button>`).join('')}</nav><div style="margin-top:auto"><button class="btn ghost" id="logout">Sair</button></div></aside><main class="admin-main" id="admin-main"></main></div>`;
  $('#logout').addEventListener('click', signOut);
  $('.admin-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-admin]');
    if (!btn) return;
    $$('.admin-nav button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    localStorage.setItem('evza-admin-tab', btn.dataset.admin);
    paintAdmin(Number(btn.dataset.admin));
  });
  paintAdmin(activeTab);
}

async function paintAdmin(tab) {
  const main = $('#admin-main');
  const cats = await loadCatalogs();
  if (tab === 0) {
    const media = await safeQuery(() => supabase.from('media_items').select('*'), []);
    const pending = await safeQuery(() => supabase.from('comments').select('*').eq('approved', false), []);
    main.innerHTML = `<h1>Dashboard</h1><div class="metric-grid"><div class="metric"><span>Catálogos</span><strong>${cats.length}</strong></div><div class="metric"><span>Media</span><strong>${media.length}</strong></div><div class="metric"><span>Visualizações</span><strong>${fmtNum(cats.reduce((a,c)=>a+(c.views||0),0)+media.reduce((a,m)=>a+(m.views||0),0))}</strong></div><div class="metric"><span>Pendentes</span><strong>${pending.length}</strong></div></div>${table('Catálogos mais vistos', cats.sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5).map(c=>[c.name, fmtNum(c.views)]))}`;
  }
  if (tab === 1) adminCatalogs(main, cats);
  if (tab === 2) adminMedia(main, cats);
  if (tab === 3) adminStatuses(main);
  if (tab === 4) adminComments(main);
  if (tab === 5) adminSettings(main);
}

function table(title, rows) {
  return `<h2 style="margin-top:28px">${title}</h2><table class="table"><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('') || '<tr><td>Sem dados.</td></tr>'}</tbody></table>`;
}

function adminCatalogs(main, cats) {
  main.innerHTML = `<h1>Gerir Catálogos</h1><button class="btn" id="new-cat">Novo Catálogo</button><div id="cat-form"></div><div class="stack" style="margin-top:20px">${cats.map((c)=>`<div class="card" style="padding:16px" data-catalog-card="${c.id}"><div class="upload-row"><img src="${escapeHtml(catalogCover(c))}" alt="" onerror="this.src='assets/placeholder.svg'"><div><h3>${escapeHtml(c.name)}</h3><p class="meta">${fmtDate(c.event_date)} · ${fmtNum(c.views)} visualizações</p><div class="stat-row"><a class="btn secondary" href="catalog.html?id=${c.id}">Ver no Site</a><button class="btn" data-edit-cat="${c.id}">Editar</button><button class="btn" data-manage-media="${c.id}">Gerir Media</button><button class="btn" data-feature="${c.id}">${c.is_featured?'Remover Destaque':'Em Destaque'}</button><button class="btn secondary" data-fix-cover="${c.id}">Usar 1ª foto como capa</button><button class="btn danger" data-delete-cat="${c.id}">Eliminar Catálogo</button></div></div></div><div class="catalog-admin-panel" id="catalog-panel-${c.id}"></div></div>`).join('')}</div>`;
  $('#new-cat').addEventListener('click', () => $('#cat-form').innerHTML = `<form id="create-cat" class="comment-box form-grid"><input class="field" name="name" placeholder="Nome do catálogo" required><input class="field" name="event_date" type="date"><textarea class="full" name="description" placeholder="Descrição"></textarea><label class="full">Foto de capa<input class="field" name="cover_file" type="file" accept=".jpg,.jpeg,.png,.webp"></label><input class="field full" name="cover_url" placeholder="Ou cole URL da capa / Google Drive"><img class="card full" id="cover-preview" src="assets/placeholder.svg" alt="Pré-visualização da capa" style="max-height:220px;object-fit:cover;width:100%"><label><input name="is_featured" type="checkbox"> Marcar como Destaque</label><button class="btn" type="submit">Criar Catálogo</button></form>`);
  main.addEventListener('submit', async (e) => {
    if (e.target.id !== 'create-cat') return;
    e.preventDefault();
    const f = new FormData(e.target);
    const button = e.target.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'A guardar...';
    const coverFile = f.get('cover_file');
    const coverUrl = coverFile && coverFile.size ? await uploadPublicFile(coverFile, `catalog-covers/${Date.now()}-${safeFileName(coverFile.name)}`) : normalisePublicUrl(f.get('cover_url'));
    const { error } = await supabase.from('catalogs').insert({ name: f.get('name'), description: f.get('description'), event_date: f.get('event_date') || null, cover_url: coverUrl || 'assets/placeholder.svg', is_featured: f.has('is_featured'), created_by: (await getUser())?.id });
    button.disabled = false;
    button.textContent = 'Criar Catálogo';
    if (error) toast(error.message); else { toast('Catálogo criado.'); paintAdmin(1); }
  });
  main.addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-edit-form]')) return;
    e.preventDefault();
    const catalogId = e.target.dataset.editForm;
    const f = new FormData(e.target);
    const coverFile = f.get('cover_file');
    const coverUrl = coverFile && coverFile.size ? await uploadPublicFile(coverFile, `catalog-covers/${Date.now()}-${safeFileName(coverFile.name)}`) : normalisePublicUrl(f.get('cover_url'));
    const payload = {
      name: f.get('name'),
      description: f.get('description'),
      event_date: f.get('event_date') || null,
      is_featured: f.has('is_featured')
    };
    if (coverUrl) payload.cover_url = coverUrl;
    const { error } = await supabase.from('catalogs').update(payload).eq('id', catalogId);
    if (error) toast(error.message); else { toast('Catálogo actualizado.'); paintAdmin(1); }
  });
  main.addEventListener('change', (e) => {
    if (e.target.name === 'cover_file' && e.target.files?.[0]) $('#cover-preview').src = URL.createObjectURL(e.target.files[0]);
    if (e.target.name === 'cover_url') $('#cover-preview').src = normalisePublicUrl(e.target.value) || 'assets/placeholder.svg';
  });
  main.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-delete-cat]');
    const feat = e.target.closest('[data-feature]');
    const cover = e.target.closest('[data-fix-cover]');
    const edit = e.target.closest('[data-edit-cat]');
    const media = e.target.closest('[data-manage-media]');
    const deleteMedia = e.target.closest('[data-delete-media]');
    if (del && confirm('Eliminar este catálogo?')) { await supabase.from('catalogs').delete().eq('id', del.dataset.deleteCat); paintAdmin(1); }
    if (feat) { const c = cats.find((x) => x.id === feat.dataset.feature); await supabase.from('catalogs').update({ is_featured: !c.is_featured }).eq('id', c.id); paintAdmin(1); }
    if (cover) { await fixCatalogCover(cover.dataset.fixCover); paintAdmin(1); }
    if (edit) renderCatalogEditForm(edit.dataset.editCat, cats.find((c) => c.id === edit.dataset.editCat));
    if (media) renderCatalogMediaPanel(media.dataset.manageMedia);
    if (deleteMedia) deleteMediaItem(deleteMedia.dataset.deleteMedia, deleteMedia.dataset.storagePath || '', deleteMedia.dataset.catalogId);
  });
}

function renderCatalogEditForm(catalogId, cat) {
  const panel = $(`#catalog-panel-${catalogId}`);
  if (!panel || !cat) return;
  panel.innerHTML = `<form class="comment-box form-grid" data-edit-form="${catalogId}">
    <h3 class="full">Editar Catálogo</h3>
    <input class="field" name="name" value="${escapeHtml(cat.name)}" placeholder="Nome do catálogo" required>
    <input class="field" name="event_date" type="date" value="${escapeHtml(cat.event_date || '')}">
    <textarea class="full" name="description" rows="3" placeholder="Descrição">${escapeHtml(cat.description || '')}</textarea>
    <label class="full">Nova foto de capa<input class="field" name="cover_file" type="file" accept=".jpg,.jpeg,.png,.webp"></label>
    <input class="field full" name="cover_url" value="${escapeHtml(cat.cover_url || '')}" placeholder="URL da capa / Google Drive">
    <label><input name="is_featured" type="checkbox" ${cat.is_featured ? 'checked' : ''}> Marcar como Destaque</label>
    <button class="btn" type="submit">Guardar Alterações</button>
  </form>`;
}

async function renderCatalogMediaPanel(catalogId) {
  const panel = $(`#catalog-panel-${catalogId}`);
  if (!panel) return;
  panel.innerHTML = '<div class="comment-box"><h3>Media do Catálogo</h3><p class="meta">A carregar...</p></div>';
  const items = await safeQuery(() => supabase.from('media_items').select('*').eq('catalog_id', catalogId).order('created_at', { ascending: false }), []);
  panel.innerHTML = `<div class="comment-box"><h3>Media do Catálogo</h3>${items.length ? `<div class="media-admin-grid">${items.map((item) => `<div class="media-admin-item"><div>${item.type === 'video' ? `<div class="video-tile"${videoTileStyle(item)}><span class="play-mark">▶</span></div>` : `<img src="${escapeHtml(resolveUrl(item) || 'assets/placeholder.svg')}" onerror="this.src='assets/placeholder.svg'" alt="">`}</div><div><strong>${escapeHtml(item.caption || (item.type === 'video' ? 'Vídeo' : 'Foto'))}</strong><p class="meta">${item.type === 'video' ? 'Vídeo' : 'Foto'} · ${new Date(item.created_at).toLocaleDateString('pt-MZ')}</p><button class="btn danger" data-delete-media="${item.id}" data-storage-path="${escapeHtml(item.storage_path || '')}" data-catalog-id="${catalogId}">Eliminar Media</button></div></div>`).join('')}</div>` : '<p class="meta">Este catálogo ainda não tem fotos ou vídeos.</p>'}</div>`;
}

async function deleteMediaItem(mediaId, storagePath, catalogId) {
  if (!confirm('Eliminar esta foto/vídeo do catálogo? Esta acção não pode ser desfeita.')) return;
  if (storagePath) await supabase.storage.from(cfg.bucket).remove([storagePath]);
  const { error } = await supabase.from('media_items').delete().eq('id', mediaId);
  if (error) return toast(error.message);
  toast('Media eliminada.');
  renderCatalogMediaPanel(catalogId);
}

function adminMedia(main, cats) {
  main.innerHTML = `<h1>Adicionar Media</h1><div class="tabs"><button class="filter active" data-mode="upload">Upload directo</button><button class="filter" data-mode="drive">Google Drive</button></div><select id="media-cat">${cats.map((c)=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select><div id="upload" class="tab-panel active"><label class="drop-zone"><input id="file-input" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.mp4,.mov" hidden><strong>Arrastar fotos/vídeos aqui ou clicar para seleccionar</strong></label><div id="uploads"></div></div><div id="drive" class="tab-panel"><form id="drive-form" class="comment-box form-grid"><input class="field full" name="url" placeholder="URL Google Drive" required><input class="field" name="caption" placeholder="Legenda"><select name="type"><option value="photo">Foto</option><option value="video">Vídeo</option></select><input class="field full" name="poster_url" placeholder="URL do poster para vídeo"><button class="btn" type="submit">Guardar Link</button></form></div>`;
  $$('.tabs button').forEach((b)=>b.addEventListener('click',()=>{$$('.tabs button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); $$('.tab-panel').forEach(p=>p.classList.remove('active')); $(`#${b.dataset.mode}`).classList.add('active');}));
  $('.drop-zone').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', uploadFiles);
  $('#drive-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const id = extractDriveId(f.get('url'));
    const posterUrl = f.get('poster_url') || (f.get('type') === 'video' && id ? driveThumbUrl(id, 2000) : '');
    const srcUrl = id ? (f.get('type') === 'video' ? `https://drive.google.com/uc?export=view&id=${id}` : driveThumbUrl(id, 2000)) : f.get('url');
    const { error } = await supabase.from('media_items').insert({ catalog_id: $('#media-cat').value, type: f.get('type'), src_url: srcUrl, drive_file_id: id, caption: f.get('caption'), poster_url: posterUrl });
    if (error) toast(error.message); else { e.target.reset(); toast('Media adicionada. Abra o catálogo para ver.'); }
  });
}

async function uploadFiles(e) {
  const files = [...e.target.files];
  const host = $('#uploads');
  for (const file of files) {
    const row = document.createElement('div');
    row.className = 'upload-row';
    const preview = URL.createObjectURL(file);
    row.innerHTML = `${file.type.startsWith('video') ? `<video class="upload-preview" src="${preview}" muted></video>` : `<img class="upload-preview" src="${preview}" alt="Preview">`}<div><input class="field" placeholder="Legenda"><div class="bar"><span></span></div><p class="meta">A fazer upload...</p></div>`;
    host.appendChild(row);
    const path = `${$('#media-cat').value}/${Date.now()}-${safeFileName(file.name)}`;
    const publicUrl = await uploadPublicFile(file, path).catch((error) => {
      row.querySelector('.meta').textContent = error.message;
      return '';
    });
    if (!publicUrl) continue;
    row.querySelector('.bar span').style.width = '100%';
    const { error } = await supabase.from('media_items').insert({ catalog_id: $('#media-cat').value, type: file.type.startsWith('video') ? 'video' : 'photo', src_url: publicUrl, storage_path: path, caption: row.querySelector('input').value });
    if (error) {
      row.querySelector('.meta').textContent = `Erro ao guardar na galeria: ${error.message}`;
      row.querySelector('.meta').style.color = '#9a231c';
    } else {
      row.querySelector('.meta').textContent = 'Concluído ✓. Abra o catálogo para ver.';
      await ensureCatalogHasCover($('#media-cat').value, publicUrl, file.type);
    }
  }
}

async function ensureCatalogHasCover(catalogId, publicUrl, fileType) {
  if (!publicUrl || fileType.startsWith('video')) return;
  const [cat] = await safeQuery(() => supabase.from('catalogs').select('cover_url').eq('id', catalogId).limit(1), []);
  if (!cat || (cat.cover_url && !cat.cover_url.includes('placeholder.svg'))) return;
  await supabase.from('catalogs').update({ cover_url: publicUrl }).eq('id', catalogId);
}

async function fixCatalogCover(catalogId) {
  const [item] = await safeQuery(() => supabase.from('media_items').select('*').eq('catalog_id', catalogId).eq('type', 'photo').order('created_at').limit(1), []);
  if (!item) return toast('Este catálogo ainda não tem fotos para usar como capa.');
  const url = resolveUrl(item);
  const { error } = await supabase.from('catalogs').update({ cover_url: url }).eq('id', catalogId);
  toast(error ? error.message : 'Capa actualizada com a primeira foto.');
}

async function adminStatuses(main) {
  const statuses = await safeQuery(() => supabase.from('status_items').select('*').order('created_at', { ascending: false }), []);
  main.innerHTML = `<h1>Estados EVZA</h1>
    <p class="meta">Adicione fotos ou vídeos verticais semelhantes aos estados/reels e escolha por quanto tempo ficam disponíveis na página inicial.</p>
    <form id="status-form" class="comment-box form-grid">
      <input class="field" name="caption" placeholder="Legenda curta">
      <select name="duration" class="field">
        <option value="6">6 horas</option>
        <option value="12">12 horas</option>
        <option value="24" selected>24 horas</option>
        <option value="48">48 horas</option>
        <option value="168">7 dias</option>
      </select>
      <label class="full">Foto ou vídeo vertical<input class="field" name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.mov"></label>
      <input class="field full" name="url" placeholder="Ou cole URL Google Drive">
      <select name="type" class="field"><option value="photo">Foto</option><option value="video">Vídeo</option></select>
      <input class="field" name="poster_url" placeholder="Poster do vídeo (opcional)">
      <button class="btn" type="submit">Publicar Estado</button>
    </form>
    <div class="media-admin-grid">${statuses.map((item) => `<div class="media-admin-item"><div>${item.type === 'video' ? `<div class="video-tile"${videoTileStyle(item)}><span class="play-mark">▶</span></div>` : `<img src="${escapeHtml(resolveUrl(item))}" onerror="this.src='assets/placeholder.svg'" alt="">`}</div><div><strong>${escapeHtml(item.caption || 'Estado EVZA')}</strong><p class="meta">Expira: ${new Date(item.expires_at).toLocaleString('pt-MZ')}</p><button class="btn danger" data-delete-status="${item.id}" data-storage-path="${escapeHtml(item.storage_path || '')}">Eliminar Estado</button></div></div>`).join('') || '<p class="meta">Ainda não há estados publicados.</p>'}</div>`;

  $('#status-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const file = f.get('file');
    const driveId = extractDriveId(f.get('url'));
    const type = file && file.size ? (file.type.startsWith('video') ? 'video' : 'photo') : f.get('type');
    const expiresAt = new Date(Date.now() + Number(f.get('duration')) * 60 * 60 * 1000).toISOString();
    let storagePath = '';
    let srcUrl = driveId ? (type === 'video' ? `https://drive.google.com/uc?export=view&id=${driveId}` : driveThumbUrl(driveId, 2000)) : normalisePublicUrl(f.get('url'));

    if (file && file.size) {
      storagePath = `status/${Date.now()}-${safeFileName(file.name)}`;
      srcUrl = await uploadPublicFile(file, storagePath);
    }

    if (!srcUrl) return toast('Escolha um ficheiro ou cole um link.');
    const posterUrl = f.get('poster_url') || (type === 'video' && driveId ? driveThumbUrl(driveId, 2000) : '');
    const { error } = await supabase.from('status_items').insert({ type, src_url: srcUrl, storage_path: storagePath || null, drive_file_id: driveId || null, poster_url: posterUrl, caption: f.get('caption'), expires_at: expiresAt, created_by: (await getUser())?.id });
    if (error) return toast(error.message.includes('status_items') ? 'Execute update-statuses.sql no Supabase para activar Estados.' : error.message);
    toast('Estado publicado.');
    paintAdmin(3);
  });

  main.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-delete-status]');
    if (!del) return;
    if (!confirm('Eliminar este estado?')) return;
    if (del.dataset.storagePath) await supabase.storage.from(cfg.bucket).remove([del.dataset.storagePath]);
    const { error } = await supabase.from('status_items').delete().eq('id', del.dataset.deleteStatus);
    if (error) toast(error.message); else { toast('Estado eliminado.'); paintAdmin(3); }
  }, { once: true });
}

function safeFileName(name = 'ficheiro') {
  return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9.]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function uploadPublicFile(file, path) {
  const { error } = await supabase.storage.from(cfg.bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream'
  });
  if (error) throw error;
  return storageUrl(path);
}

async function adminComments(main) {
  const comments = await safeQuery(() => supabase.from('comments').select('*, media_items(src_url,caption)').order('created_at', { ascending: false }), []);
  main.innerHTML = `<h1>Comentários</h1><div class="stack">${comments.map((c)=>`<div class="card" style="padding:16px"><strong>${escapeHtml(c.author)}</strong><p>${escapeHtml(c.body)}</p><p class="meta">${c.approved ? 'Aprovado' : 'Aguarda aprovação'}</p><div class="stat-row"><button class="btn" data-approve="${c.id}">Aprovar</button><button class="btn danger" data-reject="${c.id}">Rejeitar</button></div></div>`).join('') || '<p>Sem comentários.</p>'}</div>`;
  main.addEventListener('click', async (e) => {
    const ap = e.target.closest('[data-approve]');
    const re = e.target.closest('[data-reject]');
    if (ap) await supabase.from('comments').update({ approved: true }).eq('id', ap.dataset.approve);
    if (re) await supabase.from('comments').delete().eq('id', re.dataset.reject);
    if (ap || re) adminComments(main);
  });
}

function adminSettings(main) {
  main.innerHTML = `<h1>Configurações</h1><form id="settings" class="comment-box stack"><input class="field" name="siteUrl" value="${escapeHtml(localStorage.getItem('evza-site-url') || cfg.siteUrl)}"><label><input type="checkbox" checked> Permitir comentários</label><label><input type="checkbox" checked> Permitir download de fotos</label><label><input type="checkbox" checked> Mostrar contador de visualizações</label><button class="btn">Guardar Configurações</button><p class="meta">Versão 2 · último deploy: ${new Date().toLocaleDateString('pt-MZ')}</p></form>`;
  $('#settings').addEventListener('submit', (e) => { e.preventDefault(); localStorage.setItem('evza-site-url', new FormData(e.target).get('siteUrl')); toast('Configurações guardadas.'); });
}

function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.warn);
}

async function initOffline() {
  $('#retry')?.addEventListener('click', () => location.reload());
  if ('caches' in window) {
    const cache = await caches.open('evza-v2');
    const keys = await cache.keys();
    $('#cached-list').innerHTML = keys.filter((r) => r.url.includes('catalog.html')).map((r) => `<li>${escapeHtml(r.url)}</li>`).join('') || '<li>Nenhum catálogo em cache ainda.</li>';
  }
}
