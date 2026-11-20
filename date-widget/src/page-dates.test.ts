import { getPageDates } from "./page-dates";

const WEB_URL = "https://staffbase.showcase.com";
const PAGE_ID = "6afc78e4000e7511c05ac171";

function mockFetch(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

afterEach(() => jest.restoreAllMocks());

describe("getPageDates", () => {
  it("should return createdAt and publishedAt from the Pages API (updatedAt ignored)", async () => {
    mockFetch(200, {
      id: PAGE_ID,
      createdAt: "2021-06-23T08:07:13.178Z",
      updatedAt: "2021-09-03T11:37:01.760Z",
      publishedAt: "2026-11-18T09:21:17Z",
    });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ createdAt: "2021-06-23T08:07:13.178Z", publishedAt: "2026-11-18T09:21:17Z" });
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should normalize a trailing slash in webUrl", async () => {
    mockFetch(200, { id: PAGE_ID, createdAt: "2021-06-23T08:07:13.178Z", publishedAt: "2026-11-18T09:21:17Z" });
    await getPageDates(`${WEB_URL}/`, PAGE_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should map a missing publishedAt to null (unpublished page)", async () => {
    mockFetch(200, { id: PAGE_ID, createdAt: "2021-06-23T08:07:13.178Z" });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ createdAt: "2021-06-23T08:07:13.178Z", publishedAt: null });
  });

  it("should map a malformed publishedAt to null (never « Invalid Date » downstream)", async () => {
    mockFetch(200, { id: PAGE_ID, createdAt: "2021-06-23T08:07:13.178Z", publishedAt: "pas-une-date" });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ createdAt: "2021-06-23T08:07:13.178Z", publishedAt: null });
  });

  it("should map a non-string publishedAt to null", async () => {
    mockFetch(200, { id: PAGE_ID, createdAt: "2021-06-23T08:07:13.178Z", publishedAt: 1234567890 });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ createdAt: "2021-06-23T08:07:13.178Z", publishedAt: null });
  });

  it("should map a missing or malformed createdAt to null", async () => {
    mockFetch(200, { id: PAGE_ID, publishedAt: "2026-11-18T09:21:17Z" });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ createdAt: null, publishedAt: "2026-11-18T09:21:17Z" });
    mockFetch(200, { id: PAGE_ID, createdAt: "pas-une-date", publishedAt: "2026-11-18T09:21:17Z" });
    const dates2 = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates2).toEqual({ createdAt: null, publishedAt: "2026-11-18T09:21:17Z" });
  });

  it("should reject on non-2xx with the HTTP status (401 and 404)", async () => {
    mockFetch(401, {});
    await expect(getPageDates(WEB_URL, PAGE_ID)).rejects.toThrow(/401/);
    mockFetch(404, {});
    await expect(getPageDates(WEB_URL, PAGE_ID)).rejects.toThrow(/404/);
  });
});
