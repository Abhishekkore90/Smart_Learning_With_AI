import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/login")({
  component: () => {
    const navigate = useNavigate();
    useEffect(() => {
      navigate({
        to: "/login",
        search: { redirect: "/admin", role: "admin" } as any,
      });
    }, []);
    return null;
  },
});
