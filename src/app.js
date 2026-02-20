const STORAGE_KEY_ENTRIES = "journal.entries.v1";
const STORAGE_KEY_LOCK = "journal.lock.v1";
const STORAGE_KEY_DRAFTS = "journal.drafts.v1";
const STORAGE_KEY_PROFILE = "journal.profile.v1";
const STORAGE_KEY_DAILY_NOTIFICATION = "journal.daily.notification.v1";
const DAILY_MOTIVATION_TARGET_HOUR = 8;

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre"
];

const WEATHER_CODE_LABELS = {
  0: "Ciel dégagé",
  1: "Plutôt ensoleillé",
  2: "Partiellement nuageux",
  3: "Nuageux",
  45: "Brume",
  48: "Brouillard givrant",
  51: "Bruine légère",
  53: "Bruine modérée",
  55: "Bruine dense",
  61: "Pluie légère",
  63: "Pluie modérée",
  65: "Pluie forte",
  71: "Neige légère",
  73: "Neige modérée",
  75: "Neige forte",
  80: "Averses légères",
  81: "Averses modérées",
  82: "Averses intenses",
  95: "Orage"
};

const MESSAGE_LIBRARY_SIZE = 5000;
const MESSAGE_HORIZON_START_YEAR = 2026;
const MESSAGE_HORIZON_YEARS = 12;
const MESSAGE_LIBRARY_SEED = 20260220;
const MS_PER_DAY = 86400000;

// Ton self-love: validation emotionnelle + autonomie + action concrete + ouverture a l'aide.
const MESSAGE_OPENINGS = [
  "Aujourd'hui, ton coeur merite une parole douce.",
  "Ce matin, tu peux te parler avec respect.",
  "Tu n'as rien a prouver pour meriter la bienveillance.",
  "Ta valeur reste entiere, meme dans les jours lourds.",
  "Commence par te traiter comme une personne que tu aimes.",
  "Tu peux avancer sans te maltraiter.",
  "Respire: tu as le droit d'exister sans performance.",
  "Ta dignite ne depend pas de ta productivite.",
  "Aujourd'hui, sois d'abord ton propre refuge.",
  "Tu as le droit d'etre en construction.",
  "Tu peux ralentir sans abandonner ton chemin.",
  "Le calme et le courage peuvent coexister en toi.",
  "Tu peux repartir d'un pas minuscule et sincere.",
  "Ton histoire ne se resume pas a ce moment difficile.",
  "Tu as le droit de poser ton sac mental un instant.",
  "Tu n'es pas en retard, tu es en train de te reconstruire.",
  "Prends cet instant pour revenir a toi.",
  "Meme fatigue, tu restes digne de respect.",
  "Ta sensibilite est une force en apprentissage.",
  "Tu as le droit de recommencer encore.",
  "Rien n'efface ta valeur humaine aujourd'hui.",
  "Cette journee peut etre douce, meme imparfaite.",
  "Tu peux honorer ton rythme sans culpabiliser.",
  "Ta presence compte, meme quand ton energie baisse.",
  "Tu merites un dialogue interieur plus tendre.",
  "Tu as le droit d'etre fragile et courageux(se) a la fois."
];

