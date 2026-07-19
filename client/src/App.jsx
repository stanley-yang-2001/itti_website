import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import AboutItti from './pages/AboutItti.jsx';
import Observatory from './pages/Observatory.jsx';
import Reports from './pages/Reports.jsx';
import CountryProfiles from './pages/CountryProfiles.jsx';
import Fellows from './pages/Fellows.jsx';
import Certifications from './pages/Certifications.jsx';
import Contact from './pages/Contact.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/SignUp.jsx';
import Unavailable from './pages/Unavailable.jsx';
import Publish from './pages/Publish.jsx';

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

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/unavailable" element={<Unavailable />} />

        <Route
          path="/publish"
          element={
            <ProtectedRoute requireRole="publisher">
              <Publish />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}