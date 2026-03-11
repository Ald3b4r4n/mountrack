import { collection, deleteField, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import {
  closeAmpouleHistoryEntry,
  loadAmpouleHistory,
  loadAmpouleSettings,
  loadAmpouleSettingsWithUserFallback,
  saveAmpouleSettings,
  updateAmpouleHistoryEntry,
} from '@/modules/dashboard/ampoule-settings';

jest.mock('@/lib/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  deleteField: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  setDoc: jest.fn(),
}));

type SnapshotData = Record<string, unknown> | undefined;

const collectionMock = jest.mocked(collection);
const docMock = jest.mocked(doc);
const getDocMock = jest.mocked(getDoc);
const getDocsMock = jest.mocked(getDocs);
const orderByMock = jest.mocked(orderBy);
const queryMock = jest.mocked(query);
const setDocMock = jest.mocked(setDoc);
const deleteFieldMock = jest.mocked(deleteField);
const deleteFieldToken = { __delete: true };

function makeSnapshot(data?: SnapshotData) {
  return {
    exists: () => data !== undefined,
    data: () => data,
  };
}

function makeQuerySnapshot(
  docs: Array<{ id: string; data: () => Record<string, unknown> | undefined }>,
) {
  return {
    forEach: (callback: (doc: { id: string; data: () => Record<string, unknown> | undefined }) => void) => {
      docs.forEach(callback);
    },
  };
}

