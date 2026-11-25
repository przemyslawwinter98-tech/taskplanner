import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, where, setDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  PERSON_ICON, DEFAULT_SECTIONS, DEFAULT_PROFILES, DEFAULT_MONTHLY_TASKS
} from "./tasks-data.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7-ytzkg_vunX5BPuRBG9EMn7wzt6B3SQ",
  authDomain: "taskplanner-6e393.firebaseapp.com",
  projectId: "taskplanner-6e393",
  storageBucket: "taskplanner-6e393.firebasestorage.app",
  messagingSenderId: "325861761340",
  appId: "1:325861761340:web:3d90afddef81acb33e3e39"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// TRYB JASNY / CIEMNY
function applyTheme(theme) {
  const html = document.documentElement;
  const btn = document.getElementById('theme-toggle-btn');
  if (theme === 'dark') {
    html.classList.add('dark');
    if (btn) btn.textContent = '☀️';
  } else {
    html.classList.remove('dark');
    if (btn) btn.textContent = '🌙';
  }
  localStorage.setItem('home_planner_theme', theme);
}
applyTheme(localStorage.getItem('home_planner_theme') || 'light');

window.toggleTheme = () => {
  applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
};

// STAN APLIKACJI
let homeSecret = localStorage.getItem('home_planner_secret') || '';
let activeUser = localStorage.getItem('home_planner_active_user') || 'Przemo';
let selectedNowTime = '30 min';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDateStr = formatDate(new Date());
let currentFilter = 'all';
let configFilter = 'all';
let allTasks = [];
let naBlocks = [];
let taskTemplates = [];
let taskSections = [];
let userProfiles = { ...DEFAULT_PROFILES };
let personalAiCache = { Przemo: null, Róża: null };
let unsubTasks = null, unsubNa = null, unsubTemplates = null, unsubProfiles = null, unsubSections = null;
let seededTemplatesOnce = false;
let seededSectionsOnce = false;

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function isTestMonth(year, month) {
  return year === 2026 && month === 10;
}

function isTaskOverdue(task) {
  if (task.completed || !task.date || task.isDailyHabit || isTestMonth(currentYear, currentMonth)) return false;
  return task.date < formatDate(new Date());
}

// HELPERY SEKCJI DYNAMICZNYCH
function resolveSectionId(rawCat) {
  if (taskSections.length === 0) return rawCat || 'sec_mieszkanie';
  if (!rawCat) return taskSections[0].id;
  // 1. Szukaj po dokładnym ID sekcji (zarówno doc.id jak i codeId)
  const byId = taskSections.find(s => s.id === rawCat || s.codeId === rawCat);
  if (byId) return byId.id;
  // 2. Mapowanie starszych nazw tekstowych na sekcje
  const low = String(rawCat).toLowerCase();
  const keywordMap = [
    { keys: ['łazienk', 'lazienk', 'pranie'], target: 'sec_lazienka' },
    { keys: ['czosn', 'gośk', 'gosk', 'berneń', 'pies'], target: 'sec_czosnek' },
    { keys: ['mieszkan', 'dom', 'sprząt'], target: 'sec_mieszkanie' },
    { keys: ['rachunk', 'auto', 'zakup'], target: 'sec_auto' },
    { keys: ['kuchn'], target: 'sec_kuchnia' }
  ];
  for (const rule of keywordMap) {
    if (rule.keys.some(k => low.includes(k))) {
      const found = taskSections.find(s => s.codeId === rule.target || s.id === rule.target || s.name.toLowerCase().includes(rule.keys[0]));
      if (found) return found.id;
    }
  }
  const byName = taskSections.find(s => s.name.toLowerCase() === low);
  return byName ? byName.id : taskSections[0].id;
}

function getSectionMeta(rawCat) {
  const resolvedId = resolveSectionId(rawCat);
  const sec = taskSections.find(s => s.id === resolvedId);
  return sec || { id: resolvedId, icon: '📌', name: 'Ogólne' };
}

function buildSectionOptionsHtml(selectedRawId) {
  const resolved = resolveSectionId(selectedRawId);
  return taskSections.map(s =>
    `<option value="${s.id}" ${s.id === resolved ? 'selected' : ''}>${s.icon || '📌'} ${s.name}</option>`
  ).join('');
}

function renderDynamicSectionControls() {
  // 1. Selecty w formularzach dodawania
  const taskCatSel = document.getElementById('task-category');
  const tplCatSel = document.getElementById('tpl-category');
  if (taskCatSel) taskCatSel.innerHTML = buildSectionOptionsHtml(taskCatSel.value);
  if (tplCatSel) tplCatSel.innerHTML = buildSectionOptionsHtml(tplCatSel.value);

  // 2. Pasek filtrów na głównej liście zadań
  const mainFilterBar = document.getElementById('main-filters-bar');
  if (mainFilterBar) {
    const fixedBtns = [
      { id: 'all', label: 'Wszystkie' },
      { id: 'Przemo', label: '🧔 Przemo' },
      { id: 'Róża', label: '👩 Róża' },
      { id: 'together', label: '👫 Razem' }
    ];
    const sectionBtns = taskSections.map(s => ({ id: s.id, label: `${s.icon || '📌'} ${s.name}` }));
    mainFilterBar.innerHTML = [...fixedBtns, ...sectionBtns].map(b => {
      const active = currentFilter === b.id;
      return `<button onclick="setFilter('${b.id}')" data-filter="${b.id}" class="filter-btn px-2.5 py-1 rounded-full text-xs ${active ? 'font-bold bg-warm-900 dark:bg-brand-500 text-white' : 'font-semibold bg-warm-100 dark:bg-warm-800 text-stone-600 dark:text-stone-300'}">${b.label}</button>`;
    }).join('');
  }

  // 3. Pasek filtrów w konfiguratorze bazy
  const cfgFilterBar = document.getElementById('config-filters-bar');
  if (cfgFilterBar) {
    const allBtn = { id: 'all', label: 'Wszystkie sekcje' };
    const secBtns = taskSections.map(s => ({ id: s.id, label: `${s.icon || '📌'} ${s.name}` }));
    cfgFilterBar.innerHTML = [allBtn, ...secBtns].map(b => {
      const active = configFilter === b.id;
      return `<button onclick="setConfigFilter('${b.id}')" data-cfilter="${b.id}" class="cfilter-btn px-3 py-1 rounded-full text-xs ${active ? 'font-bold bg-warm-900 dark:bg-brand-500 text-white' : 'font-semibold bg-warm-100 dark:bg-warm-800 text-stone-600 dark:text-stone-300'}">${b.label}</button>`;
    }).join('');
  }

  // 4. Panel zarządzania sekcjami (dodawanie / edycja nazwy i ikony / usuwanie)
  const secManager = document.getElementById('sections-manager-list');
  if (secManager) {
    secManager.innerHTML = taskSections.map(s => `
      <div class="inline-flex items-center gap-1.5 bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
        <input type="text" value="${s.icon || '📌'}" maxlength="4" onchange="updateSectionField('${s.id}', 'icon', this.value)"
          title="Zmień ikonkę sekcji" class="w-7 text-center bg-transparent text-sm focus:outline-none" />
        <input type="text" value="${s.name.replace(/"/g, '&quot;')}" onchange="updateSectionField('${s.id}', 'name', this.value)"
          title="Edytuj nazwę sekcji" class="w-36 sm:w-44 text-xs font-bold text-warm-900 dark:text-white bg-transparent border-b border-transparent focus:border-brand-400 focus:outline-none" />
        ${taskSections.length > 1 ? `<button onclick="deleteSection('${s.id}')" title="Usuń sekcję" class="text-stone-400 hover:text-red-500 text-xs font-bold px-1">✕</button>` : ''}
      </div>
    `).join('');
  }
}

