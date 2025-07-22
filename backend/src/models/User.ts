import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  ADMIN = 'admin',
  EVALUATOR = 'evaluator',
  USER = 'user'
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

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'ユーザー名は必須です'],
    unique: true,
    trim: true,
    minlength: [3, 'ユーザー名は3文字以上である必要があります'],
    maxlength: [30, 'ユーザー名は30文字以下である必要があります'],
    match: [/^[a-zA-Z0-9_-]+$/, 'ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です']
  },
  email: {
    type: String,
    required: [true, 'メールアドレスは必須です'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '有効なメールアドレスを入力してください']
  },
  passwordHash: {
    type: String,
    required: [true, 'パスワードは必須です'],
    minlength: [8, 'パスワードは8文字以上である必要があります']
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  profile: {
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, '表示名は50文字以下である必要があります']
    },
    avatar: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'アバターURLは有効なURLである必要があります']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, '自己紹介は500文字以下である必要があります']
    },
    expertise: [{
      type: String,
      trim: true,
      maxlength: [50, '専門分野は50文字以下である必要があります']
    }]
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret) {
      delete (ret as any).passwordHash;
      return ret;
    }
  }
});

// インデックス設定
UserSchema.index({ role: 1 });

// パスワード比較メソッド
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// パスワードハッシュ化のプリフック
UserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);