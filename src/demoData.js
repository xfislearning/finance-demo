export const seedData = {
  company: {
    name: 'Qentro Demo Company',
    year: 2026,
    mileageRate: 0.70
  },
  expenses: [
    { id: 1, date: '2026-08-02', vendor: 'Office Depot', description: 'Printer supplies', category: 'Office Supplies', paidFrom: 'Business Credit Card', amount: 86.42 },
    { id: 2, date: '2026-08-05', vendor: 'Ziggi\'s Coffee', description: 'Client meeting', category: 'Meals', paidFrom: 'Business Credit Card', amount: 18.75 },
    { id: 3, date: '2026-08-08', vendor: 'GitHub', description: 'Developer tools', category: 'Software & Subscriptions', paidFrom: 'Business Credit Card', amount: 20.00 },
    { id: 4, date: '2026-08-12', vendor: 'FedEx Office', description: 'Marketing handouts', category: 'Advertising & Marketing', paidFrom: 'Business Checking', amount: 142.30 },
    { id: 5, date: '2026-08-19', vendor: 'Downtown Parking', description: 'Networking event parking', category: 'Parking & Tolls', paidFrom: 'Personal Credit Card', amount: 12.00 },
    { id: 6, date: '2026-08-23', vendor: 'Namecheap', description: 'Domain renewal', category: 'Software & Subscriptions', paidFrom: 'Business Credit Card', amount: 24.88 }
  ],
  mileage: [
    { id: 1, date: '2026-08-06', from: 'Berthoud, CO', to: 'Longmont, CO', purpose: 'Chamber networking', miles: 31.2 },
    { id: 2, date: '2026-08-14', from: 'Berthoud, CO', to: 'Denver, CO', purpose: 'Prospect meeting', miles: 92.6 },
    { id: 3, date: '2026-08-21', from: 'Berthoud, CO', to: 'Fort Collins, CO', purpose: 'Business meeting', miles: 45.4 }
  ],
  invoices: [
    { id: 'INV-1001', date: '2026-08-04', customer: 'Front Range Dental', status: 'Paid', amount: 1800 },
    { id: 'INV-1002', date: '2026-08-11', customer: 'Mountain Peak Services', status: 'Paid', amount: 2500 },
    { id: 'INV-1003', date: '2026-08-25', customer: 'Acme Operations', status: 'Open', amount: 3200 }
  ]
}
