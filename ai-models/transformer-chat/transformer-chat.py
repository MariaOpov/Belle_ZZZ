import time
from transformers import AutoModelForCausalLM, AutoTokenizer

model_path = "./ai-models/transformer-chat" 

print(f"Đang đánh thức Belle...")
start_time = time.time()

try:
    # 1. Nạp từ điển
    print("Đang nạp từ điển chuẩn...")
    tokenizer = AutoTokenizer.from_pretrained("gpt2")
    tokenizer.pad_token = tokenizer.eos_token 

    # 2. Nạp mô hình
    print("Đang nạp trọng số nơ-ron...")
    model = AutoModelForCausalLM.from_pretrained(model_path) 
    
    print(f"Đánh thức thành công. Thời gian nạp: {time.time() - start_time:.2f} giây.")

    # 3. Thử hỏi đáp
    prompt = "Who are you?"
    print(f"\nBạn: {prompt}")

    # BẮT BUỘC: Thêm tokenizer.eos_token để báo cho Belle biết đã đến lượt nàng nói
    inputs = tokenizer(prompt + tokenizer.eos_token, return_tensors='pt')

    # Thêm các tham số để Belle trả lời sáng tạo và tự nhiên hơn
    outputs = model.generate(
        **inputs, 
        max_new_tokens=50,
        pad_token_id=tokenizer.eos_token_id,
        do_sample=True,      
        temperature=0.7,     
        top_k=50,            
        top_p=0.9
    )

    input_length = inputs['input_ids'].shape[1]
    generated_tokens = outputs[0][input_length:]
    reply = tokenizer.decode(generated_tokens, skip_special_tokens=True)

    print(f"Belle: {reply.strip()}")
except Exception as e:
    print(f"Có lỗi xảy ra: {e}")