const MESSAGE_EMOTION_ACKNOWLEDGEMENTS = [
  "Si la tristesse est la, elle a le droit d'etre entendue.",
  "Si ton esprit est bruyant, tu peux choisir une respiration calme.",
  "Si tu te sens vide, ce ressenti ne definit pas ton avenir.",
  "Si tout semble lourd, tu peux reduire la journee a une seule etape.",
  "Si la motivation manque, commence sans attendre l'envie parfaite.",
  "Si tu te sens seul(e), rappelle-toi que demander du lien est legitime.",
  "Si la honte monte, observe-la sans la laisser decider pour toi.",
  "Si l'anxiete serre, pose une main sur ton coeur et reviens au present.",
  "Si la fatigue mentale t'ecrase, ton besoin de pause est valable.",
  "Si la culpabilite tourne en boucle, choisis aujourd'hui la douceur utile.",
  "Si tu te sens bloque(e), un petit mouvement peut rouvrir l'elan.",
  "Si tu doutes de toi, ton doute n'est pas la verite complete.",
  "Si tu traverses une periode depressive, avance en gestes tres simples.",
  "Si tu n'as plus gout a rien, commence par une action de 5 minutes.",
  "Si tes pensees deviennent sombres, tu peux chercher un appui maintenant.",
  "Si tu te compares, reviens a ta route et a tes besoins reels.",
  "Si tu as l'impression d'echouer, regarde ce que tu tiens encore debout.",
  "Si ton coeur est serre, ralentir est un acte de lucidite.",
  "Si tu as peur du futur, choisis une decision soutenante pour aujourd'hui.",
  "Si tu te sens epuisé(e), protege ton energie avant de te juger.",
  "Si tu as envie de disparaitre du bruit, cree un espace de calme.",
  "Si tu te sens en retard, souviens-toi que chaque rythme est humain.",
  "Si tu pleures facilement, cela dit ton besoin de soin, pas une faiblesse.",
  "Si tu as honte de souffrir, rappelle-toi que la souffrance est humaine.",
  "Si l'obscurite interne dure, tu as le droit d'etre accompagne(e).",
  "Si la tristesse persiste depuis des semaines, parler a un pro est une force."
];

const MESSAGE_AUTONOMY_REFRAMES = [
  "Tu peux choisir une limite saine qui protege ta paix.",
  "Tu peux decider ce que tu n'acceptes plus dans ton dialogue interieur.",
  "Tu peux dire non a l'exces et oui a l'essentiel.",
  "Tu peux reprendre la main avec une decision claire et realiste.",
  "Tu peux construire ta stabilite pas a pas.",
  "Tu peux honorer ton corps, ton temps et ton attention.",
  "Tu peux definir une priorite et la traiter avec douceur.",
  "Tu peux te donner l'autorisation d'apprendre sans te punir.",
  "Tu peux transformer la pression en plan simple.",
  "Tu peux choisir la constance plutot que la perfection.",
  "Tu peux garder ton cap meme dans une petite vitesse.",
  "Tu peux t'offrir la meme compassion qu'a un ami.",
  "Tu peux faire un choix autonome aligne avec tes valeurs.",
  "Tu peux sortir du pilote automatique par une action consciente.",
  "Tu peux te respecter dans tes besoins, meme invisibles.",
  "Tu peux te proteger des voix qui te diminuent.",
  "Tu peux te redonner de la puissance en simplifiant.",
  "Tu peux te rappeler que ton identite depasse tes resultats.",
  "Tu peux agir avec fermete sans devenir dur(e) envers toi.",
  "Tu peux reajuster ton objectif plutot que t'abandonner.",
  "Tu peux poser un cadre et respirer dedans.",
  "Tu peux choisir la patience active.",
  "Tu peux faire de ta sante mentale une priorite legitime.",
  "Tu peux decider de te parler avec verite et dignite.",
  "Tu peux avancer en restant loyal(e) a toi.",
  "Tu peux devenir ton propre allié(e) quotidien."
];

const MESSAGE_SELF_CARE_ACTIONS = [
  "Bois un verre d'eau puis ecris trois phrases sinceres sur ton etat.",
  "Fais une marche de 10 minutes pour relancer ton systeme nerveux.",
  "Mets un minuteur de 5 minutes et commence la premiere micro-tache.",
  "Mange quelque chose de nourrissant avant de reprendre.",
  "Range un petit espace pour clarifier ton esprit.",
  "Envoie un message court a une personne de confiance.",
  "Planifie une seule priorite pour aujourd'hui, pas dix.",
  "Fais une pause ecran et regarde au loin pendant une minute.",
  "Ecris une phrase de gratitude realiste, meme minuscule.",
  "Reviens a ton souffle avec 4 respirations lentes.",
  "Fais la version la plus petite de ce que tu repousses.",
  "Prends une douche chaude ou froide pour marquer un nouveau depart.",
  "Mets ton telephone en mode concentration pour 20 minutes.",
  "Pose une alarme sommeil pour proteger ta nuit.",
  "Ajoute une activite qui te recharge vraiment aujourd'hui.",
  "Fractionne ton objectif en premiere etape concretement faisable.",
  "Si tu n'as pas d'elan, avance juste de deux minutes.",
  "Mets une musique apaisante et relache les epaules.",
  "Remplace une auto-critique par une phrase de soutien.",
  "Coche une tache simple pour retrouver de la traction.",
  "Prends l'air meme brievement pour debloquer ton mental.",
  "Prepare ton environnement pour te faciliter demain.",
  "Choisis une action qui protege ton energie emotionnelle.",
  "Rappelle-toi: une petite action vaut mieux que l'attente parfaite.",
  "Prends un repas a heure reguliere pour stabiliser ton corps.",
  "Inscris un rendez-vous de soutien si tu sens que c'est necessaire."
];

