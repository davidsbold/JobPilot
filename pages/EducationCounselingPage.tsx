import React, { useState } from 'react';
import { Job } from '../types';
import { fetchJobs, generateSuitabilityLetter, ParticipantData } from '../services/apiService';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';

const courseInfo = {
    title: "IT-Fachkraft im Gesundheitswesen mit Schwerpunkt IT-Systemadministration",
    duration: "ca. 12 Monate",
    degree: "IHK-Zertifikat, AZAV-zertifiziert, anerkannte IT-Zertifikate",
    goal: "Qualifizierung zum IT-Systemadministrator mit Fokus Gesundheitswesen",
    modules: [
        "Grundlagen IT-Systeme & Support (Ticketing, Betriebssysteme, Datenschutz, Kommunikation)",
        "Netzwerke & Netzwerksicherheit (TCP/IP, Routing, Firewalls, VPN, Security Basics)",
        "Systemadministration Windows & Linux (Active Directory, Benutzerverwaltung, Rechte, Serverdienste)",
        "IT-Security & Datenschutz im Gesundheitswesen (DSGVO, Zugriffskontrollen, IT-Sicherheitsrichtlinien)",
        "Praxis- und Klinikanwendungen (digitale Patientenakten, Krankenhaus-IT, Schnittstellen HL7/FHIR)",
        "Projektarbeit & Prüfungsvorbereitung (Praxisprojekt, Prüfungssimulation, Abschlussgespräch)"
    ],
    value: "praxisnah, digital durchführbar, hohe Arbeitsmarktrelevanz im Gesundheitswesen."
};

