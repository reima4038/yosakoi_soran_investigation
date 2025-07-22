"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.UserRole = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["EVALUATOR"] = "evaluator";
    UserRole["USER"] = "user";
})(UserRole || (exports.UserRole = UserRole = {}));
const UserSchema = new mongoose_1.Schema({
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
        transform: function (_doc, ret) {
            delete ret.passwordHash;
            return ret;
        }
    }
});
// インデックス設定
UserSchema.index({ role: 1 });
// パスワード比較メソッド
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.passwordHash);
};
// パスワードハッシュ化のプリフック
UserSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash'))
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(12);
        this.passwordHash = await bcryptjs_1.default.hash(this.passwordHash, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
exports.User = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map