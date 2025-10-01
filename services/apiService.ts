// --- API Keys & Configuration ---
// Note: These keys should be stored in environment variables in a production environment.
import { Job, JobSource, StatsData, FetchJobsResult } from '../types';
import { IT_SYSADMIN_KEYWORDS, CAREER_SWITCH_KEYWORDS, SKILL_TAXONOMY, JUNIOR_LEVEL_KEYWORDS, PRIMARY_SEARCH_QUERIES } from '../constants';
import { GoogleGenAI } from "@google/genai";

const ADZUNA_APP_ID = 'd027c711';
const ADZUNA_APP_KEY = 'e4b2c698c84e6c1bd7e735907aa0e22c';
const JOOBLE_API_KEY = '8a1ec129-d7ae-4707-90a0-f76c36ff1634';
const BA_API_KEY = 'jobboerse-jobsuche';
const JOB_CACHE_KEY = 'jobpilot-job-cache';

const API_FETCH_PAGES = {
    // arbeitnow: no pagination on main endpoint, fetches latest ~300
    adzuna: 20, // Increased to 20 since we are now doing a single efficient query.
    arbeitsagentur: 20, // Fetch up to 20 pages per query
};

interface UserContext {
  skills: string;
  knowledge: string;
  background: string;
}

export interface ParticipantData {
    name: string;
    birthDate: string;
    address: string;
    background: string;
    skills: string;
    motivation: string;
    fundingReason: string;
    preferences: string;
}

export interface CourseInfo {
    title: string;
    duration: string;
    degree: string;
    goal: string;
    modules: string[];
    value: string;
}


// --- Helper Functions ---
const normalizeText = (text: string): string => text.toLowerCase().trim();

const checkKeywords = (text: string, keywords: string[]): boolean => {
    const normalizedText = normalizeText(text);
    return keywords.some(keyword => normalizedText.includes(keyword));
};

const extractRequirements = (description: string): string[] => {
    const requirements = new Set<string>();
    const normalizedDescription = normalizeText(description || '');
    
    SKILL_TAXONOMY.forEach(skill => {
        if (skill.aliases.some(alias => normalizedDescription.includes(alias))) {
            requirements.add(skill.key);
        }
    });

    return Array.from(requirements);
};

const getDedupeKey = (job: { title: string; company: string; location: string }): string => {
    return [
        normalizeText(job.title), 
        normalizeText(job.company), 
        normalizeText(job.location)
    ].join('|');
};

