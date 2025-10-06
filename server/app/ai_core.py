import faiss
import numpy as np
import requests
import json


# --- Helper functions (Unchanged) ---
def get_ollama_embedding(text: str) -> np.ndarray:
    try:
        response = requests.post(
            "http://localhost:11434/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text},
            timeout=30,
        )
        response.raise_for_status()
        embedding = response.json().get("embedding")
        return np.array([embedding], dtype="float32")
    except requests.RequestException as e:
        print(f"Error getting Ollama embedding: {e}")
        return np.zeros((1, 768), dtype="float32")


def _call_ollama_generate(prompt, system_message, format=""):
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "phi3:3.8b",
                "system": system_message,
                "prompt": prompt,
                "format": format,
                "stream": False,
            },
            timeout=300,
        )
        response.raise_for_status()
        return response.json().get("response", "").strip()
    except requests.RequestException as e:
        print(f"Error calling Ollama generate: {e}")
        error_message = (
            "Error: Could not connect to the AI model. Ensure Ollama is running."
        )
        return f'{{"error": "{error_message}"}}' if format == "json" else error_message


# --- VectorDB (Unchanged) ---
class VectorDB:
    def __init__(self, embedding_dim=768):
        self.embedding_dim = embedding_dim
        self.index = faiss.IndexFlatL2(self.embedding_dim)
        self.metadata = []

    def add_metadata(self, text, source):
        self.index.reset()
        self.metadata.clear()
        embedding = get_ollama_embedding(text)
        self.index.add(embedding)
        self.metadata.append({"text": text, "source": source})

    def retrieve_context(self, query, k=1):
        if self.index.ntotal == 0:
            return "No metadata available."
        query_embedding = get_ollama_embedding(query)
        _, I = self.index.search(query_embedding, k)
        return "\n---\n".join([self.metadata[idx]["text"] for idx in I[0] if idx != -1])


# --- AI Functions for Conversation (classify_intent and generate_chitchat_response are unchanged) ---
def classify_intent(user_query: str) -> dict:
    system_message = """Your job is to classify the user's intent into one of three categories and respond with a JSON object.
1. 'chitchat': For greetings, pleasantries, or questions not related to the data.
2. 'metadata_query': If the user is asking about the dataset's structure, like column names, variables, or what kind of data is available.
3. 'data_query': If the user is asking a specific question that requires querying the data values, like finding a maximum, minimum, average, or filtering for specific conditions.

Example 1: User says "hi how are you" -> {"intent": "chitchat"}
Example 2: User says "what are the columns in this file?" -> {"intent": "metadata_query"}
Example 3: User says "show me the highest temperature" -> {"intent": "data_query"}"""
    response_str = _call_ollama_generate(user_query, system_message, format="json")
    try:
        return json.loads(response_str)
    except json.JSONDecodeError:
        return {"intent": "chitchat"}


def generate_chitchat_response(user_query: str) -> str:
    system_message = "You are a friendly, helpful AI assistant. Respond casually to the user's greeting or question."
    return _call_ollama_generate(user_query, system_message)


# --- MODIFIED: llm_nlp_to_sql now has a much more advanced prompt ---
def llm_nlp_to_sql(user_query: str, db_schema_and_sample: str) -> str:
    """Uses the AI to convert a data query into SQL, now with advanced capabilities."""
    system_message = f"""You are a world-class SQLite expert. Your job is to convert a user's question into a single, precise SQLite query.
- Use aggregate functions like MIN(), MAX(), AVG(), SUM(), and COUNT() when asked for ranges, averages, totals, or counts.
- Use GROUP BY to categorize results.
- Use ORDER BY to sort results.
- The table is always named `data`.
- Respond ONLY with the SQLite query, ending in a semicolon. Do not add any explanation.

--- DATABASE CONTEXT ---
{db_schema_and_sample}
--- END CONTEXT ---

--- EXAMPLES ---
User Question: "what is the range of the t2m column?"
SQL Query: SELECT MIN(t2m), MAX(t2m) FROM data;

User Question: "what is the average latitude?"
SQL Query: SELECT AVG(latitude) FROM data;

User Question: "count how many entries there are for each 'number' and show the top 5"
SQL Query: SELECT number, COUNT(*) FROM data GROUP BY number ORDER BY COUNT(*) DESC LIMIT 5;
--- END EXAMPLES ---
"""
    sql_query = _call_ollama_generate(user_query, system_message)
    if not sql_query.lower().startswith("select") or not sql_query.endswith(";"):
        return "SELECT 'Error: AI failed to generate a valid SQL query. Please rephrase your question.';"
    return sql_query
