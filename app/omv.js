// Ödəmə mənbəyində vergi (kod _1600, rüblük) bəyannamələrinin oxunması və yığcam Excel vərəqi. Yalnız oxuma.
// daxili kod -> [sətir, qısa ad]. Sıra ekrandakı sətir sırası ilə eynidir; 1604.2, 1607.1.1, 1607.1.2, 1607.1.2.1, 1607.2, 1608.5.1, 1608.5.2, 1611 rəqəmlərlə yoxlanıb.
const OMV_AD = {
  _1001: ["1600", "Pensiyalar (dövlət sosial təminatdan ödənilənlər istisna)"],
  _1040: ["1601", "Vəkillərə və mediatorlara ödənilən haqlar"],
  _1041: ["1602", "VÖEN-siz fiziki şəxslərə ödənilən haqlar, yardım, mükafat, təqaüd"],
  _1003: ["1602.1", "VÖEN-siz fiziki şəxslərin xidmətlərinə görə ödənilən gəlirlər"],
  _1042: ["1602.2", "Muzdlu işçi olmayanlara maddi yardım, mükafat, təqaüd"],
  _1204: ["1603", "Təsisçiyə ödənişlər"],
  _1004: ["1603.1", "Dividend gəlirləri"],
  _1005: ["1603.1.1", "Rezident şəxslərin dividend gəlirləri"],
  _1006: ["1603.1.2", "Dividend: qeyri-rezidentin AR-da gəlirləri"],
  _1206: ["1603.2", "Təsisçiyə təsərrüfat məqsədindən kənar verilən məbləğ"],
  _1007: ["1604", "Faiz gəlirləri"],
  _1008: ["1604.1", "Faiz: rezident fiziki şəxslər və daimi nümayəndəlik"],
  _1009: ["1604.2", "Faiz: qeyri-rezidentin AR-da gəlirləri"],
  _7051: ["1605", "Həyatın yığım sığortası üzrə gəlirlər"],
  _1010: ["1606", "Royalti"],
  _1011: ["1606.1", "Royalti: rezident və daimi nümayəndəlik"],
  _1032: ["1606.1.1", "Royalti: hüquqi şəxslər"],
  _1033: ["1606.1.2", "Royalti: fiziki şəxslər"],
  _1012: ["1606.2", "Royalti: qeyri-rezidentin AR-da gəlirləri"],
  _1013: ["1607", "İcarə (kirayə) haqqı"],
  _1014: ["1607.1", "İcarə: rezident şəxslər"],
  _1015: ["1607.1.1", "İcarə: rezident hüquqi şəxslər"],
  _1016: ["1607.1.2", "İcarə: rezident fiziki şəxslər"],
  _0023: ["1607.1.2.1", "İcarə haqqı (fiziki şəxslər)"],
  _0085: ["1607.1.2.2", "Kirayə haqqı (fiziki şəxslər)"],
  _1017: ["1607.2", "İcarə: qeyri-rezidentin AR-da gəlirləri"],
  _1018: ["1608", "Qeyri-rezidentin Azərbaycan mənbəyindən ümumi gəlirləri"],
  _1020: ["1608.1", "Riskin sığortası/təkrar sığortası ödənişləri"],
  _1021: ["1608.2", "Beynəlxalq rabitə xidmətləri"],
  _1022: ["1608.3", "Beynəlxalq daşıma xidmətləri"],
  _1023: ["1608.4", "İşlərin görülməsi və xidmətlərin göstərilməsindən gəlirlər"],
  _1043: ["1608.4.1", "AR-da iş görülməsindən və xidmət göstərilməsindən gəlir"],
  _1025: ["1608.4.2", "Əmlakın təqdim edilməsindən gəlir (VM 13.2.23)"],
  _1027: ["1608.4.3", "AR-dakı daşınmaz əmlakdan gəlir"],
  _1028: ["1608.4.4", "Daşınmaz əmlaklı müəssisələrin səhm/payının təqdimi"],
  _1029: ["1608.4.5", "AR-da fəaliyyətlə bağlı digər gəlirlər"],
  _1035: ["1608.5", "Güzəştli vergi tutulan ölkələrə ödənişlər"],
  _1235: ["1608.5.1", "Güzəştli ölkələr: alınmış mallara görə ödəmələr"],
  _1236: ["1608.5.2", "Güzəştli ölkələr: iş və xidmətlərə görə ödənişlər"],
  _1036: ["1608.6", "Elektron pul kisəsinə köçürmələr"],
  _1030: ["1609", "Daimi nümayəndəliyin xalis mənfəətindən köçürülən məbləğlər"],
  _1231: ["1610", "VÖEN-siz fiziki şəxslərin mal təqdimindən gəlirləri"],
  _1232: ["1610-1", "Əlilliyi olan şəxslərin əl işlərinin satışından gəlirlər"],
  _1031: ["1611", "CƏMİ"],
  _7041: ["1612", "Güzəştlər və azadolmalar"],
};
const OMV_HER = ["_1031"];   // həmişə göstərilən sətir (CƏMİ)
const _omvSira = (a, b) => Object.keys(OMV_AD).indexOf(a) - Object.keys(OMV_AD).indexOf(b);