const normalizeJob = (rawJob: any, source: JobSource): Job | null => {
    try {
        let job: Partial<Job> = { source, raw: rawJob, tags: [], job_types: [] };
        let sourceId: string | number = '';

        if (source === JobSource.ARBEITNOW) {
            sourceId = rawJob.slug;
            job.title = rawJob.title;
            job.company = rawJob.company_name;
            job.location = rawJob.location;
            job.remote = rawJob.remote || false;
            job.url = rawJob.url;
            job.created_at = new Date(rawJob.created_at * 1000).toISOString();
            job.description = rawJob.description;
            job.tags = rawJob.tags || [];
            job.job_types = rawJob.job_types || [];
        } else if (source === JobSource.ADZUNA) {
            sourceId = rawJob.id;
            job.title = rawJob.title;
            job.company = rawJob.company.display_name;
            job.location = rawJob.location.display_name;
            job.remote = rawJob.title.toLowerCase().includes('remote');
            job.url = rawJob.redirect_url;
            job.created_at = rawJob.created;
            job.description = rawJob.description;
            job.tags = rawJob.category ? [rawJob.category.label] : [];
        } else if (source === JobSource.JOOBLE) {
            sourceId = rawJob.id;
            job.title = rawJob.title;
            job.company = rawJob.company;
            job.location = rawJob.location;
            job.remote = normalizeText(rawJob.title).includes('remote') || normalizeText(rawJob.snippet).includes('remote');
            job.url = rawJob.link;
            job.created_at = new Date(rawJob.updated).toISOString();
            job.description = rawJob.snippet;
            job.tags = rawJob.type ? [rawJob.type] : [];
        } else if (source === JobSource.GERMANTECHJOBS) {
            sourceId = rawJob.id;
            job.title = rawJob.title;
            job.company = rawJob.company;
            job.location = rawJob.location;
            job.remote = (rawJob.remote || '').toLowerCase() !== 'office';
            job.url = rawJob.url;
            job.created_at = new Date(rawJob.epoch * 1000).toISOString();
            job.description = rawJob.description;
            job.tags = rawJob.tags || [];
        } else if (source === JobSource.JOBICY) {
            sourceId = rawJob.id;
            job.title = rawJob.jobTitle;
            job.company = rawJob.companyName;
            job.location = rawJob.jobGeo || 'Remote';
            job.remote = true; // All jobs from Jobicy are remote
            job.url = rawJob.url;
            job.created_at = new Date(rawJob.pubDate).toISOString();
            job.description = rawJob.jobDescription;
            job.tags = Array.isArray(rawJob.jobTag) ? rawJob.jobTag : (rawJob.jobTag ? [rawJob.jobTag] : []);
            job.job_types = rawJob.jobType ? [rawJob.jobType] : [];
        } else if (source === JobSource.ARBEITSAGENTUR) {
            sourceId = rawJob.hashId;
            job.title = rawJob.titel;
            job.company = rawJob.arbeitgeber;
            job.location = rawJob.arbeitsort?.ort ? `${rawJob.arbeitsort.ort}, ${rawJob.arbeitsort.plz}` : 'N/A';
            job.remote = Array.isArray(rawJob.arbeitszeit) && rawJob.arbeitszeit.includes('ho');
            job.url = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${rawJob.hashId}`;
            job.created_at = rawJob.aktuelleVeroeffentlichungsdatum;
            job.description = rawJob.stellenbeschreibung;
            job.tags = [];
            job.job_types = [];
        }


        if (!job.title || !job.company || !job.location || !job.created_at || !sourceId) return null;
        
        // --- STRICT GERMAN LOCATION FILTER ---
        const locationLower = job.location.toLowerCase();
        const isRemote = job.remote || locationLower.includes('remote');

        const germanLocationKeywords = [
            'deutschland', 'germany', 'berlin', 'hamburg', 'münchen', 'munich',
            'köln', 'cologne', 'frankfurt', 'stuttgart', 'düsseldorf', 'dortmund',
            'essen', 'leipzig', 'bremen', 'dresden', 'hannover', 'nürnberg'
        ];
        const hasGermanLocation = germanLocationKeywords.some(kw => locationLower.includes(kw));

        if (hasGermanLocation) {
            // Good to go, explicitly German.
        } else if (isRemote) {
            // For remote jobs, filter out those that explicitly require non-German locations.
            const forbiddenLocations = [
                'usa only', 'u.s. only', 'canada only', 'uk only', 'united states', 'united kingdom',
                'north america', 'south america', 'africa', 'asia'
            ];
            if (forbiddenLocations.some(kw => locationLower.includes(kw))) {
                return null;
            }
            // If location is specific but not german (e.g., "Paris", "Warsaw", "Amsterdam"), also filter out.
            const nonGermanCities = ['paris', 'warsaw', 'amsterdam', 'london', 'madrid', 'vienna', 'zurich', 'wien', 'zürich'];
            if (nonGermanCities.some(kw => locationLower.includes(kw))) {
                return null;
            }
            // Otherwise, generic "Remote" or "Remote (Europe)" is allowed.
        } else {
            // Not a German location and not remote. Filter out.
            return null;
        }
        // --- END FILTER ---


        job.id = `${source}-${sourceId}`;
        job.description = job.description || '';
        
        const fullText = `${job.title} ${job.description}`;
        job.exact_match = checkKeywords(job.title, IT_SYSADMIN_KEYWORDS);
        job.career_switch = checkKeywords(fullText, CAREER_SWITCH_KEYWORDS);
        job.is_junior = checkKeywords(fullText, JUNIOR_LEVEL_KEYWORDS);
        job.requirements = extractRequirements(job.description);

        return job as Job;
    } catch (e) {
        console.error(`Failed to normalize job from ${source}:`, rawJob, e);
        return null;
    }
};

// --- API Fetching Logic ---
const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, backoff = 300): Promise<Response> => {
    // Add a User-Agent header to all requests to appear more like a legitimate browser and avoid blocks.
    const defaultHeaders = {
        'User-Agent': 'JobPilot/1.0 (Web App)',
    };
    const finalOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, finalOptions);
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API call to ${url} failed with status ${response.status}: ${errorBody}`);
            }
            return response;
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed for ${url}. Retrying in ${backoff * (i + 1)}ms...`);
            if (i === retries - 1) throw error;
            await new Promise(res => setTimeout(res, backoff * (i + 1)));
        }
    }
    throw new Error(`API call failed after multiple retries for ${url}.`);
};

const fetchArbeitnowJobs = async (): Promise<any[]> => {
    console.log("Fetching jobs from Arbeitnow...");
    const url = 'https://www.arbeitnow.com/api/job-board-api';
    try {
        const response = await fetchWithRetry(url);
        const data = await response.json();
        const jobs = data?.data || [];
        console.log(`Fetched ${jobs.length} raw jobs from Arbeitnow.`);
        return jobs;
    } catch (e) {
        console.error("Arbeitnow fetch failed:", e);
        throw e;
    }
};

const fetchAdzunaJobs = async (): Promise<any[]> => {
    console.log("Fetching jobs from Adzuna using a single combined query...");
    const allJobs: any[] = [];
    
    // Combine all search queries into one using the 'what_or' parameter for efficiency.
    const combinedQuery = PRIMARY_SEARCH_QUERIES.join(' ');

    for (let page = 1; page <= API_FETCH_PAGES.adzuna; page++) {
        try {
            // Using what_or to find jobs that match any of our keywords.
            const url = `https://api.adzuna.com/v1/api/jobs/de/search/${page}?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&what_or=${encodeURIComponent(combinedQuery)}&content-type=application/json`;
            const response = await fetchWithRetry(url);
            const data = await response.json();
            if (data && data.results && data.results.length > 0) {
                allJobs.push(...data.results);
            } else {
                console.log(`Adzuna: No more results found on page ${page}. Stopping.`);
                break; // Stop if no more results are returned.
            }
        } catch (error) {
            console.error(`Adzuna fetch failed on page ${page}:`, error);
            // If the first page fails, we can't get anything.
            // If a subsequent page fails, we still have the results from previous pages.
            // Breaking here is a safe strategy to avoid hammering a failing endpoint.
            break;
        }
    }

    console.log(`Fetched ${allJobs.length} raw jobs from Adzuna with a combined query.`);
    return allJobs;
};

