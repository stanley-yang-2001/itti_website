import { useAuth } from '../context/AuthContext.jsx';
import SettingsPanel from '../components/SettingsPanel.jsx';
import SEO from '../components/SEO.jsx';
import '../styles/Settings.css';

/**
 * Standalone /settings page - kept for existing direct links (e.g.
 * PrivacyPolicy.jsx). The same settings UI also appears as a tab on the
 * Profile page (see Profile.jsx); both render <SettingsPanel> so there's
 * one implementation, not two copies to keep in sync.
 */
export default function Settings() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="settings-page">
      <SEO
        path="/settings"
        title="Settings"
        noindex
      />
        <div className="settings-denied">
          <h1>You need to be logged in to view Settings</h1>
          <p>Log in to manage your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <SEO
        path="/settings"
        title="Settings"
        noindex
      />
      <h2 className="display">Settings</h2>
      <p>Manage your account.</p>
      <SettingsPanel />
    </div>
  );
}