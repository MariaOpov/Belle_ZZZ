import torch
import re
import ast
import operator as op
import threading

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os


# =========================
# 1. ĐƯỜNG DẪN MODEL
# =========================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model_id = "Qwen/Qwen2-1.5B-Instruct"
adapter_path = os.path.join(BASE_DIR, "belle_adapter_qwen")

gen_lock = threading.Lock()

# =========================
# 2. CALCULATOR LAYER
# =========================

allowed_ops = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.FloorDiv: op.floordiv,
    ast.Mod: op.mod,
    ast.Pow: op.pow,
    ast.USub: op.neg,
    ast.UAdd: op.pos,
}

number_words = {
    "zero": "0",
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
    "eleven": "11",
    "twelve": "12",
    "thirteen": "13",
    "fourteen": "14",
    "fifteen": "15",
    "sixteen": "16",
    "seventeen": "17",
    "eighteen": "18",
    "nineteen": "19",
    "twenty": "20",
}

def safe_calc(expr):
    def eval_node(node):
        if isinstance(node, ast.Expression):
            return eval_node(node.body)

        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError("Invalid number")

        if isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in allowed_ops:
                raise ValueError("Invalid operator")

            left = eval_node(node.left)
            right = eval_node(node.right)

            # Chặn lũy thừa quá lớn để tránh lag
            if op_type is ast.Pow and abs(right) > 10:
                raise ValueError("Power too large")

            return allowed_ops[op_type](left, right)

        if isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type not in allowed_ops:
                raise ValueError("Invalid operator")
            return allowed_ops[op_type](eval_node(node.operand))

        raise ValueError("Invalid expression")

    tree = ast.parse(expr, mode="eval")
    return eval_node(tree)


def normalize_math_text(text):
    text = text.lower()

    # Đổi chữ số tiếng Anh sang số
    for word, digit in number_words.items():
        text = re.sub(rf"\b{word}\b", digit, text)

    # Đổi phép toán bằng chữ sang ký hiệu
    replacements = {
        r"\bplus\b": "+",
        r"\badd\b": "+",
        r"\bminus\b": "-",
        r"\bsubtract\b": "-",
        r"\btimes\b": "*",
        r"\btime\b": "*",
        r"\bmultiplied by\b": "*",
        r"\bmultiply by\b": "*",
        r"\bdivide by\b": "/",
        r"\bdivided by\b": "/",
        r"\bdivide to\b": "/",
        r"\bdivided to\b": "/",
        r"\bdivide into\b": "/",
        r"\bdivided into\b": "/",
        r"\bover\b": "/",
    }

    for pattern, symbol in replacements.items():
        text = re.sub(pattern, symbol, text)

    # Không cần dấu bằng trong biểu thức
    text = text.replace("=", " ")

    return text


def extract_math_expression(text):
    text = normalize_math_text(text)

    # Tìm chuỗi toán học có số và toán tử
    pattern = r"(?<![\w.])(?:\d+(?:\.\d+)?|\(|\)|[+\-*/])(?:\s*(?:\d+(?:\.\d+)?|\(|\)|[+\-*/]))+"
    matches = re.findall(pattern, text)

    if not matches:
        return None

    for expr in matches:
        expr = expr.strip()

        # Phải có ít nhất 1 số và 1 toán tử
        if not re.search(r"\d", expr):
            continue

        if not re.search(r"[+\-*/]", expr):
            continue

        # Không cho ký tự lạ lọt vào
        if not re.fullmatch(r"[\d\s+\-*/().]+", expr):
            continue

        return expr

    return None


def try_calculator_reply(user_input):
    math_expr = extract_math_expression(user_input)

    if not math_expr:
        return None

    try:
        result = safe_calc(math_expr)

        if isinstance(result, float) and result.is_integer():
            result = int(result)

        return f"{math_expr} = {result}."

    except ZeroDivisionError:
        return "You cannot divide by zero."

    except Exception:
        return None

def clean_history(raw_history, limit=12):
    if not isinstance(raw_history, list):
        return []

    cleaned = []

    for msg in raw_history[-limit:]:
        if not isinstance(msg, dict):
            continue

        role = msg.get("role")
        content = msg.get("content")

        if role not in ["user", "assistant"]:
            continue

        if not isinstance(content, str) or not content.strip():
            continue

        cleaned.append({
            "role": role,
            "content": content.strip()[:1000]
        })

    return cleaned

