const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = __dirname;
const PORT = process.env.PORT || 4173;
const sources = [
  { id: 'yalla', channel: 1, name: 'Yalla Shoot', url: 'https://yalla-shoot.ltd/matches-today/', kind: 'fixtures' },
  { id: 'panda', channel: 2, name: 'Panda HD', url: 'https://a5.pandab-hd.com/', pages: ['https://a5.pandab-hd.com/matches-yesterday/', 'https://a5.pandab-hd.com/matches-today/', 'https://a5.pandab-hd.com/matches-tomorrow/'], kind: 'fixtures' },
  { id: 'livesports', channel: 3, name: 'Livesports088', url: 'https://afr.livesports088.is/', kind: 'live' },
  { id: 'ball16', channel: 4, name: '808ball16', url: 'https://afr.808ball16.com/football/', kind: 'match-pages' },
  { id: 'espn', channel: 5, name: 'ESPN Scores', url: 'https://www.espn.com/soccer/scoreboard', apiUrl: 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?limit=500', kind: 'scoreboard' }
];
const cache = new Map();
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml' };
function clean(s) { return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;|&#x27;/gi,"'").replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/\s+/g,' ').trim(); }
const teamNames = {
  'ليسوتو':'Lesotho','الغابون':'Gabon','فلسطين':'Palestine','لبنان':'Lebanon','العراق':'Iraq','السعودية':'Saudi Arabia','المملكة العربية السعودية':'Saudi Arabia','قطر':'Qatar','الإمارات':'United Arab Emirates','الإمارات العربية المتحدة':'United Arab Emirates','عمان':'Oman','عُمان':'Oman','الكويت':'Kuwait','الأردن':'Jordan','سوريا':'Syria','سورية':'Syria','مصر':'Egypt','المغرب':'Morocco','الجزائر':'Algeria','تونس':'Tunisia','ليبيا':'Libya','السودان':'Sudan','جنوب السودان':'South Sudan','موريتانيا':'Mauritania','الصومال':'Somalia','جيبوتي':'Djibouti','جزر القمر':'Comoros','إثيوبيا':'Ethiopia','اثيوبيا':'Ethiopia','إريتريا':'Eritrea','كينيا':'Kenya','أوغندا':'Uganda','تنزانيا':'Tanzania','رواندا':'Rwanda','بوروندي':'Burundi','الكونغو':'Congo','الكونغو الديمقراطية':'DR Congo','جمهورية الكونغو الديمقراطية':'DR Congo','الكاميرون':'Cameroon','نيجيريا':'Nigeria','غانا':'Ghana','السنغال':'Senegal','غينيا':'Guinea','غينيا الاستوائية':'Equatorial Guinea','غينيا بيساو':'Guinea-Bissau','ساحل العاج':'Ivory Coast','كوت ديفوار':'Ivory Coast','مالي':'Mali','النيجر':'Niger','بوركينا فاسو':'Burkina Faso','بنين':'Benin','توغو':'Togo','تشاد':'Chad','جمهورية أفريقيا الوسطى':'Central African Republic','زامبيا':'Zambia','زيمبابوي':'Zimbabwe','موزمبيق':'Mozambique','أنغولا':'Angola','جنوب أفريقيا':'South Africa','ليسوتو':'Lesotho','بوتسوانا':'Botswana','ناميبيا':'Namibia','مدغشقر':'Madagascar','ملاوي':'Malawi','الرأس الأخضر':'Cape Verde','الرأس الاخضر':'Cape Verde','جزر القمر':'Comoros','غابون':'Gabon','فرنسا':'France','إنجلترا':'England','اسبانيا':'Spain','إسبانيا':'Spain','ألمانيا':'Germany','إيطاليا':'Italy','البرتغال':'Portugal','هولندا':'Netherlands','بلجيكا':'Belgium','سويسرا':'Switzerland','النمسا':'Austria','تركيا':'Türkiye','اليونان':'Greece','صربيا':'Serbia','كرواتيا':'Croatia','البرازيل':'Brazil','الأرجنتين':'Argentina','أوروغواي':'Uruguay','الولايات المتحدة':'United States','المكسيك':'Mexico','اليابان':'Japan','كوريا الجنوبية':'South Korea','أستراليا':'Australia','أفغانستان':'Afghanistan','البحرين':'Bahrain','بنغلاديش':'Bangladesh','إيران':'Iran','إندونيسيا':'Indonesia','ماليزيا':'Malaysia','الصين':'China','تايلاند':'Thailand','فيتنام':'Vietnam','تصفيات كأس أمم أفريقيا':'Africa Cup of Nations Qualifiers','كأس أمم أفريقيا':'Africa Cup of Nations','مباراة ودية':'Friendly'
};
Object.assign(teamNames, { 'الجابون':'Gabon','غامبيا':'Gambia','سيراليون':'Sierra Leone','ليبيريا':'Liberia','مقدونيا الشمالية':'North Macedonia','الجمهورية الأيرلندية':'Republic of Ireland','الرأس الأخضر':'Cape Verde','برشلونة':'Barcelona','ريال مدريد':'Real Madrid','ليفربول':'Liverpool','مانشستر سيتي':'Manchester City','مانشستر يونايتد':'Manchester United','أرسنال':'Arsenal','تشيلسي':'Chelsea','توتنهام':'Tottenham Hotspur','باريس سان جيرمان':'Paris Saint-Germain','بايرن ميونخ':'Bayern Munich','بايرن ميونيخ':'Bayern Munich','بوروسيا دورتموند':'Borussia Dortmund','يوفنتوس':'Juventus','إنتر ميلان':'Inter Milan','ميلان':'AC Milan','روما':'Roma','الهلال':'Al Hilal','النصر':'Al Nassr','الأهلي':'Al Ahly','الزمالك':'Zamalek' });
const arabicEnglish = {'مصر':'Egypt','المغرب':'Morocco','الجزائر':'Algeria','تونس':'Tunisia','ليبيا':'Libya','السودان':'Sudan','جنوب السودان':'South Sudan','موريتانيا':'Mauritania','الصومال':'Somalia','جيبوتي':'Djibouti','جزر القمر':'Comoros','إثيوبيا':'Ethiopia','إريتريا':'Eritrea','كينيا':'Kenya','أوغندا':'Uganda','تنزانيا':'Tanzania','رواندا':'Rwanda','بوروندي':'Burundi','الكونغو':'Congo','الكونغو الديمقراطية':'DR Congo','جمهورية الكونغو الديمقراطية':'DR Congo','الكاميرون':'Cameroon','نيجيريا':'Nigeria','غانا':'Ghana','السنغال':'Senegal','غينيا':'Guinea','غينيا الاستوائية':'Equatorial Guinea','غينيا بيساو':'Guinea-Bissau','ساحل العاج':'Ivory Coast','كوت ديفوار':'Ivory Coast','مالي':'Mali','النيجر':'Niger','بوركينا فاسو':'Burkina Faso','بنين':'Benin','توغو':'Togo','تشاد':'Chad','زامبيا':'Zambia','زيمبابوي':'Zimbabwe','موزمبيق':'Mozambique','أنغولا':'Angola','جنوب أفريقيا':'South Africa','ليسوتو':'Lesotho','بوتسوانا':'Botswana','ناميبيا':'Namibia','مدغشقر':'Madagascar','مالاوي':'Malawi','الرأس الأخضر':'Cape Verde','غابون':'Gabon','الغابون':'Gabon','غامبيا':'Gambia','سيراليون':'Sierra Leone','ليبيريا':'Liberia','السعودية':'Saudi Arabia','المملكة العربية السعودية':'Saudi Arabia','العراق':'Iraq','قطر':'Qatar','الإمارات':'United Arab Emirates','الإمارات العربية المتحدة':'United Arab Emirates','عمان':'Oman','عُمان':'Oman','الكويت':'Kuwait','الأردن':'Jordan','سوريا':'Syria','لبنان':'Lebanon','فلسطين':'Palestine','البحرين':'Bahrain','اليمن':'Yemen','فرنسا':'France','إنجلترا':'England','إسبانيا':'Spain','ألمانيا':'Germany','إيطاليا':'Italy','البرتغال':'Portugal','هولندا':'Netherlands','بلجيكا':'Belgium','سويسرا':'Switzerland','النمسا':'Austria','تركيا':'Türkiye','اليونان':'Greece','صربيا':'Serbia','كرواتيا':'Croatia','البرازيل':'Brazil','الأرجنتين':'Argentina','أوروغواي':'Uruguay','الولايات المتحدة':'United States','المكسيك':'Mexico','اليابان':'Japan','كوريا الجنوبية':'South Korea','أستراليا':'Australia','برشلونة':'Barcelona','ريال مدريد':'Real Madrid','ليفربول':'Liverpool','مانشستر سيتي':'Manchester City','مانشستر يونايتد':'Manchester United','أرسنال':'Arsenal','تشيلسي':'Chelsea','توتنهام':'Tottenham Hotspur','باريس سان جيرمان':'Paris Saint-Germain','بايرن ميونخ':'Bayern Munich','بوروسيا دورتموند':'Borussia Dortmund','يوفنتوس':'Juventus','إنتر ميلان':'Inter Milan','ميلان':'AC Milan','روما':'Roma','الهلال':'Al Hilal','النصر':'Al Nassr','الأهلي':'Al Ahly','الزمالك':'Zamalek'};
const translatedArabic = new Map([
  ['\u0645\u0635\u0631','Egypt'],['\u0627\u0644\u0645\u063a\u0631\u0628','Morocco'],['\u0627\u0644\u062c\u0632\u0627\u0626\u0631','Algeria'],['\u062a\u0648\u0646\u0633','Tunisia'],['\u0644\u064a\u0628\u064a\u0627','Libya'],['\u0627\u0644\u0633\u0648\u062f\u0627\u0646','Sudan'],['\u0627\u0644\u0643\u0648\u0646\u063a\u0648','Congo'],['\u062a\u0648\u062c\u0648','Togo'],['\u0633\u064a\u0631\u0627\u0644\u064a\u0648\u0646','Sierra Leone'],['\u0627\u0644\u0633\u0646\u063a\u0627\u0644','Senegal'],['\u0646\u064a\u062c\u064a\u0631\u064a\u0627','Nigeria'],['\u063a\u0627\u0646\u0627','Ghana'],['\u063a\u064a\u0646\u064a\u0627','Guinea'],['\u0645\u0627\u0644\u064a','Mali'],['\u0627\u0644\u0646\u064a\u062c\u0631','Niger'],['\u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0648\u0646','Cameroon'],['\u0643\u064a\u0646\u064a\u0627','Kenya'],['\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629','Saudi Arabia'],['\u0627\u0644\u0639\u0631\u0627\u0642','Iraq'],['\u0642\u0637\u0631','Qatar'],['\u0627\u0644\u0627\u0645\u0627\u0631\u0627\u062a','United Arab Emirates'],['\u0639\u0645\u0627\u0646','Oman'],['\u0627\u0644\u0643\u0648\u064a\u062a','Kuwait'],['\u0627\u0644\u0627\u0631\u062f\u0646','Jordan'],['\u0633\u0648\u0631\u064a\u0627','Syria'],['\u0644\u0628\u0646\u0627\u0646','Lebanon'],['\u0641\u0644\u0633\u0637\u064a\u0646','Palestine'],['\u0641\u0631\u0646\u0633\u0627','France'],['\u0627\u0646\u062c\u0644\u062a\u0631\u0627','England'],['\u0627\u0633\u0628\u0627\u0646\u064a\u0627','Spain'],['\u0627\u0644\u0645\u0627\u0646\u064a\u0627','Germany'],['\u0627\u064a\u0637\u0627\u0644\u064a\u0627','Italy'],['\u0627\u0644\u0628\u0631\u062a\u063a\u0627\u0644','Portugal'],['\u0628\u0631\u0634\u0644\u0648\u0646\u0629','Barcelona'],['\u0631\u064a\u0627\u0644 \u0645\u062f\u0631\u064a\u062f','Real Madrid'],['\u0644\u064a\u0641\u0631\u0628\u0648\u0644','Liverpool'],['\u0627\u0631\u0633\u0646\u0627\u0644','Arsenal'],['\u0627\u0644\u0647\u0644\u0627\u0644','Al Hilal'],['\u0627\u0644\u0646\u0635\u0631','Al Nassr'],['\u0627\u0644\u0627\u0647\u0644\u064a','Al Ahly'],['\u0627\u0644\u0632\u0645\u0627\u0644\u0643','Zamalek']
]);
const arabicLetters = {1575:'a',1571:'a',1573:'i',1570:'a',1576:'b',1578:'t',1579:'th',1580:'j',1581:'h',1582:'kh',1583:'d',1584:'dh',1585:'r',1586:'z',1587:'s',1588:'sh',1589:'s',1590:'d',1591:'t',1592:'z',1593:'a',1594:'gh',1601:'f',1602:'q',1603:'k',1604:'l',1605:'m',1606:'n',1607:'h',1608:'w',1609:'a',1610:'y',1577:'a',1569:'',1574:'y'};
function englishName(value) {
  const text = clean(value).normalize('NFC').replace(/\s+/g, ' ').trim();
  if (translatedArabic.has(text)) return translatedArabic.get(text);
  if (![...text].some(ch => ch.codePointAt(0) >= 0x600 && ch.codePointAt(0) <= 0x6ff)) return text;
  return [...text].map(ch => arabicLetters[ch.codePointAt(0)] ?? ch).join('').replace(/\s+/g, ' ').trim().replace(/\b\w/g, ch => ch.toUpperCase());
}
function normalizeTeam(value) {
  let name = englishName(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  name = name.replace(/\b(?:fc|cf|sc|afc|club)\b/g, ' ').replace(/\(.*?\)/g, ' ');
  name = name.replace(/\b(?:women|woman|girls|w)\b/g, ' ').replace(/^the/, '').replace(/ivory coast|cote d ivoire/g, 'ivorycoast').replace(/turkiye|turkey/g, 'turkiye').replace(/dr congo|democratic republic of the congo|drc/g, 'congo dr').replace(/united states|usa/g, 'usa').replace(/cape verde islands/g, 'cape verde').replace(/uae/g, 'united arab emirates');
  return name.replace(/[^a-z0-9]/g, '');
}
function teamKey(teams) { return (teams || []).map(normalizeTeam).filter(Boolean).sort().join('|'); }
function extractEspn(data, source) {
  return (Array.isArray(data.events) ? data.events : []).map(event => {
    const competition = event.competitions?.[0] || {};
    const teams = competition.competitors || [];
    const home = teams.find(team => team.homeAway === 'home') || teams[0];
    const away = teams.find(team => team.homeAway === 'away') || teams[1];
    if (!home?.team?.displayName || !away?.team?.displayName) return null;
    const state = competition.status?.type || event.status?.type || {};
    const live = state.state === 'in';
    const finished = state.state === 'post' || state.completed === true;
    const status = live ? 'Live' : finished ? 'Finished' : 'Fixture';
    const names = [home.team.displayName, away.team.displayName];
    const scores = [home.score, away.score].filter(value => value !== undefined && value !== null && value !== '');
    const score = scores.length === 2 ? scores.join(' - ') : '';
    const link = (event.links || []).find(item => (Array.isArray(item.rel) ? item.rel : [item.rel]).some(rel => rel === 'event' || rel === 'summary'))?.href;
    let watchUrl = '';
    try { const target = new URL(link); if (target.hostname.endsWith('espn.com')) watchUrl = target.href; } catch {}
    const date = event.date ? new Date(event.date) : null;
    const time = !live && !finished && date && !Number.isNaN(date.valueOf()) ? date.toLocaleString('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    const league = competition.notes?.[0]?.headline || event.league?.name || 'Soccer';
    return { title: names.join(' vs '), teams: names, logos: [home.team.logo || '', away.team.logo || ''], source: source.name, sourceId: source.id, sourceUrl: source.url, watchUrl, watchProvider: watchUrl ? 'ESPN match center' : '', live, status, details: [league, score, live ? (state.detail || state.shortDetail || state.displayClock) : finished ? (state.shortDetail || state.detail || 'Full time') : time].filter(Boolean).join(' · ') };
  }).filter(Boolean);
}
function extract(html, source) {
  if (source.id === 'panda' || source.id === 'yalla') {
    const items = [];
    const blocks = html.match(/<div\b[^>]*class=["'][^"']*\bAY_Match\b[^"']*["'][^>]*>[\s\S]*?(?=<div\b[^>]*class=["'][^"']*\bAY_Match\b|$)/gi) || [];
    for (const block of blocks) {
      const teamData = [...block.matchAll(/<div\b[^>]*class=["'][^"']*\bMT_Team\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)].map(m => m[1]);
      const names = teamData.map(part => clean((part.match(/class=["'][^"']*\bTM_Name\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [,''])[1]));
      if (names.length < 2) continue;
      const logos = teamData.map(part => { const tag = part.match(/<img\b[^>]*>/i)?.[0] || ''; const raw = (tag.match(/(?:data-src|src)=["']([^"']+)/i) || [,''])[1]; if (!raw || raw.startsWith('data:')) return ''; try { return new URL(raw, source.url).href; } catch { return ''; } });
      const infoBlock = (block.match(/<div\b[^>]*class=["'][^"']*\bMT_Info\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [,''])[1];
      const info = [...infoBlock.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m => englishName(m[1])).join(' · ');
      const className = (block.match(/class=["']([^"']*\bAY_Match\b[^"']*)["']/i) || [,''])[1];
      const time = (block.match(/class=["'][^"']*\bMT_Time\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i) || [,''])[1];
      const score = [...block.matchAll(/class=["'][^"']*\bRS-goals\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi)].map(m => clean(m[1])).join('–');
      const statText = englishName((block.match(/class=["'][^"']*\bMT_Stat\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i) || [,''])[1]);
      const status = /finished|ended|complete|full time/i.test(`${className} ${statText}`) ? 'Finished' : /live|in-progress|ongoing|playing|started|جارية|مباشر/i.test(`${className} ${statText}`) ? 'Live' : 'Scheduled';
      const title = `${englishName(names[0])} vs ${englishName(names[1])}`;
      const link = (block.match(/<a\b[^>]*href=["']([^"']+)["']/i) || [,''])[1];
      let watchUrl = ''; try { const resolved = new URL(link, source.url); if (['yalla-shoot.ltd', 'a5.pandab-hd.com'].includes(resolved.hostname) && !/\.(?:m3u8|mp4|mpd)(?:$|\?)/i.test(resolved.href)) watchUrl = resolved.href; } catch {}
      items.push({ title, teams: [englishName(names[0]), englishName(names[1])], logos, source: source.name, sourceId: source.id, sourceUrl: source.url, watchUrl, live: status === 'Live', status, details: [clean(time), score && `${score}`, info].filter(Boolean).join(' · ') });
    }
    return items;
  }
  if (source.id === 'ball16') {
    const matches = new Map();
    const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let item;
    while ((item = re.exec(html))) {
      let url; try { url = new URL(item[1], source.url); } catch { continue; }
      if (url.hostname !== 'afr.808ball16.com' || !url.pathname.startsWith('/football/')) continue;
      const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
      const pair = slug.match(/^(?:\d+-)?(?:live-)?(.+?)-vs-(.+?)(?:-live-stream(?:-|$)|\.html$|$)/i);
      if (!pair) continue;
      const teams = [pair[1].replace(/-/g, ' '), pair[2].replace(/-/g, ' ')].map(englishName);
      if (teams.some(team => !team)) continue;
      const title = `${teams[0]} vs ${teams[1]}`;
      const key = teamKey(teams);
      const cardText = clean(item[2]);
      const live = /\bLIVE\b|\bHT\b|\b1H\b|\b2H\b|\bET\b|\b(?:\d{1,3})\s*['′]/i.test(cardText);
      const finished = /\bFT\b|\bAET\b|Full Time/i.test(cardText);
      const score = (cardText.match(/\b\d{1,2}\s*[-:–]\s*\d{1,2}\b/) || [,''])[0];
      const imgs = [...item[2].matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
      const logoFor = team => {
        const tag = imgs.find(img => normalizeTeam((img.match(/\balt=["']([^"']+)/i) || [,''])[1]).includes(normalizeTeam(team))) || imgs.shift();
        if (!tag) return '';
        const srcSet = (tag.match(/\bsrcSet=["']([^"']+)/i) || [,''])[1].replace(/&amp;/g,'&');
        const src = (tag.match(/\bsrc=["']([^"']+)/i) || [,''])[1].replace(/&amp;/g,'&');
        const candidate = srcSet ? srcSet.split(',')[0].trim().split(/\s+/)[0] : src;
        try { return new URL(candidate, source.url).href; } catch { return ''; }
      };
      const logos = teams.map(logoFor);
      const time = (cardText.match(/(?:\d{1,3}(?:\+\d{1,2})?\s*['′]|\bHT\b|\bFT\b|\bAET\b|\b\d{1,2}:\d{2}\b)/i) || [,''])[0];
      if (!matches.has(key)) matches.set(key, { title, teams, logos, source: source.name, sourceId: source.id, sourceUrl: url.href, watchUrl: url.href, live: live && !finished, status: finished ? 'Finished' : live ? 'Live' : 'Fixture', details: [score, time].filter(Boolean).join(' · ') || cardText.slice(0, 80) });
    }
    return [...matches.values()];
  }
  if (source.id === 'livesports') {
    // The page is an SSR application shell; import only identifiable match links exposed in its HTML.
    const items = new Map();
    const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html))) {
      const title = clean(m[2]);
      const teams = title.split(/\s+(?:vs\.?|v\.?)\s+/i).map(englishName);
      if (teams.length !== 2 || teams.some(team => team.length < 2 || team.length > 50)) continue;
      let url; try { url = new URL(m[1], source.url); } catch { continue; }
      if (url.hostname !== new URL(source.url).hostname || !/[?&]matchId=\d+/i.test(url.href)) continue;
      const key = teamKey(teams);
      if (!items.has(key)) items.set(key, { title: teams.join(' vs '), teams, logos: [], source: source.name, sourceId: source.id, sourceUrl: url.href, watchUrl: url.href, live: /live|now/i.test(title), status: /live|now/i.test(title) ? 'Live' : 'Fixture', details: '' });
    }
    return [...items.values()];
  }
  const items = new Map();
  // No fixture extractor is defined for unconfigured source types.
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const title = clean(m[2]);
    if (title.length < 8 || title.length > 180 || !/[A-Za-z\u0600-\u06FF]/.test(title)) continue;
    if (!/(vs\.?|v\.?|\bLIVE\b|\bToday\b|\bFootball\b|\bStream\b|مباشر|اليوم|كورة)/i.test(title)) continue;
    let url; try { url = new URL(m[1], source.url).href; } catch { continue; }
    if (url.startsWith('javascript:') || url.startsWith('mailto:')) continue;
    const key = title.toLowerCase();
    if (!items.has(key)) items.set(key, { title, source: source.name, sourceId: source.id, sourceUrl: source.url, live: /\bLIVE\b|مباشر/i.test(title), status: /\bLIVE\b|مباشر/i.test(title) ? 'Live' : 'Fixture' });
  }
  return [...items.values()].slice(0, 40);
}
async function feed() {
  const results = await Promise.all(sources.map(async source => {
    try {
      if (source.kind === 'scoreboard') {
        const response = await fetch(source.apiUrl, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; OlofofoTV/1.0; +fixture summaries)', accept: 'application/json' }, signal: AbortSignal.timeout(18000) });
        if (!response.ok) throw new Error(`HTTP ${response.status} at ESPN scoreboard`);
        const matches = extractEspn(await response.json(), source);
        const note = matches.length ? 'Scores, schedules and match centers only; this feed does not provide a stream.' : 'No soccer events were exposed on this refresh. This channel provides scores and match centers, not streams.';
        const data = { ...source, matches, fetchedAt: new Date().toISOString(), status: 'ok', note };
        cache.set(source.id, data); return data;
      }
      const pages = source.pages || [source.url];
      const pageResults = await Promise.all(pages.map(async (pageUrl, index) => {
        const response = await fetch(pageUrl, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; OlofofoTV/1.0; +fixture summaries)' }, signal: AbortSignal.timeout(18000) });
        if (!response.ok) throw new Error(`HTTP ${response.status} at ${new URL(pageUrl).pathname}`);
        const html = await response.text();
        const pageSource = { ...source, url: pageUrl };
        const label = source.id === 'panda' ? ['Yesterday', 'Today', 'Tomorrow'][index] : '';
        return extract(html, pageSource).map(match => ({ ...match, details: [label, match.details].filter(Boolean).join(' · ') }));
      }));
      const unique = new Map();
      for (const match of pageResults.flat()) {
        const key = match.watchUrl || `${teamKey(match.teams)}|${match.details}`;
        if (!unique.has(key)) unique.set(key, match);
      }
      const matches = [...unique.values()];
      const note = matches.length ? '' : source.id === 'livesports' || source.id === 'ball16' ? 'This source renders its schedule in a client-side app and did not expose match records in the public HTML available to this server.' : source.id === 'yalla' ? 'Yalla Shoot did not expose match cards on its today page during this refresh.' : 'No match cards were exposed on the yesterday, today, or tomorrow pages.';
      const data = { ...source, matches, fetchedAt: new Date().toISOString(), status: 'ok', note };
      cache.set(source.id, data); return data;
    } catch (e) {
      return cache.get(source.id) || { ...source, matches: [], status: 'unavailable', note: `Could not refresh this source (${e.message}). Try again later.` };
    }
  }));
  return { updatedAt: new Date().toISOString(), sources: results };
}
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (pathname === '/api/matches') {
    res.writeHead(200, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'access-control-allow-origin':'*' });
    res.end(JSON.stringify(await feed())); return;
  }
  const requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const file = path.resolve(ROOT, requested);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' }); res.end(data);
  });
});
server.listen(PORT, () => console.log(`Olofofo TV running at http://localhost:${PORT}`));