window.updateSectionField = async (id, field, value) => {
  const clean = value.trim();
  if (!clean) return;
  await updateDoc(doc(db, "taskSections", id), { [field]: clean });
};

window.deleteSection = async (id) => {
  if (taskSections.length <= 1) return alert("Musi zostać przynajmniej jedna sekcja.");
  if (!confirm("Usunąć tę sekcję? Zadania z niej zostaną przeniesione do pierwszej sekcji.")) return;
  const fallbackId = taskSections.find(s => s.id !== id).id;
  for (const tpl of taskTemplates.filter(t => resolveSectionId(t.category) === id)) {
    await updateDoc(doc(db, "taskTemplates", tpl.id), { category: fallbackId });
  }
  for (const task of allTasks.filter(t => resolveSectionId(t.category) === id)) {
    await updateDoc(doc(db, "tasks", task.id), { category: fallbackId });
  }
  if (currentFilter === id) currentFilter = 'all';
  if (configFilter === id) configFilter = 'all';
  await deleteDoc(doc(db, "taskSections", id));
};

document.getElementById('new-section-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const icon = document.getElementById('new-sec-icon').value.trim() || '📌';
  const name = document.getElementById('new-sec-name').value.trim();
  if (!name) return;
  await addDoc(collection(db, "taskSections"), {
    secret: homeSecret,
    icon,
    name,
    order: taskSections.length
  });
  document.getElementById('new-sec-name').value = '';
});

// AUTORYZACJA
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');

if (authForm) {
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('secret-input').value.trim();
    if (!val) return;
    homeSecret = val;
    localStorage.setItem('home_planner_secret', homeSecret);
    document.getElementById('auth-error')?.classList.add('hidden');
    startApp();
  });
}

window.logout = () => {
  localStorage.removeItem('home_planner_secret');
  location.reload();
};

function startApp() {
  authScreen?.classList.add('hidden');
  appContainer?.classList.remove('hidden');
  updateUserProfileUI();
  syncDateInputs(selectedDateStr);
  renderCalendar();
  renderPersonalFocusCard();
  subscribeFirestore();
}

function syncDateInputs(dateStr) {
  const tDate = document.getElementById('task-date');
  const sDate = document.getElementById('na-start-date');
  const eDate = document.getElementById('na-end-date');
  if (tDate) tDate.value = dateStr;
  if (sDate) sDate.value = dateStr;
  if (eDate) eDate.value = dateStr;
}

// WYBÓR CZASU "NA TERAZ"
window.selectNowTime = (timeLabel) => {
  selectedNowTime = timeLabel;
  document.querySelectorAll('.now-time-btn').forEach(btn => {
    btn.className = btn.dataset.nowtime === timeLabel
      ? 'now-time-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-500 text-white border border-brand-500 transition'
      : 'now-time-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 text-stone-700 dark:text-stone-200 hover:border-brand-400 transition';
  });
};

// PRZEŁĄCZANIE AKTYWNEGO PROFILU
window.switchActiveUser = (user) => {
  activeUser = user;
  localStorage.setItem('home_planner_active_user', user);
  updateUserProfileUI();
  renderPersonalFocusCard();
};

function updateUserProfileUI() {
  const pBtn = document.getElementById('user-pill-Przemo');
  const rBtn = document.getElementById('user-pill-Róża');
  if (!pBtn || !rBtn) return;

  if (activeUser === 'Przemo') {
    pBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1 bg-sky-600 text-white shadow-xs';
    rBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 text-stone-600 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-warm-700';
  } else {
    rBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1 bg-rose-600 text-white shadow-xs';
    pBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 text-stone-600 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-warm-700';
  }
}

// SPERSONALIZOWANA KARTA SUGESTII "NA TERAZ"
function renderPersonalFocusCard() {
  const card = document.getElementById('personal-focus-card');
  const iconEl = document.getElementById('personal-focus-icon');
  const titleEl = document.getElementById('personal-focus-title');
  const subEl = document.getElementById('personal-focus-subtitle');
  const listEl = document.getElementById('personal-focus-list');
  if (!card || !listEl) return;

  const isPrzemo = activeUser === 'Przemo';
  const today = new Date();
  const todayStr = formatDate(today);
  const dayOfWeek = today.getDay();
  const todayBlocks = getBlocksForDate(todayStr).filter(b => b.who === activeUser || b.who === 'Oboje');

  card.className = isPrzemo
    ? 'rounded-2xl border p-4 transition-all bg-sky-50/70 dark:bg-sky-950/30 border-sky-200/80 dark:border-sky-900/60'
    : 'rounded-2xl border p-4 transition-all bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/60';
  iconEl.textContent = isPrzemo ? '🧔' : '👩';
  titleEl.textContent = `Mam chwilę teraz — co wybrać? (${activeUser})`;

  if (dayOfWeek === 3) subEl.textContent = isPrzemo
    ? 'Dziś środa — po pracy tylko coś lekkiego i szybkiego z głowy (bez ciężkich robót)!'
    : 'Dziś środa — po pracy luźniejszy wieczór (tylko drobiazgi albo odpoczynek).';
  else if (!isPrzemo && (dayOfWeek === 2 || dayOfWeek === 5)) subEl.textContent = 'Dziś masz wolny/zdalny dzień — dobry moment na lekkie rzeczy lub e-booka.';
  else subEl.textContent = 'Wybierz ile masz teraz minut i kliknij „✨ Dobierz na teraz”';

  if (personalAiCache[activeUser]) {
    listEl.innerHTML = personalAiCache[activeUser].map(tip => `
      <div class="bg-white/90 dark:bg-warm-900/80 border border-warm-200/80 dark:border-warm-700 rounded-xl p-3 space-y-1">
        <div class="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">${tip.badge || `⏱️ ${selectedNowTime}`}</div>
        <div class="font-bold text-warm-900 dark:text-white">${tip.title}</div>
        <div class="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">${tip.desc}</div>
      </div>
    `).join('');
    return;
  }

  const openTasks = allTasks.filter(t => !t.completed);
  const myTasks = openTasks
    .filter(t => t.assignee === activeUser || t.assignee === 'Wspólne' || !t.assignee || t.assignee === 'Nieprzypisane')
    .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || (a.assignee === activeUser ? -1 : 1));

  const suggestions = [];
  if (todayBlocks.length > 0) {
    const b = todayBlocks[0];
    suggestions.push({
      badge: b.mode === 'away' ? '🏠 Poza domem' : '⛔ Blokada N/A',
      title: b.note || (b.mode === 'away' ? 'Poza domem' : 'Masz dziś N/A'),
      desc: b.mode === 'away' ? 'Tylko zadania zdalne/zakupowe.' : `Zablokowane ${b.startTime}–${b.endTime}.`
    });
  } else if (dayOfWeek === 3) {
    suggestions.push({
      badge: '🌿 Środa po pracy • Lekki tryb',
      title: isPrzemo ? 'Tylko szybki drobiazg z głowy (10–15 min)' : 'Luźny wieczór po pracy',
      desc: isPrzemo
        ? 'Bez wielkiego sprzątania i auta — wybierz 1 szybką rzecz (np. śmieci, rośliny, zęby Czosnka) i masz wolne.'
        : 'Odpocznij po pracy — grubsze rzeczy zostaw na wolniejszy dzień.'
    });
  }

  if (!isPrzemo) {
    suggestions.push({
      badge: '✍️ Projekt własny • 👤 Solo',
      title: 'E-book o wieczorach panieńskich',
      desc: 'Może 30 min na kolejny rozdział lub spis treści?'
    });
  }

  for (const task of myTasks) {
    if (suggestions.length >= 3) break;
    const sec = getSectionMeta(task.category);
    suggestions.push({
      badge: `${task.starred ? '⭐ ' : ''}${task.coop === 'together' ? '👫 Razem' : '👤 Solo'}`,
      title: task.title,
      desc: `${sec.name}${task.desc ? ` — ${task.desc}` : ''}`
    });
  }

  listEl.innerHTML = suggestions.slice(0, 3).map(s => `
    <div class="bg-white/90 dark:bg-warm-900/80 border border-warm-200/80 dark:border-warm-700 rounded-xl p-3 space-y-1">
      <div class="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">${s.badge}</div>
      <div class="font-bold text-warm-900 dark:text-white truncate">${s.title}</div>
      <div class="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">${s.desc}</div>
    </div>
  `).join('');
}

