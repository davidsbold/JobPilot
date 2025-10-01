import React, { useState, useEffect } from 'react';
import { UserContext } from '../pages/JobsPage';

interface PersonalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (context: UserContext) => void;
  initialContext: UserContext;
  jobCount: number;
}

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({ isOpen, onClose, onSubmit, initialContext, jobCount }) => {
  const [context, setContext] = useState<UserContext>(initialContext);

  useEffect(() => {
    setContext(initialContext);
  }, [initialContext, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContext(prev => ({...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(context);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">Motivationsschreiben personalisieren</h2>
            <p className="text-slate-500 mt-1">
              Diese Informationen werden für die Generierung von {jobCount} Motivationsschreiben verwendet.
            </p>
          </div>
          <div className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label htmlFor="modal_skills" className="block text-sm font-medium text-slate-700">Skills / Stärken des Teilnehmers</label>
              <textarea
                id="modal_skills"
                name="skills"
                rows={3}
                value={context.skills}
                onChange={handleTextChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                placeholder="z.B. Teamfähigkeit, schnelle Auffassungsgabe, zertifizierte Python-Grundlagen"
              />
            </div>
            <div>
              <label htmlFor="modal_knowledge" className="block text-sm font-medium text-slate-700">Vorwissen des Teilnehmers</label>
              <textarea
                id="modal_knowledge"
                name="knowledge"
                rows={3}
                value={context.knowledge}
                onChange={handleTextChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                placeholder="z.B. Private Server-Projekte, Erfahrung im Kundensupport, Umschulung zum Fachinformatiker"
              />
            </div>
            <div>
              <label htmlFor="modal_background" className="block text-sm font-medium text-slate-700">Hintergrund / Motivation des Teilnehmers</label>
              <textarea
                id="modal_background"
                name="background"
                rows={3}
                value={context.background}
                onChange={handleTextChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                placeholder="z.B. Erfolgreicher Branchenwechsel aus dem Handwerk, hohe Motivation für eine Karriere in der IT"
              />
            </div>
          </div>
          <div className="p-6 border-t bg-slate-50 flex justify-end gap-4 rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
              Abbrechen
            </button>
            <button type="submit" className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors">
              Generierung starten
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
