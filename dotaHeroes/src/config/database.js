"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("Помилка: MONGODB_URI не знайдено у змінних середовища.");
        process.exit(1);
    }
    try {
        await mongoose_1.default.connect(uri);
        console.log("Успішно підключено до MongoDB");
    }
    catch (error) {
        console.error("Помилка підключення до MongoDB:", error);
        process.exit(1);
    }
}
mongoose_1.default.connection.on("error", (err) => {
    console.error("MongoDB помилка:", err);
});
mongoose_1.default.connection.on("disconnected", () => {
    console.warn("MongoDB відключено");
});
