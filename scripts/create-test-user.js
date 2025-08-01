const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB接続
mongoose.connect('mongodb://localhost:27017/yosakoi-evaluation');

// ユーザースキーマ（簡略版）
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  passwordHash: String,
  role: { type: String, default: 'user' },
  profile: {
    displayName: String,
    bio: String,
    expertise: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    // 既存のテストユーザーをチェック
    const existingUser = await User.findOne({ email: 'admin@example.com' });
    if (existingUser) {
      console.log('テストユーザーは既に存在します');
      return;
    }

    // パスワードをハッシュ化
    const passwordHash = await bcrypt.hash('Admin123!', 10);

    // テストユーザーを作成
    const testUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
      profile: {
        displayName: '管理者',
        bio: 'システム管理者アカウント',
        expertise: ['システム管理', 'YOSAKOI評価']
      }
    });

    await testUser.save();
    console.log('テストユーザーを作成しました:');
    console.log('Email: admin@example.com');
    console.log('Password: Admin123!');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestUser();