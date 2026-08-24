/* =========================================================
   FICE — IFC Campus Videira
   CRUD de trabalhos inscritos, persistido em localStorage
   ========================================================= */

const STORAGE_KEY = "fice_trabalhos_v1";
const SEQ_KEY = "fice_protocolo_seq_v1";
const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4 MB

// ---------- Elementos ----------
const form = document.getElementById("work-form");
const idInput = document.getElementById("work-id");
const tituloInput = document.getElementById("titulo");
const autorInput = document.getElementById("autorPrincipal");
const emailInput = document.getElementById("email");
const areaInput = document.getElementById("area");
const dataInput = document.getElementById("data");
const demaisAutoresInput = document.getElementById("demaisAutores");
const resumoInput = document.getElementById("resumo");
const resumoCount = document.getElementById("resumo-count");
const arquivoInput = document.getElementById("arquivo");
const arquivoHint = document.getElementById("arquivo-hint");

const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const formModeLabel = document.getElementById("form-mode-label");

const tbody = document.getElementById("works-tbody");
const totalCountEl = document.getElementById("total-count");
const emptyState = document.getElementById("empty-state");
const noResultsState = document.getElementById("no-results-state");
const searchInput = document.getElementById("search-input");
const filterModalidade = document.getElementById("filter-modalidade");
const toastEl = document.getElementById("toast");

let editingArquivo = null; // guarda {nome, base64} do arquivo atual durante edição

// ---------- Persistência ----------
function loadWorks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Erro ao ler dados salvos:", err);
    return [];
  }
}

function saveWorks(works) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
    return true;
  } catch (err) {
    console.error("Erro ao salvar:", err);
    showToast(
      "Não foi possível salvar: armazenamento do navegador cheio. Tente um PDF menor.",
      true
    );
    return false;
  }
}

function nextProtocolo(dataApresentacao) {
  let seq = parseInt(localStorage.getItem(SEQ_KEY) || "0", 10) + 1;
  localStorage.setItem(SEQ_KEY, String(seq));
  const ano = (dataApresentacao || new Date().toISOString().slice(0, 10)).slice(0, 4);
  return `FICE-${ano}-${String(seq).padStart(3, "0")}`;
}

// ---------- Utilidades ----------
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatDateBR(isoDate) {
  if (!isoDate) return "—";
  const [ano, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}/${ano}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

let toastTimer = null;
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle("toast-error", isError);
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
}

// ---------- Validação visual ----------
function markTouched(el) {
  el.classList.add("touched");
  const errorEl = el.closest(".field")?.querySelector(".field-error");
  if (errorEl) errorEl.textContent = el.validity.valid ? "" : (el.validationMessage || "Campo inválido.");
}

const trackedFields = form.querySelectorAll(
  'input[type="text"], input[type="email"], input[type="date"], textarea'
);
trackedFields.forEach((el) => {
  el.addEventListener("blur", () => markTouched(el));
  el.addEventListener("input", () => {
    if (el.classList.contains("touched")) markTouched(el);
  });
});

resumoInput.addEventListener("input", () => {
  resumoCount.textContent = `${resumoInput.value.length} / 2000`;
});

