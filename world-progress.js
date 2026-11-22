/* My World Progress — 元データの文字列を保持して表示する */
const TOTAL_COUNTRIES = 195;
const STORAGE_KEY = "visitedCountries";
let visitedCountries = [];
try { visitedCountries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
catch (error) { console.error("訪問国データを読み込めません。保存データは変更していません。", error); }
if (!Array.isArray(visitedCountries)) visitedCountries = [];
const aliases = new Map();
function normalizeName(value) { return String(value).normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g," "); }
for (const country of WORLD_COUNTRIES) {
  for (const name of [country.ja,country.en,...country.aliases]) aliases.set(normalizeName(name),country);
}
function lookup(value) { return aliases.get(normalizeName(value)) || null; }
function countryKey(value) { const country=lookup(value); return country ? country.code : normalizeName(value); }
function uniqueCountries() {
  const seen=new Set();return visitedCountries.filter(name=>{const key=countryKey(name);if(!key||seen.has(key))return false;seen.add(key);return true;});
}
function saveCountries() { localStorage.setItem(STORAGE_KEY,JSON.stringify(visitedCountries)); }
function flagNode(country) {
  const box=document.createElement("span");box.className="flag-wrap";
  if (!country) {box.textContent="🌍";return box;}
  const img=document.createElement("img");img.alt=country.ja+"の国旗";img.loading="lazy";
  img.src="https://flagcdn.com/w40/"+country.iso2+".png";
  const fallback=document.createElement("span");fallback.className="flag-fallback";fallback.textContent=country.iso2.toUpperCase();fallback.hidden=true;
  img.addEventListener("error",()=>{img.hidden=true;fallback.hidden=false;});
  box.append(img,fallback);return box;
}
function renderSummary() {
  const count=uniqueCountries().length;
  const percentage=Math.min(count/TOTAL_COUNTRIES*100,100);
  document.getElementById("visited-count").textContent=count;
  document.getElementById("visited-percentage").textContent=percentage.toFixed(1)+"%";
  document.getElementById("progress-bar").style.width=percentage+"%";
  document.getElementById("passport-total").textContent=count+"か国";
}
function renderMilestones() {
  const count=uniqueCountries().length,box=document.getElementById("milestone-list");box.replaceChildren();
  for(const goal of [1,5,10,20,50,100,150,195]) {
    const unlocked=count>=goal,card=document.createElement("div");card.className="milestone "+(unlocked?"unlocked":"locked");
    const icon=document.createElement("span");icon.className="milestone-icon";icon.textContent=unlocked?"🏅":"🔒";
    const title=document.createElement("strong");title.textContent=goal+"か国";
    const caption=document.createElement("span");caption.textContent=unlocked?"達成！":"未達成";
    card.append(icon,title,caption);box.appendChild(card);
  }
}
function renderContinents() {
  const groups=["アジア","ヨーロッパ","北米","南米","アフリカ","オセアニア"];
  const box=document.getElementById("continent-list");box.replaceChildren();
  for(const group of groups) {
    const names=uniqueCountries().filter(name=>lookup(name)?.continent===group);
    const card=document.createElement("article");card.className="continent-card";
    const heading=document.createElement("div");heading.className="continent-heading";
    const title=document.createElement("strong");title.textContent=group;
    const number=document.createElement("span");number.textContent=names.length+"か国";
    heading.append(title,number);card.appendChild(heading);
    const desc=document.createElement("p");desc.textContent=names.length?names.map(n=>lookup(n)?.ja||n).join("・"):"まだ訪問記録がありません";
    card.appendChild(desc);box.appendChild(card);
  }
}
function renderPassport() {
  const box=document.getElementById("country-list");box.replaceChildren();
  const names=uniqueCountries();
  if(!names.length){const empty=document.createElement("p");empty.className="empty-message";empty.textContent="まだ訪問国がありません。上のフォームから追加しましょう。";box.appendChild(empty);return;}
  for(const name of names) {
    const country=lookup(name),card=document.createElement("article");card.className="passport-stamp";
    const flag=flagNode(country),info=document.createElement("div");info.className="passport-name";
    const title=document.createElement("strong");title.textContent=country?.ja||name;
    const sub=document.createElement("span");sub.textContent=country?.en||name;
    info.append(title,sub);
    const remove=document.createElement("button");remove.type="button";remove.className="stamp-delete";remove.textContent="削除";remove.setAttribute("aria-label",name+"を削除");
    remove.addEventListener("click",()=>deleteCountry(name));card.append(flag,info,remove);box.appendChild(card);
  }
}
function project(point) {const lon=point[0],lat=Math.max(-85,Math.min(85,point[1]));return [(lon+180)*1000/360,(90-lat)*510/180];}
function polygonPath(rings) {return rings.map(ring=>ring.map((p,i)=>{const xy=project(p);return (i?"L":"M")+xy[0].toFixed(1)+","+xy[1].toFixed(1);}).join(" ")+" Z").join(" ");}
function renderMap() {
  const svg=document.getElementById("world-map");svg.replaceChildren();
  const selected=new Set(uniqueCountries().map(countryKey));
  for(const feature of WORLD_SHAPES){
    const geometry=feature.geometry;
    if(!geometry)continue;
    const polys=geometry.type==="Polygon"?[geometry.coordinates]:geometry.type==="MultiPolygon"?geometry.coordinates:[];
    const path=document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d",polys.map(polygonPath).join(" "));
    path.setAttribute("class","map-country"+(selected.has(feature.code)?" visited":""));
    const country=WORLD_COUNTRIES.find(c=>c.code===feature.code);
    const label=country?.ja||feature.code;
    path.setAttribute("tabindex","0");path.setAttribute("role","button");path.setAttribute("aria-label",label+(selected.has(feature.code)?"、訪問済み":"、未訪問"));
    const show=()=>{document.getElementById("map-selected-country").textContent=label+(selected.has(feature.code)?" ✓ 訪問済み":" · 未訪問");};
    path.addEventListener("click",show);path.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();show();}});
    const title=document.createElementNS("http://www.w3.org/2000/svg","title");title.textContent=label;path.appendChild(title);svg.appendChild(path);
  }
}
function renderAll(){renderSummary();renderMilestones();renderContinents();renderPassport();renderMap();}
function deleteCountry(name) {
  if(!confirm(name+"を訪問国リストから削除しますか？"))return;
  const key=countryKey(name);
  visitedCountries=visitedCountries.filter(item=>countryKey(item)!==key);
  saveCountries();renderAll();
}
const options=document.getElementById("country-options");
for(const country of WORLD_COUNTRIES){for(const value of [country.ja,country.en]){const option=document.createElement("option");option.value=value;options.appendChild(option);}}
document.getElementById("country-form").addEventListener("submit",event=>{
  event.preventDefault();const input=document.getElementById("country-name"),name=input.value.trim();if(!name)return;
  const country=lookup(name);
  if(!country){alert("国名を確認してください。候補から日本語または英語の国名を選択してください。");return;}
  if(uniqueCountries().some(item=>countryKey(item)===country.code)){alert("この国はすでに登録されています");return;}
  if(uniqueCountries().length>=TOTAL_COUNTRIES){alert("登録できる国数の上限に達しています");return;}
  visitedCountries.push(name);saveCountries();input.value="";renderAll();
});
renderAll();
