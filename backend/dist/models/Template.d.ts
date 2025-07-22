import mongoose, { Document } from 'mongoose';
export declare enum CriterionType {
    NUMERIC = "numeric",
    SCALE = "scale",
    BOOLEAN = "boolean"
}
export interface ICriterion {
    id: string;
    name: string;
    description: string;
    type: CriterionType;
    minValue: number;
    maxValue: number;
    weight: number;
}
export interface ICategory {
    id: string;
    name: string;
    description: string;
    weight: number;
    criteria: ICriterion[];
}
export interface ITemplate extends Document {
    name: string;
    description: string;
    createdAt: Date;
    creatorId: mongoose.Types.ObjectId;
    categories: ICategory[];
}
export declare const Template: mongoose.Model<ITemplate, {}, {}, {}, mongoose.Document<unknown, {}, ITemplate, {}> & ITemplate & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Template.d.ts.map