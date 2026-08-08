import React from 'react';
import Modal from './Modal.jsx';
import PrivacyPolicyContent, { PRIVACY_POLICY_EFFECTIVE_DATE } from './PrivacyPolicyContent.jsx';

export default function PrivacyPolicyModal({ onClose }) {
  return (
    <Modal title="Privacy Policy" onClose={onClose} wide>
      <p style={{ color: 'var(--text-low)', fontSize: '12px', marginTop: '-6px' }}>
        Effective {PRIVACY_POLICY_EFFECTIVE_DATE}
      </p>
      <PrivacyPolicyContent />
    </Modal>
  );
}