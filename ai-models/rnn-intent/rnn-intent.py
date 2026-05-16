import time
import pickle
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences

# 1. Khai báo đường dẫn
base_path = "./ai-models/rnn-intent"
model_path = f"{base_path}/rnn_intent_model.h5"
tokenizer_path = f"{base_path}/tokenizer.pickle"
label_encoder_path = f"{base_path}/label_encoder.pickle"

MAX_SEQUENCE_LENGTH = 30 

print("Đang khởi động não bộ RNN của Belle...")
start_time = time.time()

try:
    # 2. Nạp Model và các file Pickle
    model = load_model(model_path)
    
    with open(tokenizer_path, 'rb') as handle:
        tokenizer = pickle.load(handle)
        
    with open(label_encoder_path, 'rb') as handle:
        label_encoder = pickle.load(handle)
        
    print(f"RNN đã sẵn sàng. Thời gian nạp: {time.time() - start_time:.2f} giây.")

    # 3. Thử nghiệm phân loại ý định
    test_sentences = [
        "Yes, I agree",                     # Kỳ vọng: yesNode
        "No, I don't want to",              # Kỳ vọng: noNode
        "Stop doing that right now",        # Kỳ vọng: stop
        "Can you look at this picture?",    # Kỳ vọng: process_image
        "Check this image for me",          # Kỳ vọng: process_image
        "Cancel the operation"              # Kỳ vọng: stop
    ]

    print("\nTest ý định")
    for text in test_sentences:
        # Tiền xử lý văn bản: Băm chữ -> Biến thành số -> Đệm cho đủ độ dài
        sequence = tokenizer.texts_to_sequences([text])
        print(f"\nCâu hỏi gốc: '{text}'")
        print(f"Mảng số hóa (Tokens): {sequence}")
        padded_sequence = pad_sequences(sequence, maxlen=MAX_SEQUENCE_LENGTH)
        
        # Dự đoán
        prediction = model.predict(padded_sequence, verbose=0)
        
        # Giải mã kết quả 
        predicted_class_index = np.argmax(prediction)
        confidence = np.max(prediction)
        predicted_label = label_encoder.inverse_transform([predicted_class_index])[0]
        
        print(f"Câu hỏi: '{text}'")
        print(f"Intent: {predicted_label} (Conf: {confidence*100:.2f}%)\n")

except Exception as e:
    print(f"Có lỗi xảy ra: {e}")