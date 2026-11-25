// Pəncərənin məntiqi (sandbox daxilində işləyir). e-taxes sorğuları və yükləmə KOPRU ilə panel.js-dən keçir.
const ETAX = "https://new.e-taxes.gov.az";
const $ = (id) => document.getElementById(id);
let dayandi = false, isleyir = false, bearer = false, tip = "edv";

const bu = new Date();
const AYLAR = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
const ILK_IL = 2019, BU_IL = bu.getFullYear();
const ym = (il, ay) => `${il}-${String(ay).padStart(2, "0")}`;
for (const p of ["dan", "ya"]) {
  $(p + "_ay").innerHTML = AYLAR.map((a, i) => `<option value="${i + 1}">${a}</option>`).join("");
  let s = ""; for (let i = BU_IL; i >= ILK_IL; i--) s += `<option value="${i}">${i}</option>`;
  $(p + "_il").innerHTML = s;
}
const oxu = (p) => ym($(p + "_il").value, $(p + "_ay").value);
const yaz = (p, il, ay) => { $(p + "_il").value = il; $(p + "_ay").value = ay; };
const aralik = (i1, a1, i2, a2) => { yaz("dan", i1, a1); yaz("ya", i2, a2); };
aralik(BU_IL, 1, BU_IL, bu.getMonth() + 1);
$("ver").textContent = "v" + (window.APP_VERSIYA || "?");
$("kecenil").onclick = () => aralik(BU_IL - 1, 1, BU_IL - 1, 12);
$("hamisil").onclick = () => aralik(ILK_IL, 1, BU_IL, bu.getMonth() + 1);
for (const t of document.querySelectorAll(".tab")) t.onclick = () => {
  for (const x of document.querySelectorAll(".tab")) x.classList.toggle("aktiv", x === t);
  tip = t.dataset.tip;
  const var_ = tip === "edv" || tip === "a2" || tip === "meden" || tip === "omv" || tip === "vahid";
  $("edvBolme").hidden = !var_; $("tezlik").hidden = var_;
  $("ekBolme").hidden = tip !== "edv";
  $("dovrQeyd").textContent = tip === "meden" ? "Mədən vergisi: sətir 701–723 (yalnız dolu olan faydalı qazıntılar sütun kimi çıxır)." : tip === "a2" ? "Əlavə 2: kənd təsərrüfatı məhsullarının alışı və ticarət əlavəsi. Yalnız bu Excel yüklənir." : tip === "omv" || tip === "vahid" ? "Rüblük bəyannamədir: seçilən dövrdə başlayan rüblər götürülür (1-ci rüb = Yanvar, 2-ci = Aprel, 3-cü = İyul, 4-cü = Oktyabr)." : "";
  $("rejim").options[1].textContent = tip === "omv" || tip === "vahid" ? "Hər rüb üçün yalnız sonuncusu (Kameral nəzərə alınmır)" : "Hər ay üçün yalnız sonuncusu (Kameral nəzərə alınmır)";
  $("basla").disabled = !var_ && !isleyir;
};
$("ac").onclick = () => KOPRU("ac_etaxes");
$("dayan").onclick = () => { dayandi = true; $("durum").textContent = "Dayandırılır..."; };

function log(m) { const l = $("log"); l.value += m + "\n"; l.scrollTop = l.scrollHeight; }
const gozle = (ms) => new Promise((r) => setTimeout(r, ms));
const sessiyaXetasi = (msg) => Object.assign(new Error(msg), { sessiya: true });

// e-taxes-dən JSON (yalnız GET). Şəbəkə qısa müddətə itərsə təkrar cəhd edir.
async function getJson(yol) {
  let xeta;
  for (let c = 0; c < 4; c++) {
    const r = await KOPRU("fetch", { url: ETAX + yol, auth: true, bearer });
    if (r.sessiya) { $("xeberdarliq").hidden = false; throw sessiyaXetasi("e-taxes-ə daxil olunmayıb"); }
    if (r.sebeke || r.xeta) { xeta = new Error(r.sebeke || r.xeta); await gozle(1500 * (c + 1)); continue; }
    if ((r.status === 401 || r.status === 403) && !bearer) { bearer = true; continue; }
    if (r.status === 401 || r.status === 403) throw sessiyaXetasi("Sessiya bitib. e-taxes səhifəsində yenidən daxil olun.");
    if (r.status >= 400) throw new Error("HTTP " + r.status);
    $("xeberdarliq").hidden = true;
    return JSON.parse(r.text);
  }
  throw xeta || new Error("bağlantı kəsildi");
}

