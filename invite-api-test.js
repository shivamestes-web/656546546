import { steam, user, friends, utils } from '@node-3d/steam-api';

const APP_ID = 730;
const log = (...args) => console.log('[invite-api-test]', ...args);

async function main() {
  log('Test diagnostyczny API zaproszeń CS2 — niczego nie wysyła.');
  if (!steam.isSteamRunning()) throw new Error('Steam nie działa. Uruchom klienta Steam.');

  const init = steam.initEx();
  if (!init?.ok) throw new Error(`Steamworks Init nie powiódł się: ${init?.errorMessage || 'brak szczegółów'}`);

  try {
    const appId = Number(utils.getAppId());
    log('AppID:', appId);
    if (appId !== APP_ID) throw new Error(`Oczekiwano AppID ${APP_ID}, otrzymano ${appId}.`);
    if (!user.isLoggedOn()) throw new Error('Brak aktywnego zalogowania Steamworks.');

    log('Zalogowane SteamID64:', String(user.getSteamId()));
    log('Dostępne metody friends:', Object.keys(friends).sort().join(', ') || '(brak enumerowalnych metod)');

    const candidates = ['inviteUserToGame', 'setRichPresence', 'clearRichPresence', 'getFriendGamePlayed'];
    for (const name of candidates) {
      log(`${name}:`, typeof friends[name]);
    }

    if (typeof friends.inviteUserToGame === 'function') {
      log('WYNIK: biblioteka udostępnia InviteUserToGame.');
      log('Nie wysłano zaproszenia: ta funkcja wymaga prawidłowego connectString (np. adresu serwera), a nie pustej wartości.');
      log('To nadal nie oznacza zaproszenia do party CS2 — trzeba osobno ustalić format połączenia obsługiwany przez CS2.');
    } else {
      log('WYNIK: ta wersja @node-3d/steam-api NIE udostępnia InviteUserToGame.');
      log('Nie da się wysłać zaproszenia do gry tą biblioteką bez dodania obsługi natywnej Steamworks.');
      log('Nie wysłano żadnych zaproszeń. Nie wykonano drugiego logowania.');
    }
  } finally {
    try { steam.shutdown(); } catch {}
  }
}

main().catch(error => {
  log('BŁĄD:', error?.message || String(error));
  process.exitCode = 1;
});
