import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Protected from './components/Protected';

import Landing from './pages/public/Landing';
import Search from './pages/public/Search';
import TechnicianProfile from './pages/public/TechnicianProfile';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

import CustomerDashboard from './pages/customer/Dashboard';
import BookingCheckout from './pages/customer/BookingCheckout';
import AppointmentDetails from './pages/customer/AppointmentDetails';
import Favorites from './pages/customer/Favorites';

import TechDashboard from './pages/tech/Dashboard';
import TechCalendar from './pages/tech/Calendar';
import TechAppointments from './pages/tech/Appointments';
import TechServices from './pages/tech/Services';
import TechAvailability from './pages/tech/Availability';
import TechPortfolio from './pages/tech/Portfolio';
import TechProfileSettings from './pages/tech/ProfileSettings';

import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminAppointments from './pages/admin/Appointments';
import AdminReviews from './pages/admin/Reviews';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/search" element={<Search />} />
        <Route path="/technicians/:id" element={<TechnicianProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Customer */}
        <Route path="/account" element={<Protected roles={['CUSTOMER']}><CustomerDashboard /></Protected>} />
        <Route path="/account/favorites" element={<Protected roles={['CUSTOMER']}><Favorites /></Protected>} />
        <Route path="/book/:technicianId" element={<Protected roles={['CUSTOMER']}><BookingCheckout /></Protected>} />
        <Route path="/appointments/:id" element={<Protected><AppointmentDetails /></Protected>} />

        {/* Technician */}
        <Route path="/tech" element={<Protected roles={['TECHNICIAN']}><TechDashboard /></Protected>} />
        <Route path="/tech/calendar" element={<Protected roles={['TECHNICIAN']}><TechCalendar /></Protected>} />
        <Route path="/tech/appointments" element={<Protected roles={['TECHNICIAN']}><TechAppointments /></Protected>} />
        <Route path="/tech/services" element={<Protected roles={['TECHNICIAN']}><TechServices /></Protected>} />
        <Route path="/tech/availability" element={<Protected roles={['TECHNICIAN']}><TechAvailability /></Protected>} />
        <Route path="/tech/portfolio" element={<Protected roles={['TECHNICIAN']}><TechPortfolio /></Protected>} />
        <Route path="/tech/profile" element={<Protected roles={['TECHNICIAN']}><TechProfileSettings /></Protected>} />

        {/* Admin */}
        <Route path="/admin" element={<Protected roles={['ADMIN']}><AdminDashboard /></Protected>} />
        <Route path="/admin/users" element={<Protected roles={['ADMIN']}><AdminUsers /></Protected>} />
        <Route path="/admin/appointments" element={<Protected roles={['ADMIN']}><AdminAppointments /></Protected>} />
        <Route path="/admin/reviews" element={<Protected roles={['ADMIN']}><AdminReviews /></Protected>} />

        <Route path="*" element={<div className="card text-center">Page not found.</div>} />
      </Route>
    </Routes>
  );
}
