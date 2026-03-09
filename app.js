
const fields = [
  ["Empresa","text","General","Nombre de la empresa","Libre"],
  ["Total Revenue (TTM)","number","Ratios > Statements","Ventas TTM","Base para crecimiento, FCF/ventas e inventarios/ventas"],
  ["Ventas año anterior","number","Manual / IBKR","Crecimiento YoY","Ingresar manualmente para crecimiento anual"],
  ["EBIT (TTM)","number","Ratios > Statements","Resultado operativo","Base para NOPAT y ROIC"],
  ["Tax Rate (LFY)","percent","Ratios > Statements","Tasa impositiva","Usar Tax Rate, no Tax Paid"],
  ["Total Current Assets (LFY)","number","Ratios > Statements","Activos corrientes","Para capital circulante"],
  ["Total Current Liabilities (LFY)","number","Ratios > Statements","Pasivos corrientes","Para capital circulante"],
  ["Total Inventory (LFY)","number","Ratios > Statements","Inventario","Para inventarios/ventas"],
  ["CSH (LFY)","number","Ratios > Statements","Caja","Para deuda neta y capital invertido"],
  ["Total Debt (LFY)","number","Ratios > Statements","Deuda total","Para deuda neta y capital invertido"],
  ["Total Equity (TTM) o Average Total Equity (TTM)","number","Ratios > Miscellaneous","Patrimonio","Preferir Total Equity; si no, Average Total Equity"],
  ["Free Cash Flow (LFY)","number","Ratios > Statements","Flujo de caja libre","Para FCF/ventas"],
  ["Net Debt - LFI (TTM)","number","Ratios > Statements","Deuda neta directa IBKR","Opcional, para comparar"],
  ["Free Op. Cash Flow/Rev. (TTM)","percent","Ratios > Profitability","FCF/ventas directo IBKR","Opcional, para validar"],
  ["Return On Avg Assets (TTM)","percent","Ratios > Management Effectiveness","ROA directo","Referencia"],
  ["Return On Avg Equity (TTM)","percent","Ratios > Management Effectiveness","ROE directo","Referencia"],
  ["Return On Investment (TTM)","percent","Ratios > Management Effectiveness","ROI (IBKR)","Comparar con ROIC aprox."],
  ["WACC","percent","Manual","Costo de capital","IBKR no lo muestra en estas pantallas"]
];

const fiveRows = [
  ["Revenue (Ventas)","number"],
  ["Free Cash Flow","number"],
  ["EBIT","number"],
  ["Tax Rate","percent"],
  ["FCF / Ventas","formula"]
];

const exampleKO = {
  "Empresa":"Coca-Cola",
  "Total Revenue (TTM)":47.94,
  "Ventas año anterior":47.06,
  "EBIT (TTM)":14.98,
  "Tax Rate (LFY)":17.88,
  "Total Current Assets (LFY)":31.04,
  "Total Current Liabilities (LFY)":21.28,
  "Total Inventory (LFY)":4.42,
  "CSH (LFY)":15.81,
  "Total Debt (LFY)":45.49,
  "Total Equity (TTM) o Average Total Equity (TTM)":28.64,
  "Free Cash Flow (LFY)":-3.48,
  "Net Debt - LFI (TTM)":29.69,
  "Free Op. Cash Flow/Rev. (TTM)":-7.27,
  "Return On Avg Assets (TTM)":12.79,
  "Return On Avg Equity (TTM)":45.97,
  "Return On Investment (TTM)":16.93,
  "WACC":8
};

const state = JSON.parse(localStorage.getItem("ibkr_analyzer_state") || "{}");
state.ibkr = state.ibkr || {};
state.five = state.five || {};

function save(){ localStorage.setItem("ibkr_analyzer_state", JSON.stringify(state)); }

