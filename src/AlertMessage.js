import React, { useEffect } from 'react';
import { toast } from 'sonner';

export default function AlertMessage({ message, show }) {
  useEffect(() => {
    if (show && message) {
      toast(message, {
        duration: 3000,
        style: {
          borderRadius: '24px',
          padding: '16px 24px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '11px',
          letterSpacing: '0.1em',
        }
      });
    }
  }, [show, message]);

  return null;
}
