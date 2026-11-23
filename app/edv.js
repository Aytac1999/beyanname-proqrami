// ƏDV bəyannamələrinin oxunması və Excel vərəqlərinin hazırlanması (yalnız oxuma sorğuları).
// getJson(yol) e-taxes-dən JSON qaytarır (panel.js verir). Bu fayl brauzer və Node-da eyni işləyir.
const AYLAR_AZ = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
// Növ və status adları: e-taxes kodları. Bilinməyən kod olduğu kimi yazılır (adı dolu nümunə gəldikcə əlavə olunur).
const BEY_NOV_AZ = { CURRENT: "Cari", CLARIFYING: "Dəqiqləşdirilmiş", CAMERAL: "Kameral" };
const BEY_STATUS_AZ = { CONFIRMED: "Təsdiqlənmiş", ON_CHECK: "Uyğunsuzluq yoxlamasında", FILED: "Təqdim edilib" };
const BEY_API = "/api/po/declaration/public/v1";

// daxili kod -> [sətir kodu, ad]. Yalnız ekranla TƏSDİQLƏNMİŞ olanlar; qalanı "Daxili kod" ilə adsız yazılır
const LUGAT = {
  calculations: {
    _1001: ["301", "ƏDV-nə 18 faiz dərəcə ilə cəlb olunan əməliyyatlar"],
    _1101: ["301.1", "Malların təqdim edilməsi, işlərin görülməsi, xidmətlərin göstərilməsi üzrə əməliyyatlar"],
    _1005: ["305", "Əməliyyatlar üzrə CƏMİ"],
  },
  debtorDebt: {
    _1400: ["307", "Debitor borclar üzrə"],
    _1401: ["307.1", "ƏDV-nə 18 faiz dərəcə ilə cəlb olunan əməliyyatlar üzrə"],
  },
  refundCalculations: {
    _1008: ["308", "VM 175.1-ci maddəsinə əsasən alınmış elektron qaimə-fakturalar üzrə nağdsız ödənilmiş məbləğ"],
    _1010: ["310", "İdxalda ƏDV-yə cəlb olunmuş mallara görə ödənilmiş məbləğ"],
    _1016: ["317", "Əməliyyatlar üzrə CƏMİ"],
  },
  totalCalculations: {
    _1023: ["326", "Büdcəyə ödənilməlidir"],
    _1092: ["327", "Büdcədən qaytarılır"],
  },
};

const _ay = (il, ay) => il * 12 + ay;

// dan/ya: "YYYY-MM". rejim: "hamisi" (bütün növlər) | "sonuncu" (hər ay üçün e-taxes-in "sonuncu" işarəli bəyannaməsi)
async function bayannameSiyahisi(getJson, dan, ya, rejim, log) {
  const [dI, dA] = dan.split("-").map(Number), [yI, yA] = ya.split("-").map(Number);
  const d1 = _ay(dI, dA), d2 = _ay(yI, yA);
  const gor = new Map();
  for (let il = dI; il <= yI + 1; il++) {  // qeydiyyat ili hesabat ilindən sonra ola bilər
    let j;
    try { j = await getJson(`${BEY_API}/declaration/list?year=${il}`); }
    catch (e) { if (e && e.sessiya) throw e; log && log(`! ${il}: bəyannamə siyahısı alınmadı (${e.message})`); continue; }
    for (const x of j.declarations || []) {
      const d = x.declaration;
      if (!d || !(d.taxCode === "_0300" || /Əlavə dəyər/.test(d.taxName || ""))) continue;
      const rp = d.reportingPeriod || {};
      if (rp.type !== "MONTH" || /DRAFT|DELET/i.test(d.declarationStatus || "")) continue;
      const k = _ay(rp.year, rp.month);
      if (k < d1 || k > d2) continue;
      gor.set(d.registrationNumber, { il: rp.year, ay: rp.month, no: d.registrationNumber, nov: d.declarationType,
        status: d.declarationStatus, son: d.lastClarifying === "LAST", reg: (d.registrationDate || "").slice(0, 10),
        gonder: d.submissionDate || "", tutar: d.taxAmount });
    }
  }
  let netice = [...gor.values()];
  if (rejim === "sonuncu") {
    // Kameral nəzərə alınmır: hər ay üçün Cari/Dəqiqləşdirilmişlərdən qeydiyyat tarixinə görə ən sonuncu (yalnız kameral varsa, o qalır)
    const ay = new Map();
    for (const b of netice) {
      const k = _ay(b.il, b.ay), c = ay.get(k);
      const bk = b.nov === "CAMERAL", ck = c && c.nov === "CAMERAL";
      const yaxsi = !c || (bk !== ck ? !bk : (b.reg + b.gonder + b.no) > (c.reg + c.gonder + c.no));
      if (yaxsi) ay.set(k, b);
    }
    netice = [...ay.values()];
  }
  return netice.sort((a, b) => _ay(a.il, a.ay) - _ay(b.il, b.ay) || (a.reg + a.no).localeCompare(b.reg + b.no));
}

