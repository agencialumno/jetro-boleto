// Configura worker do PDF.js
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Mapa de códigos COMPE/ISPB dos principais bancos e instituições de pagamento do Brasil
const BANCOS_BR = {
  '001': 'Banco do Brasil S.A.',
  '033': 'Banco Santander (Brasil) S.A.',
  '041': 'Banrisul',
  '070': 'BRB - Banco de Brasília',
  '077': 'Banco Inter S.A.',
  '104': 'Caixa Econômica Federal',
  '197': 'Stone Pagamentos S.A.',
  '208': 'Banco BTG Pactual S.A.',
  '212': 'Banco Original S.A.',
  '237': 'Banco Bradesco S.A.',
  '260': 'Nu Pagamentos S.A. (Nubank)',
  '290': 'PagSeguro Internet S.A.',
  '318': 'Banco BMG S.A.',
  '323': 'Mercado Pago',
  '336': 'Banco C6 S.A.',
  '341': 'Itaú Unibanco S.A.',
  '364': 'Efí S.A. (Gerencianet)',
  '380': 'PicPay Serviços S.A.',
  '403': 'Cora SCD S.A.',
  '422': 'Banco Safra S.A.',
  '461': 'Asaas Gestão Financeira S.A.',
  '481': 'Superlógica SCD S.A.',
  '623': 'Banco Pan S.A.',
  '633': 'Banco Rendimento S.A. (PJBank)',
  '637': 'Banco Sofisa S.A.',
  '655': 'Banco Votorantim (Neon)',
  '707': 'Banco Daycoval S.A.',
  '745': 'Banco Citibank S.A.',
  '748': 'Sicredi',
  '756': 'Sicoob'
};

// Softwares de edição manual / reimpressão suspeitos em boletos
const EDITORES_SUSPEITOS = [
  'pdfium',
  'acrobat',
  'adobe',
  'foxit',
  'nitro',
  'pdf-xchange',
  'canva',
  'ilovepdf',
  'smallpdf',
  'photoshop',
  'corel',
  'gimp',
  'inkscape',
  'sejda',
  'pdfescape',
  'pdfsam',
  'libreoffice',
  'microsoft word',
  'microsoft print to pdf',
  'print to pdf',
  'preview',
  'quartz',
  'skia/pdf',
  'chromium',
  'chrome',
  'edge',
  'firefox',
  'ghostscript',
  'qpdf',
  'pypdf',
  'pikepdf'
];

// Motores legítimos de geração automatizada de boletos por ERPs e bancos
const GERADORES_AUTOMATIZADOS = [
  'wkhtmltopdf',
  'itext',
  'tcpdf',
  'fpdf',
  'dompdf',
  'mpdf',
  'jasper',
  'reportlab',
  'crystal',
  'birt',
  'apache fop',
  'prince',
  'weasyprint',
  'puppeteer',
  'headlesschrome',
  'superlogica',
  'pjbank'
];

// Elementos de UI
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const digitableInput = document.getElementById('digitable-input');
const btnVerifyLine = document.getElementById('btn-verify-line');
const auditProgress = document.getElementById('audit-progress');
const progressTitle = document.getElementById('progress-title');
const progressStep = document.getElementById('progress-step');
const progressFill = document.getElementById('progress-fill');
const resultSection = document.getElementById('result-section');

let currentReports = [];
let activeFilter = 'all';

// Alternância de Abas
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// Eventos Drag & Drop
['dragenter', 'dragover'].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files || []);
  if (files.length > 0) handleMultipleFilesUpload(files);
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length > 0) handleMultipleFilesUpload(files);
});

// Verificação de uma ou múltiplas linhas digitáveis
btnVerifyLine.addEventListener('click', () => {
  const rawText = digitableInput.value.trim();
  if (!rawText) {
    alert('Cole ou digite pelo menos uma linha digitável antes de verificar.');
    return;
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = lines.map((line, idx) => ({
    label: `Linha Digitável #${idx + 1}`,
    type: 'line',
    rawLine: line
  }));

  processBatch(items);
});

// Botões de Demonstração Rápida
const demoBatchBtn = document.getElementById('demo-batch');
if (demoBatchBtn) {
  demoBatchBtn.addEventListener('click', () => {
    const items = [
      {
        label: 'Boleto_Condominio_01.pdf',
        type: 'simulated',
        payload: {
          mode: 'pdf',
          fileName: 'Boleto_Condominio_01.pdf',
          rawLine: '48190.00003 00005.150586 92257.040144 2 16320002419200',
          text: 'Superlogica 481-2 CONDOMINIO PONTOES DA BARRA CNPJ: 29.279.239/0001-24 Vencimento 16/11/2026 Valor do documento 24.192,00',
          producer: 'wkhtmltopdf 0.12.6',
          creator: 'Superlogica',
          binaryForensics: { eofCount: 1, hasIncrementalPrev: false, hasOverlayAnnotations: false }
        }
      },
      {
        label: 'Boleto_Cota_Extra_02.pdf',
        type: 'simulated',
        payload: {
          mode: 'line',
          rawLine: '63390.00116 12455.479605 06344.165664 8 16320002419200'
        }
      },
      {
        label: 'Boleto_Adulterado_03.pdf',
        type: 'simulated',
        payload: {
          mode: 'pdf',
          fileName: 'Boleto_Adulterado_03.pdf',
          rawLine: '26091.09008 63571.277308 71444.640009 1 13500000085000',
          text: 'Banco Itaú S.A. - CNPJ 12.345.678/0001-90 - Valor do documento 420,00 - Condomínio Residencial',
          producer: 'PDFium',
          creator: 'PDFium',
          binaryForensics: { eofCount: 2, hasIncrementalPrev: true, hasOverlayAnnotations: true }
        }
      }
    ];
    processBatch(items);
  });
}

const demoFraudBtn = document.getElementById('demo-fraud');
if (demoFraudBtn) {
  demoFraudBtn.addEventListener('click', () => {
    const sampleFraud = '26091.09008 63571.277308 71444.640009 1 13500000085000';
    digitableInput.value = sampleFraud;
    processBatch([
      {
        label: 'Simulação de Boleto Adulterado',
        type: 'simulated',
        payload: {
          mode: 'line',
          rawLine: sampleFraud,
          simulatedDocText: 'Banco Itaú S.A. - CNPJ 12.345.678/0001-90 - Valor do documento 420,00 - Condomínio Residencial'
        }
      }
    ]);
  });
}

// Filtros e Expandir/Recolher
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFilter();
  });
});

