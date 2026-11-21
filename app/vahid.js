// Vahid bəyannamə (muzdlu işlə əlaqədar ödəmə mənbəyində tutulmalar, kod _0901, rüblük). Yalnız oxuma.
// Sətir nömrələri ekrandakı rəqəmlərlə yoxlanıb (Bölmə 4 və Bölmə 3); Bölmə 2 sətirləri bəyannamədəki sıraya görə uyğunlaşdırılıb.
const _vSum = (ti, kod) => { const r = ((ti.mainTaxes || []).find((x) => x.indicator === kod)) || {}; return (Number(r.amountM1) || 0) + (Number(r.amountM2) || 0) + (Number(r.amountM3) || 0); };
const _vTap = (ti, bolme, kod) => ((ti[bolme] || []).find((x) => x.indicator === kod)) || {};
function vahidSehife(data) {
  const bas = (a) => a.map((v) => ({ v, s: S.BASLIQ }));
  const sut = ["Dövr", "Növ", "Status", "Qeydiyyat №", "Qeydiyyat tarixi", "Dövrün sonuncusu",
    "901 İşçilərin ümumi sayı (rüb üzrə orta)", "901.1 Faktiki işə cəlb olunan işçilərin sayı (rüb üzrə orta)",
    "902 Gəlirlər, cəmi", "902.1 Hesablanmış əmək haqqı və digər gəlirlər", "902.1.1 Əmək haqqının tərkibinə daxil olmayan gəlirlər",
    "902.2 İstifadə edilməmiş məzuniyyət kompensasiyası", "902.3 Həyatın yığım sığortasına cəlb olunmuş məbləğ",
    "903 Vergi güzəşt və azadolmaları", "904 MDSS-yə cəlb olunmayan gəlirlər", "905 İşsizlikdən sığortaya cəlb olunmayan gəlirlər", "905-1 İcbari tibbi sığortaya cəlb olunmayan gəlirlər",
    "906 Vergiyə cəlb edilən gəlir (rüb)", "906 Vergi məbləği (rüb)",
    "910.1.1 Sığortaedənin MDSS haqqı", "910.1.2 Sığortaolunanın MDSS haqqı", "910.1 MDSS haqqı, cəmi",
    "912.1 Sığortaedənin işsizlik haqqı", "912.2 Sığortaolunanın işsizlik haqqı", "912 İşsizlikdən sığorta haqqı, cəmi",
    "913 İcbari tibbi sığorta haqqına cəlb edilən gəlirlər", "914.1 Sığortalının icbari tibbi sığorta haqqı", "914.2 Sığortaolunanın icbari tibbi sığorta haqqı", "914 İcbari tibbi sığorta haqqı, cəmi"];
  const rows = data.map((d) => {
    const ti = d.base.taxInformation || {}, m = ti.employeeCount || [], f = ti.salary || [], g = ti.discount || [], h = _vTap(ti, "calculations", "_2001");
    const say = (k) => _p(_r2(_vTap(ti, "employeeCount", k).countQuarterly)), mebleg = (k) => _p(_r2(_vTap(ti, "salary", k).salaryQuarterly)), guz = (k) => _p(_r2(_vTap(ti, "discount", k).discountQuarterly));
    const r2 = (x) => Math.round(x * 100) / 100;
    const mdss1 = r2(_vSum(ti, "MDSS_INSURER_TAX_AMOUNT")), mdss2 = r2(_vSum(ti, "MDSS_INSURANT_TAX_AMOUNT")),
      iss1 = r2(_vSum(ti, "UNEMPLOYMENT_INSURER_TAX_AMOUNT")), iss2 = r2(_vSum(ti, "UNEMPLOYMENT_INSURANT_TAX_AMOUNT")),
      its1 = r2(_vSum(ti, "ITS_INSURER_TAX_AMOUNT")), its2 = r2(_vSum(ti, "ITS_INSURANT_TAX_AMOUNT"));
    return [_t(_omvDovr(d)), _t(BEY_NOV_AZ[d.nov] || d.nov || ""), _t(BEY_STATUS_AZ[d.status] || d.status || ""), _t(d.no),
      _t((d.reg || "").split("-").reverse().join(".")), _t(d.son ? "Bəli" : ""),
      say("_2901"), say("_2902"),
      mebleg("_1300"), mebleg("_1301"), mebleg("_1303"), mebleg("_1351"), mebleg("_1352"),
      guz("_2100"), guz("_1309"), guz("_1409"), guz("_1509"),
      _p(_r2(h.involvedAmountQuarterly)), _p(_r2(h.taxAmountQuarterly)),
      _p(mdss1), _p(mdss2), _p(r2(mdss1 + mdss2)),
      _p(iss1), _p(iss2), _p(r2(iss1 + iss2)),
      _p(_r2(_vTap(ti, "medicineCalculations", "_1670").calculatedAmountQuarterly)), _p(its1), _p(its2), _p(r2(its1 + its2))];
  });
  return { ad: "Vahid yığcam", rows: [bas(sut), ...rows], eni: [14, 18, 20, 18, 14, 12, ...sut.slice(6).map(() => 20)], dondur: true, suzgec: sut.length };
}
