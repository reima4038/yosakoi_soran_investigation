import mongoose, { Document } from 'mongoose';
export interface IInviteLinkUsage extends Document {
    sessionId: mongoose.Types.ObjectId;
    token: string;
    usedBy?: mongoose.Types.ObjectId;
    usedAt: Date;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    errorReason?: string;
    createdAt: Date;
}
export declare const InviteLinkUsage: mongoose.Model<IInviteLinkUsage, {}, {}, {}, mongoose.Document<unknown, {}, IInviteLinkUsage, {}> & IInviteLinkUsage & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=InviteLinkUsage.d.ts.map