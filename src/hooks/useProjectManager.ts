import { useState, useEffect, useCallback } from 'react';
import { Project } from '../types';

const PROJECTS_KEY = 'pdfmaster_projects_manifest';

export function useProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);

  // Charger les projets au montage
  useEffect(() => {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (raw) {
      try {
        setProjects(JSON.parse(raw));
      } catch (e) {
        console.error('Failed to parse projects manifest', e);
      }
    }
  }, []);

  // Sauvegarder les projets quand ils changent
  const saveProjects = useCallback((updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
  }, []);

  const addProject = useCallback((name: string, pageCount: number, thumbnailUrl?: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      updatedAt: Date.now(),
      pageCount,
      thumbnailUrl,
    };
    const updated = [newProject, ...projects];
    saveProjects(updated);
    return newProject.id;
  }, [projects, saveProjects]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    const updated = projects.map(p => 
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    saveProjects(updated);
  }, [projects, saveProjects]);

  const deleteProject = useCallback((id: string) => {
    const updated = projects.filter(p => p.id !== id);
    saveProjects(updated);
    
    // Nettoyer aussi les données de session liées (via localStorage meta)
    // Note: IndexedDB sera nettoyé lors de la suppression physique si nécessaire
    // mais ici on s'occupe surtout de la visibilité dans le dashboard.
    localStorage.removeItem(`pdfmaster_session_meta_${id}`);
    localStorage.removeItem(`pdfmaster_session_draft_${id}`);
  }, [projects, saveProjects]);

  return {
    projects,
    addProject,
    updateProject,
    deleteProject
  };
}
