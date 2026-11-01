# Mapa Grobów

Katalog grobów z mapą OpenStreetMap i prywatną warstwą genealogiczną.

## Status
Statyczna aplikacja obejmuje pięć grobów z Jabłonki, wyszukiwarkę i karty nagrobków.
Adres docelowy: https://marcinpz.github.io/mapa-grobow/.
Publikacja wymaga włączenia Settings → Pages → Source: GitHub Actions.
Ostatnio potwierdzony problem: Pages nie było włączone (configure-pages zwracało 404).

- [Dane z Jabłonki](data/jablonka.json)
- [Plan MVP](docs/MVP.md)

Zdjęcia nagrobków czekają na import. Daty i relacje niepewne oznaczono do weryfikacji. Dane żyjących krewnych nie są umieszczane w katalogu publicznym.

W repozytorium ani w plikach dostępnych w tej sesji nie było zdjęć z rozmowy.
Każdy grób ma pustą tablicę photos i photosPending: true. Dokładne współrzędne
wszystkich grobów pozostają nieustalone; mapa pokazuje obszar Jabłonki bez pinezek.

## Publikacja i sprawdzanie

Workflow waliduje dane, tworzy katalog _site z dozwolonych plików publicznych,
sprawdza mapę, wyszukiwanie i karty w Chromium przy szerokościach 360, 390 i 768 px,
a następnie publikuje Pages i powtarza sprawdzenie pod adresem wdrożenia.
Zrzuty ekranu z testów przed publikacją są artefaktem mobile-checks w Actions.
To emulacja telefonu, a nie test na fizycznym urządzeniu.

Lokalnie: python3 scripts/build.py, a po instalacji playwright==1.56.0
i przeglądarki poleceniem python3 -m playwright install chromium:
python3 scripts/mobile_smoke.py. Opcja --offline-map sprawdza obsługę braku biblioteki mapy.

[Zasady prywatności i dodawania zdjęć](docs/PRIVACY.md).


## Powiązanie z prywatną genealogią

Projekt ma dwa niezależne repozytoria:

| Repozytorium | Dostęp | Przeznaczenie |
| --- | --- | --- |
| `marcinpz/mapa-grobow` (to repo) | **Publiczny** | Nagrobki, osoby zmarłe, zdjęcia nagrobków, daty, lokalizacje i mapa cmentarzy |
| `marcinpz/rodzina-genealogia` | **Prywatny** | Drzewo rodzinne, relacje, osoby żyjące, historie rodzinne i materiały prywatne |

**Reguła przepływu:** prywatne repo może odwoływać się do publicznych identyfikatorów grobów i osób; publiczne repo **nigdy** nie pobiera ani nie publikuje prywatnych danych. Repo prywatne nie jest submodułem ani zależnością aplikacji Pages. Szczegółowe instrukcje dla agentów: [AGENTS.md](AGENTS.md).