async function cedvel(getJson, kod, no) {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const r = await getJson(`${BEY_API}/calc/${kod}?reg_number=${no}&offset=${off}&maxCount=1000`);
    const a = JSON.parse(r.calcPartJson || "[]");
    out.push(...a);
    if (a.length < 1000 && !r.hasMore) return out;
    if (!a.length) return out;
  }
}

// secim: { ygb: bool, qaime: bool } - siyahılar yalnız lazım olanda götürülür (yığcam cədvəl üçün lazım deyil)
async function bayannameYukle(getJson, b, secim) {
  secim = secim || {};
  const r = await getJson(`${BEY_API}/base?reg_number=${b.no}`);
  const base = typeof r.baseJson === "string" ? JSON.parse(r.baseJson) : (r.baseJson || {});
  const [ygb, qaime] = await Promise.all([
    secim.ygb ? cedvel(getJson, "VAT_APPENDIX_1_REPORT_PERIOD_CCD", b.no) : [],
    secim.qaime ? cedvel(getJson, "VAT_APPENDIX_1_REPORT_PERIOD_INVOICE", b.no) : [],
  ]);
  return { ...b, base, ygb, qaime };
}

// ------------------------------------------------------------------ Excel vərəqləri
const _meta = (d) => [`${d.il}-${String(d.ay).padStart(2, "0")}`, BEY_NOV_AZ[d.nov] || d.nov || "", BEY_STATUS_AZ[d.status] || d.status || "",
  d.no, (d.reg || "").split("-").reverse().join("."), d.son ? "Bəli" : ""];
const _META_BAS = ["Dövr", "Növ", "Status", "Qeydiyyat №", "Qeydiyyat tarixi", "Dövrün sonuncusu"];
const _t = (v) => ({ v: v == null ? "" : v, s: S.METN });
const _p = (v) => (v == null ? "" : { v: Number(v), s: S.PUL });
const _m = (d) => _meta(d).map(_t);

// bölmənin iç-içə strukturunu "yol -> dəyər" sətirlərinə çevirir (xam vərəq: heç nə itməsin)
function yastila(obj, yol, out) {
  if (Array.isArray(obj)) {
    obj.forEach((x, i) => yastila(x, `${yol}/${x && typeof x === "object" && x.indicator ? x.indicator : i}`, out));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) if (k !== "indicator") yastila(v, `${yol}/${k}`, out);
  } else if (obj !== null && obj !== undefined) out.push([yol, obj]);
}

