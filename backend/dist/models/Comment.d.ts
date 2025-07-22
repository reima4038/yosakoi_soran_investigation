import mongoose, { Document } from 'mongoose';
export declare enum CommentType {
    GENERAL = "general",
    CRITERION = "criterion",
    CATEGORY = "category",
    REPLY = "reply"
}
export interface IComment extends Document {
    evaluationId: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    content: string;
    type: CommentType;
    targetId?: string;
    isAnonymous: boolean;
    likes: mongoose.Types.ObjectId[];
    replies: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Comment: mongoose.Model<IComment, {}, {}, {}, mongoose.Document<unknown, {}, IComment, {}> & IComment & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Comment.d.ts.map