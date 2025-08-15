"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminUser = createAdminUser;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const config_1 = require("../config");
async function createAdminUser() {
    try {
        // データベースに接続
        await mongoose_1.default.connect(config_1.config.mongoUri);
        console.log('Connected to MongoDB');
        // 既存の管理者ユーザーをチェック
        const existingAdmin = await User_1.User.findOne({ email: 'admin@example.com' });
        if (existingAdmin) {
            console.log('Admin user already exists:', {
                id: existingAdmin._id,
                username: existingAdmin.username,
                email: existingAdmin.email,
                role: existingAdmin.role
            });
        }
        else {
            // 管理者ユーザーを作成
            const adminUser = new User_1.User({
                username: 'admin',
                email: 'admin@example.com',
                passwordHash: 'AdminPass123', // pre-saveフックでハッシュ化される
                role: User_1.UserRole.ADMIN,
                profile: {
                    displayName: 'システム管理者'
                }
            });
            await adminUser.save();
            console.log('Admin user created successfully:', {
                id: adminUser._id,
                username: adminUser.username,
                email: adminUser.email,
                role: adminUser.role
            });
        }
        // 全ユーザーを表示
        const allUsers = await User_1.User.find({});
        console.log('\nAll users in database:');
        allUsers.forEach(user => {
            console.log(`- ${user.email} (${user.username}) - Role: ${user.role}`);
        });
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
    createAdminUser();
}
//# sourceMappingURL=createAdmin.js.map