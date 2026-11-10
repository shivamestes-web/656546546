import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { steam, user, matchmaking, utils } from '@node-3d/steam-api';

const execFileAsync = promisify(execFile);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const APP_ID = 730;
const LOG_PATH = path.join(ROOT, 'invite-lobby-log.txt');
const TARGETS_PATH = path.join(ROOT, 'zaproszenia.txt');
const LOBBY_PATH = path.join(ROOT, 'lobby.txt');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const logs = [];

function log(message = '') {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  console.log(line);
  logs.push(line);
}
function saveLog() {
  try { fs.writeFileSync(LOG_PATH, logs.join(os.EOL) + os.EOL, 'utf8'); } catch {}
}
function read(name) {
  const p = path.join(ROOT, name);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}
function readTargets() {
  const ids = [];
  for (const raw of read('zaproszenia.txt').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/(?:^|\D)(7656119\d{10})(?:\D|$)/);
    if (!m) throw new Error(`Nieprawidłowy wpis w zaproszenia.txt: ${line}. Wpisuj SteamID64.`);
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}
function isValidSteamId(id) { return /^7656119\d{10}$/.test(String(id)); }

// Wyciąga wyłącznie ID z pełnego linku joinlobby. Nie traktuje dowolnego
// 17-cyfrowego numeru znalezionego na stronie profilu jako ID lobby.
function parseJoinLobbyLinks(input, expectedSteamId) {
  if (!input) return [];
  let text = String(input)
    .replace(/&amp;/gi, '&')
    .replace(/&#58;|&colon;/gi, ':')
    .replace(/&#x3a;/gi, ':')
    .replace(/&#47;|&#x2f;/gi, '/')
    .replace(/\\\//g, '/');
  try { text = decodeURIComponent(text); } catch {}
  const found = [];
  const re = /steam:\/\/joinlobby\/730\/(\d{17,20})\/(7656119\d{10})/gi;
  for (const m of text.matchAll(re)) {
    const lobbyId = m[1];
    const ownerId = m[2];
    if (ownerId !== String(expectedSteamId)) continue;
    if (!found.includes(lobbyId)) found.push(lobbyId);
  }
  return found;
}
function parseLobby(text) {
  if (!text) return null;
  const s = String(text);
  const m = s.match(/(?:\+connect_lobby\s+|steam:\/\/joinlobby\/730\/)(\d{17,20})/i);
  return m?.[1] || null;
}
async function profileLobby(mySteamId) {
  const profileUrl = `https://steamcommunity.com/profiles/${encodeURIComponent(mySteamId)}/`;
  log(`Sprawdzam publiczny profil Steam: ${profileUrl}`);
  if (typeof fetch !== 'function') {
    log('Odczyt profilu pominięty: ta wersja Node.js nie udostępnia fetch. Wymagany Node.js 18 lub nowszy.');
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(profileUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    if (!response.ok) {
      log(`Profil Steam zwrócił HTTP ${response.status}; nie udało się odczytać linku lobby.`);
      return null;
    }
    const html = await response.text();
    const ids = parseJoinLobbyLinks(html, mySteamId);
    if (!ids.length) {
      log('Na publicznej stronie profilu nie znaleziono linku joinlobby/730 dla tego konta. Profil może go nie udostępniać lub link mógł wygasnąć.');
      return null;
    }
    if (ids.length > 1) log(`Profil zawiera ${ids.length} linków lobby; sprawdzę je po kolei.`);
    return ids.map(id => ({ id, source: 'publiczny profil Steam' }));
  } catch (e) {
    const reason = e?.name === 'AbortError' ? 'przekroczono limit 12 sekund' : (e?.message || String(e));
    log(`Nie udało się pobrać profilu Steam: ${reason}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
async function processCommandLineLobby() {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile', '-Command',
        "(Get-CimInstance Win32_Process -Filter \"name='cs2.exe'\" | Select-Object -First 1 -ExpandProperty CommandLine)"
      ], { windowsHide: true, timeout: 8000 });
      return parseLobby(stdout);
    }
    const { stdout } = await execFileAsync('ps', ['-A', '-o', 'args=']);
    const line = stdout.split(/\r?\n/).find(x => /(^|\/)cs2(?:\.exe)?\b/i.test(x));
    return parseLobby(line || '');
  } catch { return null; }
}
function readManualLobby() {
  const raw = read('lobby.txt').split(/\r?\n/).filter(x => !x.trim().startsWith('#')).join(' ');
  return parseLobby(raw);
}
function verifyMembership(lobbyId, mySteamId) {
  try {
    const count = matchmaking.getNumLobbyMembers(lobbyId);
    if (!Number.isInteger(count) || count < 1 || count > 250) return false;
    for (let i = 0; i < count; i++) {
      const member = String(matchmaking.getLobbyMemberByIndex(lobbyId, i));
      if (member === String(mySteamId)) return true;
    }
  } catch (e) {
    log(`Weryfikacja członkostwa nie powiodła się: ${e.message}`);
  }
  return false;
}
async function findCurrentLobby(mySteamId) {
  const candidates = [];
  const fromArgs = await processCommandLineLobby();
  if (fromArgs) candidates.push({ id: fromArgs, source: 'argumenty procesu CS2' });

  // Główne nowe źródło: aktualny link Steam udostępniony na publicznym profilu.
  const fromProfile = await profileLobby(mySteamId);
  if (fromProfile) candidates.push(...fromProfile);

  const manual = readManualLobby();
  if (manual) candidates.push({ id: manual, source: 'lobby.txt (awaryjnie)' });

  const unique = [...new Map(candidates.map(x => [x.id, x])).values()];
  if (!unique.length) log('Nie znaleziono żadnego kandydata lobby w argumentach CS2, profilu Steam ani lobby.txt.');
  for (const candidate of unique) {
    log(`Kandydat lobby: ${candidate.id} (źródło: ${candidate.source})`);
    if (verifyMembership(candidate.id, mySteamId)) return candidate;
    log(`Odrzucono ${candidate.id}: lokalne konto nie zostało potwierdzone jako członek lobby.`);
  }
  return null;
}

async function main() {
  const targets = readTargets();
  if (!targets.length) throw new Error('Lista zaproszeń jest pusta. Dodaj SteamID64 do zaproszenia.txt.');

  log('=== CS2 Lobby Inviter 2.1 ===');
  log('Tryb: lokalny Steamworks + odczyt publicznego profilu; bez QR, hasła, tokena i drugiego logowania.');
  if (!steam.isSteamRunning()) throw new Error('Klient Steam nie działa. Uruchom Steam i zaloguj się normalnie.');

  const init = steam.initEx();
  if (!init?.ok) throw new Error(`Steamworks Init nie powiódł się: ${init?.errorMessage || 'brak szczegółów'}`);
  try {
    const appId = Number(utils.getAppId());
    if (appId !== APP_ID) throw new Error(`Nieprawidłowy AppID (${appId}). Uruchom z plikiem steam_appid.txt=730.`);
    if (!user.isLoggedOn()) throw new Error('Steamworks nie widzi aktywnego zalogowania. Zaloguj się w kliencie Steam.');

    const mySteamId = String(user.getSteamId());
    if (!isValidSteamId(mySteamId)) throw new Error(`Steamworks zwrócił nieprawidłowy SteamID64: ${mySteamId}`);
    log(`Aktywne konto Steam: ${mySteamId}`);
    log(`Odbiorcy na liście: ${targets.length}`);

    const lobby = await findCurrentLobby(mySteamId);
    if (!lobby) {
      throw new Error('Nie udało się potwierdzić lobby. Profil nie udostępnił pasującego linku albo Steamworks nie potwierdził członkostwa. Sprawdź widoczność profilu/linku i spróbuj ponownie. Nie wysłano żadnych zaproszeń.');
    }
    log(`Potwierdzono lobby ${lobby.id} (${lobby.source}).`);

    let sent = 0, skipped = 0, failed = 0;
    for (const target of targets) {
      if (!isValidSteamId(target) || target === mySteamId) { skipped++; continue; }
      try {
        const ok = matchmaking.inviteUserToLobby(lobby.id, target);
        if (ok) { sent++; log(`Wysłano zaproszenie do ${target}.`); }
        else { failed++; log(`Steam odrzucił zaproszenie do ${target}.`); }
      } catch (e) {
        failed++;
        log(`Błąd dla ${target}: ${e.message}`);
      }
      await sleep(900);
    }
    log(`Koniec. Wysłane: ${sent}; pominięte: ${skipped}; błędy: ${failed}.`);
  } finally {
    try { steam.shutdown(); } catch {}
  }
}

main().catch(error => {
  log(`BŁĄD: ${error?.message || error}`);
}).finally(saveLog);
