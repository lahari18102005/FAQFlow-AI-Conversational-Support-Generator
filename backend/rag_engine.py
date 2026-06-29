import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import os
import requests

class FAQSearchEngine:
    def __init__(self, data_path=None, model_name='all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
        self.faq_data = []
        self.index = None
        if data_path and os.path.exists(data_path):
            self.load_and_build(data_path)

    def load_and_build(self, data_path):
        with open(data_path, 'r', encoding='utf-8') as f:
            self.faq_data = json.load(f)
        
        questions = [item['question'] for item in self.faq_data]
        embeddings = self.model.encode(questions, convert_to_numpy=True)
        
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings.astype('float32'))
        print(f"Index built with {len(questions)} entries.")

    def search(self, query, top_k=3):
        if not self.index:
            return []
        
        query_embedding = self.model.encode([query], convert_to_numpy=True)
        distances, indices = self.index.search(query_embedding.astype('float32'), top_k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx < len(self.faq_data):
                entry = self.faq_data[idx].copy()
                entry['score'] = float(distances[0][i])
                results.append(entry)
        
        return results

class RAGPipeline:
    def __init__(self, search_engine: FAQSearchEngine):
        self.search_engine = search_engine
        self.api_key = os.getenv("GROQ_API_KEY")

    def generate_session_title(self, query: str):
        if not self.api_key or self.api_key == "your_api_key":
            return query[:20] + "..."

        prompt = f"Generate a highly concise 3-4 word title for a support chat session that starts with this user query: '{query}'. Do not use quotes or prefixes, just the title."
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=5)
            resp.raise_for_status()
            text = resp.json()['choices'][0]['message']['content'].strip()
            return text
        except Exception:
            return "Support Session"

    def generate_answer_stream(self, query: str, history: list = []):
        # 1. Retrieve Context & Check Hallucination Threshold
        context_entries = self.search_engine.search(query, top_k=3)
        
        if not context_entries or context_entries[0]['score'] > 1.5:
            context_str = ""
        else:
            context_str = "\n\n".join([f"Q: {res['question']}\nA: {res['answer']}" for res in context_entries])

        # 2. Format History
        history_str = "\n".join([f"{'User' if msg.role == 'user' else 'AI'}: {msg.content}" for msg in history[-5:]])

        # 3. Prompt Engineering with Dynamic Persona
        system_prompt = f"""
        You are FAQFlow AI, an advanced, empathetic enterprise support assistant.
        
        Conversation History:
        {history_str}
        
        Official Context from FAQ database:
        {context_str}
        
        User Query: {query}
        
        INSTRUCTIONS:
        1. Analyze the user's emotional state from the history and query. Dynamically adapt your tone.
        2. Provide a helpful, direct answer to the user's question. Use the 'Official Context' if it is relevant. If it is not relevant, answer using your general knowledge.
        3. NEVER mention the "FAQ database" or say "I couldn't find information". Just answer the question directly and naturally.
        4. Do NOT output JSON. Output your response as natural PLAIN TEXT ONLY. Do NOT use markdown formatting (no **, no *, no #).
        """

        if not self.api_key or self.api_key == "your_api_key":
            if not context_entries:
                yield "I'm a local mock bot. I don't know the answer to that."
            else:
                yield f"Based on our FAQ: {context_entries[0]['answer']}"
            return

        # 4. Stream LLM Call
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            "stream": True
        }
        
        try:
            resp = requests.post(url, headers=headers, json=payload, stream=True, timeout=15)
            resp.raise_for_status()
            
            # OpenAI-compatible SSE parsing for Grok stream
            for line in resp.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data: '):
                        data_str = decoded_line[6:]
                        if data_str.strip() == '[DONE]':
                            break
                        try:
                            data = json.loads(data_str)
                            if 'choices' in data and len(data['choices']) > 0:
                                delta = data['choices'][0].get('delta', {})
                                text_chunk = delta.get('content', '')
                                if text_chunk:
                                    # Force plain text by stripping markdown stars and hashes
                                    clean_chunk = text_chunk.replace('**', '').replace('*', '').replace('###', '').replace('##', '').replace('#', '')
                                    yield clean_chunk

                        except json.JSONDecodeError:
                            continue
        except requests.exceptions.HTTPError as e:
            print(f"RAG Stream HTTP Error: {e}")
            if e.response.status_code == 429:
                yield "I am currently receiving too many requests (Free Tier Rate Limit Reached). Please wait 60 seconds and try again!"
            else:
                yield "I am currently experiencing technical difficulties connecting to my AI core."
        except Exception as e:
            print(f"RAG Stream Error: {e}")
            yield "I am currently experiencing technical difficulties connecting to my AI core."
