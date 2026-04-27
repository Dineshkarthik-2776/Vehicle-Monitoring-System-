import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import LiveMap from './pages/LiveMap';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<LiveMap />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
