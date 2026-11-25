// Mədən vergisi (aylıq, _0700): sətir 701-720 (daxili kod _701-_720), 721-723 cəmlər
const MEDEN_AD = {"701": "Xam neft", "702": "Təbii qaz və kondensatlar", "703": "Filiz faydalı qazıntıları: bütün növ metallar", "704": "Mişar daşları", "705": "Üzlük daşları", "706": "Seolit", "707": "Barit", "708": "Yüngül doldurucuların istehsalı üçün gillər", "709": "Vulkan külü və pemza", "710": "Kvars qumları", "711": "Sement xammalı", "712": "Duz", "713": "Qiymətli və yarımqiymətli bəzək daşları", "714": "Yodlu bromlu sular", "715": "Mineral sular", "716": "Bentonit gillər", "717": "Kərpic-kirəmid gilləri", "718": "Tikinti qumları", "719": "Çınqıl xammalı", "720": "Gips, gəc"};
function medenSehife(data) {
  const bas = (a) => a.map((v) => ({ v, s: S.BASLIQ }));
  const ti = (d) => (d.base || {}).taxInformation || {};
  const hec = (d, k) => [...(ti(d).wholesaleCalculations || []), ...(ti(d).mineralExtractionCalculations || [])].find((r) => r.indicator === "_" + k) || {};
  const neft = ["701", "702", "703"];
  const kodlar = Object.keys(MEDEN_AD).filter((k) => data.some((d) => { const r = hec(d, k); return Number(r.volume) || Number(r.taxAmount) || Number(r.sellPrice); }));
  const sut = [..._META_BAS];
  for (const k of kodlar) {
    const a = `${k} ${MEDEN_AD[k]}`;
    if (neft.includes(k)) sut.push(`${a} - Hasilatın həcmi`, `${a} - Topdan satış qiyməti, manatla`, `${a} - Vergi məbləği, manatla`);
    else sut.push(`${a} - Hasilatın həcmi`, `${a} - Vergi məbləği, manatla`);
  }
  sut.push("721 Hesablanmış vergi məbləğinin cəmi", "722 VM 217-1-ci maddəsinə əsasən azaldılmalı mədən vergisi", "723 Büdcəyə ödənilməli verginin məbləği");
  const rows = data.map((d) => [..._m(d), ...kodlar.flatMap((k) => { const r = hec(d, k);
    return neft.includes(k) ? [_p(_r2(r.volume)), _p(_r2(r.sellPrice)), _p(_r2(r.taxAmount))] : [_p(_r2(r.volume)), _p(_r2(r.taxAmount))]; }),
    _p(_r2((ti(d).mainTax || {}).calculated)), _p(_r2((ti(d).mainTax || {}).reduced)), _p(_r2((ti(d).mainTax || {}).taxAmount))]);
  return { ad: "Mədən vergisi yığcam", rows: [bas(sut), ...rows], eni: [10, 18, 20, 18, 14, 12, ...sut.slice(6).map(() => 20)], dondur: true, suzgec: sut.length };
}
