# Mapa Grobów

Publiczny katalog grobów z mapą OpenStreetMap. Prywatne relacje rodzinne przechowywane są osobno w repozytorium `marcinpz/rodzina-genealogia`.

## Status
Statyczna aplikacja obejmuje 11 grobów: pięć w Jabłonce i sześć w Orawce, filtr cmentarza, wyszukiwarkę i karty nagrobków.
Adres docelowy: https://marcinpz.github.io/mapa-grobow/.
Strona jest publikowana przez GitHub Actions do GitHub Pages.

- [Dane z Jabłonki](data/jablonka.json)
- [Dane z Orawki](data/orawka.json)
- [Plan MVP](docs/MVP.md)

Wszystkie pięć grobów w Jabłonce ma zdjęcia: łącznie 10 fotografii, w tym osiem z katalogu parafii i dwa zdjęcia użytkownika. Miniatury widać na liście, pełne zdjęcia i źródła w szczegółach. Zdjęcia Orawki czekają na import. Daty niepewne oznaczono do weryfikacji.

Fotografie z rozmowy przygotowano w osobnym archiwum ZIP, ale nie zostały jeszcze zaimportowane do repozytorium.
Groby bez zaimportowanych zdjęć mają pustą tablicę photos i photosPending: true. Dokładne współrzędne
grobów nie pochodzą z pomiaru GPS. Wszystkie pięć grobów Jabłonki ma znaczniki oszacowane z numerowanych planów parafii: L-12-9, L-12-10, H-10-18, H-7-23 i A-11-1. Sześć grobów Orawki nadal wymaga ustalenia pozycji; mapa wskazuje tam tylko cmentarz.

Pozycje Jabłonki odtwarza `python scripts/locate_jablonka.py`: środki grobów na oryginalnych obrazach sektorów są przeliczane macierzami z `docs/overlay-alignment.json`. Rekordy zachowują źródło, piksel planu i oznaczenie przybliżonej dokładności.

## Plan cmentarza w Jabłonce

Fotografia tablicy z 2.11.2026 pozostaje w zasobach źródłowych; interfejs mapy korzysta z nakładki planów sektorów. Plik w `plans/` jest publikowany tylko wtedy, gdy wskazują go dane cmentarza. Zdjęcia mają usunięte metadane EXIF; nadrukowane informacje pozostawiono jako część materiału źródłowego.

Domyślny widok głównej mapy to zdjęcia satelitarne Esri z nakładką 11 oryginalnych sektorów parafii (A–H, J–L). Przycisk pod mapą ukrywa plan, a suwak reguluje jego widoczność. Nakładka znika po wybraniu Orawki. Można powiększyć plan do poziomu 21; szczegółowość zdjęć Esri ograniczona jest do poziomu 19.

Nakładka `plans/jablonka-sectors-overlay.webp` powstała przez dopasowanie sektorów do wspólnego podkładu parafialnego (SIFT/RANSAC), a następnie orientacyjne dopasowanie sześciu punktów ogrodzenia i alejek do zdjęć Esri w Web Mercator. Parametry i reszty dopasowania zapisano w `docs/overlay-alignment.json`. Reszty punktów kontrolnych wynoszą około 2–12 pikseli obrazu referencyjnego; nie są niezależnym pomiarem dokładności GPS. Plan jest orientacyjny i nie potwierdza współrzędnych grobów. Fotografia tablicy pozostaje osobnym materiałem źródłowym.

Źródła sektorów: `https://parafiajablonka.katolicki.eu/cmentarz/4181/mapa_podklady/1-sektor%20{litera}.jpg` (małe litery a–h, j–l). Podkład do wspólnego dopasowania: `https://parafiajablonka.katolicki.eu/cmentarz/4181/mapa_podklady/cmentarz/h_polygon.jpg`. Nakładka zawiera wyłącznie plan parafii; obraz referencyjny Esri nie jest publikowany w repozytorium. Atrybucja planu i warstwy satelitarnej widoczna jest na mapie.

## Publikacja i sprawdzanie

Integralność wszystkich publikowanych zdjęć i planów jest sprawdzana na podstawie `data/asset-checksums.json` (SHA-256), zarówno przed budowaniem, jak i po pobraniu zasobów w testach strony. Po świadomej zmianie zdjęcia należy zaktualizować jego sumę kontrolną. Samo wyświetlenie obrazu przez przeglądarkę nie gwarantuje kompletności JPEG.

Parafia udostępnia [wyszukiwarkę grobów](https://polskie-cmentarze.info/wyszukiwarka.php?clientId=4181) i [oryginalny plan sektora H, 1722 × 1118 px](https://parafiajablonka.katolicki.eu/cmentarz/4181/mapa_podklady/1-sektor%20h.jpg). Grób Basisty / Pilch ma oznaczenie **H-10-18**. Zdjęcie inskrypcji z serwera parafii potwierdza datę śmierci Anny Basisty: **19.11.2018**. Źródła sprawdzono 2.11.2026; odsyłacze dostępne są także w aplikacji. Plan sektora nie obejmuje całego cmentarza i nie dostarcza współrzędnych GPS.

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

## Galeria i nawigacja

Domyślny widok to galeria fotografii. Kliknięcie karty otwiera przeglądarkę zdjęć: strzałki, gest przesunięcia na telefonie i klawisze strzałek zmieniają zdjęcie. Górne przyciski przechodzą między grobami w aktualnych wynikach. Escape i Wróć zamykają grób. Adresy #grave/<id> pozwalają udostępnić konkretny grób; historia przeglądarki zachowuje nawigację.

Zakładka Mapa pokazuje mapę satelitarną z planem, a Pokaż na mapie przybliża wybrany grób. Źródła są dostępne w rozwijanej sekcji. Publiczny interfejs nie zawiera edytora współrzędnych; pozycje aktualizuje się w danych repozytorium.
