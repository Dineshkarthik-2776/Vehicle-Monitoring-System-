import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import LiveMap from './pages/LiveMap';
import Analytics from './pages/Analytics';
import Battery from './pages/Battery';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<LiveMap />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/battery" element={<Battery />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}