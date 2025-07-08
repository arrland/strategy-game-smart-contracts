# Obliczanie Czasu Podróży w Grze

## Prosty Wzór

Czas podróży statku między wyspami jest obliczany według następującego wzoru:

```
Czas Podróży = (Czas Bazowy / Prędkość Statku) - Bonus z Mądrości - Bonus z Nawigacji
```

Jeśli obliczony czas jest mniejszy niż 6 godzin, to ostateczny czas podróży wynosi 6 godzin.

## Objaśnienie Składników

- **Czas Bazowy**: Zależy od odległości między wyspami
  - Krótka odległość: 1 dzień (86,400 sekund)
  - Średnia odległość: 2 dni (172,800 sekund)
  - Duża odległość: 4 dni (345,600 sekund)

- **Prędkość Statku**: Atrybut statku, który określa, jak szybko porusza się on po morzu
  - Większa prędkość = krótszy czas podróży
  - Standardowa prędkość to 10

- **Bonus z Mądrości**: Redukcja czasu dzięki umiejętności mądrości kapitana
  - Obliczany jako: (Czas po uwzględnieniu prędkości) * (Poziom Mądrości/2) / 100
  - Przykład: Kapitan z mądrością 10 zmniejsza czas podróży o 5%

- **Bonus z Nawigacji**: Redukcja czasu dzięki umiejętności nawigacji kapitana
  - Obliczany jako: (Czas po uwzględnieniu prędkości) * (Poziom Nawigacji) / 100
  - Przykład: Kapitan z nawigacją 10 zmniejsza czas podróży o 10%

## Przykład 1: Szybki statek, doświadczony kapitan

1. Statek o prędkości 15 podróżuje między wyspami o średniej odległości (2 dni)
2. Kapitan statku ma 20 punktów mądrości i 30 punktów nawigacji
3. Czas bazowy: 172,800 sekund (2 dni)
4. Po uwzględnieniu prędkości: 172,800 / 15 = 11,520 sekund
5. Bonus z mądrości: 11,520 * (20/2) / 100 = 1,152 sekund
6. Po odjęciu bonusu z mądrości: 11,520 - 1,152 = 10,368 sekund
7. Bonus z nawigacji: 11,520 * 30 / 100 = 3,456 sekund
8. Po odjęciu bonusu z nawigacji: 10,368 - 3,456 = 6,912 sekund
9. Ostateczny czas podróży: 6,912 sekund (około 1 godzina i 55 minut)

## Przykład 2: Wolniejszy statek, początkujący kapitan

1. Statek o prędkości 6 podróżuje między wyspami o średniej odległości (2 dni)
2. Kapitan statku ma 3 punkty mądrości i 10 punktów nawigacji
3. Czas bazowy: 172,800 sekund (2 dni)
4. Po uwzględnieniu prędkości: 172,800 / 6 = 28,800 sekund
5. Bonus z mądrości: 28,800 * (3/2) / 100 = 432 sekundy
6. Po odjęciu bonusu z mądrości: 28,800 - 432 = 28,368 sekund
7. Bonus z nawigacji: 28,800 * 10 / 100 = 2,880 sekund
8. Po odjęciu bonusu z nawigacji: 28,368 - 2,880 = 25,488 sekund
9. Ostateczny czas podróży: 25,488 sekund (około 7 godzin i 5 minut)

## Podsumowanie

- Im większa odległość między wyspami, tym dłuższy czas podróży
- Szybsze statki znacząco skracają czas podróży
- Umiejętności kapitana (mądrość i nawigacja) dodatkowo redukują czas podróży
- Minimalna długość podróży to zawsze 6 godzin 