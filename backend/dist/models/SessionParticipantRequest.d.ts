import mongoose, { Document } from 'mongoose';
export declare enum ParticipantRequestStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export interface ISessionParticipantRequest extends Document {
    sessionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    requestedAt: Date;
    status: ParticipantRequestStatus;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    reviewComment?: string;
    inviteToken: string;
    requestMessage?: string;
    createdAt: Date;
}
export declare const SessionParticipantRequest: mongoose.Model<ISessionParticipantRequest, {}, {}, {}, mongoose.Document<unknown, {}, ISessionParticipantRequest, {}> & ISessionParticipantRequest & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SessionParticipantRequest.d.ts.map