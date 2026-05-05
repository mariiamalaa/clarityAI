import React from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = ''
}: DropdownProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 px-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"
        >
          <option value="" disabled className="text-slate-400">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-slate-900 dark:text-slate-100">
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:translate-y-[-40%]">
           <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
