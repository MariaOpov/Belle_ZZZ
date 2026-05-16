const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://localhost:27017/belle_chatbot';

const knowledgeSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
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

knowledgeSchema.index({
  id: 'text',
  title: 'text',
  category: 'text',
  subcategory: 'text',
  content: 'text',
  tags: 'text',
  aliases: 'text'
});

const Knowledge = mongoose.model('Knowledge', knowledgeSchema, 'knowledge');

async function importFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const items = JSON.parse(raw);

  if (!Array.isArray(items)) {
    throw new Error(`${path.basename(filePath)} phải là JSON array`);
  }

  let count = 0;

  for (const item of items) {
    if (!item.id || !item.title || !item.content) {
      console.log('Bỏ qua object thiếu id/title/content:', item);
      continue;
    }

    await Knowledge.updateOne(
      { id: item.id },
      {
        $set: {
          id: item.id,
          title: item.title,
          category: item.category,
          subcategory: item.subcategory,
          content: item.content,
          tags: Array.isArray(item.tags) ? item.tags : [],
          aliases: Array.isArray(item.aliases) ? item.aliases : [],
          source: item.source,
          source_url: item.source_url,
          license: item.license,
          language: item.language
        }
      },
      { upsert: true }
    );

    count++;
  }

  return count;
}

async function main() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Đã kết nối MongoDB belle_chatbot');

    await Knowledge.init();
    console.log('Knowledge indexes đã sẵn sàng');

    // Vì file này nằm trong backend/, còn knowledge_batches nằm ở ../knowledge_batches
    const batchDir = path.join(__dirname, '..', 'knowledge_batches');

    const files = fs.readdirSync(batchDir)
      .filter(file => file.endsWith('.json'))
      .sort();

    if (!files.length) {
      throw new Error('Không tìm thấy file .json nào trong knowledge_batches');
    }

    let total = 0;

    for (const file of files) {
      const filePath = path.join(batchDir, file);
      const count = await importFile(filePath);
      total += count;
      console.log(`Đã import/update ${count} object từ ${file}`);
    }

    console.log(`Hoàn tất. Tổng import/update: ${total} knowledge objects`);
  } catch (err) {
    console.error('Lỗi import knowledge:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();