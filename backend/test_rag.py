from rag_engine import FAQSearchEngine, RAGPipeline
import os

def test():
    DATA_PATH = "faq_data.json"
    if not os.path.exists(DATA_PATH):
        print("FAQ data not found!")
        return

    search_engine = FAQSearchEngine(DATA_PATH)
    results = search_engine.search("How do I reset my password?")
    print(f"Search Results: {len(results)}")
    for r in results:
        print(f"Q: {r['question']} | Score: {r['score']}")

    pipeline = RAGPipeline(search_engine)
    answer = pipeline.generate_answer("How do I reset my password?")
    print(f"AI Answer: {answer['answer']}")
    print(f"Follow-ups: {answer['follow_up_questions']}")

if __name__ == "__main__":
    test()
