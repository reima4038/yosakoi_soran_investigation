import { IUser, UserRole } from '../models/User';
export interface RegisterData {
    username: string;
    email: string;
    password: string;
    role?: UserRole;
}
export interface LoginData {
    email: string;
    password: string;
}
export interface JWTPayload {
    userId: string;
    username: string;
    email: string;
    role: UserRole;
}
export declare class AuthService {
    /**
     * ユーザー登録
     */
    static register(userData: RegisterData): Promise<{
        user: IUser;
        token: string;
    }>;
    /**
     * ユーザーログイン
     */
    static login(loginData: LoginData): Promise<{
        user: IUser;
        token: string;
    }>;
    /**
     * JWTトークン生成
     */
    static generateToken(payload: JWTPayload): string;
    /**
     * JWTトークン検証
     */
    static verifyToken(token: string): JWTPayload;
    /**
     * ユーザーIDからユーザー情報取得
     */
    static getUserById(userId: string): Promise<IUser | null>;
    /**
     * パスワードリセット用トークン生成
     */
    static generatePasswordResetToken(userId: string): string;
    /**
     * パスワードリセット用トークン検証
     */
    static verifyPasswordResetToken(token: string): {
        userId: string;
    };
}
//# sourceMappingURL=authService.d.ts.map