import mongoose, { Document } from 'mongoose';
export declare enum UserRole {
    ADMIN = "admin",
    EVALUATOR = "evaluator",
    USER = "user"
}
export interface IUser extends Document {
    username: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    profile: {
        displayName?: string;
        avatar?: string;
        bio?: string;
        expertise?: string[];
    };
    comparePassword(candidatePassword: string): Promise<boolean>;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map