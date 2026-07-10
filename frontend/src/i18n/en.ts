/** English strings. Add vi.ts with the same shape for Vietnamese. */
export const en = {
  appName: 'OAK',
  tagline: 'Book brilliant nail artists near you',
  nav: { search: 'Find a tech', login: 'Log in', register: 'Sign up', logout: 'Log out', dashboard: 'Dashboard' },
  search: {
    title: 'Find your next set',
    date: 'Date', time: 'Time', city: 'City', state: 'State', service: 'Service',
    priceMin: 'Min $', priceMax: 'Max $', minRating: 'Min rating', name: 'Technician name',
    submit: 'Search', noResults: 'No technicians with matching availability. Try another date, time, or location.',
    nextAvailable: 'Available', from: 'from', reviews: 'reviews', mobile: 'Mobile', salon: 'Salon',
  },
  booking: {
    pickService: 'Choose a service', pickAddOns: 'Add-ons', pickDate: 'Pick a date', pickSlot: 'Available times',
    noSlots: 'No open times this day — try another date.', notes: 'Notes for your tech (optional)',
    confirm: 'Confirm booking', total: 'Total', duration: 'min', checkoutTitle: 'Confirm & pay',
    payNow: 'Pay now (demo)', payLater: 'Pay at appointment', booked: 'Appointment booked!',
    pendingNote: 'This technician approves bookings manually — you will be notified when confirmed.',
  },
  status: { PENDING: 'Pending', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled', COMPLETED: 'Completed', NO_SHOW: 'No-show' },
  common: {
    loading: 'Loading…', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add',
    error: 'Something went wrong', page: 'Page', of: 'of', prev: 'Prev', next: 'Next', actions: 'Actions',
  },
  auth: {
    email: 'Email', password: 'Password', firstName: 'First name', lastName: 'Last name', phone: 'Phone',
    loginTitle: 'Welcome back', registerTitle: 'Create your account', iAmCustomer: 'I want to book appointments',
    iAmTech: 'I am a nail technician', haveAccount: 'Already have an account?', noAccount: 'New to OAK?',
  },
} as const;

export type Strings = typeof en;
