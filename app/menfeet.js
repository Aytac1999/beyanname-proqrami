// Mənfəət vergisi (illik, _0200): Gəlirlər, Xərclər, Vergi hesablanması, Əlavə 1 (aktivlər, kapital və öhdəliklər)
const MV_HESAB = {_3005: ["", "Vergi dərəcəsi, %"], _3001: ["237", "Vergi tutulan mənfəət"], _3004: ["241", "Vergi tutulan mənfəət (cəmi)"], _3006: ["243", "Hesablanmış mənfəət vergisi"], _3010: ["245", "Büdcəyə ödənilməli vergi"]};

async function menfeetSiyahisi(getJson, dan, ya, rejim, log, kod, ad) {
  kod = kod || "_0200"; ad = ad || /Mənfəət/;
  const il1 = Number(dan.split("-")[0]), il2 = Number(ya.split("-")[0]), gor = new Map();
  for (let il = il1; il <= il2 + 1; il++) {  // qeydiyyat ili hesabat ilindən sonra olur
    let j;
    try { j = await getJson(`${BEY_API}/declaration/list?year=${il}`); }
    catch (e) { if (e && e.sessiya) throw e; log && log(`! ${il}: bəyannamə siyahısı alınmadı (${e.message})`); continue; }
    for (const x of j.declarations || []) {
      const d = x.declaration;
      if (!d || !(d.taxCode === kod || ad.test(d.taxName || "")) || /DRAFT|DELET/i.test(d.declarationStatus || "")) continue;
      const rp = d.reportingPeriod || {};
      if (rp.type !== "YEAR" || rp.year < il1 || rp.year > il2) continue;
      gor.set(d.registrationNumber, { il: rp.year, ay: 1, no: d.registrationNumber, nov: d.declarationType, status: d.declarationStatus,
        son: d.lastClarifying === "LAST", reg: (d.registrationDate || "").slice(0, 10), gonder: d.submissionDate || "", tutar: d.taxAmount });
    }
  }
  let netice = [...gor.values()];
  if (rejim === "sonuncu") {  // hər il üçün Kameralsız ən sonuncu
    const r = new Map();
    for (const b of netice) {
      const c = r.get(b.il), bk = b.nov === "CAMERAL", ck = c && c.nov === "CAMERAL";
      if (!c || (bk !== ck ? !bk : (b.reg + b.gonder + b.no) > (c.reg + c.gonder + c.no))) r.set(b.il, b);
    }
    netice = [...r.values()];
  }
  return netice.sort((a, b) => a.il - b.il || (a.reg + a.no).localeCompare(b.reg + b.no));
}

function menfeetSehifeler(data) {
  const bas = (a) => a.map((v) => ({ v, s: S.BASLIQ }));
  const ti = (d) => (d.base || {}).taxInformation || {};
  const meta = (d) => _meta(d).map((v, i) => _t(i === 0 ? String(d.il) : v));
  const metaBas = ["İl", ..._META_BAS.slice(1)];
  const eni = [8, 18, 20, 18, 14, 12];
  const tapMap = (d, bolme) => new Map((ti(d)[bolme] || []).map((r) => [r.indicator, r]));
  const sutunlu = (ad, bolme, AD, sahe) => {
    const maps = data.map((d) => tapMap(d, bolme));
    const kodlar = Object.keys(AD).filter((k) => maps.some((m) => Number((m.get(k) || {})[sahe])));
    const sut = [...metaBas, ...kodlar.map((k) => `${AD[k][0]} ${AD[k][1]}`)];
    const rows = data.map((d, i) => [...meta(d), ...kodlar.map((k) => _p(_r2((maps[i].get(k) || {})[sahe])))]);
    return { ad, rows: [bas(sut), ...rows], eni: [...eni, ...kodlar.map(() => 22)], dondur: true, suzgec: sut.length };
  };
  const gelir = sutunlu("Gəlirlər", "incomes", MV_GELIR, "amount");
  const xerc = sutunlu("Xərclər", "expenses", MV_XERC, "amount");
  // hesablama: tanınan sətirlər + sıfırdan fərqli digərləri
  const maps = data.map((d) => tapMap(d, "reportPeriodCalculations"));
  const dig = [...new Set(maps.flatMap((m) => [...m.keys()]))].filter((k) => !MV_HESAB[k] && maps.some((m) => Number((m.get(k) || {}).amount)));
  const hk = [...Object.keys(MV_HESAB), ...dig];
  const hs = [...metaBas, ...hk.map((k) => MV_HESAB[k] ? `${MV_HESAB[k][0]} ${MV_HESAB[k][1]}`.trim() : `Hesablama sətri (daxili kod ${k})`), "Əsas vergi: büdcəyə ödənilməli məbləğ"];
  const hesab = { ad: "Vergi hesablanması", rows: [bas(hs), ...data.map((d, i) => [...meta(d), ...hk.map((k) => _p(_r2((maps[i].get(k) || {}).amount))), _p(_r2((ti(d).mainTax || {}).taxAmount))])],
    eni: [...eni, ...hk.map(() => 24), 24], dondur: true, suzgec: hs.length };
  // Əlavə 1: uzun format (hər bəyannamə x sətir)
  const ael = (ad, bolme, AD, bsl) => {
    const rows = [];
    for (const d of data) for (const r of (((ti(d).appendix1 || {})[bolme]) || [])) {
      const a = AD["_" + String(r.indicator).replace("_", "")] || ["", `daxili kod ${r.indicator}`];
      const v = ["periodStart", "obtained", "presented", "removed", "cancelled", "periodEnd"].map((k) => r[k]);
      if (!v.some((x) => Number(x))) continue;
      rows.push([...meta(d), _t(a[0]), _t(a[1]), ...(bolme === "assets" ? v : [r.periodStart, r.periodEnd]).map((x) => _p(_r2(x)))]);
    }
    const sut = [...metaBas, "Sətir", "Göstərici", ...bsl];
    return { ad, rows: [bas(sut), ...rows], eni: [...eni, 8, 60, ...bsl.map(() => 18)], dondur: true, suzgec: sut.length };
  };
  const aktiv = ael("Əlavə 1 - Aktivlər", "assets", MV_AKTIV, ["Dövrün əvvəlinə", "Daxil olub", "Təqdim edilib", "Silinib", "Ləğv edilib", "Dövrün sonuna"]);
  const kap = ael("Əlavə 1 - Kapital və öhdəliklər", "capitalReserves", MV_KAPITAL, ["Dövrün əvvəlinə", "Dövrün sonuna"]);
  return [gelir, xerc, hesab, aktiv, kap];
}
