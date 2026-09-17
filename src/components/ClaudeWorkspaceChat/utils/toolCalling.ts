import { Artifact, ArtifactType } from '../types';
import type { ChartSpec } from 'lib/ai/chart-artifacts';

/**
 * Structured Tool Calling Engine & SSE Event Schemas — WorldInMaking OS
 */

export interface CreateArtifactToolArgs {
  title: string;
  type: ArtifactType;
  language?: string;
  content: string;
  chartSpec?: ChartSpec;
  description?: string;
}

export interface WebSearchToolArgs {
  query: string;
}

export interface SSEArtifactEvent {
  id: string;
  title: string;
  type: ArtifactType;
  language?: string;
  content: string;
  description?: string;
  version: number;
}

export interface SSESearchEvent {
  status: 'running' | 'done';
  query: string;
  results?: string | null;
}

/**
 * Creates or increments an Artifact version when a document revision is requested.
 */
function normTitle(title: string): string {
  return (title || '').toLowerCase().trim().replace(/[\s\-_]+/g, '')
}

export function processArtifactRevision(
  existingArtifacts: Artifact[],
  newArtData: Omit<Artifact, 'id' | 'version' | 'createdAt'> & { id?: string; toolCallId?: string; pending?: boolean },
  opts?: { preferId?: string }
): { artifacts: Artifact[]; activeArtifact: Artifact } {
  const now = new Date().toISOString();
  const normalizedNewTitle = normTitle(newArtData.title || '');

  const matchingIndex = existingArtifacts.findIndex((a) => {
    if (newArtData.toolCallId && a.toolCallId && a.toolCallId === newArtData.toolCallId) return true
    if (!newArtData.pending && a.pending && newArtData.toolCallId && a.toolCallId === newArtData.toolCallId) return true
    if (opts?.preferId && a.id === opts.preferId) return true
    if (newArtData.id && a.id === newArtData.id) return true
    if (newArtData.identifier && a.identifier && newArtData.identifier === a.identifier) return true
    if (a.pending && existingArtifacts.filter((item) => item.pending).length === 1 && !newArtData.pending) {
      if (!normalizedNewTitle || !a.title || a.title === 'Untitled') return true
      const existingTitle = normTitle(a.title)
      return existingTitle === normalizedNewTitle || existingTitle.includes(normalizedNewTitle) || normalizedNewTitle.includes(existingTitle)
    }
    const normalizedExistingTitle = normTitle(a.title || '');
    return (
      normalizedExistingTitle === normalizedNewTitle ||
      (normalizedExistingTitle.length > 2 && normalizedNewTitle.length > 2 && (
        normalizedExistingTitle.includes(normalizedNewTitle) ||
        normalizedNewTitle.includes(normalizedExistingTitle)
      ))
    );
  });

  if (matchingIndex >= 0) {
    const previous = existingArtifacts[matchingIndex];
    const newVersion = previous.pending ? Math.max(1, previous.version || 1) : (previous.version || 1) + 1;
    const updatedArtifact: Artifact = {
      ...newArtData,
      id: previous.id,
      version: newVersion,
      createdAt: now,
      pending: Boolean(newArtData.pending),
      toolCallId: newArtData.toolCallId || previous.toolCallId,
    };
    const updatedList = [...existingArtifacts];
    updatedList[matchingIndex] = updatedArtifact;
    return { artifacts: updatedList, activeArtifact: updatedArtifact };
  } else {
    const newArtifact: Artifact = {
      ...newArtData,
      id: newArtData.id || `art-${Date.now()}-${existingArtifacts.length + 1}`,
      version: 1,
      createdAt: now,
      toolCallId: newArtData.toolCallId,
    };
    return {
      artifacts: [newArtifact, ...existingArtifacts],
      activeArtifact: newArtifact,
    };
  }
}
