import mongoose from 'mongoose';
import { User } from '../models/User';
import { config } from '../config';

async function resetAdminPassword() {
  try {
    // データベースに接続
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // 管理者ユーザーを検索
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    
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

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  resetAdminPassword();
}

export { resetAdminPassword };