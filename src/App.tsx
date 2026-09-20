import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DataProvider } from './hooks/DataContext';
import { Backup } from './pages/Backup';
import { Dashboard } from './pages/Dashboard';
import { MeasurementForm } from './pages/MeasurementForm';
import { Measurements } from './pages/Measurements';
import { Photos } from './pages/Photos';
import { SessionDetail } from './pages/SessionDetail';
import { SessionForm } from './pages/SessionForm';
import { Sessions } from './pages/Sessions';

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="seances" element={<Sessions />} />
            <Route path="seances/nouvelle" element={<SessionForm />} />
            <Route path="seances/:id" element={<SessionDetail />} />
            <Route path="seances/:id/edit" element={<SessionForm />} />
            <Route path="mesures" element={<Measurements />} />
            <Route path="mesures/nouvelle" element={<MeasurementForm />} />
            <Route path="mesures/:id/edit" element={<MeasurementForm />} />
            <Route path="photos" element={<Photos />} />
            <Route path="sauvegarde" element={<Backup />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}