// SZYBKIE AI "NA TERAZ"
window.generatePersonalAiTips = async () => {
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) return openSettingsModal();

  const btn = document.getElementById('personal-ai-refresh-btn');
  const origText = btn.innerHTML;
  btn.innerHTML = '⏳...';
  btn.disabled = true;

  const todayStr = formatDate(new Date());
  const openTasks = allTasks.filter(t => !t.completed).slice(0, 22).map(t =>
    `${t.title} (${getSectionMeta(t.category).name}, ${t.coop === 'together' ? 'RAZEM' : 'SOLO'}, ${t.assignee || '?'}${t.remoteOk ? ', poza domem' : ''})`
  ).join('; ') || 'brak';

  const myProfile = activeUser === 'Przemo' ? userProfiles.przemo : userProfiles.roza;
  const myBlocks = getBlocksForDate(todayStr).map(b => `${b.who}:${b.mode} ${b.startTime}-${b.endTime}`).join(', ') || 'brak';

  const isWedNow = new Date().getDay() === 3;
  const wedRule = isWedNow
    ? `WAŻNE: Dziś jest ŚRODA po pracy — ${activeUser} chce mieć luźny wieczór! Proponuj WYŁĄCZNIE lekkie, szybkie zadania "z głowy" (max 10-20 min, ZERO ciężkiego sprzątania, podłóg, auta czy piekarnika).`
    : `W dni inne niż środa po pracy możesz normalnie dobierać zadania pasujące do ${selectedNowTime}.`;

  const prompt = `Osoba: ${activeUser}. Czas teraz: ${selectedNowTime}. Dziś: ${todayStr} (${new Date().toLocaleDateString('pl-PL', { weekday: 'long' })}).
Grafik: ${myProfile}. Blokady dziś: ${myBlocks}.
${wedRule}
Zadania: ${openTasks}.
Dobierz 3 zadania na ${selectedNowTime}. Zwróć TYLKO JSON bez markdowna:
[{"badge":"⏱️ ${selectedNowTime} • 👤 Solo/👫 Razem","title":"krótka nazwa","desc":"1 zdanie dlaczego teraz"}]`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 450 }
      })
    });
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    if (Array.isArray(parsed) && parsed.length > 0) {
      personalAiCache[activeUser] = parsed.slice(0, 3);
      renderPersonalFocusCard();
    }
  } catch (e) {
    alert("Błąd AI — sprawdź klucz API w ⚙️ Profile.");
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
};

function getTargetDatesForFreq(year, month, freq) {
  const monthKey = getMonthKey(year, month);
  if (freq >= 30) return [formatDate(new Date())];

  const goodDays = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    if (dt.getDay() === 2 || dt.getDay() === 5 || dt.getDay() === 6) goodDays.push(formatDate(dt));
  }

  if (freq === 4) {
    const picked = goodDays.filter((_, i) => i % 3 === 0).slice(0, 4);
    return picked.length >= 4 ? picked : [`${monthKey}-03`, `${monthKey}-10`, `${monthKey}-17`, `${monthKey}-24`];
  }
  if (freq === 2) {
    return [goodDays[1] || `${monthKey}-06`, goodDays[Math.min(goodDays.length - 2, 7)] || `${monthKey}-20`];
  }
  return [goodDays[2] || `${monthKey}-12`];
}

async function insertTemplateInstancesIntoMonth(tpl, year, month) {
  const monthKey = getMonthKey(year, month);
  const freq = Number(tpl.freq || 1);
  const assignee = tpl.assignee || 'Nieprzypisane';
  const isDailyHabit = freq >= 30;
  const dates = getTargetDatesForFreq(year, month, freq);
  const resolvedCat = resolveSectionId(tpl.category);

  for (let idx = 0; idx < dates.length; idx++) {
    await addDoc(collection(db, "tasks"), {
      secret: homeSecret,
      title: (!isDailyHabit && dates.length > 1) ? `${tpl.title} (${idx + 1}/${dates.length})` : tpl.title,
      desc: tpl.desc || '',
      assignee,
      coop: tpl.coop || 'solo',
      category: resolvedCat,
      date: dates[idx],
      recurrence: isDailyHabit ? 'daily' : (freq > 1 ? 'recurring' : 'monthly'),
      isDailyHabit,
      remoteOk: !!tpl.remoteOk,
      starred: !!tpl.starred,
      monthKey,
      completed: false
    });
  }
}

