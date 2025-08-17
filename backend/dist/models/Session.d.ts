import mongoose, { Document } from 'mongoose';
export declare enum SessionStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    COMPLETED = "completed",
    ARCHIVED = "archived"
}
export interface ISessionInviteSettings {
    isEnabled: boolean;
    expiresAt?: Date;
    maxUses?: number;
    currentUses: number;
    allowAnonymous: boolean;
    requireApproval: boolean;
}
export interface ISession extends Document {
    name: string;
    description: string;
    videoId: mongoose.Types.ObjectId;
    templateId: mongoose.Types.ObjectId;
    creatorId: mongoose.Types.ObjectId;
    evaluators: mongoose.Types.ObjectId[];
    status: SessionStatus;
    startDate?: Date;
    endDate?: Date;
    settings: {
        allowAnonymous: boolean;
        requireComments: boolean;
        showRealTimeResults: boolean;
        maxEvaluationsPerUser: number;
    };
    inviteSettings?: ISessionInviteSettings;
    createdAt: Date;
}
export declare const Session: mongoose.Model<ISession, {}, {}, {}, mongoose.Document<unknown, {}, ISession, {}> & ISession & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Session.d.ts.map