function bitir(msg) {
  isleyir = false;
  $("basla").disabled = false; $("dayan").disabled = true;
  $("durum").textContent = msg;
}

$("basla").onclick = async () => {
  if (isleyir) return;
  const dan = oxu("dan"), ya = oxu("ya");
  if (dan > ya) { $("durum").textContent = "Başlanğıc ay son aydan böyük ola bilməz."; return; }
  isleyir = true; dayandi = false;
  $("basla").disabled = true; $("dayan").disabled = false;
  $("log").value = ""; $("pb").value = 0; $("pb").max = 1;
  $("durum").textContent = "İşləyir...";
  try {
    const secim = { ygb: $("s_ygb").checked, qaime: $("s_qaime").checked, xam: $("s_xam").checked, a2: tip === "a2", omvG: tip === "omv" };
    const omv = tip === "omv" || tip === "vahid", nov = tip === "meden" ? "Mədən vergisi" : tip === "vahid" ? "Vahid" : omv ? "Ödəmə mənbəyində vergi" : "ƏDV";
    const siyahi = tip === "meden" ? await bayannameSiyahisi(getJson, dan, ya, $("rejim").value, log, "_0700", /Mədən/) : await (omv ? omvSiyahisi : bayannameSiyahisi)(getJson, dan, ya, $("rejim").value, log, tip === "vahid" ? "_0901" : "_1600");
    log(`Tapıldı: ${siyahi.length} ${nov} bəyannaməsi.`);
    if (!siyahi.length) { bitir(`Seçilmiş dövrdə ${nov} bəyannaməsi tapılmadı.`); return; }
    $("pb").max = siyahi.length;
    const data = new Array(siyahi.length), ugursuz = [];
    let novbe = 0, oxunan = 0;
    await Promise.all(Array.from({ length: Math.min(4, siyahi.length) }, async () => {
      while (!dayandi) {
        const i = novbe++; if (i >= siyahi.length) return;
        const b = siyahi[i];
        try {
          data[i] = await bayannameYukle(getJson, b, secim);
          log(`  ${omv ? _omvDovr(b) : AYLAR_AZ[b.ay - 1] + " " + b.il} (${BEY_NOV_AZ[b.nov] || b.nov}) oxundu`);
        } catch (e) {
          if (e.sessiya) throw e;
          ugursuz.push(b); log(`! ${b.no}: götürülmədi (${e.message})`);
        }
        $("pb").value = ++oxunan; $("durum").textContent = `${oxunan} / ${siyahi.length} bəyannamə oxundu`;
      }
    }));
    const hazir = data.filter(Boolean);
    if (!hazir.length) { bitir(dayandi ? "Dayandırıldı." : "Heç bir bəyannamə oxunmadı."); return; }
    const bayt = await xlsxYarat(tip === "meden" ? [medenSehife(hazir)] : tip === "a2" ? a2Sehifeler(hazir) : tip === "vahid" ? [vahidSehife(hazir)] : omv ? [omvSehife(hazir), ...(hazir.some((d) => (d.omvG || []).length) ? [omvGuzestSehife(hazir)] : [])] : secilenSehifeler(hazir, secim));
    const ad = `${tip === "meden" ? "meden" : tip === "a2" ? "edv_elave2" : tip === "vahid" ? "vahid" : omv ? "omv" : "edv"}_beyannameleri_${dan.replace("-", "")}_${ya.replace("-", "")}.xlsx`;
    await KOPRU("yukle", { bytes: bayt, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ad });
    log(`Hazırdır (${hazir.length} bəyannamə): ${ad} (Yükləmələr qovluğuna düşür)`);
    if (ugursuz.length) log(`Götürülməyən: ${ugursuz.map((x) => x.no).join(" ")}`);
    bitir(dayandi ? "Dayandırıldı. Oxunan hissə Excel-ə yazıldı." : "Bitdi. Fayl Yükləmələr qovluğundadır.");
  } catch (e) {
    log(`! ${e.message}`);
    bitir(e.sessiya ? "e-taxes-ə daxil olun (səhifə açıq qalsın), sonra yenidən basın." : "Xəta baş verdi. Jurnala baxın.");
  }
};

// açılışda giriş yoxlanır (sessiya yoxdursa xəbərdarlıq göstərilir)
KOPRU("fetch", { url: ETAX + "/api/po/declaration/public/v1/dictionary/taxCodes", auth: true }).then((r) => { if (r && r.sessiya) $("xeberdarliq").hidden = false; });
