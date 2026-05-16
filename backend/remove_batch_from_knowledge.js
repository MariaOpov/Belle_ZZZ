const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://localhost:27017/belle_chatbot';

const knowledgeSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: String,
  category: String,
  subcategory: String,
  content: String,
  tags: [String],
  aliases: [String],
  source: String,
  source_url: String,
  license: String,
  language: String,
  createdAt: { type: Date, default: Date.now }
});

const Knowledge = mongoose.model('Knowledge', knowledgeSchema, 'knowledge');

async function main() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Đã kết nối MongoDB belle_chatbot');

    const filePath = path.join(
      __dirname,
      '..',
      'knowledge_disabled',
      'batch_004_vietnam_history_country.json'
    );

    if (!fs.existsSync(filePath)) {
      throw new Error(`Không tìm thấy file: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const items = JSON.parse(raw);

    if (!Array.isArray(items)) {
      throw new Error('Batch file phải là JSON array');
    }

    const ids = items
      .map(item => item.id)
      .filter(Boolean);

    if (!ids.length) {
      throw new Error('Không tìm thấy id nào trong batch');
    }

    const result = await Knowledge.deleteMany({
      id: { $in: ids }
    });

    console.log(`Đã xóa ${result.deletedCount} knowledge objects khỏi MongoDB`);
  } catch (err) {
    console.error('Lỗi xóa batch:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();