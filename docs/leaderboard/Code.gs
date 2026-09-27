// OVERRIDE 무한 방어선 온라인 순위표 (구글 시트 + Apps Script)
// 시트 "scores"에 한 줄씩 쌓고, 닉네임마다 가장 높은 점수만 순위에 올린다.
const SHEET = 'scores';
const DAILY = 'daily';
const TOP_N = 50;

// 시트에 붙인 스크립트면 그 시트를, script.google.com에서 따로 만든 스크립트면 순위용 시트를 처음 한 번 만들어 쓴다
function book_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create('OVERRIDE 순위');
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

function sheet_() {
  const ss = book_();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(['time', 'name', 'score', 'wave', 'deck', 'board']); }
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// 오늘의 도전 시트: 날짜 칸이 하나 더 있다
function dailySheet_() {
  const ss = book_();
  let sh = ss.getSheetByName(DAILY);
  if (!sh) { sh = ss.insertSheet(DAILY); sh.appendRow(['time', 'day', 'name', 'score', 'wave', 'deck', 'board']); }
  return sh;
}
// 한국 시간 날짜 (게임과 같은 기준)
function today_(offset) { return Utilities.formatDate(new Date(Date.now() + (offset || 0) * 86400000), 'Asia/Seoul', 'yyyy-MM-dd'); }
function dailyRows_(day) {
  return dailySheet_().getDataRange().getValues().slice(1).filter(r => (r[1] instanceof Date ? Utilities.formatDate(r[1], 'Asia/Seoul', 'yyyy-MM-dd') : String(r[1])) === day).map(r => [r[0]].concat(r.slice(2)));
}

// 닉네임별 최고 기록. 점수가 높은 순, 점수가 같으면 웨이브가 높은 순
function ranking_(rowsIn) {
  const rows = rowsIn || sheet_().getDataRange().getValues().slice(1);
  const best = {};
  for (const [time, name, score, wave, deck, board] of rows) {
    const s = Number(score) || 0;
    const w = Number(wave) || 0;
    if (!best[name] || s > best[name].score || (s === best[name].score && w > best[name].wave)) best[name] = { name: String(name), score: s, wave: Number(wave) || 0, deck: String(deck || ''), board: String(board || '') };
  }
  return Object.values(best).sort((a, b) => b.score - a.score || b.wave - a.wave);
}

// 순위 보기: GET  (?daily=YYYY-MM-DD 면 그날 오늘의 도전 순위)
// v: 2 는 오늘의 도전을 받는 서버라는 표시. 게임은 이걸 보고 오늘의 도전 기록을 올린다
function doGet(e) {
  const day = e && e.parameter && e.parameter.daily;
  const list = day ? ranking_(dailyRows_(String(day).slice(0, 10))) : ranking_();
  return json_({ ok: true, v: 2, day: day || undefined, total: list.length, top: list.slice(0, TOP_N) });
}

// 기록 올리기: POST {"name","score","wave","deck","board"}  board는 마지막 판의 기체와 레벨 (예: "f8,t7,e5")
// 오늘의 도전이면 {"mode":"daily","day":"YYYY-MM-DD"} 가 더 붙는다
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, err: 'bad' }); }
  const name = String(d.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);
  const score = Math.floor(Number(d.score)), wave = Math.floor(Number(d.wave));
  const deck = String(d.deck || '').replace(/[^a-z]/g, '').slice(0, 5);
  const board = (String(d.board || '').match(/[a-z][1-8]/g) || []).slice(0, 24).join(',');
  if (!name) return json_({ ok: false, err: 'name' });
  // 말이 안 되는 점수는 받지 않는다 (웨이브당 점수 상한)
  if (!(wave >= 1 && wave <= 300 && score >= 0 && score <= wave * 2500 + 5000)) return json_({ ok: false, err: 'score' });
  // 같은 닉네임으로 너무 자주 올리지 않게 (20초)
  const daily = d.mode === 'daily', day = String(d.day || '');
  // 오늘의 도전은 오늘이나 어제(자정 직후에 끝난 판) 날짜만 받는다
  if (daily && day !== today_() && day !== today_(-1)) return json_({ ok: false, err: 'day' });
  const cache = CacheService.getScriptCache(), key = (daily ? 'd:' : 'n:') + name;
  if (cache.get(key)) return json_({ ok: false, err: 'wait' });
  cache.put(key, '1', 20);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    if (daily) dailySheet_().appendRow([new Date(), "'" + day, name, score, wave, deck, board]);
    else sheet_().appendRow([new Date(), name, score, wave, deck, board]);
  } finally { lock.releaseLock(); }
  const list = daily ? ranking_(dailyRows_(day)) : ranking_();
  const rank = list.findIndex(r => r.name === name) + 1;
  return json_({ ok: true, rank, total: list.length, best: list[rank - 1] });
}
