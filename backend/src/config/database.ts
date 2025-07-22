import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yosakoi-evaluation';
    
    await mongoose.connect(mongoUri, {
      // MongoDB接続オプション
      maxPoolSize: 10, // 最大接続プール数
      serverSelectionTimeoutMS: 5000, // サーバー選択タイムアウト
      socketTimeoutMS: 45000, // ソケットタイムアウト
      bufferMaxEntries: 0, // バッファリング無効化
    });

    console.log('MongoDB接続成功');

    // 接続エラーハンドリング
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB接続エラー:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDBから切断されました');
    });

    // プロセス終了時の処理
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB接続を閉じました');
      process.exit(0);
    });

  } catch (error) {
    console.error('データベース接続に失敗しました:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB接続を閉じました');
  } catch (error) {
    console.error('データベース切断エラー:', error);
  }
};