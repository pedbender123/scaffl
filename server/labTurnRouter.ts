import { LabProject } from './labAgent.types.js';

export type TurnType = 'creation' | 'edit';

export function determineTurnType(project: LabProject): TurnType {
  if (!project.htmlContent || project.htmlContent.trim() === '' || project.turnCount === 0) {
    return 'creation';
  }
  return 'edit';
}
