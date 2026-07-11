import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/teacher/login")({
  component: () => {
    const navigate = useNavigate();
    useEffect(() => {
      navigate({
        to: "/login",
        search: { redirect: "/teacher", role: "teacher" } as any,
      });
    }, []);
    return null;
  },
});
