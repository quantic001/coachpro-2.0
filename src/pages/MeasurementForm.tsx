import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useData } from '../hooks/DataContext';

/**
 * Legacy routes /mesures/nouvelle and /mesures/:id/edit redirect to the
 * unified Mesures page (form + données antérieures + graphiques).
 */
export function MeasurementForm() {
  const { id } = useParams();
  const { measurements } = useData();

  useEffect(() => {
    if (!id) return;
    const row = measurements.find((m) => m.id === id);
    if (row) {
      // Stash date so Mesures can open that day (sessionStorage, no URL clutter).
      sessionStorage.setItem('coachpro_edit_measure_date', row.date);
    }
  }, [id, measurements]);

  return <Navigate to="/mesures" replace />;
}
