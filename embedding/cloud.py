import os
import weaviate
from weaviate.classes.init import Auth
from langchain_weaviate import WeaviateVectorStore
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

# --- Cloud Credentials (Set these in your .env) ---

WEAVIATE_URL="akcx5rxoqpshltecb5flkw.c0.asia-southeast1.gcp.weaviate.cloud"
WEAVIATE_API_KEY="NDVENlRaQW9BZkVqNEVPR19QS1o3Tkp1WldMWStmTzVhazlKaTUyMlhpMUZZK0QyYmRXcnlQVFBtTFpZPV92MjAw"

OPENAI_API_KEY="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"

# WCD_URL = os.environ["WEAVIATE_URL"]         # e.g., "https://my-cluster.weaviate.network"
# WCD_API_KEY = os.environ["WEAVIATE_API_KEY"] # Your Weaviate Cluster API Key
# OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

BASE_DIR = os.path.expanduser("~/Desktop/data/cbse")
INDEX_NAME = "NcertBooks"

# 1. Connect to WEAVIATE CLOUD
client = weaviate.connect_to_weaviate_cloud(
    cluster_url=WEAVIATE_URL,                                    # The cloud URL
    auth_credentials=Auth.api_key(WEAVIATE_API_KEY),            # Cloud Auth
    headers={"X-OpenAI-Api-Key": OPENAI_API_KEY}            # For Vectorization
)

# 2. Setup LangChain Components
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)

def ingest_data():
    if not client.is_ready():
        print("❌ Weaviate Cloud is not ready.")
        return

    print(f"📂 Scanning directory: {BASE_DIR}")
    
    # Iterate through class folders
    for class_folder in ["class11", "class12"]:
        class_path = os.path.join(BASE_DIR, class_folder)
        if not os.path.exists(class_path): continue
        
        for subject_folder in os.listdir(class_path):
            subject_path = os.path.join(class_path, subject_folder)
            if not os.path.isdir(subject_path): continue
            
            for file in os.listdir(subject_path):
                if file.endswith(".pdf"):
                    file_path = os.path.join(subject_path, file)
                    chapter_no = file.split('_')[0]
                    
                    print(f"🚀 Cloud Ingest: {class_folder} > {subject_folder} > {file}")

                    try:
                        loader = PyPDFLoader(file_path)
                        docs = loader.load()
                        chunks = text_splitter.split_documents(docs)
                        
                        # Apply metadata for fast searching
                        for chunk in chunks:
                            chunk.metadata = {
                                "board": "cbse",
                                "class_name": class_folder,
                                "subject": subject_folder,
                                "chapter_no": chapter_no,
                                "source": file
                            }

                        # Upload to Cloud
                        WeaviateVectorStore.from_documents(
                            chunks, 
                            embeddings, 
                            client=client, 
                            index_name=INDEX_NAME
                        )
                    except Exception as e:
                        print(f"❌ Error with {file}: {e}")

try:
    ingest_data()
finally:
    client.close()
    print("✅ Finished.")