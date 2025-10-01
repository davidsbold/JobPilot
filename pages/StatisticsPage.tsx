import React, { useState, useEffect, useCallback } from 'react';
import { fetchStatistics } from '../services/apiService';
import { StatsData, RequirementCount, ExampleJob } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Spinner } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';

const COLORS = ['#0ea5e9', '#6366f1', '#ec4899', '#f97316', '#10b981'];

export const StatisticsPage: React.FC = () => {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [onlyCareerChange, setOnlyCareerChange] = useState(false);
    const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null);
    const [selectedTrendSkills, setSelectedTrendSkills] = useState<string[]>([]);
    
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await fetchStatistics(onlyCareerChange);
            setStats(data);
            setSelectedTrendSkills(data.requirementCounts.slice(0, 3).map(r => r.key));
        } catch (err) {
            setError('Fehler beim Laden der Statistiken.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [onlyCareerChange]);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onlyCareerChange]);

    const handleRequirementClick = (data: any) => {
        if (data && data.payload && data.payload.key) {
            const key = data.payload.key;
            setSelectedRequirement(selectedRequirement === key ? null : key);
        }
    };
    
    const toggleTrendSkill = (skill: string) => {
        setSelectedTrendSkills(prev => {
            if(prev.includes(skill)) {
                return prev.filter(s => s !== skill);
            }
            if(prev.length < 5) {
                return [...prev, skill];
            }
            return prev;
        });
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

    if (error || !stats) {
        return <p className="text-red-500 text-center">{error || 'Keine Daten verfügbar.'}</p>;
    }

    const { requirementCounts, timeSeries, examples } = stats;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Statistiken für IT-Systemadministratoren</h1>
            
            <Card>
                <div className="flex justify-between items-center p-4">
                    <h2 className="text-xl font-semibold">Filter</h2>
                    <div className="flex items-center space-x-4">
                        <label htmlFor="career-switch-toggle" className="flex items-center cursor-pointer">
                            <span className="mr-3 text-slate-700">Nur Quereinstieg</span>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    id="career-switch-toggle"
                                    className="sr-only"
                                    checked={onlyCareerChange}
                                    onChange={() => setOnlyCareerChange(prev => !prev)}
                                />
                                <div className="block bg-slate-300 w-14 h-8 rounded-full"></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${onlyCareerChange ? 'transform translate-x-6 bg-sky-600' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 flex flex-col">
                    <h3 className="text-lg font-semibold p-4 border-b flex-shrink-0">Top 100 Anforderungen</h3>
                    <div className="p-4 overflow-y-auto flex-grow h-[75vh]">
                        <ResponsiveContainer width="100%" height={2500}>
                            <BarChart data={requirementCounts} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }} barSize={18}>
                                <XAxis type="number" />
                                <YAxis dataKey="key" type="category" width={100} tick={{ fontSize: 12 }} interval={0} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="count" fill="#0ea5e9" background={{ fill: '#e2e8f0' }} onClick={handleRequirementClick} className="cursor-pointer"/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card className="flex flex-col">
                    <h3 className="text-lg font-semibold p-4 border-b flex-shrink-0">Job-Beispiele</h3>
                     <div className="p-4 overflow-y-auto flex-grow">
                        {!selectedRequirement ? (
                            <p className="text-slate-500">Klicken Sie auf eine Anforderung im Diagramm, um Beispiele zu sehen.</p>
                        ) : (
                            <div>
                                <h4 className="font-bold mb-2">Beispiele für "{selectedRequirement}"</h4>
                                <ul className="space-y-2">
                                    {examples[selectedRequirement]?.map((job: ExampleJob) => (
                                        <li key={job.jobId} className="text-sm p-2 bg-slate-100 rounded">
                                            <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-medium">{job.title}</a>
                                            <p className="text-slate-600">{job.company}</p>
                                        </li>
                                    )) || <p>Keine Beispiele gefunden.</p>}
                                </ul>
                            </div>
                        )}
                     </div>
                </Card>
            </div>
            
            <Card>
                 <h3 className="text-lg font-semibold p-4 border-b">Trend nach Monat</h3>
                 <div className="p-4">
                     <div className="flex flex-wrap gap-2 mb-4">
                        {requirementCounts.slice(0, 10).map(skill => (
                            <button 
                                key={skill.key} 
                                onClick={() => toggleTrendSkill(skill.key)}
                                className={`px-3 py-1 text-sm rounded-full border transition-colors ${selectedTrendSkills.includes(skill.key) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                            >
                                {skill.key}
                            </button>
                        ))}
                    </div>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeSeries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {selectedTrendSkills.map((skill, index) => (
                                    <Line key={skill} type="monotone" dataKey={skill} stroke={COLORS[index % COLORS.length]} strokeWidth={2} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
            </Card>
        </div>
    );
};