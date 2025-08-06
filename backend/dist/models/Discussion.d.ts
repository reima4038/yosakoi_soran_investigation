import mongoose, { Document } from 'mongoose';
export declare enum DiscussionType {
    SHARE_COMMENT = "share_comment",
    EVALUATION_FEEDBACK = "evaluation_feedback",
    SESSION_DISCUSSION = "session_discussion"
}
export interface IMention {
    userId: mongoose.Types.ObjectId;
    username: string;
    position: number;
}
export interface IDiscussionThread extends Document {
    shareId?: mongoose.Types.ObjectId;
    evaluationId?: mongoose.Types.ObjectId;
    sessionId?: mongoose.Types.ObjectId;
    type: DiscussionType;
    title?: string;
    isActive: boolean;
    participantIds: mongoose.Types.ObjectId[];
    lastActivityAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface IDiscussionComment extends Document {
    threadId: mongoose.Types.ObjectId;
    parentId?: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    content: string;
    mentions: IMention[];
    isEdited: boolean;
    editedAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    reactions: {
        userId: mongoose.Types.ObjectId;
        type: string;
        createdAt: Date;
    }[];
    attachments: {
        type: string;
        url: string;
        name: string;
        size?: number;
    }[];
    createdAt: Date;
    updatedAt: Date;
    extractMentions(content: string): IMention[];
    addReaction(userId: string, reactionType: string): Promise<IDiscussionComment>;
    removeReaction(userId: string): Promise<IDiscussionComment>;
    softDelete(): Promise<IDiscussionComment>;
    getReplyCount(): Promise<number>;
}
export declare const DiscussionThread: mongoose.Model<IDiscussionThread, {}, {}, {}, mongoose.Document<unknown, {}, IDiscussionThread, {}> & IDiscussionThread & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export declare const DiscussionComment: mongoose.Model<IDiscussionComment, {}, {}, {}, mongoose.Document<unknown, {}, IDiscussionComment, {}> & IDiscussionComment & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Discussion.d.ts.map