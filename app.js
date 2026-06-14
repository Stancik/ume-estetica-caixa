const STORAGE_KEYS = {
  pacientes: 'ume_simple_pacientes_plus',
  procedimentos: 'ume_simple_procedimentos_plus',
  agendamentos: 'ume_simple_agendamentos_plus'
};

let pacientes = JSON.parse(localStorage.getItem(STORAGE_KEYS.pacientes)) || [];
let procedimentos = JSON.parse(localStorage.getItem(STORAGE_KEYS.procedimentos)) || [];
let agendamentos = JSON.parse(localStorage.getItem(STORAGE_KEYS.agendamentos)) || [];

let pacienteFotoTemp = '';
let arquivosPacienteTemp = [];
let antesDepoisTemp = [];
let pacienteEditandoId = null;
let beforeAfterFotoTemp = null;

const agendaLista = document.getElementById('agendaLista');
const pacientesLista = document.getElementById('pacientesLista');
const procedimentosLista = document.getElementById('procedimentosLista');
const dataHoje = document.getElementById('dataHoje');
const totalHoje = document.getElementById('totalHoje');
const totalProximos = document.getElementById('totalProximos');
const toast = document.getElementById('toast');

function salvar() {
  localStorage.setItem(STORAGE_KEYS.pacientes, JSON.stringify(pacientes));
  localStorage.setItem(STORAGE_KEYS.procedimentos, JSON.stringify(procedimentos));
  localStorage.setItem(STORAGE_KEYS.agendamentos, JSON.stringify(agendamentos));
}

function mostrarToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

