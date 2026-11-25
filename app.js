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
const progressStep = document.getElementById('progress-step');
const resultSection = document.getElementById('result-section');

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
  const file = e.dataTransfer.files[0];
  if (file) handleFileUpload(file);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFileUpload(file);
});

btnVerifyLine.addEventListener('click', () => {
  const raw = digitableInput.value.trim();
  if (!raw) {
    alert('Cole ou digite a linha digitável do boleto antes de verificar.');
    return;
  }
  runAudit({ mode: 'line', rawLine: raw });
});

// Botões de Demonstração Rápida
document.getElementById('demo-valid').addEventListener('click', () => {
  const sampleValid = '48190.00003 00005.150586 92257.040144 2 16320002419200';
  digitableInput.value = sampleValid;
  runAudit({ mode: 'line', rawLine: sampleValid });
});

document.getElementById('demo-fraud').addEventListener('click', () => {
  const sampleFraud = '26091.09008 63571.277308 71444.640009 1 13500000085000';
  digitableInput.value = sampleFraud;
  runAudit({
    mode: 'line',
    rawLine: sampleFraud,
    simulatedDocText: 'Banco Itaú S.A. - CNPJ 12.345.678/0001-90 - Valor do documento 420,00 - Condomínio Residencial'
  });
});

document.getElementById('btn-reset').addEventListener('click', () => {
  resultSection.classList.add('hidden');
  filePreview.classList.add('hidden');
  fileInput.value = '';
  digitableInput.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Processamento de Arquivo (PDF ou Imagem)
async function handleFileUpload(file) {
  filePreview.classList.remove('hidden');
  filePreview.innerHTML = `<span>Arquivo selecionado: <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)</span>`;

  showProgress('Executando perícia binária, leitura das barras e QR Code...');

  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const pdfData = await extractFromPDF(file);
      await runAudit({
        mode: 'pdf',
        fileName: file.name,
        ...pdfData
      });
    } else if (file.type.startsWith('image/')) {
      const imgData = await extractFromImage(file);
      await runAudit({
        mode: 'image',
        fileName: file.name,
        ...imgData
      });
    } else {
      hideProgress();
      alert('Formato não suportado. Envie um arquivo PDF, PNG ou JPG.');
    }
  } catch (err) {
    console.error(err);
    hideProgress();
    alert('Não foi possível ler este arquivo. Verifique se o PDF não está protegido por senha ou tente enviar um print da tela.');
  }
}

async function extractFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();

  // 1. Inspeção forense na estrutura bruta do PDF
  const binaryForensics = inspectPdfBinary(arrayBuffer);

  // 2. Carrega documento via PDF.js
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;

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

  // Extrai texto de até 2 páginas
  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 2);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += ' ' + content.items.map((item) => item.str).join(' ');
  }

  // Renderiza página 1 em alta resolução (3.0x) para ler QR Code Pix e barras ITF-25
  const page1 = await pdf.getPage(1);
  const viewport = page1.getViewport({ scale: 3.0 });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page1.render({ canvasContext: ctx, viewport }).promise;

  const qrPayload = scanCanvasForQR(ctx, canvas.width, canvas.height);
  const visualBarcode44 = decodeITFBarcodeFromCanvas(ctx, canvas.width, canvas.height);

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

function extractFromImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
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
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
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

// Decodificador Óptico das Barras do Código de Barras (Interleaved 2 of 5 - FEBRABAN)
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

// Varre a página inteira e recortes estratégicos para localizar QR Codes
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

// Orquestrador da Auditoria
async function runAudit(payload) {
  showProgress('Validando estrutura matemática FEBRABAN e perícia do arquivo...');
  await new Promise((r) => setTimeout(r, 450));

  const checks = [];
  let riskPoints = 0;

  let rawLine = payload.rawLine || extractDigitableLineFromText(payload.text || '');
  const textContent = payload.text || payload.simulatedDocText || '';
  const boleto = rawLine ? parseBoleto(rawLine) : null;
  const pix = payload.qrPayload ? parsePixEMV(payload.qrPayload) : null;

  if (!boleto && !pix && !payload.visualBarcode44) {
    hideProgress();
    alert(
      'Não identificamos uma linha digitável ou QR Code Pix legível neste arquivo. Se for uma imagem/scan sem texto selecionável, cole a linha digitável na aba ao lado.'
    );
    return;
  }

  // Avaliação da Linha Digitável
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

    // Cruzamento entre o código de barras gráfico e a linha digitável escrita
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

    // Cruzamento Banco do Código vs. Banco impresso no PDF
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

    // Cruzamento Valor do Código vs. Valor impresso no PDF
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

    // Cruzamento Vencimento do Código vs. Data impressa no PDF
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

  // Perícia Forense do PDF (Metadados, Salvamento Incremental e Datas)
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

    // Verifica salvamento incremental
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

    // Verifica diferença entre CreationDate e ModDate
    if (payload.creationDate && payload.modDate && payload.creationDate !== payload.modDate) {
      riskPoints += 45;
      checks.push({
        status: 'fail',
        text: 'A data de modificação do PDF é diferente da data de emissão original, indicando alteração posterior.'
      });
    }
  }

  // Avaliação de CNPJ impresso no texto
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

  // Avaliação do QR Code Pix (Boleto Híbrido)
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

  // Alerta de termos de engenharia social / falso protesto
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

  hideProgress();
  renderResults({ boleto, pix, payload, checks, riskPoints });
}

