import mongoose from 'mongoose';
import { User, UserRole } from '../models/User';
import { config } from '../config';

async function createAdminUser() {
  try {
    // データベースに接続
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // 既存の管理者ユーザーをチェック
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', {
        id: existingAdmin._id,
        username: existingAdmin.username,
        email: existingAdmin.email,
        role: existingAdmin.role
      });
    } else {
      // 管理者ユーザーを作成
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        passwordHash: 'AdminPass123', // pre-saveフックでハッシュ化される
        role: UserRole.ADMIN,
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
    const allUsers = await User.find({});
    console.log('\nAll users in database:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.username}) - Role: ${user.role}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  createAdminUser();
}

export { createAdminUser };