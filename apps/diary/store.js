import { validateEntry } from "../../assets/shared.js";
export const LOCAL_KEY = "little-orbit:diary:v1";
export function localStore(storage = localStorage) {
  function read() {
    const raw = storage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows))
      throw Error("저장된 일기 형식을 확인할 수 없어요.");
    return rows
      .map((row) => ({
        ...validateEntry(row),
        id: row.date,
        updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  return {
    kind: "local",
    async list() {
      return { entries: read(), hasMore: false };
    },
    async save(value, id) {
      const entry = validateEntry(value),
        rows = read();
      if (id && id !== entry.date)
        throw Error("기존 일기의 날짜는 변경할 수 없어요.");
      if (!id && rows.some((e) => e.date === entry.date))
        throw Error(
          "이 날짜의 일기가 이미 있어요. 기존 일기를 열어 수정해 주세요.",
        );
      if (id && !rows.some((e) => e.id === id))
        throw Error("일기를 찾을 수 없어요.");
      const saved = {
        ...entry,
        id: entry.date,
        updated_at: new Date().toISOString(),
      };
      storage.setItem(
        LOCAL_KEY,
        JSON.stringify(rows.filter((e) => e.id !== saved.id).concat(saved)),
      );
      return saved;
    },
    async remove(id) {
      storage.setItem(
        LOCAL_KEY,
        JSON.stringify(read().filter((e) => e.id !== id)),
      );
    },
  };
}
