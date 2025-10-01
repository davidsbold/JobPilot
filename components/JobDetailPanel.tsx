import React from 'react';
import { Job } from '../types';
import { SKILL_TAXONOMY } from '../constants';

interface JobDetailPanelProps {
  job: Job | null;
  onClose: () => void;
}

export const JobDetailPanel: React.FC<JobDetailPanelProps> = ({ job, onClose }) => {
    
    const skillLabelMap = new Map(SKILL_TAXONOMY.map(s => [s.key, s.label]));

    return (
        <aside className={`fixed top-0 right-0 h-full w-full lg:w-2/5 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-20 ${job ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-6 h-full flex flex-col">
                {job && (
                    <>
                        <div className="flex justify-between items-start mb-4 pb-4 border-b">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">{job.title}</h3>
                                <p className="text-md text-slate-600">{job.company}</p>
                                <p className="text-sm text-slate-500">{job.location}</p>
                            </div>
                            <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-grow space-y-6 pr-2">
                            <div className="flex flex-wrap gap-2">
                                {job.requirements.map(req => (
                                    <span key={req} className="bg-sky-100 text-sky-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        {skillLabelMap.get(req) || req}
                                    </span>
                                ))}
                            </div>
                            
                            <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: job.description }}
                            />
                        </div>
                        
                        <div className="mt-6 pt-4 border-t">
                             <a href={job.url} target="_blank" rel="noopener noreferrer" className="w-full text-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors block">
                                Zur Stellenanzeige
                            </a>
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
};
