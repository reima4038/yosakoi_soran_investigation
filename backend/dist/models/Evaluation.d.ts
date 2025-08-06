import mongoose, { Document } from 'mongoose';
export interface IEvaluationScore extends Document {
    evaluationId: mongoose.Types.ObjectId;
    criterionId: string;
    score: number;
    comment?: string;
}
export interface IComment extends Document {
    evaluationId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    timestamp: number;
    text: string;
    createdAt: Date;
}
export interface IEvaluation extends Document {
    sessionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    submittedAt?: Date;
    isComplete: boolean;
    scores: IEvaluationScore[];
    comments: mongoose.Types.DocumentArray<IComment>;
    lastSavedAt: Date;
    checkCompletion(templateCategories: any[]): boolean;
}
export declare const EvaluationScore: mongoose.Model<IEvaluationScore, {}, {}, {}, mongoose.Document<unknown, {}, IEvaluationScore, {}> & IEvaluationScore & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export declare const Comment: mongoose.Model<IComment, {}, {}, {}, mongoose.Document<unknown, {}, IComment, {}> & IComment & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export declare const Evaluation: mongoose.Model<IEvaluation, {}, {}, {}, mongoose.Document<unknown, {}, IEvaluation, {}> & IEvaluation & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Evaluation.d.ts.map