/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VHook from './pages/VHook';
import Community from './pages/Community';
import GlobalNav from './components/GlobalNav';

export default function App() {
  return (
    <BrowserRouter>
      <div id="app-capture-root" className="min-h-screen">
        <GlobalNav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/v-hook" element={<VHook />} />
          <Route path="/community" element={<Community />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