const toggleAllBtn = document.getElementById('btn-toggle-all');
if (toggleAllBtn) {
  toggleAllBtn.addEventListener('click', () => {
    const bodies = document.querySelectorAll('.report-body');
    const hasCollapsed = Array.from(bodies).some((b) => b.classList.contains('collapsed'));
    bodies.forEach((b) => {
      if (hasCollapsed) {
        b.classList.remove('collapsed');
      } else {
        b.classList.add('collapsed');
      }
    });
    document.querySelectorAll('.toggle-indicator').forEach((el) => {
      el.textContent = hasCollapsed ? 'Ocultar' : 'Detalhes';
    });
  });
}

document.getElementById('btn-reset').addEventListener('click', () => {
  resultSection.classList.add('hidden');
  filePreview.classList.add('hidden');
  fileInput.value = '';
  digitableInput.value = '';
  currentReports = [];
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Upload de múltiplos arquivos
function handleMultipleFilesUpload(files) {
  filePreview.classList.remove('hidden');
  filePreview.innerHTML = `
    <strong>${files.length} ${files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}:</strong>
    <div class="file-preview-tags">
      ${files.map((f) => `<span class="file-chip">${escapeHtml(f.name)} (${(f.size / 1024).toFixed(0)} KB)</span>`).join('')}
    </div>
  `;

  const items = files.map((file) => ({
    label: file.name,
    type: 'file',
    file
  }));

  processBatch(items);
}

// Processamento em Lote com Relatórios Separados
async function processBatch(items) {
  const reports = [];
  const total = items.length;

  showProgress(`Auditando ${total} ${total === 1 ? 'boleto' : 'boletos'}...`, 'Iniciando verificação...', 5);

  for (let i = 0; i < total; i++) {
    const item = items[i];
    const pct = Math.round(((i + 0.5) / total) * 100);
    showProgress(`Auditando ${i + 1} de ${total}...`, `Analisando: ${item.label}`, pct);

    try {
      let payload;
      if (item.type === 'file') {
        const file = item.file;
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const pdfData = await extractFromPDF(file);
          payload = { mode: 'pdf', fileName: file.name, ...pdfData };
        } else if (file.type.startsWith('image/')) {
          const imgData = await extractFromImage(file);
          payload = { mode: 'image', fileName: file.name, ...imgData };
        } else {
          reports.push(buildUnreadableReport(i + 1, file.name, 'Formato de arquivo não suportado. Use PDF, PNG ou JPG.'));
          continue;
        }
      } else if (item.type === 'line') {
        payload = { mode: 'line', fileName: item.label, rawLine: item.rawLine };
      } else {
        payload = { ...item.payload, fileName: item.label };
      }

      const report = evaluateSingleBoleto(i + 1, item.label, payload);
      reports.push(report);
    } catch (err) {
      console.error('Erro detalhado na leitura do arquivo:', err);
      const isPassword = err && err.name === 'PasswordException';
      const detailMsg = isPassword
        ? 'Este PDF está protegido por senha. Remova a senha ou envie um print da tela.'
        : `Falha técnica ao decodificar o PDF (${err?.message || 'estrutura incompatível'}). Tente reabrir o arquivo ou enviar um print da tela.`;
      reports.push(buildUnreadableReport(i + 1, item.label, detailMsg));
    }
  }

  showProgress('Concluído!', 'Gerando relatórios individuais...', 100);
  await new Promise((r) => setTimeout(r, 200));
  hideProgress();

  currentReports = reports;
  activeFilter = 'all';
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  const allFilterBtn = document.querySelector('.filter-btn[data-filter="all"]');
  if (allFilterBtn) allFilterBtn.classList.add('active');

  renderBatchResults(reports);
}

function buildUnreadableReport(index, title, reason) {
  return {
    index,
    title,
    statusKey: 'warning',
    statusBadge: 'ATENÇÃO • NÃO LIDO',
    verdictTitle: 'Não foi possível extrair os dados deste item',
    verdictSummary: reason,
    boleto: null,
    pix: null,
    payload: { fileName: title, mode: 'error' },
    checks: [{ status: 'warn', text: reason }],
    riskPoints: 20
  };
}

// Extração resiliente de PDF
async function extractFromPDF(file) {
  if (!window.pdfjsLib) {
    throw new Error('Biblioteca PDF.js não carregou. Verifique sua conexão com a internet.');
  }

  const rawBuffer = await file.arrayBuffer();
  const rawBytes = new Uint8Array(rawBuffer);

  const marker = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  let startOffset = 0;
  for (let i = 0; i < Math.min(rawBytes.length - 5, 1024); i++) {
    if (
      rawBytes[i] === marker[0] &&
      rawBytes[i + 1] === marker[1] &&
      rawBytes[i + 2] === marker[2] &&
      rawBytes[i + 3] === marker[3] &&
      rawBytes[i + 4] === marker[4]
    ) {
      startOffset = i;
      break;
    }
  }

  const cleanBytes = startOffset > 0 ? rawBytes.slice(startOffset) : rawBytes;
  const binaryForensics = inspectPdfBinary(cleanBytes.buffer);

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({
      data: cleanBytes.slice(),
      stopAtErrors: false
    }).promise;
  } catch (workerErr) {
    if (workerErr && workerErr.name === 'PasswordException') {
      throw workerErr;
    }
    pdf = await pdfjsLib.getDocument({
      data: cleanBytes.slice(),
      disableWorker: true,
      stopAtErrors: false
    }).promise;
  }

  let producer = '';
  let creator = '';
  let creationDate = '';
  let modDate = '';
  try {
    const meta = await pdf.getMetadata();
    producer = meta?.info?.Producer || '';
    creator = meta?.info?.Creator || '';
    creationDate = meta?.info?.CreationDate || '';
    modDate = meta?.info?.ModDate || '';
  } catch (_) {}

  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 2);
  for (let i = 1; i <= maxPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += ' ' + content.items.map((item) => item.str).join(' ');
    } catch (_) {}
  }

  let qrPayload = null;
  let visualBarcode44 = null;
  try {
    const page1 = await pdf.getPage(1);
    const baseViewport = page1.getViewport({ scale: 1.0 });
    const targetScale = Math.min(3.0, Math.max(1.2, 2200 / (baseViewport.width || 600)));
    const viewport = page1.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page1.render({ canvasContext: ctx, viewport }).promise;
    qrPayload = scanCanvasForQR(ctx, canvas.width, canvas.height);
    visualBarcode44 = decodeITFBarcodeFromCanvas(ctx, canvas.width, canvas.height);
  } catch (renderErr) {
    console.warn('Aviso ao renderizar camada gráfica do PDF:', renderErr);
  }

  return {
    text: fullText,
    producer,
    creator,
    creationDate,
    modDate,
    binaryForensics,
    qrPayload,
    visualBarcode44
  };
}