const MESSAGE_SUPPORT_REMINDERS = [
  "Rester en lien aide souvent a traverser les jours bas.",
  "Parler de ce que tu ressens peut alleger la charge.",
  "Demander de l'aide n'enleve rien a ton autonomie, ca la renforce.",
  "Un accompagnement professionnel peut vraiment faire une difference.",
  "Tu n'as pas a tout porter seul(e).",
  "Les soins psychologiques sont un acte de responsabilite envers toi.",
  "Si les symptomes durent, consulte un professionnel de sante mentale.",
  "Chercher du soutien est une competence, pas une faiblesse.",
  "Ton entourage de confiance peut etre un appui concret.",
  "Tu peux combiner auto-compassion et aide exterieure.",
  "Etre accompagne(e) peut accelerer ton retablissement.",
  "Quand la detresse monte, priorise la securite avant tout.",
  "Si tu te sens en danger de te faire du mal, contacte le 988 ou les urgences immediatement.",
  "Aux Etats-Unis, le 988 est disponible 24h/24 pour le soutien de crise.",
  "Si la douleur devient trop intense, parle a quelqu'un maintenant.",
  "Ton besoin d'aide est legitime et respectable.",
  "Tu as le droit d'avoir un plan de soutien clair.",
  "La connexion humaine est un vrai facteur de protection."
];

const MESSAGE_CLOSINGS = [
  "Tu progresses plus que tu ne le vois.",
  "Ton futur peut encore changer en ta faveur.",
  "Tu fais deja quelque chose d'important en restant present(e).",
  "Ta constance douce construit une vraie force.",
  "Cette journee compte dans ton histoire de guerison.",
  "Tu peux finir cette journee avec dignite.",
  "Tu es en train d'apprendre a te choisir.",
  "Reste proche de toi, c'est deja une victoire.",
  "Tu merites de la paix et de la clarte.",
  "Ton courage existe meme quand il est silencieux.",
  "Tu as le droit d'etre fier(e) de tes petits pas.",
  "Chaque pas sincere te rapproche d'un mieux.",
  "Tu n'es pas casse(e), tu es humain(e).",
  "Ton coeur merite patience et respect.",
  "Rien n'est fige, surtout pas toi.",
  "Tu peux te reconstruire sans te brusquer.",
  "La douceur envers toi est une strategie solide.",
  "Continue, meme lentement, continue.",
  "Tu as en toi les ressources pour traverser.",
  "Ta valeur ne fluctue pas avec ton humeur du jour.",
  "Sois loyal(e) a ton bien-etre.",
  "Tu peux faire de cette date un repere de soin.",
  "Merci de ne pas t'abandonner aujourd'hui.",
  "Tu peux te relever sans te violenter.",
  "Ce pas, meme petit, est un vrai oui a ta vie.",
  "Tu as le droit de croire en ton retour a la lumiere."
];