const fetchJoobleJobs = async (): Promise<any[]> => {
    console.log("Fetching jobs from Jooble using a single combined query...");
    
    // Combine all search queries with an OR operator.
    const combinedQuery = PRIMARY_SEARCH_QUERIES.join(' | ');
    const allJobs: any[] = [];
    
    console.log(`Jooble: Starting fetch for combined query...`);
    for (let page = 1; page <= 50; page++) { 
        try {
            const url = `https://de.jooble.org/api/${JOOBLE_API_KEY}`;
            const response = await fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: combinedQuery, location: 'Deutschland', page: page })
            });
            const data = await response.json();
            const jobs = data?.jobs || [];
            if (jobs.length > 0) {
                allJobs.push(...jobs);
            } else {
                console.log(`Jooble: No more results found on page ${page}. Stopping.`);
                break; // Stop if no more results.
            }
        } catch (error) {
            console.error(`Jooble fetch failed on page ${page}:`, error);
            break; // Stop on failure.
        }
    }
    
    console.log(`Fetched ${allJobs.length} raw jobs from Jooble with a combined query.`);
    return allJobs;
};

const fetchGermanTechJobs = async (): Promise<any[]> => {
    console.log("Fetching jobs from GermanTechJobs...");
    const url = 'https://germantechjobs.de/api/jobs';
    try {
        const response = await fetchWithRetry(url);
        const data = await response.json();
        const jobs = data || [];
        // Removed pre-filtering to process all jobs from this source.
        // The `normalizeJob` function will determine if a job is an `exact_match`.
        console.log(`Fetched ${jobs.length} raw jobs from GermanTechJobs. All will be processed.`);
        return jobs;
    } catch (e) {
        console.error("GermanTechJobs fetch failed:", e);
        throw e;
    }
};

