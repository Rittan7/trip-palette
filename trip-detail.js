
/* ========================================
   Trip Palette - Trip Detail
======================================== */

// URLから旅行IDを取得
const params = new URLSearchParams(window.location.search);
const tripId = params.get("id");

// 保存済みの旅行一覧を取得
let trips = [];
try { const parsed = JSON.parse(localStorage.getItem("trips") || "[]"); if (Array.isArray(parsed)) trips = parsed; }
catch (error) { console.error("旅行一覧を読み込めません", error); }

// 選択した旅行を探す
const trip = trips.find(function(item) {
  return String(item.id) === String(tripId);
});

// この旅行専用の保存キー
const storageKey = "tripDetails_" + tripId;

// 詳細データの初期状態
function createEmptyDetails() {
  return {
    flights: [],
    reservations: [],
    places: [],
    notes: []
  };
}

// 保存済みデータを読み込む
let details = createEmptyDetails();

if (trip) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));

    if (saved && typeof saved === "object") {
      details = {
        flights: Array.isArray(saved.flights) ? saved.flights : [],
        reservations: Array.isArray(saved.reservations)
          ? saved.reservations
          : [],
        places: Array.isArray(saved.places) ? saved.places : [],
        notes: Array.isArray(saved.notes) ? saved.notes : []
      };
    }
  } catch (error) {
    console.error("旅行詳細データを読み込めませんでした", error);
  }
}

/* ========================================
   共通処理
======================================== */

// データを保存
function saveDetails() {
  localStorage.setItem(storageKey, JSON.stringify(details));
}

// 日付を表示用に整える
function formatDate(value) {
  if (!value) return "未設定";
  return value.replace("T", " ").replaceAll("-", ".");
}

// 出発までの日数を計算
function calculateDays(dateString) {
  const today = new Date();

  const [year, month, day] =
    dateString.split("-").map(Number);

  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const departureUTC = Date.UTC(year, month - 1, day);

  return Math.round(
    (departureUTC - todayUTC) / 86400000
  );
}

// 要素を作る
function createElement(tag, text, className) {
  const element = document.createElement(tag);

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  if (className) {
    element.className = className;
  }

  return element;
}

// 入力された日付が正しいか確認
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(value + "T00:00:00");

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

// 日時の形式を確認
function isValidDateTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) &&
    isValidDate(value.slice(0, 10));
}

// 一覧の空表示
function showEmptyMessage(container, message) {
  container.appendChild(
    createElement("p", message, "section-description")
  );
}