function createSeededRng(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pickRandom(collection, random) {
  const index = Math.floor(random() * collection.length);
  return collection[index];
}

function buildSelfLoveMessage(random) {
  return [
    pickRandom(MESSAGE_OPENINGS, random),
    pickRandom(MESSAGE_EMOTION_ACKNOWLEDGEMENTS, random),
    pickRandom(MESSAGE_AUTONOMY_REFRAMES, random),
    pickRandom(MESSAGE_SELF_CARE_ACTIONS, random),
    pickRandom(MESSAGE_SUPPORT_REMINDERS, random),
    pickRandom(MESSAGE_CLOSINGS, random)
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMessageLibrary(size = MESSAGE_LIBRARY_SIZE) {
  const random = createSeededRng(MESSAGE_LIBRARY_SEED);
  const uniqueMessages = new Set();
  const maxAttempts = size * 80;
  let attempts = 0;

  while (uniqueMessages.size < size && attempts < maxAttempts) {
    uniqueMessages.add(buildSelfLoveMessage(random));
    attempts += 1;
  }

  if (uniqueMessages.size < size) {
    while (uniqueMessages.size < size) {
      uniqueMessages.add(
        `Tu es digne d'amour et de soutien. Un pas conscient aujourd'hui peut ouvrir un espace meilleur demain. Message ${uniqueMessages.size + 1}.`
      );
    }
  }

  return Array.from(uniqueMessages);
}

const MESSAGE_LIBRARY = buildMessageLibrary();

export const MAX_MEDIA_BYTES = 1200000;
export const MAX_MEDIA_PER_ENTRY = 4;
export const STORAGE_BYTES_SOFT_LIMIT = 4500000;

export const MOOD_OPTIONS = [
  { value: 1, emoji: "😞", label: "Difficile" },
  { value: 2, emoji: "😕", label: "Moyen" },
  { value: 3, emoji: "😐", label: "Neutre" },
  { value: 4, emoji: "🙂", label: "Bien" },
  { value: 5, emoji: "😄", label: "Excellent" }
];

export const CALENDAR_WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function moodToEmoji(mood) {
  return MOOD_OPTIONS.find((item) => item.value === mood)?.emoji || "😐";
}

export function formatDateKey(inputDate) {
  const date = inputDate instanceof Date ? inputDate : new Date(inputDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function formatDateFr(dateKey, options) {
  const defaultOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  };

  return new Intl.DateTimeFormat("fr-FR", options || defaultOptions).format(parseDateKey(dateKey));
}

export function formatDateTimeFr(dateIso) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function getDayOfYear(inputDate) {
  const date = inputDate instanceof Date ? inputDate : new Date(inputDate);
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

export function getDaysInYear(year) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return Math.round((end - start) / 86400000);
}

function toUtcMidnight(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeProfileName(profileName) {
  const value = typeof profileName === "string" ? profileName.trim() : "";
  return value || "toi";
}

function getStableMessageIndex(date) {
  const startUtc = Date.UTC(MESSAGE_HORIZON_START_YEAR, 0, 1);
  const endUtc = Date.UTC(MESSAGE_HORIZON_START_YEAR + MESSAGE_HORIZON_YEARS, 0, 1);
  const dateUtc = toUtcMidnight(date);

  if (dateUtc >= startUtc && dateUtc < endUtc) {
    return Math.floor((dateUtc - startUtc) / MS_PER_DAY) % MESSAGE_LIBRARY.length;
  }

  const fallbackSeed = date.getFullYear() * 379 + getDayOfYear(date) * 41;
  return Math.abs(fallbackSeed) % MESSAGE_LIBRARY.length;
}

export function getMotivationalLibraryInfo() {
  return {
    size: MESSAGE_LIBRARY.length,
    startYear: MESSAGE_HORIZON_START_YEAR,
    endYearInclusive: MESSAGE_HORIZON_START_YEAR + MESSAGE_HORIZON_YEARS - 1
  };
}

export function buildMotivationalMessage(dateKey, profileName = "") {
  const date = parseDateKey(dateKey);
  const messageIndex = getStableMessageIndex(date);
  const baseMessage = MESSAGE_LIBRARY[messageIndex];
  const name = normalizeProfileName(profileName);

  if (name === "toi") {
    return baseMessage;
  }

  return `${name}, ${baseMessage}`;
}

export function getPromptForDate(dateKey) {
  const weekday = parseDateKey(dateKey).getDay();

  if (weekday === 1) {
    return "Quels sont tes objectifs prioritaires pour cette semaine ?";
  }

  if (weekday === 5) {
    return "Quelle est ta plus grande victoire de la semaine, même petite ?";
  }

  if (weekday === 0) {
    return "Prépare-toi pour demain: de quoi as-tu besoin pour démarrer sereinement ?";
  }

  if (weekday === 2) {
    return "Qu'as-tu appris aujourd'hui qui mérite d'être retenu ?";
  }

  if (weekday === 3) {
    return "Quelle difficulté as-tu réussi à traverser et comment ?";
  }

  if (weekday === 4) {
    return "Quelle relation ou action t'a apporté de l'énergie aujourd'hui ?";
  }

  return "Quel moment aimerais-tu revivre de cette journée ?";
}

function normalizeReminder(reminder, fallbackDateIso) {
  const scheduledFor = typeof reminder?.scheduledFor === "string" ? reminder.scheduledFor : "";
  const parsedDate = scheduledFor ? new Date(scheduledFor) : null;

  return {
    id: reminder?.id || createClientId(),
    title: typeof reminder?.title === "string" ? reminder.title.trim() : "",
    scheduledFor: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : "",
    done: Boolean(reminder?.done),
    notifiedAt: typeof reminder?.notifiedAt === "string" ? reminder.notifiedAt : "",
    createdAt: typeof reminder?.createdAt === "string" ? reminder.createdAt : fallbackDateIso
  };
}

function normalizeEntry(dateKey, rawEntry) {
  const fallbackDateIso = `${dateKey}T12:00:00.000Z`;
  const reminders = Array.isArray(rawEntry?.reminders)
    ? rawEntry.reminders.map((item) => normalizeReminder(item, fallbackDateIso)).filter((item) => item.title)
    : [];

  return {
    id: rawEntry?.id || dateKey,
    dateISO: rawEntry?.dateISO || dateKey,
    text: typeof rawEntry?.text === "string" ? rawEntry.text : "",
    mood: typeof rawEntry?.mood === "number" ? Math.max(1, Math.min(5, rawEntry.mood)) : 3,
    media: Array.isArray(rawEntry?.media) ? rawEntry.media : [],
    prompt: typeof rawEntry?.prompt === "string" ? rawEntry.prompt : getPromptForDate(dateKey),
    customMessage: typeof rawEntry?.customMessage === "string" ? rawEntry.customMessage : "",
    reminders,
    favorite: Boolean(rawEntry?.favorite),
    metadata: rawEntry?.metadata || null,
    createdAt: typeof rawEntry?.createdAt === "string" ? rawEntry.createdAt : fallbackDateIso,
    updatedAt: typeof rawEntry?.updatedAt === "string" ? rawEntry.updatedAt : fallbackDateIso
  };
}

function normalizeEntries(rawEntries) {
  if (!rawEntries || typeof rawEntries !== "object") {
    return {};
  }

  return Object.entries(rawEntries).reduce((accumulator, [dateKey, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return accumulator;
    }

    accumulator[dateKey] = normalizeEntry(dateKey, entry);
    return accumulator;
  }, {});
}

export function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (!raw) {
      return {};
    }

    return normalizeEntries(JSON.parse(raw));
  } catch (error) {
    return {};
  }
}

export function persistEntries(entries) {
  localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(normalizeEntries(entries)));
}

export function estimateStorageSize(entries) {
  return new Blob([JSON.stringify(entries)]).size;
}

export function exportEntries(entries) {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    entries: listTimelineEntries(entries).reverse()
  };

  return JSON.stringify(payload, null, 2);
}

export function entryHasJournal(entry) {
  return Boolean(entry?.text?.trim() || (Array.isArray(entry?.media) && entry.media.length > 0));
}

export function entryHasActiveReminder(entry) {
  if (!Array.isArray(entry?.reminders)) {
    return false;
  }

  return entry.reminders.some((reminder) => !reminder.done);
}

function entryHasMeaningfulMood(entry) {
  return typeof entry?.mood === "number" && entry.mood !== 3;
}

function entryHasMeaningfulContent(entry) {
  return Boolean(
    entryHasJournal(entry) ||
      entryHasActiveReminder(entry) ||
      entry?.favorite ||
      entry?.customMessage?.trim() ||
      entryHasMeaningfulMood(entry)
  );
}

export function initCalendar(year, entries) {
  const todayKey = formatDateKey(new Date());

  return MONTH_NAMES.map((monthName, monthIndex) => {
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const offset = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const cells = [];

    for (let index = 0; index < offset; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const entry = entries[dateKey];

      cells.push({
        dateKey,
        day,
        hasEntry: entryHasMeaningfulContent(entry),
        hasJournal: entryHasJournal(entry),
        hasFavorite: Boolean(entry?.favorite),
        hasReminderActive: entryHasActiveReminder(entry),
        isToday: dateKey === todayKey,
        isPast: dateKey < todayKey,
        mood: entry?.mood || null
      });
    }

    return {
      monthIndex,
      monthName,
      cells
    };
  });
}

export function listTimelineEntries(entries) {
  return Object.values(normalizeEntries(entries))
    .filter((entry) => entry && typeof entry === "object" && entry.dateISO)
    .sort((left, right) => right.dateISO.localeCompare(left.dateISO));
}

export function getMemoriesForDate(entries, dateKey) {
  const [year, month, day] = dateKey.split("-");

  return listTimelineEntries(entries).filter(
    (entry) => entry.dateISO !== dateKey && entry.dateISO.endsWith(`-${month}-${day}`) && !entry.dateISO.startsWith(year)
  );
}

export function createEmptyDraft(dateKey, previousEntry) {
  const normalized = normalizeEntry(dateKey, previousEntry || {});

  return {
    dateKey,
    text: normalized.text,
    mood: normalized.mood,
    media: normalized.media,
    reminders: normalized.reminders,
    favorite: normalized.favorite,
    customMessage: normalized.customMessage
  };
}

function loadDraftStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function persistDraftStore(store) {
  localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(store));
}

