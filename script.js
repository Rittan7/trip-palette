
/* ========================================
   Trip Palette - Main JavaScript
======================================== */

// HTMLの要素を取得
const tripForm = document.getElementById("trip-form");
const tripList = document.getElementById("trip-list");

// 保存済みの旅行データを読み込む
let trips = [];
let tripsLoadFailed = false;
try {
  const savedTrips = JSON.parse(localStorage.getItem("trips") || "[]");
  if (Array.isArray(savedTrips)) trips = savedTrips;
} catch (error) {
  tripsLoadFailed = true;
  console.error("旅行データを読み込めません。元の保存データは維持しています。", error);
}

// 訪問国のデータを読み込む
let visitedCountries = [];
try {
  const savedCountries = JSON.parse(localStorage.getItem("visitedCountries") || "[]");
  if (Array.isArray(savedCountries)) visitedCountries = savedCountries;
} catch (error) {
  console.error("訪問国データを読み込めません。元の保存データは維持しています。", error);
}

// 世界の国数（アプリ上の基準）
const TOTAL_COUNTRIES = 195;

/* ========================================
   共通処理
======================================== */

// 旅行データを保存
function saveTrips() {
  if (tripsLoadFailed) {
    alert("保存済みの旅行データを読み込めないため、上書きを中止しました。ブラウザのデータを消さずに確認してください。");
    return false;
  }
  try {
    localStorage.setItem("trips", JSON.stringify(trips));
    return true;
  } catch (error) {
    console.error("旅行データの保存に失敗しました", error);
    alert("保存できませんでした。ブラウザの空き容量や保存設定を確認してください。");
    return false;
  }
}

// 訪問国データを保存
function saveCountries() {
  localStorage.setItem(
    "visitedCountries",
    JSON.stringify(visitedCountries)
  );
}

// 日付を日本語表示にする
function formatDate(dateString) {
  if (!dateString) {
    return "未設定";
  }

  return dateString.replaceAll("-", ".");
}

// 出発日までの日数を計算
function calculateDays(departureDate) {
  const today = new Date();

  const [year, month, day] =
    departureDate.split("-").map(Number);

  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const departureUTC = Date.UTC(
    year,
    month - 1,
    day
  );

  return Math.round(
    (departureUTC - todayUTC) / 86400000
  );
}

// 旅行のステータスを判定
function getTripStatus(trip) {
  if (!trip.departureDate) {
    return "日程未設定";
  }

  const daysUntilDeparture =
    calculateDays(trip.departureDate);

  if (daysUntilDeparture > 0) {
    return "計画中";
  }

  if (trip.returnDate) {
    const daysUntilReturn =
      calculateDays(trip.returnDate);

    if (daysUntilReturn < 0) {
      return "旅行終了";
    }
  }

  return "旅行中";
}

/* ========================================
   Next Trip
======================================== */

function displayNextTrip() {
  const nameElement =
    document.getElementById("next-trip-name");

  const destinationElement =
    document.getElementById("next-trip-destination");

  const dateElement =
    document.getElementById("next-trip-date");

  const countdownElement =
    document.getElementById("countdown");

  // 今日以降に出発する旅行を抽出
  const upcomingTrips = trips
    .filter(function(trip) {
      return (
        trip.departureDate &&
        calculateDays(trip.departureDate) >= 0
      );
    })
    .sort(function(a, b) {
      return a.departureDate.localeCompare(
        b.departureDate
      );
    });

  // 次の旅行がない場合
  if (upcomingTrips.length === 0) {
    nameElement.textContent = "次の旅行は未登録です";
    destinationElement.textContent = "";
    dateElement.textContent = "";
    countdownElement.textContent = "";
    return;
  }

  const nextTrip = upcomingTrips[0];
  const days = calculateDays(nextTrip.departureDate);

  nameElement.textContent = nextTrip.name;

  destinationElement.textContent =
    "📍 " + (nextTrip.destination || "目的地未設定");

  dateElement.textContent =
    "📅 " +
    formatDate(nextTrip.departureDate) +
    " ～ " +
    formatDate(nextTrip.returnDate);

  if (days === 0) {
    countdownElement.textContent = "今日出発！✈️";
  } else {
    countdownElement.textContent =
      "出発まであと " + days + " 日";
  }
}