// SUBSKRYPCJE FIREBASE
function subscribeFirestore() {
  if (unsubTasks) unsubTasks();
  if (unsubNa) unsubNa();
  if (unsubTemplates) unsubTemplates();
  if (unsubProfiles) unsubProfiles();
  if (unsubSections) unsubSections();

  const monthKey = getMonthKey(currentYear, currentMonth);
  const testBadge = document.getElementById('test-month-badge');
  if (testBadge) testBadge.classList.toggle('hidden', !isTestMonth(currentYear, currentMonth));

  // 1. Sekcje zadań (dynamiczne z Firebase)
  const qSec = query(collection(db, "taskSections"), where("secret", "==", homeSecret));
  unsubSections = onSnapshot(qSec, async (snapshot) => {
    if (snapshot.empty && !seededSectionsOnce) {
      seededSectionsOnce = true;
      for (const sec of DEFAULT_SECTIONS) {
        await addDoc(collection(db, "taskSections"), {
          secret: homeSecret,
          codeId: sec.id,
          icon: sec.icon,
          name: sec.name,
          order: sec.order
        });
      }
      return;
    }
    taskSections = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    renderDynamicSectionControls();
    renderConfigTemplates();
    renderTasks();
  });

  // 2. Profile osób
  const profileDocRef = doc(db, "homeSettings", `profiles_${homeSecret}`);
  unsubProfiles = onSnapshot(profileDocRef, async (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      userProfiles = {
        przemo: data.przemo ?? DEFAULT_PROFILES.przemo,
        roza: data.roza ?? DEFAULT_PROFILES.roza,
        home: data.home ?? DEFAULT_PROFILES.home
      };
      renderPersonalFocusCard();
    } else {
      await setDoc(profileDocRef, { secret: homeSecret, ...DEFAULT_PROFILES });
    }
  });

  // 3. Zadania w miesiącu
  const qTasks = query(collection(db, "tasks"), where("secret", "==", homeSecret), where("monthKey", "==", monthKey));
  unsubTasks = onSnapshot(qTasks, (snapshot) => {
    allTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTasks();
    renderStats();
    renderCalendar();
    renderPersonalFocusCard();
  }, (err) => {
    console.error("Firestore auth error:", err);
    document.getElementById('auth-error')?.classList.remove('hidden');
    authScreen?.classList.remove('hidden');
    appContainer?.classList.add('hidden');
  });

  // 4. Blokady N/A
  const qNa = query(collection(db, "naBlocks"), where("secret", "==", homeSecret));
  unsubNa = onSnapshot(qNa, (snapshot) => {
    naBlocks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const naCount = document.getElementById('na-total-count');
    if (naCount) naCount.textContent = naBlocks.length;
    renderCalendar();
    updateSelectedDayPanel();
    renderNaManagerList();
    renderPersonalFocusCard();
  });

  // 5. Wzorce zadań w bazie
  const qTpl = query(collection(db, "taskTemplates"), where("secret", "==", homeSecret));
  unsubTemplates = onSnapshot(qTpl, async (snapshot) => {
    if (snapshot.empty && !seededTemplatesOnce) {
      seededTemplatesOnce = true;
      for (let i = 0; i < DEFAULT_MONTHLY_TASKS.length; i++) {
        const tplData = { secret: homeSecret, order: i, ...DEFAULT_MONTHLY_TASKS[i] };
        await addDoc(collection(db, "taskTemplates"), tplData);
        await insertTemplateInstancesIntoMonth(tplData, currentYear, currentMonth);
      }
      return;
    }
    taskTemplates = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    renderConfigTemplates();
  });
}

// BLOKADY N/A
function getBlocksForDate(dateStr) {
  const target = parseLocalDate(dateStr);
  const msPerDay = 86400000;
  return naBlocks.filter(b => {
    const repeat = b.repeat || 'once';
    if (repeat === 'once') return b.startDate <= dateStr && (b.endDate || b.startDate) >= dateStr;
    const anchor = parseLocalDate(b.startDate);
    if (target < anchor) return false;
    const diffDays = Math.round((target - anchor) / msPerDay);
    return repeat === 'weekly' ? diffDays % 7 === 0 : (repeat === 'biweekly' ? diffDays % 14 === 0 : false);
  });
}

window.handleNaRepeatChange = () => {
  const repeat = document.getElementById('na-repeat').value;
  document.getElementById('na-end-date-wrap').classList.toggle('hidden', repeat !== 'once');
  document.getElementById('na-start-date-label').textContent = repeat === 'once' ? 'Od dnia' : 'Pierwszy dzień';
};

window.toggleNaForm = () => {
  document.getElementById('na-form').classList.toggle('hidden');
  handleNaRepeatChange();
};

document.getElementById('na-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const who = document.getElementById('na-who').value;
  const mode = document.getElementById('na-mode').value;
  const repeat = document.getElementById('na-repeat').value;
  const startDate = document.getElementById('na-start-date').value;
  const startTime = document.getElementById('na-start-time').value;
  const endDate = repeat === 'once' ? document.getElementById('na-end-date').value : startDate;
  const endTime = document.getElementById('na-end-time').value;
  const note = document.getElementById('na-note').value.trim();

  if (repeat === 'once' && endDate < startDate) return alert("Data końcowa nie może być wcześniejsza.");
  await addDoc(collection(db, "naBlocks"), { secret: homeSecret, who, mode, repeat, startDate, startTime, endDate, endTime, note });
  document.getElementById('na-note').value = '';
  toggleNaForm();
});

window.deleteNaBlock = async (id) => deleteDoc(doc(db, "naBlocks", id));

window.updateNaBlockField = async (id, field, value) => {
  const updates = { [field]: value };
  if (field === 'repeat' && value !== 'once') {
    const item = naBlocks.find(x => x.id === id);
    if (item) updates.endDate = item.startDate;
  }
  await updateDoc(doc(db, "naBlocks", id), updates);
};

window.openNaManagerModal = () => {
  renderNaManagerList();
  document.getElementById('na-manager-modal').classList.remove('hidden');
  document.getElementById('na-manager-modal').classList.add('flex');
};

function renderNaManagerList() {
  const container = document.getElementById('na-manager-list');
  if (!container) return;
  if (naBlocks.length === 0) {
    container.innerHTML = `<div class="text-center text-stone-400 text-sm py-8">Brak wpisanych blokad N/A.</div>`;
    return;
  }
  const sorted = [...naBlocks].sort((a, b) => (a.repeat === 'once' ? 1 : 0) - (b.repeat === 'once' ? 1 : 0) || a.startDate.localeCompare(b.startDate));
  container.innerHTML = sorted.map(b => {
    const repeat = b.repeat || 'once';
    return `
      <div class="p-3.5 rounded-2xl border border-warm-200 dark:border-warm-700 bg-warm-50/70 dark:bg-warm-800/60 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <select onchange="updateNaBlockField('${b.id}', 'who', this.value)" class="px-2.5 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs font-bold">
              <option value="Przemo" ${b.who === 'Przemo' ? 'selected' : ''}>🧔 Przemo</option>
              <option value="Róża" ${b.who === 'Róża' ? 'selected' : ''}>👩 Róża</option>
              <option value="Oboje" ${b.who === 'Oboje' ? 'selected' : ''}>👫 Oboje</option>
            </select>
            <select onchange="updateNaBlockField('${b.id}', 'mode', this.value)" class="px-2.5 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs font-semibold">
              <option value="busy" ${b.mode === 'busy' ? 'selected' : ''}>⛔ Brak czasu</option>
              <option value="away" ${b.mode === 'away' ? 'selected' : ''}>🏠 Poza domem</option>
            </select>
            <select onchange="updateNaBlockField('${b.id}', 'repeat', this.value)" class="px-2.5 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs font-bold text-brand-600">
              <option value="once" ${repeat === 'once' ? 'selected' : ''}>Jednorazowe</option>
              <option value="weekly" ${repeat === 'weekly' ? 'selected' : ''}>↻ Co tydzień</option>
              <option value="biweekly" ${repeat === 'biweekly' ? 'selected' : ''}>↻ Co 2 tygodnie</option>
            </select>
          </div>
          <button onclick="deleteNaBlock('${b.id}')" class="text-xs text-red-500 font-bold px-2 py-1">🗑️ Usuń</button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
          <input type="date" value="${b.startDate}" onchange="updateNaBlockField('${b.id}', 'startDate', this.value)" class="px-2 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs" />
          <input type="time" value="${b.startTime}" onchange="updateNaBlockField('${b.id}', 'startTime', this.value)" class="px-2 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs" />
          ${repeat === 'once' ? `<input type="date" value="${b.endDate || b.startDate}" onchange="updateNaBlockField('${b.id}', 'endDate', this.value)" class="px-2 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs" />` : `<span class="text-[11px] text-emerald-600 font-semibold">Co ${repeat === 'weekly' ? '7' : '14'} dni</span>`}
          <input type="time" value="${b.endTime}" onchange="updateNaBlockField('${b.id}', 'endTime', this.value)" class="px-2 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs" />
          <input type="text" value="${(b.note || '').replace(/"/g, '&quot;')}" placeholder="Opis" onchange="updateNaBlockField('${b.id}', 'note', this.value)" class="col-span-2 sm:col-span-1 px-2 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs" />
        </div>
      </div>
    `;
  }).join('');
}

