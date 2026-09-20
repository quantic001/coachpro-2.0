import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../hooks/DataContext';
import { todayISO } from '../lib/storage';

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
  const { id } = useParams();
  const navigate = useNavigate();
  const { measurements, upsertMeasurement } = useData();
  const existing = id ? measurements.find((m) => m.id === id) : undefined;

  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [fields, setFields] = useState<Record<NumField, string>>({
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
  });

  useEffect(() => {
    if (!existing) return;
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
  }, [existing]);

  function setField(key: NumField, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    upsertMeasurement({
      id: existing?.id,
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
    navigate('/mesures');
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/mesures" className="back">
          ← Mesures
        </Link>
        <h2>{existing ? 'Modifier la mesure' : 'Nouvelle mesure'}</h2>
      </header>

      <form className="card form" onSubmit={onSubmit}>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <fieldset>
          <legend>Poids &amp; composition <span className="optional">(optionnel)</span></legend>
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

        <button type="submit" className="btn primary block">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
