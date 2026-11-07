import { escapeHTML as esc, safeURL } from "./shared.js";
const $ = (s) => document.querySelector(s),
  KEY = "little-orbit:catalog:v1";
const builtin = {
  id: "diary",
  name: "나만의 일기장",
  description:
    "오늘의 작은 순간과 마음을 차곡차곡. 나를 알아가는 가장 다정한 기록.",
  category: "일상 기록",
  url: "apps/diary/",
};
let state = { apps: [], favorites: [] },
  favoriteOnly = false,
  editing = null,
  timer;
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && Array.isArray(saved.apps) && Array.isArray(saved.favorites)) {
    state.apps = saved.apps
      .filter(
        (a) =>
          typeof a.id === "string" &&
          a.id !== "diary" &&
          typeof a.name === "string" &&
          a.name.length <= 40 &&
          typeof a.description === "string" &&
          a.description.length <= 160 &&
          ["생산성", "수업 도구", "일상 기록", "기타"].includes(a.category),
      )
      .filter((a) => {
        try {
          return !!safeURL(a.url);
        } catch {
          return false;
        }
      })
      .slice(0, 100);
    state.favorites = saved.favorites.filter((x) => typeof x === "string");
  }
} catch {
  toast("저장된 앱 목록을 읽지 못했어요. 브라우저 저장 설정을 확인해 주세요.");
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("visible");
  clearTimeout(timer);
  timer = setTimeout(() => $("#toast").classList.remove("visible"), 3000);
}
function commit(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
  state = next;
  render();
}
function render() {
  const all = [builtin, ...state.apps],
    q = $("#search").value.trim().toLowerCase(),
    category = $("#category").value;
  const list = all.filter(
    (a) =>
      (!favoriteOnly || state.favorites.includes(a.id)) &&
      (!category || a.category === category) &&
      (!q || (a.name + " " + a.description).toLowerCase().includes(q)),
  );
  $("#app-count").innerHTML = all.length + " <small>개</small>";
  $("#nav-count").textContent = all.length;
  $("#fav-count").innerHTML =
    all.filter((a) => state.favorites.includes(a.id)).length +
    " <small>개</small>";
  $("#result-count").textContent = list.length;
  $("#apps").innerHTML =
    list
      .map(
        (a) =>
          `<article class="app-card ${a.id === "diary" ? "featured" : ""}"><div class="card-top"><span class="app-icon">${a.id === "diary" ? "▤" : "◈"}</span><button class="icon-button ${state.favorites.includes(a.id) ? "is-favorite" : ""}" data-fav="${esc(a.id)}" aria-label="${esc(a.name)} 즐겨찾기" aria-pressed="${state.favorites.includes(a.id)}">${state.favorites.includes(a.id) ? "★" : "☆"}</button></div><h3>${esc(a.name)}</h3><p>${esc(a.description)}</p><div class="card-bottom"><span class="chip">${esc(a.category)}</span><div class="card-tools">${a.id === "diary" ? "" : `<button data-edit="${esc(a.id)}">수정</button><button data-delete="${esc(a.id)}">삭제</button>`}</div><a class="launch" href="${esc(a.url)}" ${a.id === "diary" ? "" : 'target="_blank" rel="noopener noreferrer"'}>앱 열기 ↗</a></div></article>`,
      )
      .join("") +
    (!list.length
      ? '<p class="empty">조건에 맞는 앱이 없어요. 검색어나 분류를 바꿔보세요.</p>'
      : "") +
    '<button class="add-card" id="add-card"><span class="plus">＋</span><strong>다음 아이디어를 기다리는 자리</strong><small>새로운 앱을 궤도에 올려보세요</small></button>';
  $("#add-card").onclick = () => open();
  document.querySelectorAll("[data-fav]").forEach(
    (b) =>
      (b.onclick = () => {
        try {
          const id = b.dataset.fav;
          commit({
            ...state,
            favorites: state.favorites.includes(id)
              ? state.favorites.filter((x) => x !== id)
              : [...state.favorites, id],
          });
        } catch {
          toast("저장 공간에 접근할 수 없어요.");
        }
      }),
  );
  document
    .querySelectorAll("[data-edit]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          open(state.apps.find((a) => a.id === b.dataset.edit))),
    );
  document.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        if (
          !confirm(
            "허브에서 이 앱 링크를 삭제할까요? 앱 자체의 데이터는 유지돼요.",
          )
        )
          return;
        try {
          commit({
            apps: state.apps.filter((a) => a.id !== b.dataset.delete),
            favorites: state.favorites.filter((x) => x !== b.dataset.delete),
          });
        } catch {
          toast("저장하지 못했어요.");
        }
      }),
  );
}
function open(app) {
  editing = app?.id || null;
  $("#app-form").reset();
  $("#form-heading").textContent = app ? "앱 정보 수정" : "새로운 앱 담기";
  $("#name").value = app?.name || "";
  $("#description").value = app?.description || "";
  $("#url").value = app?.url || "";
  $("#app-category").value = app?.category || "생산성";
  $("#form-error").textContent = "";
  $("#app-dialog").showModal();
}
$("#app-form").onsubmit = (e) => {
  e.preventDefault();
  try {
    if (state.apps.length >= 100 && !editing)
      throw Error("앱은 최대 100개까지 등록할 수 있어요.");
    const app = {
      id: editing || crypto.randomUUID(),
      name: $("#name").value.trim(),
      description: $("#description").value.trim(),
      url: safeURL($("#url").value),
      category: $("#app-category").value,
    };
    if (!app.name || !app.description)
      throw Error("앱 이름과 소개를 입력해 주세요.");
    commit({
      ...state,
      apps: editing
        ? state.apps.map((a) => (a.id === editing ? app : a))
        : [...state.apps, app],
    });
    $("#app-dialog").close();
    toast("앱을 저장했어요.");
  } catch (err) {
    $("#form-error").textContent = err.message;
  }
};
["#add-app", "#add-another"].forEach((s) => ($(s).onclick = () => open()));
["#close", "#cancel"].forEach(
  (s) => ($(s).onclick = () => $("#app-dialog").close()),
);
$("#search").oninput = render;
$("#category").onchange = render;
$("#all-apps").onclick = () => {
  favoriteOnly = false;
  $("#all-apps").classList.add("selected");
  $("#favorite-apps").classList.remove("selected");
  render();
};
$("#favorite-apps").onclick = () => {
  favoriteOnly = true;
  $("#favorite-apps").classList.add("selected");
  $("#all-apps").classList.remove("selected");
  render();
};
render();
