import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./components/ThemeProvider";
import { SavedListingsProvider } from "../contexts/SavedListingsContext";
import { AppliedListingsProvider } from "../contexts/AppliedListingsContext";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <ThemeProvider>
      <SavedListingsProvider>
        <AppliedListingsProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" />
        </AppliedListingsProvider>
      </SavedListingsProvider>
    </ThemeProvider>
  );
}

export default App;