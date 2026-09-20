import { useState } from 'react';
import { useData } from '../hooks/DataContext';

export function ClientPicker() {
  const {
    clients,
    activeClientId,
    setActiveClientId,
    createClient,
    renameClient,
    deleteClient,
  } = useData();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  function onSelect(value: string) {
    if (value === '__new__') {
      setCreating(true);
      setNewName('');
      return;
    }
    setActiveClientId(value);
  }

  function confirmCreate() {
    const name = newName.trim() || 'Nouveau client';
    createClient(name);
    setCreating(false);
    setNewName('');
  }

  function onRename() {
    const current = clients.find((c) => c.id === activeClientId);
    if (!current) return;
    const name = prompt('Nom du client', current.name);
    if (name == null) return;
    renameClient(current.id, name);
  }

  function onDelete() {
    const current = clients.find((c) => c.id === activeClientId);
    if (!current) return;
    if (
      !confirm(
        `Supprimer « ${current.name} » et toutes ses séances / mesures / photos locales ?`,
      )
    ) {
      return;
    }
    deleteClient(current.id);
  }

  return (
    <div className="client-picker">
      {creating ? (
        <div className="client-create">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom du client"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
          />
          <button type="button" className="btn small primary" onClick={confirmCreate}>
            OK
          </button>
          <button type="button" className="btn small" onClick={() => setCreating(false)}>
            Annuler
          </button>
        </div>
      ) : (
        <>
          <label className="client-label" htmlFor="client-select">
            Client
          </label>
          <select
            id="client-select"
            value={activeClientId ?? ''}
            onChange={(e) => onSelect(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new__">+ Nouveau client…</option>
          </select>
          <button type="button" className="btn small" onClick={onRename} title="Renommer">
            ✎
          </button>
          {clients.length > 1 && (
            <button
              type="button"
              className="btn small danger"
              onClick={onDelete}
              title="Supprimer"
            >
              ×
            </button>
          )}
        </>
      )}
    </div>
  );
}