// 編集・削除ボタンを作る
function createActionButtons(item, editFunction, deleteFunction) {
  const actions = createElement("div", null, "detail-item-actions");

  const editBtn = createElement("button", "編集", "edit-btn");
  editBtn.type = "button";
  editBtn.addEventListener("click", function() {
    editFunction(item.id);
  });

  const deleteBtn = createElement("button", "削除", "delete-btn");
  deleteBtn.type = "button";
  deleteBtn.addEventListener("click", function() {
    deleteFunction(item.id);
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  return actions;
}

// IDで対象データを探す
function findItem(collection, id) {
  return collection.find(function(item) {
    return String(item.id) === String(id);
  });
}

// 削除する共通処理
function deleteItem(collectionName, id, label) {
  const confirmed = confirm(label + "を削除しますか？");

  if (!confirmed) return;

  details[collectionName] = details[collectionName].filter(
    function(item) {
      return String(item.id) !== String(id);
    }
  );

  saveDetails();
  displayAllDetails();
}

/* ========================================
   旅行の基本情報
======================================== */

function displayTripHeader() {
  const nameElement =
    document.getElementById("detail-trip-name");

  const destinationElement =
    document.getElementById("detail-trip-destination");

  const dateElement =
    document.getElementById("detail-trip-date");

  const countdownElement =
    document.getElementById("detail-countdown");

  if (!trip) {
    nameElement.textContent = "旅行が見つかりません";
    destinationElement.textContent = "";
    dateElement.textContent = "";
    countdownElement.textContent = "";

    document.getElementById("trip-not-found").hidden = false;
    document.getElementById("trip-detail-content").hidden = true;
    return;
  }

  nameElement.textContent = trip.name || "名称未設定";

  destinationElement.textContent =
    "📍 " + (trip.destination || "目的地未設定");

  dateElement.textContent =
    "📅 " +
    formatDate(trip.departureDate) +
    " ～ " +
    formatDate(trip.returnDate);

  if (!trip.departureDate) {
    countdownElement.textContent = "";
    return;
  }

  const days = calculateDays(trip.departureDate);

  if (days > 0) {
    countdownElement.textContent =
      "出発まであと " + days + " 日";
  } else if (days === 0) {
    countdownElement.textContent = "今日出発！✈️";
  } else if (
    trip.returnDate &&
    calculateDays(trip.returnDate) >= 0
  ) {
    countdownElement.textContent = "旅行中 🌍";
  } else {
    countdownElement.textContent = "旅行終了";
  }
}

/* ========================================
   フライト情報
======================================== */


// 復路の新規入力時のみ、登録済み往路の出発地と到着地を入れ替えて提案する。
// 編集中のフライトの値や手動入力した値は上書きしない。
function suggestReturnFlightRoute() {
  if (editingFlightId !== null) return;
  if (document.getElementById("flight-type").value !== "return") return;
  const outbound = details.flights.find(f => f.type !== "return");
  if (!outbound) return;
  document.getElementById("flight-from").value = outbound.to || "";
  document.getElementById("flight-to").value = outbound.from || "";
}

function setDefaultFlightDate() {
  const flightType = document.getElementById("flight-type");
  const flightDate = document.getElementById("flight-date");

  if (!flightType || !flightDate) return;

  // 保存済みの旅行一覧から、現在の旅行を取得
  // 起動時に検証済みの旅行一覧を再利用する。保存データが壊れていても停止しない。
  const currentTrip = trips.find(function(item) {
    return String(item.id) === String(tripId);
  });

  if (!currentTrip) {
    console.warn("旅行データが見つかりません");
    return;
  }

  // 往路・復路に応じて日付を設定
  const selectedDate =
    flightType.value === "return"
      ? currentTrip.returnDate
      : currentTrip.departureDate;

  flightDate.value = selectedDate
    ? String(selectedDate).slice(0, 10)
    : "";
}

// ページのHTMLが読み込まれてから実行
document.addEventListener("DOMContentLoaded", function() {
  const flightType = document.getElementById("flight-type");

  if (!flightType) return;

  setDefaultFlightDate();

  flightType.addEventListener("change", function() {
    setDefaultFlightDate();
    suggestReturnFlightRoute();
  });
});


let editingFlightId = null;

function updateFlightControls() {
  const types = new Set(details.flights.map(f => f.type === "return" ? "return" : "outbound"));
  const form = document.getElementById("flight-form");
  const add = document.getElementById("flight-add-btn");
  document.getElementById("flight-delete-btn").hidden = editingFlightId === null;
  if (editingFlightId !== null) {
    form.hidden = false;
    add.hidden = true;
  } else {
    form.hidden = true;
    add.hidden = types.has("outbound") && types.has("return");
    if (!add.hidden) add.textContent = types.size ? "＋ 未登録のフライトを追加" : "＋ フライトを追加";
  }
}

document.getElementById("flight-add-btn").addEventListener("click", function() {
  const types = new Set(details.flights.map(f => f.type === "return" ? "return" : "outbound"));
  const type = types.has("outbound") ? "return" : "outbound";
  const form = document.getElementById("flight-form");
  form.reset();
  form.hidden = false;
  document.getElementById("flight-type").value = type;
  setDefaultFlightDate();
  suggestReturnFlightRoute();
  document.getElementById("flight-add-btn").hidden = true;
  form.scrollIntoView({behavior:"smooth",block:"start"});
});

function displayFlights() {
  updateFlightControls();
  const list = document.getElementById("flight-list");
  list.replaceChildren();
  if (!details.flights.length) {
    showEmptyMessage(list, "フライトはまだ登録されていません。");
    return;
  }

  const ticket = createElement("div", null, "flight-ticket roundtrip-ticket");
  const title = createElement("div", null, "roundtrip-title");
  title.appendChild(createElement("strong", "✈️ BOARDING PASS"));
  title.appendChild(createElement("span", "TRAVEL FLIGHTS", "roundtrip-label"));
  ticket.appendChild(title);

  const sorted = [...details.flights].sort((a, b) =>
    (a.type === "return" ? 1 : 0) - (b.type === "return" ? 1 : 0)
  );
  sorted.forEach(function(flight) {
    const leg = createElement("div", null, "flight-leg");
    const top = createElement("div", null, "flight-leg-top");
    top.appendChild(createElement("strong", flight.type === "return" ? "🛬 復路" : "🛫 往路"));
    top.appendChild(createElement("span", formatDate(flight.date), "flight-leg-date"));
    leg.appendChild(top);

    const route = createElement("div", null, "flight-route");
    route.appendChild(createElement("span", flight.from || "---", "airport-code"));
    route.appendChild(createElement("span", "✈", "flight-plane"));
    route.appendChild(createElement("span", flight.to || "---", "airport-code"));
    leg.appendChild(route);

    const footer = createElement("div", null, "flight-leg-footer");
    footer.appendChild(createElement("span", (flight.airline || "") + " · " + (flight.number || "")));
    const edit = createElement("button", "編集", "edit-btn");
    edit.type = "button";
    edit.addEventListener("click", () => editFlight(flight.id));
    footer.appendChild(edit);
    leg.appendChild(footer);
    ticket.appendChild(leg);
  });
  list.appendChild(ticket);
}

// フライトを追加
document.getElementById("flight-form")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const flightType =
      document.getElementById("flight-type").value;
    const airline =
      document.getElementById("flight-airline").value.trim();

    const number =
      document.getElementById("flight-number").value.trim();

    const from =
      document.getElementById("flight-from").value.trim();

    const to =
      document.getElementById("flight-to").value.trim();

    const departureDate =
      document.getElementById("flight-date").value;

    const departureTime =
      document.getElementById("flight-time").value;

    // 日付と時刻を結合して従来の形式で保存
     const date = departureDate + "T" + departureTime;

    if (!airline || !number || !from || !to || !isValidDateTime(date)) {
      alert("フライト情報を正しく入力してください");
      return;
    }

    if (details.flights.some(f => f.type === flightType && String(f.id) !== String(editingFlightId))) {
      alert("同じ種類のフライトはすでに登録されています。既存の便を編集してください。");
      return;
    }
    if (editingFlightId === null) {
      details.flights.push({
        id: crypto.randomUUID(), type: flightType, airline, number, from, to, date
      });
    } else {
      const flight = findItem(details.flights, editingFlightId);
      if (!flight) { alert("編集対象のフライトが見つかりません"); return; }
      Object.assign(flight, {type: flightType, airline, number, from, to, date});
    }
    saveDetails();
    editingFlightId = null;
    displayFlights();
    event.target.reset();
    document.getElementById("flight-submit-btn").textContent = "＋ フライトを追加";
    document.getElementById("flight-cancel-btn").hidden = true;
    setDefaultFlightDate();
    updateFlightControls();
  });

