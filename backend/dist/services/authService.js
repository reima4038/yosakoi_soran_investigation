"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const config_1 = require("../config");
class AuthService {
    /**
     * ユーザー登録
     */
    static async register(userData) {
        const { username, email, password, role = User_1.UserRole.USER } = userData;
        // 既存ユーザーチェック
        const existingUser = await User_1.User.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            if (existingUser.email === email) {
                throw new Error('このメールアドレスは既に登録されています');
            }
            if (existingUser.username === username) {
                throw new Error('このユーザー名は既に使用されています');
            }
        }
        // 新規ユーザー作成
        const user = new User_1.User({
            username,
            email,
            passwordHash: password, // pre-saveフックでハッシュ化される
            role,
            profile: {
                displayName: username
            }
        });
        await user.save();
        // JWTトークン生成
        const token = this.generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });
        return { user, token };
    }
    /**
     * ユーザーログイン
     */
    static async login(loginData) {
        const { email, password } = loginData;
        // ユーザー検索
        const user = await User_1.User.findOne({ email }).select('+passwordHash');
        if (!user) {
            throw new Error('メールアドレスまたはパスワードが正しくありません');
        }
        // パスワード検証
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error('メールアドレスまたはパスワードが正しくありません');
        }
        // JWTトークン生成
        const token = this.generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });
        return { user, token };
    }
    /**
     * JWTトークン生成
     */
    static generateToken(payload) {
        const secret = config_1.config.jwtSecret;
        const options = {
            expiresIn: config_1.config.jwtExpiresIn,
            issuer: 'yosakoi-evaluation-system',
            audience: 'yosakoi-users'
        };
        return jsonwebtoken_1.default.sign(payload, secret, options);
    }
    /**
     * JWTトークン検証
     */
    static verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret, {
                issuer: 'yosakoi-evaluation-system',
                audience: 'yosakoi-users'
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('トークンの有効期限が切れています');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('無効なトークンです');
            }
            else {
                throw new Error('トークンの検証に失敗しました');
            }
        }
    }
    /**
     * ユーザーIDからユーザー情報取得
     */
    static async getUserById(userId) {
        return User_1.User.findById(userId);
    }
    /**
     * パスワードリセット用トークン生成
     */
    static generatePasswordResetToken(userId) {
        const options = { expiresIn: '1h' };
        return jsonwebtoken_1.default.sign({ userId, type: 'password-reset' }, config_1.config.jwtSecret, options);
    }
    /**
     * パスワードリセット用トークン検証
     */
    static verifyPasswordResetToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            if (decoded.type !== 'password-reset') {
                throw new Error('無効なトークンタイプです');
            }
            return { userId: decoded.userId };
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('パスワードリセットトークンの有効期限が切れています');
            }
            else {
                throw new Error('無効なパスワードリセットトークンです');
            }
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map