// Renderiza painel de resultados
function renderResults({ boleto, pix, payload, checks, riskPoints }) {
  const banner = document.getElementById('verdict-banner');
  const badge = document.getElementById('verdict-badge');
  const title = document.getElementById('verdict-title');
  const summary = document.getElementById('verdict-summary');

  banner.className = 'verdict-banner';

  if (riskPoints >= 40) {
    banner.classList.add('danger');
    badge.textContent = 'ALTO RISCO • INDÍCIOS DE ADULTERAÇÃO';
    title.textContent = 'Não pague este boleto sem validação direta';
    summary.textContent =
      'Foram encontradas inconsistências estruturais no PDF, divergências entre o documento e o código de barras ou sinais de edição posterior à emissão.';
  } else if (riskPoints > 0 || payload.mode === 'line') {
    banner.classList.add('warning');
    badge.textContent = 'ATENÇÃO • CONFERÊNCIA RECOMENDADA';
    title.textContent = 'Estrutura numérica válida, mas exige conferência no banco';
    summary.textContent =
      'Os dígitos verificadores estão corretos, porém há pontos de atenção que exigem confirmação do beneficiário na tela do banco.';
  } else {
    banner.classList.add('safe');
    badge.textContent = 'ÍNDICES CONSISTENTES';
    title.textContent = 'Nenhuma inconsistência estrutural detectada';
    summary.textContent =
      'A matemática FEBRABAN, os valores e a integridade do arquivo estão alinhados. Faça apenas a conferência final do CNPJ no aplicativo bancário.';
  }

  const barcodeEl = document.getElementById('barcode-data');
  if (boleto) {
    barcodeEl.innerHTML = `
      <div class="data-row"><dt>Modalidade</dt><dd>${boleto.typeLabel}</dd></div>
      <div class="data-row"><dt>Banco Emissor</dt><dd>${boleto.bankCode ? `${boleto.bankCode} — ${boleto.bankName}` : 'Arrecadação / Convênio'}</dd></div>
      <div class="data-row"><dt>Valor Codificado</dt><dd>${boleto.amount !== null ? formatBRL(boleto.amount) : 'Valor variável / não fixado'}</dd></div>
      <div class="data-row"><dt>Vencimento</dt><dd>${boleto.dueDate || 'Contra apresentação / não informado'}</dd></div>
      <div class="data-row"><dt>Integridade Matemática</dt><dd>${boleto.validMath ? 'Válida (Módulo 10/11)' : 'Adulterada / Inválida'}</dd></div>
    `;
  } else {
    barcodeEl.innerHTML = `<div class="data-row"><dt>Linha Digitável</dt><dd>Não detectada no arquivo</dd></div>`;
  }

  const forensicEl = document.getElementById('forensic-data');
  const softwareDisplay = getFormattedSoftwareName(payload.producer, payload.creator) || 'Não informado / Removido';
  const eofInfo =
    payload.binaryForensics && payload.binaryForensics.eofCount > 1
      ? `Editado (${payload.binaryForensics.eofCount} revisões)`
      : payload.mode === 'pdf'
      ? 'Original (1 revisão)'
      : 'Não aplicável';

  forensicEl.innerHTML = `
    <div class="data-row"><dt>Origem da Análise</dt><dd>${payload.fileName ? escapeHtml(payload.fileName) : 'Linha digitável colada'}</dd></div>
    <div class="data-row"><dt>Software Gerador (PDF)</dt><dd>${escapeHtml(softwareDisplay)}</dd></div>
    <div class="data-row"><dt>Estrutura do PDF</dt><dd>${eofInfo}</dd></div>
    <div class="data-row"><dt>QR Code Pix</dt><dd>${pix ? 'Detectado e decodificado' : 'Não encontrado'}</dd></div>
    <div class="data-row"><dt>Recebedor no QR Pix</dt><dd>${pix ? escapeHtml(pix.merchantName || 'Não informado') : '—'}</dd></div>
  `;

  const checksList = document.getElementById('checks-list');
  checksList.innerHTML = checks
    .map(
      (c) => `
      <li class="check-item">
        <span class="check-tag ${c.status}">${c.status === 'ok' ? 'OK' : c.status === 'warn' ? 'ATENÇÃO' : 'ALERTA'}</span>
        <span>${escapeHtml(c.text)}</span>
      </li>
    `
    )
    .join('');

  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

function showProgress(msg) {
  progressStep.textContent = msg;
  auditProgress.classList.remove('hidden');
}

function hideProgress() {
  auditProgress.classList.add('hidden');
}