function formatarDataBR(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function mascararTamanho(bytes) {
  const val = Number(bytes) || 0;
  if (val < 1024) return `${val} B`;
  if (val < 1024 * 1024) return `${(val / 1024).toFixed(1)} KB`;
  return `${(val / (1024 * 1024)).toFixed(1)} MB`;
}

function dataHojeISO() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function abrirModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function fecharModal(id) {
  document.getElementById(id).classList.add('hidden');
  const algumModalAberto = [...document.querySelectorAll('.modal')].some((m) => !m.classList.contains('hidden'));
  document.body.classList.toggle('modal-open', algumModalAberto);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function baixarTexto(nomeArquivo, conteudo) {
  const blob = new Blob([conteudo], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportarBackup() {
  const backup = {
    app: 'UME Estética Avançada',
    versao: 'simples-plus-v3',
    exportadoEm: new Date().toISOString(),
    pacientes,
    procedimentos,
    agendamentos
  };
  const nome = `ume_backup_${dataHojeISO()}.json`;
  baixarTexto(nome, JSON.stringify(backup, null, 2));
  mostrarToast('Backup exportado com sucesso.');
}
window.exportarBackup = exportarBackup;

async function restaurarBackup(file) {
  if (!file) return;
  try {
    const texto = await file.text();
    const dados = JSON.parse(texto);
    if (!dados || !Array.isArray(dados.pacientes) || !Array.isArray(dados.procedimentos) || !Array.isArray(dados.agendamentos)) {
      throw new Error('Arquivo inválido');
    }
    pacientes = dados.pacientes;
    procedimentos = dados.procedimentos;
    agendamentos = dados.agendamentos;
    salvar();
    preencherSelectsAgendamento();
    renderAgenda();
    renderPacientes();
    renderProcedimentos();
    mostrarToast('Backup restaurado com sucesso.');
  } catch (e) {
    console.error(e);
    mostrarToast('Não foi possível restaurar o backup.');
  }
}

function atualizarPreviewFotoPaciente() {
  const img = document.getElementById('pacienteFotoPreview');
  const placeholder = document.getElementById('pacienteFotoPlaceholder');
  if (pacienteFotoTemp) {
    img.src = pacienteFotoTemp;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    img.src = '';
    img.style.display = 'none';
    placeholder.style.display = 'grid';
  }
}

function renderArquivosTemp() {
  const box = document.getElementById('listaArquivosPaciente');
  if (!arquivosPacienteTemp.length) {
    box.className = 'list-box empty-box';
    box.innerHTML = 'Nenhum arquivo anexado.';
    return;
  }
  box.className = 'list-box';
  box.innerHTML = arquivosPacienteTemp.map((arq, idx) => `
    <div class="file-item">
      <div>
        <strong>${arq.nome}</strong>
        <small>${mascararTamanho(arq.tamanho)}</small>
      </div>
      <button class="btn ghost" onclick="removerArquivoTemp(${idx})">Remover</button>
    </div>
  `).join('');
}

function renderAntesDepoisTemp() {
  const box = document.getElementById('listaAntesDepoisPaciente');
  if (!antesDepoisTemp.length) {
    box.innerHTML = '<div class="empty-box">Nenhuma foto no histórico ainda.</div>';
    return;
  }
  box.innerHTML = antesDepoisTemp.map((item, idx) => `
    <article class="before-after-card">
      <img src="${item.foto}" alt="${item.tipo}">
      <div class="before-after-body">
        <span class="tag">${item.tipo}</span>
        <h4>${formatarDataBR(item.data)}</h4>
        <p>${item.avaliacao || 'Sem avaliação'}</p>
        <button class="btn ghost" onclick="removerAntesDepoisTemp(${idx})">Remover</button>
      </div>
    </article>
  `).join('');
}

function removerArquivoTemp(idx) {
  arquivosPacienteTemp.splice(idx, 1);
  renderArquivosTemp();
}
window.removerArquivoTemp = removerArquivoTemp;

function removerAntesDepoisTemp(idx) {
  antesDepoisTemp.splice(idx, 1);
  renderAntesDepoisTemp();
}
window.removerAntesDepoisTemp = removerAntesDepoisTemp;

function preencherSelectsAgendamento() {
  const pacienteSelect = document.getElementById('agendamentoPaciente');
  const procedimentoSelect = document.getElementById('agendamentoProcedimento');

  pacienteSelect.innerHTML = pacientes.length
    ? pacientes.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')
    : '<option value="">Cadastre um paciente primeiro</option>';

  procedimentoSelect.innerHTML = procedimentos.length
    ? procedimentos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')
    : '<option value="">Cadastre um procedimento primeiro</option>';
}

function adicionarRecorrencia(baseData, tipo, indice) {
  const dt = new Date(`${baseData}T12:00:00`);
  if (tipo === 'semanal') dt.setDate(dt.getDate() + (7 * indice));
  if (tipo === 'quinzenal') dt.setDate(dt.getDate() + (14 * indice));
  if (tipo === 'mensal') dt.setMonth(dt.getMonth() + indice);
  const ano = dt.getFullYear();
  const mes = String(dt.getMonth() + 1).padStart(2, '0');
  const dia = String(dt.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function gerarDatasRecorrentes(baseData, tipo, quantidade) {
  const total = Math.max(1, Number(quantidade) || 1);
  if (tipo === 'nenhuma' || total === 1) return [baseData];
  return Array.from({ length: total }, (_, idx) => adicionarRecorrencia(baseData, tipo, idx));
}

function conflitoHorario(data, hora) {
  return agendamentos.some(a => a.data === data && a.hora === hora && a.status !== 'remarcou' && a.status !== 'cancelou');
}

function statusPillClass(status) {
  const st = (status || 'agendado').toLowerCase();
  return ['agendado', 'compareceu', 'faltou', 'cancelou', 'remarcou'].includes(st) ? st : 'agendado';
}

function atualizarStatusAgendamento(id, status) {
  const idx = agendamentos.findIndex(a => a.id === id);
  if (idx === -1) return;
  agendamentos[idx].status = status;
  salvar();
  renderAgenda();
  mostrarToast(`Status atualizado para ${status}.`);
}
window.atualizarStatusAgendamento = atualizarStatusAgendamento;

function renderAgenda() {
  const filtroData = document.getElementById('filtroDataAgenda').value;
  const filtroBusca = document.getElementById('filtroBuscaAgenda').value.toLowerCase().trim();
  const hoje = dataHojeISO();

  const lista = agendamentos
    .filter(item => !filtroData || item.data === filtroData)
    .filter(item => {
      if (!filtroBusca) return true;
      return item.pacienteNome.toLowerCase().includes(filtroBusca) || item.profissional.toLowerCase().includes(filtroBusca) || item.procedimentoNome.toLowerCase().includes(filtroBusca);
    })
    .sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`));

  totalHoje.textContent = agendamentos.filter(a => a.data === hoje && a.status !== 'cancelou' && a.status !== 'remarcou').length;
  totalProximos.textContent = agendamentos.filter(a => a.data >= hoje && a.status !== 'cancelou').length;

  if (!lista.length) {
    agendaLista.innerHTML = '<div class="agenda-card"><div class="agenda-meta"><h3>Nenhum agendamento encontrado</h3><p>Cadastre um novo agendamento para começar.</p></div></div>';
    return;
  }

  agendaLista.innerHTML = lista.map(item => `
    <article class="agenda-card">
      <div class="agenda-date">
        <strong>${String(item.hora || '').slice(0, 5)}</strong>
        <span>${formatarDataBR(item.data)}</span>
      </div>
      <div class="agenda-meta">
        <h3>${item.pacienteNome}</h3>
        <div class="line"><strong>Procedimento:</strong> <span>${item.procedimentoNome}</span></div>
        <div class="line"><strong>Descrição:</strong> <span>${item.descricaoCurta || item.procedimentoDescricao || 'Sem descrição'}</span></div>
        ${item.totalPacote > 1 ? `<div class="line"><strong>Pacote:</strong> <span>${item.ordemPacote}/${item.totalPacote} • ${item.recorrencia}</span></div>` : ''}
        <div class="status-row">
          <span class="status-pill ${statusPillClass(item.status)}">${item.status || 'agendado'}</span>
          <select class="status-select" onchange="atualizarStatusAgendamento(${item.id}, this.value)">
            <option value="agendado" ${(item.status || 'agendado') === 'agendado' ? 'selected' : ''}>Agendado</option>
            <option value="compareceu" ${item.status === 'compareceu' ? 'selected' : ''}>Compareceu</option>
            <option value="faltou" ${item.status === 'faltou' ? 'selected' : ''}>Faltou</option>
            <option value="cancelou" ${item.status === 'cancelou' ? 'selected' : ''}>Cancelou</option>
            <option value="remarcou" ${item.status === 'remarcou' ? 'selected' : ''}>Remarcou</option>
          </select>
        </div>
      </div>
      <div class="agenda-profissional">
        <strong>Profissional</strong>
        <div>${item.profissional}</div>
      </div>
    </article>
  `).join('');
}

function renderPacientes() {
  const termo = document.getElementById('buscaPaciente').value.toLowerCase().trim();
  const termoNum = termo.replace(/\D/g, '');
  const lista = pacientes.filter(p => {
    const cpf = (p.cpf || '').replace(/\D/g, '');
    const tel = (p.telefone || '').replace(/\D/g, '');
    return !termo || p.nome.toLowerCase().includes(termo) || (termoNum && cpf.includes(termoNum)) || (termoNum && tel.includes(termoNum));
  });

  if (!lista.length) {
    pacientesLista.innerHTML = '<div class="patient-card"><h3>Nenhum paciente encontrado</h3><p>Cadastre um novo paciente.</p></div>';
    return;
  }

  pacientesLista.innerHTML = lista.map(p => {
    const beforeAfterCount = (p.antesDepois || []).length;
    const fileCount = (p.arquivos || []).length;
    return `
      <article class="patient-card">
        <div class="card-top">
          ${p.foto ? `<img src="${p.foto}" alt="${p.nome}" class="patient-card-photo">` : `<div class="patient-card-photo-placeholder">${(p.nome || 'P').charAt(0)}</div>`}
          <div>
            <h3>${p.nome}</h3>
            <p><strong>Telefone:</strong> ${p.telefone || '-'}</p>
            <p><strong>CPF:</strong> ${p.cpf || '-'}</p>
          </div>
        </div>
        <div class="patient-card-stats">
          <span>Arquivos anexados: ${fileCount}</span>
          <span>Antes e Depois: ${beforeAfterCount} foto(s)</span>
          <small>${p.observacoes || ''}</small>
        </div>
        <div class="patient-card-actions">
          <button class="btn ghost" onclick="visualizarArquivosPaciente(${p.id})">Arquivos</button>
          <button class="btn ghost" onclick="visualizarAntesDepoisPaciente(${p.id})">Antes e Depois</button>
          <button class="btn ghost" onclick="editarPaciente(${p.id})">Editar</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderProcedimentos() {
  const termo = document.getElementById('buscaProcedimento').value.toLowerCase().trim();
  const lista = procedimentos.filter(p => !termo || p.nome.toLowerCase().includes(termo) || p.descricao.toLowerCase().includes(termo));

  if (!lista.length) {
    procedimentosLista.innerHTML = '<div class="procedure-card"><h3>Nenhum procedimento encontrado</h3><p>Cadastre um procedimento.</p></div>';
    return;
  }

  procedimentosLista.innerHTML = lista.map(p => `
    <article class="procedure-card">
      <h3>${p.nome}</h3>
      <p>${p.descricao}</p>
      <small><strong>Valor:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(p.valor) || 0)}</small>
    </article>
  `).join('');
}

function inicializarAbas() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function limparModalPaciente() {
  pacienteEditandoId = null;
  pacienteFotoTemp = '';
  arquivosPacienteTemp = [];
  antesDepoisTemp = [];
  beforeAfterFotoTemp = null;
  document.querySelectorAll('#modalPaciente input').forEach(i => i.value = '');
  document.getElementById('beforeAfterTipo').value = 'Antes';
  document.getElementById('beforeAfterData').value = dataHojeISO();
  document.getElementById('beforeAfterAvaliacao').value = '';
  document.getElementById('beforeAfterFotoInput').value = '';
  atualizarPreviewFotoPaciente();
  renderArquivosTemp();
  renderAntesDepoisTemp();
}

function editarPaciente(id) {
  const paciente = pacientes.find(p => p.id === id);
  if (!paciente) return;
  pacienteEditandoId = id;
  document.getElementById('pacienteNome').value = paciente.nome || '';
  document.getElementById('pacienteTelefone').value = paciente.telefone || '';
  document.getElementById('pacienteCpf').value = paciente.cpf || '';
  document.getElementById('pacienteObservacoes').value = paciente.observacoes || '';
  pacienteFotoTemp = paciente.foto || '';
  arquivosPacienteTemp = [...(paciente.arquivos || [])];
  antesDepoisTemp = [...(paciente.antesDepois || [])];
  atualizarPreviewFotoPaciente();
  renderArquivosTemp();
  renderAntesDepoisTemp();
  document.getElementById('beforeAfterData').value = dataHojeISO();
  abrirModal('modalPaciente');
}
window.editarPaciente = editarPaciente;

function visualizarArquivosPaciente(id) {
  const paciente = pacientes.find(p => p.id === id);
  if (!paciente) return;
  const box = document.getElementById('visualizadorArquivosPaciente');
  const arquivos = paciente.arquivos || [];
  if (!arquivos.length) {
    box.innerHTML = '<div class="empty-box">Nenhum arquivo anexado para este paciente.</div>';
  } else {
    box.innerHTML = arquivos.map(arq => `
      <div class="file-item">
        <div>
          <strong>${arq.nome}</strong>
          <small>${mascararTamanho(arq.tamanho)}</small>
        </div>
        <a class="btn ghost" href="${arq.conteudo}" download="${arq.nome}">Baixar</a>
      </div>
    `).join('');
  }
  abrirModal('modalArquivosPaciente');
}
window.visualizarArquivosPaciente = visualizarArquivosPaciente;

function visualizarAntesDepoisPaciente(id) {
  const paciente = pacientes.find(p => p.id === id);
  if (!paciente) return;
  const box = document.getElementById('visualizadorAntesDepoisPaciente');
  const lista = paciente.antesDepois || [];
  if (!lista.length) {
    box.innerHTML = '<div class="empty-box">Nenhuma foto de antes e depois cadastrada.</div>';
  } else {
    box.innerHTML = lista.map(item => `
      <article class="before-after-card">
        <img src="${item.foto}" alt="${item.tipo}">
        <div class="before-after-body">
          <span class="tag">${item.tipo}</span>
          <h4>${formatarDataBR(item.data)}</h4>
          <p>${item.avaliacao || 'Sem avaliação'}</p>
        </div>
      </article>
    `).join('');
  }
  abrirModal('modalAntesDepoisPaciente');
}
window.visualizarAntesDepoisPaciente = visualizarAntesDepoisPaciente;

function inicializarModais() {
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => fecharModal(btn.dataset.close)));

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        const algumModalAberto = [...document.querySelectorAll('.modal')].some((m) => !m.classList.contains('hidden'));
        document.body.classList.toggle('modal-open', algumModalAberto);
      }
    });
  });

  document.getElementById('btnNovoPaciente').addEventListener('click', () => {
    limparModalPaciente();
    abrirModal('modalPaciente');
  });

  document.getElementById('btnNovoProcedimento').addEventListener('click', () => abrirModal('modalProcedimento'));

  document.getElementById('btnNovoAgendamento').addEventListener('click', () => {
    preencherSelectsAgendamento();
    document.getElementById('agendamentoData').value = dataHojeISO();
    document.getElementById('recorrenciaTipo').value = 'nenhuma';
    document.getElementById('recorrenciaQuantidade').value = 1;
    abrirModal('modalAgendamento');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const aberto = [...document.querySelectorAll('.modal')].find((m) => !m.classList.contains('hidden'));
      if (aberto) fecharModal(aberto.id);
    }
  });
}

