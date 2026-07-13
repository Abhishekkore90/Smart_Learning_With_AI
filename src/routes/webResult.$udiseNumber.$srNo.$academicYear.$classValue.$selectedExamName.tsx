import { createFileRoute } from "@tanstack/react-router";
import { MemoryRouter, Routes, Route as ReactRouterRoute } from "react-router-dom";
// @ts-ignore
import WebResult from "@/result/webResult";

export const Route = createFileRoute(
  "/webResult/$udiseNumber/$srNo/$academicYear/$classValue/$selectedExamName",
)({
  component: WebResultRouteComponent,
});

function WebResultRouteComponent() {
  const { udiseNumber, srNo, academicYear, classValue, selectedExamName } = Route.useParams();

  return (
    <MemoryRouter
      initialEntries={[
        `/webResult/${udiseNumber}/${srNo}/${academicYear}/${classValue}/${selectedExamName}`,
      ]}
    >
      <Routes>
        <ReactRouterRoute
          path="/webResult/:udiseNumber/:srNo/:academicYear/:classValue/:selectedExamName"
          element={<WebResult />}
        />
      </Routes>
    </MemoryRouter>
  );
}
