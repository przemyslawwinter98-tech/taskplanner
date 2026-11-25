export const PERSON_ICON = {
  'Przemo': '🧔',
  'Róża': '👩',
  'Oboje': '👫',
  'Wspólne': '👫',
  'Nieprzypisane': '❓'
};

export const SECTIONS_META = [
  { id: 'Łazienka', label: '🛁 Sekcja 1: Łazienka i pranie' },
  { id: 'Czosnek', label: '🐕 Sekcja 2: Opieka nad Czosnkiem' },
  { id: 'Mieszkanie', label: '🧹 Sekcja 3: Sprzątanie mieszkania' },
  { id: 'Rachunki i auto', label: '🚗 Sekcja 4: Rachunki, auto i zakupy' },
  { id: 'Kuchnia', label: '🍳 Sekcja 5: Kuchnia' }
];

export const CAT_ICON = {
  'Łazienka': '🛁',
  'Czosnek': '🐕',
  'Mieszkanie': '🧹',
  'Rachunki i auto': '🚗',
  'Kuchnia': '🍳',
  'Inne': '📌'
};

export const DEFAULT_PROFILES = {
  przemo: "Pracuje stacjonarnie 8h (pon-pt, w tym w środy). W środy po pracy wolne od obowiązków domowych. Wolne weekendy.",
  roza: "Pracuje pon, śr, czw (w środy po pracy wolne od obowiązków). Wtorki i piątki wolne/zdalne. Wolne weekendy. Pisze e-booka o wieczorach panieńskich (czasem podsuń lekką sugestię pracy nad nim).",
  home: "Pies Czosnek (berneńczyk) i auto. Środy po pracy wolne od domowych zadań. Rozkładaj zadania sprawiedliwie, uwzględniając solo vs razem."
};

export const DEFAULT_MONTHLY_TASKS = [
  // Sekcja 1: Łazienka i pranie (6)
  { title: "Pranie (plus dbanie o pralkę)", desc: "Segregacja, pranie i czyszczenie filtra/szuflady pralki", category: "Łazienka", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie lustra, kibla, zlewu, prysznica, mydelniczki", desc: "Kompleksowe mycie łazienki", category: "Łazienka", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Uzupełnianie mydła i patyczków do uszu", desc: "Kontrola zapasów w łazience", category: "Łazienka", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Suszenie i rozkładanie prania", desc: "Rozwieszenie i schowanie do szaf", category: "Łazienka", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Pranie rzeczy Czosnka", desc: "Posłanie, kocyki, ręczniki i zabawki Czosnka", category: "Łazienka", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Odtykanie odpływów", desc: "Profilaktyczne czyszczenie syfonu pod prysznicem i w zlewie", category: "Łazienka", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },

  // Sekcja 2: Opieka nad Czosnkiem (12)
  { title: "Kupowanie karmy i smaczków", desc: "Kontrola zapasu i zamówienie z wyprzedzeniem", category: "Czosnek", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Spacery z Czosnkiem", desc: "Codzienne wyjścia i dłuższy spacer", category: "Czosnek", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Karmienie + suple", desc: "Codzienne porcje karmy oraz suplementy dla Czosnka", category: "Czosnek", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Dawanie leków", desc: "Codzienne pilnowanie dawkowania leków Czosnka", category: "Czosnek", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Umawianie do weta", desc: "Kontrola terminów szczepień/badań i rejestracja", category: "Czosnek", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Czesanie Czosnka", desc: "Wyczesywanie podszerstka (za uszami i portki)", category: "Czosnek", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie Czosnka", desc: "Kąpiel / mycie łap i brzucha po błocie", category: "Czosnek", freq: 1, coop: "together", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Obcinanie pazurów", desc: "Kontrola długości i przycięcie (łatwiej we dwoje)", category: "Czosnek", freq: 1, coop: "together", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie zębów Czosnka ⭐", desc: "Regularne szczotkowanie zębów psa", category: "Czosnek", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: true, enabled: true },
  { title: "Krople na kleszcze", desc: "Aplikacja ochrony przeciwkleszczowej", category: "Czosnek", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Odrobaczanie", desc: "Podanie tabletki na odrobaczanie", category: "Czosnek", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Mycie misek", desc: "Codzienne umycie i wyparzenie misek na wodę i karmę", category: "Czosnek", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },

  // Sekcja 3: Sprzątanie mieszkania (6)
  { title: "Odkurzanie", desc: "Codzienne zebranie sierści Czosnka z mieszkania", category: "Mieszkanie", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie podłóg", desc: "Umycie podłóg po odkurzaniu", category: "Mieszkanie", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Wynoszenie śmieci", desc: "Segregacja i wyniesienie odpadów", category: "Mieszkanie", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Podlewanie roślin", desc: "Sprawdzenie wilgotności ziemi i podlanie kwiatów", category: "Mieszkanie", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Zmiana pościeli + obracanie materaca", desc: "Świeża pościel oraz obrócenie materaca (najlepiej razem)", category: "Mieszkanie", freq: 2, coop: "together", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie ścian w łazience, przy wejściu i obok Czosnka", desc: "Przetarcie zabrudzeń w strategicznych miejscach", category: "Mieszkanie", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },

  // Sekcja 4: Rachunki, auto i zakupy (5)
  { title: "Płacenie rachunków", desc: "Czynsz, prąd, gaz, internet i abonamenty", category: "Rachunki i auto", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Tankowanie auta", desc: "Zatankowanie do pełna + płyn do spryskiwaczy", category: "Rachunki i auto", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Mycie i sprzątanie auta", desc: "Myjnia + odkurzanie sierści Czosnka z bagażnika", category: "Rachunki i auto", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Kupowanie tytoniu", desc: "Uzupełnienie zapasu", category: "Rachunki i auto", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Kupowanie kawy", desc: "Zamówienie lub zakup ziaren kawy", category: "Rachunki i auto", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },

  // Sekcja 5: Kuchnia (10)
  { title: "Zmywanie", desc: "Codzienne ręczne mycie garnków, patelni i noży", category: "Kuchnia", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Wstawianie zmywarki i rozładowywanie", desc: "Codzienne ogarnianie zmywarki", category: "Kuchnia", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Zakupy + planowanie + dbanie o zjedzenie resztek", desc: "Lista zakupów i zero marnowania jedzenia", category: "Kuchnia", freq: 4, coop: "together", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Gotowanie", desc: "Przygotowanie posiłków na kolejne dni", category: "Kuchnia", freq: 4, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Ogólne sprzątanie z wierzchu", desc: "Codzienne przetarcie blatów, stołu, płyty i zlewu", category: "Kuchnia", freq: 30, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie piekarnika", desc: "Wyczyszczenie wnętrza i szyby piekarnika", category: "Kuchnia", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Oddawanie butelek kaucyjnych", desc: "Zebranie i zwrot butelek w sklepie", category: "Kuchnia", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: true, starred: false, enabled: true },
  { title: "Mycie lodówki", desc: "Przegląd zawartości i umycie półek", category: "Kuchnia", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Odkamienianie czajnika", desc: "Odkamienienie czajnika elektrycznego", category: "Kuchnia", freq: 1, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true },
  { title: "Mycie ekspresu i odkamienianie + pojemnika na fusy", desc: "Czyszczenie zaparzacza, odkamienianie i tacki na fusy", category: "Kuchnia", freq: 2, coop: "solo", assignee: "Nieprzypisane", remoteOk: false, starred: false, enabled: true }
];