/* ========================================
   旅行一覧
======================================== */

function displayTrips() {
  tripList.innerHTML = "";

  // 旅行が登録されていない場合
  if (trips.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent =
      "まだ旅行が登録されていません。最初の旅行を追加しましょう！";

    tripList.appendChild(emptyMessage);
    displayNextTrip();
    return;
  }

  // 新しい旅行から表示
  const sortedTrips = [...trips].sort(function(a, b) {
    return (b.departureDate || "").localeCompare(
      a.departureDate || ""
    );
  });

  sortedTrips.forEach(function(trip) {
    const card = document.createElement("div");
    card.className = "trip-card";

    // 旅行名
    const title = document.createElement("h3");
    title.textContent = trip.name || "名称未設定";

    // 目的地
    const destination = document.createElement("p");
    destination.textContent =
      "📍 " + (trip.destination || "目的地未設定");

    // 日程
    const date = document.createElement("p");
    date.textContent =
      "📅 " +
      formatDate(trip.departureDate) +
      " ～ " +
      formatDate(trip.returnDate);

    // ステータス
    const status = document.createElement("span");
    status.className = "trip-status";
    status.textContent = getTripStatus(trip);

    // ボタンの入れ物
    const actions = document.createElement("div");
    actions.className = "trip-actions";

    // 詳細ページへのリンク
    const detailLink = document.createElement("a");
    detailLink.className = "trip-detail-link";
    detailLink.textContent = "詳細を見る";
    detailLink.href =
      "trip-detail.html?id=" + encodeURIComponent(trip.id);

    // 編集ボタン
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.type = "button";
    editBtn.textContent = "編集";

    editBtn.addEventListener("click", function() {
      editTrip(trip.id);
    });

    // 削除ボタン
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "削除";

    deleteBtn.addEventListener("click", function() {
      deleteTrip(trip.id);
    });

    actions.appendChild(detailLink);
    if (getTripStatus(trip) === "旅行終了") {
      const journalLink = document.createElement("a");
      journalLink.className = "trip-detail-link journal-link";
      journalLink.textContent = "📖 思い出を見る";
      journalLink.href = "trip-detail.html?id=" + encodeURIComponent(trip.id) + "&view=journal";
      actions.appendChild(journalLink);
    }
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(title);
    card.appendChild(destination);
    card.appendChild(date);
    card.appendChild(status);
    card.appendChild(actions);

    tripList.appendChild(card);
  });

  displayNextTrip();
}

/* ========================================
   旅行の新規登録
======================================== */

let editingTripId = null;
function resetTripForm() {
  editingTripId = null;
  tripForm.reset();
  document.getElementById("trip-submit-btn").textContent = "＋ 旅行を登録する";
  document.getElementById("trip-cancel-btn").hidden = true;
  document.getElementById("trip-form-title").textContent = "新しい旅行を登録";
}
document.getElementById("trip-cancel-btn").addEventListener("click", resetTripForm);
tripForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const tripName =
    document.getElementById("trip-name").value.trim();

  const destination =
    document.getElementById("trip-destination").value.trim();

  const departureDate =
    document.getElementById("trip-departure").value;

  const returnDate =
    document.getElementById("trip-return").value;

  // 入力チェック
  if (!tripName || !destination || !departureDate || !returnDate) {
    alert("すべての項目を入力してください");
    return;
  }

  // 日付入力の形式と実在する日付を確認する。
  const validDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day;
  };
  if (!validDate(departureDate) || !validDate(returnDate)) {
    alert("正しい日付を入力してください");
    return;
  }

  if (returnDate < departureDate) {
    alert("帰着日は出発日以降に設定してください");
    return;
  }

  // 既存の旅行IDを維持して更新する（詳細・日記との紐づけを守る）
  if (editingTripId !== null) {
    const existing = trips.find(item => String(item.id) === editingTripId);
    if (!existing) { alert("編集対象が見つかりません"); resetTripForm(); return; }
    Object.assign(existing, {name: tripName, destination, departureDate, returnDate});
    if (!saveTrips()) return;
    displayTrips();
    resetTripForm();
    return;
  }

  // 新しい旅行を作成
  const newTrip = {
    id: crypto.randomUUID(),
    name: tripName,
    destination: destination,
    departureDate: departureDate,
    returnDate: returnDate
  };

  trips.push(newTrip);
  if (!saveTrips()) { trips.pop(); return; }
  displayTrips();

  resetTripForm();

  alert("旅行を登録しました！✈️");
});

