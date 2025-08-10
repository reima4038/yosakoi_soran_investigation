import mongoose, { Document, Schema } from 'mongoose';

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

const VideoSchema = new Schema<IVideo>({
  youtubeId: {
    type: String,
    required: [true, 'YouTube動画IDは必須です'],
    unique: true,
    trim: true,
    match: [/^[a-zA-Z0-9_-]{11}$/, '有効なYouTube動画IDを入力してください']
  },
  title: {
    type: String,
    required: [true, 'タイトルは必須です'],
    trim: true,
    maxlength: [200, 'タイトルは200文字以下である必要があります']
  },
  channelName: {
    type: String,
    required: [true, 'チャンネル名は必須です'],
    trim: true,
    maxlength: [100, 'チャンネル名は100文字以下である必要があります']
  },
  uploadDate: {
    type: Date,
    required: [true, 'アップロード日は必須です']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, '説明は2000文字以下である必要があります'],
    default: ''
  },
  metadata: {
    teamName: {
      type: String,
      trim: true,
      maxlength: [100, 'チーム名は100文字以下である必要があります']
    },
    performanceName: {
      type: String,
      trim: true,
      maxlength: [100, '演舞名は100文字以下である必要があります']
    },
    eventName: {
      type: String,
      trim: true,
      maxlength: [100, '大会名は100文字以下である必要があります']
    },
    year: {
      type: Number,
      min: [1900, '年度は1900年以降である必要があります'],
      max: [new Date().getFullYear() + 1, '年度は来年以前である必要があります']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, '場所は100文字以下である必要があります']
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'タグは30文字以下である必要があります']
  }],
  thumbnailUrl: {
    type: String,
    required: [true, 'サムネイルURLは必須です'],
    trim: true,
    match: [/^https?:\/\/.+/, 'サムネイルURLは有効なURLである必要があります']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '作成者は必須です']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete (ret as any).__v;
      return ret;
    }
  }
});

// インデックス設定
// youtubeIdは既にunique: trueで設定されているため、追加のインデックスは不要
VideoSchema.index({ createdBy: 1 });
VideoSchema.index({ 'metadata.teamName': 1 });
VideoSchema.index({ 'metadata.eventName': 1 });
VideoSchema.index({ 'metadata.year': 1 });
VideoSchema.index({ tags: 1 });
VideoSchema.index({ createdAt: -1 });

// 複合インデックス
VideoSchema.index({ 'metadata.eventName': 1, 'metadata.year': 1 });

export const Video = mongoose.model<IVideo>('Video', VideoSchema);