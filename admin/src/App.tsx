import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";

import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import UsersList from "./pages/Users/UsersList";
import UserDetail from "./pages/Users/UserDetail";
import CrewsList from "./pages/Crews/CrewsList";
import CrewDetail from "./pages/Crews/CrewDetail";
import Reports from "./pages/Reports";
import SupportList from "./pages/Support/SupportList";
import SupportDetail from "./pages/Support/SupportDetail";
import Tasks from "./pages/Tasks";
import Roadmap from "./pages/Roadmap";
import Admins from "./pages/Admins";
import Banners from "./pages/Banners";
import Email from "./pages/Email";
import Analytics from "./pages/Analytics";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import RankModeration from "./pages/RankModeration";
import SocialVerification from "./pages/SocialVerification";
import CrewWars from "./pages/CrewWars";
import PushComposer from "./pages/PushComposer";
import ReportsCenter from "./pages/ReportsCenter";
import Changelog from "./pages/Changelog";
import Faq from "./pages/Faq";
import Feedback from "./pages/Feedback";
import StatusPage from "./pages/StatusPage";
import WorkoutAnalytics from "./pages/WorkoutAnalytics";
import CrewAnalytics from "./pages/CrewAnalytics";
import RankingAnalytics from "./pages/RankingAnalytics";
import Retention from "./pages/Retention";
import Journal from "./pages/Journal";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index path="/" element={<Dashboard />} />
            <Route path="/users" element={<UsersList />} />
            <Route path="/users/:id" element={<UserDetail />} />
            <Route path="/crews" element={<CrewsList />} />
            <Route path="/crews/:id" element={<CrewDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/support" element={<SupportList />} />
            <Route path="/support/:id" element={<SupportDetail />} />
            <Route path="/rank-moderation" element={<RankModeration />} />
            <Route path="/social-verification" element={<SocialVerification />} />
            <Route path="/crew-wars" element={<CrewWars />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/banners" element={<Banners />} />
            <Route path="/announcements" element={<Navigate to="/banners" replace />} />
            <Route path="/email" element={<Email />} />
            <Route path="/push" element={<PushComposer />} />
            <Route path="/reports-center" element={<ReportsCenter />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/workout-analytics" element={<WorkoutAnalytics />} />
            <Route path="/crew-analytics" element={<CrewAnalytics />} />
            <Route path="/ranking-analytics" element={<RankingAnalytics />} />
            <Route path="/retention" element={<Retention />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/audit-log" element={<AuditLog />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admins" element={<Admins />} />
          </Route>

          <Route path="/signin" element={<SignIn />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