/* ========================================
   旅行の編集
======================================== */

function editTrip(id) {
  const trip = trips.find(function(item) {
    return String(item.id) === String(id);
  });

  if (!trip) {
    return;
  }

  // promptの連続表示ではなく、既存フォームで編集する
  editingTripId = String(id);
  document.getElementById("trip-name").value = trip.name || "";
  document.getElementById("trip-destination").value = trip.destination || "";
  document.getElementById("trip-departure").value = trip.departureDate || "";
  document.getElementById("trip-return").value = trip.returnDate || "";
  document.getElementById("trip-submit-btn").textContent = "変更を保存する";
  document.getElementById("trip-cancel-btn").hidden = false;
  document.getElementById("trip-form-title").textContent = "旅行情報を編集";
  tripForm.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("trip-name").focus({ preventScroll: true });
}

/* ========================================
   旅行の削除
======================================== */

function deleteTrip(id) {
  const confirmed = confirm(
    "この旅行を削除しますか？\n旅行詳細の記録も削除対象になります。"
  );

  if (!confirmed) {
    return;
  }

  const previousTrips = trips;
  trips = trips.filter(function(trip) {
    return String(trip.id) !== String(id);
  });

  if (!saveTrips()) { trips = previousTrips; return; }

  // この旅行に紐づく詳細データも削除
  localStorage.removeItem("tripDetails_" + id);
  localStorage.removeItem("tripJournal_" + id);

  if (editingTripId === String(id)) resetTripForm();
  displayTrips();
}

/* ========================================
   Home: My World Progress の概要
   保存データは読み取りのみ（書き換えない）
======================================== */
function displayWorldOverview() {
  const countries = Array.isArray(visitedCountries) ? visitedCountries : [];
  const aliases = new Map();
  for (const country of (typeof WORLD_COUNTRIES !== "undefined" ? WORLD_COUNTRIES : [])) {
    for (const name of [country.ja, country.en, ...country.aliases]) {
      aliases.set(String(name).normalize("NFKC").trim().toLowerCase(), country.code);
    }
  }
  const normalized = new Set(countries.map(value => {
    const key = String(value).normalize("NFKC").trim().toLowerCase();
    return aliases.get(key) || key;
  }).filter(Boolean));
  const count = normalized.size;
  const percentage = Math.min(count / TOTAL_COUNTRIES * 100, 100);
  document.getElementById("home-visited-count").textContent = count;
  document.getElementById("home-visited-percentage").textContent = percentage.toFixed(1) + "%";
  document.getElementById("home-progress-bar").style.width = percentage + "%";
  const milestones = [1,5,10,20,50,100,150,195];
  const achieved = milestones.filter(value => count >= value).pop();
  document.getElementById("home-latest-badge").textContent = achieved
    ? "🏅 最新の達成バッジ：" + achieved + "か国達成！"
    : "🏅 最初の訪問国を登録してみましょう";
}

/* 初期表示 */
displayTrips();
displayWorldOverview();

