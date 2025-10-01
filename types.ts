// FIX: Removed self-import of `Job` and `JobSource` to resolve declaration conflicts.

export interface FetchJobsResult {
  jobs: Job[];
  failedSources: JobSource[];
}

export enum JobSource {
  ARBEITNOW = 'Arbeitnow',
  ADZUNA = 'Adzuna',
  JOOBLE = 'Jooble',
  GERMANTECHJOBS = 'GermanTechJobs',
  JOBICY = 'Jobicy',
}

export interface Job {
  id: string;
  source: JobSource;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  created_at: string;
  description: string;
  tags: string[];
  job_types: string[];
  raw: any;
  exact_match: boolean;
  career_switch: boolean;
  is_junior: boolean;
  requirements: string[];
}

export interface Filters {
  searchTerm: string;
  days: number | null;
  careerChangeOnly: boolean;
  location: string;
  isRemote: boolean | null;
  isJunior: boolean;
  skills: string[];
  skillFilterLogic: 'AND' | 'OR';
  sources: JobSource[];
  showFavoritesOnly: boolean;
}

export interface RequirementCount {
  key: string;
  count: number;
}

export interface TimeSeriesData {
  month: string;
  [key: string]: number | string;
}

export interface ExampleJob {
    jobId: string;
    title: string;
    company: string;
    url: string;
}

export interface StatsData {
  totalJobs: number;
  requirementCounts: RequirementCount[];
  timeSeries: TimeSeriesData[];
  examples: Record<string, ExampleJob[]>;
}
