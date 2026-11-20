import { Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { Home } from './pages/Home';
import { Organizations } from './pages/Organizations';
import { AddOrganization } from './pages/AddOrganization';
import { OrgProfile } from './pages/OrgProfile';
import { Admin } from './pages/Admin';
import { Users } from './pages/Users';
import { Profile } from './pages/Profile';
import { Reports } from './pages/Reports';
import { Orders } from './pages/Orders';
import { PlaceOrder } from './pages/PlaceOrder';
import { Credentials } from './pages/Credentials';
import { Reorders } from './pages/Reorders';
import { Holds } from './pages/Holds';
import { Signatures } from './pages/Signatures';
import { Documents } from './pages/Documents';
import { Support } from './pages/Support';
import { NotBuilt } from './pages/NotBuilt';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="organizations/new" element={<AddOrganization />} />
        <Route path="organizations/:orgNum" element={<OrgProfile />} />
        <Route path="admin" element={<Admin />} />
        <Route path="users" element={<Users />} />
        <Route path="users/invite" element={<Users />} />
        <Route path="users/:userId" element={<Profile />} />
        <Route path="profile" element={<Profile />} />
        <Route path="reports" element={<Reports />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<PlaceOrder />} />
        <Route path="orders/credentials" element={<Credentials />} />
        <Route path="orders/reorders" element={<Reorders />} />
        <Route path="orders/holds" element={<Holds />} />
        <Route path="signatures" element={<Signatures />} />
        <Route path="documents" element={<Documents />} />
        <Route path="support" element={<Support />} />
        <Route path="login" element={<NotBuilt title="Log in" />} />
        <Route path="*" element={<NotBuilt title="Page not found" text="This address doesn't match a page in the platform." />} />
      </Route>
    </Routes>
  );
}
