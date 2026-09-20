import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../hooks/DataContext';
import { newId, todayISO } from '../lib/storage';

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

function parseOpt(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export function MeasurementForm() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { measurements, upsertMeasurement, activeClientId } = useData();
  const existing = routeId ? measurements.find((m) => m.id === routeId) : undefined;

  const draftId = useRef(existing?.id ?? newId());
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [fields, setFields] = useState<Record<NumField, string>>({
    weightLb: existing?.weightLb?.toString() ?? '',
    bodyFatPct: existing?.bodyFatPct?.toString() ?? '',
    neck: existing?.neck?.toString() ?? '',
    shoulders: existing?.shoulders?.toString() ?? '',
    chest: existing?.chest?.toString() ?? '',
    waist: existing?.waist?.toString() ?? '',
    hips: existing?.hips?.toString() ?? '',
    thighL: existing?.thighL?.toString() ?? '',
    thighR: existing?.thighR?.toString() ?? '',
    armL: existing?.armL?.toString() ?? '',
    armR: existing?.armR?.toString() ?? '',
  });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timer = useRef<number | null>(null);
  const seeded = useRef(Boolean(existing));

  useEffect(() => {
    if (!existing) return;
    draftId.current = existing.id;
    setDate(existing.date);
    setNotes(existing.notes);
    setFields({
      weightLb: existing.weightLb?.toString() ?? '',
      bodyFatPct: existing.bodyFatPct?.toString() ?? '',
      neck: existing.neck?.toString() ?? '',
      shoulders: existing.shoulders?.toString() ?? '',
      chest: existing.chest?.toString() ?? '',
      waist: existing.waist?.toString() ?? '',
      hips: existing.hips?.toString() ?? '',
      thighL: existing.thighL?.toString() ?? '',
      thighR: existing.thighR?.toString() ?? '',
      armL: existing.armL?.toString() ?? '',
      armR: existing.armR?.toString() ?? '',
    });
    seeded.current = true;
  }, [existing]);

  useEffect(() => {
    if (!activeClientId) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const anyValue =
        notes.trim() ||
        Object.values(fields).some((v) => v.trim()) ||
        seeded.current;
      if (!anyValue && !existing) return;
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
      if (!routeId) {
        navigate(`/mesures/${draftId.current}/edit`, { replace: true });
      }
    }, 450);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [
    date,
    notes,
    fields,
    activeClientId,
    upsertMeasurement,
    existing,
    navigate,
    routeId,
  ]);

  function setField(key: NumField, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/mesures" className="back">
          ← Mesures
        </Link>
        <h2>{existing || seeded.current ? 'Mesure' : 'Nouvelle mesure'}</h2>
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
          Date
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
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Commentaires libres…"
          />
        </label>

        <Link className="btn primary block" to="/mesures">
          Retour à la liste
        </Link>
      </div>
    </div>
  );
}