// フライトを編集
function editFlight(id) {
  const flight = findItem(details.flights, id);
  if (!flight) return;
  editingFlightId = flight.id;
  updateFlightControls();
  document.getElementById("flight-type").value = flight.type === "return" ? "return" : "outbound";
  for (const field of ["airline", "number", "from", "to"]) {
    document.getElementById("flight-" + field).value = flight[field] || "";
  }
  const [date, time] = (flight.date || "").split("T");
  document.getElementById("flight-date").value = date || "";
  document.getElementById("flight-time").value = time ? time.slice(0,5) : "";
  document.getElementById("flight-submit-btn").textContent = "変更を保存";
  document.getElementById("flight-cancel-btn").hidden = false;
  document.getElementById("flight-form").scrollIntoView({behavior:"smooth", block:"start"});
}

document.getElementById("flight-delete-btn").addEventListener("click", function() {
  if (editingFlightId === null) return;
  if (!confirm("このフライトを削除しますか？")) return;
  details.flights = details.flights.filter(f => String(f.id) !== String(editingFlightId));
  editingFlightId = null;
  saveDetails();
  document.getElementById("flight-form").reset();
  document.getElementById("flight-cancel-btn").hidden = true;
  document.getElementById("flight-submit-btn").textContent = "＋ フライトを追加";
  setDefaultFlightDate();
  displayFlights();
});

document.getElementById("flight-cancel-btn").addEventListener("click", function() {
  editingFlightId = null;
  document.getElementById("flight-form").reset();
  document.getElementById("flight-submit-btn").textContent = "＋ フライトを追加";
  document.getElementById("flight-cancel-btn").hidden = true;
  setDefaultFlightDate();
  updateFlightControls();
});

/* ========================================
   予約情報
======================================== */

const reservationIcons = {
  "ホテル": "🏨",
  "ツアー": "🧳",
  "交通機関": "🚆",
  "レストラン": "🍽️",
  "その他": "📋"
};

const placeIcons = {
  "観光": "📍",
  "グルメ": "☕",
  "ショッピング": "🛍️",
  "自然": "🌿",
  "その他": "⭐"
};