/* 目的地候補：無料・オフライン対応。候補以外も自由入力可能 */
const DESTINATION_CITIES = {
  "日本": "東京,横浜,大阪,京都,神戸,奈良,名古屋,札幌,函館,小樽,旭川,仙台,金沢,富山,長野,松本,軽井沢,新潟,高崎,宇都宮,日光,さいたま,千葉,鎌倉,箱根,熱海,静岡,浜松,岐阜,高山,白川郷,伊勢,鳥羽,滋賀,大津,和歌山,岡山,倉敷,広島,尾道,福山,山口,下関,松江,出雲,鳥取,高松,松山,徳島,高知,福岡,博多,北九州,長崎,佐世保,佐賀,熊本,阿蘇,大分,別府,由布院,宮崎,鹿児島,那覇,石垣,宮古島",
  "韓国": "ソウル,釜山,仁川,済州,大邱,慶州,江陵",
  "台湾": "台北,新北,台中,台南,高雄,九份,花蓮,嘉義",
  "中国": "北京,上海,広州,深圳,成都,重慶,杭州,蘇州,西安,南京,青島,厦門,桂林,昆明,武漢,天津,香港,マカオ",
  "タイ": "バンコク,チェンマイ,チェンライ,プーケット,パタヤ,クラビ,アユタヤ,サムイ島",
  "ベトナム": "ハノイ,ホーチミン,ダナン,ホイアン,フエ,ニャチャン,ダラット,ハロン",
  "シンガポール": "シンガポール",
  "マレーシア": "クアラルンプール,ペナン,ジョージタウン,マラッカ,コタキナバル,ランカウイ,ジョホールバル",
  "インドネシア": "ジャカルタ,バリ,デンパサール,ウブド,ジョグジャカルタ,スラバヤ,バンドン,ロンボク",
  "フィリピン": "マニラ,セブ,マクタン,ボラカイ,パラワン,エルニド,ダバオ,バギオ",
  "インド": "デリー,ニューデリー,ムンバイ,ジャイプール,アグラ,バラナシ,コルカタ,チェンナイ,ベンガルール,ハイデラバード,ゴア,コーチ",
  "ネパール": "カトマンズ,ポカラ",
  "スリランカ": "コロンボ,キャンディ,ゴール,エッラ",
  "カンボジア": "シェムリアップ,プノンペン",
  "ラオス": "ビエンチャン,ルアンパバーン",
  "モンゴル": "ウランバートル",
  "アラブ首長国連邦": "ドバイ,アブダビ,シャルジャ",
  "トルコ": "イスタンブール,アンカラ,カッパドキア,アンタルヤ,イズミル",
  "イスラエル": "テルアビブ,エルサレム",
  "ヨルダン": "アンマン,ペトラ",
  "カタール": "ドーハ",
  "サウジアラビア": "リヤド,ジッダ,メッカ",
  "カナダ": "バンクーバー,ビクトリア,ウィスラー,トロント,モントリオール,ケベックシティ,オタワ,カルガリー,バンフ,キャンモア,エドモントン,ジャスパー,ウィニペグ,ハリファックス,ナイアガラフォールズ,ケロウナ,リッチモンド,ギブソンズ,ボーエンアイランド",
  "アメリカ": "ニューヨーク,ロサンゼルス,サンフランシスコ,ラスベガス,シアトル,サンディエゴ,サンノゼ,サクラメント,ポートランド,ボストン,ワシントンD.C.,シカゴ,マイアミ,オーランド,タンパ,アトランタ,ニューオーリンズ,ヒューストン,ダラス,オースティン,デンバー,フェニックス,ソルトレイクシティ,フィラデルフィア,デトロイト,ナッシュビル,ホノルル,ヒロ,カイルア,アンカレッジ",
  "メキシコ": "メキシコシティ,カンクン,プラヤデルカルメン,トゥルム,グアダラハラ,モンテレイ,オアハカ,メリダ,ロスカボス",
  "ブラジル": "リオデジャネイロ,サンパウロ,ブラジリア,サルバドール,フォスドイグアス,マナウス",
  "アルゼンチン": "ブエノスアイレス,メンドーサ,バリローチェ,ウシュアイア,エルカラファテ",
  "ペルー": "リマ,クスコ,アレキパ,プーノ,マチュピチュ",
  "チリ": "サンティアゴ,バルパライソ,プンタアレナス,サンペドロデアタカマ",
  "コロンビア": "ボゴタ,メデジン,カルタヘナ,カリ",
  "エクアドル": "キト,グアヤキル,クエンカ",
  "ボリビア": "ラパス,ウユニ,スクレ",
  "コスタリカ": "サンホセ,ラフォルトゥナ",
  "キューバ": "ハバナ,トリニダー,バラデロ",
  "イギリス": "ロンドン,エディンバラ,グラスゴー,マンチェスター,リバプール,バーミンガム,オックスフォード,ケンブリッジ,バース,ブライトン,ヨーク,ブリストル,カーディフ,ベルファスト",
  "フランス": "パリ,リヨン,マルセイユ,ニース,カンヌ,ボルドー,トゥールーズ,ストラスブール,リール,アヴィニョン,モンペリエ,ナント,ディジョン,コルマール",
  "イタリア": "ローマ,ミラノ,フィレンツェ,ヴェネツィア,ナポリ,ボローニャ,トリノ,ヴェローナ,ピサ,シエナ,パレルモ,カターニア,バーリ,アマルフィ,ポジターノ,ソレント,コモ",
  "スペイン": "マドリード,バルセロナ,セビリア,グラナダ,バレンシア,マラガ,ビルバオ,サンセバスティアン,トレド,コルドバ,サラゴサ,パルマ",
  "ドイツ": "ベルリン,ミュンヘン,フランクフルト,ハンブルク,ケルン,デュッセルドルフ,ドレスデン,ライプツィヒ,ハイデルベルク,シュトゥットガルト,ニュルンベルク,ボン",
  "スイス": "チューリッヒ,ジュネーブ,ベルン,ルツェルン,インターラーケン,ツェルマット,ローザンヌ,バーゼル,グリンデルワルト",
  "オーストリア": "ウィーン,ザルツブルク,インスブルック,グラーツ,ハルシュタット",
  "オランダ": "アムステルダム,ロッテルダム,ハーグ,ユトレヒト,デルフト,ハーレム",
  "ベルギー": "ブリュッセル,ブルージュ,アントワープ,ゲント,リエージュ",
  "ポルトガル": "リスボン,ポルト,シントラ,ファロ,コインブラ,フンシャル",
  "アイルランド": "ダブリン,コーク,ゴールウェイ,キラーニー",
  "チェコ": "プラハ,ブルノ,チェスキークルムロフ,カルロヴィヴァリ",
  "ポーランド": "ワルシャワ,クラクフ,グダニスク,ヴロツワフ,ポズナン",
  "ハンガリー": "ブダペスト,デブレツェン",
  "ギリシャ": "アテネ,テッサロニキ,サントリーニ,ミコノス,イラクリオン,ハニア",
  "クロアチア": "ドゥブロヴニク,スプリト,ザグレブ,ザダル,プーラ",
  "スロベニア": "リュブリャナ,ブレッド",
  "スロバキア": "ブラチスラバ",
  "デンマーク": "コペンハーゲン,オーフス,オーデンセ",
  "スウェーデン": "ストックホルム,ヨーテボリ,マルメ,ウプサラ",
  "ノルウェー": "オスロ,ベルゲン,トロムソ,スタヴァンゲル,トロンハイム",
  "フィンランド": "ヘルシンキ,ロヴァニエミ,タンペレ,トゥルク",
  "アイスランド": "レイキャビク,アークレイリ,ヴィーク",
  "エストニア": "タリン",
  "ラトビア": "リガ",
  "リトアニア": "ビリニュス",
  "ルーマニア": "ブカレスト,ブラショフ,クルジュナポカ",
  "ブルガリア": "ソフィア,プロヴディフ",
  "セルビア": "ベオグラード,ノヴィサド",
  "マルタ": "バレッタ,スリーマ",
  "オーストラリア": "シドニー,メルボルン,ブリスベン,ゴールドコースト,ケアンズ,パース,アデレード,キャンベラ,ホバート,ダーウィン,バイロンベイ,アリススプリングス",
  "ニュージーランド": "オークランド,ウェリントン,クライストチャーチ,クイーンズタウン,ロトルア,タウランガ,ダニーデン,ワナカ,テカポ",
  "フィジー": "ナンディ,スバ",
  "フランス領ポリネシア": "パペーテ,ボラボラ",
  "エジプト": "カイロ,ギザ,ルクソール,アスワン,アレクサンドリア,シャルムエルシェイク",
  "モロッコ": "マラケシュ,カサブランカ,フェズ,ラバト,シャウエン,タンジェ,エッサウィラ",
  "南アフリカ": "ケープタウン,ヨハネスブルグ,プレトリア,ダーバン",
  "ケニア": "ナイロビ,モンバサ",
  "タンザニア": "ダルエスサラーム,アルーシャ,ザンジバル",
  "チュニジア": "チュニス,スース",
  "ウガンダ": "カンパラ",
  "エチオピア": "アディスアベバ"
};
const destinationSuggestions = document.getElementById("trip-destination-options");
if (destinationSuggestions) {
  const fragment = document.createDocumentFragment();
  for (const [country, names] of Object.entries(DESTINATION_CITIES)) {
    for (const city of names.split(",")) {
      const option = document.createElement("option");
      option.value = `${city}, ${country}`;
      fragment.appendChild(option);
    }
  }
  destinationSuggestions.appendChild(fragment);
}
