import { Navigate, Route, Routes } from 'react-router-dom';

import IdentityGate from './components/IdentityGate';
import Layout from './components/Layout';
import ChannelPage from './routes/ChannelPage';
import Home from './routes/Home';
import IntegralsPage from './routes/IntegralsPage';

export default function App() {
  return (
    <IdentityGate>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="canales/:channelId" element={<ChannelPage />} />
          <Route path="integrales" element={<IntegralsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </IdentityGate>
  );
}
