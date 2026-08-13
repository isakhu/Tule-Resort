import React from 'react';
import { Settings, Eye, Save } from 'lucide-react';

// Mock DB data
const STAFF_ROLES = [
  { id: '1', role: 'Manager', password: 'manager-password-123' },
  { id: '2', role: 'Cafeteria', password: 'cafe-password-123' },
  { id: '3', role: 'Restaurant', password: 'rest-password-123' },
  { id: '4', role: 'Pool', password: 'pool-password-123' },
  
  { id: '6', role: 'Spa', password: 'spa-password-123' },
  { id: '7', role: 'Gym', password: 'gym-password-123' },
];

export default function ManagerDashboard() {
  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-stone-800">Manager Dashboard</h1>
        <p className="text-stone-500 text-sm">System administration and staff management.</p>
      </header>

      <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-stone-400" />
          <h2 className="text-lg font-bold text-stone-800">Manage Staff Passwords</h2>
        </div>
        
        <div className="space-y-4">
          {STAFF_ROLES.map((staff) => (
            <div key={staff.id} className="grid grid-cols-[1fr,auto,auto] gap-4 items-center bg-stone-50 p-4 rounded-2xl">
              <span className="font-bold text-stone-700 text-sm">{staff.role}</span>
              <input 
                type="text" 
                defaultValue={staff.password}
                className="bg-white border border-stone-200 rounded-xl px-4 py-2 text-sm text-stone-600 font-mono w-48"
              />
              <button className="bg-stone-900 text-white p-2 rounded-xl hover:bg-stone-800 transition-colors">
                <Save className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
