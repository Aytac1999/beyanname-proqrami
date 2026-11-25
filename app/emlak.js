// Əmlak vergisi (illik, _0500): hesablama + Əlavə 1 (vergidən azad) + Əlavə 2 (vergiyə cəlb olunan). Kodlar səhifədəki sahə adlarına görə təsdiqlənib.
const EMLAK_HES = [["prePeriodCalculations", "_1015", "501 Hesabat ilinin əvvəlinə: əmlakın ümumi qalıq dəyəri"], ["prePeriodCalculations", "_1016", "501.1 Hesabat ilinin əvvəlinə: vergiyə cəlb olunan əmlakın qalıq dəyəri"], ["prePeriodCalculations", "_1017", "501.1.1 Hesabat ilinin əvvəlinə: qeyri-kommersiya fəaliyyətində istifadə olunan"], ["prePeriodCalculations", "_1018", "501.2 Hesabat ilinin əvvəlinə: vergidən azad olunan əmlakın qalıq dəyəri"],
  ["endYearCalculations", "_1034", "504 Hesabat ilinin sonuna: əmlakın ümumi qalıq dəyəri"], ["endYearCalculations", "_1025", "504.1 Hesabat ilinin sonuna: vergiyə cəlb olunan əmlakın qalıq dəyəri"], ["endYearCalculations", "_1026", "504.1.1 Hesabat ilinin sonuna: qeyri-kommersiya fəaliyyətində istifadə olunan"], ["endYearCalculations", "_1027", "504.2 Hesabat ilinin sonuna: vergidən azad olunan əmlakın qalıq dəyəri"],
  ["excessPrices", "_1029", "505 Artıq qiymətə sığortalanan əmlakın dəyəri"], ["excessPrices", "_1028", "505.1 Vergiyə cəlb olunan artıq qiymətə sığortalanan əmlak"], ["excessPrices", "_1030", "505.2 Vergidən azad olunan artıq qiymətə sığortalanan əmlak"],
  ["calculatedTax", "_1012", "509.1 Hesablanmış vergi (il ərzində tam fəaliyyət göstərdiyi halda)"], ["calculatedTax", "_8001", "510 VM 199.21 üzrə azaldılmalı əmlak vergisi"], ["shouldBePaidTax", "_8003", "511.1 Büdcəyə ödənilməli vergi (il ərzində tam fəaliyyət göstərdiyi halda)"]];
const EMLAK_A1 = {_1199: ["1", "VM 199.1"], _1200: ["2", "VM 199.4.1"], _1201: ["3", "VM 199.4.2"], _1202: ["4", "VM 199.4.3"], _1203: ["5", "VM 199.4.4"], _1218: ["6", "VM 199.4.1-1"], _1204: ["7", "VM 199.5"], _1205: ["8", "VM 199.7"], _1206: ["9", "VM 199.8"], _1207: ["10", "VM 199.9"], _1209: ["11", "VM 199.11"], _1210: ["12", "VM 199.14"], _1211: ["13", "VM 199.15"], _1212: ["14", "VM 199.16"], _1219: ["15", "VM 199.17"], _1220: ["16", "VM 199.18"], _1221: ["17", "VM 199.19"], _1555: ["18", "VM 199.20"], _1222: ["19", "VM 227.1"], _1223: ["20", "VM 199.22"], _1213: ["21", "Hasilatın pay bölgüsü haqqında qanun"], _1214: ["22", "Xüsusi iqtisadi zonalar haqqında qanun"], _1215: ["23", "Beynəlxalq müqavilələr"]};
const EMLAK_A2 = {_5001: ["1", "Binalar, tikililər və qurğular"], _5002: ["1.1", "Çoxmərtəbəli (çoxmənzilli) yaşayış binaları"], _5003: ["1.2", "Qeyri-yaşayış binaları (sahələri)"], _5004: ["1.3", "Əmlak kompleksi kimi müəssisələr"], _5005: ["1.4", "Qurğular"], _5006: ["1.5", "Mənzillər"], _5007: ["1.6", "Fərdi yaşayış və bağ evləri"], _5008: ["2", "Maşınlar və avadanlıqlar"], _5009: ["3", "Yüksək texnologiyalar məhsulu olan hesablama texnikası"], _5012: ["4", "Nəqliyyat vasitələri"], _5010: ["5", "Digər əsas vəsaitlər"]};

