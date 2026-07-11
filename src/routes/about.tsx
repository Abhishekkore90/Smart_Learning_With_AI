import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/home/AboutSection";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});