const fetchJobicyJobs = async (): Promise<any[]> => {
    console.log("Fetching jobs from Jobicy...");
    const tags = [
        'sysadmin', 'support', 'devops', 'administrator', 'netzwerk', 'cloud', 
        'it-support', 'linux', 'windows', 'security', 'infrastructure'
    ].join(',');
    // Removed geo=de,eu filter as it was returning 0 results. 
    // The internal normalizeJob function will handle location filtering.
    const url = `https://jobicy.com/api/v2/remote-jobs?count=500&industry=it&tag=${tags}`;
    try {
        const response = await fetchWithRetry(url);
        const data = await response.json();
        const jobs = data?.jobs || [];
        console.log(`Fetched ${jobs.length} targeted raw jobs from Jobicy.`);
        return jobs;
    } catch (e) {
        console.error("Jobicy fetch failed:", e);
        throw e;
    }
};

const fetchArbeitsagenturJobs = async (): Promise<any[]> => {
    console.log("Fetching jobs from Bundesagentur für Arbeit...");

    const fetchJobsForQuery = async (query: string): Promise<any[]> => {
        const queryJobs: any[] = [];
        console.log(`BA: Starting fetch for query "${query}"...`);
        for (let page = 1; page <= API_FETCH_PAGES.arbeitsagentur; page++) {
            try {
                // angebotsart=1 -> "Arbeit"
                const url = `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?was=${encodeURIComponent(query)}&page=${page}&size=50&angebotsart=1`;
                const response = await fetchWithRetry(url, {
                    headers: { 'X-API-Key': BA_API_KEY }
                });
                const data = await response.json();
                const jobs = data?.stellenangebote || [];
                if (jobs.length > 0) {
                    queryJobs.push(...jobs);
                } else {
                    break; // Stop if no more results for this query
                }
            } catch (error) {
                console.error(`BA fetch for query "${query}" page ${page} failed:`, error);
                if (page === 1) console.warn(`Could not fetch any BA results for query "${query}".`);
                break; // Stop on subsequent failures
            }
        }
        console.log(`BA: Fetched ${queryJobs.length} raw jobs for query "${query}".`);
        return queryJobs;
    };
    
    const queryPromises = PRIMARY_SEARCH_QUERIES.map(query => fetchJobsForQuery(query));
    const results = await Promise.allSettled(queryPromises);

    const allJobs: any[] = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
            allJobs.push(...result.value);
        } else if (result.status === 'rejected') {
            console.error(`BA fetch failed for query "${PRIMARY_SEARCH_QUERIES[index]}":`, result.reason);
        }
    });

    console.log(`Fetched ${allJobs.length} raw jobs from Bundesagentur für Arbeit across all queries.`);
    return allJobs;
};


// --- Main Service Functions ---

let cachedJobsResult: FetchJobsResult | null = null;

