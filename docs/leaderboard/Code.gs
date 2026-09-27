// OVERRIDE 무한 방어선 온라인 순위표 (구글 시트 + Apps Script)
// 시트 "scores"에 한 줄씩 쌓고, 닉네임마다 가장 높은 점수만 순위에 올린다.
const SHEET = 'scores';
const TOP_N = 50;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(['time', 'name', 'score', 'wave', 'deck', 'board']); }
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// 닉네임별 최고 기록. 점수가 높은 순, 점수가 같으면 웨이브가 높은 순
function ranking_() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const best = {};
  for (const [time, name, score, wave, deck, board] of rows) {
    const s = Number(score) || 0;
    const w = Number(wave) || 0;
    if (!best[name] || s > best[name].score || (s === best[name].score && w > best[name].wave)) best[name] = { name: String(name), score: s, wave: Number(wave) || 0, deck: String(deck || ''), board: String(board || '') };
  }
  return Object.values(best).sort((a, b) => b.score - a.score || b.wave - a.wave);
}

// 순위 보기: GET ?top=50
function doGet(e) {
  const list = ranking_();
  return json_({ ok: true, total: list.length, top: list.slice(0, TOP_N) });
}

// 기록 올리기: POST {"name","score","wave","deck","board"}  board는 마지막 판의 기체와 레벨 (예: "f8,t7,e5")
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
  const cache = CacheService.getScriptCache(), key = 'n:' + name;
  if (cache.get(key)) return json_({ ok: false, err: 'wait' });
  cache.put(key, '1', 20);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try { sheet_().appendRow([new Date(), name, score, wave, deck, board]); } finally { lock.releaseLock(); }
  const list = ranking_();
  const rank = list.findIndex(r => r.name === name) + 1;
  return json_({ ok: true, rank, total: list.length, best: list[rank - 1] });
}