function inicializarUploadFotoPaciente() {
  document.getElementById('pacienteFotoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pacienteFotoTemp = await readFileAsDataURL(file);
    atualizarPreviewFotoPaciente();
  });
}

function inicializarUploadArquivosPaciente() {
  document.getElementById('pacienteArquivosInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      arquivosPacienteTemp.push({ nome: file.name, tamanho: file.size, conteudo: await readFileAsDataURL(file) });
    }
    renderArquivosTemp();
    e.target.value = '';
  });
}

function inicializarAntesDepoisUpload() {
  document.getElementById('beforeAfterFotoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    beforeAfterFotoTemp = { nome: file.name, conteudo: await readFileAsDataURL(file) };
  });

  document.getElementById('adicionarAntesDepois').addEventListener('click', () => {
    const tipo = document.getElementById('beforeAfterTipo').value;
    const data = document.getElementById('beforeAfterData').value || dataHojeISO();
    const avaliacao = document.getElementById('beforeAfterAvaliacao').value.trim();
    if (!beforeAfterFotoTemp) return mostrarToast('Selecione uma foto de antes ou depois.');
    antesDepoisTemp.push({ tipo, data, avaliacao, foto: beforeAfterFotoTemp.conteudo, nome: beforeAfterFotoTemp.nome });
    renderAntesDepoisTemp();
    document.getElementById('beforeAfterAvaliacao').value = '';
    document.getElementById('beforeAfterFotoInput').value = '';
    beforeAfterFotoTemp = null;
    mostrarToast('Histórico de antes e depois adicionado.');
  });
}

