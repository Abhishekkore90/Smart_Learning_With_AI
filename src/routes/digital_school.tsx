import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/digital_school")({
  component: RedirectToDigitalSchool,
});

function RedirectToDigitalSchool() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/digital-school", replace: true });
  }, [navigate]);

  return null;
}