// KONFIGURACJA BAZY ZADAŃ (DYNAMICZNE SEKCJE)
window.openConfigScreen = () => {
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('config-view').classList.remove('hidden');
  renderDynamicSectionControls();
  renderConfigTemplates();
};

window.closeConfigScreen = () => {
  document.getElementById('config-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
};

window.setConfigFilter = (f) => {
  configFilter = f;
  renderDynamicSectionControls();
  renderConfigTemplates();
};

function renderTemplateRow(t) {
  const isEnabled = t.enabled !== false;
  const freqVal = Number(t.freq || 1);
  const coopVal = t.coop || 'solo';
  return `
    <div class="p-3 rounded-2xl border transition flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 ${isEnabled ? 'bg-white dark:bg-warm-800/60 border-warm-200 dark:border-warm-700' : 'bg-warm-50 dark:bg-warm-900/40 border-warm-100 dark:border-warm-800 opacity-55'}">
      <div class="flex items-start gap-2.5 flex-1 min-w-0">
        <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="updateTemplateField('${t.id}', 'enabled', this.checked)"
          class="mt-1 w-4 h-4 accent-brand-500 rounded cursor-pointer" />
        <div class="flex-1 min-w-0">
          <input type="text" value="${t.title.replace(/"/g, '&quot;')}" onchange="updateTemplateField('${t.id}', 'title', this.value)"
            class="w-full font-bold text-sm text-warm-900 dark:text-white bg-transparent border-b border-transparent focus:border-brand-400 focus:outline-none" />
          <input type="text" value="${(t.desc || '').replace(/"/g, '&quot;')}" placeholder="Opis..." onchange="updateTemplateField('${t.id}', 'desc', this.value)"
            class="w-full text-xs text-stone-500 dark:text-stone-400 bg-transparent border-b border-transparent focus:border-brand-400 focus:outline-none" />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-1.5 shrink-0">
        <select onchange="updateTemplateField('${t.id}', 'category', this.value)"
          class="px-2 py-1 rounded-xl border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800 text-xs font-semibold">
          ${buildSectionOptionsHtml(t.category)}
        </select>

        <select onchange="updateTemplateField('${t.id}', 'freq', Number(this.value))"
          class="px-2 py-1 rounded-xl border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800 text-xs font-bold text-brand-700 dark:text-brand-300">
          <option value="30" ${freqVal >= 30 ? 'selected' : ''}>Codziennie</option>
          <option value="1" ${freqVal === 1 ? 'selected' : ''}>1x / mies.</option>
          <option value="2" ${freqVal === 2 ? 'selected' : ''}>2x / mies.</option>
          <option value="4" ${freqVal === 4 ? 'selected' : ''}>4x / mies.</option>
        </select>

        <select onchange="updateTemplateField('${t.id}', 'coop', this.value)"
          class="px-2 py-1 rounded-xl border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800 text-xs font-semibold">
          <option value="solo" ${coopVal === 'solo' ? 'selected' : ''}>👤 Solo</option>
          <option value="together" ${coopVal === 'together' ? 'selected' : ''}>👫 Razem</option>
        </select>

        <select onchange="updateTemplateField('${t.id}', 'assignee', this.value)"
          class="px-2 py-1 rounded-xl border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800 text-xs font-semibold">
          <option value="Nieprzypisane" ${!t.assignee || t.assignee === 'Nieprzypisane' ? 'selected' : ''}>❓ Do ustalenia</option>
          <option value="Przemo" ${t.assignee === 'Przemo' ? 'selected' : ''}>🧔 Przemo</option>
          <option value="Róża" ${t.assignee === 'Róża' ? 'selected' : ''}>👩 Róża</option>
          <option value="Wspólne" ${t.assignee === 'Wspólne' ? 'selected' : ''}>👫 Wspólne</option>
        </select>

        <label class="flex items-center gap-1 text-[11px] px-1.5 py-1 rounded-xl border border-warm-200 dark:border-warm-700 cursor-pointer" title="Gwiazdka">
          <input type="checkbox" ${t.starred ? 'checked' : ''} onchange="updateTemplateField('${t.id}', 'starred', this.checked)" class="accent-brand-500" />
          <span>⭐</span>
        </label>

        <label class="flex items-center gap-1 text-[11px] px-1.5 py-1 rounded-xl border border-warm-200 dark:border-warm-700 cursor-pointer" title="Poza domem / zakupy">
          <input type="checkbox" ${t.remoteOk ? 'checked' : ''} onchange="updateTemplateField('${t.id}', 'remoteOk', this.checked)" class="accent-brand-500" />
          <span>🌍</span>
        </label>

        <button onclick="deleteTemplateItem('${t.id}')" title="Usuń" class="p-1 text-stone-400 hover:text-red-500 text-xs font-bold">🗑️</button>
      </div>
    </div>
  `;
}

function renderConfigTemplates() {
  const container = document.getElementById('config-templates-list');
  const summaryEl = document.getElementById('config-summary-count');
  if (!container) return;

  const activeTemplates = taskTemplates.filter(t => t.enabled !== false);
  if (summaryEl) summaryEl.textContent = `Aktywnych: ${activeTemplates.length} z ${taskTemplates.length}`;

  const sectionsToRender = configFilter === 'all'
    ? taskSections
    : taskSections.filter(s => s.id === configFilter);

  const htmlBlocks = sectionsToRender.map((sec, idx) => {
    const items = taskTemplates.filter(t => resolveSectionId(t.category) === sec.id);
    return `
      <div class="space-y-2 pt-3">
        <div class="flex items-center justify-between px-1">
          <h3 class="text-sm font-extrabold text-brand-700 dark:text-brand-400">${sec.icon || '📌'} Sekcja ${idx + 1}: ${sec.name}</h3>
          <span class="text-xs font-semibold text-stone-400">${items.length} zadań</span>
        </div>
        <div class="space-y-2">
          ${items.length > 0 ? items.map(renderTemplateRow).join('') : '<div class="text-xs text-stone-400 px-2 py-2 rounded-xl border border-dashed border-warm-200 dark:border-warm-800">Brak zadań w tej sekcji — dodaj powyżej lub zmień sekcję istniejącego zadania.</div>'}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = htmlBlocks || `<div class="text-center text-stone-400 text-sm py-8">Brak sekcji. Dodaj pierwszą powyżej.</div>`;
}

window.updateTemplateField = async (id, field, value) => updateDoc(doc(db, "taskTemplates", id), { [field]: value });
window.deleteTemplateItem = async (id) => deleteDoc(doc(db, "taskTemplates", id));

document.getElementById('new-template-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newTpl = {
    secret: homeSecret,
    order: taskTemplates.length,
    title: document.getElementById('tpl-title').value.trim(),
    desc: document.getElementById('tpl-desc').value.trim(),
    category: document.getElementById('tpl-category').value,
    freq: Number(document.getElementById('tpl-freq').value),
    coop: document.getElementById('tpl-coop').value,
    assignee: document.getElementById('tpl-assignee').value,
    remoteOk: document.getElementById('tpl-remote').checked,
    starred: document.getElementById('tpl-starred').checked,
    enabled: true
  };
  await addDoc(collection(db, "taskTemplates"), newTpl);
  await insertTemplateInstancesIntoMonth(newTpl, currentYear, currentMonth);
  e.target.reset();
  renderDynamicSectionControls();
});

window.replaceWithFull39Tasks = async () => {
  if (!confirm("Podmienić bazę na pełną listę 39 obowiązków i wrzucić na ten miesiąc?")) return;
  const oldTpls = await getDocs(query(collection(db, "taskTemplates"), where("secret", "==", homeSecret)));
  for (const d of oldTpls.docs) await deleteDoc(doc(db, "taskTemplates", d.id));
  for (let i = 0; i < DEFAULT_MONTHLY_TASKS.length; i++) {
    const raw = DEFAULT_MONTHLY_TASKS[i];
    const tplData = { secret: homeSecret, order: i, ...raw, category: resolveSectionId(raw.category) };
    await addDoc(collection(db, "taskTemplates"), tplData);
    await insertTemplateInstancesIntoMonth(tplData, currentYear, currentMonth);
  }
  closeConfigScreen();
};

window.generateMonthFromConfig = async () => {
  const active = taskTemplates.filter(t => t.enabled !== false);
  if (active.length === 0) return alert("Zaznacz przynajmniej jedno zadanie.");
  for (const tpl of active) await insertTemplateInstancesIntoMonth(tpl, currentYear, currentMonth);
  closeConfigScreen();
};

// STATYSTYKI
function renderStats() {
  const total = allTasks.length;
  const done = allTasks.filter(t => t.completed).length;
  const remaining = total - done;
  document.getElementById('stat-remaining').textContent = remaining;
  document.getElementById('stat-total').textContent = `z ${total} zadań`;
  document.getElementById('stat-progress-bar').style.width = `${total === 0 ? 0 : Math.round((done / total) * 100)}%`;

  document.getElementById('stat-przemo').textContent = allTasks.filter(t => !t.completed && t.assignee === 'Przemo').length;
  document.getElementById('stat-roza').textContent = allTasks.filter(t => !t.completed && t.assignee === 'Róża').length;
  document.getElementById('stat-shared').textContent = allTasks.filter(t => !t.completed && (t.assignee === 'Wspólne' || t.assignee === 'Nieprzypisane' || !t.assignee)).length;

  const overdueCount = allTasks.filter(t => isTaskOverdue(t)).length;
  const overdueHint = document.getElementById('stat-overdue-hint');
  if (overdueHint) {
    if (isTestMonth(currentYear, currentMonth)) {
      overdueHint.textContent = 'Listopad: tryb testowy';
      overdueHint.className = 'text-[11px] text-amber-600 dark:text-amber-400 font-semibold';
    } else if (overdueCount > 0) {
      overdueHint.textContent = `⚠️ Zaległe: ${overdueCount}`;
      overdueHint.className = 'text-[11px] text-red-600 dark:text-red-400 font-bold';
    } else {
      overdueHint.textContent = 'Wszystko w terminie';
      overdueHint.className = 'text-[11px] text-stone-400';
    }
  }
}

// KALENDARZ
function renderCalendar() {
  const dateObj = new Date(currentYear, currentMonth, 1);
  const monthName = dateObj.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  document.getElementById('calendar-header').textContent = monthName;
  document.getElementById('current-month-label').textContent = monthName;

  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  grid.innerHTML = '';

  let firstDay = dateObj.getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div class="p-1.5 rounded-xl bg-warm-50/40 dark:bg-warm-800/20"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(currentYear, currentMonth, day);
    const dateStr = formatDate(d);
    const isWednesday = d.getDay() === 3;
    const isSelected = dateStr === selectedDateStr;
    const blocks = getBlocksForDate(dateStr);
    const hasBusy = blocks.some(b => b.mode === 'busy');
    const hasAway = blocks.some(b => b.mode === 'away');

    const openTasks = allTasks.filter(t => !t.completed && !t.isDailyHabit && t.date === dateStr);
    const doneTasks = allTasks.filter(t => t.completed && (t.completedDate || t.date) === dateStr);
    const hasOverdueDay = openTasks.some(t => isTaskOverdue(t));
    const przemoOpen = openTasks.filter(t => t.assignee === 'Przemo').length;
    const rozaOpen = openTasks.filter(t => t.assignee === 'Róża').length;
    const sharedOpen = openTasks.filter(t => t.assignee === 'Wspólne').length;
    const unassignedOpen = openTasks.filter(t => !t.assignee || t.assignee === 'Nieprzypisane').length;

    let bgClass = 'bg-white dark:bg-warm-800/70 border-warm-200 dark:border-warm-700 hover:border-brand-400';
    if (hasBusy) bgClass = 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900';
    else if (hasAway) bgClass = 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900';
    else if (hasOverdueDay) bgClass = 'bg-red-50/60 dark:bg-red-950/30 border-red-300 dark:border-red-800';
    else if (isWednesday) bgClass = 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/70';
    if (isSelected) bgClass += ' ring-2 ring-brand-500';

    const naBadgesHtml = blocks.slice(0, 2).map(b => {
      const isAway = b.mode === 'away';
      const isRecurring = b.repeat && b.repeat !== 'once';
      const whoIcon = PERSON_ICON[b.who] || '👤';
      const color = isAway ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200'
        : (b.who === 'Przemo' ? 'bg-sky-100 dark:bg-sky-900/70 text-sky-800 dark:text-sky-200'
        : (b.who === 'Róża' ? 'bg-rose-100 dark:bg-rose-900/70 text-rose-800 dark:text-rose-200' : 'bg-red-100 dark:bg-red-900/70 text-red-800 dark:text-red-200'));
      return `<div class="text-[9px] font-bold px-1 py-0.5 rounded ${color} truncate">${whoIcon}${isRecurring ? '↻' : (isAway ? '🏠' : '⛔')} ${b.startTime}</div>`;
    }).join('');

    let taskPills = '';
    if (openTasks.length > 0) {
      const parts = [];
      if (przemoOpen > 0) parts.push(`<span class="bg-sky-100 dark:bg-sky-900/80 text-sky-800 dark:text-sky-200 px-1 rounded">🧔${przemoOpen}</span>`);
      if (rozaOpen > 0) parts.push(`<span class="bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 px-1 rounded">👩${rozaOpen}</span>`);
      if (sharedOpen > 0) parts.push(`<span class="bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 px-1 rounded">👫${sharedOpen}</span>`);
      if (unassignedOpen > 0) parts.push(`<span class="bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 px-1 rounded">❓${unassignedOpen}</span>`);
      taskPills = `<div class="flex flex-wrap gap-0.5 text-[9px] font-extrabold">${parts.join('')}</div>`;
    }

    grid.innerHTML += `
      <button onclick="selectDay('${dateStr}')" class="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-left flex flex-col justify-between min-h-[72px] sm:min-h-[82px] transition ${bgClass}">
        <div class="flex justify-between items-center w-full">
          <span class="text-xs font-extrabold ${hasOverdueDay ? 'text-red-600' : (isWednesday ? 'text-emerald-700 dark:text-emerald-400' : 'text-warm-800 dark:text-stone-200')}">${day}</span>
        </div>
        <div class="mt-1 space-y-0.5 w-full">
          ${naBadgesHtml}
          ${taskPills}
          ${doneTasks.length > 0 ? `<div class="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 px-1 rounded truncate">✓ ${doneTasks.length} zrobione</div>` : ''}
        </div>
      </button>
    `;
  }
  updateSelectedDayPanel();
}

window.selectDay = (dateStr) => {
  selectedDateStr = dateStr;
  syncDateInputs(dateStr);
  renderCalendar();
};

function updateSelectedDayPanel() {
  const label = document.getElementById('selected-day-label');
  const list = document.getElementById('selected-day-na-list');
  if (!selectedDateStr || !label || !list) return;

  const d = parseLocalDate(selectedDateStr);
  label.textContent = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }) + (d.getDay() === 3 ? ' (🌿 wolne po pracy)' : '');

  const blocks = getBlocksForDate(selectedDateStr);
  const doneThatDay = allTasks.filter(t => t.completed && (t.completedDate || t.date) === selectedDateStr);

  let html = '';
  if (blocks.length > 0) {
    html += blocks.map(b => {
      const isAway = b.mode === 'away';
      return `
        <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs border ${isAway ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 text-amber-900 dark:text-amber-200' : 'bg-red-50 dark:bg-red-950/50 border-red-200 text-red-900 dark:text-red-200'}">
          <div>
            <span class="font-bold">${PERSON_ICON[b.who] || '👤'} ${b.who} • ${isAway ? '🏠 Poza domem' : '⛔ N/A'} (${b.startTime}–${b.endTime})</span>
            ${b.note ? `<span class="block text-[11px] opacity-75">${b.note}</span>` : ''}
          </div>
          <button onclick="deleteNaBlock('${b.id}')" class="px-1.5 py-0.5 rounded hover:bg-black/10 font-bold">✕</button>
        </div>
      `;
    }).join('');
  }

  if (doneThatDay.length > 0) {
    html += `
      <div class="pt-1.5 space-y-1">
        <div class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">✅ Wykonane tego dnia (${doneThatDay.length}):</div>
        ${doneThatDay.map(t => {
          const sec = getSectionMeta(t.category);
          return `
            <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200">
              <span class="font-semibold truncate">${sec.icon} ${t.title}</span>
              <span class="text-[10px] font-bold shrink-0">${PERSON_ICON[t.assignee] || ''} ${t.assignee || ''}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  list.innerHTML = html || `<div class="text-xs text-stone-400">Brak blokad N/A ani wykonanych zadań w tym dniu.</div>`;
}

window.changeMonth = (delta) => {
  currentMonth += delta;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  subscribeFirestore();
};

// LISTA ZADAŃ W MIESIĄCU
function renderTasks() {
  const list = document.getElementById('tasks-list');
  if (!list) return;
  let filtered = [...allTasks];

  if (currentFilter !== 'all') {
    filtered = currentFilter === 'together'
      ? filtered.filter(t => t.coop === 'together')
      : filtered.filter(t => (t.assignee || 'Nieprzypisane') === currentFilter || resolveSectionId(t.category) === currentFilter);
  }

  filtered.sort((a, b) => {
    if (Number(a.completed) !== Number(b.completed)) return Number(a.completed) - Number(b.completed);
    if (Boolean(a.isDailyHabit) !== Boolean(b.isDailyHabit)) return a.isDailyHabit ? 1 : -1;
    const dateCmp = (a.date || '9999-12-31').localeCompare(b.date || '9999-12-31');
    if (dateCmp !== 0) return dateCmp;
    return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="text-center text-stone-400 text-sm py-10 bg-warm-50 dark:bg-warm-800/40 rounded-2xl border border-dashed border-warm-200 dark:border-warm-700">
      Brak zadań w tym widoku.<br>Wejdź w <strong>„🛠️ Baza zadań”</strong> na górze.
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(task => {
    const who = task.assignee || 'Nieprzypisane';
    const coop = task.coop || 'solo';
    const sec = getSectionMeta(task.category);
    const overdue = isTaskOverdue(task);

    let cardStyle = 'bg-white dark:bg-warm-800/60 border-warm-200 dark:border-warm-700 hover:border-brand-300';
    if (task.completed) cardStyle = 'bg-warm-50 dark:bg-warm-800/30 border-warm-100 dark:border-warm-800 opacity-60';
    else if (overdue) cardStyle = 'bg-red-50/90 dark:bg-red-950/50 border-red-400 dark:border-red-700 ring-1 ring-red-400/40';
    else if (task.starred) cardStyle = 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-800/70';

    return `
      <div class="p-3.5 rounded-2xl border transition flex items-start gap-3 ${cardStyle}">
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}', ${!task.completed})"
          class="mt-1 w-5 h-5 accent-brand-500 rounded cursor-pointer" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs">${sec.icon}</span>
            <span class="font-bold text-sm ${overdue ? 'text-red-900 dark:text-red-200' : 'text-warm-900 dark:text-white'} ${task.completed ? 'line-through text-stone-400' : ''}">${task.title}</span>
            ${overdue ? `<span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-red-600 text-white">⚠️ Zaległe</span>` : ''}
          </div>
          ${task.desc ? `<p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">${task.desc}</p>` : ''}
          <div class="flex items-center gap-1.5 mt-2 flex-wrap">
            <select onchange="changeTaskCategory('${task.id}', this.value)" title="Zmień sekcję zadania"
              class="text-[11px] font-bold px-2 py-0.5 rounded-md border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800 cursor-pointer">
              ${buildSectionOptionsHtml(task.category)}
            </select>
            <select onchange="reassignTask('${task.id}', this.value)" title="Zmień osobę"
              class="text-[11px] font-bold px-2 py-0.5 rounded-md border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800 cursor-pointer">
              <option value="Nieprzypisane" ${who === 'Nieprzypisane' ? 'selected' : ''}>❓ Do ustalenia</option>
              <option value="Przemo" ${who === 'Przemo' ? 'selected' : ''}>🧔 Przemo</option>
              <option value="Róża" ${who === 'Róża' ? 'selected' : ''}>👩 Róża</option>
              <option value="Wspólne" ${who === 'Wspólne' ? 'selected' : ''}>👫 Wspólne</option>
            </select>
            <button onclick="toggleTaskCoop('${task.id}', '${coop === 'together' ? 'solo' : 'together'}')"
              class="text-[10px] font-bold px-2 py-0.5 rounded-md border transition ${coop === 'together' ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-200 border-purple-200' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200'}">
              ${coop === 'together' ? '👫 Razem' : '👤 Solo'}
            </button>
            ${task.completed && (task.completedDate || task.date)
              ? `<span class="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">✓ Zrobione: ${task.completedDate || task.date}</span>`
              : (task.isDailyHabit ? `<span class="text-[10px] bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-semibold">↻ Codziennie</span>`
              : (task.date ? `<span class="text-[11px] text-stone-500 dark:text-stone-400 font-medium">📅 ${task.date}</span>` : ''))}
            ${task.remoteOk ? `<span class="text-[10px] bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold">🌍 Poza domem</span>` : ''}
          </div>
        </div>
        <button onclick="deleteTask('${task.id}')" class="text-stone-300 hover:text-red-500 text-sm px-1">✕</button>
      </div>
    `;
  }).join('');
}

window.changeTaskCategory = async (id, category) => updateDoc(doc(db, "tasks", id), { category });
window.reassignTask = async (id, assignee) => updateDoc(doc(db, "tasks", id), { assignee });
window.toggleTaskCoop = async (id, coop) => updateDoc(doc(db, "tasks", id), { coop });
window.toggleTask = async (id, completed) => {
  const todayStr = formatDate(new Date());
  const task = allTasks.find(t => t.id === id);
  const updates = {
    completed,
    completedDate: completed ? todayStr : null
  };
  if (completed && task) {
    if (!task.isDailyHabit) updates.date = todayStr;
    if (!task.assignee || task.assignee === 'Nieprzypisane') updates.assignee = activeUser;
  }
  await updateDoc(doc(db, "tasks", id), updates);
};
window.deleteTask = async (id) => deleteDoc(doc(db, "tasks", id));

window.setFilter = (f) => {
  currentFilter = f;
  renderDynamicSectionControls();
  renderTasks();
};

window.toggleAddForm = () => {
  document.getElementById('add-task-form').classList.toggle('hidden');
  renderDynamicSectionControls();
};

document.getElementById('add-task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const desc = document.getElementById('task-desc').value.trim();
  const assignee = document.getElementById('task-assignee').value;
  const coop = document.getElementById('task-coop').value;
  const category = document.getElementById('task-category').value;
  const date = document.getElementById('task-date').value;
  const count = Number(document.getElementById('task-recurrence').value);
  const remoteOk = document.getElementById('task-remote-ok').checked;
  const starred = document.getElementById('task-starred').checked;
  const monthKey = getMonthKey(currentYear, currentMonth);

  let baseDate = date ? parseLocalDate(date) : new Date(currentYear, currentMonth, 1);
  const stepDays = count === 2 ? 14 : 7;

  for (let i = 0; i < count; i++) {
    if (baseDate.getMonth() === currentMonth || i === 0) {
      await addDoc(collection(db, "tasks"), {
        secret: homeSecret,
        title: count > 1 ? `${title} (${i + 1}/${count})` : title,
        desc, assignee, coop, category,
        date: formatDate(baseDate),
        recurrence: count > 1 ? 'recurring' : 'once',
        isDailyHabit: false,
        remoteOk, starred, monthKey, completed: false
      });
    }
    baseDate.setDate(baseDate.getDate() + stepDays);
  }
  e.target.reset();
  syncDateInputs(selectedDateStr);
  renderDynamicSectionControls();
  toggleAddForm();
});

// ASYSTENT AI MIESIĘCZNY
window.openAiModal = () => {
  document.getElementById('ai-modal').classList.remove('hidden');
  document.getElementById('ai-modal').classList.add('flex');
};

window.runAiPlanner = async () => {
  const apiKey = localStorage.getItem('gemini_api_key');
  const out = document.getElementById('ai-output');
  if (!apiKey) return (out.textContent = "Najpierw wklej klucz API Google Gemini w ⚙️ Profile.");

  const openTasks = allTasks.filter(t => !t.completed && !t.isDailyHabit);
  if (openTasks.length === 0) return (out.textContent = "Brak otwartych zadań okresowych w tym miesiącu.");

  out.textContent = "Układam zwięzły plan...";

  const naSummary = naBlocks.map(b => `${b.who}:${b.mode} ${b.startDate} ${b.startTime}-${b.endTime} (${b.repeat || 'once'})`).join('; ') || 'brak';
  const tasksSummary = openTasks.slice(0, 28).map(t => `${t.title} [${getSectionMeta(t.category).name}, ${t.coop === 'together' ? 'RAZEM' : 'SOLO'}, ${t.assignee || '?'}]`).join('; ');

  const prompt = `Zaplanuj po polsku w krótkich punktach zadania dla Przema i Róży (${getMonthKey(currentYear, currentMonth)}).
Przemo: ${userProfiles.przemo}
Róża: ${userProfiles.roza}
Dom: ${userProfiles.home}
N/A: ${naSummary}
Zadania: ${tasksSummary}
Zasady: rozdziel zadania SOLO po równo, zadania RAZEM zaplanuj wspólnie (np. weekend); w ŚRODY po pracy wrzucaj Przemo wyłącznie 1 lekkie, szybkie zadanie 'z głowy' (np. śmieci, rośliny, miski/zęby Czosnka), a grubsze rzeczy dawaj na inne dni; uszanuj N/A i podsuń Róży okienko na e-booka.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 700 }
      })
    });
    const data = await res.json();
    out.textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Brak odpowiedzi — sprawdź klucz API.";
  } catch (e) {
    out.textContent = "Błąd połączenia z API Gemini.";
  }
};