export function loadDraftSnapshot(dateKey) {
  const store = loadDraftStore();
  const draft = store[dateKey];

  if (!draft || typeof draft !== "object") {
    return null;
  }

  return {
    text: typeof draft.text === "string" ? draft.text : "",
    mood: typeof draft.mood === "number" ? Math.max(1, Math.min(5, draft.mood)) : 3,
    reminders: Array.isArray(draft.reminders)
      ? draft.reminders.map((item) => normalizeReminder(item, `${dateKey}T12:00:00.000Z`)).filter((item) => item.title)
      : [],
    favorite: Boolean(draft.favorite),
    customMessage: typeof draft.customMessage === "string" ? draft.customMessage : ""
  };
}

export function persistDraftSnapshot(dateKey, draft) {
  const store = loadDraftStore();

  store[dateKey] = {
    text: typeof draft?.text === "string" ? draft.text : "",
    mood: typeof draft?.mood === "number" ? Math.max(1, Math.min(5, draft.mood)) : 3,
    reminders: Array.isArray(draft?.reminders)
      ? draft.reminders.map((item) => normalizeReminder(item, `${dateKey}T12:00:00.000Z`)).filter((item) => item.title)
      : [],
    favorite: Boolean(draft?.favorite),
    customMessage: typeof draft?.customMessage === "string" ? draft.customMessage : "",
    updatedAt: new Date().toISOString()
  };

  persistDraftStore(store);
}

