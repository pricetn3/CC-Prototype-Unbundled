import { Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { Home } from './pages/Home';
import { Organizations } from './pages/Organizations';
import { OrgProfile } from './pages/OrgProfile';
import { Admin } from './pages/Admin';
import { NotBuilt } from './pages/NotBuilt';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="organizations/new" element={<NotBuilt title="Add organization" />} />
        <Route path="organizations/:orgNum" element={<OrgProfile />} />
        <Route path="admin" element={<Admin />} />

        {/* In the side nav, not built yet */}
        <Route path="users" element={<NotBuilt title="Users" />} />
        <Route path="users/invite" element={<NotBuilt title="Invite user" />} />
        <Route path="profile" element={<NotBuilt title="Profile" />} />
        <Route path="reports" element={<NotBuilt title="Reports" />} />
        <Route path="orders" element={<NotBuilt title="Orders" />} />
        <Route path="orders/new" element={<NotBuilt title="Place new order" />} />
        <Route path="orders/credentials" element={<NotBuilt title="Credentials" />} />
        <Route path="orders/reorders" element={<NotBuilt title="Reorder Management" />} />
        <Route path="orders/holds" element={<NotBuilt title="Hold Management" />} />
        <Route path="signatures" element={<NotBuilt title="Signatures" />} />
        <Route path="documents" element={<NotBuilt title="Documents" />} />
        <Route path="support" element={<NotBuilt title="Support" />} />
        <Route path="login" element={<NotBuilt title="Log in" />} />
        <Route path="*" element={<NotBuilt title="Page not found" text="This address doesn't match a page in the platform." />} />
      </Route>
    </Routes>
  );
}
