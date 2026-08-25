import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/home/ContactSection";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});