// rüb: e-taxes dövrün ilk ayını yazır (01, 04, 07, 10)
const _omvIlkAy = (m) => { m = Number(m); return m === 2 || m === 3 ? (m - 1) * 3 + 1 : m; };
async function omvSiyahisi(getJson, dan, ya, rejim, log) {
  const [dI, dA] = dan.split("-").map(Number), [yI, yA] = ya.split("-").map(Number);
  const d1 = dI * 12 + dA, d2 = yI * 12 + yA, gor = new Map();
  for (let il = dI; il <= yI + 1; il++) {
    let j;
    try { j = await getJson(`${BEY_API}/declaration/list?year=${il}`); }
    catch (e) { if (e && e.sessiya) throw e; log && log(`! ${il}: bəyannamə siyahısı alınmadı (${e.message})`); continue; }
    for (const x of j.declarations || []) {
      const d = x.declaration;
      if (!d || d.taxCode !== "_1600" || /DRAFT|DELET/i.test(d.declarationStatus || "")) continue;
      const rp = d.reportingPeriod || {};
      const ay = _omvIlkAy(rp.month), k = rp.year * 12 + ay;
      if (rp.type !== "QUARTER" || k < d1 || k > d2) continue;
      gor.set(d.registrationNumber, { il: rp.year, ay, no: d.registrationNumber, nov: d.declarationType, status: d.declarationStatus,
        son: d.lastClarifying === "LAST", reg: (d.registrationDate || "").slice(0, 10), gonder: d.submissionDate || "", tutar: d.taxAmount });
    }
  }
  let netice = [...gor.values()];
  if (rejim === "sonuncu") {  // hər rüb üçün Kameralsız ən sonuncu (qeydiyyat tarixinə görə)
    const r = new Map();
    for (const b of netice) {
      const k = b.il * 12 + b.ay, c = r.get(k), bk = b.nov === "CAMERAL", ck = c && c.nov === "CAMERAL";
      if (!c || (bk !== ck ? !bk : (b.reg + b.gonder + b.no) > (c.reg + c.gonder + c.no))) r.set(k, b);
    }
    netice = [...r.values()];
  }
  return netice.sort((a, b) => (a.il * 12 + a.ay) - (b.il * 12 + b.ay) || (a.reg + a.no).localeCompare(b.reg + b.no));
}

const _omvDovr = (d) => { const q = Math.floor((d.ay - 1) / 3) + 1; return `${d.il} ${q}-${q === 3 || q === 4 ? "cü" : "ci"} rüb`; };
function omvSehife(data) {
  const sirala = (d) => ((d.base.taxInformation || {}).calculations || []);
  const kodlar = [...new Set([...OMV_HER, ...data.flatMap((d) => sirala(d).filter((r) => OMV_AD[r.indicator] && (Number(r.incomeAmount) || Number(r.taxAmount))).map((r) => r.indicator))])].sort(_omvSira);
  const bas = (a) => a.map((v) => ({ v, s: S.BASLIQ }));
  const ad = (k) => `${OMV_AD[k][0]} ${OMV_AD[k][1]}`;
  const meta = ["Dövr", "Növ", "Status", "Qeydiyyat №", "Qeydiyyat tarixi", "Dövrün sonuncusu"];
  const sut = [...meta, ...kodlar.flatMap((k) => [`${ad(k)} - gəlir məbləği`, `${ad(k)} - vergi məbləği`]), "1613 Büdcəyə ödənilməli vergi məbləği"];
  const rows = data.map((d) => {
    const c = sirala(d), tap = (k) => c.find((r) => r.indicator === k) || {};
    return [_t(_omvDovr(d)), _t(BEY_NOV_AZ[d.nov] || d.nov || ""), _t(BEY_STATUS_AZ[d.status] || d.status || ""), _t(d.no),
      _t((d.reg || "").split("-").reverse().join(".")), _t(d.son ? "Bəli" : ""),
      ...kodlar.flatMap((k) => [_p(_r2(tap(k).incomeAmount)), _p(_r2(tap(k).taxAmount))]),
      _p(_r2(tap("_7045").taxAmount))];
  });
  return { ad: "ÖMV yığcam", rows: [bas(sut), ...rows], eni: [14, 18, 20, 18, 14, 12, ...sut.slice(6).map(() => 20)], dondur: true, suzgec: sut.length };
}
