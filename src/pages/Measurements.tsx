import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MetricChart } from '../components/MetricChart';
import { useData } from '../hooks/DataContext';
import { TABLE_COLS } from '../lib/metrics';
import { formatDateFr, newId, todayISO } from '../lib/storage';
import type { Measurement } from '../lib/types';

type NumField =
  | 'weightLb'
  | 'bodyFatPct'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'thighL'
  | 'thighR'
  | 'armL'
  | 'armR';

const EMPTY_FIELDS: Record<NumField, string> = {
  weightLb: '',
  bodyFatPct: '',
  neck: '',
  shoulders: '',
  chest: '',
  waist: '',
  hips: '',
  thighL: '',
  thighR: '',
  armL: '',
  armR: '',
};

function parseOpt(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function fieldsFromMeasurement(m?: Measurement): Record<NumField, string> {
  if (!m) return { ...EMPTY_FIELDS };
  return {
    weightLb: m.weightLb?.toString() ?? '',
    bodyFatPct: m.bodyFatPct?.toString() ?? '',
    neck: m.neck?.toString() ?? '',
    shoulders: m.shoulders?.toString() ?? '',
    chest: m.chest?.toString() ?? '',
    waist: m.waist?.toString() ?? '',
    hips: m.hips?.toString() ?? '',
    thighL: m.thighL?.toString() ?? '',
    thighR: m.thighR?.toString() ?? '',
    armL: m.armL?.toString() ?? '',
    armR: m.armR?.toString() ?? '',
  };
}

export function Measurements() {
  const { measurements, chartSeries, upsertMeasurement, deleteMeasurement, activeClientId } =
    useData();
  const location = useLocation();
  const historiqueRef = useRef<HTMLElement | null>(null);

  const [date, setDate] = useState(() => {
    const stored = sessionStorage.getItem('coachpro_edit_measure_date');
    if (stored) {
      sessionStorage.removeItem('coachpro_edit_measure_date');
      return stored;
    }
    return todayISO();
  });
  const existingForDate = measurements.find((m) => m.date === date);
  const draftId = useRef(existingForDate?.id ?? newId());
  const [notes, setNotes] = useState(existingForDate?.notes ?? '');
  const [fields, setFields] = useState<Record<NumField, string>>(
    fieldsFromMeasurement(existingForDate),
  );
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timer = useRef<number | null>(null);
  const skipNextSave = useRef(false);
  const seeded = useRef(Boolean(existingForDate));

  // When date changes (or measurements reload), load that day's row.
  useEffect(() => {
    const row = measurements.find((m) => m.date === date);
    draftId.current = row?.id ?? newId();
    setNotes(row?.notes ?? '');
    setFields(fieldsFromMeasurement(row));
    seeded.current = Boolean(row);
    skipNextSave.current = true;
    setSaveState('idle');
  }, [date, measurements]);

  useEffect(() => {
    if (!activeClientId) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const anyValue =
        notes.trim() || Object.values(fields).some((v) => v.trim()) || seeded.current;
      if (!anyValue) return;
      setSaveState('saving');
      upsertMeasurement({
        id: draftId.current,
        clientId: activeClientId,
        date,
        notes,
        weightLb: parseOpt(fields.weightLb),
        bodyFatPct: parseOpt(fields.bodyFatPct),
        neck: parseOpt(fields.neck),
        shoulders: parseOpt(fields.shoulders),
        chest: parseOpt(fields.chest),
        waist: parseOpt(fields.waist),
        hips: parseOpt(fields.hips),
        thighL: parseOpt(fields.thighL),
        thighR: parseOpt(fields.thighR),
        armL: parseOpt(fields.armL),
        armR: parseOpt(fields.armR),
      });
      seeded.current = true;
      setSaveState('saved');
    }, 450);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [date, notes, fields, activeClientId, upsertMeasurement]);

  useEffect(() => {
    if (location.hash === '#historique' && historiqueRef.current) {
      historiqueRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  function setField(key: NumField, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function loadDate(d: string) {
    setDate(d);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const rows = [...measurements].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="page">
      <header className="page-header">
        <h2>Mesures</h2>
        <p className="muted">
          Saisie du jour, historique en tableau et graphiques (poids, graisse, circonférences).
        </p>
        <p className="autosave-status muted">
          {saveState === 'saving'
            ? 'Enregistrement…'
            : saveState === 'saved'
              ? 'Enregistré automatiquement'
              : 'Les modifications sont enregistrées automatiquement'}
        </p>
      </header>

      <div className="card form">
        <label>
          Date de la mesure
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <fieldset>
          <legend>
            Poids &amp; composition <span className="optional">(optionnel)</span>
          </legend>
          <div className="grid-2">
            <label>
              Poids (lb)
              <input
                inputMode="decimal"
                value={fields.weightLb}
                onChange={(e) => setField('weightLb', e.target.value)}
                placeholder="ex. 175"
              />
            </label>
            <label>
              Graisse (%)
              <input
                inputMode="decimal"
                value={fields.bodyFatPct}
                onChange={(e) => setField('bodyFatPct', e.target.value)}
                placeholder="ex. 18.5"
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Circonférences (pouces)</legend>
          <div className="grid-2">
            {(
              [
                ['neck', 'Cou'],
                ['shoulders', 'Épaules'],
                ['chest', 'Poitrine'],
                ['waist', 'Taille'],
                ['hips', 'Hanches'],
                ['thighL', 'Cuisse G'],
                ['thighR', 'Cuisse D'],
                ['armL', 'Bras G'],
                ['armR', 'Bras D'],
              ] as Array<[NumField, string]>
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  inputMode="decimal"
                  value={fields[key]}
                  onChange={(e) => setField(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Notes
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Commentaires libres…"
          />
        </label>
      </div>

      <section
        className="card table-card"
        id="historique"
        ref={historiqueRef}
      >
        <h3>Données antérieures</h3>
        <p className="muted section-hint">Tableau des mesures par date — touchez Éditer pour charger dans le formulaire.</p>
        {rows.length === 0 ? (
          <p className="muted">Aucune mesure pour ce client.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {TABLE_COLS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((m) => (
                  <tr key={m.id}>
                    <td className="sticky-col">{formatDateFr(m.date)}</td>
                    {TABLE_COLS.map((c) => {
                      const v = c.get(m);
                      return <td key={c.key}>{v != null ? v : '—'}</td>;
                    })}
                    <td className="notes-cell">{m.notes || '—'}</td>
                    <td className="row-actions">
                      <button type="button" className="btn small" onClick={() => loadDate(m.date)}>
                        Éditer
                      </button>
                      <button
                        type="button"
                        className="btn small danger"
                        onClick={() => {
                          if (confirm('Supprimer cette mesure ?')) deleteMeasurement(m.id);
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <MetricChart series={chartSeries} defaultKey="weight" />
    </div>
  );
}
