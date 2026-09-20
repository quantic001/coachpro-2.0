import type { Client, Measurement, Session } from './types';
import {
  loadClients,
  loadMeasurements,
  loadSessions,
} from './storage';

/** fr-CA Excel prefers semicolon CSV + BOM */
function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const lines = rows.map((r) => r.map(csvEscape).join(';'));
  return `\uFEFF${lines.join('\r\n')}`;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'client';
}

const MEASURE_HEADERS = [
  'date',
  'poids_lb',
  'graisse_pct',
  'cou',
  'epaules',
  'poitrine',
  'taille',
  'hanches',
  'cuisse_g',
  'cuisse_d',
  'bras_g',
  'bras_d',
  'notes',
];

function measurementRows(list: Measurement[]): Array<Array<string | number | null | undefined>> {
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  return [
    MEASURE_HEADERS,
    ...sorted.map((m) => [
      m.date,
      m.weightLb ?? '',
      m.bodyFatPct ?? '',
      m.neck ?? '',
      m.shoulders ?? '',
      m.chest ?? '',
      m.waist ?? '',
      m.hips ?? '',
      m.thighL ?? '',
      m.thighR ?? '',
      m.armL ?? '',
      m.armR ?? '',
      m.notes ?? '',
    ]),
  ];
}

function sessionRows(list: Session[]): Array<Array<string | number | null | undefined>> {
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  return [
    ['date', 'titre', 'contenu'],
    ...sorted.map((s) => [s.date, s.title, s.content]),
  ];
}

export function exportClientCsv(client: Client): void {
  const measurements = loadMeasurements().filter(
    (m) => m.clientId === client.id && !m.deletedAt,
  );
  const sessions = loadSessions().filter(
    (s) => s.clientId === client.id && !s.deletedAt,
  );

  const measureCsv = toCsv(measurementRows(measurements));
  const sessionCsv = toCsv(sessionRows(sessions));

  // Combined workbook-like: two sections in one CSV (Excel-friendly)
  const combined = [
    `Client;${csvEscape(client.name)}`,
    `Exporté;${new Date().toISOString()}`,
    '',
    '=== MESURES ===',
    measureCsv.replace(/^\uFEFF/, ''),
    '',
    '=== SEANCES ===',
    sessionCsv.replace(/^\uFEFF/, ''),
  ].join('\r\n');

  downloadBlob(
    `coachpro-${slug(client.name)}-${stamp()}.csv`,
    `\uFEFF${combined}`,
    'text/csv;charset=utf-8',
  );
}

export function exportClientMeasurementsCsv(client: Client): void {
  const measurements = loadMeasurements().filter(
    (m) => m.clientId === client.id && !m.deletedAt,
  );
  downloadBlob(
    `coachpro-mesures-${slug(client.name)}-${stamp()}.csv`,
    toCsv(measurementRows(measurements)),
    'text/csv;charset=utf-8',
  );
}

export function exportAllClientsCsv(): void {
  const clients = loadClients().filter((c) => !c.deletedAt);
  const measurements = loadMeasurements().filter((m) => !m.deletedAt);
  const sessions = loadSessions().filter((s) => !s.deletedAt);
  const nameById = new Map(clients.map((c) => [c.id, c.name]));

  const mRows: Array<Array<string | number | null | undefined>> = [
    ['client', ...MEASURE_HEADERS],
    ...[...measurements]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => [
        nameById.get(m.clientId) ?? m.clientId,
        m.date,
        m.weightLb ?? '',
        m.bodyFatPct ?? '',
        m.neck ?? '',
        m.shoulders ?? '',
        m.chest ?? '',
        m.waist ?? '',
        m.hips ?? '',
        m.thighL ?? '',
        m.thighR ?? '',
        m.armL ?? '',
        m.armR ?? '',
        m.notes ?? '',
      ]),
  ];

  const sRows: Array<Array<string | number | null | undefined>> = [
    ['client', 'date', 'titre', 'contenu'],
    ...[...sessions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => [
        nameById.get(s.clientId) ?? s.clientId,
        s.date,
        s.title,
        s.content,
      ]),
  ];

  const combined = [
    `Export tous clients;${new Date().toISOString()}`,
    '',
    '=== MESURES ===',
    toCsv(mRows).replace(/^\uFEFF/, ''),
    '',
    '=== SEANCES ===',
    toCsv(sRows).replace(/^\uFEFF/, ''),
  ].join('\r\n');

  downloadBlob(
    `coachpro-tous-clients-${stamp()}.csv`,
    `\uFEFF${combined}`,
    'text/csv;charset=utf-8',
  );
}

