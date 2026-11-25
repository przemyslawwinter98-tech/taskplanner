export const PERSON_ICON = {
  'Przemo': '🧔',
  'Róża': '👩',
  'Oboje': '👫',
  'Wspólne': '👫',
  'Nieprzypisane': '❓'
};

export const DEFAULT_SECTIONS = [
  { id: 'sec_lazienka', icon: '🛁', name: 'Łazienka i pranie', order: 0 },
  { id: 'sec_czosnek', icon: '🐕', name: 'Opieka nad Czosnkiem', order: 1 },
  { id: 'sec_mieszkanie', icon: '🧹', name: 'Sprzątanie mieszkania', order: 2 },
  { id: 'sec_auto', icon: '🚗', name: 'Rachunki, auto i zakupy', order: 3 },
  { id: 'sec_kuchnia', icon: '🍳', name: 'Kuchnia', order: 4 }
];

export const DEFAULT_PROFILES = {
  przemo: "Pracuje stacjonarnie 8h (pon-pt, w tym w środy). W środy po pracy chce mieć luz — bez ciężkich/długich obowiązków, ale może zrobić tylko coś lekkiego, szybkiego i z głowy (10-15 min, np. wynieść śmieci, podlać kwiaty, umyć miski czy zęby Czosnka). W pozostałe dni nie ma takiego ograniczenia.",
  roza: "Pracuje pon, śr, czw (w środy po pracy też wolne/lekkie podejście). Wtorki i piątki wolne/zdalne. Wolne weekendy. Pisze e-booka o wieczorach panieńskich (czasem podsuń lekką sugestię pracy nad nim).",
  home: "Pies Czosnek (berneńczyk) i auto. W środy po pracy Przemo bierze wyłącznie lekkie, szybkie zadania 'z głowy' (bez wielkiego sprzątania, myjni czy gotowania), w pozostałe dni działa normalnie. Rozkładaj zadania sprawiedliwie, uwzględniając solo vs razem."
};

export const DEFAULT_MONTHLY_TASKS = [
  // Sekcja 1: Łazienka i pranie (6)
  { title: "Pranie (plus dbanie o pralkę)", desc: "Segregacja, pranie i czyszczenie filtra/szuflady pralki", category: "sec_lazienka", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie lustra, kibla, zlewu, prysznica, mydelniczki", desc: "Kompleksowe mycie łazienki", category: "sec_lazienka", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Uzupełnianie mydła i patyczków do uszu", desc: "Kontrola zapasów w łazience", category: "sec_lazienka", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Suszenie i rozkładanie prania", desc: "Rozwieszenie i schowanie do szaf", category: "sec_lazienka", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Pranie rzeczy Czosnka", desc: "Posłanie, kocyki, ręczniki i zabawki Czosnka", category: "sec_lazienka", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Odtykanie odpływów", desc: "Profilaktyczne czyszczenie syfonu pod prysznicem i w zlewie", category: "sec_lazienka", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },

  // Sekcja 2: Opieka nad Czosnkiem (12)
  { title: "Kupowanie karmy i smaczków", desc: "Kontrola zapasu i zamówienie z wyprzedzeniem", category: "sec_czosnek", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Spacery z Czosnkiem", desc: "Codzienne wyjścia i dłuższy spacer", category: "sec_czosnek", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Karmienie + suple", desc: "Codzienne porcje karmy oraz suplementy dla Czosnka", category: "sec_czosnek", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Dawanie leków", desc: "Codzienne pilnowanie dawkowania leków Czosnka", category: "sec_czosnek", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Umawianie do weta", desc: "Kontrola terminów szczepień/badań i rejestracja", category: "sec_czosnek", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Czesanie Czosnka", desc: "Wyczesywanie podszerstka (za uszami i portki)", category: "sec_czosnek", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie Czosnka", desc: "Kąpiel / mycie łap i brzucha po błocie", category: "sec_czosnek", freq: 1, coop: "together", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Obcinanie pazurów", desc: "Kontrola długości i przycięcie (łatwiej we dwoje)", category: "sec_czosnek", freq: 1, coop: "together", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie zębów Czosnka ⭐", desc: "Regularne szczotkowanie zębów psa", category: "sec_czosnek", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: true, enabled: true },
  { title: "Krople na kleszcze", desc: "Aplikacja ochrony przeciwkleszczowej", category: "sec_czosnek", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Odrobaczanie", desc: "Podanie tabletki na odrobaczanie", category: "sec_czosnek", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Mycie misek", desc: "Codzienne umycie i wyparzenie misek na wodę i karmę", category: "sec_czosnek", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },

  // Sekcja 3: Sprzątanie mieszkania (6)
  { title: "Odkurzanie", desc: "Codzienne zebranie sierści Czosnka z mieszkania", category: "sec_mieszkanie", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie podłóg", desc: "Umycie podłóg po odkurzaniu", category: "sec_mieszkanie", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Wynoszenie śmieci", desc: "Segregacja i wyniesienie odpadów", category: "sec_mieszkanie", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Podlewanie roślin", desc: "Sprawdzenie wilgotności ziemi i podlanie kwiatów", category: "sec_mieszkanie", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Zmiana pościeli + obracanie materaca", desc: "Świeża pościel oraz obrócenie materaca (najlepiej razem)", category: "sec_mieszkanie", freq: 2, coop: "together", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie ścian w łazience, przy wejściu i obok Czosnka", desc: "Przetarcie zabrudzeń w strategicznych miejscach", category: "sec_mieszkanie", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },

  // Sekcja 4: Rachunki, auto i zakupy (5)
  { title: "Płacenie rachunków", desc: "Czynsz, prąd, gaz, internet i abonamenty", category: "sec_auto", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Tankowanie auta", desc: "Zatankowanie do pełna + płyn do spryskiwaczy", category: "sec_auto", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Mycie i sprzątanie auta", desc: "Myjnia + odkurzanie sierści Czosnka z bagażnika", category: "sec_auto", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Kupowanie tytoniu", desc: "Uzupełnienie zapasu", category: "sec_auto", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Kupowanie kawy", desc: "Zamówienie lub zakup ziaren kawy", category: "sec_auto", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },

  // Sekcja 5: Kuchnia (10)
  { title: "Zmywanie", desc: "Codzienne ręczne mycie garnków, patelni i noży", category: "sec_kuchnia", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Wstawianie zmywarki i rozładowywanie", desc: "Codzienne ogarnianie zmywarki", category: "sec_kuchnia", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Zakupy + planowanie + dbanie o zjedzenie resztek", desc: "Lista zakupów i zero marnowania jedzenia", category: "sec_kuchnia", freq: 4, coop: "together", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Gotowanie", desc: "Przygotowanie posiłków na kolejne dni", category: "sec_kuchnia", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Ogólne sprzątanie z wierzchu", desc: "Codzienne przetarcie blatów, stołu, płyty i zlewu", category: "sec_kuchnia", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie piekarnika", desc: "Wyczyszczenie wnętrza i szyby piekarnika", category: "sec_kuchnia", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Oddawanie butelek kaucyjnych", desc: "Zebranie i zwrot butelek w sklepie", category: "sec_kuchnia", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Mycie lodówki", desc: "Przegląd zawartości i umycie półek", category: "sec_kuchnia", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Odkamienianie czajnika", desc: "Odkamienienie czajnika elektrycznego", category: "sec_kuchnia", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie ekspresu i odkamienianie + pojemnika na fusy", desc: "Czyszczenie zaparzacza, odkamienianie i tacki na fusy", category: "sec_kuchnia", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true }
];