export const fetchJobs = async (forceRefresh: boolean = false): Promise<FetchJobsResult> => {
    if (cachedJobsResult && !forceRefresh) {
        console.log("Loading jobs from in-memory cache.");
        return cachedJobsResult;
    }
    
    if (forceRefresh) {
        console.log("Forcing refresh, clearing all caches...");
        cachedJobsResult = null;
        localStorage.removeItem(JOB_CACHE_KEY);
    } else {
        // Check if the cache is from this week (since last Sunday).
        const today = new Date();
        // today.getDay() returns 0 for Sunday, 1 for Monday, etc.
        // This calculates the date of the most recent Sunday.
        const lastSunday = new Date(new Date().setDate(today.getDate() - today.getDay()));
        lastSunday.setHours(0, 0, 0, 0); // Set to the beginning of the day.
        const lastSundayTimestamp = lastSunday.getTime();

        try {
            const cachedItem = localStorage.getItem(JOB_CACHE_KEY);
            if (cachedItem) {
                const cache = JSON.parse(cachedItem);
                if (cache.timestamp >= lastSundayTimestamp) {
                    console.log("Loading jobs from localStorage (cache is from this week).");
                    cachedJobsResult = cache.data;
                    return cachedJobsResult!;
                } else {
                    console.log("localStorage cache is stale (from before last Sunday).");
                    localStorage.removeItem(JOB_CACHE_KEY);
                }
            }
        } catch (e) {
            console.error("Failed to read from localStorage cache.", e);
            localStorage.removeItem(JOB_CACHE_KEY);
        }
    }


    console.log("Fetching jobs from APIs...");
    
    const sourcesToFetch = [
        { fn: fetchArbeitnowJobs, source: JobSource.ARBEITNOW },
        { fn: fetchAdzunaJobs, source: JobSource.ADZUNA },
        { fn: fetchJoobleJobs, source: JobSource.JOOBLE },
        { fn: fetchGermanTechJobs, source: JobSource.GERMANTECHJOBS },
        { fn: fetchJobicyJobs, source: JobSource.JOBICY },
        { fn: fetchArbeitsagenturJobs, source: JobSource.ARBEITSAGENTUR },
    ];
    
    const results = await Promise.allSettled(sourcesToFetch.map(s => s.fn()));

    const rawJobs: { data: any[], source: JobSource }[] = [];
    const failedSources: JobSource[] = [];

    results.forEach((result, index) => {
        const sourceInfo = sourcesToFetch[index];
        if (result.status === 'fulfilled' && result.value.length > 0) {
            rawJobs.push({ data: result.value, source: sourceInfo.source });
        } else {
            console.error(`${sourceInfo.source} fetch failed or returned no results:`, result.status === 'rejected' ? result.reason : 'Empty result');
            failedSources.push(sourceInfo.source);
        }
    });
    
    const allNormalizedJobs: (Job | null)[] = rawJobs.flatMap(sourceData => 
        sourceData.data.map(job => normalizeJob(job, sourceData.source))
    );

    const validJobs = allNormalizedJobs.filter((j): j is Job => j !== null);

    const deduplicatedJobs = new Map<string, Job>();
    validJobs.forEach(job => {
        const key = getDedupeKey(job);
        if (!deduplicatedJobs.has(key)) {
            deduplicatedJobs.set(key, job);
        }
    });

    const finalJobs = Array.from(deduplicatedJobs.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log(`Fetched and processed ${finalJobs.length} unique jobs.`);
    if (failedSources.length > 0) {
        console.warn(`Failed to fetch from: ${failedSources.join(', ')}`);
    }

    const result = { jobs: finalJobs, failedSources };
    cachedJobsResult = result; // Update in-memory cache

    // Store result in localStorage
    try {
        const cacheEntry = {
            timestamp: Date.now(),
            data: result,
        };
        localStorage.setItem(JOB_CACHE_KEY, JSON.stringify(cacheEntry));
        console.log("Jobs saved to localStorage.");
    } catch (e) {
        console.error("Failed to save jobs to localStorage.", e);
    }
    
    return result;
};

export const fetchStatistics = async (onlyCareerChange: boolean): Promise<StatsData> => {
    console.log(`Generating statistics with onlyCareerChange=${onlyCareerChange}...`);
    
    const { jobs } = await fetchJobs();
    let filteredJobs = jobs.filter(j => j.exact_match);
    if (onlyCareerChange) {
        filteredJobs = filteredJobs.filter(j => j.career_switch);
    }
    
    const requirementCounts: { [key: string]: number } = {};
    const examples: Record<string, { jobId: string; title: string; company: string; url: string; }[]> = {};

    filteredJobs.forEach(job => {
        job.requirements.forEach(req => {
            if (!requirementCounts[req]) {
                requirementCounts[req] = 0;
                examples[req] = [];
            }
            requirementCounts[req]++;
            if (examples[req].length < 10) {
                examples[req].push({ jobId: job.id, title: job.title, company: job.company, url: job.url });
            }
        });
    });

    const sortedRequirements = Object.entries(requirementCounts)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 100);

    const timeSeriesMap: { [month: string]: { [skill: string]: number } } = {};
    filteredJobs.forEach(job => {
        const month = new Date(job.created_at).toISOString().substring(0, 7); // YYYY-MM format
        if (!timeSeriesMap[month]) {
            timeSeriesMap[month] = {};
        }
        job.requirements.forEach(req => {
            if (!timeSeriesMap[month][req]) {
                timeSeriesMap[month][req] = 0;
            }
            timeSeriesMap[month][req]++;
        });
    });
    const timeSeries = Object.entries(timeSeriesMap)
        .map(([month, skillCounts]) => ({
            month,
            ...skillCounts
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

    return {
        totalJobs: filteredJobs.length,
        requirementCounts: sortedRequirements,
        timeSeries,
        examples,
    };
};

export const generateCoverLetter = async (job: Job, userContext: UserContext): Promise<string> => {
    console.log(`Generating cover letter for: ${job.title} using Gemini API`);
    
    // API Key is handled by the environment variable 'process.env.API_KEY'
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const { title, company, location, description } = job;
    const jobRequirements = job.requirements.slice(0, 5).join(', ');

    const prompt = `
Aufgabe: Erstelle ein überzeugendes und professionelles Motivationsschreiben in deutscher Sprache.
Struktur:
1.  **Betreff:** "Bewerbung als ${title}"
2.  **Einleitung:** Nenne die exakte Position "${title}" und die Firma "${company}". Zeige sofortiges Interesse.
3.  **Hauptteil:** Gehe auf 2-3 Kernanforderungen aus der Stellenbeschreibung ein. **Das ist der wichtigste Teil:** Verknüpfe jede Anforderung direkt mit den Informationen des Bewerbers. Anstatt Skills nur zu listen, nutze das "Vorwissen" und den "Hintergrund", um zu *belegen*, warum der Bewerber passt. Begründe die Motivation, besonders bei Quereinsteigern.
4.  **Schluss:** Formuliere einen klaren Call-to-Action (Einladung zum Gespräch) und schließe professionell ab.

**Regeln:**
- **Ton:** Selbstbewusst, professionell und prägnant.
- **Vermeiden:** Floskeln, Gehaltsvorstellungen, zu lange Sätze.
- **Fokus:** Mache die Verbindung zwischen Job und Bewerber so klar und logisch wie möglich.

**Job Details:**
- Jobtitel: ${title}
- Firma: ${company}
- Standort: ${location}
- Wichtige Anforderungen aus der Beschreibung: ${jobRequirements}

**Stellenbeschreibung (zur Analyse):**
---
${description}
---

**Informationen über den Bewerber (diese müssen überzeugend eingewoben werden):**
- **Skills / Stärken:** ${userContext.skills || 'Keine Angabe'} (Nutze diese als zentrale Argumente)
- **Vorwissen:** ${userContext.knowledge || 'Keine Angabe'} (Nutze dies als konkrete Beispiele und Belege für die Skills)
- **Hintergrund / Motivation:** ${userContext.background || 'Keine Angabe'} (Nutze dies, um die persönliche Motivation und den Antrieb für die Bewerbung zu erklären)
---
`;

    try {
       const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "Du bist ein Experte für die Erstellung von überzeugenden, professionellen deutschen Motivationsschreiben. Deine Aufgabe ist es, die Jobanforderungen und die Daten des Bewerbers zu einer kohärenten und überzeugenden Geschichte zu verweben. Halte dich strikt an die vorgegebene Struktur und die Regeln im Prompt."
            }
        });
        const llmResponse = response.text;

        if (!llmResponse) {
            throw new Error("Received an empty response from the AI.");
        }
        
        const normalizedResponse = llmResponse.toLowerCase();
        const normalizedTitle = title.toLowerCase();
        
        const subjectText = normalizedResponse.split('\n')[0];
        if (!subjectText.toLowerCase().includes(normalizedTitle)) {
             console.warn("Validation Warning: Job title may be missing from subject line.");
        }

        const firstParagraph = llmResponse.substring(0, 400).toLowerCase();
        if (!firstParagraph.includes(normalizedTitle)) {
             throw new Error(`Validierung fehlgeschlagen: Der exakte Jobtitel "${title}" wurde nicht im Einleitungsabschnitt des Schreibens gefunden. Bitte versuchen Sie es erneut.`);
        }

        return llmResponse;

    } catch(e) {
        console.error("Failed to generate cover letter:", e);
        if (e instanceof Error) {
            return `Fehler bei der Generierung des Motivationsschreibens: ${e.message}`;
        }
        return "Ein unbekannter Fehler ist bei der Generierung aufgetreten.";
    }
};

