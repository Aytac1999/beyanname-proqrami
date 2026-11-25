// Torpaq vergisi (illik, _0600): hesablama (600-616), Əlavə 1 (kənd təsərrüfatı), Əlavə 2 (xüsusi təyinatlı) sahələr
const TORPAQ_AD = [["600", "Kənd təsərrüfatı təyinatlı torpaq sahələri üzrə hesablanmış vergi məbləği"], ["600.1", "Təyinatı üzrə istifadə edilməyən kənd təsərrüfatı torpaqları üzrə vergi"], ["600.2", "Təyinatı üzrə istifadə edilən və ya istifadəsi mümkün olmayan kənd təsərrüfatı torpaqları üzrə vergi"], ["611", "Sənaye, tikinti, nəqliyyat, rabitə, ticarət-məişət xidməti və digər xüsusi təyinatlı sahələr, yaşayış fondları, həyətyanı və bağ sahələri üzrə vergi"], ["612", "Hesablanmış vergi məbləğinin cəmi (600+611)"], ["615", "Azadolmalar və güzəştlər (cəmi)"], ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => ["615." + i, "Azadolma və güzəşt 615." + i])];
const TORPAQ_ID = ["_1200", "_1205", "_1206", "_1201", "_7001", "_7002", "_7003", "_7004", "_7005", "_7006", "_7007", "_7009", "_7010", "_7011", "_7012", "_7014", "_7013", "_7015", "_7016", "_1202"];
TORPAQ_AD.push(["616", "Büdcəyə ödənilməli vergi məbləğinin cəmi"]);
const TORPAQ_YER = { "13": "Bakı" };

function torpaqSehifeler(data) {
  const bas = (a) => a.map((v) => ({ v, s: S.BASLIQ }));
  const ti = (d) => (d.base || {}).taxInformation || {};
  const meta = (d) => _meta(d).map((v, i) => _t(i === 0 ? String(d.il) : v));
  const metaBas = ["İl", ..._META_BAS.slice(1)], eni = [8, 18, 20, 18, 14, 12];
  const mv = (d, id) => { const r = (ti(d).calculations || []).find((x) => x.indicator === id); return r ? r.taxAmount : null; };
  const idx = TORPAQ_ID.map((id, i) => [id, TORPAQ_AD[i]]);
  const dolu = idx.filter(([id, a]) => ["612", "616", "611", "600"].includes(a[0]) || data.some((d) => Number(mv(d, id))));
  const hs = [...metaBas, ...dolu.map(([, a]) => `${a[0]} ${a[1]}`)];
  const hesab = { ad: "Torpaq vergisi hesablanması", rows: [bas(hs), ...data.map((d) => [...meta(d), ...dolu.map(([id]) => _p(_r2(mv(d, id))))])],
    eni: [...eni, ...dolu.map(() => 24)], dondur: true, suzgec: hs.length };
  const sahe = (ad, acar, nov) => {
    const sut = [...metaBas, "Sıra №", "Ərazi məntəqəsinin kodu", "Ərazi məntəqəsinin adı", "Təyinat", "Faydalı qazıntı qeydi", "Ümumi sahə, kv.m", "Vergiyə cəlb olunmayan sahə, kv.m", "Mülkiyyətdə olduğu aylar", "Vergi məbləği, manatla"];
    const rows = [];
    for (const d of data) for (const r of ((d.torpaq || {})[acar] || [])) {
      rows.push([...meta(d), _p(r.rowOrder), _t(r.localityCode), _t(TORPAQ_YER[r.localityCode] || ""), _t(r.purpose === "SPECIAL" ? "Sənaye, tikinti, nəqliyyat və digər xüsusi təyinatlı" : r.purpose || ""),
        _t(r.purposeNote ? "Bəli" : ""), _p(_r2(r.totalArea)), _p(_r2(r.taxFreeArea)), _p(r.propertyMonthCount), _p(_r2(r.taxAmount))]);
    }
    return { ad, rows: [bas(sut), ...rows], eni: [...eni, 8, 14, 16, 40, 14, 16, 18, 16, 16], dondur: true, suzgec: sut.length };
  };
  return [hesab, sahe("Əlavə 2 - Xüsusi təyinatlı", "ozel"), sahe("Əlavə 1 - Kənd təsərrüfatı", "kend")];
}