/** Simple SpreadsheetML (.xls) Excel can open — no heavy dependency */
export function exportClientExcel(client: Client): void {
  const measurements = loadMeasurements().filter(
    (m) => m.clientId === client.id && !m.deletedAt,
  );
  const sessions = loadSessions().filter(
    (s) => s.clientId === client.id && !s.deletedAt,
  );

  const xmlEscape = (v: string | number | null | undefined) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const sheetRows = (rows: Array<Array<string | number | null | undefined>>) =>
    rows
      .map(
        (r) =>
          `<Row>${r
            .map((c) => `<Cell><Data ss:Type="${typeof c === 'number' ? 'Number' : 'String'}">${xmlEscape(c)}</Data></Cell>`)
            .join('')}</Row>`,
      )
      .join('');

  const measureData = measurementRows(measurements);
  const sessionData = sessionRows(sessions);

  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Mesures">
  <Table>${sheetRows(measureData)}</Table>
 </Worksheet>
 <Worksheet ss:Name="Seances">
  <Table>${sheetRows(sessionData)}</Table>
 </Worksheet>
 <Worksheet ss:Name="Info">
  <Table>
   <Row><Cell><Data ss:Type="String">Client</Data></Cell><Cell><Data ss:Type="String">${xmlEscape(client.name)}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Exporté</Data></Cell><Cell><Data ss:Type="String">${xmlEscape(new Date().toISOString())}</Data></Cell></Row>
  </Table>
 </Worksheet>
</Workbook>`;

  downloadBlob(
    `coachpro-${slug(client.name)}-${stamp()}.xls`,
    workbook,
    'application/vnd.ms-excel',
  );
}

export function exportAllClientsExcel(): void {
  const clients = loadClients().filter((c) => !c.deletedAt);
  const measurements = loadMeasurements().filter((m) => !m.deletedAt);
  const sessions = loadSessions().filter((s) => !s.deletedAt);
  const nameById = new Map(clients.map((c) => [c.id, c.name]));

  const xmlEscape = (v: string | number | null | undefined) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const sheetRows = (rows: Array<Array<string | number | null | undefined>>) =>
    rows
      .map(
        (r) =>
          `<Row>${r
            .map((c) => `<Cell><Data ss:Type="${typeof c === 'number' ? 'Number' : 'String'}">${xmlEscape(c)}</Data></Cell>`)
            .join('')}</Row>`,
      )
      .join('');

  const mRows: Array<Array<string | number | null | undefined>> = [
    ['client', ...MEASURE_HEADERS],
    ...[...measurements]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => [
        nameById.get(m.clientId) ?? m.clientId,
        m.date,
        m.weightLb ?? '',
        m.bodyFatPct ?? '',
        m.neck ?? '',
        m.shoulders ?? '',
        m.chest ?? '',
        m.waist ?? '',
        m.hips ?? '',
        m.thighL ?? '',
        m.thighR ?? '',
        m.armL ?? '',
        m.armR ?? '',
        m.notes ?? '',
      ]),
  ];

  const sRows: Array<Array<string | number | null | undefined>> = [
    ['client', 'date', 'titre', 'contenu'],
    ...[...sessions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => [
        nameById.get(s.clientId) ?? s.clientId,
        s.date,
        s.title,
        s.content,
      ]),
  ];

  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Mesures">
  <Table>${sheetRows(mRows)}</Table>
 </Worksheet>
 <Worksheet ss:Name="Seances">
  <Table>${sheetRows(sRows)}</Table>
 </Worksheet>
</Workbook>`;

  downloadBlob(
    `coachpro-tous-clients-${stamp()}.xls`,
    workbook,
    'application/vnd.ms-excel',
  );
}
