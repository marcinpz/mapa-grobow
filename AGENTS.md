# Instrukcje dla agentów — mapa-grobow (PUBLICZNE)

## Granica danych
Repozytorium jest PUBLICZNE. Każdy plik, historia commitów, issue, PR i artefakt Pages może zostać odczytany przez osoby postronne.

**Tu zapisuj:**
- nagrobki, napisy i zdjęcia nagrobków przeznaczone do publikacji;
- osoby zmarłe, daty z nagrobków, miejsca pochówku, współrzędne grobów (jeśli potwierdzone);
- publiczną aplikację mapy, wyszukiwarkę, opisy cmentarzy, źródła i poziomy pewności odczytu.

**Tu NIE zapisuj:**
- danych żyjących krewnych, małżeństw i pokrewieństwa ujawniającego ich rodzinne powiązania;
- adresów domowych, miejsc pobytu żyjących osób, historii prywatnego domu;
- prywatnych zdjęć rodzinnych, notatek z rozmów i pełnego drzewa genealogicznego;
- tokenów, kluczy i jakiejkolwiek kopii prywatnego repozytorium.

Dane prywatne należą do `marcinpz/rodzina-genealogia` (repozytorium PRIVATE). Nigdy nie dodawaj prywatnego repo jako submodule, git subtree, dependency, artifact ani input do GitHub Actions/Pages tego repo. Nie pobieraj go w buildzie ani w kodzie klienta. Nie linkuj publicznie do prywatnych osób lub prywatnych plików.

## Współdziałanie
- Publiczny rekord osoby ma stabilne `id`; rekord grobu ma stabilne `id` oraz identyfikator cmentarza.
- Prywatna genealogia może wskazywać publiczny rekord przez `publicRef: {repository, cemetery, personId, graveId}`. Kierunek referencji: PRIVATE → PUBLIC, nigdy odwrotnie.
- Nie zakładaj, że nazwiska i imiona są unikalne; rozróżniaj osoby identyfikatorami.
- Zmiany danych z nagrobka najpierw weryfikuj w tym repo, następnie aktualizuj referencje prywatne, jeśli potrzeba.
- Niepewne daty zapisuj z jawnym poziomem pewności; nie zgaduj brakujących cyfr.
- Jeśli dane mieszają fakty publiczne z relacjami prywatnymi, rozdziel je przed commitem.
- Jeśli dane prywatne trafiły do historii publicznego Git, samo usunięcie pliku nie usuwa ich z historii: zgłoś potrzebę przeglądu i ewentualnego przepisania historii.

## Pliki
- `data/jablonka.json`, `data/orawka.json` — katalog grobów i osób zmarłych.
- `docs/PRIVACY.md` — dodatkowe reguły publikacji.
- `scripts/build.py` — publikacja wyłącznie dozwolonych zasobów publicznych.

Repozytorium powiązane: `marcinpz/rodzina-genealogia` (PRIVATE, tylko dla uprawnionych).