function getCategoryIcon(category, icons, fallback) {
  return Object.prototype.hasOwnProperty.call(icons, category)
    ? icons[category]
    : fallback;
}

function displayReservations() {
  const list = document.getElementById("reservation-list");
  list.innerHTML = "";

  if (details.reservations.length === 0) {
    showEmptyMessage(list, "予約情報はまだありません。");
    return;
  }

  details.reservations.forEach(function(reservation) {
    const card = createElement("div", null, "detail-item");

    card.appendChild(

createElement(
  "h4",
  getCategoryIcon(reservation.type, reservationIcons, "📋") +
    " " + reservation.type + "｜" + reservation.name
)
    );

    card.appendChild(
      createElement(
        "p",
        "📅 " + formatDate(reservation.date) + (reservation.time ? "  🕒 " + reservation.time : "")
      )
    );

    if (reservation.note) {
      card.appendChild(
        createElement("p", reservation.note, "note-content")
      );
    }

    card.appendChild(
      createActionButtons(
        reservation,
        editReservation,
        function(id) {
          deleteItem("reservations", id, "予約情報");
        }
      )
    );

    list.appendChild(card);
  });
}

// 予約を追加
document.getElementById("reservation-form")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const type =
      document.getElementById("reservation-type").value;

    const name =
      document.getElementById("reservation-name").value.trim();

    const date =
      document.getElementById("reservation-date").value;

    const time =
      document.getElementById("reservation-time").value;

    const note =
      document.getElementById("reservation-note").value.trim();

    if (!type || !name || !isValidDate(date)) {
      alert("予約情報を正しく入力してください");
      return;
    }

    details.reservations.push({
      id: crypto.randomUUID(),
      type: type,
      name: name,
      date: date,
      time: time,
      note: note
    });

    saveDetails();
    closeScheduleEditors();
    displayReservations();
    displayPlannerTimeline();
    event.target.reset();
  });

// 予約を編集
function editReservation(id) {
  const reservation = findItem(details.reservations, id);
  if (!reservation) return;

  const type = prompt(
    "予約の種類（ホテル・ツアー・交通機関・レストラン・その他）",
    reservation.type
  );
  if (type === null) return;

  const name = prompt("予約名", reservation.name);
  if (name === null) return;

  const date = prompt(
    "予約日・利用日（YYYY-MM-DD）",
    reservation.date
  );
  if (date === null) return;

  const time = prompt(
    "利用予定時刻（HH:MM・未設定の場合は空欄）",
    reservation.time || ""
  );
  if (time === null) return;
  if (time.trim() && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) {
    alert("時刻は HH:MM 形式で入力してください（例：15:00）");
    return;
  }

  const note = prompt(
    "予約番号・メモ",
    reservation.note || ""
  );
  if (note === null) return;

  if (!type.trim() || !name.trim() || !isValidDate(date)) {
    alert("入力内容を確認してください");
    return;
  }

  reservation.type = type.trim();
  reservation.name = name.trim();
  reservation.date = date;
  reservation.time = time.trim();
  reservation.note = note.trim();

  saveDetails();
  displayReservations();
  displayPlannerTimeline();
}

/* ========================================
   行きたい場所
======================================== */

function displayPlaces() {
  const list = document.getElementById("place-list");
  list.innerHTML = "";

  if (details.places.length === 0) {
    showEmptyMessage(list, "行きたい場所はまだありません。");
    return;
  }

  details.places.forEach(function(place) {
    const card = createElement("div", null, "detail-item");

    card.appendChild(

createElement(
  "h4",
  getCategoryIcon(place.category, placeIcons, "📍") + " " + place.name
)
    );

    card.appendChild(

createElement(
  "p",
  "カテゴリー：" +
    getCategoryIcon(place.category, placeIcons, "📍") +
    " " + place.category
)
    );

    if (place.visitDate) {
      card.appendChild(createElement("p", "🗓️ " + formatDate(place.visitDate) + (place.visitTime ? " " + place.visitTime : "")));
    } else {
      card.appendChild(createElement("p", "🗓️ 日程未定"));
    }
    if (place.visited) card.appendChild(createElement("p", "✓ 訪問済み"));
    if (place.note) {
      card.appendChild(
        createElement("p", place.note, "note-content")
      );
    }

    card.appendChild(
      createActionButtons(
        place,
        editPlace,
        function(id) {
          deleteItem("places", id, "行きたい場所");
        }
      )
    );

    list.appendChild(card);
  });
}

