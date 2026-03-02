import { useEffect, useMemo, useRef, useState } from "react";
import {
  CALENDAR_WEEKDAYS,
  HABIT_CATALOG,
  MAX_MEDIA_PER_ENTRY,
  MOOD_OPTIONS,
  STORAGE_BYTES_SOFT_LIMIT,
  buildMotivationalMessage,
  captureAutomaticMetadata,
  clearDraftSnapshot,
  clearLockPin,
  collectDueReminderAlerts,
  createClientId,
  createEmptyDraft,
  estimateStorageSize,
  formatDateFr,
  formatDateKey,
  formatDateTimeFr,
  getDailyMotivationScheduleInfo,
  getMemoriesForDate,
  getPromptForDate,
  getYearOverviewStats,
  hasLockPin,
  initCalendar,
  listTimelineEntries,
  loadDraftSnapshot,
  loadEntries,
  loadProfileName,
  markDailyMotivationSent,
  markReminderAlertsNotified,
  moodToEmoji,
  parseDateKey,
  persistDraftSnapshot,
  persistEntries,
  persistProfileName,
  prepareMediaFiles,
  requestNotificationAccess,
  sendBrowserNotification,
  setLockPin,
  shouldSendDailyMotivation,
  verifyLockPin
} from "./app";

function downloadFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sortReminders(reminders) {
  return [...reminders].sort((left, right) => {
    if (!left.scheduledFor && !right.scheduledFor) {
      return left.createdAt.localeCompare(right.createdAt);
    }

    if (!left.scheduledFor) {
      return 1;
    }

    if (!right.scheduledFor) {
      return -1;
    }

    return new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime();
  });
}

const MONTH_TAB_LABELS = {
  fr: ["JAN", "FEV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOU", "SEP", "OCT", "NOV", "DEC"],
  en: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
  es: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]
};

const STICKER_LIBRARY = [
  { emoji: "😊", label: "Mood zen" },
  { emoji: "🔥", label: "Motivation" },
  { emoji: "🌈", label: "Good vibes" },
  { emoji: "☀️", label: "Météo soleil" },
  { emoji: "🌧️", label: "Météo pluie" },
  { emoji: "💪", label: "Force" },
  { emoji: "✨", label: "Petit miracle" },
  { emoji: "🫶", label: "Gratitude" }
];

