# Dane publiczne i prywatne

Repozytorium jest publiczne. Nie zapisuj tutaj danych żyjących krewnych,
prywatnych notatek, kontaktów ani prywatnego drzewa rodzinnego — także w osobnej
gałęzi lub pliku, który nie jest używany przez stronę. Historia Git jest publiczna.
Prywatną warstwę przechowuj poza tym repozytorium. Aplikacja obecnie jej nie pobiera.
Reguły .gitignore są dodatkową ochroną przed przypadkowym dodaniem, nie kontrolą dostępu.

Publikacja tworzy _site z zamkniętej listy: index.html, app.js, .nojekyll,
data/jablonka.json i zdjęcia wskazane w danych. Nie publikuje całego repozytorium.
Walidator wykrywa jawnie oznaczone osoby żyjące i wybrane pola prywatne; nie zastępuje
ręcznego przeglądu treści. Brak daty śmierci sam w sobie nie określa statusu osoby.

Zdjęcia dodawaj do photos/<id-grobu>/ po sprawdzeniu inskrypcji i praw do publikacji.
Usuń metadane EXIF i sprawdź, czy obraz nie ujawnia danych żyjących osób.
W rekordzie właściwego grobu ustaw np. "photos": ["photos/grave-001/front.webp"]
oraz "photosPending": false. Nie przypisuj zdjęcia wyłącznie na podstawie nazwiska.
Puste tablice zdjęć i photosPending: true oznaczają brak dostępnych plików.
