import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MCQHomeworkSection } from "@/components/homework/MCQHomeworkSection";

export const Route = createFileRoute("/mcq")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
  head: () => ({
    meta: [
      {
        title: "दैनिक MCQ स्वाध्याय व प्रश्नमंजुषा — SMART LEARNING",
      },
    ],
  }),
  component: MCQPublicPage,
});

function MCQPublicPage() {
  const { id } = Route.useSearch();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <MCQHomeworkSection
          initialQuizId={id}
          defaultRole="user"
          userName="विद्यार्थी / पालक"
        />
      </main>
      <Footer />
    </div>
  );
}
