import { deleteField, doc, getDoc, setDoc } from "firebase/firestore";
import {
  loadAmpouleSettings,
  loadAmpouleSettingsWithUserFallback,
  saveAmpouleSettings,
} from "@/modules/dashboard/ampoule-settings";

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  deleteField: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

type SnapshotData = Record<string, unknown> | undefined;

const docMock = jest.mocked(doc);
const getDocMock = jest.mocked(getDoc);
const setDocMock = jest.mocked(setDoc);
const deleteFieldMock = jest.mocked(deleteField);
const deleteFieldToken = { __delete: true };

function makeSnapshot(data?: SnapshotData) {
  return {
    exists: () => data !== undefined,
    data: () => data,
  };
}

describe("ampoule-settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deleteFieldMock.mockReturnValue(deleteFieldToken as never);
    docMock.mockImplementation((parent: unknown, ...segments: string[]) => {
      const parentPath =
        typeof parent === "object" && parent !== null && "path" in (parent as Record<string, unknown>)
          ? String((parent as { path: string }).path)
          : "";

      return {
        path: parentPath ? `${parentPath}/${segments.join("/")}` : segments.join("/"),
      } as never;
    });
  });

  it("returns subcollection settings and clears legacy fields from the root user doc", async () => {
    getDocMock
      .mockResolvedValueOnce(makeSnapshot({ dosesPerAmpoule: 6, previousDoseApplications: 2 }) as never)
      .mockResolvedValueOnce(makeSnapshot({ dosesPerAmpoule: 4, previousDoseApplications: 1 }) as never);

    const result = await loadAmpouleSettings("user-1", {
      dosesPerAmpoule: 4,
      previousDoseApplications: 1,
    });

    expect(result).toEqual({
      dosesPerAmpoule: 6,
      previousDoseApplications: 2,
    });
    expect(setDocMock).toHaveBeenCalledTimes(1);
    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/user-1" }),
      {
        dosesPerAmpoule: deleteFieldToken,
        previousDoseApplications: deleteFieldToken,
      },
      { merge: true },
    );
  });

  it("migrates legacy root fields into ampoules/settings when the subcollection is missing", async () => {
    getDocMock
      .mockResolvedValueOnce(makeSnapshot(undefined) as never)
      .mockResolvedValueOnce(makeSnapshot({ dosesPerAmpoule: 8, previousDoseApplications: 5 }) as never);

    const result = await loadAmpouleSettings("user-2", {
      dosesPerAmpoule: 8,
      previousDoseApplications: 5,
    });

    expect(result).toEqual({
      dosesPerAmpoule: 8,
      previousDoseApplications: 5,
    });
    expect(setDocMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ path: "users/user-2/ampoules/settings" }),
      {
        dosesPerAmpoule: 8,
        previousDoseApplications: 5,
        migratedFromLegacyUserDoc: true,
        updatedAt: expect.any(Date),
      },
      { merge: true },
    );
    expect(setDocMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: "users/user-2" }),
      {
        dosesPerAmpoule: deleteFieldToken,
        previousDoseApplications: deleteFieldToken,
      },
      { merge: true },
    );
  });

  it("loads legacy root settings through the user fallback helper and migrates them", async () => {
    getDocMock
      .mockResolvedValueOnce(makeSnapshot({ dosesPerAmpoule: 7, previousDoseApplications: 3 }) as never)
      .mockResolvedValueOnce(makeSnapshot(undefined) as never)
      .mockResolvedValueOnce(makeSnapshot({ dosesPerAmpoule: 7, previousDoseApplications: 3 }) as never);

    const result = await loadAmpouleSettingsWithUserFallback("user-3");

    expect(result).toEqual({
      dosesPerAmpoule: 7,
      previousDoseApplications: 3,
    });
    expect(setDocMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ path: "users/user-3/ampoules/settings" }),
      {
        dosesPerAmpoule: 7,
        previousDoseApplications: 3,
        migratedFromLegacyUserDoc: true,
        updatedAt: expect.any(Date),
      },
      { merge: true },
    );
    expect(setDocMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: "users/user-3" }),
      {
        dosesPerAmpoule: deleteFieldToken,
        previousDoseApplications: deleteFieldToken,
      },
      { merge: true },
    );
  });

  it("saves ampoule settings into the subcollection and removes duplicated legacy fields", async () => {
    getDocMock.mockResolvedValueOnce(
      makeSnapshot({ dosesPerAmpoule: 6, previousDoseApplications: 2 }) as never,
    );

    const result = await saveAmpouleSettings("user-4", {
      dosesPerAmpoule: 9,
      previousDoseApplications: 6,
    });

    expect(result).toEqual({
      dosesPerAmpoule: 9,
      previousDoseApplications: 6,
    });
    expect(setDocMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ path: "users/user-4/ampoules/settings" }),
      {
        dosesPerAmpoule: 9,
        previousDoseApplications: 6,
        updatedAt: expect.any(Date),
      },
      { merge: true },
    );
    expect(setDocMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: "users/user-4" }),
      {
        dosesPerAmpoule: deleteFieldToken,
        previousDoseApplications: deleteFieldToken,
      },
      { merge: true },
    );
  });
});
