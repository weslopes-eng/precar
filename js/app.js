(() => {
  let CARS = window.PRECAR_CARS;
  const CITIES = window.PRECAR_CITIES;
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const number = new Intl.NumberFormat("pt-BR");
  const KM_MONTH = 1000;
  const GAS_PRICE = 6.2;
  const KWH_PRICE = 0.9;

  const FINANCE = [
    { name: "Webmotors + Santander", hint: "simular parcela", href: "https://www.webmotors.com.br/financiamento" },
    { name: "Banco BV", hint: "até 60x", href: "https://www.bv.com.br/financiamento/financiamento-de-veiculos" },
    { name: "Santander Financiamentos", hint: "CDC veículo", href: "https://www.santander.com.br/hotsite/santanderfinanciamentos/banco-do-auto.html" },
    { name: "Banco do Brasil", hint: "financiamento BB", href: "https://www.bb.com.br/site/pra-voce/financiamentos/financiamento-de-veiculos/" },
    { name: "Itaú", hint: "crédito veículo", href: "https://www.itau.com.br/credito-financiamento/financiamento-de-veiculos" },
    { name: "Banco Pan", hint: "entrada flexível", href: "https://www.bancopan.com.br/financiamento-de-veiculos" },
  ];

  function carAngles(car) {
    const photos = car.photos || {};
    return [
      { id: "front", label: "3/4 frente", src: photos.front || car.image, ready: !!(photos.front || car.image) },
      { id: "side", label: "Lateral", src: photos.side, ready: !!photos.side },
      { id: "rear", label: "Traseira", src: photos.rear, ready: !!photos.rear },
      { id: "cabin", label: "Interior", src: photos.cabin, ready: !!photos.cabin },
    ];
  }

  function mapRemoteCar(row) {
    return {
      ...row,
      photos: row.photos || {},
      image: row.image || (row.photos && row.photos.front) || "",
    };
  }

  async function loadRemoteCars() {
    const cfg = window.PRECAR_SUPABASE || {};
    const key = cfg.anonKey || localStorage.getItem("precar-anon-key") || "";
    if (!cfg.url || !key || !window.supabase) return;
    try {
      const sb = window.supabase.createClient(cfg.url, key);
      const { data, error } = await sb.from("cars").select("*").eq("published", true).order("price");
      if (!error && data && data.length) CARS = data.map(mapRemoteCar);
    } catch (_) {
      /* fica o catálogo local */
    }
  }

  const els = {
    home: document.getElementById("home"),
    results: document.getElementById("results"),
    homeForm: document.getElementById("home-search"),
    homeInput: document.getElementById("home-input"),
    chips: document.getElementById("chips"),
    board: document.getElementById("board"),
    tabs: document.getElementById("tabs"),
    filters: document.getElementById("filters"),
    summaryTitle: document.getElementById("summary-title"),
    summaryRange: document.getElementById("summary-range"),
    sharePage: document.getElementById("share-page"),
    topbar: document.getElementById("topbar"),
    floatForm: document.getElementById("float-search"),
    floatInput: document.getElementById("float-input"),
    sort: document.getElementById("sort"),
    city: document.getElementById("city"),
    locate: document.getElementById("locate"),
    sheet: document.getElementById("sheet"),
    sheetBody: document.getElementById("sheet-body"),
    toast: document.getElementById("toast"),
    compareDock: document.getElementById("compare-dock"),
    compareCount: document.getElementById("compare-count"),
    compareThumbs: document.getElementById("compare-thumbs"),
    compareGo: document.getElementById("compare-go"),
    compareClear: document.getElementById("compare-clear"),
    compareSheet: document.getElementById("compare-sheet"),
    compareBody: document.getElementById("compare-body"),
  };

  const state = {
    budget: null,
    col: "mid",
    filter: "all",
    sort: "match",
    photo: 0,
    city: localStorage.getItem("precar-city") || "",
    compare: JSON.parse(sessionStorage.getItem("precar-compare") || "[]"),
  };
  const SORTS = new Set(["match", "price-asc", "price-desc", "cost", "econ", "power"]);
  const SORT_LABEL = {
    match: "Mais perto do valor",
    "price-asc": "Menor preço",
    "price-desc": "Maior preço",
    cost: "Menor custo mensal",
    econ: "Mais econômico",
    power: "Mais potente",
  };

  const SHARE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 8.5a3 3 0 1 0-2.7-4.2L8.2 6.6a3 3 0 1 0 0 3.8l4.1 2.3a3 3 0 1 0 .9-1.6L9.1 8.8a3.1 3.1 0 0 0 0-1.6l4.1-2.3c.4.4.9.6 1.5.6Z" fill="currentColor"/></svg>`;

  function parseTyped(raw) {
    if (!raw) return null;
    const clean = String(raw).toLowerCase().replace(/\s/g, "").replace("r$", "").replace("mil", "k");
    const n = Number(clean.replace(/\./g, "").replace(",", ".").replace("k", ""));
    if (!Number.isFinite(n) || n <= 0) return null;
    if (clean.endsWith("k")) return Math.round(n * 1000);
    if (n < 1000) return Math.round(n * 1000);
    return Math.round(n);
  }

  function formatInput(n) {
    return number.format(n);
  }

  function priceSlug(n) {
    return n % 1000 === 0 ? `${n / 1000}-mil` : String(n);
  }

  function parseSlug(s) {
    if (!s) return null;
    if (s.endsWith("-mil")) return Number(s.replace("-mil", "")) * 1000;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function readFilter() {
    const c = new URLSearchParams(location.search).get("c");
    return c === "0km" || c === "seminovo" ? c : "all";
  }

  function readSort() {
    const s = new URLSearchParams(location.search).get("s");
    return SORTS.has(s) ? s : "match";
  }

  function writeParams({ filter, sort } = {}) {
    const url = new URL(location.href);
    const nextFilter = filter === undefined ? state.filter : filter;
    const nextSort = sort === undefined ? state.sort : sort;
    if (!nextFilter || nextFilter === "all") url.searchParams.delete("c");
    else url.searchParams.set("c", nextFilter);
    if (!nextSort || nextSort === "match") url.searchParams.delete("s");
    else url.searchParams.set("s", nextSort);
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function consumeNum(car) {
    const n = Number(String(car.consumption).replace(",", ".").replace(/[^\d.]/g, ""));
    if (car.fuel === "Elétrico") return 99;
    return Number.isFinite(n) ? n : 0;
  }

  function powerNum(car) {
    return Number(String(car.power).replace(/\D/g, "")) || 0;
  }

  function sortCars(list, budget) {
    const copy = [...list];
    if (state.sort === "price-asc") copy.sort((a, b) => a.price - b.price);
    else if (state.sort === "price-desc") copy.sort((a, b) => b.price - a.price);
    else if (state.sort === "cost") copy.sort((a, b) => ownership(a).month - ownership(b).month);
    else if (state.sort === "econ") copy.sort((a, b) => consumeNum(b) - consumeNum(a));
    else if (state.sort === "power") copy.sort((a, b) => powerNum(b) - powerNum(a));
    else copy.sort((a, b) => Math.abs(a.price - budget) - Math.abs(b.price - budget));
    return copy;
  }

  function currentCity() {
    return CITIES.find((c) => c.id === state.city) || CITIES[0];
  }

  function monthlyFuel(car) {
    if (car.fuel === "Elétrico") return (KM_MONTH / 100) * 12 * KWH_PRICE;
    const kml = consumeNum(car);
    if (!kml) return 0;
    return (KM_MONTH / kml) * GAS_PRICE;
  }

  function ownership(car) {
    const rate = currentCity().ipva || 0.04;
    const ipva = car.price * rate;
    let ins = 0.05;
    if (car.body === "suv" || car.body === "picape") ins = 0.06;
    if (car.price >= 180000) ins += 0.01;
    if (car.fuel === "Elétrico") ins += 0.005;
    const insurance = car.price * ins;
    const fuelMonth = monthlyFuel(car);
    return {
      ipva,
      insurance,
      fuelMonth,
      month: ipva / 12 + insurance / 12 + fuelMonth,
    };
  }

  function saveCompare() {
    sessionStorage.setItem("precar-compare", JSON.stringify(state.compare));
  }

  function routeTo(budget, carSlug) {
    const hash = carSlug ? `#/${priceSlug(budget)}/${carSlug}` : `#/${priceSlug(budget)}`;
    const next = location.pathname + location.search + hash;
    if (location.pathname + location.search + location.hash !== next) location.hash = hash;
    else render();
  }

  function readRoute() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (!parts.length) return { view: "home" };
    const budget = parseSlug(parts[0]);
    if (!budget) return { view: "home" };
    return { view: "results", budget, slug: parts[1] || null };
  }

  function pool() {
    if (state.filter === "0km") return CARS.filter((c) => c.condition === "0km");
    if (state.filter === "seminovo") return CARS.filter((c) => c.condition === "seminovo");
    return CARS;
  }

  function pickCars(budget) {
    const source = pool();
    let windowPct = 0.15;
    let list = [];
    while (windowPct <= 0.28 && list.length < 5) {
      const lo = budget * (1 - windowPct);
      const hi = budget * (1 + windowPct);
      list = source.filter((c) => c.price >= lo && c.price <= hi);
      windowPct += 0.05;
    }
    if (list.length < 5) {
      list = [...source].sort((a, b) => Math.abs(a.price - budget) - Math.abs(b.price - budget)).slice(0, 6);
    }
    list = sortCars(list, budget);
    const seen = new Set();
    const unique = [];
    for (const car of list) {
      const key = `${car.brand}-${car.model}-${car.condition}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(car);
    }
    return unique;
  }

  function bucketize(cars, budget) {
    const buckets = { below: [], mid: [], above: [] };
    for (const car of cars) {
      const r = car.price / budget;
      if (r < 0.96) buckets.below.push(car);
      else if (r <= 1.04) buckets.mid.push(car);
      else buckets.above.push(car);
    }
    return buckets;
  }

  function deltaLabel(car, budget) {
    const d = car.price - budget;
    if (Math.abs(d) <= budget * 0.015) return { text: "No seu valor", cls: "eq" };
    if (d < 0) return { text: `${money.format(-d)} abaixo`, cls: "" };
    return { text: `${money.format(d)} acima`, cls: "up" };
  }

  function consumeLabel(car) {
    return car.fuel === "Elétrico" ? "autonomia" : "km/l cidade";
  }

  function offerUrl(car) {
    const kind = car.condition === "0km" ? "carros-novos" : "carros-usados";
    const city = currentCity();
    if (city.slug) return `https://www.webmotors.com.br/carros/${city.slug}/${car.wm}`;
    return `https://www.webmotors.com.br/${kind}/estoque/${car.wm}`;
  }

  function pmt(amount, months, rate = 0.018) {
    const i = rate;
    return amount * (i * Math.pow(1 + i, months)) / (Math.pow(1 + i, months) - 1);
  }

  function parcels(price) {
    const financed = price * 0.8;
    return {
      m48: pmt(financed, 48),
      m60: pmt(financed, 60),
    };
  }

  function cardHTML(car, budget, eager) {
    const d = deltaLabel(car, budget);
    const badge = car.condition === "0km" ? "0 km" : "Seminovo";
    const badgeCls = car.condition === "0km" ? "new" : "used";
    const month = parcels(car.price).m60;
    const own = ownership(car);
    const picked = state.compare.includes(car.slug);
    return `
      <article class="card ${picked ? "is-picked" : ""}" data-slug="${car.slug}">
        <div class="photo">
          <img src="${car.image}" alt="${car.brand} ${car.model} ${car.year}" width="800" height="600" ${eager ? "" : 'loading="lazy"'} decoding="async" onerror="this.onerror=null;this.src='images/cars/fallback.svg'">
          <span class="badge ${badgeCls}">${badge} · ${car.year}</span>
          <button class="share-mini" type="button" data-share="${car.slug}" aria-label="Compartilhar ${car.model}">${SHARE}</button>
        </div>
        <div class="body">
          <div class="card-top">
            <div>
              <p class="brand-name">${car.brand}</p>
              <h4 class="model">${car.model}</h4>
              ${car.version ? `<p class="version">${car.version}</p>` : ""}
            </div>
            <div class="price-spot">
              <strong>${money.format(car.price)}</strong>
              <span class="delta ${d.cls}">${d.text}</span>
            </div>
          </div>
          <p class="own"><b>${money.format(own.month)}/mês</b><span>IPVA + seguro + combustível · 1.000 km</span></p>
          <div class="specs">
            <div class="spec"><b>${car.consumption}</b><span>${consumeLabel(car)}</span></div>
            <div class="spec"><b>${car.power}</b><span>potência</span></div>
            <div class="spec"><b>${car.trunk}</b><span>porta-malas</span></div>
            <div class="spec"><b>${car.transmission}</b><span>câmbio</span></div>
            <div class="spec"><b>${car.fuel}</b><span>combustível</span></div>
            <div class="spec"><b>${money.format(month)}</b><span>60x ilustrativo</span></div>
          </div>
          <div class="actions">
            <a href="${offerUrl(car)}" target="_blank" rel="noopener noreferrer">${currentCity().slug ? "Ofertas na cidade" : "Ver ofertas"}</a>
            <button class="more" type="button" data-open="${car.slug}">Detalhe</button>
          </div>
          <button class="pick ${picked ? "is-on" : ""}" type="button" data-compare="${car.slug}">${picked ? "Na comparação" : "Comparar"}</button>
        </div>
      </article>`;
  }

  function colHTML(id, title, hint, cars, budget) {
    if (!cars.length) return "";
    const hidden = window.matchMedia("(max-width: 720px)").matches && state.col !== id ? "hidden" : "";
    return `<section class="col ${id}" data-col="${id}" ${hidden}>
      <h3>${title}<em>${hint}</em></h3>
      <div class="grid">${cars.map((c, i) => cardHTML(c, budget, i < 3)).join("")}</div>
    </section>`;
  }

  function pageUrl(budget, slug) {
    const url = new URL(location.href);
    url.hash = slug ? `/${priceSlug(budget)}/${slug}` : `/${priceSlug(budget)}`;
    return url.toString();
  }

  async function share(title, text, url) {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado");
    } catch {
      toast(url);
    }
  }

  let toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("on"), 2200);
  }

  function bindGallery(car) {
    const stage = els.sheet.querySelector("[data-stage]");
    const tag = els.sheet.querySelector("[data-soon]");
    const thumbs = [...els.sheet.querySelectorAll("[data-angle]")];
    const angles = carAngles(car);
    const show = (index) => {
      state.photo = index;
      const angle = angles[index];
      stage.src = angle.src || car.image || "images/cars/fallback.svg";
      stage.alt = `${car.brand} ${car.model} — ${angle.label}`;
      tag.hidden = angle.ready;
      tag.textContent = angle.ready ? "" : `${angle.label} · foto real em breve`;
      thumbs.forEach((btn, i) => btn.classList.toggle("is-on", i === index));
    };
    thumbs.forEach((btn) => {
      btn.onclick = () => show(Number(btn.dataset.angle));
    });
    show(0);
  }

  function openSheet(car, budget) {
    const d = deltaLabel(car, budget);
    const pay = parcels(car.price);
    const own = ownership(car);
    const city = currentCity();
    els.sheetBody.innerHTML = `
      <div class="gallery">
        <div class="gallery-main">
          <img data-stage src="${car.image}" alt="${car.brand} ${car.model}" onerror="this.onerror=null;this.src='images/cars/fallback.svg'">
          <span class="soon-tag" data-soon hidden></span>
        </div>
        <div class="thumbs">
          ${carAngles(car).map((a, i) => `
            <button type="button" data-angle="${i}" class="${i === 0 ? "is-on" : ""}" aria-label="${a.label}">
              <img src="${a.src || car.image || "images/cars/fallback.svg"}" alt="">
              <span>${a.label}</span>
            </button>`).join("")}
        </div>
      </div>
      <div class="sheet-content">
        <div class="sheet-top">
          <div>
            <p class="brand-name">${car.brand} · ${car.condition === "0km" ? "0 km" : "Seminovo"} · ${car.year}</p>
            <h3 class="model">${car.model}</h3>
            ${car.version ? `<p class="version">${car.version}</p>` : ""}
            <div class="price"><strong>${money.format(car.price)}</strong><span class="delta ${d.cls}">${d.text}</span></div>
          </div>
          <button class="close" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="specs">
          <div class="spec"><b>${car.consumption}</b><span>${consumeLabel(car)}</span></div>
          <div class="spec"><b>${car.power}</b><span>potência</span></div>
          <div class="spec"><b>${car.trunk}</b><span>porta-malas</span></div>
          <div class="spec"><b>${car.transmission}</b><span>câmbio</span></div>
          <div class="spec"><b>${car.fuel}</b><span>combustível</span></div>
          <div class="spec"><b>${car.body}</b><span>carroceria</span></div>
        </div>
        <div class="finance">
          <h4>Custo de ter${city.uf ? ` · ${city.uf}` : ""}</h4>
          <div class="parcels">
            <div class="parcel"><b>${money.format(own.ipva)}</b><span>IPVA ao ano</span></div>
            <div class="parcel"><b>${money.format(own.insurance)}</b><span>seguro estimado / ano</span></div>
            <div class="parcel"><b>${money.format(own.fuelMonth)}</b><span>combustível / mês</span></div>
            <div class="parcel"><b>${money.format(own.month)}</b><span>total / mês</span></div>
          </div>
          <p class="note">Estimativa para 1.000 km/mês. IPVA pela alíquota do estado${city.uf ? ` (${city.uf})` : ""}. Seguro é perfil médio — sua cotação pode ser outra.</p>
        </div>
        <div class="finance">
          <h4>Financiar</h4>
          <div class="parcels">
            <div class="parcel"><b>${money.format(pay.m48)}</b><span>48x · 20% de entrada</span></div>
            <div class="parcel"><b>${money.format(pay.m60)}</b><span>60x · 20% de entrada</span></div>
          </div>
          <p class="note">Simulação ilustrativa com taxa média de mercado (1,8% a.m.). Cada banco confirma a parcela na hora.</p>
          <div class="lenders">
            ${FINANCE.map((f) => `<a href="${f.href}" target="_blank" rel="noopener noreferrer">${f.name}<small>${f.hint}</small></a>`).join("")}
          </div>
        </div>
        <div class="offers">
          <a href="${offerUrl(car)}" target="_blank" rel="noopener noreferrer">${city.slug ? `Ver ofertas em ${city.name}` : "Ver ofertas na Webmotors"}</a>
          <a class="alt" href="https://lista.mercadolivre.com.br/${encodeURIComponent(car.brand + " " + car.model)}" target="_blank" rel="noopener noreferrer">Buscar no Mercado Livre</a>
          <button class="ghost" type="button" id="share-car">Compartilhar este carro</button>
        </div>
      </div>`;
    if (!els.sheet.open) els.sheet.showModal();
    els.sheet.querySelector(".close").onclick = () => els.sheet.close();
    document.getElementById("share-car").onclick = () => {
      share(`${car.brand} ${car.model} no Precar`, `${car.brand} ${car.model} por ${money.format(car.price)} — cabe no seu valor?`, pageUrl(budget, car.slug));
    };
    bindGallery(car);
  }

  function fillCities() {
    els.city.innerHTML = CITIES.map((c) => `<option value="${c.id}">${c.name}${c.uf ? " · " + c.uf : ""}</option>`).join("");
    els.city.value = state.city;
  }

  function updateCompareDock() {
    const cars = state.compare.map((slug) => CARS.find((c) => c.slug === slug)).filter(Boolean);
    els.compareDock.hidden = cars.length === 0;
    els.compareCount.textContent = cars.length === 1 ? "1 selecionado" : `${cars.length} selecionados`;
    els.compareThumbs.innerHTML = cars.map((c) => `<img src="${c.image}" alt="${c.model}">`).join("");
    els.compareGo.disabled = cars.length < 2;
    els.compareGo.textContent = cars.length < 2 ? "Comparar" : `Comparar ${cars.length}`;
  }

  function toggleCompare(slug) {
    const i = state.compare.indexOf(slug);
    if (i >= 0) state.compare.splice(i, 1);
    else if (state.compare.length >= 3) return toast("Compare até 3 carros");
    else state.compare.push(slug);
    saveCompare();
    updateCompareDock();
    if (state.budget) render();
  }

  function bestClass(values, value, mode) {
    const nums = values.filter((v) => Number.isFinite(v));
    if (!nums.length) return "";
    const target = mode === "min" ? Math.min(...nums) : Math.max(...nums);
    return value === target ? "best" : "";
  }

  function openCompare() {
    const cars = state.compare.map((slug) => CARS.find((c) => c.slug === slug)).filter(Boolean);
    if (cars.length < 2) return;
    const owns = cars.map(ownership);
    const fuels = cars.map(consumeNum);
    const powers = cars.map(powerNum);
    const prices = cars.map((c) => c.price);
    const months = owns.map((o) => o.month);
    const trunks = cars.map((c) => Number(String(c.trunk).replace(/\D/g, "")) || 0);
    const row = (label, cells) => `<tr><th>${label}</th>${cells}</tr>`;
    els.compareBody.innerHTML = `
      <div class="compare-head">
        <h3 class="model">Compare estes ${cars.length}</h3>
        <button class="close" type="button" aria-label="Fechar">×</button>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th></th>
              ${cars.map((c) => `<th>
                <img src="${c.image}" alt="">
                ${c.brand}<br>${c.model}
                ${c.version ? `<div class="version">${c.version}</div>` : ""}
              </th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${row("Preço", cars.map((c, i) => `<td class="${bestClass(prices, c.price, "min")}">${money.format(c.price)}</td>`).join(""))}
            ${row("Condição", cars.map((c) => `<td>${c.condition === "0km" ? "0 km" : "Seminovo"} · ${c.year}</td>`).join(""))}
            ${row("Versão", cars.map((c) => `<td>${c.version || "—"}</td>`).join(""))}
            ${row("Custo / mês", owns.map((o) => `<td class="${bestClass(months, o.month, "min")}">${money.format(o.month)}</td>`).join(""))}
            ${row("IPVA / ano", owns.map((o) => `<td>${money.format(o.ipva)}</td>`).join(""))}
            ${row("Seguro / ano", owns.map((o) => `<td>${money.format(o.insurance)}</td>`).join(""))}
            ${row("Combustível / mês", owns.map((o) => `<td>${money.format(o.fuelMonth)}</td>`).join(""))}
            ${row("Consumo", cars.map((c, i) => `<td class="${c.fuel === "Elétrico" ? "" : bestClass(fuels, fuels[i], "max")}">${c.consumption} <small>${consumeLabel(c)}</small></td>`).join(""))}
            ${row("Potência", cars.map((c, i) => `<td class="${bestClass(powers, powers[i], "max")}">${c.power}</td>`).join(""))}
            ${row("Porta-malas", cars.map((c, i) => `<td class="${bestClass(trunks, trunks[i], "max")}">${c.trunk}</td>`).join(""))}
            ${row("Câmbio", cars.map((c) => `<td>${c.transmission}</td>`).join(""))}
            ${row("Combustível", cars.map((c) => `<td>${c.fuel}</td>`).join(""))}
            ${row("Carroceria", cars.map((c) => `<td>${c.body}</td>`).join(""))}
            ${row("Ofertas", cars.map((c) => `<td><a href="${offerUrl(c)}" target="_blank" rel="noopener noreferrer">${currentCity().slug ? currentCity().name : "Ver ofertas"}</a></td>`).join(""))}
          </tbody>
        </table>
      </div>`;
    if (!els.compareSheet.open) els.compareSheet.showModal();
    els.compareSheet.querySelector(".close").onclick = () => els.compareSheet.close();
  }

  function render() {
    const route = readRoute();
    state.filter = readFilter();
    state.sort = readSort();

    if (route.view === "home") {
      state.budget = null;
      els.home.hidden = false;
      els.results.hidden = true;
      els.topbar.hidden = true;
      els.compareDock.hidden = true;
      document.title = "Precar — o preço antes do carro";
      return;
    }

    state.budget = route.budget;
    const cars = pickCars(route.budget);
    const buckets = bucketize(cars, route.budget);
    const lo = Math.round(route.budget * 0.85);
    const hi = Math.round(route.budget * 1.15);

    els.home.hidden = true;
    els.results.hidden = false;
    els.topbar.hidden = false;
    els.floatInput.value = formatInput(route.budget);
    els.sort.value = state.sort;
    fillCities();
    els.summaryTitle.textContent = `Com ${money.format(route.budget)} você alcança estes modelos`;
    els.summaryRange.textContent = `Faixa de ${money.format(lo)} a ${money.format(hi)} · ±15% · ${cars.length} opções`;
    document.title = `Carros em ${money.format(route.budget)} · Precar`;

    els.filters.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.classList.toggle("is-on", btn.dataset.filter === state.filter);
    });

    const grouped = state.sort === "match";
    els.tabs.hidden = !grouped;

    if (grouped) {
      if (window.matchMedia("(max-width: 720px)").matches && !buckets[state.col].length) {
        state.col = ["mid", "below", "above"].find((k) => buckets[k].length) || "mid";
      }
      els.tabs.querySelectorAll("button").forEach((btn) => {
        const col = btn.dataset.col;
        btn.classList.toggle("is-on", col === state.col);
        btn.querySelector("span").textContent = buckets[col].length;
      });
      const html = [
        colHTML("mid", "No seu valor", money.format(route.budget), buckets.mid, route.budget),
        colHTML("below", "Um pouco menos", money.format(lo), buckets.below, route.budget),
        colHTML("above", "Vale esticar", money.format(hi), buckets.above, route.budget),
      ].join("");
      els.board.innerHTML = html || `<p class="empty">Nenhum modelo neste filtro. Tente Todos.</p>`;
    } else {
      const html = cars.length
        ? `<section class="col"><h3>Organizado por<em>${SORT_LABEL[state.sort]}</em></h3><div class="grid">${cars.map((c, i) => cardHTML(c, route.budget, i < 3)).join("")}</div></section>`
        : `<p class="empty">Nenhum modelo neste filtro. Tente Todos.</p>`;
      els.board.innerHTML = html;
    }

    if (route.slug) {
      const car = CARS.find((c) => c.slug === route.slug);
      if (car) {
        const card = els.board.querySelector(`[data-slug="${car.slug}"]`);
        if (card) card.classList.add("is-open");
        openSheet(car, route.budget);
      }
    } else if (els.sheet.open) {
      els.sheet.close();
    }
    updateCompareDock();
  }

  function bindInput(input) {
    input.addEventListener("input", () => {
      const digits = input.value.replace(/\D/g, "");
      if (!digits) {
        input.value = "";
        return;
      }
      input.value = formatInput(Number(digits));
    });
  }

  els.homeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = parseTyped(els.homeInput.value);
    if (!n) return toast("Digite um valor");
    routeTo(n);
  });

  els.chips.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (btn) routeTo(Number(btn.dataset.value));
  });

  els.tabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.col = btn.dataset.col;
    render();
  });

  els.filters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    writeParams({ filter: btn.dataset.filter });
    render();
  });

  els.sort.addEventListener("change", () => {
    writeParams({ sort: els.sort.value });
    render();
  });

  els.floatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = parseTyped(els.floatInput.value);
    if (!n) return toast("Digite um valor");
    routeTo(n);
  });

  els.board.addEventListener("click", (e) => {
    const shareBtn = e.target.closest("[data-share]");
    if (shareBtn) {
      const car = CARS.find((c) => c.slug === shareBtn.dataset.share);
      if (car) share(`${car.brand} ${car.model} no Precar`, `${car.brand} ${car.model} por ${money.format(car.price)}`, pageUrl(state.budget, car.slug));
      return;
    }
    const more = e.target.closest("[data-open]");
    if (more) {
      routeTo(state.budget, more.dataset.open);
      return;
    }
    const cmp = e.target.closest("[data-compare]");
    if (cmp) toggleCompare(cmp.dataset.compare);
  });

  els.city.addEventListener("change", () => {
    state.city = els.city.value;
    localStorage.setItem("precar-city", state.city);
    if (state.budget) render();
  });

  els.locate.addEventListener("click", () => {
    if (!navigator.geolocation) return toast("Seu navegador não informa localização");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`;
        const data = await fetch(url, { headers: { Accept: "application/json" } }).then((r) => r.json());
        const raw = `${data.address.city || ""} ${data.address.town || ""} ${data.address.municipality || ""} ${data.address.state || ""}`.toLowerCase();
        const fold = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const city = CITIES.find((c) => c.id && fold(raw).includes(fold(c.name)));
        if (!city) return toast("Não achei sua cidade na lista. Escolha no menu.");
        state.city = city.id;
        localStorage.setItem("precar-city", city.id);
        toast(`Ofertas em ${city.name}`);
        if (state.budget) render();
      } catch {
        toast("Não deu para localizar. Escolha a cidade.");
      }
    }, () => toast("Permissão de localização negada"), { timeout: 8000 });
  });

  els.compareGo.addEventListener("click", openCompare);
  els.compareClear.addEventListener("click", () => {
    state.compare = [];
    saveCompare();
    updateCompareDock();
    if (state.budget) render();
  });
  els.compareSheet.addEventListener("click", (e) => {
    if (e.target === els.compareSheet) els.compareSheet.close();
  });

  els.sharePage.addEventListener("click", () => {
    share("Precar", `O que cabe em ${money.format(state.budget)}?`, pageUrl(state.budget));
  });

  els.sheet.addEventListener("click", (e) => {
    if (e.target === els.sheet) els.sheet.close();
  });

  els.sheet.addEventListener("close", () => {
    const route = readRoute();
    if (route.slug) history.replaceState(null, "", location.pathname + location.search + `#/${priceSlug(route.budget)}`);
  });

  bindInput(els.homeInput);
  bindInput(els.floatInput);
  window.addEventListener("hashchange", render);
  window.addEventListener("popstate", render);
  window.addEventListener("resize", () => {
    if (state.budget) render();
  });

  let touchX = null;
  els.board.addEventListener("touchstart", (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  els.board.addEventListener("touchend", (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    const order = ["mid", "below", "above"];
    const i = order.indexOf(state.col);
    if (dx < -50 && i < 2) { state.col = order[i + 1]; render(); }
    if (dx > 50 && i > 0) { state.col = order[i - 1]; render(); }
  }, { passive: true });

  loadRemoteCars().then(render);
})();
