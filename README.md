# Mapa Grobów

Publiczny katalog grobów z mapą OpenStreetMap. Prywatne relacje rodzinne przechowywane są osobno w repozytorium `marcinpz/rodzina-genealogia`.

## Status
Statyczna aplikacja obejmuje 11 grobów: pięć w Jabłonce i sześć w Orawce, filtr cmentarza, wyszukiwarkę i karty nagrobków.
Adres docelowy: https://marcinpz.github.io/mapa-grobow/.
Publikacja wymaga włączenia Settings → Pages → Source: GitHub Actions.
Ostatnio potwierdzony problem: Pages nie było włączone (configure-pages zwracało 404).

- [Dane z Jabłonki](data/jablonka.json)
- [Dane z Orawki](data/orawka.json)
- [Plan MVP](docs/MVP.md)

Grób Basisty / Pilch w Jabłonce ma dwa zdjęcia dodane 2.11.2026. Zbliżenie potwierdza daty Andrzeja Pilcha seniora: 30.10.1875–28.07.1941. Pozostałe zdjęcia nagrobków czekają na import. Daty niepewne oznaczono do weryfikacji.

Fotografie z rozmowy przygotowano w osobnym archiwum ZIP, ale nie zostały jeszcze zaimportowane do repozytorium.
Groby bez zaimportowanych zdjęć mają pustą tablicę photos i photosPending: true. Dokładne współrzędne
wszystkich grobów pozostają nieustalone; lista obsługuje oba cmentarze, a mapa nie pokazuje jeszcze pinezek.

## Plan cmentarza w Jabłonce

Pod mapą dostępny jest powiększany plan z fotografii tablicy z 2.11.2026 oraz link do pełnej rozdzielczości. Plik w `plans/` jest publikowany tylko wtedy, gdy wskazują go dane cmentarza. Zdjęcia mają usunięte metadane EXIF; nadrukowane informacje pozostawiono jako część materiału źródłowego.

Plan nie jest jeszcze nakładką geograficzną. Współrzędne nadrukowane na fotografiach są niespójne, a zdjęcie tablicy ma zniekształcenie perspektywiczne. Dokładne nałożenie wymaga dopasowania rozpoznawalnych punktów (np. narożników ogrodzenia i skrzyżowań alejek) do ortofotomapy oraz sprawdzenia zgodności na dodatkowych punktach. Do tego czasu plan służy do odczytywania sektorów i numeracji, nie do wyznaczania GPS grobu.

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

## Zaznaczanie położenia grobu

Otwórz szczegóły grobu i wybierz **Zaznacz położenie grobu**. Włącz zdjęcia lotnicze w przełączniku warstw, kliknij/dotknij właściwe miejsce, w razie potrzeby przeciągnij tymczasową pinezkę, a następnie kliknij **Kopiuj współrzędne**. Aplikacja przygotuje JSON z `cemetery`, `graveId`, `coordinates` i `precision: estimated-from-imagery`.

**Ważne:** publiczna aplikacja nie ma prawa zapisu na GitHubie. Kopiowanie nie aktualizuje repozytorium. Zweryfikowane współrzędne trzeba ręcznie przenieść do pola `location.coordinates` odpowiedniego grobu w `data/jablonka.json` lub `data/orawka.json` i zatwierdzić commit. Nie dodawaj tokenów GitHub do kodu strony. Punkty wybrane na ortofotomapie są orientacyjne i nie powinny być oznaczane jako pomiary GPS.