describe('ampoule-settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deleteFieldMock.mockReturnValue(deleteFieldToken as never);
    collectionMock.mockImplementation((parent: unknown, ...segments: string[]) => {
      const parentPath =
        typeof parent === 'object' && parent !== null && 'path' in (parent as Record<string, unknown>)
          ? String((parent as { path: string }).path)
          : '';

      return {
        path: parentPath ? `${parentPath}/${segments.join('/')}` : segments.join('/'),
      } as never;
    });
    docMock.mockImplementation((parent: unknown, ...segments: string[]) => {
      const parentPath =
        typeof parent === 'object' && parent !== null && 'path' in (parent as Record<string, unknown>)
          ? String((parent as { path: string }).path)
          : '';

      return {
        path: parentPath ? `${parentPath}/${segments.join('/')}` : segments.join('/'),
      } as never;
    });
    orderByMock.mockImplementation((fieldPath: unknown, direction?: unknown) => ({
      fieldPath,
      direction,
    }) as never);
    queryMock.mockImplementation((ref: unknown, ...constraints: unknown[]) => ({ ref, constraints }) as never);
  });

  it('returns subcollection settings and clears legacy fields from the root user doc', async () => {
    getDocMock
      .mockResolvedValueOnce(makeSnapshot({ dosesPerAmpoule: 6, previousDoseApplications: 2 }) as never)
      .mockResolvedValueOnce(makeSnapshot({ dosesPerAmpoule: 4, previousDoseApplications: 1 }) as never);

    const result = await loadAmpouleSettings('user-1', {
      dosesPerAmpoule: 4,
      previousDoseApplications: 1,
    });

    expect(result).toEqual({
      dosesPerAmpoule: 6,
      previousDoseApplications: 2,
      activeAmpouleOpenedOn: null,
      activeAmpouleStartDoseApplications: null,
      activeAmpouleRecordId: null,
      completedAmpoulesCount: 0,
    });
    expect(setDocMock).toHaveBeenCalledTimes(1);
    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1' }),
      {
        dosesPerAmpoule: deleteFieldToken,
        previousDoseApplications: deleteFieldToken,
      },
      { merge: true },
    );
  });

  it('migrates legacy root fields into ampoules/settings when the subcollection is missing', async () => {
    getDocMock
      .mockResolvedValueOnce(makeSnapshot(undefined) as never)
      .mockResolvedValueOnce(makeSnapshot({ dosesPerAmpoule: 8, previousDoseApplications: 5 }) as never);

    const result = await loadAmpouleSettings('user-2', {
      dosesPerAmpoule: 8,
      previousDoseApplications: 5,
    });

    expect(result).toEqual({
      dosesPerAmpoule: 8,
      previousDoseApplications: 5,
      activeAmpouleOpenedOn: null,
      activeAmpouleStartDoseApplications: null,
      activeAmpouleRecordId: null,
      completedAmpoulesCount: 0,
    });
    expect(setDocMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ path: 'users/user-2/ampoules/settings' }),
      {
        dosesPerAmpoule: 8,
        previousDoseApplications: 5,
        activeAmpouleOpenedOn: null,
        activeAmpouleStartDoseApplications: null,
        activeAmpouleRecordId: null,
        completedAmpoulesCount: 0,
        migratedFromLegacyUserDoc: true,
        updatedAt: expect.any(Date),
      },
      { merge: true },
    );
    expect(setDocMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: 'users/user-2' }),
      {
        dosesPerAmpoule: deleteFieldToken,
        previousDoseApplications: deleteFieldToken,
      },
      { merge: true },
    );
  });

  it('loads legacy root settings through the user fallback helper and migrates them', async () => {
    getDocMock
      .mockResolvedValueOnce(makeSnapshot({ dosesPerAmpoule: 7, previousDoseApplications: 3 }) as never)
      .mockResolvedValueOnce(makeSnapshot(undefined) as never)
      .mockResolvedValueOnce(makeSnapshot({ dosesPerAmpoule: 7, previousDoseApplications: 3 }) as never);

    const result = await loadAmpouleSettingsWithUserFallback('user-3');

    expect(result).toEqual({
      dosesPerAmpoule: 7,
      previousDoseApplications: 3,
      activeAmpouleOpenedOn: null,
      activeAmpouleStartDoseApplications: null,
      activeAmpouleRecordId: null,
      completedAmpoulesCount: 0,
    });
  });

  it('creates an active history record when active ampoule settings are saved without a record id', async () => {
    getDocMock
      .mockResolvedValueOnce(makeSnapshot(undefined) as never)
      .mockResolvedValueOnce(makeSnapshot(undefined) as never)
      .mockResolvedValueOnce(makeSnapshot(undefined) as never);

    const result = await saveAmpouleSettings('user-4', {
      dosesPerAmpoule: 5,
      previousDoseApplications: 2,
      activeAmpouleOpenedOn: '2026-03-10',
      activeAmpouleStartDoseApplications: 6,
      activeAmpouleRecordId: null,
      completedAmpoulesCount: 1,
    });

    expect(result.dosesPerAmpoule).toBe(5);
    expect(result.previousDoseApplications).toBe(2);
    expect(result.activeAmpouleOpenedOn).toBe('2026-03-10');
    expect(result.activeAmpouleStartDoseApplications).toBe(6);
    expect(result.completedAmpoulesCount).toBe(1);
    expect(result.activeAmpouleRecordId).toMatch(/^ampoule_/);

    const historyWrite = setDocMock.mock.calls.find((call) =>
      String((call[0] as { path: string }).path).includes('/ampoules/ampoule_'),
    );

    expect(historyWrite).toBeDefined();
    expect(historyWrite?.[1]).toEqual(
      expect.objectContaining({
        kind: 'history',
        sequenceNumber: 2,
        status: 'active',
        openedOn: '2026-03-10',
        dosesPerAmpoule: 5,
        startTotalDoseApplications: 6,
      }),
    );
  });

  it('merges ampoule lifecycle fields without resetting the existing numeric settings', async () => {
    getDocMock
      .mockResolvedValueOnce(
        makeSnapshot({
          dosesPerAmpoule: 5,
          previousDoseApplications: 3,
          completedAmpoulesCount: 2,
          activeAmpouleRecordId: 'ampoule_existing',
        }) as never,
      )
      .mockResolvedValueOnce(makeSnapshot(undefined) as never);

    const result = await saveAmpouleSettings('user-5', {
      activeAmpouleOpenedOn: '2026-03-10',
      activeAmpouleStartDoseApplications: 7,
    });

    expect(result).toEqual({
      dosesPerAmpoule: 5,
      previousDoseApplications: 3,
      activeAmpouleOpenedOn: '2026-03-10',
      activeAmpouleStartDoseApplications: 7,
      activeAmpouleRecordId: 'ampoule_existing',
      completedAmpoulesCount: 2,
    });
  });

  it('closes the current ampoule history entry with total usage', async () => {
    await closeAmpouleHistoryEntry('user-6', 'ampoule_active', {
      closedOn: '2026-03-18',
      endTotalDoseApplications: 12,
      dosesUsed: 4,
    });

    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-6/ampoules/ampoule_active' }),
      {
        kind: 'history',
        status: 'closed',
        closedOn: '2026-03-18',
        endTotalDoseApplications: 12,
        dosesUsed: 4,
        updatedAt: expect.any(Date),
      },
      { merge: true },
    );
  });

  it('loads ampoule history entries and ignores the settings document', async () => {
    getDocsMock.mockResolvedValueOnce(
      makeQuerySnapshot([
        {
          id: 'settings',
          data: () => ({ dosesPerAmpoule: 4 }),
        },
        {
          id: 'ampoule_2',
          data: () => ({
            kind: 'history',
            sequenceNumber: 2,
            status: 'closed',
            openedOn: '2026-03-10',
            closedOn: '2026-03-17',
            dosesPerAmpoule: 4,
            startTotalDoseApplications: 4,
            endTotalDoseApplications: 8,
            dosesUsed: 4,
          }),
        },
        {
          id: 'ampoule_3',
          data: () => ({
            kind: 'history',
            sequenceNumber: 3,
            status: 'active',
            openedOn: '2026-03-18',
            closedOn: null,
            dosesPerAmpoule: 4,
            startTotalDoseApplications: 8,
            endTotalDoseApplications: null,
            dosesUsed: null,
          }),
        },
      ]) as never,
    );

    const result = await loadAmpouleHistory('user-7');

    expect(result).toEqual([
      {
        id: 'ampoule_3',
        sequenceNumber: 3,
        status: 'active',
        openedOn: '2026-03-18',
        closedOn: null,
        dosesPerAmpoule: 4,
        startTotalDoseApplications: 8,
        endTotalDoseApplications: null,
        dosesUsed: null,
      },
      {
        id: 'ampoule_2',
        sequenceNumber: 2,
        status: 'closed',
        openedOn: '2026-03-10',
        closedOn: '2026-03-17',
        dosesPerAmpoule: 4,
        startTotalDoseApplications: 4,
        endTotalDoseApplications: 8,
        dosesUsed: 4,
      },
    ]);
  });

  it('updates dates for a closed ampoule history entry', async () => {
    await updateAmpouleHistoryEntry('user-8', 'ampoule_closed', {
      openedOn: '2026-02-21',
      closedOn: '2026-03-14',
      status: 'closed',
    });

    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-8/ampoules/ampoule_closed' }),
      {
        kind: 'history',
        openedOn: '2026-02-21',
        closedOn: '2026-03-14',
        status: 'closed',
        updatedAt: expect.any(Date),
      },
      { merge: true },
    );
  });

  it('reopens a closed ampoule history entry by clearing closing fields', async () => {
    await updateAmpouleHistoryEntry('user-9', 'ampoule_last', {
      status: 'active',
      closedOn: null,
      endTotalDoseApplications: null,
      dosesUsed: null,
    });

    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-9/ampoules/ampoule_last' }),
      {
        kind: 'history',
        status: 'active',
        closedOn: null,
        endTotalDoseApplications: null,
        dosesUsed: null,
        updatedAt: expect.any(Date),
      },
      { merge: true },
    );
  });
});
