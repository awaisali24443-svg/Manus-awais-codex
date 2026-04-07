import React from 'react';
import { CreditCard, Zap, Check, ArrowRight, Star, ShieldCheck } from 'lucide-react';

export default function SubscriptionSettings() {
  const plans = [
    { name: 'Starter', price: '$0', features: ['5 Agents', '100 Tasks/mo', 'Community Support'], current: false, color: 'gray' },
    { name: 'Pro', price: '$29', features: ['Unlimited Agents', '10,000 Tasks/mo', 'Priority Support', 'Custom Integrations'], current: true, color: 'black' },
    { name: 'Enterprise', price: 'Custom', features: ['Dedicated Infrastructure', 'SLA Guarantee', '24/7 Phone Support', 'On-premise Deployment'], current: false, color: 'blue' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Subscription</h3>
        <p className="text-gray-500 text-sm">Manage your billing, invoices, and subscription plans.</p>
      </div>

      <div className="p-8 sm:p-10 bg-gray-900 rounded-2xl text-white shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 sm:p-16 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Zap className="w-32 h-32 sm:w-40 sm:h-40" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2.5 mb-6">
            <span className="px-3 py-1 bg-white/10 text-[10px] font-bold uppercase tracking-wider rounded-md border border-white/10 backdrop-blur-md">Current Plan</span>
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-400/20 text-yellow-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-yellow-400/20">
              <Star className="w-3 h-3 fill-current" /> Premium
            </div>
          </div>
          <h4 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">Pro Plan</h4>
          <p className="text-gray-400 mb-8 sm:mb-10 max-w-md text-sm leading-relaxed">Your plan will automatically renew on May 12, 2026. You are currently using 4.2k of your 10k monthly task quota.</p>
          
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <button className="px-6 sm:px-8 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-[0.98] text-sm">Manage Billing</button>
            <button className="px-6 sm:px-8 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all border border-white/10 backdrop-blur-md text-sm">View Invoices</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {plans.map((plan) => (
          <div key={plan.name} className={`p-8 rounded-2xl border transition-all duration-300 relative group ${plan.current ? 'border-gray-900 bg-white shadow-xl lg:scale-105 z-10' : 'border-gray-200 bg-white/50 hover:border-gray-300 hover:bg-white'}`}>
            {plan.current && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                Most Popular
              </div>
            )}
            <h5 className="text-xl font-bold mb-2 text-gray-900">{plan.name}</h5>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">/mo</span>
            </div>
            <ul className="space-y-4 mb-10">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-600 font-medium leading-tight">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <button 
              disabled={plan.current}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 ${
                plan.current 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200 active:scale-[0.98]'
              }`}
            >
              {plan.current ? 'Active Now' : 'Switch to ' + plan.name} {!plan.current && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
