export interface CodeIndex {
  [functionName: string]: {
    startLine: number;
    endLine: number;
    rawCode: string;
  };
}

export type EditScope = 'surgical' | 'full_rewrite';

export interface EditPlan {
  userIntent: string;
  editScope: EditScope;
  reasoning: string;
  targetFunctions: string[];
  extractedCode: {
    [functionName: string]: string;
  };
  editInstructions: string;
}

export interface LabProject {
  id: string;
  userId: string;
  institutionId: string | null;
  title: string;
  description: string | null;
  htmlContent: string;
  isPublic: boolean;
  codeIndex: CodeIndex;
  projectContext: string;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
}
