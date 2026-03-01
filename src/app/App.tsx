import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./components/ThemeProvider";
import { SavedListingsProvider } from "../contexts/SavedListingsContext";
import { AppliedListingsProvider } from "../contexts/AppliedListingsContext";

function App() {
  return (
    <ThemeProvider>
      <SavedListingsProvider>
        <AppliedListingsProvider>
          <RouterProvider router={router} />
        </AppliedListingsProvider>
      </SavedListingsProvider>
    </ThemeProvider>
  );
}

export default App;