function inicializarEventosFormulario() {
  document.getElementById('salvarPaciente').addEventListener('click', () => {
    const nome = document.getElementById('pacienteNome').value.trim();
    if (!nome) return mostrarToast('Informe o nome do paciente.');

    const payload = {
      nome,
      telefone: document.getElementById('pacienteTelefone').value.trim(),
      cpf: document.getElementById('pacienteCpf').value.trim(),
      observacoes: document.getElementById('pacienteObservacoes').value.trim(),
      foto: pacienteFotoTemp,
      arquivos: arquivosPacienteTemp,
      antesDepois: antesDepoisTemp
    };

    if (pacienteEditandoId) {
      const idx = pacientes.findIndex(p => p.id === pacienteEditandoId);
      const nomeAnterior = pacientes[idx]?.nome;
      pacientes[idx] = { ...pacientes[idx], ...payload };
      agendamentos = agendamentos.map(a => (a.pacienteId === pacienteEditandoId || a.pacienteNome === nomeAnterior) ? { ...a, pacienteId: pacienteEditandoId, pacienteNome: nome } : a);
      mostrarToast('Paciente atualizado com sucesso.');
    } else {
      pacientes.push({ id: Date.now(), ...payload });
      mostrarToast('Paciente salvo com sucesso.');
    }

    salvar();
    renderPacientes();
    renderAgenda();
    preencherSelectsAgendamento();
    fecharModal('modalPaciente');
    limparModalPaciente();
  });

  document.getElementById('salvarProcedimento').addEventListener('click', () => {
    const nome = document.getElementById('procedimentoNome').value.trim();
    const descricao = document.getElementById('procedimentoDescricao').value.trim();
    const valor = Number(document.getElementById('procedimentoValor').value || 0);
    if (!nome || !descricao) return mostrarToast('Informe o nome e a descrição do procedimento.');
    procedimentos.push({ id: Date.now(), nome, descricao, valor });
    salvar();
    renderProcedimentos();
    preencherSelectsAgendamento();
    fecharModal('modalProcedimento');
    document.getElementById('procedimentoNome').value = '';
    document.getElementById('procedimentoDescricao').value = '';
    document.getElementById('procedimentoValor').value = '';
    mostrarToast('Procedimento salvo com sucesso.');
  });

  document.getElementById('salvarAgendamento').addEventListener('click', () => {
    const pacienteId = Number(document.getElementById('agendamentoPaciente').value);
    const procedimentoId = Number(document.getElementById('agendamentoProcedimento').value);
    const data = document.getElementById('agendamentoData').value;
    const hora = document.getElementById('agendamentoHora').value;
    const profissional = document.getElementById('agendamentoProfissional').value.trim();
    const descricaoCurta = document.getElementById('agendamentoDescricaoCurta').value.trim();
    const recorrenciaTipo = document.getElementById('recorrenciaTipo').value;
    const recorrenciaQuantidade = Number(document.getElementById('recorrenciaQuantidade').value || 1);

    const paciente = pacientes.find(p => p.id === pacienteId);
    const procedimento = procedimentos.find(p => p.id === procedimentoId);
    if (!paciente || !procedimento || !data || !hora || !profissional) {
      return mostrarToast('Preencha paciente, procedimento, data, horário e profissional.');
    }

    const datas = gerarDatasRecorrentes(data, recorrenciaTipo, recorrenciaQuantidade);
    const conflitos = datas.filter(dt => conflitoHorario(dt, hora));
    if (conflitos.length) {
      return mostrarToast(`Já existe agendamento em ${formatarDataBR(conflitos[0])} às ${hora}. Escolha outro horário.`);
    }

    const totalPacote = datas.length;
    const pacoteId = totalPacote > 1 ? `pacote_${Date.now()}` : null;

    datas.forEach((dt, idx) => {
      agendamentos.push({
        id: Date.now() + idx,
        pacienteId,
        pacienteNome: paciente.nome,
        procedimentoId,
        procedimentoNome: procedimento.nome,
        procedimentoDescricao: procedimento.descricao,
        procedimentoValor: procedimento.valor || 0,
        data: dt,
        hora,
        profissional,
        descricaoCurta,
        recorrencia: recorrenciaTipo,
        totalPacote,
        ordemPacote: idx + 1,
        pacoteId,
        status: 'agendado'
      });
    });

    salvar();
    renderAgenda();
    fecharModal('modalAgendamento');
    document.querySelectorAll('#modalAgendamento input').forEach(i => i.value = '');
    document.getElementById('recorrenciaTipo').value = 'nenhuma';
    document.getElementById('recorrenciaQuantidade').value = 1;
    mostrarToast(totalPacote > 1 ? `${totalPacote} sessões agendadas com recorrência.` : 'Agendamento salvo com sucesso.');
  });
}