// 場所を追加
document.getElementById("place-form")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const name =
      document.getElementById("place-name").value.trim();

    const category =
      document.getElementById("place-category").value;

    const note = document.getElementById("place-note").value.trim();
    const visitDate = document.getElementById("place-date").value;
    const visitTime = document.getElementById("place-time").value;
    const visited = document.getElementById("place-visited").checked;
    if (visitDate && !isValidDate(visitDate)) { alert("訪問予定日を確認してください"); return; }
    if (visitTime && !visitDate) { alert("時刻を指定する場合は日付も選んでください"); return; }

    if (!name) {
      alert("場所の名前を入力してください");
      return;
    }

    details.places.push({
      id: crypto.randomUUID(),
      name: name,
      category: category,
      note: note,
      visitDate: visitDate,
      visitTime: visitTime,
      visited: visited
    });

    saveDetails();
    closeScheduleEditors();
    displayPlaces();
    displayPlannerTimeline();
    event.target.reset();
  });

// 場所を編集
function editPlace(id) {
  const place = findItem(details.places, id);
  if (!place) return;
  const name = prompt("場所の名前", place.name);
  if (name === null) return;
  const category = prompt("カテゴリー（観光・グルメ・ショッピング・自然・その他）", place.category);
  if (category === null) return;
  const visitDate = prompt("訪問予定日（YYYY-MM-DD / 未定なら空欄）", place.visitDate || "");
  if (visitDate === null) return;
  const visitTime = prompt("訪問予定時刻（HH:MM / 未定なら空欄）", place.visitTime || "");
  if (visitTime === null) return;
  const visited = confirm("実際に訪れた場所として記録しますか？\nOK：訪問済み / キャンセル：未訪問");
  const note = prompt("メモ", place.note || "");
  if (note === null) return;
  if (!name.trim() || !category.trim() || (visitDate && !isValidDate(visitDate)) ||
      (visitTime && (!visitDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(visitTime)))) {
    alert("入力内容を確認してください"); return;
  }
  Object.assign(place, {name:name.trim(), category:category.trim(), visitDate, visitTime, visited, note:note.trim()});
  saveDetails(); displayAllDetails();
}

/* ========================================
   旅行メモ・思い出
======================================== */

function displayNotes() {
  const list = document.getElementById("note-list");
  list.innerHTML = "";

  if (details.notes.length === 0) {
    showEmptyMessage(list, "メモはまだ登録されていません。");
    return;
  }

  details.notes.forEach(function(note) {
    const card = createElement("div", null, "detail-item");

    card.appendChild(
      createElement("h4", "📝 " + note.title)
    );

    card.appendChild(
      createElement("p", note.content, "note-content")
    );

    card.appendChild(
      createActionButtons(
        note,
        editNote,
        function(id) {
          deleteItem("notes", id, "メモ");
        }
      )
    );

    list.appendChild(card);
  });
}

// メモを追加
document.getElementById("note-form")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const title =
      document.getElementById("note-title").value.trim();

    const content =
      document.getElementById("note-content").value.trim();

    if (!title || !content) {
      alert("タイトルと内容を入力してください");
      return;
    }

    details.notes.push({
      id: crypto.randomUUID(),
      title: title,
      content: content
    });

    saveDetails();
    displayNotes();
    event.target.reset();
  });

// メモを編集
function editNote(id) {
  const note = findItem(details.notes, id);
  if (!note) return;

  const title = prompt("タイトル", note.title);
  if (title === null) return;

  const content = prompt("内容", note.content);
  if (content === null) return;

  if (!title.trim() || !content.trim()) {
    alert("タイトルと内容を入力してください");
    return;
  }

  note.title = title.trim();
  note.content = content.trim();

  saveDetails();
  displayNotes();
}

/* ========================================
   画面を更新
======================================== */

function displayAllDetails() {
  displayFlights();
  displayReservations();
  displayPlaces();
  displayNotes();
  displayPlannerTimeline();
  displayJournalSummary();
}

/* ========================================
   Trip Planner / Trip Journal
======================================== */
const journalStorageKey = "tripJournal_" + tripId;
let journalData = {highlight:"", entries:[]};
try {
  const savedJournal = JSON.parse(localStorage.getItem(journalStorageKey));
  if (savedJournal && typeof savedJournal === "object") {
    journalData.highlight = typeof savedJournal.highlight === "string" ? savedJournal.highlight : "";
    journalData.entries = Array.isArray(savedJournal.entries) ? savedJournal.entries : [];
  }
} catch (error) { console.warn("日記の読み込みに失敗しました", error); }
function saveJournal() { localStorage.setItem(journalStorageKey, JSON.stringify(journalData)); }
function dateAtOffset(start, offset) {
  const [y,m,d] = start.split("-").map(Number);
  const dt = new Date(y,m-1,d+offset);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}
