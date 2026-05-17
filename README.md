# Belle ZZZ

[English](#english) | [Tiếng Việt](#tieng-viet)

---

<a id="english"></a>

# English

Belle ZZZ is a fan-made multi-model AI chatbot dashboard inspired by Belle from *Zenless Zone Zero*.

This project combines multiple AI models into one interactive assistant system. It includes a React frontend, a Node.js backend, MongoDB chat history, RAG knowledge retrieval, and three local AI model services.

> This is a fan-made educational project inspired by Belle from *Zenless Zone Zero*.  
> It is not affiliated with, endorsed by, sponsored by, or officially connected to HoYoverse, COGNOSPHERE, miHoYo, or *Zenless Zone Zero*.  
> All related names, trademarks, characters, and assets belong to their respective owners.  
> This project is non-commercial and created for academic purposes only.

---

## Features

- Multi-model chatbot dashboard
- Manual model switching
- Belle-1: RNN intent classifier
- Belle-2: GPT-2 fine-tuned chat model
- Belle-3: Qwen 1.5B + LoRA + RAG assistant
- React frontend interface
- Node.js backend
- MongoDB chat history
- RAG retrieval log
- Intent analysis panel
- Recent query history
- Local-first AI architecture

---

## Model Overview

| Model | Role | Description |
|---|---|---|
| Belle-1 RNN | Intent Classifier | Detects user intent such as yes/no/stop/image-related requests. |
| Belle-2 GPT-2 | Legacy Chat Model | A fine-tuned GPT-2 model for simple chatbot responses. |
| Belle-3 Qwen RAG | Main Assistant | Qwen 1.5B with Belle LoRA and retrieval-augmented generation. |

---

## Tech Stack

### Frontend

- React
- Vite
- Axios
- CSS dashboard UI

### Backend

- Node.js
- Express
- MongoDB
- RAG service
- Manual model selection

### AI Services

- FastAPI
- TensorFlow / Keras
- PyTorch
- Transformers
- PEFT LoRA
- GPT-2
- Qwen2 1.5B

---

## Project Structure

```txt
Belle_ZZZ/
├── ai-models/
│   ├── rnn_service.py
│   ├── gpt2_service.py
│   ├── qwen_service.py
│   ├── rnn-intent/
│   ├── transformer-chat/
│   └── belle_adapter_qwen/
│
├── backend/
│   ├── server.js
│   ├── ragService.js
│   ├── import_knowledge.js
│   └── remove_batch_from_knowledge.js
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   └── package.json
│
├── knowledge_batches/
├── .env.example
├── .gitignore
└── README.md
```

---

## Required Model Files

Large AI model files are not included in this repository.

You need to manually place the required model files into the correct folders.

Required local files and folders:

```txt
ai-models/transformer-chat/
ai-models/belle_adapter_qwen/
ai-models/rnn-intent/rnn_intent_model.h5
ai-models/rnn-intent/tokenizer.pickle
ai-models/rnn-intent/label_encoder.pickle
```

Model download link:

```txt
ADD_GOOGLE_DRIVE_LINK_HERE
```

After downloading, extract the files and place them into the matching folders.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/MariaOpov/Belle_ZZZ.git
cd Belle_ZZZ
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Install Python dependencies

Activate your Python environment first, then run:

```bash
cd ../ai-models
pip install fastapi uvicorn torch transformers peft tensorflow numpy scikit-learn accelerate sentencepiece
```

---

## Running the Project

You need to run each service in a separate terminal.

### Terminal 1: Belle-1 RNN

```bash
cd ai-models
python rnn_service.py
```

Default port:

```txt
http://127.0.0.1:8101
```

### Terminal 2: Belle-2 GPT-2

```bash
cd ai-models
python gpt2_service.py
```

Default port:

```txt
http://127.0.0.1:8102
```

### Terminal 3: Belle-3 Qwen RAG

```bash
cd ai-models
python qwen_service.py
```

Default port:

```txt
http://127.0.0.1:8103
```

### Terminal 4: Backend

```bash
cd backend
node server.js
```

Default port:

```txt
http://127.0.0.1:5000
```

### Terminal 5: Frontend

```bash
cd frontend
npm run dev
```

Default frontend URL:

```txt
http://localhost:5173
```

---

## API Test Examples

### Test Belle-1 RNN

```http
POST http://127.0.0.1:8101/predict-intent
```

Body:

```json
{
  "text": "Can you look at this picture?"
}
```

### Test Belle-2 GPT-2

```http
POST http://127.0.0.1:8102/predict
```

Body:

```json
{
  "text": "What is your name?"
}
```

### Test Belle-3 Qwen

```http
POST http://127.0.0.1:8103/predict
```

Body:

```json
{
  "text": "Tell me about Zenless Zone Zero"
}
```

### Test Main Backend API

```http
POST http://127.0.0.1:5000/api/chat
```

Body:

```json
{
  "userMessage": "Tell me about Zenless Zone Zero",
  "model": "belle-3"
}
```

Available model values:

```txt
belle-1
belle-2
belle-3
```

---

## Knowledge Base

Knowledge batches are stored in:

```txt
knowledge_batches/
```

Import knowledge into the database:

```bash
cd backend
node import_knowledge.js
```

Remove imported batches:

```bash
node remove_batch_from_knowledge.js
```

---

## Current Limitations

- Belle-1 RNN is an intent classifier, not a full chatbot.
- Belle-2 GPT-2 may produce unstable or off-context responses.
- Belle-3 Qwen RAG is the main assistant, but it still needs better data and RAG optimization.
- Auto Router is not fully implemented yet.
- Image and voice modes are not integrated yet.
- Model files must be downloaded separately.

---

## Roadmap

- Add Auto Router
- Improve RNN confidence threshold
- Improve RAG with vector database
- Expand the Belle dataset
- Add short-term and long-term memory
- Add image analysis mode
- Add voice input/output
- Upgrade Belle-3 to a stronger model
- Add Technical / Friendly / Novel response modes

---

<a id="tieng-viet"></a>

# Tiếng Việt

Belle ZZZ là một hệ thống chatbot AI đa mô hình, được xây dựng dưới dạng đồ án học tập và lấy cảm hứng từ nhân vật Belle trong *Zenless Zone Zero*.

Dự án kết hợp nhiều mô hình AI vào một hệ thống trợ lý tương tác, bao gồm giao diện React, backend Node.js, cơ sở dữ liệu MongoDB, cơ chế truy xuất tri thức RAG và ba AI service chạy cục bộ.

> Đây là một dự án fan-made phục vụ mục đích học tập, lấy cảm hứng từ Belle trong *Zenless Zone Zero*.  
> Dự án không có liên kết, không được tài trợ, không được xác nhận hoặc đại diện bởi HoYoverse, COGNOSPHERE, miHoYo hay *Zenless Zone Zero*.  
> Tất cả tên gọi, thương hiệu, nhân vật và tài sản liên quan thuộc về chủ sở hữu tương ứng.  
> Dự án này phi thương mại và chỉ được tạo ra cho mục đích học tập, nghiên cứu.

---

## Chức năng chính

- Dashboard chatbot đa mô hình
- Chuyển đổi mô hình thủ công
- Belle-1: mô hình RNN phân loại intent
- Belle-2: mô hình GPT-2 fine-tuned cho hội thoại
- Belle-3: mô hình Qwen 1.5B + LoRA + RAG
- Giao diện frontend bằng React
- Backend bằng Node.js
- Lưu lịch sử hội thoại bằng MongoDB
- Hiển thị RAG Retrieval Log
- Hiển thị Intent Analysis
- Hiển thị Recent Queries
- Kiến trúc AI chạy cục bộ

---

## Tổng quan mô hình

| Mô hình | Vai trò | Mô tả |
|---|---|---|
| Belle-1 RNN | Phân loại intent | Phát hiện ý định người dùng như đồng ý, từ chối, dừng thao tác hoặc yêu cầu liên quan đến hình ảnh. |
| Belle-2 GPT-2 | Mô hình hội thoại cũ | Mô hình GPT-2 đã được fine-tune để trả lời các câu hội thoại đơn giản. |
| Belle-3 Qwen RAG | Assistant chính | Qwen 1.5B kết hợp Belle LoRA và Retrieval-Augmented Generation để trả lời câu hỏi có tri thức. |

---

## Công nghệ sử dụng

### Frontend

- React
- Vite
- Axios
- CSS dashboard UI

### Backend

- Node.js
- Express
- MongoDB
- RAG service
- Chọn mô hình thủ công

### AI Services

- FastAPI
- TensorFlow / Keras
- PyTorch
- Transformers
- PEFT LoRA
- GPT-2
- Qwen2 1.5B

---

## Cấu trúc dự án

```txt
Belle_ZZZ/
├── ai-models/
│   ├── rnn_service.py
│   ├── gpt2_service.py
│   ├── qwen_service.py
│   ├── rnn-intent/
│   ├── transformer-chat/
│   └── belle_adapter_qwen/
│
├── backend/
│   ├── server.js
│   ├── ragService.js
│   ├── import_knowledge.js
│   └── remove_batch_from_knowledge.js
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   └── package.json
│
├── knowledge_batches/
├── .env.example
├── .gitignore
└── README.md
```

---

## File model cần có

Các file model lớn không được đưa trực tiếp lên GitHub.

Người dùng cần tự tải hoặc đặt các model vào đúng vị trí sau:

```txt
ai-models/transformer-chat/
ai-models/belle_adapter_qwen/
ai-models/rnn-intent/rnn_intent_model.h5
ai-models/rnn-intent/tokenizer.pickle
ai-models/rnn-intent/label_encoder.pickle
```

Link tải model:

```txt
THÊM_LINK_GOOGLE_DRIVE_Ở_ĐÂY
```

Sau khi tải, giải nén và đặt các thư mục/file vào đúng vị trí trong `ai-models/`.

---

## Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/MariaOpov/Belle_ZZZ.git
cd Belle_ZZZ
```

### 2. Cài backend

```bash
cd backend
npm install
```

### 3. Cài frontend

```bash
cd ../frontend
npm install
```

### 4. Cài thư viện Python

Kích hoạt môi trường Python trước, sau đó chạy:

```bash
cd ../ai-models
pip install fastapi uvicorn torch transformers peft tensorflow numpy scikit-learn accelerate sentencepiece
```

---

## Chạy hệ thống

Cần chạy từng thành phần ở các terminal riêng.

### Terminal 1: Belle-1 RNN

```bash
cd ai-models
python rnn_service.py
```

Port mặc định:

```txt
http://127.0.0.1:8101
```

### Terminal 2: Belle-2 GPT-2

```bash
cd ai-models
python gpt2_service.py
```

Port mặc định:

```txt
http://127.0.0.1:8102
```

### Terminal 3: Belle-3 Qwen RAG

```bash
cd ai-models
python qwen_service.py
```

Port mặc định:

```txt
http://127.0.0.1:8103
```

### Terminal 4: Backend

```bash
cd backend
node server.js
```

Port mặc định:

```txt
http://127.0.0.1:5000
```

### Terminal 5: Frontend

```bash
cd frontend
npm run dev
```

URL frontend mặc định:

```txt
http://localhost:5173
```

---

## Test API

### Test Belle-1 RNN

```http
POST http://127.0.0.1:8101/predict-intent
```

Body:

```json
{
  "text": "Can you look at this picture?"
}
```

### Test Belle-2 GPT-2

```http
POST http://127.0.0.1:8102/predict
```

Body:

```json
{
  "text": "What is your name?"
}
```

### Test Belle-3 Qwen

```http
POST http://127.0.0.1:8103/predict
```

Body:

```json
{
  "text": "Tell me about Zenless Zone Zero"
}
```

### Test backend chính

```http
POST http://127.0.0.1:5000/api/chat
```

Body:

```json
{
  "userMessage": "Tell me about Zenless Zone Zero",
  "model": "belle-3"
}
```

Các giá trị model hiện có:

```txt
belle-1
belle-2
belle-3
```

---

## Knowledge Base

Các batch knowledge được lưu trong:

```txt
knowledge_batches/
```

Import knowledge vào database:

```bash
cd backend
node import_knowledge.js
```

Xóa batch knowledge:

```bash
node remove_batch_from_knowledge.js
```

---

## Hạn chế hiện tại

- Belle-1 RNN chỉ là mô hình phân loại intent, không phải chatbot đầy đủ.
- Belle-2 GPT-2 có thể sinh phản hồi chưa ổn định hoặc lệch ngữ cảnh.
- Belle-3 Qwen RAG là mô hình chính, nhưng vẫn cần tối ưu thêm dữ liệu và RAG.
- Chưa có Auto Router hoàn chỉnh.
- Chưa tích hợp xử lý hình ảnh và giọng nói.
- Model files cần được tải riêng, không đi kèm repository.

---

## Hướng phát triển

- Thêm Auto Router để tự chọn model phù hợp.
- Cải thiện confidence threshold cho RNN.
- Tối ưu RAG bằng vector database.
- Mở rộng dataset riêng cho Belle.
- Thêm memory ngắn hạn và dài hạn.
- Thêm image analysis mode.
- Thêm voice input/output.
- Nâng cấp Belle-3 lên model mạnh hơn.
- Thêm Technical / Friendly / Novel mode cho phong cách trả lời.

---

## Ghi chú pháp lý / Legal Notice

Dự án này là đồ án học tập phi thương mại, lấy cảm hứng từ Belle trong *Zenless Zone Zero*. Dự án không phải sản phẩm chính thức, không có liên kết với HoYoverse, COGNOSPHERE, miHoYo hoặc *Zenless Zone Zero*.

Tất cả tên gọi, thương hiệu, nhân vật và tài sản liên quan thuộc về chủ sở hữu tương ứng.

This is a non-commercial academic project inspired by Belle from *Zenless Zone Zero*. This project is not official and is not affiliated with HoYoverse, COGNOSPHERE, miHoYo, or *Zenless Zone Zero*.

All related names, trademarks, characters, and assets belong to their respective owners.
