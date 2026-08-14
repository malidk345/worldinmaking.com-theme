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
export function processArtifactRevision(
  existingArtifacts: Artifact[],
  newArtData: Omit<Artifact, 'id' | 'version' | 'createdAt'>
): { artifacts: Artifact[]; activeArtifact: Artifact } {
  const now = new Date().toISOString();
  const normalizedNewTitle = (newArtData.title || '').toLowerCase().trim().replace(/[\s\-_]+/g, '');

  const matchingIndex = existingArtifacts.findIndex((a) => {
    if (newArtData.identifier && a.identifier && newArtData.identifier === a.identifier) return true
    const normalizedExistingTitle = (a.title || '').toLowerCase().trim().replace(/[\s\-_]+/g, '');
    return (
      normalizedExistingTitle === normalizedNewTitle ||
      normalizedExistingTitle.includes(normalizedNewTitle) ||
      normalizedNewTitle.includes(normalizedExistingTitle)
    );
  });

  if (matchingIndex >= 0) {
    const previous = existingArtifacts[matchingIndex];
    const newVersion = (previous.version || 1) + 1;
    const updatedArtifact: Artifact = {
      ...newArtData,
      id: previous.id,
      version: newVersion,
      createdAt: now,
    };
    const updatedList = [...existingArtifacts];
    updatedList[matchingIndex] = updatedArtifact;
    return { artifacts: updatedList, activeArtifact: updatedArtifact };
  } else {
    const newArtifact: Artifact = {
      ...newArtData,
      id: `art-${Date.now()}-${existingArtifacts.length + 1}`,
      version: 1,
      createdAt: now,
    };
    return {
      artifacts: [newArtifact, ...existingArtifacts],
      activeArtifact: newArtifact,
    };
  }
}
