CS2 Lobby Inviter 2.1 — automatyczny odczyt lobby z profilu Steam

INTEGRACJA
1. Zrób kopię zapasową dotychczasowego invite-lobby.js.
2. Zastąp go plikiem invite-lobby.js z tej paczki.
3. Wymagany jest Node.js 18 lub nowszy (wbudowane fetch).
4. Zachowaj dotychczasowy package.json, zaproszenia.txt i steam_appid.txt.
5. Uruchom Steam normalnie, wejdź do lobby CS2 i uruchom program.

JAK DZIAŁA
- Program pobiera publiczną stronę https://steamcommunity.com/profiles/STEAMID64/.
- Wyszukuje link steam://joinlobby/730/LOBBYID/STEAMID64.
- Akceptuje tylko link, którego końcowy SteamID64 jest zgodny z aktualnie zalogowanym kontem.
- Przed wysyłką sprawdza członkostwo konta w lobby przez Steamworks.
- Jeśli nie ma linku lub członkostwo nie zostanie potwierdzone, nie wysyła zaproszeń.
- lobby.txt pozostaje awaryjnym źródłem ID.

OGRANICZENIA
Steam musi faktycznie pokazywać link na publicznej stronie profilu. Sam fakt, że link jest widoczny po zalogowaniu w przeglądarce, nie gwarantuje, że anonimowe żądanie programu otrzyma tę samą zawartość. W takim przypadku log wskaże, że linku nie znaleziono. Nie jest używane dodatkowe logowanie, QR, DLL injection ani odczyt pamięci procesu.

Test składni: node --check invite-lobby.js
Test na prawdziwym koncie/lobby wymaga uruchomienia u użytkownika.