function dateRange() {
  if (!trip || !isValidDate(trip.departureDate) || !isValidDate(trip.returnDate)) return [];
  const start = new Date(trip.departureDate+"T00:00:00");
  const end = new Date(trip.returnDate+"T00:00:00");
  const count = Math.min(366, Math.round((end-start)/86400000)+1);
  if (count < 1) return [];
  return Array.from({length:count},(_,i)=>dateAtOffset(trip.departureDate,i));
}
function formatShortDate(date) { const [y,m,d]=date.split("-"); return `${Number(m)}/${Number(d)}`; }
function plannerPlaceCard(place) {
  const card = createElement("div", null, "timeline-card");
  const head = createElement("div", null, "timeline-card-head");
  head.appendChild(createElement("strong", (getCategoryIcon(place.category, placeIcons, "📍"))+" "+place.name));
  if (place.visited) head.appendChild(createElement("span", "✓ 訪問済み", "visited-tag"));
  card.appendChild(head);
  if (place.category) card.appendChild(createElement("p",place.category,"section-description"));
  if (place.note) card.appendChild(createElement("p",place.note,"note-content"));
  const actions=createActionButtons(place,editPlace,id=>deleteItem("places",id,"行きたい場所"));
  card.appendChild(actions);
  return card;
}
// 元のフォームを選んだDayの中へ移動して表示する。
// 保存後は元の位置に戻すため、既存フォームのIDと保存処理は変更しない。
const editorHomes = {};
for (const id of ["reservation-editor", "place-editor"]) {
  const editor = document.getElementById(id);
  const anchor = document.createComment(id + "-home");
  editor.parentNode.insertBefore(anchor, editor);
  editorHomes[id] = anchor;
}
function closeScheduleEditors() {
  for (const id of ["reservation-editor", "place-editor"]) {
    const editor = document.getElementById(id);
    editor.hidden = true;
    editorHomes[id].parentNode.insertBefore(editor, editorHomes[id].nextSibling);
  }
}
function openScheduleEditor(kind, date, target) {
  closeScheduleEditors();
  const editorId = kind === "reservation" ? "reservation-editor" : "place-editor";
  const editor = document.getElementById(editorId);
  const form = editor.querySelector("form");
  form.reset();
  const field = document.getElementById(kind === "reservation" ? "reservation-date" : "place-date");
  field.value = date || "";
  if (target) target.appendChild(editor);
  editor.hidden = false;
  const firstInput = kind === "reservation" ? "reservation-type" : "place-name";
  document.getElementById(firstInput).focus({preventScroll:true});
}
for (const btn of document.querySelectorAll("[data-close-editor]")) {
  btn.addEventListener("click", closeScheduleEditors);
}
document.getElementById("add-unscheduled-place").addEventListener("click", () => {
  const target = document.getElementById("unscheduled-inline-target");
  openScheduleEditor("place", "", target);
});

