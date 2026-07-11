import { createFileRoute } from "@tanstack/react-router";
<<<<<<< HEAD
import { MemoryRouter, Routes, Route as ReactRouterRoute } from "react-router-dom";
=======
import {
  MemoryRouter,
  Routes,
  Route as ReactRouterRoute,
} from "react-router-dom";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
// @ts-ignore
import WebResult from "@/result/webResult";

export const Route = createFileRoute(
  "/webResult/$udiseNumber/$srNo/$academicYear/$classValue/$selectedExamName",
)({
  component: WebResultRouteComponent,
});

function WebResultRouteComponent() {
<<<<<<< HEAD
  const { udiseNumber, srNo, academicYear, classValue, selectedExamName } = Route.useParams();
=======
  const { udiseNumber, srNo, academicYear, classValue, selectedExamName } =
    Route.useParams();
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

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
