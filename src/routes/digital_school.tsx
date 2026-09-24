import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/digital_school")({
  component: RedirectToDigitalSchool,
});

function RedirectToDigitalSchool() {
  useEffect(() => {
    window.location.href = "https://digitalschool.sgkbrainova.com/school-register";
  }, []);

  return null;
}