export const generateSuitabilityLetter = async (participant: ParticipantData, selectedJobs: Job[], courseInfo: CourseInfo): Promise<string> => {
    console.log(`Generating suitability letter for: ${participant.name} for course: ${courseInfo.title}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const selectedJobsText = selectedJobs.length > 0
        ? `Zur Untermauerung meiner Jobaussichten habe ich folgende passende Stellenanzeigen identifiziert:\n` + selectedJobs.map(job => `- "${job.title}" bei ${job.company} (Link: ${job.url})\n  - Begründung der Passung: Diese Stelle erfordert Kenntnisse, die direkt in der Weiterbildung vermittelt werden und passt ideal zu meinem Ziel, im Gesundheits-IT-Sektor tätig zu werden.`).join('\n')
        : 'Aktuelle Stellenrecherchen zeigen eine hohe Nachfrage für IT-Fachkräfte im Gesundheitswesen, was meine Jobperspektiven nach der Weiterbildung untermauert.';


    const prompt = `
Aufgabe: Erstelle ein sachliches und professionelles Eignungsfeststellungs- und Motivationsschreiben aus der Ich-Perspektive des Teilnehmers für einen Bildungsgutschein.
Struktur und Inhalt (strikt einhalten):

1.  **Betreff:** "Antrag auf Förderung einer beruflichen Weiterbildung – Eignungsfeststellung und Motivation"

2.  **Einleitung:** "Sehr geehrte Damen und Herren, hiermit beantrage ich die Förderung für die Weiterbildung '${courseInfo.title}' bei Hypercampus und möchte nachfolgend meine Motivation sowie Eignung für dieses Vorhaben darlegen."

3.  **Ausgangslage:** Beschreibe kurz die aktuelle Situation, bisherige Ausbildung und Berufserfahrung basierend auf: "${participant.background}".

4.  **Fachliche Kompetenzen & Stärken:** Fasse die fachlichen Kompetenzen und Stärken zusammen: "${participant.skills}".

5.  **Motivation & berufliches Ziel:** Erläutere die Motivation und das berufliche Ziel basierend auf: "${participant.motivation}". Formuliere ein klares Ziel im Bereich der IT im Gesundheitswesen, das zum gewählten Kurs passt.

6.  **Warum die Weiterbildung bei Hypercampus?:** Begründe, warum genau dieser Kurs (${courseInfo.title}) mit seinen Inhalten (${courseInfo.modules.join(', ')}) und dem Abschluss (${courseInfo.degree}) ideal passt, um die Lücke zwischen den vorhandenen Fähigkeiten und dem beruflichen Ziel zu schließen. Betone den Branchenfokus Gesundheitswesen und den spezifischen Schwerpunkt des Kurses.

7.  **Begründung der Förderfähigkeit und Arbeitsmarktrelevanz (§ 81 SGB III):** Formuliere die Begründung für den Bildungsgutschein basierend auf: "${participant.fundingReason}". Ergänze, dass die Digitalisierung im Gesundheitswesen einen hohen und steigenden Bedarf an Fachkräften mit dem im Kurs vermittelten Profil schafft und diese Weiterbildung die Wettbewerbsfähigkeit auf dem Arbeitsmarkt entscheidend verbessert.

8.  **Konkrete Jobperspektiven:** Integriere den folgenden Textabschnitt über Jobperspektiven: "${selectedJobsText}"

9.  **Schluss:** Formuliere einen abschließenden Satz, der die Entschlossenheit und das Engagement für die erfolgreiche Teilnahme an der Weiterbildung bekräftigt. Beende das Schreiben mit "Mit freundlichen Grüßen,\n${participant.name}\n${participant.address}".

**Regeln:**
- Schreibe aus der Ich-Perspektive des Teilnehmers.
- Verwende ausschließlich die bereitgestellten Informationen. Erfinde keine Details.
- Halte den Ton sachlich, prägnant und überzeugend.
- Formatiere den Text als professionellen, zusammenhängenden Brief, nicht als Stichpunktliste.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "Du bist ein Experte für das Verfassen von offiziellen Dokumenten für deutsche Behörden, insbesondere für die Agentur für Arbeit. Deine Aufgabe ist es, aus den gegebenen Informationen ein sachliches, strukturiertes und überzeugendes Eignungsfeststellungs- und Motivationsschreiben zu erstellen. Halte dich exakt an die vorgegebene Struktur und den sachlichen Ton."
            }
        });
        const llmResponse = response.text;
        if (!llmResponse) {
            throw new Error("Received an empty response from the AI.");
        }
        return llmResponse;
    } catch (e) {
        console.error("Failed to generate suitability letter:", e);
        if (e instanceof Error) {
            return `Fehler bei der Generierung des Schreibens: ${e.message}`;
        }
        return "Ein unbekannter Fehler ist bei der Generierung aufgetreten.";
    }
};