// USTAWIENIA I PROFILE
window.openSettingsModal = () => {
  document.getElementById('gemini-key-input').value = localStorage.getItem('gemini_api_key') || '';
  document.getElementById('profile-przemo-input').value = userProfiles.przemo;
  document.getElementById('profile-roza-input').value = userProfiles.roza;
  document.getElementById('profile-home-input').value = userProfiles.home;
  document.getElementById('settings-modal').classList.remove('hidden');
  document.getElementById('settings-modal').classList.add('flex');
};

window.saveSettings = async () => {
  localStorage.setItem('gemini_api_key', document.getElementById('gemini-key-input').value.trim());
  const przemo = document.getElementById('profile-przemo-input').value.trim() || DEFAULT_PROFILES.przemo;
  const roza = document.getElementById('profile-roza-input').value.trim() || DEFAULT_PROFILES.roza;
  const home = document.getElementById('profile-home-input').value.trim() || DEFAULT_PROFILES.home;

  userProfiles = { przemo, roza, home };
  personalAiCache = { Przemo: null, Róża: null };
  await setDoc(doc(db, "homeSettings", `profiles_${homeSecret}`), { secret: homeSecret, przemo, roza, home });
  renderPersonalFocusCard();
  closeModal('settings-modal');
};

window.closeModal = (id) => {
  document.getElementById(id).classList.add('hidden');
  document.getElementById(id).classList.remove('flex');
};

if (homeSecret) startApp();