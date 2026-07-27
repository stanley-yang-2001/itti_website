import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
import Donate from './pages/Donate.jsx';
import DonateThankYou from './pages/DonateThankYou.jsx';

/**
 * Gives routed page content a gentle fade-in on navigation instead of
 * a hard cut. Keyed by pathname so React fully remounts (and
 * re-triggers the CSS entrance animation) on every route change -
 * NavBar/Footer are outside this wrapper and stay put.
 *
 * flex:1 + min-height:0 + display:flex/column here matter: #app is a
 * column flex container, and several pages (e.g. PlaceholderPage) rely
 * on being a direct flex child with flex:1 to center their content -
 * this wrapper has to pass that through transparently rather than
 * just being a plain block div.
 */
function PageTransition({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-transition">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <div id="app">
      <ScrollToTop />
      <NavBar />
      <PageTransition>
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
        <Route path="/donate" element={<Donate />} />
        <Route path="/donate/thank-you" element={<DonateThankYou />} />

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
      </PageTransition>
      <Footer />
    </div>
  );
}