const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const mongoURI = 'mongodb://localhost:27017/belle_chatbot';

const personaKnowledgeSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  type: { type: String, required: true },
  title: String,
  content: { type: String, required: true },
  tags: [String],
  priority: { type: Number, default: 0.5 },
  language: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

personaKnowledgeSchema.index({
  id: 'text',
  type: 'text',
  title: 'text',
  content: 'text',
  tags: 'text'
});

const PersonaKnowledge = mongoose.model(
  'PersonaKnowledge',
  personaKnowledgeSchema,
  'persona_knowledge'
);

async function main() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Da ket noi MongoDB.');

    await PersonaKnowledge.init();
    console.log('Persona knowledge text index da san sang.');

    const filePath = path.join(__dirname, 'data', 'persona_knowledge.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const items = JSON.parse(raw);

    if (!Array.isArray(items)) {
      throw new Error('persona_knowledge.json phai la mot mang JSON.');
    }

    let insertedOrUpdated = 0;

    for (const item of items) {
      if (!item.id || !item.type || !item.content) {
        console.warn('Bo qua object thieu id/type/content:', item);
        continue;
      }

      await PersonaKnowledge.updateOne(
        { id: item.id },
        {
          $set: {
            type: item.type,
            title: item.title || '',
            content: item.content,
            tags: Array.isArray(item.tags) ? item.tags : [],
            priority: typeof item.priority === 'number' ? item.priority : 0.5,
            language: item.language || 'en',
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      insertedOrUpdated++;
    }

    console.log(`Da import/upsert ${insertedOrUpdated} persona knowledge objects.`);
  } catch (error) {
    console.error('Loi import persona knowledge:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Da ngat ket noi MongoDB.');
  }
}

main();
