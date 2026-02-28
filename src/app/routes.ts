import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { LandingPage } from "./components/LandingPage";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { HomeScreen } from "./components/HomeScreen";
import { ListingsScreen } from "./components/ListingsScreen";
import { ListingDetail } from "./components/ListingDetail";
import { PassportScreen } from "./components/PassportScreen";
import { AlertScreen } from "./components/AlertScreen";
import { ProfileScreen } from "./components/ProfileScreen";

export const router = createBrowserRouter([
  // Public routes (no sidebar)
  { path: "/", Component: LandingPage },
  { path: "/onboarding", Component: OnboardingScreen },

  // App routes (with sidebar)
  {
    path: "/",
    Component: Layout,
    children: [
      { path: "home", Component: HomeScreen },
      { path: "listings", Component: ListingsScreen },
      { path: "listing/:id", Component: ListingDetail },
      { path: "passport", Component: PassportScreen },
      { path: "profile", Component: ProfileScreen },
      { path: "alert", Component: AlertScreen },
    ],
  },
]);
