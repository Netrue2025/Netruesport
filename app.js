const list = document.querySelector('#matches-list');
const empty = document.querySelector('#empty');
let allMatches = [];
let activeChannel = 'yalla';
let channelSources = [];
let activeFilter = 'all';
let deferredInstall;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.querySelector('#today').textContent = new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short'}).format(new Date());
function render() {
  const channelMatches = allMatches.filter(m => m.sourceId === activeChannel);
  const source = channelSources.find(s => s.id === activeChannel);
  document.querySelector('#channel-title').childNodes[0].textContent = `Channel ${source?.channel || 1} - ${source?.name || 'Yalla Shoot'} `;
  const matches = channelMatches.filter(m => activeFilter === 'all' || (activeFilter === 'live' ? m.live : ['Scheduled','Fixture'].includes(m.status || 'Fixture'))).sort((a,b) => Number(b.live) - Number(a.live));
  document.querySelector('#live-count').textContent = channelMatches.filter(m => m.live).length || '';
  document.querySelector('#match-count').textContent = allMatches.length ? `(${matches.length})` : '';
  list.innerHTML = matches.map(m => {
    const index = allMatches.indexOf(m);
    const names = m.teams || m.title.split(/\s+vs\s+/i);
    const logo = (url, name) => url ? `<img class="team-logo" src="${esc(url)}" alt="" loading="lazy" onerror="this.hidden=true">` : `<span class="team-logo team-fallback">${esc((name || '?').slice(0,1))}</span>`;
    return `<article class="match-card ${m.live ? 'live-card' : ''}" role="button" tabindex="0" data-match-index="${index}" aria-label="Open ${esc(m.title)} match page"><p class="league">${esc(m.source)} <span class="badge ${m.live ? 'live' : ''}">${m.live ? '<i class="live-badge-dot"></i>' : ''}${esc(m.status || (m.live ? 'Live' : 'Fixture'))}</span></p><div class="team-line"><div class="team-block">${logo(m.logos?.[0], names[0])}<span>${esc(names[0])}</span></div><span class="versus">VS</span><div class="team-block right-team">${logo(m.logos?.[1], names[1])}<span>${esc(names[1])}</span></div></div><div class="match-bottom"><span class="match-meta">${esc(m.details || (m.live ? 'In progress' : 'Scheduled'))}</span><span class="card-action">${m.live && m.watchUrl ? 'Live match page' : m.watchUrl ? 'View match page' : 'Open match'} <b>↗</b></span></div></article>`;
  }).join('');
  list.hidden = matches.length === 0;
  empty.hidden = matches.length !== 0;
  const sourceLink = document.querySelector('#empty-source');
  if (sourceLink && source) { sourceLink.href = source.url; sourceLink.textContent = `Open ${source.name} schedule ↗`; }
}
function openMatch(match) {
  const frameUrl = match.watchUrl || match.sourceUrl;
  if (!frameUrl) return;
  const dialog = document.querySelector('#watch-dialog');
  document.querySelector('#watch-title').textContent = match.title;
  document.querySelector('#frame-note').textContent = match.watchProvider ? `Matched fixture page on ${match.watchProvider}.` : match.watchUrl ? 'A match page was found for this fixture.' : `${match.source} did not publish a unique match URL in its fixture list. Showing its football page instead.`;
  document.querySelector('#watch-frame').src = frameUrl;
  document.querySelector('#open-source').href = frameUrl;
  dialog.showModal();
}
list.addEventListener('click', event => {
  const card = event.target.closest('[data-match-index]');
  if (card) openMatch(allMatches[Number(card.dataset.matchIndex)]);
});
list.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-match-index]')) { event.preventDefault(); openMatch(allMatches[Number(event.target.dataset.matchIndex)]); }
});
const watchFrame = document.querySelector('#watch-frame');
const frameWrap = document.querySelector('.frame-wrap');
const fullscreenButton = document.querySelector('#fullscreen-player');
fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (frameWrap.requestFullscreen) await frameWrap.requestFullscreen();
    else throw new Error('Fullscreen is not supported by this browser.');
  } catch {
    document.querySelector('#frame-note').textContent = 'Full screen is unavailable for this embedded page. Try opening the match page in a new tab and using its player controls.';
  }
});
document.addEventListener('fullscreenchange', () => {
  const active = document.fullscreenElement === frameWrap;
  fullscreenButton.textContent = active ? 'Exit full screen' : 'Full screen';
  fullscreenButton.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
});
document.querySelector('#close-watch').addEventListener('click', () => document.querySelector('#watch-dialog').close());
document.querySelector('#watch-dialog').addEventListener('close', () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); watchFrame.src = 'about:blank'; });
document.querySelector('#watch-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
async function refresh() {
  const button = document.querySelector('#refresh'); button.disabled = true;
  document.querySelector('#updated').textContent = 'Updating…';
  if (!allMatches.length) list.innerHTML = '<div class="loading"><span class="loader"></span> Finding today\'s fixtures…</div>';
  try {
    const response = await fetch('/api/matches', {cache:'no-store'});
    const data = await response.json();
    channelSources = data.sources;
    allMatches = data.sources.flatMap(source => source.matches || []);
    const sourceNotes = data.sources.filter(source => source.note).map(source => `${source.name}: ${source.note}`);
    const note = document.querySelector('#feed-note');
    note.textContent = sourceNotes.join(' ');
    note.hidden = sourceNotes.length === 0;
    const time = new Date(data.updatedAt);
    document.querySelector('#updated').textContent = `${allMatches.length} imported · ${time.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
  } catch {
    document.querySelector('#updated').textContent = 'Sources unavailable';
  }
  render(); button.disabled = false;
}
document.querySelector('#refresh').addEventListener('click', refresh);
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b === button));
  activeFilter = button.dataset.filter; render();
}));
document.querySelectorAll('.channel').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.channel').forEach(b => b.classList.toggle('active', b === button));
  activeChannel = button.dataset.channel; render();
}));
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; document.querySelector('#install').hidden = false; });
document.querySelector('#install').addEventListener('click', async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; document.querySelector('#install').hidden = true; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
refresh();
setInterval(refresh, 60000);
