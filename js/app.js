(() => {
  const CARS = window.PRECAR_CARS;
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const number = new Intl.NumberFormat("pt-BR");

  const FINANCE = [
    { name: "Webmotors + Santander", hint: "simular parcela", href: "https://www.webmotors.com.br/financiamento" },
    { name: "Banco BV", hint: "até 60x", href: "https://www.bv.com.br/financiamento/financiamento-de-veiculos" },
    { name: "Santander Financiamentos", hint: "CDC veículo", href: "https://www.santander.com.br/hotsite/santanderfinanciamentos/banco-do-auto.html" },
    { name: "Banco do Brasil", hint: "financiamento BB", href: "https://www.bb.com.br/site/pra-voce/financiamentos/financiamento-de-veiculos/" },
    { name: "Itaú", hint: "crédito veículo", href: "https://www.itau.com.br/credito-financiamento/financiamento-de-veiculos" },
    { name: "Banco Pan", hint: "entrada flexível", href: "https://www.bancopan.com.br/financiamento-de-veiculos" },
  ];

  const ANGLES = [
    { id: "front", label: "3/4 frente", ready: true },
    { id: "side", label: "Lateral", ready: false },
    { id: "rear", label: "Traseira", ready: false },
    { id: "cabin", label: "Interior", ready: false },
  ];

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
    sheet: document.getElementById("sheet"),
    sheetBody: document.getElementById("sheet-body"),
    toast: document.getElementById("toast"),
  };

  const state = { budget: null, col: "mid", filter: "all", sort: "match", photo: 0 };
  const SORTS = new Set(["match", "price-asc", "price-desc", "econ", "power"]);
  const SORT_LABEL = {
    match: "Mais perto do valor",
    "price-asc": "Menor preço",
    "price-desc": "Maior preço",
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
    else if (state.sort === "econ") copy.sort((a, b) => consumeNum(b) - consumeNum(a));
    else if (state.sort === "power") copy.sort((a, b) => powerNum(b) - powerNum(a));
    else copy.sort((a, b) => Math.abs(a.price - budget) - Math.abs(b.price - budget));
    return copy;
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
    return `
      <article class="card" data-slug="${car.slug}">
        <div class="photo">
          <img src="${car.image}" alt="${car.brand} ${car.model} ${car.year}" width="800" height="600" ${eager ? "" : 'loading="lazy"'} decoding="async" onerror="this.onerror=null;this.src='images/cars/fallback.svg'">
          <span class="badge ${badgeCls}">${badge} · ${car.year}</span>
          <button class="share-mini" type="button" data-share="${car.slug}" aria-label="Compartilhar ${car.model}">${SHARE}</button>
        </div>
        <div class="body">
          <p class="brand-name">${car.brand}</p>
          <h4 class="model">${car.model}</h4>
          <div class="price">
            <strong>${money.format(car.price)}</strong>
            <span class="delta ${d.cls}">${d.text}</span>
          </div>
          <div class="specs">
            <div class="spec"><b>${car.consumption}</b><span>${consumeLabel(car)}</span></div>
            <div class="spec"><b>${car.power}</b><span>potência</span></div>
            <div class="spec"><b>${car.trunk}</b><span>porta-malas</span></div>
            <div class="spec"><b>${car.transmission}</b><span>câmbio</span></div>
            <div class="spec"><b>${car.fuel}</b><span>combustível</span></div>
            <div class="spec"><b>${money.format(month)}</b><span>60x ilustrativo</span></div>
          </div>
          <div class="actions">
            <a href="${offerUrl(car)}" target="_blank" rel="noopener noreferrer">Ver ofertas</a>
            <button class="more" type="button" data-open="${car.slug}">Detalhe</button>
          </div>
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
    const show = (index) => {
      state.photo = index;
      const angle = ANGLES[index];
      stage.src = car.image;
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
    els.sheetBody.innerHTML = `
      <div class="gallery">
        <div class="gallery-main">
          <img data-stage src="${car.image}" alt="${car.brand} ${car.model}" onerror="this.onerror=null;this.src='images/cars/fallback.svg'">
          <span class="soon-tag" data-soon hidden></span>
        </div>
        <div class="thumbs">
          ${ANGLES.map((a, i) => `
            <button type="button" data-angle="${i}" class="${i === 0 ? "is-on" : ""}" aria-label="${a.label}">
              <img src="${car.image}" alt="">
              <span>${a.label}</span>
            </button>`).join("")}
        </div>
      </div>
      <div class="sheet-content">
        <div class="sheet-top">
          <div>
            <p class="brand-name">${car.brand} · ${car.condition === "0km" ? "0 km" : "Seminovo"} · ${car.year}</p>
            <h3 class="model">${car.model}</h3>
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
          <a href="${offerUrl(car)}" target="_blank" rel="noopener noreferrer">Ver ofertas na Webmotors</a>
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

  function render() {
    const route = readRoute();
    state.filter = readFilter();
    state.sort = readSort();

    if (route.view === "home") {
      state.budget = null;
      els.home.hidden = false;
      els.results.hidden = true;
      els.topbar.hidden = true;
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
    }
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

  render();
})();