// Extração de Imagem
function extractFromImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const qrPayload = scanCanvasForQR(ctx, canvas.width, canvas.height);
        const visualBarcode44 = decodeITFBarcodeFromCanvas(ctx, canvas.width, canvas.height);
        resolve({
          text: '',
          producer: '',
          creator: '',
          creationDate: '',
          modDate: '',
          binaryForensics: null,
          qrPayload,
          visualBarcode44
        });
      };
      img.onerror = () => reject(new Error('Imagem inválida ou corrompida.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

// Inspeção forense da estrutura interna do arquivo PDF
function inspectPdfBinary(arrayBuffer) {
  const rawStr = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer));
  const eofMatches = rawStr.match(/%%EOF/g) || [];
  const eofCount = eofMatches.length;
  const hasIncrementalPrev = /\/Prev\s+\d+/.test(rawStr);
  const hasOverlayAnnotations = /\/Subtype\s*\/(Stamp|FreeText|Square|Ink|Widget)/.test(rawStr);

  return {
    eofCount,
    hasIncrementalPrev,
    hasOverlayAnnotations
  };
}

// Decodificador Óptico das Barras ITF-25
function decodeITFBarcodeFromCanvas(ctx, width, height) {
  const ITF_PATTERNS = {
    '00110': '0',
    '10001': '1',
    '01001': '2',
    '11000': '3',
    '00101': '4',
    '10100': '5',
    '01100': '6',
    '00011': '7',
    '10010': '8',
    '01010': '9'
  };

  const yStart = Math.floor(height * 0.55);
  const yEnd = Math.floor(height * 0.96);
  const step = Math.max(2, Math.floor((yEnd - yStart) / 60));

  for (let y = yStart; y < yEnd; y += step) {
    const row = ctx.getImageData(0, y, width, 1).data;
    const runs = [];
    let currentDark = null;
    let runLen = 0;

    for (let x = 0; x < width; x++) {
      const idx = x * 4;
      const lum = 0.299 * row[idx] + 0.587 * row[idx + 1] + 0.114 * row[idx + 2];
      const isDark = lum < 145;

      if (currentDark === null) {
        currentDark = isDark;
        runLen = 1;
      } else if (isDark === currentDark) {
        runLen++;
      } else {
        runs.push({ dark: currentDark, len: runLen });
        currentDark = isDark;
        runLen = 1;
      }
    }
    if (currentDark !== null) runs.push({ dark: currentDark, len: runLen });

    for (let i = 0; i <= runs.length - 227; i++) {
      if (!runs[i].dark) continue;
      const slice = runs.slice(i, i + 227);
      if (!slice[226].dark) continue;

      const lengths = slice.map((r) => r.len).sort((a, b) => a - b);
      const narrowAvg = lengths[Math.floor(lengths.length * 0.35)];
      const wideAvg = lengths[Math.floor(lengths.length * 0.8)];
      if (wideAvg < narrowAvg * 1.65) continue;

      const threshold = (narrowAvg + wideAvg) / 2;
      const bits = slice.map((r) => (r.len >= threshold ? '1' : '0')).join('');

      if (!bits.startsWith('0000') || !bits.endsWith('100')) continue;

      const body = bits.slice(4, 224);
      let decoded = '';
      let valid = true;

      for (let p = 0; p < 220; p += 10) {
        const barPattern = body[p] + body[p + 2] + body[p + 4] + body[p + 6] + body[p + 8];
        const spacePattern = body[p + 1] + body[p + 3] + body[p + 5] + body[p + 7] + body[p + 9];
        const d1 = ITF_PATTERNS[barPattern];
        const d2 = ITF_PATTERNS[spacePattern];
        if (!d1 || !d2) {
          valid = false;
          break;
        }
        decoded += d1 + d2;
      }

      if (valid && decoded.length === 44) {
        return decoded;
      }
    }
  }

  return null;
}

