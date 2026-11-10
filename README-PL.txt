TEST API ZAPROSZEŃ — CS2

Ten test niczego nie wysyła. Sprawdza, czy zainstalowana wersja
@node-3d/steam-api udostępnia funkcję friends.inviteUserToGame.

1. Skopiuj invite-api-test.js do folderu programu.
2. Upewnij się, że w tym folderze jest package.json z type=module
   oraz zainstalowany @node-3d/steam-api.
3. Uruchom Steam i zaloguj się normalnie.
4. Uruchom w terminalu:
   node invite-api-test.js
5. Prześlij plik/tekst wyniku z konsoli.

Uwaga techniczna:
Valve opisuje InviteUserToGame jako zaproszenie z connectString, np.
adresem serwera. Funkcja nie tworzy party/lobby i nie wymyśla celu
połączenia. Dokumentacja aktualnej biblioteki @node-3d/steam-api opisuje
Rich Presence, ale nie wymienia InviteUserToGame. Test sprawdza faktyczną
obecność metody w zainstalowanym module.

Dotychczasowy invite-lobby.js pozostaje bez zmian. Nie podmieniaj go tym
plikiem — to osobny test diagnostyczny.