export function clearDraftSnapshot(dateKey) {
  const store = loadDraftStore();
  delete store[dateKey];
  persistDraftStore(store);
}

export function loadProfileName() {
  const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
  return typeof raw === "string" ? raw : "";
}

export function persistProfileName(name) {
  localStorage.setItem(STORAGE_KEY_PROFILE, name || "");
}

export function getYearOverviewStats(entries, year) {
  const timeline = listTimelineEntries(entries).filter((entry) => entry.dateISO.startsWith(`${year}-`));
  const daysInYear = getDaysInYear(year);

  const moodCounts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };

  let daysWithJournal = 0;
  let favoriteDays = 0;
  let openReminders = 0;
  let moodTotal = 0;
  let moodCount = 0;

  for (const entry of timeline) {
    if (entryHasJournal(entry)) {
      daysWithJournal += 1;
    }

    if (entry.favorite) {
      favoriteDays += 1;
    }

    openReminders += Array.isArray(entry.reminders) ? entry.reminders.filter((item) => !item.done).length : 0;

    if (typeof entry.mood === "number" && moodCounts[entry.mood] !== undefined) {
      moodCounts[entry.mood] += 1;
      moodTotal += entry.mood;
      moodCount += 1;
    }
  }

  return {
    year,
    daysInYear,
    daysWithJournal,
    completionRate: Math.round((daysWithJournal / daysInYear) * 100),
    favoriteDays,
    openReminders,
    moodCounts,
    averageMood: moodCount > 0 ? Number((moodTotal / moodCount).toFixed(2)) : null
  };
}

