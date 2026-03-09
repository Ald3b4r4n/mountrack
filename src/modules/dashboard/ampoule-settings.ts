import { deleteField, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_DOSES_PER_AMPOULE } from '@/modules/dashboard/utils';

export interface AmpouleSettings {
  dosesPerAmpoule: number;
  previousDoseApplications: number;
}

const AMPOULES_COLLECTION = 'ampoules';
const AMPOULES_SETTINGS_DOC = 'settings';

function getUserRef(userId: string) {
  return doc(db, 'users', userId);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasLegacyAmpouleSettings(source?: Record<string, unknown>) {
  return isFiniteNumber(source?.dosesPerAmpoule) || isFiniteNumber(source?.previousDoseApplications);
}

export function normalizeAmpouleSettings(source?: Record<string, unknown> | null): AmpouleSettings {
  const dosesPerAmpoule = isFiniteNumber(source?.dosesPerAmpoule)
    ? Math.max(1, Math.floor(source.dosesPerAmpoule))
    : DEFAULT_DOSES_PER_AMPOULE;
  const previousDoseApplications = isFiniteNumber(source?.previousDoseApplications)
    ? Math.max(0, Math.floor(source.previousDoseApplications))
    : 0;

  return {
    dosesPerAmpoule,
    previousDoseApplications,
  };
}

export function getAmpouleSettingsRef(userId: string) {
  return doc(getUserRef(userId), AMPOULES_COLLECTION, AMPOULES_SETTINGS_DOC);
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
    return normalizeAmpouleSettings(settingsSnap.data());
  }

  const fallbackSource = legacySource;

  const normalized = normalizeAmpouleSettings(fallbackSource);

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
  const normalized = normalizeAmpouleSettings(settings as Record<string, unknown>);

  await setDoc(
    getAmpouleSettingsRef(userId),
    {
      ...normalized,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  await clearLegacyAmpouleSettings(userId);

  return normalized;
}