def clean_context(raw_context, max_chars=3000):
    if not isinstance(raw_context, str):
        return ""

    raw_context = raw_context.strip()

    if not raw_context:
        return ""

    return raw_context[:max_chars]

# =========================
# 3. NẠP TOKENIZER + MODEL
# =========================

print("1. Đang nạp tokenizer Belle...")

tokenizer = AutoTokenizer.from_pretrained(adapter_path)

if tokenizer.pad_token_id is None:
    tokenizer.pad_token = tokenizer.eos_token

print("2. Đang nạp thể xác gốc Qwen2...")

dtype = torch.float16 if torch.cuda.is_available() else torch.float32

base_model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map="auto",
    torch_dtype=dtype
)

print("3. Đang cấy ghép nhân cách Belle LoRA...")

model = PeftModel.from_pretrained(base_model, adapter_path)
model.eval()


# =========================
# 4. FASTAPI
# =========================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health")
async def health():
    return {
        "model": "Belle-3 Qwen RAG",
        "status": "online"
    }

@app.post("/predict")
async def predict(request: Request):
    data = await request.json()

    user_input = data.get("text") or data.get("message") or ""
    history = clean_history(data.get("history", []), limit=12)
    context = clean_context(data.get("context", ""), max_chars=3000)

    if not user_input.strip():
        return {
            "reply": "Say something first, okay?",
            "intent": "fallback"
        }

    # ƯU TIÊN CALCULATOR TRƯỚC
    calc_reply = try_calculator_reply(user_input)
    if calc_reply is not None:
        return {
            "reply": calc_reply,
            "intent": "math"
        }

    # SYSTEM PROMPT CÓ RAG CONTEXT
    system_content = (
        "You are Belle, a savvy Proxy from Zenless Zone Zero. "
        "Answer briefly and accurately in English. "
        "If you are not sure, say you are not sure. "
        "Do not invent facts. "
        "Use the recent conversation history when it is relevant. "
    )

    if context:
        system_content += (
            "\n\nReliable retrieved context is provided below. "
            "For factual questions, prioritize this context over your own memory. "
            "If the context answers the user's question, use it. "
            "If the context does not contain the answer, say you are not sure.\n\n"
            f"{context}"
        )
    else:
        system_content += (
            "\n\nNo retrieved context is available. "
            "For specific factual questions about movies, politics, cars, history, current facts, "
            "or game details, do not guess. Say you are not sure."
        )

    messages = [
    {
        "role": "system",
        "content": (
            "You are Belle, a savvy Proxy from Zenless Zone Zero. "
            "Answer briefly and accurately in English. "
            "Do not invent facts. "
            "If retrieved context is provided, use ONLY that context for factual claims. "
            "Do not add names, dates, mechanics, platforms, multiplayer features, classes, or story details "
            "that are not present in the retrieved context."
        )
    }
]

    # Chỉ giữ history ngắn để tránh nhiễu RAG
    messages.extend(history[-4:])

    if context:
        final_user_content = (
            "Use the retrieved context below to answer the user's question.\n"
            "Only use facts that appear in the context. "
            "If the context is not enough, say you are not sure.\n\n"
            "Retrieved context:\n"
            f"{context}\n\n"
            "User question:\n"
            f"{user_input}"
        )
    else:
        final_user_content = (
            "No retrieved context is available. "
            "For specific factual questions, do not guess. "
            "Say you are not sure if you do not know.\n\n"
            f"User question:\n{user_input}"
        )

    messages.append({
        "role": "user",
        "content": final_user_content
    })

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = tokenizer(prompt, return_tensors="pt")

    device = next(model.parameters()).device
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with gen_lock:
        with torch.inference_mode():
            output = model.generate(
                **inputs,
                max_new_tokens=120,
                do_sample=False,
                repetition_penalty=1.1,
                eos_token_id=tokenizer.eos_token_id,
                pad_token_id=tokenizer.pad_token_id,
            )

    new_tokens = output[0][inputs["input_ids"].shape[-1]:]

    response_text = tokenizer.decode(
        new_tokens,
        skip_special_tokens=True
    ).strip()

    if not response_text:
        response_text = "Its hard, can you ask another question?"
        return {
            "reply": response_text,
            "intent": "fallback"
        }

    return {
        "reply": response_text,
        "intent": "chat"
    }


if __name__ == "__main__":
    print("Belle đã sẵn sàng")
    uvicorn.run(app, host="0.0.0.0", port=8103)