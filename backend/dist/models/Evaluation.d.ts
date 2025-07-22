import mongoose, { Document } from 'mongoose';
export interface IScore {
    criterionId: string;
    value: number;
    comment?: string;
}
export interface ICategoryScore {
    categoryId: string;
    scores: IScore[];
    totalScore: number;
    weightedScore: number;
}
export interface IEvaluation extends Document {
    sessionId: mongoose.Types.ObjectId;
    evaluatorId: mongoose.Types.ObjectId;
    videoId: mongoose.Types.ObjectId;
    templateId: mongoose.Types.ObjectId;
    categoryScores: ICategoryScore[];
    totalScore: number;
    finalScore: number;
    generalComment?: string;
    isAnonymous: boolean;
    submittedAt: Date;
    createdAt: Date;
}
export declare const Evaluation: mongoose.Model<IEvaluation, {}, {}, {}, mongoose.Document<unknown, {}, IEvaluation, {}> & IEvaluation & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Evaluation.d.ts.map