export function collectDueReminderAlerts(entries, now = new Date()) {
  const nowTime = now.getTime();
  const alerts = [];

  for (const [dateKey, entry] of Object.entries(entries || {})) {
    if (!Array.isArray(entry?.reminders)) {
      continue;
    }

    for (const reminder of entry.reminders) {
      if (reminder.done || reminder.notifiedAt || !reminder.scheduledFor) {
        continue;
      }

      const reminderTime = new Date(reminder.scheduledFor).getTime();
      if (Number.isNaN(reminderTime)) {
        continue;
      }

      if (reminderTime <= nowTime) {
        alerts.push({
          dateKey,
          reminderId: reminder.id,
          reminderTitle: reminder.title,
          reminderWhen: reminder.scheduledFor
        });
      }
    }
  }

  return alerts;
}

export function markReminderAlertsNotified(entries, alerts, notifiedAtIso = new Date().toISOString()) {
  if (!alerts.length) {
    return entries;
  }

  const map = new Map(alerts.map((alert) => [`${alert.dateKey}::${alert.reminderId}`, true]));
  const next = { ...entries };

  for (const [dateKey, entry] of Object.entries(next)) {
    if (!Array.isArray(entry?.reminders)) {
      continue;
    }

    let changed = false;
    const nextReminders = entry.reminders.map((reminder) => {
      if (map.has(`${dateKey}::${reminder.id}`)) {
        changed = true;
        return {
          ...reminder,
          notifiedAt: notifiedAtIso
        };
      }

      return reminder;
    });

    if (changed) {
      next[dateKey] = {
        ...entry,
        reminders: nextReminders,
        updatedAt: notifiedAtIso
      };
    }
  }

  return next;
}

export function requestNotificationAccess() {
  if (typeof Notification === "undefined") {
    return Promise.resolve("unsupported");
  }

  if (Notification.permission === "granted") {
    return Promise.resolve("granted");
  }

  return Notification.requestPermission();
}

export async function sendBrowserNotification(title, body, options = {}) {
  if (typeof Notification === "undefined") {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const targetUrl = typeof options.url === "string" ? options.url : "/";
  const payload = {
    body,
    tag: options.tag || `nous-${Date.now()}`,
    data: {
      url: targetUrl
    },
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    renotify: false
  };

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, payload);
      return true;
    }
  } catch (error) {
    // Fallback to window notification below.
  }

  try {
    const notification = new Notification(title, payload);
    notification.onclick = () => {
      if (typeof window !== "undefined") {
        window.focus();
        if (window.location.pathname !== targetUrl) {
          window.location.assign(targetUrl);
        }
      }
      notification.close();
    };
    return true;
  } catch (error) {
    return false;
  }
}

export function getDailyMotivationScheduleInfo() {
  const hour = DAILY_MOTIVATION_TARGET_HOUR;
  const label = `${String(hour).padStart(2, "0")}:00`;

  return { hour, label };
}

function resolveDailyNotificationDateKey(value) {
  if (typeof value === "string" && value) {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateKey(value);
  }

  const asDate = new Date(value || Date.now());
  return Number.isNaN(asDate.getTime()) ? formatDateKey(new Date()) : formatDateKey(asDate);
}

export function shouldSendDailyMotivation(nowOrDateKey = new Date(), targetHour = DAILY_MOTIVATION_TARGET_HOUR) {
  const last = localStorage.getItem(STORAGE_KEY_DAILY_NOTIFICATION);

  if (typeof nowOrDateKey === "string") {
    return last !== nowOrDateKey;
  }

  const now = nowOrDateKey instanceof Date ? nowOrDateKey : new Date(nowOrDateKey);
  if (Number.isNaN(now.getTime())) {
    return false;
  }

  if (now.getHours() < targetHour) {
    return false;
  }

  return last !== formatDateKey(now);
}

export function markDailyMotivationSent(nowOrDateKey = new Date()) {
  const dateKey = resolveDailyNotificationDateKey(nowOrDateKey);
  localStorage.setItem(STORAGE_KEY_DAILY_NOTIFICATION, dateKey);
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 9000,
      maximumAge: 15 * 60 * 1000
    });
  });
}