function clampRange(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function getWeekStartKey(dateKey) {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  return formatDateKey(addDays(date, delta));
}

function getMonthTurnDirection(currentIndex, targetIndex) {
  const forwardDistance = (targetIndex - currentIndex + 12) % 12;
  const backwardDistance = (currentIndex - targetIndex + 12) % 12;
  return forwardDistance <= backwardDistance ? "next" : "prev";
}

function getIsoWeekNumber(inputDate) {
  const date = new Date(inputDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

function buildMonthWeekShortcuts(month) {
  if (!month || !Array.isArray(month.cells) || month.cells.length === 0) {
    return [];
  }

  const shortcuts = [];
  for (let index = 0; index < month.cells.length; index += 7) {
    const slice = month.cells.slice(index, index + 7);
    const firstDay = slice.find(Boolean);
    if (!firstDay) {
      continue;
    }

    const weekStartKey = getWeekStartKey(firstDay.dateKey);
    shortcuts.push({
      id: `${month.monthIndex}-${index}-${weekStartKey}`,
      weekStartKey,
      weekNumber: getIsoWeekNumber(parseDateKey(weekStartKey))
    });
  }

  return shortcuts;
}

function buildWeekPlannerCells(weekStartKey, entries, todayKey) {
  const startDate = parseDateKey(weekStartKey);

  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(startDate, offset);
    const dateKey = formatDateKey(date);
    const entry = entries?.[dateKey];
    const reminderCount = Array.isArray(entry?.reminders)
      ? entry.reminders.filter((item) => !item.done).length
      : 0;
    const completedHabits = HABIT_CATALOG.filter((habit) => Boolean(entry?.habits?.[habit.id])).length;

    return {
      dateKey,
      entry,
      reminderCount,
      completedHabits,
      isToday: dateKey === todayKey
    };
  });
}

function buildReadableJournalMarkdown(entries, profileName) {
  const titleName = profileName?.trim() ? `${profileName.trim()} - ` : "";
  const now = new Date().toISOString();

  const lines = [
    `# ${titleName}NOUS - Journal`,
    "",
    `Export: ${now}`,
    `Nombre d'entrees: ${entries.length}`,
    ""
  ];

  if (entries.length === 0) {
    lines.push("Aucune entree enregistree.");
    return `${lines.join("\n")}\n`;
  }

  for (const entry of entries) {
    const dateLabel = formatDateFr(entry.dateISO, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    lines.push(`## ${dateLabel}`);
    lines.push(`- Humeur: ${moodToEmoji(entry.mood)} (${entry.mood ?? "-"}/5)`);
    lines.push(`- Favori: ${entry.favorite ? "Oui" : "Non"}`);
    lines.push(`- Localisation: ${entry.metadata?.locationLabel || "Non renseignee"}`);
    lines.push(
      `- Meteo: ${
        entry.metadata?.weather
          ? `${entry.metadata.weather.description} (${entry.metadata.weather.temperatureC ?? "?"}degC)`
          : "Non renseignee"
      }`
    );

    if (entry.customMessage?.trim()) {
      lines.push("");
      lines.push("### Message personnalise");
      lines.push(entry.customMessage.trim());
    }

    if (entry.text?.trim()) {
      lines.push("");
      lines.push("### Journal");
      lines.push(entry.text.trim());
    } else if (entry.media?.length) {
      lines.push("");
      lines.push("### Journal");
      lines.push("(Entree media sans texte)");
    }

    if (Array.isArray(entry.reminders) && entry.reminders.length > 0) {
      lines.push("");
      lines.push("### Rappels");
      for (const reminder of entry.reminders) {
        lines.push(`- [${reminder.done ? "x" : " "}] ${reminder.title}`);
      }
    }

    const completedHabits = HABIT_CATALOG.filter((habit) => Boolean(entry?.habits?.[habit.id]));
    if (completedHabits.length > 0) {
      lines.push("");
      lines.push("### Habitudes");
      lines.push(`- ${completedHabits.map((habit) => `${habit.icon} ${habit.label}`).join(" | ")}`);
    }

    if (entry.scrapbookText?.trim()) {
      lines.push("");
      lines.push("### Scrapbook");
      lines.push(entry.scrapbookText.trim());
      if (Array.isArray(entry.stickers) && entry.stickers.length > 0) {
        lines.push(`- Stickers: ${entry.stickers.map((item) => item.emoji).join(" ")}`);
      }
    } else if (Array.isArray(entry.stickers) && entry.stickers.length > 0) {
      lines.push("");
      lines.push("### Scrapbook");
      lines.push(`- Stickers: ${entry.stickers.map((item) => item.emoji).join(" ")}`);
    }

    if (Array.isArray(entry.futureMessages) && entry.futureMessages.length > 0) {
      lines.push("");
      lines.push("### Capsules temporelles");
      for (const message of entry.futureMessages) {
        const recipient = message.recipient || "Moi";
        lines.push(`- Pour ${recipient} le ${formatDateTimeFr(message.openOn)}`);
      }
    }

    if (entry.media?.length) {
      lines.push("");
      lines.push(`### Medias (${entry.media.length})`);
      lines.push("- Contenu media present dans l'application locale.");
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const LANGUAGE_OPTIONS = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" }
];

const UI_TEXT = {
  fr: {
    appTaglineCalendar: "Calendrier d'abord. Profil et réglages sur une page séparée.",
    appTaglineProfile: "Espace profil: statistiques, sécurité et préférences.",
    openToday: "Ouvrir aujourd'hui",
    backCalendar: "Retour calendrier",
    profileSpace: "Espace profil",
    calendar: "Calendrier",
    timeline: "Timeline",
    yearMinus: "Année -1",
    yearPlus: "Année +1",
    today: "Aujourd'hui",
    timelineEmptyTitle: "Ta timeline est vide",
    timelineEmptyText: "Ajoute une première entrée depuis la vue calendrier.",
    profileTitle: "Espace profil",
    profileSummary: "Ton espace perso pour suivre ton bien-être, tes habitudes et tes rappels.",
    firstName: "Prénom",
    firstNamePlaceholder: "Ton prénom",
    statsJourney: "Parcours annuel",
    statsMood: "Humeur moyenne",
    statsFavorites: "Favoris & Rappels",
    noData: "Aucune donnée",
    legendFavorite: "❤️ Favori",
    legendJournal: "📝 Journal",
    legendReminder: "🔔 Rappel actif",
    legendMood: "🙂 Humeur",
    goCalendar: "Voir calendrier",
    goTimeline: "Voir timeline",
    downloadJournal: "Télécharger mon journal",
    security: "Sécurité",
    lock: "Verrouiller",
    notificationsStatus: "Statut notifications",
    dailyMessageAt: "Message quotidien",
    historyTitle: "Historique personnel",
    historyJournal: "Journal",
    historyReminder: "Rappels",
    historyMood: "Humeur",
    historyFavorite: "Favoris",
    historyEmpty: "Aucun élément dans cette catégorie.",
    historyCount: "{count} élément(s)",
    entryWithoutText: "(Entrée sans texte)",
    reminderCount: "{count} rappel(s)",
    moodLabel: "Humeur: {emoji}",
    settingsTitle: "Préférences de l'app",
    language: "Langue",
    theme: "Thème",
    themeLight: "Clair",
    themeDark: "Sombre",
    enabled: "Activée",
    reminderSound: "Son rappel (app ouverte)",
    ringtone: "Sonnerie",
    ringtoneChime: "Cloche",
    ringtoneSoft: "Douce",
    ringtoneDigital: "Digitale",
    ringtoneOff: "Désactivée",
    reminderNotificationTitle: "Rappel personnel",
    dailyNotificationTitle: "Message motivationnel du matin",
    mobileNavCalendar: "Calendrier",
    mobileNavProfile: "Profil",
    mobileNavToday: "Aujourd'hui"
  },
  en: {
    appTaglineCalendar: "Calendar first. Profile and settings are on a separate page.",
    appTaglineProfile: "Profile area: stats, security, and preferences.",
    openToday: "Open today",
    backCalendar: "Back to calendar",
    profileSpace: "Profile space",
    calendar: "Calendar",
    timeline: "Timeline",
    yearMinus: "Year -1",
    yearPlus: "Year +1",
    today: "Today",
    timelineEmptyTitle: "Your timeline is empty",
    timelineEmptyText: "Add your first entry from calendar view.",
    profileTitle: "Profile space",
    profileSummary: "Your personal space to track well-being, habits, and reminders.",
    firstName: "First name",
    firstNamePlaceholder: "Your first name",
    statsJourney: "Year progress",
    statsMood: "Average mood",
    statsFavorites: "Favorites & Reminders",
    noData: "No data",
    legendFavorite: "❤️ Favorite",
    legendJournal: "📝 Journal",
    legendReminder: "🔔 Active reminder",
    legendMood: "🙂 Mood",
    goCalendar: "Open calendar",
    goTimeline: "Open timeline",
    downloadJournal: "Download my journal",
    security: "Security",
    lock: "Lock",
    notificationsStatus: "Notifications status",
    dailyMessageAt: "Daily message",
    historyTitle: "Personal history",
    historyJournal: "Journal",
    historyReminder: "Reminders",
    historyMood: "Mood",
    historyFavorite: "Favorites",
    historyEmpty: "No items in this category.",
    historyCount: "{count} item(s)",
    entryWithoutText: "(Entry without text)",
    reminderCount: "{count} reminder(s)",
    moodLabel: "Mood: {emoji}",
    settingsTitle: "App preferences",
    language: "Language",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    enabled: "Enabled",
    reminderSound: "Reminder sound (app open)",
    ringtone: "Ringtone",
    ringtoneChime: "Chime",
    ringtoneSoft: "Soft",
    ringtoneDigital: "Digital",
    ringtoneOff: "Disabled",
    reminderNotificationTitle: "Personal reminder",
    dailyNotificationTitle: "Morning motivational message",
    mobileNavCalendar: "Calendar",
    mobileNavProfile: "Profile",
    mobileNavToday: "Today"
  },
  es: {
    appTaglineCalendar: "Primero el calendario. Perfil y ajustes en una página separada.",
    appTaglineProfile: "Espacio de perfil: estadísticas, seguridad y preferencias.",
    openToday: "Abrir hoy",
    backCalendar: "Volver al calendario",
    profileSpace: "Espacio perfil",
    calendar: "Calendario",
    timeline: "Timeline",
    yearMinus: "Año -1",
    yearPlus: "Año +1",
    today: "Hoy",
    timelineEmptyTitle: "Tu timeline está vacía",
    timelineEmptyText: "Agrega tu primera entrada desde la vista calendario.",
    profileTitle: "Espacio perfil",
    profileSummary: "Tu espacio personal para seguir tu bienestar, hábitos y recordatorios.",
    firstName: "Nombre",
    firstNamePlaceholder: "Tu nombre",
    statsJourney: "Progreso anual",
    statsMood: "Estado de ánimo promedio",
    statsFavorites: "Favoritos y recordatorios",
    noData: "Sin datos",
    legendFavorite: "❤️ Favorito",
    legendJournal: "📝 Diario",
    legendReminder: "🔔 Recordatorio activo",
    legendMood: "🙂 Ánimo",
    goCalendar: "Ver calendario",
    goTimeline: "Ver timeline",
    downloadJournal: "Descargar mi diario",
    security: "Seguridad",
    lock: "Bloquear",
    notificationsStatus: "Estado notificaciones",
    dailyMessageAt: "Mensaje diario",
    historyTitle: "Historial personal",
    historyJournal: "Diario",
    historyReminder: "Recordatorios",
    historyMood: "Ánimo",
    historyFavorite: "Favoritos",
    historyEmpty: "No hay elementos en esta categoría.",
    historyCount: "{count} elemento(s)",
    entryWithoutText: "(Entrada sin texto)",
    reminderCount: "{count} recordatorio(s)",
    moodLabel: "Ánimo: {emoji}",
    settingsTitle: "Preferencias de la app",
    language: "Idioma",
    theme: "Tema",
    themeLight: "Claro",
    themeDark: "Oscuro",
    enabled: "Activado",
    reminderSound: "Sonido de recordatorio (app abierta)",
    ringtone: "Tono",
    ringtoneChime: "Campana",
    ringtoneSoft: "Suave",
    ringtoneDigital: "Digital",
    ringtoneOff: "Desactivado",
    reminderNotificationTitle: "Recordatorio personal",
    dailyNotificationTitle: "Mensaje motivacional de la mañana",
    mobileNavCalendar: "Calendario",
    mobileNavProfile: "Perfil",
    mobileNavToday: "Hoy"
  }
};

function resolveText(language, key, vars = {}) {
  const dictionary = UI_TEXT[language] || UI_TEXT.fr;
  const template = dictionary[key] || UI_TEXT.fr[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ""));
}

function playReminderTone(ringtone) {
  if (!ringtone || ringtone === "off" || typeof window === "undefined") {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const now = context.currentTime;
    const sequence =
      ringtone === "digital"
        ? [990, 660, 990]
        : ringtone === "soft"
          ? [523.25, 659.25, 783.99]
          : [659.25, 783.99, 987.77];

    sequence.forEach((frequency, index) => {
      const startTime = now + index * 0.14;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = ringtone === "digital" ? "square" : "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.08, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.13);
    });

    setTimeout(() => {
      context.close().catch(() => {});
    }, 1400);
  } catch (error) {
    // Ignore: tone playback is best-effort.
  }
}

function App() {
  const todayKey = formatDateKey(new Date());
  const [entries, setEntries] = useState(() => loadEntries());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [viewMode, setViewMode] = useState("calendar");
  const [focusedMonthIndex, setFocusedMonthIndex] = useState(() => new Date().getMonth());
  const [monthTurnDirection, setMonthTurnDirection] = useState("next");
  const [monthTurnTick, setMonthTurnTick] = useState(0);
  const [activeWeekStartKey, setActiveWeekStartKey] = useState(() => getWeekStartKey(todayKey));
  const [activeDateKey, setActiveDateKey] = useState(todayKey);
  const [draft, setDraft] = useState(() => createEmptyDraft(todayKey, null));
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [autoSaveInfo, setAutoSaveInfo] = useState("");
  const [profileName, setProfileName] = useState(() => loadProfileName());
  const [activeScreen, setActiveScreen] = useState("calendar");
  const [historyFilter, setHistoryFilter] = useState("journal");
  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem("nous.theme") || "light";
    } catch (error) {
      return "light";
    }
  });
  const [appLanguage, setAppLanguage] = useState(() => {
    try {
      return localStorage.getItem("nous.language") || "fr";
    } catch (error) {
      return "fr";
    }
  });
  const [reminderSoundEnabled, setReminderSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("nous.reminder.sound.enabled") !== "0";
    } catch (error) {
      return true;
    }
  });
  const [reminderRingtone, setReminderRingtone] = useState(() => {
    try {
      return localStorage.getItem("nous.reminder.ringtone") || "chime";
    } catch (error) {
      return "chime";
    }
  });

  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof Notification === "undefined") {
      return "unsupported";
    }

    return Notification.permission;
  });

  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderWhen, setReminderWhen] = useState("");
  const [capsuleRecipient, setCapsuleRecipient] = useState("");
  const [capsuleMessage, setCapsuleMessage] = useState("");
  const [capsuleOpenDate, setCapsuleOpenDate] = useState("");
  const [selectedStickerId, setSelectedStickerId] = useState("");
  const [parallaxOffset, setParallaxOffset] = useState(0);

  const [lockEnabled, setLockEnabled] = useState(() => hasLockPin());
  const [isUnlocked, setIsUnlocked] = useState(() => !hasLockPin());
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [securityOpen, setSecurityOpen] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [removePin, setRemovePin] = useState("");

  const fileInputRef = useRef(null);

  const calendarMonths = useMemo(() => initCalendar(selectedYear, entries), [selectedYear, entries]);
  const timelineEntries = useMemo(() => listTimelineEntries(entries), [entries]);
  const yearStats = useMemo(() => getYearOverviewStats(entries, selectedYear), [entries, selectedYear]);
  const memories = useMemo(() => getMemoriesForDate(entries, activeDateKey), [entries, activeDateKey]);
  const activeEntry = entries[activeDateKey];
  const dayPrompt = getPromptForDate(activeDateKey);
  const generatedMessage = buildMotivationalMessage(activeDateKey, profileName, appLanguage);
  const dayMessage = draft.customMessage.trim() || generatedMessage;
  const dailyNotificationInfo = getDailyMotivationScheduleInfo();
  const t = (key, vars) => resolveText(appLanguage, key, vars);
  const monthTabLabels = MONTH_TAB_LABELS[appLanguage] || MONTH_TAB_LABELS.fr;
  const activeMonth = calendarMonths[focusedMonthIndex] || calendarMonths[0] || null;
  const monthWeekShortcuts = useMemo(() => buildMonthWeekShortcuts(activeMonth), [activeMonth]);
  const weekPlannerCells = useMemo(
    () => buildWeekPlannerCells(activeWeekStartKey, entries, todayKey),
    [activeWeekStartKey, entries, todayKey]
  );
  const weekStartDate = parseDateKey(activeWeekStartKey);
  const weekEndDate = addDays(weekStartDate, 6);
  const activeWeekNumber = getIsoWeekNumber(weekStartDate);
  const completedHabitCount = HABIT_CATALOG.filter((habit) => Boolean(draft.habits?.[habit.id])).length;
  const habitProgress = Math.round((completedHabitCount / HABIT_CATALOG.length) * 100);
  const selectedSticker = Array.isArray(draft.stickers)
    ? draft.stickers.find((sticker) => sticker.id === selectedStickerId) || null
    : null;
  const scrapbookBackground = draft.media.find((media) => String(media.type || "").startsWith("image/"))?.dataUrl || "";
  const historyBuckets = useMemo(() => {
    const journal = timelineEntries.filter(
      (entry) => Boolean(entry.text?.trim()) || (Array.isArray(entry.media) && entry.media.length > 0)
    );
    const reminder = timelineEntries.filter((entry) => Array.isArray(entry.reminders) && entry.reminders.length > 0);
    const mood = timelineEntries.filter((entry) => typeof entry.mood === "number");
    const favorite = timelineEntries.filter((entry) => Boolean(entry.favorite));

    return { journal, reminder, mood, favorite };
  }, [timelineEntries]);
  const activeHistoryEntries = historyBuckets[historyFilter] || [];

  function openEditor(dateKey) {
    const existing = entries[dateKey];
    const baseDraft = createEmptyDraft(dateKey, existing);
    const cachedDraft = loadDraftSnapshot(dateKey);
    const targetDate = parseDateKey(dateKey);

    setActiveDateKey(dateKey);
    setSelectedYear(targetDate.getFullYear());
    setFocusedMonthIndex(targetDate.getMonth());
    setActiveWeekStartKey(getWeekStartKey(dateKey));
    setDraft(
      cachedDraft
        ? {
            ...baseDraft,
            ...cachedDraft,
            media: baseDraft.media
          }
        : baseDraft
    );

    setReminderTitle("");
    setReminderWhen("");
    setCapsuleRecipient("");
    setCapsuleMessage("");
    setCapsuleOpenDate("");
    setSelectedStickerId("");
    setStatusMessage("");
    setErrorMessage("");
    setAutoSaveInfo("");
    setActiveScreen("calendar");
    setEditorOpen(true);
  }

  function jumpToMonth(targetIndex) {
    const normalizedIndex = ((targetIndex % 12) + 12) % 12;
    setMonthTurnDirection(getMonthTurnDirection(focusedMonthIndex, normalizedIndex));
    setFocusedMonthIndex(normalizedIndex);
    setMonthTurnTick((previous) => previous + 1);
    setViewMode("calendar");
  }

  function shiftMonth(delta) {
    jumpToMonth(focusedMonthIndex + delta);
  }

  function openWeekPlanner(dateKey) {
    setActiveWeekStartKey(getWeekStartKey(dateKey));
    setViewMode("week");
  }

  useEffect(() => {
    persistProfileName(profileName);
  }, [profileName]);

  useEffect(() => {
    try {
      localStorage.setItem("nous.theme", themeMode);
    } catch (error) {
      // Ignore persistence errors.
    }

    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", themeMode === "dark" ? "dark" : "light");
    }
  }, [themeMode]);

  useEffect(() => {
    try {
      localStorage.setItem("nous.language", appLanguage);
    } catch (error) {
      // Ignore persistence errors.
    }

    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", appLanguage);
    }
  }, [appLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem("nous.reminder.sound.enabled", reminderSoundEnabled ? "1" : "0");
    } catch (error) {
      // Ignore persistence errors.
    }
  }, [reminderSoundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem("nous.reminder.ringtone", reminderRingtone);
    } catch (error) {
      // Ignore persistence errors.
    }
  }, [reminderRingtone]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleScroll = () => {
      setParallaxOffset(Math.round(window.scrollY * 0.2));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!editorOpen) {
      return;
    }

    const timer = setTimeout(() => {
      persistDraftSnapshot(activeDateKey, draft);
      setAutoSaveInfo(
        `Brouillon auto-sauvegardé à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [editorOpen, activeDateKey, draft]);

  useEffect(() => {
    const runNotificationCycle = () => {
      setEntries((previous) => {
        const dueAlerts = collectDueReminderAlerts(previous, new Date());
        if (!dueAlerts.length) {
          return previous;
        }

        if (reminderSoundEnabled && typeof document !== "undefined" && document.visibilityState === "visible") {
          playReminderTone(reminderRingtone);
        }

        if (notificationPermission === "granted") {
          dueAlerts.forEach((alert) => {
            const dateLabel = formatDateFr(alert.dateKey, { day: "numeric", month: "long" });
            sendBrowserNotification(t("reminderNotificationTitle"), `${alert.reminderTitle} (${dateLabel})`, {
              tag: `reminder-${alert.reminderId}`,
              url: "/"
            });
          });
        }

        const nextEntries = markReminderAlertsNotified(previous, dueAlerts);
        persistEntries(nextEntries);
        return nextEntries;
      });

      const now = new Date();
      const currentDateKey = formatDateKey(now);
      if (notificationPermission === "granted" && shouldSendDailyMotivation(now, dailyNotificationInfo.hour)) {
        const shortMessage = buildMotivationalMessage(currentDateKey, profileName, appLanguage).slice(0, 180);
        sendBrowserNotification(t("dailyNotificationTitle"), shortMessage, {
          tag: `daily-${currentDateKey}`,
          url: "/"
        });
        markDailyMotivationSent(now);
      }
    };

    runNotificationCycle();
    const timer = setInterval(runNotificationCycle, 30000);

    const handleVisibility = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        runNotificationCycle();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", runNotificationCycle);
    }

    return () => {
      clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", runNotificationCycle);
      }
    };
  }, [appLanguage, dailyNotificationInfo.hour, notificationPermission, profileName, reminderRingtone, reminderSoundEnabled]);

  async function handleSaveEntry() {
    setSaving(true);
    setErrorMessage("");
    setStatusMessage("Capture de la météo et de la localisation...");

    try {
      const existing = entries[activeDateKey];
      const metadata = await captureAutomaticMetadata(existing?.metadata || null);
      const nowIso = new Date().toISOString();
      const text = draft.text.trim();
      const customMessage = draft.customMessage.trim();
      const scrapbookText = draft.scrapbookText.trim();
      const reminders = sortReminders(
        draft.reminders
          .map((item) => ({
            id: item.id || createClientId(),
            title: (item.title || "").trim(),
            scheduledFor: item.scheduledFor ? new Date(item.scheduledFor).toISOString() : "",
            done: Boolean(item.done),
            notifiedAt: item.notifiedAt || "",
            createdAt: item.createdAt || nowIso
          }))
          .filter((item) => item.title)
      );
      const habits = HABIT_CATALOG.reduce((accumulator, habit) => {
        accumulator[habit.id] = Boolean(draft.habits?.[habit.id]);
        return accumulator;
      }, {});
      const hasHabitProgress = Object.values(habits).some(Boolean);
      const stickers = Array.isArray(draft.stickers)
        ? draft.stickers
            .map((item) => ({
              id: item.id || createClientId(),
              emoji: typeof item.emoji === "string" ? item.emoji.trim() : "",
              label: typeof item.label === "string" ? item.label : "",
              x: clampRange(item.x, 4, 96),
              y: clampRange(item.y, 8, 92),
              rotate: clampRange(item.rotate, -30, 30)
            }))
            .filter((item) => item.emoji)
        : [];
      const futureMessages = Array.isArray(draft.futureMessages)
        ? draft.futureMessages
            .map((item) => {
              const openDate = new Date(item.openOn);
              if (Number.isNaN(openDate.getTime())) {
                return null;
              }

              return {
                id: item.id || createClientId(),
                recipient: typeof item.recipient === "string" ? item.recipient.trim() : "",
                message: typeof item.message === "string" ? item.message.trim() : "",
                openOn: openDate.toISOString(),
                createdAt: item.createdAt || nowIso
              };
            })
            .filter((item) => item && item.message)
            .sort((left, right) => left.openOn.localeCompare(right.openOn))
        : [];

      const moodChanged = existing ? draft.mood !== existing.mood : draft.mood !== 3;
      const hasContent = Boolean(
        text.length > 0 ||
          draft.media.length > 0 ||
          reminders.length > 0 ||
          hasHabitProgress ||
          stickers.length > 0 ||
          futureMessages.length > 0 ||
          scrapbookText.length > 0 ||
          customMessage.length > 0 ||
          draft.favorite ||
          moodChanged
      );

      const nextEntries = { ...entries };

      if (!hasContent) {
        delete nextEntries[activeDateKey];
      } else {
        nextEntries[activeDateKey] = {
          id: activeDateKey,
          dateISO: activeDateKey,
          text,
          mood: draft.mood,
          media: draft.media,
          prompt: dayPrompt,
          customMessage,
          reminders,
          habits,
          stickers,
          scrapbookText,
          futureMessages,
          favorite: Boolean(draft.favorite),
          metadata,
          createdAt: existing?.createdAt || nowIso,
          updatedAt: nowIso
        };
      }

      const projectedSize = estimateStorageSize(nextEntries);
      if (projectedSize > STORAGE_BYTES_SOFT_LIMIT) {
        throw new Error("Stockage local presque plein. Exporte le journal pour libérer de l'espace.");
      }

      persistEntries(nextEntries);
      clearDraftSnapshot(activeDateKey);
      setEntries(nextEntries);
      setStatusMessage("Entrée enregistrée automatiquement.");
      setEditorOpen(false);
      setAutoSaveInfo("");
    } catch (error) {
      setErrorMessage(error.message || "Impossible d'enregistrer l'entrée.");
      setStatusMessage("");
    } finally {
      setSaving(false);
    }
  }

  async function handleFilesSelected(event) {
    const { valid, errors } = await prepareMediaFiles(event.target.files);
    event.target.value = "";

    const localErrors = [...errors];

    setDraft((previous) => {
      const availableSlots = Math.max(0, MAX_MEDIA_PER_ENTRY - previous.media.length);
      const accepted = valid.slice(0, availableSlots);

      if (accepted.length < valid.length) {
        localErrors.push(`Maximum ${MAX_MEDIA_PER_ENTRY} médias par jour.`);
      }

      return {
        ...previous,
        media: [...previous.media, ...accepted]
      };
    });

    setErrorMessage(localErrors.join(" "));
  }

  function removeMedia(mediaId) {
    setDraft((previous) => ({
      ...previous,
      media: previous.media.filter((media) => media.id !== mediaId)
    }));
  }

  function addReminder() {
    setErrorMessage("");

    const title = reminderTitle.trim();
    if (!title) {
      setErrorMessage("Ajoute un texte de rappel avant d'enregistrer.");
      return;
    }

    const scheduledFor = reminderWhen ? new Date(reminderWhen).toISOString() : "";

    const reminder = {
      id: createClientId(),
      title,
      scheduledFor,
      done: false,
      notifiedAt: "",
      createdAt: new Date().toISOString()
    };

    setDraft((previous) => ({
      ...previous,
      reminders: sortReminders([...previous.reminders, reminder])
    }));

    setReminderTitle("");
    setReminderWhen("");
  }

  function toggleReminder(reminderId) {
    setDraft((previous) => ({
      ...previous,
      reminders: previous.reminders.map((item) =>
        item.id === reminderId
          ? {
              ...item,
              done: !item.done
            }
          : item
      )
    }));
  }

  function removeReminder(reminderId) {
    setDraft((previous) => ({
      ...previous,
      reminders: previous.reminders.filter((item) => item.id !== reminderId)
    }));
  }

  function toggleHabit(habitId) {
    setDraft((previous) => ({
      ...previous,
      habits: {
        ...(previous.habits || {}),
        [habitId]: !previous.habits?.[habitId]
      }
    }));
  }

  function addStickerToDraft(stickerTemplate) {
    const nextSticker = {
      id: createClientId(),
      emoji: stickerTemplate.emoji,
      label: stickerTemplate.label,
      x: Math.round(16 + Math.random() * 68),
      y: Math.round(18 + Math.random() * 62),
      rotate: Math.round(-14 + Math.random() * 28)
    };

    setDraft((previous) => ({
      ...previous,
      stickers: [...(previous.stickers || []), nextSticker]
    }));
    setSelectedStickerId(nextSticker.id);
  }

  function removeSticker(stickerId) {
    setDraft((previous) => ({
      ...previous,
      stickers: (previous.stickers || []).filter((item) => item.id !== stickerId)
    }));
    setSelectedStickerId((previous) => (previous === stickerId ? "" : previous));
  }

  function moveSticker(stickerId, axis, rawValue) {
    const nextValue = axis === "x" ? clampRange(rawValue, 4, 96) : clampRange(rawValue, 8, 92);

    setDraft((previous) => ({
      ...previous,
      stickers: (previous.stickers || []).map((item) =>
        item.id === stickerId
          ? {
              ...item,
              [axis]: nextValue
            }
          : item
      )
    }));
  }

  function addFutureMessage() {
    setErrorMessage("");

    const message = capsuleMessage.trim();
    if (!message) {
      setErrorMessage("Écris un message avant d'ajouter une capsule temporelle.");
      return;
    }

    if (!capsuleOpenDate) {
      setErrorMessage("Choisis la date d'ouverture de la capsule.");
      return;
    }

    const openDate = new Date(capsuleOpenDate);
    if (Number.isNaN(openDate.getTime()) || openDate.getTime() <= Date.now()) {
      setErrorMessage("La capsule doit s'ouvrir dans le futur.");
      return;
    }

    const nextMessage = {
      id: createClientId(),
      recipient: capsuleRecipient.trim(),
      message,
      openOn: openDate.toISOString(),
      createdAt: new Date().toISOString()
    };

    setDraft((previous) => ({
      ...previous,
      futureMessages: [...(previous.futureMessages || []), nextMessage].sort((left, right) =>
        left.openOn.localeCompare(right.openOn)
      )
    }));

    setCapsuleRecipient("");
    setCapsuleMessage("");
    setCapsuleOpenDate("");
  }

  function removeFutureMessage(futureMessageId) {
    setDraft((previous) => ({
      ...previous,
      futureMessages: (previous.futureMessages || []).filter((item) => item.id !== futureMessageId)
    }));
  }

  function handleExport() {
    const filename = `NOUS-journal-${new Date().toISOString().slice(0, 10)}.md`;
    const orderedEntries = [...timelineEntries].reverse();
    const content = buildReadableJournalMarkdown(orderedEntries, profileName);
    downloadFile(filename, content, "text/markdown;charset=utf-8");
    setStatusMessage("Journal telecharge en format lisible (.md).");
  }

  async function handleShareMessage() {
    setErrorMessage("");

    const shareText = `${formatDateFr(activeDateKey)}\n\n${dayMessage}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Message motivationnel - ${formatDateFr(activeDateKey, { day: "numeric", month: "long", year: "numeric" })}`,
          text: shareText
        });
        setStatusMessage("Message partagé.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setStatusMessage("Message copié dans le presse-papiers.");
        return;
      }

      throw new Error("Partage non supporté sur cet appareil.");
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      setErrorMessage(error.message || "Impossible de partager le message.");
    }
  }

  async function handleRequestNotifications() {
    const permission = await requestNotificationAccess();
    setNotificationPermission(permission);

    if (permission === "granted") {
      setStatusMessage(`Notifications activées. Message quotidien à ${dailyNotificationInfo.label}.`);
      return;
    }

    if (permission === "unsupported") {
      setErrorMessage("Les notifications ne sont pas disponibles sur cet appareil.");
      return;
    }

    setErrorMessage("Notifications non autorisées.");
  }

  async function handleUnlock() {
    setUnlockError("");

    const isValid = await verifyLockPin(unlockPin);
    if (!isValid) {
      setUnlockError("Code incorrect.");
      return;
    }

    setIsUnlocked(true);
    setUnlockPin("");
  }

  async function handleEnableLock() {
    setSecurityMessage("");

    if (newPin.length < 4) {
      setSecurityMessage("Le code doit contenir au moins 4 chiffres.");
      return;
    }

    if (newPin !== confirmPin) {
      setSecurityMessage("Les codes ne correspondent pas.");
      return;
    }

    try {
      await setLockPin(newPin);
      setLockEnabled(true);
      setIsUnlocked(true);
      setNewPin("");
      setConfirmPin("");
      setSecurityMessage("Verrouillage activé.");
    } catch (error) {
      setSecurityMessage(error.message || "Impossible d'activer le verrouillage.");
    }
  }

  async function handleDisableLock() {
    setSecurityMessage("");

    const isValid = await verifyLockPin(removePin);
    if (!isValid) {
      setSecurityMessage("Code incorrect pour désactiver le verrouillage.");
      return;
    }

    clearLockPin();
    setLockEnabled(false);
    setIsUnlocked(true);
    setRemovePin("");
    setSecurityMessage("Verrouillage retiré.");
  }

  if (lockEnabled && !isUnlocked) {
    return (
      <main className="lock-screen">
        <section className="lock-card">
          <h1>Journal verrouillé</h1>
          <p>Entre ton code pour continuer.</p>
          <input
            type="password"
            inputMode="numeric"
            value={unlockPin}
            onChange={(event) => setUnlockPin(event.target.value)}
            placeholder="Code"
          />
          <button className="btn btn-primary" onClick={handleUnlock}>
            Déverrouiller
          </button>
          {unlockError ? <p className="text-error">{unlockError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell" style={{ "--parallax-offset": `${parallaxOffset}px` }}>
      <header className="topbar topbar-minimal">
        <div className="topbar-title">
          <h1>NOUS {selectedYear}</h1>
          <p>
            {activeScreen === "calendar"
              ? t("appTaglineCalendar")
              : t("appTaglineProfile")}
          </p>
        </div>

        <div className="topbar-quick-actions">
          {activeScreen === "calendar" ? (
            <button className="btn" onClick={() => openEditor(todayKey)}>
              {t("openToday")}
            </button>
          ) : (
            <button className="btn" onClick={() => setActiveScreen("calendar")}>
              {t("backCalendar")}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setActiveScreen(activeScreen === "calendar" ? "profile" : "calendar")}>
            {activeScreen === "calendar" ? t("profileSpace") : t("calendar")}
          </button>
        </div>
      </header>

      {activeScreen === "calendar" ? (
        <>
          <section className="toolbar toolbar-main">
            <button className="btn" onClick={() => setSelectedYear((year) => year - 1)}>
              {t("yearMinus")}
            </button>
            <button
              className="btn"
              onClick={() => {
                const now = new Date();
                setSelectedYear(now.getFullYear());
                jumpToMonth(now.getMonth());
                setActiveWeekStartKey(getWeekStartKey(todayKey));
              }}
            >
              {t("today")}
            </button>
            <button className="btn" onClick={() => setSelectedYear((year) => year + 1)}>
              {t("yearPlus")}
            </button>
            <div className="segmented view-switch">
              <button className={viewMode === "calendar" ? "active" : ""} onClick={() => setViewMode("calendar")}>
                {t("calendar")}
              </button>
              <button className={viewMode === "week" ? "active" : ""} onClick={() => setViewMode("week")}>
                Semaine
              </button>
              <button className={viewMode === "timeline" ? "active" : ""} onClick={() => setViewMode("timeline")}>
                {t("timeline")}
              </button>
            </div>
          </section>

          <main>
            {viewMode === "calendar" ? (
              <section className="planner-classeur">
                <div className="month-stage" key={`${selectedYear}-${focusedMonthIndex}-${monthTurnTick}`} data-turn={monthTurnDirection}>
                  {activeMonth ? (
                    <article className="month-card month-card-focus">
                      <div className="month-card-header">
                        <button className="btn month-shift-btn" onClick={() => shiftMonth(-1)} aria-label="Mois précédent">
                          ◀
                        </button>
                        <h3>{activeMonth.monthName} {selectedYear}</h3>
                        <button className="btn month-shift-btn" onClick={() => shiftMonth(1)} aria-label="Mois suivant">
                          ▶
                        </button>
                      </div>

                      <div className="weekday-row">
                        {CALENDAR_WEEKDAYS.map((weekday, index) => (
                          <span key={`${activeMonth.monthName}-${index}`}>{weekday}</span>
                        ))}
                      </div>

                      <div className="day-grid">
                        {activeMonth.cells.map((cell, index) => {
                          if (!cell) {
                            return <span className="day-cell empty" key={`${activeMonth.monthName}-empty-${index}`} />;
                          }

                          return (
                            <button
                              key={cell.dateKey}
                            className={`day-cell ${cell.hasEntry ? "has-entry" : ""} ${cell.isToday ? "is-today" : ""} ${
                                cell.isPast ? "is-past" : ""
                              }`}
                              onClick={() => openEditor(cell.dateKey)}
                              title={formatDateFr(cell.dateKey)}
                            >
                              <span className="day-number">{cell.day}</span>
                              <span className="day-mood" aria-hidden="true" title="Humeur du jour">
                                {cell.mood ? moodToEmoji(cell.mood) : "·"}
                              </span>
                              <span className="day-icons" aria-hidden="true">
                                {cell.hasFavorite ? <span title="Favori">❤️</span> : <span className="ghost">·</span>}
                                {cell.hasJournal ? <span title="Journal">📝</span> : <span className="ghost">·</span>}
                                {cell.hasReminderActive ? <span title="Rappel actif">🔔</span> : <span className="ghost">·</span>}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="month-week-shortcuts" aria-label="Raccourcis semaine">
                        {monthWeekShortcuts.map((shortcut) => (
                          <button
                            className="week-shortcut-btn"
                            key={shortcut.id}
                            onClick={() => openWeekPlanner(shortcut.weekStartKey)}
                          >
                            S{shortcut.weekNumber}
                          </button>
                        ))}
                      </div>
                    </article>
                  ) : null}
                </div>

                <aside className="month-tabs-rail" aria-label="Navigation mensuelle">
                  {monthTabLabels.map((label, index) => (
                    <button
                      key={`month-tab-${label}-${index}`}
                      className={`month-tab-btn ${focusedMonthIndex === index ? "active" : ""}`}
                      onClick={() => jumpToMonth(index)}
                    >
                      {label}
                    </button>
                  ))}
                </aside>
              </section>
            ) : viewMode === "week" ? (
              <section className="week-planner">
                <div className="week-planner-header">
                  <div>
                    <h3>Semaine {activeWeekNumber}</h3>
                    <p className="soft">
                      {formatDateFr(formatDateKey(weekStartDate), { day: "numeric", month: "short" })} -{" "}
                      {formatDateFr(formatDateKey(weekEndDate), { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="week-planner-actions">
                    <button
                      className="btn"
                      onClick={() => setActiveWeekStartKey(formatDateKey(addDays(weekStartDate, -7)))}
                    >
                      Semaine -1
                    </button>
                    <button className="btn" onClick={() => setViewMode("calendar")}>
                      Retour mois
                    </button>
                    <button
                      className="btn"
                      onClick={() => setActiveWeekStartKey(formatDateKey(addDays(weekStartDate, 7)))}
                    >
                      Semaine +1
                    </button>
                  </div>
                </div>

                <div className="week-grid">
                  {weekPlannerCells.map((cell) => {
                    const entry = cell.entry;
                    const previewSource = entry?.text?.trim() || entry?.scrapbookText?.trim() || "";
                    const preview = previewSource.length > 110 ? `${previewSource.slice(0, 110)}...` : previewSource;

                    return (
                      <article className={`week-day-card ${cell.isToday ? "is-today" : ""}`} key={`week-${cell.dateKey}`}>
                        <button className="linkish" onClick={() => openEditor(cell.dateKey)}>
                          {formatDateFr(cell.dateKey, { weekday: "short", day: "numeric", month: "short" })}
                        </button>
                        <p className="soft">
                          {moodToEmoji(entry?.mood || 3)} · 🔔 {cell.reminderCount} · ✅ {cell.completedHabits}
                        </p>
                        <p>{preview || "Aucune note détaillée pour ce jour."}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="timeline-grid">
                {timelineEntries.length === 0 ? (
                  <article className="timeline-card empty-card">
                    <h3>{t("timelineEmptyTitle")}</h3>
                    <p>{t("timelineEmptyText")}</p>
                  </article>
                ) : (
                  timelineEntries.map((entry) => {
                    const previewSource = entry.text?.trim() || entry.scrapbookText?.trim() || "";
                    const preview = previewSource.length > 170 ? `${previewSource.slice(0, 170)}...` : previewSource;
                    const weather = entry.metadata?.weather
                      ? `${entry.metadata.weather.description} ${entry.metadata.weather.temperatureC ?? ""}°C`
                      : "Météo indisponible";
                    const mediaItems = Array.isArray(entry.media) ? entry.media : [];
                    const mediaPreview = mediaItems.slice(0, 3);
                    const hiddenMediaCount = Math.max(0, mediaItems.length - mediaPreview.length);
                    const completedHabitsInEntry = HABIT_CATALOG.filter((habit) => Boolean(entry.habits?.[habit.id])).length;
                    const futureMessageCount = Array.isArray(entry.futureMessages) ? entry.futureMessages.length : 0;

                    return (
                      <article className="timeline-card" key={entry.id}>
                        <button className="linkish" onClick={() => openEditor(entry.dateISO)}>
                          {formatDateFr(entry.dateISO)}
                        </button>
                        <p className="mood-line">{t("moodLabel", { emoji: moodToEmoji(entry.mood) })}</p>
                        <p>{preview || "(Entrée média sans texte)"}</p>
                        {mediaPreview.length > 0 ? (
                          <div className="timeline-media-grid">
                            {mediaPreview.map((media, index) => (
                              <article className="timeline-media-item" key={media.id || `${entry.id}-media-${index}`}>
                                {String(media.type || "").startsWith("image/") ? (
                                  <img src={media.dataUrl} alt={media.name || "Photo du journal"} loading="lazy" />
                                ) : (
                                  <video src={media.dataUrl} controls preload="metadata" playsInline muted />
                                )}
                              </article>
                            ))}
                            {hiddenMediaCount > 0 ? <div className="timeline-media-more">+{hiddenMediaCount}</div> : null}
                          </div>
                        ) : null}
                        <div className="timeline-chip-row">
                          <span className="timeline-chip">📍 {entry.metadata?.locationLabel || "Lieu indisponible"}</span>
                          <span className="timeline-chip">🌤 {weather}</span>
                          <span className="timeline-chip">📷 {mediaItems.length} média(s)</span>
                          <span className="timeline-chip">{entry.favorite ? "❤️ Favori" : "🤍 Non favori"}</span>
                          <span className="timeline-chip">🔔 {entry.reminders?.filter((item) => !item.done).length || 0} actif(s)</span>
                          <span className="timeline-chip">✅ {completedHabitsInEntry} habitude(s)</span>
                          <span className="timeline-chip">🕰 {futureMessageCount} capsule(s)</span>
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            )}
          </main>

          <button className="floating-new" onClick={() => openEditor(todayKey)}>
            + Aujourd'hui
          </button>
        </>
      ) : (
        <main className="profile-page">
          <section className="profile-drawer">
            <div className="profile-drawer-header">
              <h2>{t("profileTitle")}</h2>
            </div>

            <div className="profile-drawer-body">
              <section className="profile-hero">
                <div className="profile-hero-main">
                  <span className="profile-emoji-badge" aria-hidden="true">🤎</span>
                  <div>
                    <h3>{profileName?.trim() || "NOUS"}</h3>
                    <p>{t("profileSummary")}</p>
                  </div>
                </div>
                <div className="profile-hero-metrics" aria-label="Résumé annuel">
                  <span className="profile-hero-chip">📝 {yearStats.daysWithJournal}</span>
                  <span className="profile-hero-chip">❤️ {yearStats.favoriteDays}</span>
                  <span className="profile-hero-chip">🔔 {yearStats.openReminders}</span>
                  <span className="profile-hero-chip">{moodToEmoji(Math.round(yearStats.averageMood || 3))}</span>
                </div>
              </section>

              <label className="profile-chip profile-chip-wide" htmlFor="profile-name">
                {t("firstName")}
                <input
                  id="profile-name"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder={t("firstNamePlaceholder")}
                  maxLength={30}
                />
              </label>

              <section className="stats-grid profile-stats">
                <article className="stat-card">
                  <h3>{t("statsJourney")}</h3>
                  <p>{yearStats.daysWithJournal} / {yearStats.daysInYear} jours écrits</p>
                  <strong>{yearStats.completionRate}%</strong>
                </article>
                <article className="stat-card">
                  <h3>{t("statsMood")}</h3>
                  <p>{yearStats.averageMood ? `${yearStats.averageMood} / 5` : t("noData")}</p>
                  <strong>{yearStats.averageMood ? moodToEmoji(Math.round(yearStats.averageMood)) : "-"}</strong>
                </article>
                <article className="stat-card">
                  <h3>{t("statsFavorites")}</h3>
                  <p>❤️ {yearStats.favoriteDays} jours favoris</p>
                  <p>🔔 {yearStats.openReminders} rappels actifs</p>
                </article>
              </section>

              <section className="calendar-legend" aria-label="Légende des indicateurs">
                <span className="legend-pill">{t("legendFavorite")}</span>
                <span className="legend-pill">{t("legendJournal")}</span>
                <span className="legend-pill">{t("legendReminder")}</span>
                <span className="legend-pill">{t("legendMood")}</span>
              </section>

              <section className="profile-columns">
                <section className="profile-settings">
                  <h3>{t("settingsTitle")}</h3>
                  <div className="settings-grid">
                    <label className="settings-field">
                      <span>{t("language")}</span>
                      <select value={appLanguage} onChange={(event) => setAppLanguage(event.target.value)}>
                        {LANGUAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="settings-field">
                      <span>{t("theme")}</span>
                      <select value={themeMode} onChange={(event) => setThemeMode(event.target.value)}>
                        <option value="light">{t("themeLight")}</option>
                        <option value="dark">{t("themeDark")}</option>
                      </select>
                    </label>
                    <label className="settings-field">
                      <span>{t("reminderSound")}</span>
                      <select
                        value={reminderSoundEnabled ? "on" : "off"}
                        onChange={(event) => setReminderSoundEnabled(event.target.value === "on")}
                      >
                        <option value="on">{t("enabled")}</option>
                        <option value="off">{t("ringtoneOff")}</option>
                      </select>
                    </label>
                    <label className="settings-field">
                      <span>{t("ringtone")}</span>
                      <select value={reminderRingtone} onChange={(event) => setReminderRingtone(event.target.value)}>
                        <option value="chime">{t("ringtoneChime")}</option>
                        <option value="soft">{t("ringtoneSoft")}</option>
                        <option value="digital">{t("ringtoneDigital")}</option>
                        <option value="off">{t("ringtoneOff")}</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className="history-panel">
                  <h3>{t("historyTitle")}</h3>
                  <p className="soft history-count">{t("historyCount", { count: activeHistoryEntries.length })}</p>
                  <div className="segmented history-segmented">
                    <button className={historyFilter === "journal" ? "active" : ""} onClick={() => setHistoryFilter("journal")}>
                      {t("historyJournal")}
                    </button>
                    <button className={historyFilter === "reminder" ? "active" : ""} onClick={() => setHistoryFilter("reminder")}>
                      {t("historyReminder")}
                    </button>
                    <button className={historyFilter === "mood" ? "active" : ""} onClick={() => setHistoryFilter("mood")}>
                      {t("historyMood")}
                    </button>
                    <button className={historyFilter === "favorite" ? "active" : ""} onClick={() => setHistoryFilter("favorite")}>
                      {t("historyFavorite")}
                    </button>
                  </div>

                  {activeHistoryEntries.length === 0 ? (
                    <p className="soft">{t("historyEmpty")}</p>
                  ) : (
                    <div className="history-list">
                      {activeHistoryEntries.slice(0, 120).map((entry) => (
                        <article className="history-item" key={`history-${historyFilter}-${entry.id}`}>
                          <button className="linkish" onClick={() => openEditor(entry.dateISO)}>
                            {formatDateFr(entry.dateISO)}
                          </button>
                          <p className="soft">
                            {t("moodLabel", { emoji: moodToEmoji(entry.mood) })} · {t("reminderCount", { count: entry.reminders?.length || 0 })}
                          </p>
                          <p>
                            {entry.text?.trim()
                              ? entry.text.slice(0, 180)
                              : entry.scrapbookText?.trim()
                                ? entry.scrapbookText.slice(0, 180)
                                : t("entryWithoutText")}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </section>

              <section className="profile-action-grid">
                <button
                  className="btn"
                  onClick={() => {
                    setViewMode("calendar");
                    setActiveScreen("calendar");
                  }}
                >
                  {t("goCalendar")}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setViewMode("timeline");
                    setActiveScreen("calendar");
                  }}
                >
                  {t("goTimeline")}
                </button>
                <button className="btn" onClick={handleExport}>
                  {t("downloadJournal")}
                </button>
                <button className="btn" onClick={() => setSecurityOpen((previous) => !previous)}>
                  {t("security")}
                </button>
                {lockEnabled ? (
                  <button
                    className="btn"
                    onClick={() => {
                      setIsUnlocked(false);
                      setActiveScreen("calendar");
                    }}
                  >
                    {t("lock")}
                  </button>
                ) : null}
              </section>

              {securityOpen ? (
                <section className="security-panel">
                  <h2>Verrouillage par code (Web Crypto)</h2>
                  {!lockEnabled ? (
                    <div className="security-grid">
                      <input
                        type="password"
                        inputMode="numeric"
                        value={newPin}
                        onChange={(event) => setNewPin(event.target.value)}
                        placeholder="Nouveau code"
                      />
                      <input
                        type="password"
                        inputMode="numeric"
                        value={confirmPin}
                        onChange={(event) => setConfirmPin(event.target.value)}
                        placeholder="Confirmer le code"
                      />
                      <button className="btn btn-primary" onClick={handleEnableLock}>
                        Activer le verrouillage
                      </button>
                    </div>
                  ) : (
                    <div className="security-grid">
                      <input
                        type="password"
                        inputMode="numeric"
                        value={removePin}
                        onChange={(event) => setRemovePin(event.target.value)}
                        placeholder="Code actuel"
                      />
                      <button className="btn" onClick={handleDisableLock}>
                        Désactiver le verrouillage
                      </button>
                    </div>
                  )}
                  {securityMessage ? <p>{securityMessage}</p> : null}
                  <p className="hint">Option cloud pro: branche Supabase ou Firebase pour sauvegarder sur plusieurs appareils.</p>
                </section>
              ) : null}

              <section className="profile-note">
                <p className="soft">{t("notificationsStatus")}: {notificationPermission}</p>
                <p className="soft">{t("dailyMessageAt")}: {dailyNotificationInfo.label}</p>
              </section>
            </div>
          </section>
        </main>
      )}

      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
        <button
          className={`mobile-nav-btn ${activeScreen === "calendar" ? "active" : ""}`}
          onClick={() => setActiveScreen("calendar")}
        >
          {t("mobileNavCalendar")}
        </button>
        <button
          className={`mobile-nav-btn ${activeScreen === "profile" ? "active" : ""}`}
          onClick={() => setActiveScreen("profile")}
        >
          {t("mobileNavProfile")}
        </button>
        <button
          className="mobile-nav-btn"
          onClick={() => {
            setActiveScreen("calendar");
            openEditor(todayKey);
          }}
        >
          {t("mobileNavToday")}
        </button>
      </nav>

      <footer className="app-credit" aria-label="Informations developpeuse">
        <p className="app-credit-name">
          Developpeuse: <strong>Elodie ATANA</strong> (Codorah)
        </p>
        <p className="app-credit-links">
          <a href="mailto:Codorah@hotmail.com">Codorah@hotmail.com</a>
          <span aria-hidden="true">|</span>
          <a href="tel:+22871672565">+228 71 67 25 65</a>
        </p>
      </footer>

      {editorOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="editor-modal">
            <div className="editor-header">
              <h2>{formatDateFr(activeDateKey)}</h2>
              <button className="btn" onClick={() => setEditorOpen(false)}>
                Fermer
              </button>
            </div>

            <section className="editor-section">
              <h3>1) Message du jour</h3>
              <p className="prompt">{dayMessage}</p>
              <label className="field-label" htmlFor="custom-message">
                Personnaliser ce message
              </label>
              <textarea
                id="custom-message"
                value={draft.customMessage}
                onChange={(event) => setDraft((previous) => ({ ...previous, customMessage: event.target.value }))}
                placeholder="Optionnel: écris ton propre message pour cette date"
              />
              <div className="inline-actions">
                <button className="btn" onClick={handleShareMessage}>
                  Partager le message
                </button>
                <button className="btn" onClick={() => setDraft((previous) => ({ ...previous, customMessage: "" }))}>
                  Réinitialiser
                </button>
              </div>
            </section>

            <section className="editor-section">
              <h3>2) Journal guidé</h3>
              <p className="guided-prompt">🖋️ Prompt du jour: {dayPrompt}</p>
              <label className="field-label" htmlFor="journal-content">
                Notes du jour
              </label>
              <textarea
                id="journal-content"
                value={draft.text}
                onChange={(event) => setDraft((previous) => ({ ...previous, text: event.target.value }))}
                placeholder="Écris tes pensées du jour..."
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden-input"
                onChange={handleFilesSelected}
              />

              <div className="media-actions">
                <button className="btn" onClick={() => fileInputRef.current?.click()}>
                  Ajouter photo/vidéo
                </button>
                <span>{draft.media.length} / {MAX_MEDIA_PER_ENTRY} médias</span>
              </div>

              {draft.media.length > 0 ? (
                <div className="media-grid">
                  {draft.media.map((media) => (
                    <article className="media-item" key={media.id}>
                      {media.type.startsWith("image/") ? (
                        <img src={media.dataUrl} alt={media.name} loading="lazy" />
                      ) : (
                        <video src={media.dataUrl} controls preload="metadata" />
                      )}
                      <button className="btn" onClick={() => removeMedia(media.id)}>
                        Retirer
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="editor-section">
              <h3>3) Habit tracker visuel</h3>
              <div className="habit-grid">
                {HABIT_CATALOG.map((habit) => (
                  <button
                    key={habit.id}
                    className={`habit-item ${draft.habits?.[habit.id] ? "is-done" : ""}`}
                    onClick={() => toggleHabit(habit.id)}
                  >
                    <span aria-hidden="true">{habit.icon}</span>
                    <span>{habit.label}</span>
                  </button>
                ))}
              </div>
              <div className="habit-progress-track" aria-label="Progression des habitudes">
                <div className="habit-progress-fill" style={{ width: `${habitProgress}%` }} />
              </div>
              <p className="soft">{completedHabitCount} / {HABIT_CATALOG.length} habitudes validées</p>
            </section>

            <section className="editor-section">
              <h3>4) Scrapbook & stickers</h3>
              <div className="sticker-library">
                {STICKER_LIBRARY.map((sticker) => (
                  <button
                    key={`${sticker.emoji}-${sticker.label}`}
                    className="sticker-library-btn"
                    onClick={() => addStickerToDraft(sticker)}
                  >
                    {sticker.emoji} {sticker.label}
                  </button>
                ))}
              </div>

              <label className="field-label" htmlFor="scrapbook-text">
                Texte libre superposé
              </label>
              <textarea
                id="scrapbook-text"
                value={draft.scrapbookText || ""}
                onChange={(event) => setDraft((previous) => ({ ...previous, scrapbookText: event.target.value }))}
                placeholder="Écris un texte libre qui viendra se superposer dans ton scrapbook..."
              />

              <div
                className={`scrapbook-canvas ${scrapbookBackground ? "with-image" : ""}`}
                style={scrapbookBackground ? { backgroundImage: `url(${scrapbookBackground})` } : undefined}
              >
                <p className="scrapbook-text-preview">
                  {draft.scrapbookText?.trim() || "Aperçu scrapbook: ajoute du texte et des stickers."}
                </p>
                {(draft.stickers || []).map((sticker) => (
                  <button
                    key={sticker.id}
                    className={`scrapbook-sticker ${selectedStickerId === sticker.id ? "active" : ""}`}
                    onClick={() => setSelectedStickerId(sticker.id)}
                    style={{
                      left: `${sticker.x}%`,
                      top: `${sticker.y}%`,
                      transform: `translate(-50%, -50%) rotate(${sticker.rotate || 0}deg)`
                    }}
                  >
                    {sticker.emoji}
                  </button>
                ))}
              </div>

              {selectedSticker ? (
                <div className="sticker-editor">
                  <label>
                    Position X
                    <input
                      type="range"
                      min="4"
                      max="96"
                      value={Math.round(selectedSticker.x)}
                      onChange={(event) => moveSticker(selectedSticker.id, "x", event.target.value)}
                    />
                  </label>
                  <label>
                    Position Y
                    <input
                      type="range"
                      min="8"
                      max="92"
                      value={Math.round(selectedSticker.y)}
                      onChange={(event) => moveSticker(selectedSticker.id, "y", event.target.value)}
                    />
                  </label>
                  <button className="btn" onClick={() => removeSticker(selectedSticker.id)}>
                    Retirer le sticker
                  </button>
                </div>
              ) : (
                <p className="soft">Sélectionne un sticker posé pour ajuster sa position.</p>
              )}
            </section>

            <section className="editor-section">
              <h3>5) Rappels & capsules temporelles</h3>
              <div className="inline-actions">
                <input
                  value={reminderTitle}
                  onChange={(event) => setReminderTitle(event.target.value)}
                  placeholder="Ex: Appeler maman"
                />
                <input
                  type="datetime-local"
                  value={reminderWhen}
                  onChange={(event) => setReminderWhen(event.target.value)}
                />
                <button className="btn" onClick={addReminder}>
                  Ajouter rappel
                </button>
              </div>

              <div className="inline-actions">
                <button className="btn" onClick={handleRequestNotifications}>
                  Activer les notifications
                </button>
                <span className="soft">Statut: {notificationPermission} · Quotidien: {dailyNotificationInfo.label}</span>
              </div>

              {draft.reminders.length === 0 ? (
                <p className="soft">Aucun rappel pour cette journée.</p>
              ) : (
                <ul className="reminder-list">
                  {draft.reminders.map((item) => (
                    <li key={item.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggleReminder(item.id)}
                        />
                        <span className={item.done ? "done" : ""}>{item.title}</span>
                      </label>
                      <span className="soft">{item.scheduledFor ? formatDateTimeFr(item.scheduledFor) : "Sans horaire"}</span>
                      <button className="btn" onClick={() => removeReminder(item.id)}>
                        Supprimer
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="capsule-panel">
                <h4>Message pour le futur</h4>
                <div className="inline-actions">
                  <input
                    value={capsuleRecipient}
                    onChange={(event) => setCapsuleRecipient(event.target.value)}
                    placeholder="Pour qui ? (toi, un proche...)"
                  />
                  <input
                    type="datetime-local"
                    value={capsuleOpenDate}
                    onChange={(event) => setCapsuleOpenDate(event.target.value)}
                  />
                </div>
                <textarea
                  value={capsuleMessage}
                  onChange={(event) => setCapsuleMessage(event.target.value)}
                  placeholder="Écris un message qui ne sera lisible qu'à la date choisie..."
                />
                <button className="btn" onClick={addFutureMessage}>
                  Programmer la capsule
                </button>

                {(draft.futureMessages || []).length === 0 ? (
                  <p className="soft">Aucune capsule temporelle pour cette journée.</p>
                ) : (
                  <ul className="capsule-list">
                    {(draft.futureMessages || []).map((futureMessage) => {
                      const isUnlockedMessage = new Date(futureMessage.openOn).getTime() <= Date.now();
                      return (
                        <li key={futureMessage.id}>
                          <p className="soft">
                            {futureMessage.recipient || "Moi"} · ouverture le {formatDateTimeFr(futureMessage.openOn)}
                          </p>
                          <p>{isUnlockedMessage ? futureMessage.message : "Message verrouillé jusqu'à la date d'ouverture."}</p>
                          <button className="btn" onClick={() => removeFutureMessage(futureMessage.id)}>
                            Supprimer
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section className="editor-section">
              <h3>6) Humeur du jour</h3>
              <div className="mood-row">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    className={`mood-pill ${draft.mood === mood.value ? "active" : ""}`}
                    onClick={() => setDraft((previous) => ({ ...previous, mood: mood.value }))}
                  >
                    {mood.emoji} {mood.label}
                  </button>
                ))}
              </div>

              <label className="favorite-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(draft.favorite)}
                  onChange={(event) => setDraft((previous) => ({ ...previous, favorite: event.target.checked }))}
                />
                Marquer cette journée en favori ❤️
              </label>
            </section>

            <section className="metadata-box">
              <p><strong>Localisation:</strong> {activeEntry?.metadata?.locationLabel || "Capturée à l'enregistrement"}</p>
              <p>
                <strong>Météo:</strong>{" "}
                {activeEntry?.metadata?.weather
                  ? `${activeEntry.metadata.weather.description} (${activeEntry.metadata.weather.temperatureC ?? "?"}°C)`
                  : "Capturée à l'enregistrement"}
              </p>
            </section>

            <section className="memories-box">
              <h3>Sur ce jour</h3>
              {memories.length === 0 ? (
                <p>Aucun souvenir sur cette date les années précédentes.</p>
              ) : (
                memories.map((memory) => (
                  <article key={memory.id}>
                    <button className="linkish" onClick={() => openEditor(memory.dateISO)}>
                      {formatDateFr(memory.dateISO)}
                    </button>
                    <p>{memory.text || "(Entrée sans texte)"}</p>
                  </article>
                ))
              )}
            </section>

            <div className="editor-footer">
              <button className="btn" onClick={() => setEditorOpen(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSaveEntry} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>

            {autoSaveInfo ? <p className="soft">{autoSaveInfo}</p> : null}
            {statusMessage ? <p className="text-success">{statusMessage}</p> : null}
            {errorMessage ? <p className="text-error">{errorMessage}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default App;
