import React from 'react';
import { Job } from '../types';
import { Card } from './ui/Card';
import { Spinner } from './ui/Spinner';

type LetterStatus = 'generating' | 'done' | 'error';
interface LetterData {
    status: LetterStatus;
    content: string;
}

interface JobListProps {
  jobs: Job[];
  selectedJobs: Set<string>;
  favoriteJobs: Set<string>;
  letters: Map<string, LetterData>;
  onToggleJobSelection: (jobId: string) => void;
  onToggleFavorite: (jobId: string) => void;
  onJobClick: (job: Job) => void;
  activeJobId?: string | null;
  onSelectAll: () => void;
  onDeleteLetter: (jobId: string) => void;
  careerChangerFriendlyCompanies: Set<string>;
  companyStats: Record<string, { total: number; careerSwitch: number }>;
}

const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " Jahre";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " Monate";
    interval = seconds / 86400;
    if (interval > 1) return "vor " + Math.floor(interval) + " Tagen";
    interval = seconds / 3600;
    if (interval > 1) return "vor " + Math.floor(interval) + " Stunden";
    interval = seconds / 60;
    if (interval > 1) return "vor " + Math.floor(interval) + " Minuten";
    return "gerade eben";
}

const handleDownload = (job: Job, letterData: LetterData) => {
    if (letterData.status !== 'done') return;
    
    const contentAsHtml = letterData.content.replace(/\n/g, '<br />');
    const htmlSource = `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset='UTF-8'>
        <title>Motivationsschreiben</title>
        </head>
        <body>
        ${contentAsHtml}
        </body>
        </html>
    `;

    const blob = new Blob([htmlSource], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const safeCompany = job.company.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeTitle = job.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `Motivationsschreiben_${safeCompany}_${safeTitle.substring(0, 30)}.doc`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


export const JobList: React.FC<JobListProps> = ({ jobs, selectedJobs, favoriteJobs, letters, onToggleJobSelection, onToggleFavorite, onJobClick, activeJobId, onSelectAll, onDeleteLetter, careerChangerFriendlyCompanies, companyStats }) => {
  if (jobs.length === 0) {
    return <Card className="p-6 text-center text-slate-500">Keine Jobs für die aktuellen Filter gefunden.</Card>;
  }

  return (
    <div className="space-y-3">
        <div className="flex items-center px-4">
            <input 
                type="checkbox"
                checked={jobs.length > 0 && selectedJobs.size === jobs.length}
                onChange={onSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
            <label className="ml-3 text-sm font-medium text-gray-700">Alle auswählen</label>
        </div>
      {jobs.map(job => {
        const letterData = letters.get(job.id);
        const isActive = activeJobId === job.id;
        const isFavorite = favoriteJobs.has(job.id);
        const isCareerChangerFriendlyCompany = careerChangerFriendlyCompanies.has(job.company);
        const companyStat = companyStats[job.company];

        let highlightClass = 'border-l-transparent';
        if (job.career_switch) {
          highlightClass = 'border-l-sky-400';
        } else if (job.is_junior) {
          highlightClass = 'border-l-green-400';
        }

        return (
        <Card
          key={job.id}
          className={`p-4 transition-colors duration-200 border-l-4 ${highlightClass} ${isActive ? 'bg-sky-50 shadow-md' : 'bg-white'}`}
        >
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              checked={selectedJobs.has(job.id)}
              onChange={(e) => {
                  e.stopPropagation();
                  onToggleJobSelection(job.id);
              }}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
            <div className="flex-grow cursor-pointer" onClick={() => onJobClick(job)}>
              <div className="flex justify-between items-start">
                  <h4 className="font-bold text-lg text-slate-800">{job.title}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 whitespace-nowrap">{timeAgo(job.created_at)}</span>
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(job.id);
                        }}
                        title={isFavorite ? 'Aus Favoriten entfernen' : 'Als Favorit markieren'}
                        className="text-slate-400 hover:text-yellow-500 transition-colors"
                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        aria-pressed={isFavorite}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor">
                           <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                className={isFavorite ? 'text-yellow-400' : 'text-slate-300'}
                            />
                        </svg>
                    </button>
                  </div>
              </div>
              <p className="text-sm text-slate-600">{job.company}</p>
              <p className="text-sm text-slate-500">{job.location}</p>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                  {isCareerChangerFriendlyCompany && companyStat && (
                      <span
                          className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full flex items-center gap-1.5 font-semibold"
                          title={`Dieser Arbeitgeber hat ${companyStat.careerSwitch} von ${companyStat.total} Stellen als für Quereinsteiger geeignet markiert.`}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span>Top für Quereinsteiger</span>
                          <span className="bg-indigo-200 text-indigo-900 rounded-full px-1.5 text-[10px] leading-tight py-0.5">
                              {companyStat.careerSwitch}/{companyStat.total}
                          </span>
                      </span>
                  )}
                  {job.remote && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Remote</span>}
                  {job.career_switch && <span className="text-xs bg-sky-100 text-sky-800 px-2 py-1 rounded-full">Quereinstieg</span>}
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{job.source}</span>
              </div>
            </div>
          </div>
          {letterData && (
            <div className="border-t border-slate-200 mt-4 pt-4 ml-8">
                <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-slate-700 text-sm">Generiertes Motivationsschreiben</h5>
                    <div className="flex items-center gap-2">
                      <button 
                          onClick={(e) => { e.stopPropagation(); handleDownload(job, letterData); }} 
                          title="Als Word-Dokument herunterladen" 
                          disabled={letterData.status !== 'done'}
                          className="text-sky-500 hover:text-sky-700 p-1 disabled:text-slate-300 disabled:cursor-not-allowed"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteLetter(job.id); }} title="Löschen" className="text-red-500 hover:text-red-700 p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                </div>
                <div className="prose prose-sm max-w-none">
                    {letterData.status === 'generating' && (
                        <div className="flex items-center text-slate-500 gap-2">
                            <Spinner />
                            <span>Generiere Motivationsschreiben...</span>
                        </div>
                    )}
                    {letterData.status === 'error' && <p className="text-red-600 whitespace-pre-wrap">{letterData.content}</p>}
                    {letterData.status === 'done' && <p className="whitespace-pre-wrap">{letterData.content}</p>}
                </div>
            </div>
          )}
        </Card>
      )})}
    </div>
  );
};