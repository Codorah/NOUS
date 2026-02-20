import { useEffect, useMemo, useRef, useState } from "react";
import {
  CALENDAR_WEEKDAYS,
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

    if (entry.media?.length) {
      lines.push("");
      lines.push(`### Medias (${entry.media.length})`);
      lines.push("- Contenu media present dans l'application locale.");
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function App() {
  const todayKey = formatDateKey(new Date());
  const [entries, setEntries] = useState(() => loadEntries());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [viewMode, setViewMode] = useState("calendar");
  const [activeDateKey, setActiveDateKey] = useState(todayKey);
  const [draft, setDraft] = useState(() => createEmptyDraft(todayKey, null));
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [autoSaveInfo, setAutoSaveInfo] = useState("");
  const [profileName, setProfileName] = useState(() => loadProfileName());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof Notification === "undefined") {
      return "unsupported";
    }

    return Notification.permission;
  });

  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderWhen, setReminderWhen] = useState("");

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
  const generatedMessage = buildMotivationalMessage(activeDateKey, profileName);
  const dayMessage = draft.customMessage.trim() || generatedMessage;
  const dailyNotificationInfo = getDailyMotivationScheduleInfo();

  function openEditor(dateKey) {
    const existing = entries[dateKey];
    const baseDraft = createEmptyDraft(dateKey, existing);
    const cachedDraft = loadDraftSnapshot(dateKey);

    setActiveDateKey(dateKey);
    setSelectedYear(parseDateKey(dateKey).getFullYear());
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
    setStatusMessage("");
    setErrorMessage("");
    setAutoSaveInfo("");
    setEditorOpen(true);
  }

  useEffect(() => {
    persistProfileName(profileName);
  }, [profileName]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(min-width: 761px)");
    const handleChange = (event) => {
      if (event.matches) {
        setMobileMenuOpen(false);
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
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

        if (notificationPermission === "granted") {
          dueAlerts.forEach((alert) => {
            const dateLabel = formatDateFr(alert.dateKey, { day: "numeric", month: "long" });
            sendBrowserNotification("Rappel personnel", `${alert.reminderTitle} (${dateLabel})`, {
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
        const shortMessage = buildMotivationalMessage(currentDateKey, profileName).slice(0, 180);
        sendBrowserNotification("Message motivationnel du matin", shortMessage, {
          tag: `daily-${currentDateKey}`,
          url: "/"
        });
        markDailyMotivationSent(now);
      }
    };

    runNotificationCycle();
    const timer = setInterval(runNotificationCycle, 60000);
    return () => clearInterval(timer);
  }, [dailyNotificationInfo.hour, notificationPermission, profileName]);

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

      const moodChanged = existing ? draft.mood !== existing.mood : draft.mood !== 3;
      const hasContent = Boolean(
        text.length > 0 ||
          draft.media.length > 0 ||
          reminders.length > 0 ||
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
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-title">
          <h1>NOUS {selectedYear}</h1>
          <p>Compagnon quotidien: motivation, journal intime, rappels et humeur.</p>
        </div>

        <button
          type="button"
          className={`menu-toggle ${mobileMenuOpen ? "open" : ""}`}
          aria-expanded={mobileMenuOpen}
          aria-controls="topbar-actions-menu"
          onClick={() => setMobileMenuOpen((previous) => !previous)}
        >
          <span className="menu-toggle-bars" aria-hidden="true">
            <span className="menu-toggle-bar" />
            <span className="menu-toggle-bar" />
            <span className="menu-toggle-bar" />
          </span>
          <span className="menu-toggle-text">{mobileMenuOpen ? "Fermer" : "Menu"}</span>
        </button>

        <div id="topbar-actions-menu" className={`topbar-actions ${mobileMenuOpen ? "open" : ""}`}>
          <label className="profile-chip" htmlFor="profile-name">
            Prénom
            <input
              id="profile-name"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="Ton prénom"
              maxLength={30}
            />
          </label>

          <div className="segmented">
            <button
              className={viewMode === "calendar" ? "active" : ""}
              onClick={() => {
                setViewMode("calendar");
                setMobileMenuOpen(false);
              }}
            >
              Calendrier
            </button>
            <button
              className={viewMode === "timeline" ? "active" : ""}
              onClick={() => {
                setViewMode("timeline");
                setMobileMenuOpen(false);
              }}
            >
              Timeline
            </button>
          </div>

          <button
            className="btn"
            onClick={() => {
              handleExport();
              setMobileMenuOpen(false);
            }}
          >
            Telecharger mon journal
          </button>

          <button
            className="btn"
            onClick={() => {
              setSecurityOpen((prev) => !prev);
              setMobileMenuOpen(false);
            }}
          >
            Sécurité
          </button>

          {lockEnabled ? (
            <button
              className="btn"
              onClick={() => {
                setIsUnlocked(false);
                setMobileMenuOpen(false);
              }}
            >
              Verrouiller
            </button>
          ) : null}
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <h3>Parcours annuel</h3>
          <p>{yearStats.daysWithJournal} / {yearStats.daysInYear} jours écrits</p>
          <strong>{yearStats.completionRate}%</strong>
        </article>
        <article className="stat-card">
          <h3>Humeur moyenne</h3>
          <p>{yearStats.averageMood ? `${yearStats.averageMood} / 5` : "Aucune donnée"}</p>
          <strong>{yearStats.averageMood ? moodToEmoji(Math.round(yearStats.averageMood)) : "-"}</strong>
        </article>
        <article className="stat-card">
          <h3>Favoris & Rappels</h3>
          <p>❤️ {yearStats.favoriteDays} jours favoris</p>
          <p>🔔 {yearStats.openReminders} rappels actifs</p>
        </article>
      </section>

      <section className="toolbar">
        <button className="btn" onClick={() => setSelectedYear((year) => year - 1)}>
          Année -1
        </button>
        <button className="btn" onClick={() => setSelectedYear(new Date().getFullYear())}>
          Aujourd'hui
        </button>
        <button className="btn" onClick={() => setSelectedYear((year) => year + 1)}>
          Année +1
        </button>

        <button className="btn" onClick={() => openEditor(todayKey)}>
          Ouvrir aujourd'hui
        </button>
      </section>

      <section className="calendar-legend" aria-label="Légende des indicateurs">
        <span className="legend-pill">❤️ Favori</span>
        <span className="legend-pill">📝 Journal</span>
        <span className="legend-pill">🔔 Rappel actif</span>
        <span className="legend-pill">🙂 Humeur</span>
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

      <main>
        {viewMode === "calendar" ? (
          <section className="calendar-grid">
            {calendarMonths.map((month) => (
              <article className="month-card" key={month.monthIndex}>
                <h3>{month.monthName}</h3>
                <div className="weekday-row">
                  {CALENDAR_WEEKDAYS.map((weekday, index) => (
                    <span key={`${month.monthName}-${index}`}>{weekday}</span>
                  ))}
                </div>

                <div className="day-grid">
                  {month.cells.map((cell, index) => {
                    if (!cell) {
                      return <span className="day-cell empty" key={`${month.monthName}-empty-${index}`} />;
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
              </article>
            ))}
          </section>
        ) : (
          <section className="timeline-grid">
            {timelineEntries.length === 0 ? (
              <article className="timeline-card empty-card">
                <h3>Ta timeline est vide</h3>
                <p>Ajoute une première entrée depuis la vue calendrier.</p>
              </article>
            ) : (
              timelineEntries.map((entry) => {
                const preview = entry.text.length > 170 ? `${entry.text.slice(0, 170)}...` : entry.text;
                const weather = entry.metadata?.weather
                  ? `${entry.metadata.weather.description} ${entry.metadata.weather.temperatureC ?? ""}°C`
                  : "Météo indisponible";
                const mediaItems = Array.isArray(entry.media) ? entry.media : [];
                const mediaPreview = mediaItems.slice(0, 3);
                const hiddenMediaCount = Math.max(0, mediaItems.length - mediaPreview.length);

                return (
                  <article className="timeline-card" key={entry.id}>
                    <button className="linkish" onClick={() => openEditor(entry.dateISO)}>
                      {formatDateFr(entry.dateISO)}
                    </button>
                    <p className="mood-line">Humeur: {moodToEmoji(entry.mood)}</p>
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
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}
      </main>

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

      <button className="floating-new" onClick={() => openEditor(todayKey)}>
        + Aujourd'hui
      </button>

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
              <h3>2) Journal personnel</h3>
              <p className="soft">{dayPrompt}</p>
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
              <h3>3) Rappels & alertes</h3>
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
            </section>

            <section className="editor-section">
              <h3>4) Humeur du jour</h3>
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
