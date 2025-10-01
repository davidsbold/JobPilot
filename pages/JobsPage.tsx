import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Job, Filters, JobSource } from '../types';
import { fetchJobs, generateCoverLetter } from '../services/apiService';
import { FilterPanel } from '../components/FilterPanel';
import { JobList } from '../components/JobList';
import { JobDetailPanel } from '../components/JobDetailPanel';
import { ALL_SOURCES } from '../constants';
import { Spinner } from '../components/ui/Spinner';
import { PersonalizationModal } from '../components/PersonalizationModal';
import { Card } from '../components/ui/Card';


type LetterStatus = 'generating' | 'done' | 'error';
interface LetterData {
    status: LetterStatus;
    content: string;
}

export interface UserContext {
    skills: string;
    knowledge: string;
    background: string;
}

const LOADING_MESSAGES = [
    "Tipp: Personalisieren Sie Ihr Anschreiben für bessere Erfolgschancen.",
    "Wir verbinden uns mit den Job-Portalen Adzuna, Arbeitnow und Jooble...",
    "Wussten Sie schon? Die Statistik-Seite zeigt Ihnen die gefragtesten Skills im Markt.",
    "Daten werden gesammelt und Dubletten entfernt, um Ihnen die beste Übersicht zu geben.",
    "Tipp: Nutzen Sie nach der Suche die Filter, um gezielt nach Remote-Jobs oder Junior-Positionen zu suchen.",
    "Die Ergebnisse werden nach Aktualität sortiert. Die neuesten Jobs erscheinen ganz oben.",
    "Gleich haben wir die aktuellsten Angebote für Sie zusammengestellt. Bitte haben Sie einen Moment Geduld."
];

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [failedSources, setFailedSources] = useState<JobSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [favoriteJobs, setFavoriteJobs] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'relevance' | 'careerChanger'>('date');
  const [newJobsCount, setNewJobsCount] = useState<number | null>(null);
  const [careerChangerFriendlyCompanies, setCareerChangerFriendlyCompanies] = useState<Set<string>>(new Set());
  const [companyStats, setCompanyStats] = useState<Record<string, { total: number; careerSwitch: number }>>({});

  const messageInterval = useRef<number | null>(null);

  useEffect(() => {
    handleFetchJobs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const storedFavorites = localStorage.getItem('jobpilot-favorites');
    if (storedFavorites) {
        try {
            setFavoriteJobs(new Set(JSON.parse(storedFavorites)));
        } catch (e) {
            console.error("Failed to parse favorites from localStorage", e);
            localStorage.removeItem('jobpilot-favorites');
        }
    }
  }, []);
  
  useEffect(() => {
    if (jobs.length > 0) {
        const companyStatsData: Record<string, { total: number; careerSwitch: number }> = {};
        jobs.forEach(job => {
            if (!companyStatsData[job.company]) {
                companyStatsData[job.company] = { total: 0, careerSwitch: 0 };
            }
            companyStatsData[job.company].total++;
            if (job.career_switch) {
                companyStatsData[job.company].careerSwitch++;
            }
        });
        setCompanyStats(companyStatsData);

        const friendlyCompanies = new Set<string>();
        Object.entries(companyStatsData).forEach(([company, stats]) => {
            const isFriendly = stats.careerSwitch >= 2 || (stats.careerSwitch > 0 && (stats.careerSwitch / stats.total) >= 0.5);
            if (isFriendly) {
                friendlyCompanies.add(company);
            }
        });
        setCareerChangerFriendlyCompanies(friendlyCompanies);
    }
  }, [jobs]);

  useEffect(() => {
    if (isLoading && !initialLoadAttempted) {
      messageInterval.current = window.setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = LOADING_MESSAGES.indexOf(prev);
          const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
          return LOADING_MESSAGES[nextIndex];
        });
      }, 3500);
    } else {
      if (messageInterval.current) {
        clearInterval(messageInterval.current);
        messageInterval.current = null;
      }
    }
    return () => {
      if (messageInterval.current) {
        clearInterval(messageInterval.current);
      }
    };
  }, [isLoading, initialLoadAttempted]);

  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    days: null,
    careerChangeOnly: false,
    location: '',
    isRemote: null,
    isJunior: false,
    skills: [],
    skillFilterLogic: 'AND',
    sources: ALL_SOURCES,
    showFavoritesOnly: false,
  });

  const [userContext, setUserContext] = useState<UserContext>({
    skills: 'Teamfähigkeit, schnelle Auffassungsgabe, hohe Lernbereitschaft, zertifizierte Python-Grundlagen.',
    knowledge: 'Private Projekte mit Linux-Servern; Erfahrung im Kundensupport; Umschulung zum Fachinformatiker.',
    background: 'Erfolgreicher Quereinsteiger aus dem Handwerk mit starkem technischen Interesse und hoher Motivation für eine langfristige Karriere in der IT.',
  });

  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  
  const [generatedLetters, setGeneratedLetters] = useState<Map<string, LetterData>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleFetchJobs = async (forceRefresh = false) => {
    // Always try to read the last cache before fetching, to calculate the "new jobs" diff.
    let oldJobIds: Set<string> | null = null;
    try {
        const cachedItem = localStorage.getItem('jobpilot-job-cache');
        if (cachedItem) {
            const cache = JSON.parse(cachedItem);
            oldJobIds = new Set(cache.data.jobs.map((j: Job) => j.id));
        }
    } catch (e) {
        console.warn("Could not process old cache for new job count.", e);
    }
    
    try {
      setIsLoading(true);
      setError(null); // Clear previous errors on a new attempt
      if (forceRefresh) {
        setNewJobsCount(null); // Reset on new manual refresh
      }
      
      const { jobs: fetchedJobs, failedSources: fetchedFailedSources } = await fetchJobs(forceRefresh);

      // If we had a cache, calculate the number of new jobs.
      if (oldJobIds) {
        const newJobsInFetch = fetchedJobs.filter(j => !oldJobIds!.has(j.id));
        setNewJobsCount(newJobsInFetch.length);
      }

      // If fetching resulted in 0 jobs AND all sources failed, treat it as an error.
      if (fetchedJobs.length === 0 && fetchedFailedSources.length === ALL_SOURCES.length) {
        throw new Error("Alle Job-Quellen sind momentan nicht erreichbar. Bitte versuchen Sie es später erneut.");
      }

      setJobs(fetchedJobs);
      setFailedSources(fetchedFailedSources);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten.';
      setError(errorMessage);
      console.error(err);
      // CRITICAL FIX: Do not clear existing jobs on a failed fetch.
      // This preserves the list if a refresh fails.
    } finally {
      setIsLoading(false);
      setInitialLoadAttempted(true);
    }
  };

  const filteredJobs = useMemo(() => {
     const calculateRelevance = (job: Job, currentFilters: Filters, favorites: Set<string>): number => {
        let score = 0;

        if (favorites.has(job.id)) {
            score += 1000;
        }
        if (job.exact_match) {
            score += 100;
        }
        if (currentFilters.skills.length > 0) {
            const matchedSkills = job.requirements.filter(req => currentFilters.skills.includes(req));
            score += matchedSkills.length * 10;
        }
        if (currentFilters.isJunior && job.is_junior) {
            score += 20;
        }
        if (currentFilters.careerChangeOnly && job.career_switch) {
            score += 20;
        }
        
        return score;
    };

    const filtered = jobs.filter(job => {
      if (filters.showFavoritesOnly && !favoriteJobs.has(job.id)) {
        return false;
      }
      const now = new Date();
      const jobDate = new Date(job.created_at);
      if (filters.days && (now.getTime() - jobDate.getTime()) / (1000 * 3600 * 24) > filters.days) {
        return false;
      }
      if (filters.searchTerm && !job.title.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      if (filters.careerChangeOnly && !job.career_switch) {
        return false;
      }
      if (filters.isJunior && !job.is_junior) {
        return false;
      }
      if (filters.isRemote !== null && job.remote !== filters.isRemote) {
        return false;
      }
      if (filters.skills.length > 0) {
        if (filters.skillFilterLogic === 'AND') {
          if (!filters.skills.every(skill => job.requirements.includes(skill))) {
            return false;
          }
        } else { // 'OR' logic
          if (!filters.skills.some(skill => job.requirements.includes(skill))) {
            return false;
          }
        }
      }
      if (!filters.sources.includes(job.source)) {
        return false;
      }
      if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
        if (sortBy === 'relevance') {
            const scoreA = calculateRelevance(a, filters, favoriteJobs);
            const scoreB = calculateRelevance(b, filters, favoriteJobs);
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }

        if (sortBy === 'careerChanger') {
            const aIsFriendly = careerChangerFriendlyCompanies.has(a.company);
            const bIsFriendly = careerChangerFriendlyCompanies.has(b.company);
            if (aIsFriendly && !bIsFriendly) return -1;
            if (!aIsFriendly && bIsFriendly) return 1;
            // Fallback for same-friendliness: newest first
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        
        // Default sort by date
        const aIsFavorite = favoriteJobs.has(a.id);
        const bIsFavorite = favoriteJobs.has(b.id);
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  }, [jobs, filters, favoriteJobs, sortBy, careerChangerFriendlyCompanies]);

  const handleToggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleToggleFavorite = (jobId: string) => {
    setFavoriteJobs(prev => {
        const newFavorites = new Set(prev);
        if (newFavorites.has(jobId)) {
            newFavorites.delete(jobId);
        } else {
            newFavorites.add(jobId);
        }
        localStorage.setItem('jobpilot-favorites', JSON.stringify(Array.from(newFavorites)));
        return newFavorites;
    });
  };

  const handleSelectAll = () => {
    if(selectedJobs.size === filteredJobs.length) {
        setSelectedJobs(new Set());
    } else {
        setSelectedJobs(new Set(filteredJobs.map(j => j.id)));
    }
  }

  const handleInitiateGeneration = () => {
    setIsModalOpen(true);
  };

  const handleStartGeneration = async (updatedContext: UserContext) => {
    setIsModalOpen(false);
    setUserContext(updatedContext);
    setIsGenerating(true);

    const jobsToGenerate = jobs.filter(j => selectedJobs.has(j.id));
    
    setGeneratedLetters(prev => {
        const newMap = new Map(prev);
        jobsToGenerate.forEach(job => {
            newMap.set(job.id, { status: 'generating', content: '' });
        });
        return newMap;
    });

    for (const job of jobsToGenerate) {
      try {
        const letterContent = await generateCoverLetter(job, updatedContext);
        if (letterContent.startsWith('Fehler bei der Generierung')) {
            throw new Error(letterContent);
        }
        setGeneratedLetters(prev => {
            const newMap = new Map(prev);
            newMap.set(job.id, { status: 'done', content: letterContent });
            return newMap;
        });
      } catch(e) {
        console.error(`Could not generate letter for ${job.id}`, e);
        const errorMessage = e instanceof Error ? e.message : "Fehler bei der Generierung.";
        setGeneratedLetters(prev => {
            const newMap = new Map(prev);
            newMap.set(job.id, { status: 'error', content: errorMessage });
            return newMap;
        });
      }
    }
    setIsGenerating(false);
    setSelectedJobs(new Set()); // Clear selection after generation
  };
  
  const handleDeleteLetter = (jobId: string) => {
    setGeneratedLetters(prev => {
        const newMap = new Map(prev);
        newMap.delete(jobId);
        return newMap;
    });
  }

  const handleDownloadCSV = () => {
    if (filteredJobs.length === 0) return;

    const headers = ["Titel", "Status", "Ort", "URL", "Favorit"];
    
    const escapeCSV = (field: any): string => {
        if (field === null || field === undefined) {
            return '';
        }
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvRows = [
        headers.join(','),
        ...filteredJobs.map(job => {
            const statuses = [];
            if (job.career_switch) statuses.push('Quereinstieg');
            statuses.push(job.remote ? 'Remote' : 'Onsite');
            const statusString = statuses.join(', ');

            const rowData = [
                job.title,
                statusString,
                job.location,
                job.url,
                favoriteJobs.has(job.id) ? 'Ja' : 'Nein'
            ];

            return rowData.map(escapeCSV).join(',');
        })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'JobPilot+_Ergebnisse.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <>
      {isLoading && !initialLoadAttempted && (
        <div 
          className="fixed inset-0 bg-slate-900 bg-opacity-80 z-50 flex flex-col justify-center items-center text-white p-4"
          aria-live="assertive"
          role="alert"
        >
          <Spinner className="w-24 h-24 border-slate-400 border-t-sky-400" />
          <h3 className="mt-8 text-3xl font-bold text-center">Suche nach den neuesten Stellenangeboten...</h3>
          <p className="mt-2 text-lg text-slate-300 text-center">
            Dies kann einige Minuten dauern, da wir mehrere Jobportale für Sie durchsuchen.
          </p>
          <p className="mt-6 text-base text-slate-400 min-h-[2.5rem] text-center transition-opacity duration-500">
            {loadingMessage}
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 pb-24">
        <aside className="w-full lg:w-2/5 xl:w-1/3 space-y-6">
          <FilterPanel 
            filters={filters} 
            onFilterChange={setFilters} 
          />
        </aside>
        
        <div className="w-full lg:w-3/5 xl:w-2/3 space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-start flex-wrap gap-4">
              <div className="flex-grow">
                <h2 className="text-xl font-semibold">{initialLoadAttempted ? `Stellenangebote (${filteredJobs.length})` : 'Stellenangebote'}</h2>
                {newJobsCount !== null && initialLoadAttempted && (
                    <p className="text-sm text-green-600 mt-1 font-medium">
                        {newJobsCount} neue Jobs seit der letzten wöchentlichen Synchronisierung gefunden.
                    </p>
                )}
                {initialLoadAttempted && jobs.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-medium text-slate-600">Sortieren nach:</span>
                      <div className="flex rounded-md overflow-hidden border border-slate-300">
                          <button
                              onClick={() => setSortBy('date')}
                              className={`px-3 py-1 text-sm transition-colors ${sortBy === 'date' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                              aria-pressed={sortBy === 'date'}
                          >
                              Aktualität
                          </button>
                          <button
                              onClick={() => setSortBy('relevance')}
                              className={`px-3 py-1 text-sm transition-colors border-l border-slate-300 ${sortBy === 'relevance' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                              aria-pressed={sortBy === 'relevance'}
                          >
                              Relevanz
                          </button>
                          <button
                              onClick={() => setSortBy('careerChanger')}
                              className={`px-3 py-1 text-sm transition-colors border-l border-slate-300 ${sortBy === 'careerChanger' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                              aria-pressed={sortBy === 'careerChanger'}
                              title="Top Arbeitgeber für Quereinsteiger"
                          >
                              Top für Quereinsteiger
                          </button>
                      </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {initialLoadAttempted && (
                    <button
                        onClick={() => handleFetchJobs(true)}
                        disabled={isLoading}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-wait transition-colors text-sm flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5m11 2a9 9 0 11-2.93 7.07" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0M6.817 9.348L3.636 6.165a8.25 8.25 0 0111.664 0" />
                        </svg>
                        <span>{isLoading ? 'Lade...' : 'Aktualisieren'}</span>
                    </button>
                )}
                <button
                    onClick={handleDownloadCSV}
                    disabled={filteredJobs.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-300 transition-colors text-sm"
                >
                    Als CSV herunterladen
                </button>
              </div>
          </div>

          {initialLoadAttempted && jobs.length > 0 && !error && (
            <Card className="p-4 bg-sky-50 border-sky-200">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-sky-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 className="font-semibold text-sky-800">So erstellen Sie Motivationsschreiben:</h3>
                        <p className="text-sm text-sky-700">
                            Nutzen Sie die Checkboxen, um einen oder mehrere Jobs auszuwählen. Der Button zur Erstellung erscheint dann am unteren Bildschirmrand.
                        </p>
                    </div>
                </div>
            </Card>
          )}
          
          {!initialLoadAttempted ? (
            <Card className="flex justify-center items-center p-12 min-h-[400px]">
                <Spinner />
            </Card>
          ) : error && jobs.length === 0 ? (
            // This handles the case where the very first search fails.
            <Card className="p-6 text-center text-red-500 bg-red-50 border-red-200">
                <h3 className="font-bold">Fehler bei der Jobsuche</h3>
                <p>{error}</p>
                <button
                    onClick={() => handleFetchJobs(true)}
                    className="mt-4 px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-100 transition-colors text-sm"
                >
                    Erneut versuchen
                </button>
            </Card>
          ) : (
            // This is the main view after a search has been performed.
            <>
              {error && jobs.length > 0 && (
                // Show error from a failed refresh ABOVE the stale list.
                <Card className="p-6 text-center text-red-500 bg-red-50 border-red-200 mb-4">
                  <h3 className="font-bold">Fehler bei der Aktualisierung</h3>
                  <p>{error}</p>
                  <button
                    onClick={() => handleFetchJobs(true)}
                    className="mt-4 px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-100 transition-colors text-sm"
                  >
                    Erneut versuchen
                  </button>
                </Card>
              )}
              <JobList
                jobs={filteredJobs}
                selectedJobs={selectedJobs}
                favoriteJobs={favoriteJobs}
                letters={generatedLetters}
                onToggleJobSelection={handleToggleJobSelection}
                onToggleFavorite={handleToggleFavorite}
                onJobClick={setActiveJob}
                activeJobId={activeJob?.id}
                onSelectAll={handleSelectAll}
                onDeleteLetter={handleDeleteLetter}
                careerChangerFriendlyCompanies={careerChangerFriendlyCompanies}
                companyStats={companyStats}
              />
            </>
          )}
        </div>

        <JobDetailPanel job={activeJob} onClose={() => setActiveJob(null)} />
      </div>

      <PersonalizationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleStartGeneration}
        initialContext={userContext}
        jobCount={selectedJobs.size}
      />

      {selectedJobs.size > 0 && !isGenerating && (
          <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-2px_rgba(0,0,0,0.06)] border-t z-30 animate-slide-up">
              <div className="container mx-auto flex justify-between items-center p-4">
                  <span className="font-semibold">{selectedJobs.size} Job{selectedJobs.size > 1 ? 's' : ''} ausgewählt</span>
                  <div className="flex items-center gap-4">
                      <button onClick={() => setSelectedJobs(new Set())} className="px-4 py-2 text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
                          Auswahl aufheben
                      </button>
                      <button
                          onClick={handleInitiateGeneration}
                          className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors"
                      >
                          Motivationsschreiben erstellen
                      </button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};