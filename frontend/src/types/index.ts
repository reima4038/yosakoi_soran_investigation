// Type definitions based on the design document

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  profile: {
    displayName?: string;
    avatar?: string;
    bio?: string;
    expertise?: string[];
  };
}

export enum UserRole {
  ADMIN = 'admin',
  EVALUATOR = 'evaluator',
  USER = 'user',
}

export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  channelName: string;
  uploadDate: string;
  description: string;
  metadata: {
    teamName?: string;
    performanceName?: string;
    eventName?: string;
    year?: number;
    location?: string;
  };
  tags: string[];
  thumbnailUrl: string;
  createdAt: string;
  createdBy: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  creatorId: string;
  categories: Category[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  weight: number;
  criteria: Criterion[];
}

export interface Criterion {
  id: string;
  name: string;
  description: string;
  type: CriterionType;
  minValue: number;
  maxValue: number;
  weight: number;
}

export enum CriterionType {
  NUMERIC = 'numeric',
  SCALE = 'scale',
  BOOLEAN = 'boolean',
}

export interface Session {
  id: string;
  name: string;
  description: string;
  startDate: Date | string;
  endDate: Date | string;
  status: SessionStatus;
  videoId: string;
  templateId: string;
  creatorId: string;
  participants: SessionUser[];
  createdAt: Date | string;
  settings: {
    isAnonymous: boolean;
    showResultsAfterSubmit: boolean;
    allowComments: boolean;
  };
}

export enum SessionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export interface SessionUser {
  sessionId: string;
  userId: string;
  role: SessionUserRole;
  hasSubmitted: boolean;
  invitedAt: Date | string;
  joinedAt?: Date | string;
}

export enum SessionUserRole {
  OWNER = 'owner',
  EVALUATOR = 'evaluator',
  OBSERVER = 'observer',
}

export interface Evaluation {
  id: string;
  sessionId: string;
  userId: string;
  submittedAt: Date | string;
  isComplete: boolean;
  scores: EvaluationScore[];
  comments: Comment[];
}

export interface EvaluationScore {
  id: string;
  evaluationId: string;
  criterionId: string;
  score: number;
  comment?: string;
}

export interface Comment {
  id: string;
  evaluationId: string;
  userId: string;
  timestamp: number;
  text: string;
  createdAt: Date;
}
