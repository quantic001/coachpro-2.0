import { Navigate } from 'react-router-dom';

/** Ancien onglet Historique → section Données antérieures dans Mesures. */
export function History() {
  return <Navigate to="/mesures#historique" replace />;
}