function toNum(v){
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function fmtUSD(v){
  if (v == null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(v);
}
function fmtPct(v){
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(2) + "%";
}
function avg(arr){
  const vals = arr.filter(v => v != null && !Number.isNaN(v));
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
}

function renderIBKR(){
  const tb = document.querySelector("#ibkrTable tbody");
  const helpTb = document.querySelector("#helpTable");
  tb.innerHTML = "";
  helpTb.innerHTML = "";
  fields.forEach(([name,type,section,purpose,note])=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${name}</td><td></td><td>${type==="percent"?"%":type==="number"?"USD":"texto"}</td><td>${section}</td><td>${purpose}</td><td>${note}</td>`;
    const td = tr.children[1];
    const input = document.createElement("input");
    input.type = type === "text" ? "text" : "number";
    input.step = "any";
    input.value = state.ibkr[name] ?? "";
    input.addEventListener("input", e => {
      state.ibkr[name] = e.target.value;
      save();
      renderAll();
    });
    td.appendChild(input);
    tb.appendChild(tr);

    const trHelp = document.createElement("tr");
    trHelp.innerHTML = `<td>${name}</td><td>${section}</td><td>${purpose}</td>`;
    helpTb.appendChild(trHelp);
  });
}

function calculate(){
  const get = k => toNum(state.ibkr[k]);
  const sales = get("Total Revenue (TTM)");
  const salesPrev = get("Ventas año anterior");
  const ebit = get("EBIT (TTM)");
  const tax = get("Tax Rate (LFY)");
  const currentAssets = get("Total Current Assets (LFY)");
  const currentLiab = get("Total Current Liabilities (LFY)");
  const inventory = get("Total Inventory (LFY)");
  const cash = get("CSH (LFY)");
  const debt = get("Total Debt (LFY)");
  const equity = get("Total Equity (TTM) o Average Total Equity (TTM)");
  const fcf = get("Free Cash Flow (LFY)");
  const netDebtIbkr = get("Net Debt - LFI (TTM)");
  const fcfSalesIbkr = get("Free Op. Cash Flow/Rev. (TTM)");
  const roiIbkr = get("Return On Investment (TTM)");
  const roaIbkr = get("Return On Avg Assets (TTM)");
  const roeIbkr = get("Return On Avg Equity (TTM)");
  const wacc = get("WACC");

  const nwc = (currentAssets != null && currentLiab != null) ? currentAssets - currentLiab : null;
  const netDebt = (debt != null && cash != null) ? debt - cash : null;
  const invSales = (inventory != null && sales) ? inventory / sales * 100 : null;
  const fcfSales = (fcf != null && sales) ? fcf / sales * 100 : null;
  const growth = (sales != null && salesPrev) ? ((sales / salesPrev) - 1) * 100 : null;
  const nopat = (ebit != null && tax != null) ? ebit * (1 - tax / 100) : null;
  const capitalInv = (debt != null && equity != null && cash != null) ? debt + equity - cash : null;
  const roic = (nopat != null && capitalInv) ? nopat / capitalInv * 100 : null;
  const roicWacc = (roic != null && wacc != null) ? roic - wacc : null;
  const roicVsRoi = (roic != null && roiIbkr != null) ? roic - roiIbkr : null;

  return {
    empresa: state.ibkr["Empresa"] || "—",
    nwc, netDebt, invSales, fcfSales, growth, nopat, capitalInv, roic, roicWacc,
    roiIbkr, roaIbkr, roeIbkr, fcfSalesIbkr, netDebtIbkr, roicVsRoi
  };
}

function renderCalc(){
  const m = calculate();
  const rows = [
    ["Empresa", m.empresa, "texto", "Nombre", ""],
    ["Capital circulante neto", m.nwc, "USD", "Current Assets − Current Liabilities", m.nwc == null ? "" : (m.nwc > 0 ? "Positivo" : "Negativo")],
    ["Deuda neta", m.netDebt, "USD", "Total Debt − Cash", ""],
    ["Deuda neta (IBKR directa)", m.netDebtIbkr, "USD", "Net Debt - LFI (TTM)", "Comparación"],
    ["Inventarios / Ventas", m.invSales, "%", "Inventory ÷ Revenue", m.invSales == null ? "" : (m.invSales < 5 ? "Muy eficiente" : "Más intensivo")],
    ["FCF / Ventas", m.fcfSales, "%", "Free Cash Flow ÷ Revenue", ""],
    ["FCF / Ventas (IBKR directo)", m.fcfSalesIbkr, "%", "Free Op. Cash Flow/Rev. (TTM)", "Validación"],
    ["Crecimiento ingresos YoY", m.growth, "%", "Ventas TTM vs. año anterior", ""],
    ["NOPAT", m.nopat, "USD", "EBIT × (1 − Tax Rate)", ""],
    ["Capital invertido aprox.", m.capitalInv, "USD", "Debt + Equity − Cash", ""],
    ["ROIC aprox.", m.roic, "%", "NOPAT ÷ Capital invertido", ""],
    ["ROI (IBKR)", m.roiIbkr, "%", "Return On Investment (TTM)", ""],
    ["ROIC − WACC", m.roicWacc, "%", "ROIC aprox. − WACC", ""],
    ["ROIC aprox. − ROI (IBKR)", m.roicVsRoi, "%", "Comparación", ""],
    ["ROA (IBKR)", m.roaIbkr, "%", "Return On Avg Assets (TTM)", ""],
    ["ROE (IBKR)", m.roeIbkr, "%", "Return On Avg Equity (TTM)", ""]
  ];

  const tb = document.querySelector("#calcTable tbody");
  tb.innerHTML = "";
  rows.forEach(([label,val,unit,how,interp])=>{
    const tr = document.createElement("tr");
    let shown = "—";
    if (unit === "USD") shown = fmtUSD(val);
    else if (unit === "%") shown = fmtPct(val);
    else shown = val ?? "—";
    tr.innerHTML = `<td>${label}</td><td class="output">${shown}</td><td>${unit}</td><td>${how}</td><td>${interp}</td>`;
    tb.appendChild(tr);
  });
}

function renderFive(){
  const tb = document.querySelector("#fiveTable tbody");
  tb.innerHTML = "";
  fiveRows.forEach(([name,type])=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${name}</td>`;
    if (type === "formula"){
      const fcf = [0,1,2,3,4].map(i => toNum(state.five[`Free Cash Flow_${i}`]));
      const rev = [0,1,2,3,4].map(i => toNum(state.five[`Revenue (Ventas)_${i}`]));
      const ratios = fcf.map((f,i) => (f != null && rev[i]) ? f / rev[i] * 100 : null);
      ratios.forEach(v => tr.innerHTML += `<td class="output">${fmtPct(v)}</td>`);
      tr.innerHTML += `<td class="output">${fmtPct(avg(ratios))}</td>`;
    } else {
      [0,1,2,3,4].forEach(i=>{
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.type = "number";
        input.step = "any";
        input.value = state.five[`${name}_${i}`] ?? "";
        input.addEventListener("input", e=>{
          state.five[`${name}_${i}`] = e.target.value;
          save();
          renderAll();
        });
        td.appendChild(input);
        tr.appendChild(td);
      });
      const values = [0,1,2,3,4].map(i => toNum(state.five[`${name}_${i}`]));
      const tdAvg = document.createElement("td");
      tdAvg.className = "output";
      tdAvg.textContent = type === "percent" ? fmtPct(avg(values)) : fmtUSD(avg(values));
      tr.appendChild(tdAvg);
    }
    tb.appendChild(tr);
  });

  const rev0 = toNum(state.five["Revenue (Ventas)_0"]);
  const rev4 = toNum(state.five["Revenue (Ventas)_4"]);
  const cagr = (rev0 && rev4) ? ((rev4 / rev0) ** (1/4) - 1) * 100 : null;
  document.getElementById("cagr5").textContent = fmtPct(cagr);
}

function statusClass(kind, value){
  if (value == null) return "";
  if (kind === "roic") return value > 20 ? "ok" : value >= 15 ? "warn" : "bad";
  if (kind === "fcf") return value > 15 ? "ok" : value >= 10 ? "warn" : "bad";
  if (kind === "growth") return value > 10 ? "ok" : value >= 5 ? "warn" : "bad";
  if (kind === "debt") return value <= 0 ? "ok" : "warn";
  return "";
}

function renderSummary(){
  const m = calculate();
  const cards = [
    ["Empresa", m.empresa, "text", ""],
    ["ROIC aprox.", m.roic, "%", statusClass("roic", m.roic)],
    ["ROI (IBKR)", m.roiIbkr, "%", ""],
    ["FCF / Ventas", m.fcfSales, "%", statusClass("fcf", m.fcfSales)],
    ["FCF/Ventas IBKR", m.fcfSalesIbkr, "%", ""],
    ["Deuda neta", m.netDebt, "USD", statusClass("debt", m.netDebt)],
    ["Crec. ingresos YoY", m.growth, "%", statusClass("growth", m.growth)],
    ["Capital circulante neto", m.nwc, "USD", ""]
  ];

  const wrap = document.getElementById("summaryCards");
  wrap.innerHTML = "";
  cards.forEach(([label,val,unit,klass])=>{
    const div = document.createElement("div");
    div.className = `card ${klass}`;
    let shown = unit === "USD" ? fmtUSD(val) : unit === "%" ? fmtPct(val) : (val || "—");
    div.innerHTML = `<h3>${label}</h3><div class="metric">${shown}</div>`;
    wrap.appendChild(div);
  });

  let verdict = "Completar datos";
  let vClass = "";
  if ([m.roic, m.fcfSales, m.netDebt, m.growth].every(v => v != null && !Number.isNaN(v))){
    if (m.roic > 20 && m.fcfSales > 15 && m.netDebt <= 0 && m.growth > 10){
      verdict = "Empresa extraordinaria";
      vClass = "ok";
    } else if (m.roic > 15 && m.fcfSales > 10){
      verdict = "Empresa buena";
      vClass = "warn";
    } else {
      verdict = "Revisar mejor";
      vClass = "bad";
    }
  }
  const verdictEl = document.getElementById("verdict");
  verdictEl.textContent = verdict;
  verdictEl.className = `verdict ${vClass}`;

  const traffic = [
    ["ROIC aprox.", m.roic, m.roic > 20 ? "Verde" : m.roic >= 15 ? "Amarillo" : "Rojo"],
    ["FCF / Ventas", m.fcfSales, m.fcfSales > 15 ? "Verde" : m.fcfSales >= 10 ? "Amarillo" : "Rojo"],
    ["Deuda neta", m.netDebt, m.netDebt <= 0 ? "Verde" : "Amarillo"],
    ["Crec. ingresos YoY", m.growth, m.growth > 10 ? "Verde" : m.growth >= 5 ? "Amarillo" : "Rojo"]
  ];
  const ul = document.getElementById("trafficList");
  ul.innerHTML = "";
  traffic.forEach(([label,val,stat])=>{
    const li = document.createElement("li");
    li.textContent = `${label}: ${stat} (${label.includes("Deuda") ? fmtUSD(val) : fmtPct(val)})`;
    ul.appendChild(li);
  });
}

function renderAll(){
  renderIBKR();
  renderCalc();
  renderFive();
  renderSummary();
}

document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

document.getElementById("fillExample").addEventListener("click", ()=>{
  state.ibkr = {...state.ibkr, ...exampleKO};
  save();
  renderAll();
});

document.getElementById("clearAll").addEventListener("click", ()=>{
  state.ibkr = {};
  state.five = {};
  save();
  renderAll();
});

document.getElementById("exportJson").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ibkr_analyzer_data.json";
  a.click();
});

document.querySelector(".import-label").addEventListener("click", ()=>{
  document.getElementById("importJson").click();
});

document.getElementById("importJson").addEventListener("change", async (e)=>{
  const file = e.target.files[0];
  if (!file) return;
  const txt = await file.text();
  const obj = JSON.parse(txt);
  state.ibkr = obj.ibkr || {};
  state.five = obj.five || {};
  save();
  renderAll();
});

renderAll();
