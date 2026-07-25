import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import Footer from './components/Footer.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Observatory from './pages/Observatory.jsx';
import Reports from './pages/Reports.jsx';
import CountryProfiles from './pages/CountryProfiles.jsx';
import Fellowship from './pages/Fellowship.jsx';
import Certifications from './pages/Certifications.jsx';
import Contact from './pages/Contact.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/SignUp.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Unavailable from './pages/Unavailable.jsx';
import Publish from './pages/Publish.jsx';
import Docs from './pages/Docs.jsx';

export default function App() {
  return (
    <div id="app">
      <ScrollToTop />
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/observatory" element={<Observatory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/country-profiles" element={<CountryProfiles />} />
        <Route path="/fellows" element={<Fellowship />} />
        <Route path="/certifications" element={<Certifications />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/docs" element={<Docs />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
      <Footer />
    </div>
  );
}