export const EducationCounselingPage: React.FC = () => {
    const [formData, setFormData] = useState<ParticipantData>({
        name: '',
        birthDate: '',
        address: '',
        background: '',
        skills: '',
        motivation: '',
        fundingReason: '',
        preferences: ''
    });
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [jobsSearched, setJobsSearched] = useState(false);
    const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
    const [generatedLetter, setGeneratedLetter] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleJobSearch = async () => {
        setIsLoadingJobs(true);
        setJobsSearched(true);
        try {
            const { jobs: allJobs } = await fetchJobs(false);
            const healthcareKeywords = [
                'gesundheitswesen', 'klinik', 'krankenhaus', 'praxis', 'medizin', 'pharma', 
                'healthcare', 'hospital', 'clinic', 'medical', 'e-health', 'digital health',
                'ärzte', 'pflege', 'labor', 'diagnostik', 'medizintechnik', 'reha'
            ];
            
            const checkHealthcareKeywords = (text: string): boolean => {
                const normalizedText = text.toLowerCase();
                return healthcareKeywords.some(keyword => normalizedText.includes(keyword));
            };

            // First, filter for any job related to healthcare. This is the only hard filter.
            const healthcareJobs = allJobs.filter(job => {
                const jobText = `${job.title} ${job.description}`.toLowerCase();
                return checkHealthcareKeywords(jobText);
            });

            // Then, score and sort these jobs to prioritize the most relevant ones.
            const scoredAndSortedJobs = healthcareJobs
                .map(job => {
                    let score = 0;
                    if (job.career_switch) score += 2; // High priority
                    if (job.is_junior) score += 1;
                    if (job.remote) score += 1;
                    return { ...job, score };
                })
                .sort((a, b) => b.score - a.score); // Sort by score, highest first

            setJobs(scoredAndSortedJobs);

        } catch (error) {
            console.error("Failed to load jobs for counseling page:", error);
            setJobs([]);
        } finally {
            setIsLoadingJobs(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

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

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedLetter('');
        try {
            const jobsToInclude = jobs.filter(j => selectedJobs.has(j.id));
            const letter = await generateSuitabilityLetter(formData, jobsToInclude);
            setGeneratedLetter(letter);
        } catch (error) {
            console.error("Failed to generate letter:", error);
            setGeneratedLetter("Fehler bei der Generierung des Schreibens. Bitte versuchen Sie es erneut.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!generatedLetter || isGenerating) return;

        const lastName = formData.name.split(' ').pop() || 'Teilnehmer';
        const date = new Date().toISOString().split('T')[0];
        const filename = `Eignungsfeststellung_${lastName}_${date}.doc`;

        const contentAsHtml = generatedLetter.replace(/\n/g, '<br />');
        const htmlSource = `
            <!DOCTYPE html><html><head><meta charset='UTF-8'><title>Eignungsfeststellung</title></head>
            <body>${contentAsHtml}</body></html>`;

        const blob = new Blob([htmlSource], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isFormComplete = formData.name && formData.background && formData.skills && formData.motivation && formData.fundingReason;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Bildungsberatung & Eignungsfeststellung</h1>

            {/* Step 1 */}
            <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Schritt 1: Teilnehmerdaten eingeben</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700">Name</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label htmlFor="birthDate" className="block text-sm font-medium text-slate-700">Geburtsdatum</label>
                            <input type="date" name="birthDate" id="birthDate" value={formData.birthDate} onChange={handleInputChange} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-slate-700">Adresse</label>
                            <input type="text" name="address" id="address" value={formData.address} onChange={handleInputChange} className="mt-1 input-field" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="background" className="block text-sm font-medium text-slate-700">Bildungs- und Berufshintergrund</label>
                        <textarea name="background" id="background" rows={4} value={formData.background} onChange={handleInputChange} className="mt-1 input-field" />
                    </div>
                    <div>
                        <label htmlFor="skills" className="block text-sm font-medium text-slate-700">Fachliche Kompetenzen und Stärken</label>
                        <textarea name="skills" id="skills" rows={4} value={formData.skills} onChange={handleInputChange} className="mt-1 input-field" />
                    </div>
                    <div>
                        <label htmlFor="motivation" className="block text-sm font-medium text-slate-700">Motivation und berufliches Ziel</label>
                        <textarea name="motivation" id="motivation" rows={4} value={formData.motivation} onChange={handleInputChange} className="mt-1 input-field" />
                    </div>
                    <div>
                        <label htmlFor="fundingReason" className="block text-sm font-medium text-slate-700">Förderkriterien/Begründung (§ 81 SGB III)</label>
                        <textarea name="fundingReason" id="fundingReason" rows={4} value={formData.fundingReason} onChange={handleInputChange} className="mt-1 input-field" />
                    </div>
                    <div className="md:col-span-2">
                         <label htmlFor="preferences" className="block text-sm font-medium text-slate-700">Regionale Präferenzen / Remote-Bereitschaft</label>
                        <textarea name="preferences" id="preferences" rows={2} value={formData.preferences} onChange={handleInputChange} className="mt-1 input-field" />
                    </div>
                </div>
                 <div className="mt-6 border-t pt-6">
                    <button
                        onClick={handleJobSearch}
                        disabled={!isFormComplete || isLoadingJobs}
                        className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoadingJobs && <Spinner className="w-5 h-5 border-white border-t-sky-300" />}
                        {isLoadingJobs ? 'Suche...' : 'Passende Jobs suchen'}
                    </button>
                    {!isFormComplete && <p className="text-xs text-red-500 mt-2">Bitte füllen Sie Name, Hintergrund, Kompetenzen, Motivation und Förderbegründung aus.</p>}
                </div>
            </Card>

            {/* Step 2 */}
            <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Schritt 2: Kursinformationen</h2>
                <h3 className="text-xl font-bold text-sky-700">{courseInfo.title}</h3>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <p><span className="font-semibold">Dauer:</span> {courseInfo.duration}</p>
                    <p><span className="font-semibold">Abschluss:</span> {courseInfo.degree}</p>
                    <p><span className="font-semibold">Ziel:</span> {courseInfo.goal}</p>
                </div>
                <div className="mt-4">
                    <h4 className="font-semibold mb-2">Inhalte (Module):</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        {courseInfo.modules.map(m => <li key={m}>{m}</li>)}
                    </ul>
                </div>
                <p className="mt-4 text-sm font-semibold bg-sky-50 p-3 rounded-md">Mehrwert: {courseInfo.value}</p>
            </Card>

            {/* Step 3 */}
            <Card className="p-6 min-h-[200px]">
                 <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Schritt 3: Passende Stellenangebote auswählen</h2>
                 {isLoadingJobs ? (
                    <div className="flex justify-center items-center h-full pt-10">
                        <Spinner />
                        <span className="ml-4 text-slate-600">Suche nach relevanten Stellen...</span>
                    </div>
                 ) : !jobsSearched ? (
                    <div className="flex justify-center items-center h-full pt-10">
                        <p className="text-slate-500">Starten Sie die Jobsuche in Schritt 1, um passende Angebote zu finden.</p>
                    </div>
                 ) : (
                     <>
                        <p className="text-sm text-slate-500 mb-4">
                           {jobs.length > 0
                               ? `Es wurden ${jobs.length} passende Stellen im Gesundheitswesen gefunden. Jobs für Quereinsteiger und Remote-Arbeit werden priorisiert. Wählen Sie die relevantesten aus, um sie in das Schreiben aufzunehmen.`
                               : 'Es konnten keine passenden Stellen im Gesundheitswesen gefunden werden. Versuchen Sie es später erneut.'
                           }
                        </p>
                        {jobs.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {jobs.map(job => (
                                    <div key={job.id} className="flex items-start gap-3 p-3 border rounded-md hover:bg-slate-50">
                                        <input
                                           type="checkbox"
                                           id={`job-${job.id}`}
                                           checked={selectedJobs.has(job.id)}
                                           onChange={() => handleToggleJobSelection(job.id)}
                                           className="mt-1 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                       />
                                        <label htmlFor={`job-${job.id}`} className="cursor-pointer flex-grow">
                                           <p className="font-semibold">{job.title}</p>
                                           <p className="text-sm text-slate-600">{job.company}</p>
                                           <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 hover:underline">Details</a>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-center py-10 text-slate-500">Keine passenden Stellen in der Datenbank gefunden.</p>}
                     </>
                 )}
            </Card>

            {/* Step 4 & 5 */}
            <Card className="p-6 sticky bottom-6 z-10">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Schritt 4 & 5: Schreiben generieren & exportieren</h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleGenerate}
                        disabled={!isFormComplete || isGenerating}
                        className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isGenerating && <Spinner className="w-5 h-5 border-white border-t-sky-300" />}
                        {isGenerating ? 'Generiere...' : 'Eignungsfeststellung erstellen'}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={!generatedLetter || isGenerating}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        Als Word-Dokument herunterladen
                    </button>
                </div>
                 {!isFormComplete && <p className="text-xs text-red-500 mt-2">Bitte füllen Sie alle erforderlichen Felder in Schritt 1 aus, um das Schreiben zu generieren.</p>}
                 {generatedLetter && (
                    <div className="mt-4">
                        <h3 className="font-semibold mb-2">Generiertes Schreiben:</h3>
                        <textarea
                            readOnly
                            value={generatedLetter}
                            className="w-full h-96 p-3 border border-slate-300 rounded-md bg-slate-50 font-mono text-sm"
                        />
                    </div>
                 )}
            </Card>
            <style>{`
                .input-field {
                    display: block;
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    background-color: white;
                    border: 1px solid #cbd5e1;
                    border-radius: 0.375rem;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                }
                .input-field:focus {
                    outline: none;
                    --tw-ring-color: #0ea5e9;
                    box-shadow: 0 0 0 2px var(--tw-ring-color);
                    border-color: #0ea5e9;
                }
            `}</style>
        </div>
    );
};