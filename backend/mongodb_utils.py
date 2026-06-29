import os
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = MongoClient(MONGODB_URI)
db = client["faqflow_ai"]

# Collections
users_col = db["users"]
sessions_col = db["sessions"]
messages_col = db["messages"]

class MongoUtils:
    @staticmethod
    def get_user_by_username(username):
        return users_col.find_one({"username": username})

    @staticmethod
    def create_user(username, hashed_password, full_name):
        user_data = {
            "username": username,
            "hashed_password": hashed_password,
            "full_name": full_name,
            "created_at": datetime.utcnow()
        }
        result = users_col.insert_one(user_data)
        return str(result.inserted_id)

    @staticmethod
    def create_session(user_id, title):
        session_data = {
            "user_id": user_id,
            "title": title,
            "created_at": datetime.utcnow()
        }
        result = sessions_col.insert_one(session_data)
        return {
            "id": str(result.inserted_id),
            "title": title,
            "created_at": session_data["created_at"].isoformat()
        }

    @staticmethod
    def get_sessions(user_id):
        sessions = sessions_col.find({"user_id": user_id}).sort("created_at", -1)
        return [{"id": str(s["_id"]), "title": s["title"], "created_at": s["created_at"].isoformat()} for s in sessions]

    @staticmethod
    def get_session(session_id, user_id):
        return sessions_col.find_one({"_id": ObjectId(session_id), "user_id": user_id})

    @staticmethod
    def delete_session(session_id, user_id):
        # Delete session
        result = sessions_col.delete_one({"_id": ObjectId(session_id), "user_id": user_id})
        if result.deleted_count > 0:
            # Also delete associated messages
            messages_col.delete_many({"session_id": session_id})
            return True
        return False

    @staticmethod
    def update_session_title(session_id, new_title):
        sessions_col.update_one({"_id": ObjectId(session_id)}, {"$set": {"title": new_title}})

    @staticmethod
    def add_message(session_id, role, content):
        message_data = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow()
        }
        messages_col.insert_one(message_data)
        return message_data

    @staticmethod
    def get_history(session_id):
        messages = messages_col.find({"session_id": session_id}).sort("timestamp", 1)
        return [{"role": m["role"], "content": m["content"], "timestamp": m["timestamp"].isoformat()} for m in messages]

mongo_utils = MongoUtils()