function labelForWeatherCode(code) {
  if (typeof code !== "number") {
    return "Conditions inconnues";
  }

  return WEATHER_CODE_LABELS[code] || "Conditions inconnues";
}

async function getWeatherData(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code",
    timezone: "auto"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Météo indisponible");
  }

  const data = await response.json();
  const current = data.current || {};

  return {
    source: "open-meteo",
    temperatureC: typeof current.temperature_2m === "number" ? current.temperature_2m : null,
    code: typeof current.weather_code === "number" ? current.weather_code : null,
    description: labelForWeatherCode(current.weather_code)
  };
}

async function getLocationLabel(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    language: "fr",
    count: "1"
  });

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Localisation indisponible");
  }

  const data = await response.json();
  const place = data.results?.[0];

  if (!place) {
    return "Localisation indisponible";
  }

  const labelParts = [place.name, place.admin1, place.country].filter(Boolean);
  return labelParts.join(", ");
}

export async function captureAutomaticMetadata(previousMetadata = null) {
  const metadata = {
    capturedAt: new Date().toISOString(),
    locationLabel: previousMetadata?.locationLabel || "Localisation indisponible",
    coordinates: previousMetadata?.coordinates || null,
    weather: previousMetadata?.weather || null,
    notes: []
  };

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    metadata.notes.push("La géolocalisation n'est pas supportée sur cet appareil.");
    return metadata;
  }

  try {
    const position = await getCurrentPosition();
    const latitude = Number(position.coords.latitude.toFixed(4));
    const longitude = Number(position.coords.longitude.toFixed(4));
    metadata.coordinates = { latitude, longitude };

    const [locationResult, weatherResult] = await Promise.allSettled([
      getLocationLabel(latitude, longitude),
      getWeatherData(latitude, longitude)
    ]);

    if (locationResult.status === "fulfilled") {
      metadata.locationLabel = locationResult.value;
    } else {
      metadata.notes.push("Texte de localisation indisponible.");
    }

    if (weatherResult.status === "fulfilled") {
      metadata.weather = weatherResult.value;
    } else {
      metadata.notes.push("Météo indisponible au moment de l'écriture.");
    }

    return metadata;
  } catch (error) {
    metadata.notes.push("Autorisation de géolocalisation refusée ou délai dépassé.");
    return metadata;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lecture média impossible"));
    reader.readAsDataURL(file);
  });
}

export async function prepareMediaFiles(fileList) {
  const files = Array.from(fileList || []);
  const valid = [];
  const errors = [];

  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      errors.push(`${file.name} n'est pas un format image/vidéo valide.`);
      continue;
    }

    if (file.size > MAX_MEDIA_BYTES) {
      errors.push(`${file.name} dépasse la limite de ${(MAX_MEDIA_BYTES / 1000000).toFixed(1)} Mo.`);
      continue;
    }

    const dataUrl = await fileToDataUrl(file);

    valid.push({
      id: createClientId(),
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl
    });
  }

  return { valid, errors };
}

function ensureWebCrypto() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto est indisponible sur cet appareil.");
  }
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

function randomSaltHex() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function hashPinWithSalt(pin, salt) {
  ensureWebCrypto();
  const payload = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return bytesToHex(new Uint8Array(digest));
}

export function hasLockPin() {
  return Boolean(localStorage.getItem(STORAGE_KEY_LOCK));
}

export async function setLockPin(pin) {
  if (!pin || pin.length < 4) {
    throw new Error("Choisis un code de 4 chiffres minimum.");
  }

  const salt = randomSaltHex();
  const hash = await hashPinWithSalt(pin, salt);

  localStorage.setItem(
    STORAGE_KEY_LOCK,
    JSON.stringify({
      salt,
      hash,
      updatedAt: new Date().toISOString()
    })
  );
}

export async function verifyLockPin(pin) {
  const raw = localStorage.getItem(STORAGE_KEY_LOCK);

  if (!raw) {
    return true;
  }

  try {
    const parsed = JSON.parse(raw);
    const expectedHash = await hashPinWithSalt(pin, parsed.salt);
    return expectedHash === parsed.hash;
  } catch (error) {
    return false;
  }
}

export function clearLockPin() {
  localStorage.removeItem(STORAGE_KEY_LOCK);
}
