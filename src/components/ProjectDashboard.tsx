import React, { useState } from 'react';
import { FileText, Plus, Search, Trash2, Calendar, Layers, ExternalLink, Clock, FilePlus2, MoreVertical, LayoutGrid, List as ListIcon, HardDrive, Globe, Laptop } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '../types';
import { cn } from '../utils/cn';

interface ProjectDashboardProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  onOpenProject,
  onNewProject,
  onDeleteProject
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(ts);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileText className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">PDF Master v3</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase">Studio de Documents</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 rounded-full text-sm w-full md:w-64 transition-all outline-none text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-full p-1 border border-gray-200 dark:border-white/10">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  viewMode === 'grid' ? "bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  viewMode === 'list' ? "bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500"
                )}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onNewProject}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nouveau PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
              <FilePlus2 className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Aucun document pour le moment</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
              Importez votre premier fichier PDF pour commencer à l'éditer, le signer ou le transformer.
            </p>
            <button
              onClick={onNewProject}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/30"
            >
              Importer un PDF
            </button>
          </div>
        ) : (
          <div className={cn(
            "gap-6",
            viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col"
          )}>
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "group relative bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500",
                    viewMode === 'list' && "flex items-center p-4 gap-6"
                  )}
                >
                  {/* Preview Area */}
                  <div 
                    onClick={() => onOpenProject(project.id)}
                    className={cn(
                      "cursor-pointer bg-gray-50 dark:bg-black/20 overflow-hidden relative",
                      viewMode === 'grid' ? "aspect-[3/4] w-full border-b border-gray-100 dark:border-white/5" : "w-24 h-32 rounded-xl flex-shrink-0"
                    )}
                  >
                    {project.thumbnailUrl ? (
                      <img 
                        src={project.thumbnailUrl} 
                        alt={project.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                        <FileText className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                       <div className="bg-white text-blue-600 px-4 py-2 rounded-full text-xs font-bold shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                          Ouvrir le projet
                       </div>
                    </div>
                  </div>

                  {/* Info Area */}
                  <div className={cn(
                    "p-5",
                    viewMode === 'list' && "flex-1 p-0"
                  )}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-6">
                        {project.name}
                      </h3>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                        className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-black/40 text-red-500 hover:bg-red-500 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                        title="Supprimer le projet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {formatDate(project.updatedAt)}
                      </div>
                        {project.pageCount} page{project.pageCount > 1 ? 's' : ''}
                      </div>
                      
                      <div className="flex items-center gap-1.5 ml-auto">
                         {project.storageType === 'filesystem' ? (
                           <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                             <HardDrive size={10} /> Mode Pro
                           </span>
                         ) : project.storageType?.startsWith('cloud') ? (
                           <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                             <Globe size={10} /> Cloud
                           </span>
                         ) : (
                           <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-500 dark:text-gray-400 border border-gray-500/20">
                             <Laptop size={10} /> Local
                           </span>
                         )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};
