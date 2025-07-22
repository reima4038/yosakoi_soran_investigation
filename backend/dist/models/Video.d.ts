import mongoose, { Document } from 'mongoose';
export interface IVideo extends Document {
    youtubeId: string;
    title: string;
    channelName: string;
    uploadDate: Date;
    description: string;
    metadata: {
        teamName?: string;
        performanceName?: string;
        eventName?: string;
        year?: number;
        location?: string;
    };
    tags: string[];
    thumbnailUrl: string;
    createdAt: Date;
    createdBy: mongoose.Types.ObjectId;
}
export declare const Video: mongoose.Model<IVideo, {}, {}, {}, mongoose.Document<unknown, {}, IVideo, {}> & IVideo & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Video.d.ts.map