function inicializarFiltros() {
  document.getElementById('filtroDataAgenda').addEventListener('input', renderAgenda);
  document.getElementById('filtroBuscaAgenda').addEventListener('input', renderAgenda);
  document.getElementById('buscaPaciente').addEventListener('input', renderPacientes);
  document.getElementById('buscaProcedimento').addEventListener('input', renderProcedimentos);
}

function inicializarBackup() {
  document.getElementById('btnExportarBackup').addEventListener('click', exportarBackup);
  document.getElementById('inputRestaurarBackup').addEventListener('change', (e) => {
    const file = e.target.files[0];
    restaurarBackup(file);
    e.target.value = '';
  });
}

function seedInicial() {
  if (!pacientes.length && !procedimentos.length && !agendamentos.length) {
    const paciente = { id: 1, nome: 'Maria Silva', telefone: '(41) 99999-1111', cpf: '123.456.789-00', observacoes: 'Paciente recorrente', foto: '', arquivos: [], antesDepois: [] };
    const procedimento = { id: 1, nome: 'Limpeza de Pele', descricao: 'Higienização e extração leve.', valor: 180 };
    pacientes.push(paciente);
    procedimentos.push(procedimento);
    agendamentos.push({ id: 1, pacienteId: 1, pacienteNome: paciente.nome, procedimentoId: 1, procedimentoNome: procedimento.nome, procedimentoDescricao: procedimento.descricao, procedimentoValor: procedimento.valor, data: dataHojeISO(), hora: '14:00', profissional: 'Dra. Ana', descricaoCurta: 'Sessão facial rápida', recorrencia: 'nenhuma', totalPacote: 1, ordemPacote: 1, pacoteId: null, status: 'agendado' });
    salvar();
  }
}

function setAppHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--app-vh', `${vh}px`);
}

function detectStandalone() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  document.documentElement.classList.toggle('standalone', standalone);
}

function bindModalBodyLock() {
  const observer = new MutationObserver(() => {
    const anyModalOpen = [...document.querySelectorAll('.modal')].some((modal) => !modal.classList.contains('hidden'));
    document.body.classList.toggle('modal-open', anyModalOpen);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
}

function init() {
  seedInicial();
  dataHoje.textContent = formatarDataBR(dataHojeISO());
  inicializarAbas();
  inicializarModais();
  inicializarUploadFotoPaciente();
  inicializarUploadArquivosPaciente();
  inicializarAntesDepoisUpload();
  inicializarEventosFormulario();
  inicializarFiltros();
  inicializarBackup();
  preencherSelectsAgendamento();
  atualizarPreviewFotoPaciente();
  renderArquivosTemp();
  renderAntesDepoisTemp();
  document.getElementById('beforeAfterData').value = dataHojeISO();
  setAppHeight();
  detectStandalone();
  bindModalBodyLock();
  renderAgenda();
  renderPacientes();
  renderProcedimentos();
}

window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', setAppHeight);

document.addEventListener('DOMContentLoaded', init);