function bayannameSehifeleri(data) {
  const bas = (a) => a.map((v) => ({ v, s: S.BASLIQ }));
  const sheet = (ad, sutun, setirler, eni) => ({ ad, rows: [bas([..._META_BAS, ...sutun]), ...setirler],
    eni: [10, 18, 20, 18, 14, 12, ...eni], dondur: true, suzgec: _META_BAS.length + sutun.length });
  const bolme = (d, ad) => (d.base.taxInformation || {})[ad] || [];
  const lugatSetir = (ad, sahe) => data.flatMap((d) => bolme(d, ad).map((r) => {
    const [kod, an] = (LUGAT[ad] || {})[r.indicator] || ["", ""];
    return [..._m(d), _t(kod), _t(an), _t(r.indicator), ...sahe.map((k) => _p(r[k]))];
  }));
  const ana = (d) => (d.base.taxInformation || {}).mainTax || {};

  const xam = data.flatMap((d) => {
    const o = []; yastila(d.base.taxInformation || {}, "", o);
    return o.map(([y, v]) => [..._m(d), _t(y.replace(/^\//, "")), typeof v === "number" ? _p(v) : _t(v)]);
  });
  return [
    sheet("Siyahı", ["Büdcəyə ödənilməli", "Büdcədən qaytarılır", "Siyahıdakı məbləğ"],
      data.map((d) => [..._m(d), _p(ana(d).mustBePaid), _p(ana(d).mustBeReturned), _p(d.tutar)]), [18, 18, 18]),
    sheet("Hesablama 301-306", ["Sətir", "Ad", "Daxili kod", "Təqdim edilmiş dəyər", "Daxil olmuş məbləğ", "ƏDV"],
      lugatSetir("calculations", ["cost", "amount", "vat"]), [8, 50, 10, 16, 16, 16]),
    sheet("Debitor 307", ["Sətir", "Ad", "Daxili kod", "Əvvəlki qalıq", "Yaranan", "Silinən", "Son qalıq"],
      lugatSetir("debtorDebt", ["previousDebt", "incurredDebt", "removedDebt", "lastDebt"]), [8, 50, 10, 16, 16, 16, 16]),
    sheet("Əvəzləşdirmə 308-317", ["Sətir", "Ad", "Daxili kod", "Ödənilmiş məbləğ", "ƏDV"],
      lugatSetir("refundCalculations", ["paidAmount", "vat"]), [8, 50, 10, 16, 16]),
    sheet("Hesablaşma 326-327", ["Sətir", "Ad", "Daxili kod", "ƏDV məbləği"],
      lugatSetir("totalCalculations", ["amount"]), [8, 30, 10, 16]),
    sheet("Əlavə 3", ["Daxili kod", "Təqdim edilmiş dəyər", "Daxil olmuş məbləğ"],
      data.flatMap((d) => (((d.base.taxInformation || {}).appendix3 || {}).vatOperations || []).map((r) =>
        [..._m(d), _t(r.indicator), _p(r.cost), _p(r.amount)])), [10, 18, 18]),
    sheet("YGB (Əlavə 1)", ["№", "Daxili kod", "YGB nömrəsi", "Tarix", "Məbləğ", "ƏDV"],
      data.flatMap((d) => d.ygb.map((r) => [..._m(d), _t(r.rowOrder), _t(r.indicator), _t(r.documentNumber),
        _t((r.documentDate || "").split("-").reverse().join(".")), _p(r.cost), _p(r.vat)])), [6, 10, 20, 12, 16, 16]),
    sheet("Qaimələr (Əlavə 1)", ["№", "Daxili kod", "VÖEN", "Tarix", "Seriya", "Nömrə", "Məbləğ", "ƏDV", "Ödənilmiş məbləğ", "Ödənilmiş ƏDV"],
      data.flatMap((d) => d.qaime.map((r) => [..._m(d), _t(r.rowOrder), _t(r.indicator), _t(r.tin),
        _t((r.documentDate || "").split("-").reverse().join(".")), _t(r.documentSerial), _t(r.documentNumber),
        _p(r.amount), _p(r.vat), _p(r.paidAmount), _p(r.paidVat)])), [6, 10, 14, 12, 10, 14, 14, 12, 16, 16]),
    sheet("Xam məlumat", ["Yol", "Dəyər"], xam, [60, 20]),
  ];
}


// ------------------------------------------------------------------ YIĞCAM CƏDVƏL: hər bəyannamə = bir sətir
const _r2 = (x) => (x == null || x === "" ? null : Math.round(Number(x) * 100) / 100);
// 319.1 sətrinin e-taxes daxili kodu hələ təsdiqlənməyib: nümunə gələndə bura yazılır (boş qalarsa sütunlar boş olur)
const KOD_319_1 = ["_1035"]; // 319.1: dəqiqləşdirilən dövriyyə (specifiedTurnover). _1018 = 319 CƏMİ. Avqust 2026 dəqiqləşdirilmişdə ekranla (3 061,94) uyğun; 319 ilə 319.1 fərqli olan bəyannamədə yoxlanmalıdır
function _tap(d, bolme, kod) {
  const ti = d.base.taxInformation || {};
  return (ti[bolme] || []).find((r) => r.indicator === kod) || null;
}
function _tapHer(d, kodlar) {  // bütün strukturda indicator-a görə axtarış (319.1 üçün)
  let tapildi = null;
  const gez = (o) => {
    if (tapildi || !o || typeof o !== "object") return;
    if (!Array.isArray(o) && kodlar.includes(o.indicator)) { tapildi = o; return; }
    for (const v of Object.values(o)) gez(v);
  };
  gez(d.base.taxInformation || {});
  return tapildi;
}
// Əlavə 3 sətirləri: kod -> sətir nömrəsi (yalnız təsdiqlənmiş olanlar yazılır; qalanı "kod _1037" kimi görünür)
const A3_AD = {  // ekrandakı rəqəmlərlə TƏSDİQLƏNMİŞ (Sentyabr 2026, 3 bəyannamə)
  _1037: "301.1.1 Malların təqdim edilməsindən gəlir",
  _1044: "301.1.1.7 Digər malların təqdim edilməsi üzrə əməliyyatlar",
  _1046: "301.1.1.8 Təqdim ediləcək malların hesabına əvvəlcədən alınmış ödənişləri",
  _1055: "301.1.2 İşlərin görülməsi və xidmətlərin göstərilməsi üzrə əməliyyatlar",
  _1056: "301.1.2.1 Daşınan və daşınmaz əmlakın icarəyə verilməsindən gəlirlər",
  _1061: "301.1.2.6 Sair işlərin görülməsi və xidmətlərin göstərilməsi üzrə əməliyyatlar",
  _1063: "301.1.2.7 Təqdim ediləcək işlərin və xidmətlərin hesabına əvvəlcədən alınmış ödənişləri",
  _1227: "301-2 Pərakəndə ticarət üzrə ƏDV-yə 18 faiz dərəcə ilə cəlb edilən əməliyyatlar",
  _1228: "301-3 Topdan ticarət üzrə ƏDV-yə 18 faiz dərəcə ilə cəlb edilən əməliyyatlar",
  _1239: "301-4 Vergi Məcəlləsinin 174.5-ci maddəsinə əsasən formalaşan dövriyyə",
};
// istifadəçinin istəyi ilə göstərilməyən sətirlər (CƏMİ-yə yenə daxildir)
// yalnız "daxil olmuş məbləğ" olan sətirlər: kod -> sütun başlığı
const A3_TEK = { _1239: "Vergi Məcəlləsinin 174.5-ci maddəsinə əsasən formalaşan dövriyyə" };
const A3_GIZLI = ["_1037", "_1055"]; // 301.1.1 və 301.1.2 ara yekunları (301.1 CƏMİ-nin tərkibi)
const A3_HER = ["_1044", "_1046", "_1056", "_1061", "_1063", "_1227", "_1228", "_1239"]; // həmişə göstərilən sütunlar (sıfır olsa da)
const _a3Sirala = (a, b) => Number(a.slice(1)) - Number(b.slice(1));
const a3Ad = (k) => A3_AD[k] || "Əlavə 3 kod " + k;
function yigcamSehife(data) {
  const A3_CEM = "_1091";
  const a3Hamisi = (d) => (((d.base.taxInformation || {}).appendix3 || {}).vatOperations || []);
  const a3Kodlar = [...new Set(data.flatMap((d) => a3Hamisi(d).filter((r) => r.indicator !== A3_CEM && (Number(r.cost) || Number(r.amount))).map((r) => r.indicator)))].sort(_a3Sirala);
  const a3Goster = [...new Set([...a3Kodlar, ...A3_HER])].filter((k) => !A3_GIZLI.includes(k)).sort(_a3Sirala); // istifadəçinin sildiyi sütunlar göstərilmir; hamısı CƏMİ-yə daxildir
  const a4Hamisi = (d) => (((d.base.taxInformation || {}).appendix4 || {}).zeroVat || []);
  const a5Hamisi = (d) => (((d.base.taxInformation || {}).appendix5 || {}).freeVat || []);
  const A4_TEK = ["_1122"]; // 302.6.1: yalnız daxil olmuş məbləğ
  const _kodlar = (hamisi, AD, cem) => Object.keys(AD).filter((k) => k === cem || data.some((d) => hamisi(d).some((r) => r.indicator === k && (Number(r.cost) || Number(r.amount)))));
  const a4Goster = _kodlar(a4Hamisi, A4_AD, "_1069"), a5Goster = _kodlar(a5Hamisi, A5_AD, "_1078");
  const _bas45 = (AD, k, tek) => tek ? [`${AD[k][0]} ${AD[k][1]} - Daxil olmuş məbləğ (ƏDV nəzərə alınmadan)`] : [`${AD[k][0]} ${AD[k][1]} - Təqdim edilmiş mal, iş və xidmətlərin dəyəri (ƏDV nəzərə alınmadan)`, `${AD[k][0]} ${AD[k][1]} - Daxil olmuş məbləğ (ƏDV nəzərə alınmadan)`];
  const _deyer45 = (hamisi, d, k, tek) => { const r = hamisi(d).find((x) => x.indicator === k) || {}; return tek ? [_p(_r2(r.amount))] : [_p(_r2(r.cost)), _p(_r2(r.amount))]; };
  const bas = (a) => a.map((v) => ({ v, s: S.BASLIQ }));
  const sut = [..._META_BAS,
    "YGB (310): ƏDV",
    "Qaimə (308): ƏDV",
    ...a3Goster.flatMap((k) => A3_TEK[k] ? [A3_TEK[k]] : [`${a3Ad(k)} - Təqdim edilmiş mal, iş və xidmətlərin dəyəri (ƏDV nəzərə alınmadan)`, `${a3Ad(k)} - Daxil olmuş məbləğ (ƏDV nəzərə alınmadan)`]),
    "Əlavə 3 CƏMİ (301.1): dəyər", "Əlavə 3 CƏMİ (301.1): daxil olmuş məbləğ",
    ...a4Goster.flatMap((k) => _bas45(A4_AD, k, A4_TEK.includes(k))),
    ...a5Goster.flatMap((k) => _bas45(A5_AD, k, false)),
    "Hesabat dövriyyəsi (301): dəyər", "Hesabat dövriyyəsi (301): daxil olmuş məbləğ", "Hesabat dövriyyəsi (301): ƏDV",
    "301.2 Kənd təsərrüfatı ticarət əlavəsi: daxil olmuş məbləğ", "301.2 Kənd təsərrüfatı ticarət əlavəsi: ƏDV",
    "301-2 Alınmış kənd təsərrüfatı məhsullarının satışı: dəyər",
    "Əlavə 2 (Hissə 2): dövrün əvvəlinə satılmamış mal", "Əlavə 2 (Hissə 2): dövr ərzində alınmış mal", "Əlavə 2 (Hissə 2): satılmış mal (satış qiyməti ilə)", "Əlavə 2 (Hissə 2): dövrün sonuna qalıq", "Əlavə 2 (Hissə 2): ticarət əlavəsi", "Əlavə 2 (Hissə 2): ticarət əlavəsinin ƏDV-si",
    "Əməliyyatlar CƏMİ (305): ƏDV",
    "Debitor borc (307): dövrün əvvəlinə", "Debitor borc (307): yaranan", "Debitor borc (307): silinən", "Debitor borc (307): dövrün sonuna",
    "319.1: dövriyyə", "319.1: ödənilmiş məbləğ", "319.1: ƏDV",
    "Büdcəyə ödənilməli", "Büdcədən qaytarılır"];
  const rows = data.map((d) => {
    const y = _tap(d, "refundCalculations", "_1010") || {}, q = _tap(d, "refundCalculations", "_1008") || {},
      c = _tap(d, "refundCalculations", "_1016") || {}, a3 = (((d.base.taxInformation || {}).appendix3 || {}).vatOperations || []).find((r) => r.indicator === "_1091") || {},
      h = _tap(d, "calculations", "_1001") || {}, h5 = _tap(d, "calculations", "_1005") || {}, h12 = _tap(d, "calculations", "_1103") || {}, h12b = _tap(d, "calculations", "_1303") || {}, ag = (((d.base.taxInformation || {}).appendix2 || {}).agroProductsRetailTotal) || {}, db = _tap(d, "debtorDebt", "_1400") || {},
      k = KOD_319_1.length ? _tapHer(d, KOD_319_1) || {} : {}, an = (d.base.taxInformation || {}).mainTax || {};
    return [..._m(d),
      _p(_r2(y.vat)), _p(_r2(q.vat)),
      ...a3Goster.flatMap((kod) => { const r = a3Hamisi(d).find((x) => x.indicator === kod) || {}; return A3_TEK[kod] ? [_p(_r2(r.amount))] : [_p(_r2(r.cost)), _p(_r2(r.amount))]; }),
      _p(_r2(a3.cost)), _p(_r2(a3.amount)),
      ...a4Goster.flatMap((k) => _deyer45(a4Hamisi, d, k, A4_TEK.includes(k))),
      ...a5Goster.flatMap((k) => _deyer45(a5Hamisi, d, k, false)),
      _p(_r2(h.cost)), _p(_r2(h.amount)), _p(_r2(h.vat)),
      _p(_r2(h12.amount)), _p(_r2(h12.vat)), _p(_r2(h12b.cost)),
      _p(_r2(ag.startRemains)), _p(_r2(ag.purchased)), _p(_r2(ag.sold)), _p(_r2(ag.resultRemains)), _p(_r2(ag.tradeSupplementCost)), _p(_r2(ag.tradeSupplementVat)), _p(_r2(h5.vat)),
      _p(_r2(db.previousDebt)), _p(_r2(db.incurredDebt)), _p(_r2(db.removedDebt)), _p(_r2(db.lastDebt)),
      _p(_r2(k.cost || k.turnover)), _p(_r2(k.paidAmount)), _p(_r2(k.vat != null ? k.vat : k.paidVat)),
      _p(_r2(an.mustBePaid)), _p(_r2(an.mustBeReturned))];
  });
  return { ad: "ƏDV yığcam", rows: [bas(sut), ...rows], eni: [10, 18, 20, 18, 14, 12, ...sut.slice(6).map(() => 17)], dondur: true, suzgec: sut.length };
}

// seçimlərə görə vərəqlər: həmişə yığcam; qalanı isteyə bağlı
function secilenSehifeler(data, secim) {
  const hamisi = bayannameSehifeleri(data), ad = (x) => hamisi.find((s) => s.ad === x);
  const out = [yigcamSehife(data)];
  if (secim.ygb) out.push(ad("YGB (Əlavə 1)"));
  if (secim.qaime) out.push(ad("Qaimələr (Əlavə 1)"));
  if (secim.xam) out.push(ad("Xam məlumat"));
  return out;
}
