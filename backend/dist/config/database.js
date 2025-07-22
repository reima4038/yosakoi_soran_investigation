"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yosakoi-evaluation';
        await mongoose_1.default.connect(mongoUri, {
            // MongoDB接続オプション
            maxPoolSize: 10, // 最大接続プール数
            serverSelectionTimeoutMS: 5000, // サーバー選択タイムアウト
            socketTimeoutMS: 45000, // ソケットタイムアウト
        });
        console.log('MongoDB接続成功');
        // 接続エラーハンドリング
        mongoose_1.default.connection.on('error', (error) => {
            console.error('MongoDB接続エラー:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('MongoDBから切断されました');
        });
        // プロセス終了時の処理
        process.on('SIGINT', async () => {
            await mongoose_1.default.connection.close();
            console.log('MongoDB接続を閉じました');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('データベース接続に失敗しました:', error);
        process.exit(1);
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        await mongoose_1.default.connection.close();
        console.log('MongoDB接続を閉じました');
    }
    catch (error) {
        console.error('データベース切断エラー:', error);
    }
};
exports.disconnectDatabase = disconnectDatabase;
//# sourceMappingURL=database.js.map