import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { LandingPage } from "./components/LandingPage";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { HomeScreen } from "./components/HomeScreen";
import { ListingsScreen } from "./components/ListingsScreen";
import { ListingsResultsScreen } from "./components/ListingsResultsScreen";
import { ListingDetail } from "./components/ListingDetail";
import { PassportScreen } from "./components/PassportScreen";
import { AlertScreen } from "./components/AlertScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { MyProfileScreen } from "./components/MyProfileScreen";
import { LoginScreen } from "./components/LoginScreen";
import { SignupScreen } from "./components/SignupScreen";

export const router = createBrowserRouter([
  // Public routes (no sidebar)
  { path: "/", Component: LandingPage },
  { path: "/login", Component: LoginScreen },
  { path: "/signup", Component: SignupScreen },
  { path: "/onboarding", Component: OnboardingScreen },

  // App routes (with sidebar) - protected
  {
    path: "/",
    Component: Layout,
    children: [
      { path: "home", Component: HomeScreen },
      { path: "listings/results", Component: ListingsResultsScreen },
      { path: "listings", Component: ListingsScreen },
      { path: "listing/:id", Component: ListingDetail },
      { path: "passport", Component: PassportScreen },
      { path: "optimize", Component: ProfileScreen },
      { path: "profile", Component: MyProfileScreen },
      { path: "alert", Component: AlertScreen },
    ],
  },
]);