function plannerReservationCard(reservation) {
  const card=createElement("div",null,"timeline-card");
  const head=createElement("div",null,"timeline-card-head");
  head.appendChild(createElement("strong",getCategoryIcon(reservation.type,reservationIcons,"📋")+" "+reservation.name));
  card.appendChild(head);
  card.appendChild(createElement("p",reservation.type,"section-description"));
  if(reservation.note) card.appendChild(createElement("p",reservation.note,"note-content"));
  card.appendChild(createActionButtons(reservation,editReservation,id=>deleteItem("reservations",id,"予約情報")));
  return card;
}
function displayPlannerTimeline() {
  const container=document.getElementById("planner-timeline");
  closeScheduleEditors();
  container.replaceChildren();
  const days=dateRange();
  if (!days.length) { showEmptyMessage(container,"旅行期間を設定すると日別スケジュールが表示されます。"); return; }
  days.forEach((date,index)=>{
    const section=createElement("section",null,"timeline-day compact-day");
    const heading=createElement("div",null,"day-heading");
    const title=createElement("h4",`Day ${index+1}  ·  ${formatShortDate(date)}`);
    heading.appendChild(title);
    const menu=createElement("div",null,"day-add-menu");
    const add=createElement("button","＋ 追加","day-add-btn");
    add.type="button";
    add.setAttribute("aria-expanded","false");
    const options=createElement("div",null,"day-add-options");
    options.hidden=true;
    for(const [kind,label] of [["reservation","🏨 予約を追加"],["place","📍 行きたい場所を追加"]]) {
      const btn=createElement("button",label,"day-option-btn");
      btn.type="button";
      btn.addEventListener("click",()=>{ options.hidden=true;add.setAttribute("aria-expanded","false");openScheduleEditor(kind,date,section.querySelector(".day-inline-target")); });
      options.appendChild(btn);
    }
    add.addEventListener("click",()=>{options.hidden=!options.hidden;add.setAttribute("aria-expanded",String(!options.hidden));});
    menu.append(add,options);heading.appendChild(menu);section.appendChild(heading);
    section.appendChild(createElement("div", null, "day-inline-target"));
    const places=details.places.filter(p=>p.visitDate===date).map(p=>({kind:"place",item:p,time:p.visitTime||""}));
    const reservations=details.reservations.filter(r=>r.date===date).map(r=>({kind:"reservation",item:r,time:r.time||""}));
    const entries=[...places,...reservations].sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"));
    if(!entries.length) section.appendChild(createElement("p","まだ予定はありません。右の「＋ 追加」から登録できます。","section-description day-empty"));
    entries.forEach(entry=>{
      const row=createElement("div",null,"timeline-row");
      row.appendChild(createElement("span",entry.time||"時刻未定","timeline-time"));
      row.appendChild(entry.kind==="place"?plannerPlaceCard(entry.item):plannerReservationCard(entry.item));
      section.appendChild(row);
    });
    container.appendChild(section);
  });
  const unscheduled=details.places.filter(p=>!p.visitDate || !days.includes(p.visitDate));
  if (unscheduled.length) {
    const section=createElement("section",null,"timeline-day unscheduled");
    section.appendChild(createElement("h4","📌 日程未定・旅行期間外の場所"));
    unscheduled.forEach(p=>section.appendChild(plannerPlaceCard(p)));
    container.appendChild(section);
  }
}
function displayJournalSummary() {
  const stats=document.getElementById("journal-summary-stats");
  stats.replaceChildren();
  const days=dateRange();
  const visited=details.places.filter(p=>p.visited);
  const recordedDays=new Set(journalData.entries.map(e=>e.date)).size;
  [["旅行日数",days.length+"日"],["訪問スポット",visited.length+"か所"],["日記のある日",recordedDays+"日"]].forEach(([label,value])=>{
    const stat=createElement("div",null,"summary-stat");
    stat.appendChild(createElement("strong",value));
    stat.appendChild(createElement("span",label));
    stats.appendChild(stat);
  });
  document.getElementById("journal-places-summary").textContent=visited.length
    ? "訪れた場所："+visited.map(p=>p.name).join("、")
    : "訪れた場所は、Plannerの「訪問済み」から記録できます。";
  document.getElementById("journal-highlight").value=journalData.highlight;
}
let selectedJournalDate = (trip && isValidDate(trip.departureDate)) ? trip.departureDate : "";
let journalMonth = selectedJournalDate ? selectedJournalDate.slice(0,7) : "";
function showJournalMonth(month) {
  const calendar=document.getElementById("journal-calendar");
  calendar.replaceChildren();
  if (!month) return;
  const [y,m]=month.split("-").map(Number);
  document.getElementById("journal-month-label").textContent=`${y}年 ${m}月`;
  ["月","火","水","木","金","土","日"].forEach(d=>calendar.appendChild(createElement("span",d,"calendar-weekday")));
  const offset=(new Date(y,m-1,1).getDay()+6)%7;
  for (let i=0;i<offset;i++) calendar.appendChild(createElement("span","","calendar-blank"));
  const daysInMonth=new Date(y,m,0).getDate();
  const tripDays=new Set(dateRange());
  for (let d=1;d<=daysInMonth;d++) {
    const date=`${month}-${String(d).padStart(2,"0")}`;
    const button=createElement("button",String(d),"calendar-day");
    button.type="button";
    if (tripDays.has(date)) button.classList.add("in-trip");
    if (date===selectedJournalDate) button.classList.add("selected");
    if (journalData.entries.some(e=>e.date===date)) button.classList.add("has-entry");
    button.disabled=!tripDays.has(date);
    button.setAttribute("aria-label",date+"の思い出");
    button.addEventListener("click",()=>{selectedJournalDate=date; resetJournalEntryForm(); renderJournal();});
    calendar.appendChild(button);
  }
}
function resetJournalEntryForm() {
  document.getElementById("journal-entry-form").reset();
  document.getElementById("journal-edit-id").value="";
  document.getElementById("journal-save-btn").textContent="＋ 日記を追加";
  document.getElementById("journal-cancel-btn").hidden=true;
}
function renderJournal() {
  displayJournalSummary();
  showJournalMonth(journalMonth);
  const list=document.getElementById("journal-entry-list");
  list.replaceChildren();
  if (!selectedJournalDate) return;
  const days=dateRange();
  const dayNumber=days.indexOf(selectedJournalDate)+1;
  document.getElementById("journal-selected-date").textContent=`Day ${dayNumber} · ${formatDate(selectedJournalDate)}`;
  const entries=journalData.entries.filter(e=>e.date===selectedJournalDate);
  if (!entries.length) showEmptyMessage(list,"この日の思い出はまだありません。");
  entries.forEach(entry=>{
    const card=createElement("div",null,"detail-item");
    card.appendChild(createElement("h4","📖 "+entry.title));
    card.appendChild(createElement("p",entry.content,"note-content"));
    card.appendChild(createActionButtons(entry, id=>{
      const found=journalData.entries.find(e=>e.id===id);
      if (!found) return;
      document.getElementById("journal-edit-id").value=found.id;
      document.getElementById("journal-entry-title").value=found.title;
      document.getElementById("journal-entry-content").value=found.content;
      document.getElementById("journal-save-btn").textContent="変更を保存";
      document.getElementById("journal-cancel-btn").hidden=false;
      document.getElementById("journal-entry-form").scrollIntoView({behavior:"smooth",block:"start"});
    },id=>{
      if (!confirm("この日記を削除しますか？")) return;
      journalData.entries=journalData.entries.filter(e=>e.id!==id);
      saveJournal(); resetJournalEntryForm(); renderJournal();
    }));
    list.appendChild(card);
  });
}
function changeJournalMonth(delta) {
  if (!journalMonth) return;
  const [y,m]=journalMonth.split("-").map(Number);
  const dt=new Date(y,m-1+delta,1);
  journalMonth=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
  showJournalMonth(journalMonth);
}
function switchMode(mode) {
  const journal=mode==="journal";
  document.getElementById("planner-view").hidden=journal;
  document.getElementById("journal-view").hidden=!journal;
  for (const [id,active] of [["mode-planner",!journal],["mode-journal",journal]]) {
    const btn=document.getElementById(id);
    btn.classList.toggle("is-active",active);
    btn.setAttribute("aria-pressed",String(active));
  }
  if (journal) renderJournal(); else displayPlannerTimeline();
}
document.getElementById("mode-planner").addEventListener("click",()=>switchMode("planner"));
document.getElementById("mode-journal").addEventListener("click",()=>switchMode("journal"));
document.getElementById("journal-prev-month").addEventListener("click",()=>changeJournalMonth(-1));
document.getElementById("journal-next-month").addEventListener("click",()=>changeJournalMonth(1));
document.getElementById("journal-summary-form").addEventListener("submit",event=>{
  event.preventDefault(); journalData.highlight=document.getElementById("journal-highlight").value.trim();
  saveJournal(); alert("旅行サマリーを保存しました");
});
document.getElementById("journal-entry-form").addEventListener("submit",event=>{
  event.preventDefault();
  if (!dateRange().includes(selectedJournalDate)) {alert("旅行期間中の日付を選んでください"); return;}
  const title=document.getElementById("journal-entry-title").value.trim();
  const content=document.getElementById("journal-entry-content").value.trim();
  if (!title||!content) return;
  const editId=document.getElementById("journal-edit-id").value;
  if (editId) {
    const entry=journalData.entries.find(e=>e.id===editId);
    if (!entry) {alert("日記が見つかりません"); return;}
    Object.assign(entry,{title,content});
  } else {
    journalData.entries.push({id:crypto.randomUUID(),date:selectedJournalDate,title,content});
  }
  saveJournal(); resetJournalEntryForm(); renderJournal();
});
document.getElementById("journal-cancel-btn").addEventListener("click",resetJournalEntryForm);

/* ========================================
   初期表示
======================================== */

displayTripHeader();

if (trip) {
  displayAllDetails();
  switchMode(new URLSearchParams(window.location.search).get("view") === "journal" ? "journal" : "planner");
}
