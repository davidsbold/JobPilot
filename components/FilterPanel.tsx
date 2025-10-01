import React from 'react';
import { Filters, JobSource } from '../types';
import { SKILL_TAXONOMY, ALL_SOURCES } from '../constants';
import { Card } from './ui/Card';

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: React.Dispatch<React.SetStateAction<Filters>>;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFilterChange }) => {
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onFilterChange(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleRemoteChange = (value: boolean | null) => {
    onFilterChange(prev => ({ ...prev, isRemote: value }));
  }

  const handleSkillChange = (skill: string) => {
    onFilterChange(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };
  
  const handleSourceChange = (source: JobSource) => {
      onFilterChange(prev => ({
          ...prev,
          sources: prev.sources.includes(source)
            ? prev.sources.filter(s => s !== source)
            : [...prev.sources, source]
      }));
  }

  return (
    <Card className="p-4 space-y-6 sticky top-24">
      <div>
        <h3 className="text-xl font-semibold">Filter</h3>
      </div>
      

      <div>
        <label htmlFor="searchTerm" className="block text-sm font-medium text-slate-700">Suche nach Jobtitel</label>
        <input
          type="text"
          name="searchTerm"
          id="searchTerm"
          value={filters.searchTerm}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          placeholder="z.B. Systemadministrator"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-slate-700">Ort / Standort</label>
        <input
          type="text"
          name="location"
          id="location"
          value={filters.location}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          placeholder="z.B. Berlin, München"
        />
      </div>
      
       <div>
        <label className="block text-sm font-medium text-slate-700">Veröffentlicht</label>
        <div className="mt-1 flex flex-wrap gap-2">
            {[
            { label: 'Jederzeit', value: null },
            { label: 'Letzte 24h', value: 1 },
            { label: 'Letzte 7 Tage', value: 7 },
            { label: 'Letzte 30 Tage', value: 30 },
            ].map(option => (
            <button
                key={option.label}
                onClick={() => onFilterChange(prev => ({ ...prev, days: option.value }))}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filters.days === option.value
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
            >
                {option.label}
            </button>
            ))}
        </div>
      </div>

      <div className="space-y-2">
          <div className="flex items-center">
              <input id="showFavoritesOnly" name="showFavoritesOnly" type="checkbox" checked={filters.showFavoritesOnly} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
              <label htmlFor="showFavoritesOnly" className="ml-3 text-sm text-gray-600">Nur Favoriten anzeigen</label>
          </div>
          <div className="flex items-center">
              <input id="careerChangeOnly" name="careerChangeOnly" type="checkbox" checked={filters.careerChangeOnly} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
              <label htmlFor="careerChangeOnly" className="ml-3 text-sm text-gray-600">Nur IT-Jobs für Quereinsteiger</label>
          </div>
          <div className="flex items-center">
              <input id="isJunior" name="isJunior" type="checkbox" checked={filters.isJunior} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
              <label htmlFor="isJunior" className="ml-3 text-sm text-gray-600">Nur Junior-Level</label>
          </div>
      </div>

      <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Arbeitsmodell</label>
           <div className="flex gap-2">
              <button onClick={() => handleRemoteChange(null)} className={`px-3 py-1 text-sm rounded-md ${filters.isRemote === null ? 'bg-sky-600 text-white' : 'bg-slate-200'}`}>Alle</button>
              <button onClick={() => handleRemoteChange(true)} className={`px-3 py-1 text-sm rounded-md ${filters.isRemote === true ? 'bg-sky-600 text-white' : 'bg-slate-200'}`}>Remote</button>
              <button onClick={() => handleRemoteChange(false)} className={`px-3 py-1 text-sm rounded-md ${filters.isRemote === false ? 'bg-sky-600 text-white' : 'bg-slate-200'}`}>Onsite</button>
          </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Skills</label>
        <div className="mt-2 flex rounded-md overflow-hidden border border-slate-300">
            <button
                onClick={() => onFilterChange(prev => ({...prev, skillFilterLogic: 'AND'}))}
                className={`flex-1 px-3 py-1 text-sm transition-colors ${filters.skillFilterLogic === 'AND' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                aria-pressed={filters.skillFilterLogic === 'AND'}
                title="Zeige Jobs, die ALLE ausgewählten Skills enthalten"
            >
                Alle (AND)
            </button>
            <button
                onClick={() => onFilterChange(prev => ({...prev, skillFilterLogic: 'OR'}))}
                className={`flex-1 px-3 py-1 text-sm transition-colors border-l border-slate-300 ${filters.skillFilterLogic === 'OR' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                aria-pressed={filters.skillFilterLogic === 'OR'}
                title="Zeige Jobs, die MINDESTENS EINEN der ausgewählten Skills enthalten"
            >
                Mindestens ein (OR)
            </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {SKILL_TAXONOMY.map(skill => (
            <button
              key={skill.key}
              onClick={() => handleSkillChange(skill.key)}
              className={`px-2 py-1 text-xs rounded-full border ${
                filters.skills.includes(skill.key)
                  ? 'bg-sky-100 text-sky-800 border-sky-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {skill.label}
            </button>
          ))}
        </div>
      </div>
      
      <div>
          <label className="block text-sm font-medium text-slate-700">Quellen</label>
          <div className="mt-2 space-y-2">
              {ALL_SOURCES.map(source => (
                  <div key={source} className="flex items-center">
                       <input id={source} name={source} type="checkbox" checked={filters.sources.includes(source)} onChange={() => handleSourceChange(source)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                       <label htmlFor={source} className="ml-3 text-sm text-gray-600">{source}</label>
                  </div>
              ))}
          </div>
      </div>

    </Card>
  );
};