// Əlavə 2 (kənd təsərrüfatı məhsulları): ayrıca Excel. Hissə 1 - alış siyahısı, Hissə 2 - ticarət əlavəsi, Bölmə 3 - 2022-dək mallar
const A2_KOD = "VAT_APPENDIX_2_AGRO_PRODUCTS_RETAIL";
const A2_SENED = { ELECTRONIC_INVOICE: "EQF (e-qaimə)", PURCHASE_ACT: "Alış aktı", IMPORT: "İdxal" };
const A2_OLKE = { ZAF: "Cənubi Afrika", TUR: "Türkiyə", IRN: "İran", RUS: "Rusiya", GEO: "Gürcüstan", UZB: "Özbəkistan", KAZ: "Qazaxıstan", EGY: "Misir", CHN: "Çin", IND: "Hindistan", ESP: "İspaniya", ITA: "İtaliya", GRC: "Yunanıstan", ECU: "Ekvador", CHL: "Çili", PER: "Peru", BRA: "Braziliya", ARG: "Argentina", MAR: "Mərakeş", UKR: "Ukrayna", MDA: "Moldova", POL: "Polşa", NLD: "Niderland", USA: "ABŞ", THA: "Tailand", VNM: "Vyetnam", CRI: "Kosta Rika", COL: "Kolumbiya", ISR: "İsrail" };
const _a2Olke = (c) => (c ? (A2_OLKE[c] ? A2_OLKE[c] + " (" + c + ")" : c) : "");
const _A2_BILINEN = ["purchased", "documentType", "tin", "pin", "taxPayerName", "id", "rowOrder", "birthDate", "country", "countryCode", "countryName"];
const _a2Diger = (x) => Object.entries(x).filter(([k, v]) => !_A2_BILINEN.includes(k) && v != null && v !== "").map(([k, v]) => k + ": " + v).join("; ");
function a2Sehifeler(data) {
  const bas = (a) => a.map((v) => ({ v, s: S.BASLIQ }));
  const ag = (d) => ((((d.base || {}).taxInformation || {}).appendix2 || {}).agroProductsRetailTotal) || null;
  const un = (d) => ((((((d.base || {}).taxInformation || {}).appendix2 || {}).unsoldAgroProducts) || [])[0]) || {};
  const var_ = data.filter((d) => ag(d) || (d.a2 || []).length || Object.values(un(d)).some((x) => Number(x)));
  // Hissə 1: hər alış ayrıca sətir
  const s1 = [..._META_BAS, "Sıra №", "Mal alışını təsdiq edən sənəd", "Mal təqdim edənin adı / idxal olunan ölkə", "VÖEN / FİN", "Doğum tarixi", "Hesabat dövrü ərzində alınmış malların məbləği (alış qiyməti ilə)", "Digər sahələr (idxal və s. üçün)"];
  const r1 = [];
  for (const d of var_) {
    const a = [...(d.a2 || [])].sort((x, y) => (x.rowOrder || 0) - (y.rowOrder || 0));
    for (const x of a) r1.push([..._m(d), _t(x.rowOrder), _t(A2_SENED[x.documentType] || x.documentType || ""), _t(x.taxPayerName || x.countryName || _a2Olke(x.country || x.countryCode)), _t(x.tin || x.pin || ""), _t(x.birthDate || ""), _p(_r2(x.purchased)), _t(_a2Diger(x))]);
    if (a.length) r1.push([..._m(d), _t(""), _t("CƏMİ"), _t(""), _t(""), _t(""), _p(_r2(a.reduce((s, x) => s + (Number(x.purchased) || 0), 0))), _t("")]);
  }
  // Hissə 2 və Bölmə 3: bəyannamə başına bir sətir
  const s2 = [..._META_BAS,
    "Hissə 2: dövrün əvvəlinə satılmamış mal (alış qiyməti ilə)", "Hissə 2: dövr ərzində alınmış mal (alış qiyməti ilə)", "Hissə 2: dövr ərzində satılmış mal (satış qiyməti ilə)",
    "Hissə 2: dövrün sonuna mal qalığı (alış qiyməti ilə)", "Hissə 2: cari dövrdə satılmış mallara görə ticarət əlavəsi", "Hissə 2: ticarət əlavəsinin ƏDV məbləği",
    "Bölmə 3: dövrün əvvəlinə satılmamış mal (ƏDV-siz)", "Bölmə 3: dövrün əvvəlinə satılmamış malın ƏDV-si", "Bölmə 3: dövrdə təqdim edilmiş mal (ƏDV-siz)",
    "Bölmə 3: dövrdə təqdim edilmiş malın ƏDV-si", "Bölmə 3: dövrün sonuna satılmamış mal (ƏDV-siz)", "Bölmə 3: dövrün sonuna satılmamış malın ƏDV-si"];
  const r2 = var_.map((d) => { const g = ag(d) || {}, u = un(d);
    return [..._m(d), _p(_r2(g.startRemains)), _p(_r2(g.purchased)), _p(_r2(g.sold)), _p(_r2(g.resultRemains)), _p(_r2(g.tradeSupplementCost)), _p(_r2(g.tradeSupplementVat)),
      _p(_r2(u.prePeriodAmount)), _p(_r2(u.prePeriodVat)), _p(_r2(u.periodAmount)), _p(_r2(u.periodAmountVat)), _p(_r2(u.periodEndAmount)), _p(_r2(u.periodEndVat))]; });
  // 3-cü vərəq: hesabat dövrü üzrə dövriyyə (301, 301.2, 301-2, 305) - səhifədəki rəqəmlərlə yoxlanılıb
  const c = (d, k) => ((((d.base || {}).taxInformation || {}).calculations) || []).find((x) => x.indicator === k) || {};
  const s3 = [..._META_BAS,
    "301 ƏDV-yə 18% dərəcə ilə cəlb olunan əməliyyatlar: təqdim edilmiş dəyər", "301: daxil olmuş məbləğ", "301: ƏDV məbləği",
    "301.2 Kənd təsərrüfatı məhsullarının satışı üzrə ƏDV-yə cəlb olunan ticarət əlavəsi: daxil olmuş məbləğ", "301.2: ƏDV məbləği",
    "301-2 Digər şəxslərdən alınan və ya idxal olunan kənd təsərrüfatı məhsullarının satışı üzrə əməliyyatlar: təqdim edilmiş dəyər",
    "305 Əməliyyatlar üzrə CƏMİ: təqdim edilmiş dəyər", "305: daxil olmuş məbləğ", "305: ƏDV məbləği"];
  const r3 = data.map((d) => { const a = c(d, "_1001"), b = c(d, "_1103"), e = c(d, "_1303"), f = c(d, "_1005");
    return [..._m(d), _p(_r2(a.cost)), _p(_r2(a.amount)), _p(_r2(a.vat)), _p(_r2(b.amount)), _p(_r2(b.vat)), _p(_r2(e.cost)), _p(_r2(f.cost)), _p(_r2(f.amount)), _p(_r2(f.vat))]; });
  return [
    { ad: "Əlavə 2 - Hissə 1 (alışlar)", rows: [bas(s1), ...r1], eni: [10, 18, 20, 18, 14, 12, 8, 18, 44, 16, 14, 22, 40], dondur: true, suzgec: s1.length },
    { ad: "Əlavə 2 - Hissə 2 və Bölmə 3", rows: [bas(s2), ...r2], eni: [10, 18, 20, 18, 14, 12, ...s2.slice(6).map(() => 20)], dondur: true, suzgec: s2.length },
    { ad: "Hesabat dövrü dövriyyəsi", rows: [bas(s3), ...r3], eni: [10, 18, 20, 18, 14, 12, ...s3.slice(6).map(() => 22)], dondur: true, suzgec: s3.length },
  ];
}
