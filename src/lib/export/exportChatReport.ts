/**
 * Exportación de dictámenes AgroIA: PDF (impresión), Word (.doc) y Excel (.csv).
 */

export interface ExportReportData {
  title?: string;
  query?: string;
  responseText: string;
  timestamp?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatResponseHtml(raw: string): string {
  return escapeHtml(raw)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/• (.*?)(\n|$)/g, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportToWord(data: ExportReportData): void {
  const dateStr = data.timestamp || new Date().toLocaleString('es-CO');
  const title = data.title || 'Informe Técnico AgroIA Tolima';
  const formattedResponse = formatResponseHtml(data.responseText);
  const queryBlock = data.query
    ? `<div class="query-box"><strong>Consulta Realizada:</strong><br/>"${escapeHtml(data.query)}"</div>`
    : '';

  const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
  <meta charset='utf-8'>
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
    .header { border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 25px; }
    .logo-text { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #047857; font-weight: bold; }
    h1 { font-size: 20pt; color: #064e3b; margin: 5px 0 15px 0; }
    .meta-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 18px; margin-bottom: 20px; }
    .query-box { background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px; margin-bottom: 20px; font-style: italic; }
    .content { font-size: 11pt; padding: 15px; border: 1px solid #e2e8f0; }
    .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 9pt; color: #64748b; text-align: center; }
    strong { color: #065f46; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-text">Gobernación del Tolima · Secretaría de Desarrollo Agropecuario</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta-box">
      <div><strong>AgroIA Tolima — Asistente Especializado Gemini AI</strong></div>
      <div>Fecha de emisión: <strong>${escapeHtml(dateStr)}</strong></div>
    </div>
  </div>
  ${queryBlock}
  <div class="content">
    <h3>Dictamen y recomendación técnica</h3>
    <p>${formattedResponse}</p>
  </div>
  <div class="footer">
    <p>Documento generado por AgroIA Tolima.</p>
    <p>Gobernación del Tolima · El Tolima Nos Une · Ibagué, Colombia</p>
  </div>
</body>
</html>`;

  triggerDownload(
    new Blob(['\ufeff', wordHtml], { type: 'application/msword' }),
    `AgroIA_Tolima_Informe_${Date.now()}.doc`,
  );
}

export function exportToExcel(data: ExportReportData): void {
  const dateStr = data.timestamp || new Date().toLocaleString('es-CO');
  const lines = data.responseText.split('\n').filter((line) => line.trim().length > 0);
  const query = data.query ? `"${data.query.replace(/"/g, '""')}"` : 'Consulta técnica';

  let csv = '\ufeff';
  csv += 'INFORME CONSULTA AGROIA TOLIMA - GOBERNACION DEL TOLIMA\n';
  csv += `Fecha;,${dateStr}\n`;
  csv += `Consulta realizada;,${query}\n\n`;
  csv += 'SECCION;,DETALLE DE LA RESPUESTA\n';

  lines.forEach((line, index) => {
    const clean = line.replace(/\*\*/g, '').replace(/•/g, '-').trim();
    csv += `Linea ${index + 1};,"${clean.replace(/"/g, '""')}"\n`;
  });

  csv += '\nGenerado por;,AgroIA Tolima - Gobernación del Tolima\n';
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `AgroIA_Tolima_Reporte_${Date.now()}.csv`,
  );
}

export function exportToPDF(data: ExportReportData): void {
  const dateStr = data.timestamp || new Date().toLocaleString('es-CO');
  const title = data.title || 'Informe Técnico AgroIA Tolima';
  const formattedResponse = formatResponseHtml(data.responseText);
  const queryBlock = data.query
    ? `<div class="query-card"><strong>Consulta de origen:</strong><br/>"${escapeHtml(data.query)}"</div>`
    : '';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('Permita ventanas emergentes para imprimir o guardar el PDF.');
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6; font-size: 12pt; }
    .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
    .branding { font-size: 10pt; font-weight: bold; color: #047857; text-transform: uppercase; letter-spacing: 1px; }
    h1 { font-size: 18pt; color: #022c22; margin: 8px 0; }
    .meta-card { background: #f0fdf4; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 10pt; }
    .query-card { background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin-bottom: 20px; font-style: italic; }
    .response-card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 9pt; color: #64748b; text-align: center; }
    strong { color: #065f46; }
  </style>
</head>
<body>
  <div class="header">
    <div class="branding">República de Colombia · Gobernación del Tolima</div>
    <h1>${escapeHtml(title)}</h1>
    <div style="font-weight:bold;color:#059669;">AgroIA Tolima · Gemini 2.5</div>
  </div>
  <div class="meta-card">
    <strong>Secretaría de Desarrollo Agropecuario y Seguridad Alimentaria</strong><br/>
    Fecha y hora de emisión: <strong>${escapeHtml(dateStr)}</strong>
  </div>
  ${queryBlock}
  <div class="response-card">
    <h3 style="color:#064e3b;margin-top:0;">Respuesta y dictamen técnico</h3>
    <p>${formattedResponse}</p>
  </div>
  <div class="footer">
    Documento expedido por AgroIA Tolima.<br/>
    Gobernación del Tolima · El Tolima Nos Une · Ibagué, Colombia
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body>
</html>`);
  printWindow.document.close();
}