// Varre regiões para localizar QR Code Pix
function scanCanvasForQR(ctx, width, height) {
  if (!window.jsQR) return null;

  const regions = [
    { x: 0, y: 0, w: width, h: height },
    { x: Math.floor(width * 0.45), y: 0, w: Math.floor(width * 0.55), h: Math.floor(height * 0.55) },
    { x: 0, y: 0, w: width, h: Math.floor(height * 0.5) },
    { x: 0, y: Math.floor(height * 0.35), w: width, h: Math.floor(height * 0.65) }
  ];

  for (const r of regions) {
    if (r.w <= 0 || r.h <= 0) continue;
    const imgData = ctx.getImageData(r.x, r.y, r.w, r.h);
    const found = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth'
    });
    if (found && found.data) return found.data;
  }

  return null;
}

function getFormattedSoftwareName(producer, creator) {
  const p = (producer || '').trim();
  const c = (creator || '').trim();
  if (p && c && p.toLowerCase() !== c.toLowerCase()) {
    return `${p} / ${c}`;
  }
  return p || c;
}

// Avalia um único boleto
function evaluateSingleBoleto(index, title, payload) {
  const checks = [];
  let riskPoints = 0;

  const rawLine = payload.rawLine || extractDigitableLineFromText(payload.text || '');
  const textContent = payload.text || payload.simulatedDocText || '';
  const boleto = rawLine ? parseBoleto(rawLine) : null;
  const pix = payload.qrPayload ? parsePixEMV(payload.qrPayload) : null;

  if (!boleto && !pix && !payload.visualBarcode44) {
    return buildUnreadableReport(
      index,
      title,
      'Não foi identificada uma linha digitável ou QR Code Pix legível neste item.'
    );
  }

  if (boleto) {
    if (boleto.validMath) {
      checks.push({
        status: 'ok',
        text: `Dígitos verificadores FEBRABAN íntegros (${boleto.typeLabel}).`
      });
    } else {
      riskPoints += 50;
      checks.push({
        status: 'fail',
        text: 'Dígito verificador inválido! A sequência numérica foi alterada ou digitada incorretamente.'
      });
    }

    if (payload.visualBarcode44 && boleto.barcode44) {
      if (payload.visualBarcode44 !== boleto.barcode44) {
        riskPoints += 70;
        checks.push({
          status: 'fail',
          text: 'FRAUDE DETECTADA: As barras gráficas do código de barras não correspondem à linha digitável escrita no boleto (imagem adulterada sobreposta).'
        });
      } else {
        checks.push({
          status: 'ok',
          text: 'Leitura óptica das barras confirmada: imagem do código de barras idêntica à linha digitável.'
        });
      }
    }

    if (textContent && boleto.bankCode) {
      const mentionedBank = detectBankInText(textContent);
      if (mentionedBank && mentionedBank.code !== boleto.bankCode) {
        riskPoints += 50;
        checks.push({
          status: 'fail',
          text: `Divergência grave de banco: o texto do documento cita "${mentionedBank.name}", mas o código de barras pertence a "${boleto.bankName}" (${boleto.bankCode}).`
        });
      } else if (mentionedBank && mentionedBank.code === boleto.bankCode) {
        checks.push({
          status: 'ok',
          text: `Banco emissor (${boleto.bankName}) compatível com o cabeçalho do documento.`
        });
      }
    }

    if (textContent && boleto.amount !== null) {
      const printedAmounts = extractMoneyValues(textContent);
      if (printedAmounts.length > 0 && !printedAmounts.some((v) => Math.abs(v - boleto.amount) < 0.02)) {
        riskPoints += 45;
        checks.push({
          status: 'fail',
          text: `Divergência de valor: o código de barras cobra ${formatBRL(boleto.amount)}, mas esse valor não corresponde aos valores impressos no documento.`
        });
      } else if (printedAmounts.length > 0) {
        checks.push({
          status: 'ok',
          text: `Valor codificado (${formatBRL(boleto.amount)}) idêntico ao valor impresso no documento.`
        });
      }
    }

    if (textContent && boleto.dueDate) {
      const printedDates = extractDatesFromText(textContent);
      if (printedDates.length > 0 && printedDates.includes(boleto.dueDate)) {
        checks.push({
          status: 'ok',
          text: `Data de vencimento codificada (${boleto.dueDate}) confirmada no corpo do boleto.`
        });
      }
    }
  } else {
    riskPoints += 15;
    checks.push({
      status: 'warn',
      text: 'Linha digitável não localizada no texto do arquivo; análise baseada nos demais elementos encontrados.'
    });
  }

  if (payload.mode === 'pdf') {
    const softwareRaw = getFormattedSoftwareName(payload.producer, payload.creator);
    const softwareLower = softwareRaw.toLowerCase();
    const suspiciousTool = EDITORES_SUSPEITOS.find((tool) => softwareLower.includes(tool));
    const isKnownAutomated = GERADORES_AUTOMATIZADOS.some((gen) => softwareLower.includes(gen));

    if (suspiciousTool) {
      riskPoints += 55;
      checks.push({
        status: 'fail',
        text: `PDF modificado ou regravado por editor/navegador (${softwareRaw}), padrão típico de boletos adulterados.`
      });
    } else if (!softwareRaw) {
      riskPoints += 40;
      checks.push({
        status: 'fail',
        text: 'Metadados de origem do PDF ausentes ou removidos — boletos bancários legítimos identificam o sistema gerador.'
      });
    } else if (isKnownAutomated) {
      checks.push({
        status: 'ok',
        text: `Motor de emissão automatizado identificado (${softwareRaw}).`
      });
    } else {
      riskPoints += 25;
      checks.push({
        status: 'warn',
        text: `Gerador de PDF não reconhecido na lista de sistemas bancários (${softwareRaw}).`
      });
    }

    if (payload.binaryForensics) {
      if (payload.binaryForensics.eofCount > 1 || payload.binaryForensics.hasIncrementalPrev) {
        riskPoints += 55;
        checks.push({
          status: 'fail',
          text: `Adulteração estrutural no PDF: o arquivo possui ${payload.binaryForensics.eofCount} camadas de salvamento (edição incremental após a emissão original).`
        });
      } else {
        checks.push({
          status: 'ok',
          text: 'Estrutura interna íntegra: arquivo possui camada única de gravação (sem edições posteriores).'
        });
      }

      if (payload.binaryForensics.hasOverlayAnnotations) {
        riskPoints += 45;
        checks.push({
          status: 'fail',
          text: 'Foram detectados objetos/carimbos sobrepostos na camada de anotações do PDF.'
        });
      }
    }

    if (payload.creationDate && payload.modDate && payload.creationDate !== payload.modDate) {
      riskPoints += 45;
      checks.push({
        status: 'fail',
        text: 'A data de modificação do PDF é diferente da data de emissão original, indicando alteração posterior.'
      });
    }
  }

  const cnpjsFound = extractCNPJsFromText(textContent);
  if (cnpjsFound.length > 0) {
    const invalidCnpj = cnpjsFound.find((c) => !validateCNPJ(c));
    if (invalidCnpj) {
      riskPoints += 40;
      checks.push({
        status: 'fail',
        text: `O CNPJ impresso no documento (${invalidCnpj}) possui dígitos verificadores inválidos.`
      });
    } else {
      checks.push({
        status: 'ok',
        text: `CNPJ(s) identificado(s) no documento estruturalmente válido(s) (${cnpjsFound[0]}).`
      });
    }
  }

  if (pix) {
    if (/qr\s*code\s*indispon[íi]vel/i.test(textContent)) {
      riskPoints += 70;
      checks.push({
        status: 'fail',
        text: `FRAUDE DETECTADA: O boleto informa "QR Code Indisponível", mas há um QR Code Pix injetado no arquivo em nome de "${pix.merchantName || 'Desconhecido'}".`
      });
    } else {
      checks.push({
        status: 'ok',
        text: `QR Code Pix identificado — Recebedor codificado: "${pix.merchantName || 'Não informado'}" (${pix.merchantCity || 'Brasil'}).`
      });
    }

    if (pix.amount && boleto && boleto.amount && Math.abs(pix.amount - boleto.amount) > 0.02) {
      riskPoints += 50;
      checks.push({
        status: 'fail',
        text: `Divergência entre Pix e Código de Barras: o QR Code cobra ${formatBRL(pix.amount)}, enquanto o boleto cobra ${formatBRL(boleto.amount)}.`
      });
    }
  }

  if (/protesto em cart[óo]rio|bloqueio judicial|taxa associativa|atualiza[çc][ãa]o cadastral/i.test(textContent)) {
    riskPoints += 25;
    checks.push({
      status: 'warn',
      text: 'O texto contém termos frequentes em cobranças fraudulentas ou boletos de proposta/protesto. Confirme a origem antes de pagar.'
    });
  }

  if (payload.mode === 'line') {
    checks.push({
      status: 'warn',
      text: 'Como apenas a linha digitável foi informada, o sistema não pôde auditar o PDF nem o QR Code Pix. Confira o CNPJ recebedor no app do banco.'
    });
  }

  let statusKey = 'safe';
  let statusBadge = 'ÍNDICES CONSISTENTES';
  let verdictTitle = 'Nenhuma inconsistência estrutural detectada';
  let verdictSummary =
    'A matemática FEBRABAN, os valores e a integridade do arquivo estão alinhados. Faça apenas a conferência final do CNPJ no aplicativo bancário.';

  if (riskPoints >= 40) {
    statusKey = 'danger';
    statusBadge = 'ALTO RISCO • INDÍCIOS DE ADULTERAÇÃO';
    verdictTitle = 'Não pague este boleto sem validação direta';
    verdictSummary =
      'Foram encontradas inconsistências estruturais no PDF, divergências entre o documento e o código de barras ou sinais de edição posterior à emissão.';
  } else if (riskPoints > 0 || payload.mode === 'line') {
    statusKey = 'warning';
    statusBadge = 'ATENÇÃO • CONFERÊNCIA RECOMENDADA';
    verdictTitle = 'Estrutura numérica válida, mas exige conferência no banco';
    verdictSummary =
      'Os dígitos verificadores estão corretos, porém há pontos de atenção que exigem confirmação do beneficiário na tela do banco.';
  }

  return {
    index,
    title,
    statusKey,
    statusBadge,
    verdictTitle,
    verdictSummary,
    boleto,
    pix,
    payload,
    checks,
    riskPoints
  };
}

