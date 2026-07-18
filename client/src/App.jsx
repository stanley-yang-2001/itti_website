import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import Home from './pages/Home.jsx';
import AboutItti from './pages/AboutItti.jsx';
import Observatory from './pages/Observatory.jsx';
import Reports from './pages/Reports.jsx';
import CountryProfiles from './pages/CountryProfiles.jsx';
import Fellows from './pages/Fellows.jsx';
import Certifications from './pages/Certifications.jsx';
import Contact from './pages/Contact.jsx';

export default function App() {
  return (
    <div id="app">
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutItti />} />
        <Route path="/observatory" element={<Observatory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/country-profiles" element={<CountryProfiles />} />
        <Route path="/fellows" element={<Fellows />} />
        <Route path="/certifications" element={<Certifications />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </div>
  );
}
