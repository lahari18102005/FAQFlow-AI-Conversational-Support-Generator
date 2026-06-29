import os
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import shutil

from fastapi.security import OAuth2PasswordRequestForm
import auth
from mongodb_utils import mongo_utils
from rag_engine import FAQSearchEngine, RAGPipeline
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FAQFlow AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Search Engine
DATA_PATH = "faq_data.json"
search_engine = FAQSearchEngine(DATA_PATH if os.path.exists(DATA_PATH) else None)
rag_pipeline = RAGPipeline(search_engine)

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatRequest(BaseModel):
    session_id: str
    query: str

class ChatResponse(BaseModel):
    answer: str
    follow_up_questions: List[str]
    confidence: str
    session_id: str

# Endpoints
@app.post("/register")
def register(user: UserCreate):
    db_user = mongo_utils.get_user_by_username(user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pw = auth.get_password_hash(user.password)
    mongo_utils.create_user(user.username, hashed_pw, user.full_name)
    return {"message": "User created successfully"}

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = mongo_utils.get_user_by_username(form_data.username)
    if not user or not auth.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = auth.create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me")
def get_me(current_user: dict = Depends(auth.get_current_user)):
    return {"username": current_user["username"], "full_name": current_user["full_name"]}

@app.get("/sessions", response_model=List[dict])
def get_sessions(current_user: dict = Depends(auth.get_current_user)):
    return mongo_utils.get_sessions(current_user["id"])

@app.post("/sessions")
def create_session(title: str, current_user: dict = Depends(auth.get_current_user)):
    return mongo_utils.create_session(current_user["id"], title)

@app.delete("/sessions/{session_id}")
def delete_session(session_id: str, current_user: dict = Depends(auth.get_current_user)):
    success = mongo_utils.delete_session(session_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}

@app.get("/history/{session_id}")
def get_history(session_id: str, current_user: dict = Depends(auth.get_current_user)):
    session = mongo_utils.get_session(session_id, current_user["id"])
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return mongo_utils.get_history(session_id)

@app.post("/chat/stream")
def chat_stream(request: ChatRequest, current_user: dict = Depends(auth.get_current_user)):
    session = mongo_utils.get_session(request.session_id, current_user["id"])
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # 1. Save User Message
    mongo_utils.add_message(request.session_id, "user", request.query)
    
    # 2. Get history
    history_data = mongo_utils.get_history(request.session_id)
    
    # Auto-generate title if this is the first message (history length == 1)
    if len(history_data) == 1 and session.get("title") in ["New Chat", "New Session", ""]:
        new_title = rag_pipeline.generate_session_title(request.query)
        mongo_utils.update_session_title(request.session_id, new_title)

    class Msg:
        def __init__(self, role, content):
            self.role = role
            self.content = content
    
    history_objs = [Msg(m["role"], m["content"]) for m in history_data]
    
    # 3. Stream Answer
    def event_generator():
        full_answer = ""
        for chunk in rag_pipeline.generate_answer_stream(request.query, history_objs):
            full_answer += chunk
            yield chunk
        # 4. Save AI Message after stream completes
        mongo_utils.add_message(request.session_id, "assistant", full_answer)

    return StreamingResponse(event_generator(), media_type="text/plain")

@app.post("/admin/upload-faq")
async def upload_faq(file: UploadFile = File(...), current_user: dict = Depends(auth.get_current_user)):
    if current_user["username"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    with open(DATA_PATH, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    search_engine.load_and_build(DATA_PATH)
    return {"message": "FAQ dataset updated and index rebuilt"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
