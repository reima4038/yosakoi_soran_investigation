"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAdminPassword = resetAdminPassword;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const config_1 = require("../config");
async function resetAdminPassword() {
    try {
        // データベースに接続
        await mongoose_1.default.connect(config_1.config.mongoUri);
        console.log('Connected to MongoDB');
        // 管理者ユーザーを検索
        const adminUser = await User_1.User.findOne({ email: 'admin@example.com' });
        if (!adminUser) {
            console.log('Admin user not found');
            return;
        }
        console.log('Found admin user:', {
            id: adminUser._id,
            username: adminUser.username,
            email: adminUser.email,
            role: adminUser.role
        });
        // パスワードをリセット
        adminUser.passwordHash = 'AdminPass123'; // pre-saveフックでハッシュ化される
        await adminUser.save();
        console.log('Admin password reset successfully');
        // パスワード検証テスト
        const isValid = await adminUser.comparePassword('AdminPass123');
        console.log('Password verification test:', isValid ? 'PASS' : 'FAIL');
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await mongoose_1.default.connection.close();
        console.log('Database connection closed');
    }
}
// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
    resetAdminPassword();
}
//# sourceMappingURL=resetAdminPassword.js.map