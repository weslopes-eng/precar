(() => {
  const cfg = window.PRECAR_SUPABASE || {};
  const storedKey = localStorage.getItem("precar-anon-key") || "";
  const anonKey = cfg.anonKey || storedKey;
  const els = {
    setup: document.getElementById("setup"),
    login: document.getElementById("login"),
    app: document.getElementById("app"),
    setupKey: document.getElementById("setup-key"),
    setupSave: document.getElementById("setup-save"),
    loginForm: document.getElementById("login-form"),
    loginErr: document.getElementById("login-err"),
    rows: document.getElementById("rows"),
    q: document.getElementById("q"),
    qCond: document.getElementById("q-cond"),
    drawer: document.getElementById("drawer"),
    form: document.getElementById("car-form"),
    formTitle: document.getElementById("form-title"),
    deleteBtn: document.getElementById("delete-car"),
    toast: document.getElementById("toast"),
    sheetFile: document.getElementById("sheet-file"),
    importDrawer: document.getElementById("import-drawer"),
    importSummary: document.getElementById("import-summary"),
    importRows: document.getElementById("import-rows"),
    importConfirm: document.getElementById("import-confirm"),
  };

  const ANGLES = ["front", "side", "rear", "cabin"];
  let sb = null;
  let cars = [];
  let pendingFiles = {};

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("on");
    setTimeout(() => els.toast.classList.remove("on"), 2200);
  }

  function slugify(brand, model, year) {
    return `${brand}-${model}-${year}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function money(n) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
  }

  function show(which) {
    els.setup.hidden = which !== "setup";
    els.login.hidden = which !== "login";
    els.app.hidden = which !== "app";
  }

  async function boot() {
    try {
      if (!cfg.url || !anonKey) {
        show("setup");
        return;
      }
      if (!window.supabase) {
        show("login");
        els.loginErr.textContent = "Não carregou a biblioteca do Supabase. Atualize a página.";
        return;
      }
      sb = window.supabase.createClient(cfg.url, anonKey);
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (data.session) {
        show("app");
        await load();
      } else {
        show("login");
      }
    } catch (err) {
      show("login");
      els.loginErr.textContent = err.message || "Não conectou no Supabase.";
    }
  }

  els.setupSave.onclick = () => {
    const key = els.setupKey.value.trim();
    if (!key) return toast("Cole a chave anon");
    localStorage.setItem("precar-anon-key", key);
    location.reload();
  };

  els.loginForm.onsubmit = async (e) => {
    e.preventDefault();
    els.loginErr.textContent = "";
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
    });
    if (error) {
      els.loginErr.textContent = error.message;
      return;
    }
    show("app");
    await load();
  };

  document.getElementById("logout").onclick = async () => {
    await sb.auth.signOut();
    show("login");
  };

  async function load() {
    const { data, error } = await sb.from("cars").select("*").order("price");
    if (error) {
      toast(error.message);
      cars = [];
    } else {
      cars = data || [];
    }
    render();
  }

  function filtered() {
    const q = els.q.value.trim().toLowerCase();
    const cond = els.qCond.value;
    return cars.filter((c) => {
      if (cond && c.condition !== cond) return false;
      if (!q) return true;
      return `${c.brand} ${c.model} ${c.version} ${c.slug}`.toLowerCase().includes(q);
    });
  }

  function render() {
    const list = filtered();
    els.rows.innerHTML = list.map((c) => `
      <tr>
        <td>${c.image ? `<img src="${c.image}" alt="">` : ""}</td>
        <td><strong>${c.brand} ${c.model}</strong><br><span style="color:#8a8074">${c.version || ""}</span></td>
        <td>${c.year}</td>
        <td>${money(c.price)}</td>
        <td class="${c.published ? "on" : "off"}">${c.published ? "No ar" : "Rascunho"}</td>
        <td class="row-actions">
          <button type="button" data-edit="${c.id}">Editar</button>
        </td>
      </tr>`).join("") || `<tr><td colspan="6">Nenhum carro ainda. Importe o catálogo ou crie o primeiro.</td></tr>`;
  }

  els.q.oninput = render;
  els.qCond.onchange = render;

  function fillForm(car) {
    pendingFiles = {};
    const f = els.form;
    f.reset();
    ANGLES.forEach((a) => {
      const img = f.querySelector(`[data-preview="${a}"]`);
      img.removeAttribute("src");
    });
    if (!car) {
      els.formTitle.textContent = "Novo carro";
      els.deleteBtn.hidden = true;
      f.published.checked = true;
      return;
    }
    els.formTitle.textContent = `${car.brand} ${car.model}`;
    els.deleteBtn.hidden = false;
    ["id", "brand", "model", "version", "year", "condition", "price", "body", "fuel", "transmission", "power", "consumption", "trunk", "slug", "wm"].forEach((k) => {
      if (f[k] != null) f[k].value = car[k] ?? "";
    });
    f.published.checked = !!car.published;
    const photos = car.photos || {};
    ANGLES.forEach((a) => {
      const src = photos[a] || (a === "front" ? car.image : "");
      if (src) f.querySelector(`[data-preview="${a}"]`).src = src;
    });
  }

  document.getElementById("new-car").onclick = () => {
    fillForm(null);
    els.drawer.showModal();
  };

  document.getElementById("close-drawer").onclick = () => els.drawer.close();
  els.drawer.addEventListener("click", (e) => {
    if (e.target === els.drawer) els.drawer.close();
  });

  els.rows.onclick = (e) => {
    const btn = e.target.closest("[data-edit]");
    if (!btn) return;
    const car = cars.find((c) => c.id === btn.dataset.edit);
    if (car) {
      fillForm(car);
      els.drawer.showModal();
    }
  };

  els.form.brand.addEventListener("input", syncSlug);
  els.form.model.addEventListener("input", syncSlug);
  els.form.year.addEventListener("input", syncSlug);

  function syncSlug() {
    if (els.form.id.value) return;
    els.form.slug.value = slugify(els.form.brand.value, els.form.model.value, els.form.year.value);
    if (els.form.brand.value && els.form.model.value) {
      els.form.wm.value = `${slugify(els.form.brand.value, "", "").replace(/-$/, "")}/${slugify(els.form.model.value, "", "").replace(/^-/, "")}`;
    }
  }

  els.form.querySelectorAll("[data-angle]").forEach((input) => {
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      pendingFiles[input.dataset.angle] = file;
      const img = els.form.querySelector(`[data-preview="${input.dataset.angle}"]`);
      img.src = URL.createObjectURL(file);
    };
  });

  async function uploadPhotos(slug) {
    const photos = {};
    for (const angle of ANGLES) {
      const file = pendingFiles[angle];
      if (!file) continue;
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${slug}/${angle}-${Date.now()}.${ext}`;
      const { error } = await sb.storage.from("cars").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = sb.storage.from("cars").getPublicUrl(path);
      photos[angle] = data.publicUrl;
    }
    return photos;
  }

  els.form.onsubmit = async (e) => {
    e.preventDefault();
    const f = els.form;
    const slug = f.slug.value.trim();
    try {
      const uploaded = await uploadPhotos(slug);
      const existing = cars.find((c) => c.id === f.id.value);
      const photos = { ...(existing?.photos || {}), ...uploaded };
      const image = photos.front || existing?.image || null;
      const row = {
        slug,
        brand: f.brand.value.trim(),
        model: f.model.value.trim(),
        version: f.version.value.trim(),
        year: f.year.value.trim(),
        condition: f.condition.value,
        price: Number(f.price.value),
        body: f.body.value,
        fuel: f.fuel.value,
        transmission: f.transmission.value,
        power: f.power.value.trim(),
        consumption: f.consumption.value.trim(),
        trunk: f.trunk.value.trim(),
        wm: f.wm.value.trim(),
        image,
        photos,
        published: f.published.checked,
      };
      let error;
      if (f.id.value) {
        ({ error } = await sb.from("cars").update(row).eq("id", f.id.value));
      } else {
        ({ error } = await sb.from("cars").insert(row));
      }
      if (error) throw error;
      toast("Salvo");
      els.drawer.close();
      await load();
    } catch (err) {
      toast(err.message || "Não deu para salvar");
    }
  };

  els.deleteBtn.onclick = async () => {
    const id = els.form.id.value;
    if (!id || !confirm("Excluir este carro do catálogo?")) return;
    const { error } = await sb.from("cars").delete().eq("id", id);
    if (error) return toast(error.message);
    toast("Excluído");
    els.drawer.close();
    await load();
  };

  document.getElementById("import-local").onclick = async () => {
    const local = window.PRECAR_CARS || [];
    if (!local.length) return toast("Catálogo local vazio");
    if (!confirm(`Importar ${local.length} carros do protótipo? Os que já tiverem o mesmo slug são ignorados.`)) return;
    const existing = new Set(cars.map((c) => c.slug));
    const rows = local
      .filter((c) => !existing.has(c.slug))
      .map((c) => ({
        slug: c.slug,
        brand: c.brand,
        model: c.model,
        version: c.version || "",
        year: String(c.year),
        condition: c.condition,
        price: c.price,
        body: c.body,
        fuel: c.fuel,
        transmission: c.transmission,
        power: c.power,
        consumption: c.consumption,
        trunk: c.trunk,
        wm: c.wm,
        image: c.image,
        photos: { front: c.image },
        published: true,
      }));
    if (!rows.length) return toast("Nada novo para importar");
    const { error } = await sb.from("cars").insert(rows);
    if (error) return toast(error.message);
    toast(`${rows.length} carros importados`);
    await load();
  };

  const HEADER_MAP = {
    marca: "brand", brand: "brand",
    modelo: "model", model: "model",
    versao: "version", versão: "version", version: "version",
    ano: "year", year: "year",
    condicao: "condition", condição: "condition", condition: "condition",
    preco: "price", preço: "price", price: "price", valor: "price",
    carroceria: "body", body: "body",
    combustivel: "fuel", combustível: "fuel", fuel: "fuel",
    cambio: "transmission", câmbio: "transmission", transmission: "transmission",
    potencia: "power", potência: "power", power: "power",
    consumo: "consumption", consumption: "consumption",
    porta_malas: "trunk", portamalas: "trunk", "porta-malas": "trunk", "porta malas": "trunk", trunk: "trunk",
    slug: "slug",
    webmotors: "wm", wm: "wm",
    publicado: "published", published: "published",
  };

  let importReady = [];

  function foldKey(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[_/]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function isHeaderRow(cells) {
    const keys = cells.map(foldKey);
    return keys.includes("marca") && (keys.includes("modelo") || keys.includes("model"));
  }

  function rowsFromSheet(sheet) {
    const grid = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    let headerIdx = grid.findIndex(isHeaderRow);
    if (headerIdx < 0) headerIdx = 0;
    const headers = grid[headerIdx] || [];
    return grid
      .slice(headerIdx + 1)
      .filter((r) => r.some((c) => String(c).trim()))
      .map((r) => {
        const obj = {};
        headers.forEach((h, i) => {
          if (h) obj[h] = r[i];
        });
        return obj;
      });
  }

  function parsePrice(raw) {
    if (raw == null || raw === "") return 0;
    let s = String(raw).replace(/r\$/gi, "").trim();
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");
    else s = s.replace(/\./g, "");
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  function parseCondition(raw) {
    const s = foldKey(raw);
    if (!s) return "0km";
    if (/(seminovo|usado|used)/.test(s)) return "seminovo";
    return "0km";
  }

  function parseBody(raw) {
    const s = foldKey(raw);
    if (/picape|pickup|saveiro|strada/.test(s)) return "picape";
    if (/suv|crossover/.test(s)) return "suv";
    if (/seda|sedan/.test(s)) return "sedã";
    return "hatch";
  }

  function parseFuel(raw) {
    const s = foldKey(raw);
    if (/eletr/.test(s)) return "Elétrico";
    if (/hibrid/.test(s)) return "Híbrido";
    if (/diesel/.test(s)) return "Diesel";
    if (/gasolina/.test(s)) return "Gasolina";
    return "Flex";
  }

  function parseGear(raw) {
    const s = foldKey(raw);
    if (/auto|cvt|dct/.test(s)) return "Automático";
    return "Manual";
  }

  function mapSheetRow(obj) {
    const out = {};
    Object.entries(obj).forEach(([k, v]) => {
      const key = HEADER_MAP[foldKey(k)];
      if (key) out[key] = v == null ? "" : String(v).trim();
    });
    return out;
  }

  function toCarRow(raw) {
    const brand = (raw.brand || "").trim();
    const model = (raw.model || "").trim();
    const year = String(raw.year || "").trim();
    const price = parsePrice(raw.price);
    const slug = (raw.slug || slugify(brand, model, year)).trim();
    const wm = (raw.wm || `${slugify(brand, "", "").replace(/-$/, "")}/${slugify(model, "", "").replace(/^-/, "")}`).replace(/\/$/, "");
    const errors = [];
    if (!brand) errors.push("falta marca");
    if (!model) errors.push("falta modelo");
    if (!year) errors.push("falta ano");
    if (!price) errors.push("preço inválido");
    const published = !/^(nao|não|false|0|n)$/i.test(raw.published || "sim");
    return {
      ok: errors.length === 0,
      errors,
      skip: false,
      row: {
        slug,
        brand,
        model,
        version: (raw.version || "").trim(),
        year,
        condition: parseCondition(raw.condition),
        price,
        body: parseBody(raw.body),
        fuel: parseFuel(raw.fuel),
        transmission: parseGear(raw.transmission),
        power: (raw.power || "").trim(),
        consumption: (raw.consumption || "").trim(),
        trunk: (raw.trunk || "").trim(),
        wm,
        image: null,
        photos: {},
        published,
      },
    };
  }

  function showImport(items) {
    const existing = new Set(cars.map((c) => c.slug));
    items.forEach((it) => {
      if (it.ok && existing.has(it.row.slug)) {
        it.skip = true;
        it.errors = ["slug já existe"];
      }
    });
    importReady = items.filter((it) => it.ok && !it.skip).map((it) => it.row);
    const nOk = importReady.length;
    const nSkip = items.filter((it) => it.skip).length;
    const nErr = items.filter((it) => !it.ok).length;
    els.importSummary.textContent = `${items.length} linhas · ${nOk} novos · ${nSkip} já cadastrados · ${nErr} com erro`;
    els.importRows.innerHTML = items.map((it) => {
      const st = !it.ok ? "Erro" : it.skip ? "Já existe" : "Novo";
      const cls = !it.ok ? "st-err" : it.skip ? "st-skip" : "st-ok";
      return `<tr>
        <td class="${cls}">${st}</td>
        <td>${it.row.brand} ${it.row.model}${it.row.version ? " · " + it.row.version : ""}</td>
        <td>${it.row.year}</td>
        <td>${it.row.price ? money(it.row.price) : "—"}</td>
        <td>${it.errors.join(", ")}</td>
      </tr>`;
    }).join("");
    els.importConfirm.disabled = nOk === 0;
    els.importDrawer.showModal();
  }

  async function readSheet(file) {
    if (!window.XLSX) throw new Error("Biblioteca de planilha não carregou");
    const name = file.name.toLowerCase();
    let wb;
    if (name.endsWith(".csv")) {
      const text = await file.text();
      wb = window.XLSX.read(text, { type: "string" });
      let rows = rowsFromSheet(wb.Sheets[wb.SheetNames[0]]);
      if (rows.length && Object.keys(rows[0]).length === 1) {
        wb = window.XLSX.read(text, { type: "string", FS: ";" });
        rows = rowsFromSheet(wb.Sheets[wb.SheetNames[0]]);
      }
      return rows;
    }
    const buf = await file.arrayBuffer();
    wb = window.XLSX.read(buf, { type: "array" });
    return rowsFromSheet(wb.Sheets[wb.SheetNames[0]]);
  }

  document.getElementById("import-sheet").onclick = () => els.sheetFile.click();
  document.getElementById("close-import").onclick = () => els.importDrawer.close();
  els.importDrawer.addEventListener("click", (e) => {
    if (e.target === els.importDrawer) els.importDrawer.close();
  });

  els.sheetFile.onchange = async () => {
    const file = els.sheetFile.files[0];
    els.sheetFile.value = "";
    if (!file) return;
    try {
      const json = await readSheet(file);
      if (!json.length) return toast("A planilha está vazia");
      showImport(json.map(mapSheetRow).map(toCarRow));
    } catch (err) {
      toast(err.message || "Não deu para ler o arquivo");
    }
  };

  els.importConfirm.onclick = async () => {
    if (!importReady.length) return toast("Nada novo para gravar");
    const { error } = await sb.from("cars").insert(importReady);
    if (error) return toast(error.message);
    toast(`${importReady.length} carros gravados`);
    els.importDrawer.close();
    importReady = [];
    await load();
  };

  boot();
})();