function emlakSehifeler(data) {
  const bas = (a) => a.map((v) => ({ v, s: S.BASLIQ }));
  const ti = (d) => (d.base || {}).taxInformation || {};
  const meta = (d) => _meta(d).map((v, i) => _t(i === 0 ? String(d.il) : v));
  const metaBas = ["İl", ..._META_BAS.slice(1)], eni = [8, 18, 20, 18, 14, 12];
  const dv = (d, bl, id) => { const r = (ti(d)[bl] || []).find((x) => x.indicator === id); return r ? r.amount : null; };
  const tanin = new Set(EMLAK_HES.map((x) => x[0] + x[1]));
  const diger = [];  // tanınmayan, sıfırdan fərqli sətirlər (daxili kod)
  for (const bl of ["prePeriodCalculations", "createDateCalculations", "liquidateCalculations", "endYearCalculations", "excessPrices", "calculatedTax", "shouldBePaidTax"])
    for (const id of new Set(data.flatMap((d) => (ti(d)[bl] || []).map((x) => x.indicator))))
      if (!tanin.has(bl + id) && data.some((d) => Number(dv(d, bl, id)))) diger.push([bl, id, `Hesablama sətri (${bl}, daxili kod ${id})`]);
  const hk = [...EMLAK_HES.filter((h) => ["_1015", "_1034", "_1012", "_8003"].includes(h[1]) || data.some((d) => Number(dv(d, h[0], h[1])))), ...diger];
  const hs = [...metaBas, "506 Verginin dərəcəsi, %", ...hk.map((h) => h[2]), "Hesablanmış vergi (əsas)", "Azaldılmalı vergi (əsas)"];
  const hesab = { ad: "Əmlak vergisi hesablanması", rows: [bas(hs), ...data.map((d) => { const m = ti(d).mainTax || {};
    return [...meta(d), _p(_r2(m.taxDegree)), ...hk.map((h) => _p(_r2(dv(d, h[0], h[1])))), _p(_r2(m.calculatedTax)), _p(_r2(m.shouldBeReducedTax))]; })],
    eni: [...eni, 14, ...hk.map(() => 26), 20, 20], dondur: true, suzgec: hs.length };
  const a1r = [], a2r = [];
  for (const d of data) {
    const a1 = ti(d).appendix1 || {}, a2 = ti(d).appendix2 || {};
    for (const r of a1.taxFree || []) {
      const v = [r.periodStartAmount, r.removedAmount, r.createdAmount, r.endYearAmount, r.overAmount];
      if (!v.some((x) => Number(x))) continue;
      const a = EMLAK_A1[r.indicator] || ["", r.indicator];
      a1r.push([...meta(d), _t(a[0]), _t(a[1]), ...v.map((x) => _p(_r2(x)))]);
    }
    if ((a1.taxFree || []).length) a1r.push([...meta(d), _t(""), _t("Vergidən azad olunan əmlakın CƏMİ dəyəri"), ...[a1.periodStartTotal, a1.removedTotal, a1.createdTotal, a1.endYearTotal, a1.overTotal].map((x) => _p(_r2(x)))]);
    for (const r of a2.taxable || []) {
      const v = [r.periodStart, r.onCancelDate, r.onCreateDate, r.periodEnd, r.excessInsured];
      if (!v.some((x) => Number(x))) continue;
      const a = EMLAK_A2[r.indicator] || ["", r.indicator];
      a2r.push([...meta(d), _t(a[0]), _t(a[1]), ...v.map((x) => _p(_r2(x)))]);
    }
    if ((a2.taxable || []).length) a2r.push([...meta(d), _t(""), _t("Vergiyə cəlb olunan əmlakın CƏMİ dəyəri"), ...[a2.periodStartTotal, a2.onCancelDateTotal, a2.onCreateDateTotal, a2.periodEndTotal, a2.excessInsuredTotal].map((x) => _p(_r2(x)))]);
  }
  const bsl = ["Hesabat ilinin əvvəlinə qalıq dəyəri", "Ləğv/uçotdan çıxarılma tarixinə", "Yarandığı (uçota alındığı) tarixə", "Hesabat ilinin sonuna qalıq dəyəri", "Artıq qiymətə sığortalanan dəyər"];
  const sh = (ad, rows, c1) => { const sut = [...metaBas, "Sətir", c1, ...bsl]; return { ad, rows: [bas(sut), ...rows], eni: [...eni, 8, 50, ...bsl.map(() => 20)], dondur: true, suzgec: sut.length }; };
  return [hesab, sh("Əlavə 1 - Vergidən azad", a1r, "Azadolma səbəbi"), sh("Əlavə 2 - Vergiyə cəlb olunan", a2r, "Əmlakın kateqoriyası")];
}
