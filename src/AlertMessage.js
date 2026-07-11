<<<<<<< HEAD
import React, { useEffect } from 'react';
import { toast } from 'sonner';
=======
import React, { useEffect } from "react";
import { toast } from "sonner";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

export default function AlertMessage({ message, show }) {
  useEffect(() => {
    if (show && message) {
      toast(message, {
        duration: 3000,
        style: {
<<<<<<< HEAD
          borderRadius: '24px',
          padding: '16px 24px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '11px',
          letterSpacing: '0.1em',
        }
=======
          borderRadius: "24px",
          padding: "16px 24px",
          fontWeight: "bold",
          textTransform: "uppercase",
          fontSize: "11px",
          letterSpacing: "0.1em",
        },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      });
    }
  }, [show, message]);

  return null;
}