// Renderiza painel consolidado e relatórios individuais
function renderBatchResults(reports) {
  const total = reports.length;
  const dangerCount = reports.filter((r) => r.statusKey === 'danger').length;
  const warningCount = reports.filter((r) => r.statusKey === 'warning').length;
  const safeCount = reports.filter((r) => r.statusKey === 'safe').length;

  const totalAmount = reports.reduce((acc, r) => {
    const val = r.boleto?.amount ?? r.pix?.amount ?? 0;
    return acc + val;
  }, 0);

  document.getElementById('batch-title').textContent =
    total === 1
      ? 'Relatório Individual de Auditoria'
      : `Relatório Consolidado — ${total} Boletos Analisados`;

  document.getElementById('batch-subtitle').textContent =
    dangerCount > 0
      ? `Atenção: ${dangerCount} ${dangerCount === 1 ? 'boleto apresentou' : 'boletos apresentaram'} indícios graves de adulteração.`
      : 'Nenhum indício crítico de fraude estrutural encontrado no lote.';

  document.getElementById('batch-total-amount').textContent = formatBRL(totalAmount);

  document.getElementById('batch-stats').innerHTML = `
    <div class="stat-box danger">
      <span>Alto Risco / Adulterado</span>
      <strong>${dangerCount}</strong>
    </div>
    <div class="stat-box warning">
      <span>Atenção / Conferir Banco</span>
      <strong>${warningCount}</strong>
    </div>
    <div class="stat-box safe">
      <span>Índices Consistentes</span>
      <strong>${safeCount}</strong>
    </div>
  `;

  document.getElementById('count-all').textContent = total;
  document.getElementById('count-danger').textContent = dangerCount;
  document.getElementById('count-warning').textContent = warningCount;
  document.getElementById('count-safe').textContent = safeCount;

  const filterBar = document.getElementById('filter-bar');
  if (total > 1) {
    filterBar.classList.remove('hidden');
  } else {
    filterBar.classList.add('hidden');
  }

  const container = document.getElementById('reports-container');
  container.innerHTML = reports
    .map((r) => {
      // Inicia recolhido por padrão em todos os resultados; usuário clica para exibir detalhes
      const startExpanded = false;
      const quickBank = r.boleto?.bankName || 'Banco não identificado';
      const quickVal =
        r.boleto?.amount !== null && r.boleto?.amount !== undefined
          ? formatBRL(r.boleto.amount)
          : r.pix?.amount
          ? formatBRL(r.pix.amount)
          : 'Valor não fixado';
      const quickDue = r.boleto?.dueDate ? `Venc. ${r.boleto.dueDate}` : 'Sem vencimento fixo';

      const barcodeHtml = r.boleto
        ? `
          <div class="data-row"><dt>Modalidade</dt><dd>${r.boleto.typeLabel}</dd></div>
          <div class="data-row"><dt>Banco Emissor</dt><dd>${r.boleto.bankCode ? `${r.boleto.bankCode} — ${r.boleto.bankName}` : 'Arrecadação / Convênio'}</dd></div>
          <div class="data-row"><dt>Valor Codificado</dt><dd>${r.boleto.amount !== null ? formatBRL(r.boleto.amount) : 'Valor variável / não fixado'}</dd></div>
          <div class="data-row"><dt>Vencimento</dt><dd>${r.boleto.dueDate || 'Contra apresentação / não informado'}</dd></div>
          <div class="data-row"><dt>Integridade Matemática</dt><dd>${r.boleto.validMath ? 'Válida (Módulo 10/11)' : 'Adulterada / Inválida'}</dd></div>
        `
        : `<div class="data-row"><dt>Linha Digitável</dt><dd>Não detectada no arquivo</dd></div>`;

      const softwareDisplay =
        getFormattedSoftwareName(r.payload.producer, r.payload.creator) || 'Não informado / Removido';
      const eofInfo =
        r.payload.binaryForensics && r.payload.binaryForensics.eofCount > 1
          ? `Editado (${r.payload.binaryForensics.eofCount} revisões)`
          : r.payload.mode === 'pdf'
          ? 'Original (1 revisão)'
          : 'Não aplicável';

      const forensicHtml = `
        <div class="data-row"><dt>Documento / Origem</dt><dd>${escapeHtml(r.title)}</dd></div>
        <div class="data-row"><dt>Software Gerador (PDF)</dt><dd>${escapeHtml(softwareDisplay)}</dd></div>
        <div class="data-row"><dt>Estrutura do PDF</dt><dd>${eofInfo}</dd></div>
        <div class="data-row"><dt>QR Code Pix</dt><dd>${r.pix ? 'Detectado e decodificado' : 'Não encontrado'}</dd></div>
        <div class="data-row"><dt>Recebedor no QR Pix</dt><dd>${r.pix ? escapeHtml(r.pix.merchantName || 'Não informado') : '—'}</dd></div>
      `;

      const checksHtml = r.checks
        .map(
          (c) => `
          <li class="check-item">
            <span class="check-tag ${c.status}">${c.status === 'ok' ? 'OK' : c.status === 'warn' ? 'ATENÇÃO' : 'ALERTA'}</span>
            <span>${escapeHtml(c.text)}</span>
          </li>
        `
        )
        .join('');

      return `
        <article class="report-card status-${r.statusKey}" data-status="${r.statusKey}">
          <div class="report-header" onclick="toggleReportCard(this)">
            <div class="report-title-group">
              <span class="report-index">#${r.index}</span>
              <div class="report-name-wrap">
                <div class="report-name">${escapeHtml(r.title)}</div>
                <div class="report-quick-meta">${escapeHtml(quickBank)} • <strong>${quickVal}</strong> • ${quickDue}</div>
              </div>
            </div>
            <div class="report-right">
              <span class="status-pill ${r.statusKey}">${r.statusBadge}</span>
              <span class="toggle-indicator">${startExpanded ? 'Ocultar' : 'Detalhes'}</span>
            </div>
          </div>

          <div class="report-body ${startExpanded ? '' : 'collapsed'}">
            <div class="verdict-box ${r.statusKey}">
              <h3>${r.verdictTitle}</h3>
              <p>${r.verdictSummary}</p>
            </div>

            <div class="grid-2">
              <div class="sub-panel">
                <div class="sub-panel-header">
                  <h4>Raio-X do Código de Barras</h4>
                  <span class="blue-chip">Matemática FEBRABAN</span>
                </div>
                <dl class="data-list">${barcodeHtml}</dl>
              </div>

              <div class="sub-panel">
                <div class="sub-panel-header">
                  <h4>Perícia do Arquivo & QR Code Pix</h4>
                  <span class="blue-chip">Integridade</span>
                </div>
                <dl class="data-list">${forensicHtml}</dl>
              </div>
            </div>

            <div class="checks-box">
              <h4>Critérios Verificados neste Boleto</h4>
              <ul class="checks-list">${checksHtml}</ul>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.toggleReportCard = function (headerEl) {
  const body = headerEl.nextElementSibling;
  const indicator = headerEl.querySelector('.toggle-indicator');
  const isCollapsed = body.classList.toggle('collapsed');
  if (indicator) {
    indicator.textContent = isCollapsed ? 'Detalhes' : 'Ocultar';
  }
};

function applyFilter() {
  document.querySelectorAll('.report-card').forEach((card) => {
    if (activeFilter === 'all' || card.dataset.status === activeFilter) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

/* ==================== FUNÇÕES MATEMÁTICAS FEBRABAN & PIX ==================== */

function parseBoleto(raw) {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 47) {
    const campo1 = digits.slice(0, 9);
    const dv1 = Number(digits[9]);
    const campo2 = digits.slice(10, 20);
    const dv2 = Number(digits[20]);
    const campo3 = digits.slice(21, 31);
    const dv3 = Number(digits[31]);
    const dvGeral = Number(digits[32]);
    const fatorVenc = Number(digits.slice(33, 37));
    const valorCentavos = Number(digits.slice(37, 47));

    const barcode44 =
      digits.slice(0, 4) +
      digits[32] +
      digits.slice(33, 47) +
      digits.slice(4, 9) +
      digits.slice(10, 20) +
      digits.slice(21, 31);

    const barcodeWithoutDV = barcode44.slice(0, 4) + barcode44.slice(5);
    const calcDvGeral = mod11Febraban(barcodeWithoutDV);

    const validMath =
      mod10(campo1) === dv1 &&
      mod10(campo2) === dv2 &&
      mod10(campo3) === dv3 &&
      calcDvGeral === dvGeral;

    const bankCode = digits.slice(0, 3);
    const bankName = BANCOS_BR[bankCode] || `Instituição Financeira (Cód. ${bankCode})`;

    return {
      typeLabel: 'Boleto de Cobrança Bancária (47 dígitos)',
      validMath,
      barcode44,
      bankCode,
      bankName,
      amount: valorCentavos > 0 ? valorCentavos / 100 : null,
      dueDate: decodeFebrabanDate(fatorVenc)
    };
  }

  if (digits.length === 48 && digits.startsWith('8')) {
    const idValor = digits[2];
    const useMod10 = idValor === '6' || idValor === '7';
    const blocks = [
      { data: digits.slice(0, 11), dv: Number(digits[11]) },
      { data: digits.slice(12, 23), dv: Number(digits[23]) },
      { data: digits.slice(24, 35), dv: Number(digits[35]) },
      { data: digits.slice(36, 47), dv: Number(digits[47]) }
    ];

    const validMath = blocks.every((b) =>
      useMod10 ? mod10(b.data) === b.dv : mod11Arrecadacao(b.data) === b.dv
    );

    const barcode44 = blocks.map((b) => b.data).join('');
    const valorCentavos = Number(barcode44.slice(4, 15));

    return {
      typeLabel: 'Guia de Arrecadação / Concessionária (48 dígitos)',
      validMath,
      barcode44,
      bankCode: null,
      bankName: 'Arrecadação / Convênio',
      amount: valorCentavos > 0 ? valorCentavos / 100 : null,
      dueDate: null
    };
  }

  return null;
}

function mod10(numStr) {
  let sum = 0;
  let weight = 2;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let prod = Number(numStr[i]) * weight;
    if (prod > 9) prod = Math.floor(prod / 10) + (prod % 10);
    sum += prod;
    weight = weight === 2 ? 1 : 2;
  }
  const rem = sum % 10;
  return rem === 0 ? 0 : 10 - rem;
}

function mod11Febraban(numStr) {
  let sum = 0;
  let weight = 2;
  for (let i = numStr.length - 1; i >= 0; i--) {
    sum += Number(numStr[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rem = sum % 11;
  const dv = 11 - rem;
  if (dv === 0 || dv === 10 || dv === 11) return 1;
  return dv;
}

function mod11Arrecadacao(numStr) {
  let sum = 0;
  let weight = 2;
  for (let i = numStr.length - 1; i >= 0; i--) {
    sum += Number(numStr[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rem = sum % 11;
  if (rem === 0 || rem === 1) return 0;
  if (rem === 10) return 1;
  return 11 - rem;
}

function decodeFebrabanDate(factor) {
  if (!factor || factor < 1000) return null;
  const baseDate = new Date(Date.UTC(2025, 1, 22));
  baseDate.setUTCDate(baseDate.getUTCDate() + (factor - 1000));
  return baseDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function parsePixEMV(payload) {
  if (!payload || !payload.includes('br.gov.bcb.pix')) return null;
  const tags = parseTLV(payload);
  return {
    merchantName: tags['59'] || null,
    merchantCity: tags['60'] || null,
    amount: tags['54'] ? parseFloat(tags['54']) : null
  };
}

function parseTLV(str) {
  const result = {};
  let i = 0;
  while (i + 4 <= str.length) {
    const tag = str.slice(i, i + 2);
    const len = parseInt(str.slice(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > str.length) break;
    result[tag] = str.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return result;
}

function extractDigitableLineFromText(text) {
  const regex47 = /\d{5}[\.\s]?\d{5}[\s]?\d{5}[\.\s]?\d{6}[\s]?\d{5}[\.\s]?\d{6}[\s]?\d[\s]?\d{14}/;
  const match47 = text.match(regex47);
  if (match47) return match47[0];

  const regex48 = /8\d{10}[\s-]?\d[\s]?\d{11}[\s-]?\d[\s]?\d{11}[\s-]?\d[\s]?\d{11}[\s-]?\d/;
  const match48 = text.match(regex48);
  if (match48) return match48[0];

  return null;
}

function detectBankInText(text) {
  const lower = text.toLowerCase();
  const patterns = [
    { code: '341', name: 'Itaú', keys: ['itaú', 'itau', '341-7'] },
    { code: '237', name: 'Bradesco', keys: ['bradesco', '237-2'] },
    { code: '001', name: 'Banco do Brasil', keys: ['banco do brasil', '001-9'] },
    { code: '104', name: 'Caixa Econômica', keys: ['caixa econômica', 'caixa economica', '104-0'] },
    { code: '033', name: 'Santander', keys: ['santander', '033-7'] },
    { code: '481', name: 'Superlógica SCD', keys: ['481-2', 'superlogica scd'] },
    { code: '633', name: 'Banco Rendimento / PJBank', keys: ['633-0', 'banco rendimento'] },
    { code: '756', name: 'Sicoob', keys: ['sicoob', '756-0'] },
    { code: '748', name: 'Sicredi', keys: ['sicredi', '748-x'] },
    { code: '077', name: 'Banco Inter', keys: ['banco inter', '077-9'] },
    { code: '260', name: 'Nubank', keys: ['nubank', 'nu pagamentos'] }
  ];
  return patterns.find((p) => p.keys.some((k) => lower.includes(k))) || null;
}

function extractMoneyValues(text) {
  const matches = text.match(/(?:R\$\s*)?\b\d{1,3}(?:\.\d{3})*,\d{2}\b(?!\s*%)/g) || [];
  return matches
    .map((m) => parseFloat(m.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.')))
    .filter((n) => !isNaN(n) && n > 0);
}

function extractDatesFromText(text) {
  return text.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || [];
}

function extractCNPJsFromText(text) {
  const formatted = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g) || [];
  return [...new Set(formatted)];
}

function validateCNPJ(cnpj) {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const calc = (slice, weights) => {
    const sum = slice.split('').reduce((acc, d, idx) => acc + Number(d) * weights[idx], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  const d1 = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(digits[12]) && d2 === Number(digits[13]);
}

function formatBRL(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showProgress(title, step, pct = 15) {
  if (progressTitle) progressTitle.textContent = title;
  if (progressStep) progressStep.textContent = step;
  if (progressFill) progressFill.style.width = `${pct}%`;
  if (auditProgress) auditProgress.classList.remove('hidden');
}

function hideProgress() {
  if (auditProgress) auditProgress.classList.add('hidden');
}