// ---------- Renderização da tabela ----------
function getFilteredWorks() {
  const works = loadWorks();
  const term = searchInput.value.trim().toLowerCase();
  const modFiltro = filterModalidade.value;

  return works
    .filter((w) => (modFiltro === "todas" ? true : w.modalidade === modFiltro))
    .filter((w) => {
      if (!term) return true;
      return (
        w.titulo.toLowerCase().includes(term) ||
        w.autorPrincipal.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => (a.data < b.data ? 1 : -1)); // apresentações mais próximas/recentes primeiro
}

function renderTable() {
  const allWorks = loadWorks();
  const filtered = getFilteredWorks();

  totalCountEl.textContent = allWorks.length;
  tbody.innerHTML = "";

  emptyState.hidden = allWorks.length !== 0;
  noResultsState.hidden = !(allWorks.length > 0 && filtered.length === 0);

  filtered.forEach((w) => {
    const tr = document.createElement("tr");

    const badgeClass = w.modalidade === "Extensão" ? "badge-ext" : "badge-ic";
    const badgeText = w.modalidade === "Extensão" ? "Extensão" : "Iniciação Científica";

    const autoresExtra = w.demaisAutores
      ? `<div class="work-authors">Também: ${escapeHtml(w.demaisAutores)}</div>`
      : "";

    tr.innerHTML = `
      <td class="protocolo">${w.protocolo}</td>
      <td>
        <div class="work-title">${escapeHtml(w.titulo)}</div>
        <div class="work-authors">${escapeHtml(w.autorPrincipal)} · ${escapeHtml(w.email)}</div>
        ${autoresExtra}
      </td>
      <td>${escapeHtml(w.area)}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      <td>${formatDateBR(w.data)}</td>
      <td>${
        w.arquivo
          ? `<a class="pdf-link" download="${escapeHtml(w.arquivo.nome)}" href="${w.arquivo.base64}">${escapeHtml(w.arquivo.nome)}</a>`
          : "—"
      }</td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="edit" data-id="${w.id}">Editar</button>
          <button type="button" class="icon-btn danger" data-action="delete" data-id="${w.id}">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- Ações da tabela (editar / excluir) ----------
tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === "delete") {
    handleDelete(id);
  } else if (action === "edit") {
    handleEdit(id);
  }
});

function handleDelete(id) {
  const works = loadWorks();
  const work = works.find((w) => w.id === id);
  if (!work) return;

  const confirmado = confirm(`Excluir o trabalho "${work.titulo}" (${work.protocolo})? Esta ação não pode ser desfeita.`);
  if (!confirmado) return;

  const updated = works.filter((w) => w.id !== id);
  if (saveWorks(updated)) {
    renderTable();
    showToast("Trabalho excluído.");
    if (idInput.value === id) resetForm();
  }
}

function handleEdit(id) {
  const works = loadWorks();
  const work = works.find((w) => w.id === id);
  if (!work) return;

  idInput.value = work.id;
  tituloInput.value = work.titulo;
  autorInput.value = work.autorPrincipal;
  emailInput.value = work.email;
  areaInput.value = work.area;
  dataInput.value = work.data;
  demaisAutoresInput.value = work.demaisAutores || "";
  resumoInput.value = work.resumo;
  resumoCount.textContent = `${work.resumo.length} / 2000`;

  form.querySelectorAll('input[name="modalidade"]').forEach((r) => {
    r.checked = r.value === work.modalidade;
  });

  editingArquivo = work.arquivo || null;
  arquivoInput.required = false;
  arquivoHint.textContent = work.arquivo
    ? `Arquivo atual: ${work.arquivo.nome}. Envie um novo PDF apenas se quiser substituí-lo.`
    : "Nenhum arquivo salvo anteriormente. Apenas .pdf, até 4 MB.";

  formModeLabel.textContent = `Editando trabalho — ${work.protocolo}`;
  submitBtn.textContent = "Salvar alterações";
  cancelEditBtn.hidden = false;

  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

cancelEditBtn.addEventListener("click", () => resetForm());

function resetForm() {
  form.reset();
  form.querySelectorAll(".touched").forEach((el) => el.classList.remove("touched"));
  form.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  idInput.value = "";
  editingArquivo = null;
  arquivoInput.required = true;
  arquivoHint.textContent = "Apenas arquivos .pdf, até 4 MB.";
  resumoCount.textContent = "0 / 2000";
  formModeLabel.textContent = "Ficha de Inscrição";
  submitBtn.textContent = "Cadastrar trabalho";
  cancelEditBtn.hidden = true;
}

// ---------- Envio do formulário ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  trackedFields.forEach(markTouched);

  const modalidadeEl = form.querySelector('input[name="modalidade"]:checked');
  const modalidadeErrorEl = document.getElementById("modalidade-error");
  modalidadeErrorEl.textContent = modalidadeEl ? "" : "Selecione uma modalidade.";

  const file = arquivoInput.files[0];
  const arquivoErrorEl = arquivoInput.closest(".field").querySelector(".field-error");
  arquivoErrorEl.textContent = "";

  let arquivoValido = true;
  if (file) {
    if (file.type !== "application/pdf") {
      arquivoErrorEl.textContent = "Envie um arquivo no formato PDF.";
      arquivoValido = false;
    } else if (file.size > MAX_PDF_BYTES) {
      arquivoErrorEl.textContent = "O arquivo excede o limite de 4 MB.";
      arquivoValido = false;
    }
  } else if (!editingArquivo) {
    arquivoErrorEl.textContent = "Anexe o arquivo do trabalho em PDF.";
    arquivoValido = false;
  }

  if (!form.checkValidity() || !modalidadeEl || !arquivoValido) {
    if (!form.checkValidity()) form.reportValidity();
    return;
  }

  let arquivoData = editingArquivo;
  if (file) {
    try {
      const base64 = await fileToBase64(file);
      arquivoData = { nome: file.name, base64, tamanho: file.size };
    } catch (err) {
      showToast("Não foi possível ler o arquivo PDF selecionado.", true);
      return;
    }
  }

  const works = loadWorks();
  const isEditing = Boolean(idInput.value);

  const payload = {
    id: isEditing ? idInput.value : crypto.randomUUID(),
    protocolo: isEditing
      ? works.find((w) => w.id === idInput.value).protocolo
      : nextProtocolo(dataInput.value),
    titulo: tituloInput.value.trim(),
    autorPrincipal: autorInput.value.trim(),
    email: emailInput.value.trim(),
    area: areaInput.value.trim(),
    modalidade: modalidadeEl.value,
    data: dataInput.value,
    demaisAutores: demaisAutoresInput.value.trim(),
    resumo: resumoInput.value.trim(),
    arquivo: arquivoData,
    atualizadoEm: new Date().toISOString(),
  };

  let updated;
  if (isEditing) {
    updated = works.map((w) => (w.id === payload.id ? payload : w));
  } else {
    updated = [...works, payload];
  }

  if (saveWorks(updated)) {
    renderTable();
    showToast(isEditing ? "Alterações salvas." : `Trabalho cadastrado — protocolo ${payload.protocolo}.`);
    resetForm();
  }
});

// ---------- Busca e filtro ----------
searchInput.addEventListener("input", renderTable);
filterModalidade.addEventListener("change", renderTable);

// ---------- Inicialização ----------
resetForm();
renderTable();
