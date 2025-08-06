import mongoose, { Document } from 'mongoose';
export declare enum ShareType {
    SESSION_RESULTS = "session_results",
    EVALUATION = "evaluation",
    ANALYSIS = "analysis"
}
export declare enum SharePermission {
    VIEW = "view",
    COMMENT = "comment",
    EDIT = "edit"
}
export declare enum ShareVisibility {
    PUBLIC = "public",
    PRIVATE = "private",
    PASSWORD_PROTECTED = "password_protected",
    SPECIFIC_USERS = "specific_users"
}
export interface IShare extends Document {
    resourceType: ShareType;
    resourceId: mongoose.Types.ObjectId;
    creatorId: mongoose.Types.ObjectId;
    shareToken: string;
    visibility: ShareVisibility;
    password?: string;
    allowedUsers: mongoose.Types.ObjectId[];
    permissions: SharePermission[];
    expiresAt?: Date;
    isActive: boolean;
    settings: {
        allowComments: boolean;
        allowDownload: boolean;
        showEvaluatorNames: boolean;
        showIndividualScores: boolean;
    };
    accessLog: {
        userId?: mongoose.Types.ObjectId;
        accessedAt: Date;
        ipAddress: string;
        userAgent: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
    isExpired(): boolean;
    hasAccess(userId?: string): boolean;
    logAccess(userId: string | undefined, ipAddress: string, userAgent: string): Promise<IShare>;
}
interface IShareModel extends mongoose.Model<IShare> {
    generateShareToken(): string;
    deactivateExpired(): Promise<any>;
}
export declare const Share: IShareModel;
export {};
//# sourceMappingURL=Share.d.ts.map