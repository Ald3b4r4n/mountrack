import { collection, deleteField, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_DOSES_PER_AMPOULE } from '@/modules/dashboard/utils';

export interface AmpouleSettings {
  dosesPerAmpoule: number;
  previousDoseApplications: number;
  activeAmpouleOpenedOn: string | null;
  activeAmpouleStartDoseApplications: number | null;
  activeAmpouleRecordId: string | null;
  completedAmpoulesCount: number;
}

export interface AmpouleHistoryEntry {
  id: string;
  sequenceNumber: number;
  status: 'active' | 'closed';
  openedOn: string;
  closedOn: string | null;
  dosesPerAmpoule: number;
  startTotalDoseApplications: number;
  endTotalDoseApplications: number | null;
  dosesUsed: number | null;
}

interface CloseAmpouleHistoryInput {
  closedOn: string;
  endTotalDoseApplications: number;
  dosesUsed: number;
}

const AMPOULES_COLLECTION = 'ampoules';
const AMPOULES_SETTINGS_DOC = 'settings';

function getUserRef(userId: string) {
  return doc(db, 'users', userId);
}

function getAmpoulesCollectionRef(userId: string) {
  return collection(getUserRef(userId), AMPOULES_COLLECTION);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeDateOnly(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function hasLegacyAmpouleSettings(source?: Record<string, unknown>) {
  return isFiniteNumber(source?.dosesPerAmpoule) || isFiniteNumber(source?.previousDoseApplications);
}

function createAmpouleHistoryId() {
  return `ampoule_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeAmpouleSettings(source?: Record<string, unknown> | null): AmpouleSettings {
  const dosesPerAmpoule = isFiniteNumber(source?.dosesPerAmpoule)
    ? Math.max(1, Math.floor(source.dosesPerAmpoule))
    : DEFAULT_DOSES_PER_AMPOULE;
  const previousDoseApplications = isFiniteNumber(source?.previousDoseApplications)
    ? Math.max(0, Math.floor(source.previousDoseApplications))
    : 0;
  const completedAmpoulesCount = isFiniteNumber(source?.completedAmpoulesCount)
    ? Math.max(0, Math.floor(source.completedAmpoulesCount))
    : 0;
  const activeAmpouleOpenedOn = normalizeDateOnly(source?.activeAmpouleOpenedOn);
  const activeAmpouleStartDoseApplications = isFiniteNumber(source?.activeAmpouleStartDoseApplications)
    ? Math.max(0, Math.floor(source.activeAmpouleStartDoseApplications))
    : null;
  const activeAmpouleRecordId = normalizeOptionalString(source?.activeAmpouleRecordId);

  return {
    dosesPerAmpoule,
    previousDoseApplications,
    activeAmpouleOpenedOn,
    activeAmpouleStartDoseApplications,
    activeAmpouleRecordId,
    completedAmpoulesCount,
  };
}

function normalizeAmpouleHistoryEntry(
  id: string,
  source?: Record<string, unknown> | null,
): AmpouleHistoryEntry | null {
  const openedOn = normalizeDateOnly(source?.openedOn);

  if (!openedOn) {
    return null;
  }

  const closedOn = normalizeDateOnly(source?.closedOn);
  const sequenceNumber = isFiniteNumber(source?.sequenceNumber)
    ? Math.max(1, Math.floor(source.sequenceNumber))
    : 1;
  const dosesPerAmpoule = isFiniteNumber(source?.dosesPerAmpoule)
    ? Math.max(1, Math.floor(source.dosesPerAmpoule))
    : DEFAULT_DOSES_PER_AMPOULE;
  const startTotalDoseApplications = isFiniteNumber(source?.startTotalDoseApplications)
    ? Math.max(0, Math.floor(source.startTotalDoseApplications))
    : 0;
  const endTotalDoseApplications = isFiniteNumber(source?.endTotalDoseApplications)
    ? Math.max(0, Math.floor(source.endTotalDoseApplications))
    : null;
  const dosesUsed = isFiniteNumber(source?.dosesUsed)
    ? Math.max(0, Math.floor(source.dosesUsed))
    : null;
  const status = source?.status === 'closed' || closedOn ? 'closed' : 'active';

  return {
    id,
    sequenceNumber,
    status,
    openedOn,
    closedOn,
    dosesPerAmpoule,
    startTotalDoseApplications,
    endTotalDoseApplications,
    dosesUsed,
  };
}

export function getAmpouleSettingsRef(userId: string) {
  return doc(getUserRef(userId), AMPOULES_COLLECTION, AMPOULES_SETTINGS_DOC);
}

export function getAmpouleRecordRef(userId: string, recordId: string) {
  return doc(getUserRef(userId), AMPOULES_COLLECTION, recordId);
}

async function clearLegacyAmpouleSettings(userId: string) {
  const userRef = getUserRef(userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists() || !hasLegacyAmpouleSettings(userSnap.data())) {
    return;
  }

  await setDoc(
    userRef,
    {
      dosesPerAmpoule: deleteField(),
      previousDoseApplications: deleteField(),
    },
    { merge: true },
  );
}

async function ensureActiveAmpouleHistoryRecord(
  userId: string,
  settings: AmpouleSettings,
): Promise<AmpouleSettings> {
  if (!settings.activeAmpouleOpenedOn || settings.activeAmpouleStartDoseApplications === null) {
    return settings;
  }

  const recordId = settings.activeAmpouleRecordId ?? createAmpouleHistoryId();
  const recordRef = getAmpouleRecordRef(userId, recordId);
  const sequenceNumber = Math.max(1, settings.completedAmpoulesCount + 1);

  await setDoc(
    recordRef,
    {
      kind: 'history',
      sequenceNumber,
      status: 'active',
      openedOn: settings.activeAmpouleOpenedOn,
      closedOn: null,
      dosesPerAmpoule: settings.dosesPerAmpoule,
      startTotalDoseApplications: settings.activeAmpouleStartDoseApplications,
      endTotalDoseApplications: null,
      dosesUsed: null,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  if (settings.activeAmpouleRecordId === recordId) {
    return settings;
  }

  const updatedSettings = {
    ...settings,
    activeAmpouleRecordId: recordId,
  };

  await setDoc(
    getAmpouleSettingsRef(userId),
    {
      activeAmpouleRecordId: recordId,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  return updatedSettings;
}

export async function loadAmpouleHistory(userId: string): Promise<AmpouleHistoryEntry[]> {
  const historySnapshot = await getDocs(query(getAmpoulesCollectionRef(userId), orderBy('openedOn', 'desc')));
  const entries: AmpouleHistoryEntry[] = [];

  historySnapshot.forEach((documentSnapshot) => {
    if (documentSnapshot.id === AMPOULES_SETTINGS_DOC) {
      return;
    }

    const normalizedEntry = normalizeAmpouleHistoryEntry(documentSnapshot.id, documentSnapshot.data());

    if (normalizedEntry) {
      entries.push(normalizedEntry);
    }
  });

  return entries.sort((left, right) => right.sequenceNumber - left.sequenceNumber);
}

export async function loadAmpouleSettings(
  userId: string,
  legacySource?: Record<string, unknown>,
): Promise<AmpouleSettings> {
  const settingsRef = getAmpouleSettingsRef(userId);
  const settingsSnap = await getDoc(settingsRef);

  if (settingsSnap.exists()) {
    if (hasLegacyAmpouleSettings(legacySource)) {
      await clearLegacyAmpouleSettings(userId);
    }

    const settings = await ensureActiveAmpouleHistoryRecord(
      userId,
      normalizeAmpouleSettings(settingsSnap.data()),
    );

    return settings;
  }

  const fallbackSource = legacySource;
  let normalized = normalizeAmpouleSettings(fallbackSource);

  if (hasLegacyAmpouleSettings(fallbackSource)) {
    await setDoc(
      settingsRef,
      {
        ...normalized,
        migratedFromLegacyUserDoc: true,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    await clearLegacyAmpouleSettings(userId);
  }

  normalized = await ensureActiveAmpouleHistoryRecord(userId, normalized);

  return normalized;
}

export async function loadAmpouleSettingsWithUserFallback(userId: string): Promise<AmpouleSettings> {
  const userSnap = await getDoc(getUserRef(userId));
  return loadAmpouleSettings(userId, userSnap.data());
}

export async function saveAmpouleSettings(
  userId: string,
  settings: Partial<AmpouleSettings>,
): Promise<AmpouleSettings> {
  const settingsRef = getAmpouleSettingsRef(userId);
  const settingsSnap = await getDoc(settingsRef);
  const existingSource = settingsSnap.exists()
    ? settingsSnap.data()
    : (await getDoc(getUserRef(userId))).data();
  let normalized = normalizeAmpouleSettings({
    ...existingSource,
    ...settings,
  } as Record<string, unknown>);

  await setDoc(
    settingsRef,
    {
      ...normalized,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  normalized = await ensureActiveAmpouleHistoryRecord(userId, normalized);

  await clearLegacyAmpouleSettings(userId);

  return normalized;
}

export async function closeAmpouleHistoryEntry(
  userId: string,
  recordId: string,
  data: CloseAmpouleHistoryInput,
): Promise<void> {
  await setDoc(
    getAmpouleRecordRef(userId, recordId),
    {
      kind: 'history',
      status: 'closed',
      closedOn: normalizeDateOnly(data.closedOn),
      endTotalDoseApplications: Math.max(0, Math.floor(data.endTotalDoseApplications)),
      dosesUsed: Math.max(0, Math.floor(data.dosesUsed)),
      updatedAt: new Date(),
    },
    { merge: true },
  );
}
