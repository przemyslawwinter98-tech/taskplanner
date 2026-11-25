import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, where, setDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  PERSON_ICON, SECTIONS_META, CAT_ICON, DEFAULT_PROFILES, DEFAULT_MONTHLY_TASKS
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
let userProfiles = { ...DEFAULT_PROFILES };
let personalAiCache = { Przemo: null, Róża: null };
let unsubTasks = null, unsubNa = null, unsubTemplates = null, unsubProfiles = null;
let seededTemplatesOnce = false;

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
    suggestions.push({
      badge: `${task.starred ? '⭐ ' : ''}${task.coop === 'together' ? '👫 Razem' : '👤 Solo'}`,
      title: task.title,
      desc: `${task.category}${task.desc ? ` — ${task.desc}` : ''}`
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
    `${t.title} (${t.category}, ${t.coop === 'together' ? 'RAZEM' : 'SOLO'}, ${t.assignee || '?'}${t.remoteOk ? ', poza domem' : ''})`
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

// AUTORYZACJA
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
if (homeSecret) startApp();

document.getElementById('auth-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const val = document.getElementById('secret-input').value.trim();
  if (!val) return;
  homeSecret = val;
  localStorage.setItem('home_planner_secret', homeSecret);
  startApp();
});

window.logout = () => {
  localStorage.removeItem('home_planner_secret');
  location.reload();
};

function startApp() {
  authScreen.classList.add('hidden');
  appContainer.classList.remove('hidden');
  updateUserProfileUI();
  syncDateInputs(selectedDateStr);
  renderCalendar();
  renderPersonalFocusCard();
  subscribeFirestore();
}

function syncDateInputs(dateStr) {
  document.getElementById('task-date').value = dateStr;
  document.getElementById('na-start-date').value = dateStr;
  document.getElementById('na-end-date').value = dateStr;
}

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

  for (let idx = 0; idx < dates.length; idx++) {
    await addDoc(collection(db, "tasks"), {
      secret: homeSecret,
      title: (!isDailyHabit && dates.length > 1) ? `${tpl.title} (${idx + 1}/${dates.length})` : tpl.title,
      desc: tpl.desc || '',
      assignee,
      coop: tpl.coop || 'solo',
      category: tpl.category,
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

  const monthKey = getMonthKey(currentYear, currentMonth);
  const testBadge = document.getElementById('test-month-badge');
  if (testBadge) testBadge.classList.toggle('hidden', !isTestMonth(currentYear, currentMonth));

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

  const qTasks = query(collection(db, "tasks"), where("secret", "==", homeSecret), where("monthKey", "==", monthKey));
  unsubTasks = onSnapshot(qTasks, (snapshot) => {
    allTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTasks();
    renderStats();
    renderCalendar();
    renderPersonalFocusCard();
  }, () => {
    document.getElementById('auth-error').classList.remove('hidden');
    authScreen.classList.remove('hidden');
    appContainer.classList.add('hidden');
  });

  const qNa = query(collection(db, "naBlocks"), where("secret", "==", homeSecret));
  unsubNa = onSnapshot(qNa, (snapshot) => {
    naBlocks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('na-total-count').textContent = naBlocks.length;
    renderCalendar();
    updateSelectedDayPanel();
    renderNaManagerList();
    renderPersonalFocusCard();
  });

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

document.getElementById('na-form').addEventListener('submit', async (e) => {
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
          ${repeat === 'once' ? `<input type="date" value="${b.endDate \vert{}\vert{} b.startDate}" onchange="updateNaBlockField('${b.id}', 'endDate', this.value)" class="px-2 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs" />` : `<span class="text-[11px] text-emerald-600 font-semibold">Co ${repeat === 'weekly' ? '7' : '14'} dni</span>`}
          <input type="time" value="${b.endTime}" onchange="updateNaBlockField('${b.id}', 'endTime', this.value)" class="px-2 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs" />
          <input type="text" value="${(b.note || '').replace(/"/g, '&quot;')}" placeholder="Opis" onchange="updateNaBlockField('${b.id}', 'note', this.value)" class="col-span-2 sm:col-span-1 px-2 py-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-xs" />
        </div>
      </div>
    `;
  }).join('');
}

// KONFIGURACJA BAZY ZADAŃ (POGRUPOWANA NA 5 WYRAŹNYCH SEKCJI)
window.openConfigScreen = () => {
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('config-view').classList.remove('hidden');
  renderConfigTemplates();
};

window.closeConfigScreen = () => {
  document.getElementById('config-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
};

window.setConfigFilter = (f) => {
  configFilter = f;
  document.querySelectorAll('.cfilter-btn').forEach(btn => {
    btn.className = btn.dataset.cfilter === f
      ? 'cfilter-btn px-3 py-1 rounded-full text-xs font-bold bg-warm-900 dark:bg-brand-500 text-white'
      : 'cfilter-btn px-3 py-1 rounded-full text-xs font-semibold bg-warm-100 dark:bg-warm-800 text-stone-600 dark:text-stone-300';
  });
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
          <option value="Łazienka" ${t.category === 'Łazienka' ? 'selected' : ''}>🛁 Łazienka</option>
          <option value="Czosnek" ${t.category === 'Czosnek' ? 'selected' : ''}>🐕 Czosnek</option>
          <option value="Mieszkanie" ${t.category === 'Mieszkanie' ? 'selected' : ''}>🧹 Mieszkanie</option>
          <option value="Rachunki i auto" ${t.category === 'Rachunki i auto' ? 'selected' : ''}>🚗 Auto/Zakupy</option>
          <option value="Kuchnia" ${t.category === 'Kuchnia' ? 'selected' : ''}>🍳 Kuchnia</option>
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
  summaryEl.textContent = `Aktywnych: ${activeTemplates.length} z ${taskTemplates.length}`;

  const sectionsToRender = configFilter === 'all'
    ? SECTIONS_META
    : SECTIONS_META.filter(s => s.id === configFilter);

  const htmlBlocks = sectionsToRender.map(sec => {
    const items = taskTemplates.filter(t => (t.category || 'Inne') === sec.id);
    if (items.length === 0 && configFilter === 'all') return '';
    return `
      <div class="space-y-2 pt-3">
        <div class="flex items-center justify-between px-1">
          <h3 class="text-sm font-extrabold text-brand-700 dark:text-brand-400">${sec.label}</h3>
          <span class="text-xs font-semibold text-stone-400">${items.length} zadań</span>
        </div>
        <div class="space-y-2">
          ${items.length > 0 ? items.map(renderTemplateRow).join('') : '<div class="text-xs text-stone-400 px-2">Brak zadań w tej sekcji.</div>'}
        </div>
      </div>
    `;
  }).join('');

  const knownIds = new Set(SECTIONS_META.map(s => s.id));
  const otherItems = configFilter === 'all' ? taskTemplates.filter(t => !knownIds.has(t.category)) : [];
  const otherBlock = otherItems.length > 0 ? `
    <div class="space-y-2 pt-3">
      <h3 class="text-sm font-extrabold text-stone-500">📌 Pozostałe</h3>
      <div class="space-y-2">${otherItems.map(renderTemplateRow).join('')}</div>
    </div>
  ` : '';

  container.innerHTML = (htmlBlocks + otherBlock) || `<div class="text-center text-stone-400 text-sm py-8">Brak zadań w bazie. Kliknij „Załaduj pełną listę 39 obowiązków”.</div>`;
}

window.updateTemplateField = async (id, field, value) => updateDoc(doc(db, "taskTemplates", id), { [field]: value });
window.deleteTemplateItem = async (id) => deleteDoc(doc(db, "taskTemplates", id));

document.getElementById('new-template-form').addEventListener('submit', async (e) => {
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
});

window.replaceWithFull39Tasks = async () => {
  if (!confirm("Podmienić bazę na pełną listę 39 obowiązków w 5 sekcjach i wrzucić na ten miesiąc?")) return;
  const oldTpls = await getDocs(query(collection(db, "taskTemplates"), where("secret", "==", homeSecret)));
  for (const d of oldTpls.docs) await deleteDoc(doc(db, "taskTemplates", d.id));
  for (let i = 0; i < DEFAULT_MONTHLY_TASKS.length; i++) {
    const tplData = { secret: homeSecret, order: i, ...DEFAULT_MONTHLY_TASKS[i] };
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
          ${doneTasks.length > 0 ? `<div class="text-[9px] font-bold bg-emerald-100 dark