import os
import re
import gc
from pathlib import Path
from typing import List, Dict
import fitz  # PyMuPDF
import tiktoken
from openai import OpenAI
import weaviate
from weaviate.classes.config import Configure, Property, DataType
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
DATA_DIR = Path("../data")
WEAVIATE_URL = os.getenv("WEAVIATE_URL", "http://localhost:8080")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
COLLECTION_NAME = "NCERTChunks"
EMBEDDING_MODEL = "text-embedding-3-small"
CHUNK_SIZE_MIN = 300
CHUNK_SIZE_MAX = 600
CHUNK_OVERLAP = 75  # Middle of 50-100 range
EMBEDDING_BATCH_SIZE = 20  # Reduced for memory efficiency
MAX_TEXT_LENGTH = 100000  # Limit text length to prevent memory issues


def setup_weaviate_schema():
    """Create Weaviate collection with proper schema"""
    print("Connecting to Weaviate...")
    client = weaviate.connect_to_local(host="localhost", port=8080)

    try:
        # Delete collection if exists
        if client.collections.exists(COLLECTION_NAME):
            client.collections.delete(COLLECTION_NAME)
            print(f"Deleted existing collection: {COLLECTION_NAME}")

        # Create collection
        client.collections.create(
            name=COLLECTION_NAME,
            vectorizer_config=Configure.Vectorizer.none(),  # We'll provide our own vectors
            properties=[
                Property(name="text", data_type=DataType.TEXT),
                Property(name="board", data_type=DataType.TEXT),
                Property(name="class_level", data_type=DataType.TEXT),
                Property(name="subject", data_type=DataType.TEXT),
                Property(name="chapter", data_type=DataType.TEXT),
                Property(name="chunk_index", data_type=DataType.INT),
            ],
        )
        print(f"Created collection: {COLLECTION_NAME}")

    finally:
        client.close()


def extract_metadata_from_path(pdf_path: Path) -> Dict[str, str]:
    """Extract metadata from folder structure"""
    parts = pdf_path.parts

    # Find indices
    data_idx = parts.index("data")

    metadata = {
        "board": parts[data_idx + 1].upper(),  # cbse -> CBSE
        "class": parts[data_idx + 2],  # class11 -> 11
        "subject": parts[data_idx + 3].capitalize(),  # chemistry -> Chemistry
        "chapter": pdf_path.stem,  # 01_chapter -> 01_chapter
    }

    # Clean class field (class11 -> 11, class12 -> 12)
    metadata["class"] = metadata["class"].replace("class", "")

    return metadata


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract text from PDF using PyMuPDF with memory management"""
    doc = None
    try:
        doc = fitz.open(pdf_path)
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        text = "".join(text_parts)
        
        # Limit text length to prevent memory issues
        if len(text) > MAX_TEXT_LENGTH:
            print(f"  Warning: Text truncated from {len(text)} to {MAX_TEXT_LENGTH} chars")
            text = text[:MAX_TEXT_LENGTH]
        
        return text.strip()
    except Exception as e:
        print(f"  Error extracting text from {pdf_path}: {e}")
        return ""
    finally:
        if doc:
            doc.close()
        del doc
        gc.collect()


def chunk_text(text: str, metadata: Dict[str, str]) -> List[Dict[str, any]]:
    """Chunk text into 300-600 tokens with 50-100 token overlap - memory efficient"""
    if not text or len(text.strip()) < 100:
        return []
    
    try:
        encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
        tokens = encoding.encode(text)
        
        chunks = []
        start = 0
        chunk_index = 0
        
        while start < len(tokens):
            # Determine chunk size (aim for middle of range)
            chunk_size = min(CHUNK_SIZE_MAX, len(tokens) - start)
            end = start + chunk_size
            
            # Get chunk tokens and decode
            chunk_tokens = tokens[start:end]
            try:
                chunk_text = encoding.decode(chunk_tokens)
            except Exception as decode_error:
                print(f"  Warning: Failed to decode chunk at position {start}: {decode_error}")
                start += chunk_size - CHUNK_OVERLAP
                continue
            
            # Only add if chunk has meaningful content
            if len(chunk_text.strip()) > 50:
                chunks.append(
                    {
                        "text": chunk_text,
                        "board": metadata["board"],
                        "class_level": metadata["class"],
                        "subject": metadata["subject"],
                        "chapter": metadata["chapter"],
                        "chunk_index": chunk_index,
                    }
                )
                chunk_index += 1
            
            # Move forward with overlap
            start += chunk_size - CHUNK_OVERLAP
        
        # Cleanup
        del tokens
        return chunks
    
    except Exception as e:
        print(f"  Error chunking text: {e}")
        return []


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using OpenAI text-embedding-3-small"""
    client = OpenAI(api_key=OPENAI_API_KEY)

    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)

    return [item.embedding for item in response.data]


def process_pdfs():
    """Main pipeline to process all PDFs with memory management"""
    print("Starting PDF processing pipeline...")

    # Connect to Weaviate
    client = weaviate.connect_to_local(host="localhost", port=8080)
    collection = client.collections.get(COLLECTION_NAME)

    try:
        # Find all PDFs
        pdf_files = list(DATA_DIR.rglob("*.pdf"))
        print(f"Found {len(pdf_files)} PDF files")
        
        # Group PDFs by subject for organized processing
        from collections import defaultdict
        subject_groups = defaultdict(list)
        for pdf_path in pdf_files:
            try:
                metadata = extract_metadata_from_path(pdf_path)
                subject_key = f"{metadata['class']}-{metadata['subject']}"
                subject_groups[subject_key].append((pdf_path, metadata))
            except Exception:
                continue
        
        print(f"Organized into {len(subject_groups)} subject groups\n")

        total_chunks = 0
        processed_files = 0
        subject_stats = {}

        for subject_key in sorted(subject_groups.keys()):
            subject_pdfs = subject_groups[subject_key]
            class_num, subject_name = subject_key.split('-', 1)
            
            print(f"\n{'='*60}")
            print(f"📚 Class {class_num} - {subject_name} ({len(subject_pdfs)} files)")
            print(f"{'='*60}")
            
            subject_chunks = 0
            subject_processed = 0

            for pdf_idx, (pdf_path, metadata) in enumerate(subject_pdfs, 1):
                print(f"  [{pdf_idx}/{len(subject_pdfs)}] {pdf_path.name}")

                try:
                    # Extract text
                    text = extract_text_from_pdf(pdf_path)
                    if not text:
                        print(f"    ⊘ Skipping - no text extracted")
                        continue

                    # Chunk text
                    chunks = chunk_text(text, metadata)
                    print(f"    ✓ Created {len(chunks)} chunks")
                    
                    # Free text memory immediately
                    del text
                    gc.collect()

                    if not chunks:
                        print(f"    ⊘ Skipping - no valid chunks")
                        continue

                    # Generate embeddings in smaller batches to reduce memory
                    batch_count = 0
                    for i in range(0, len(chunks), EMBEDDING_BATCH_SIZE):
                        batch = chunks[i : i + EMBEDDING_BATCH_SIZE]
                        texts = [chunk["text"] for chunk in batch]

                        # Generate embeddings
                        embeddings = generate_embeddings(texts)

                        # Store in Weaviate immediately
                        for chunk, embedding in zip(batch, embeddings):
                            collection.data.insert(
                                properties={
                                    "text": chunk["text"],
                                    "board": chunk["board"],
                                    "class_level": chunk["class_level"],
                                    "subject": chunk["subject"],
                                    "chapter": chunk["chapter"],
                                    "chunk_index": chunk["chunk_index"],
                                },
                                vector=embedding,
                            )

                        batch_count += 1
                        
                        # Free memory after each batch
                        del batch, texts, embeddings

                    subject_chunks += len(chunks)
                    total_chunks += len(chunks)
                    print(f"    ✓ Stored {len(chunks)} chunks")
                    
                    processed_files += 1
                    subject_processed += 1
                    
                    # Free chunks memory
                    del chunks
                    
                    # Force garbage collection every 10 files
                    if processed_files % 10 == 0:
                        gc.collect()
                
                except Exception as e:
                    print(f"    ✗ Error: {e}")
                    continue
            
            # Subject summary
            print(f"\n  📊 {subject_name} Summary:")
            print(f"     Files processed: {subject_processed}/{len(subject_pdfs)}")
            print(f"     Chunks created: {subject_chunks}")
            
            subject_stats[subject_key] = {
                "processed": subject_processed,
                "total": len(subject_pdfs),
                "chunks": subject_chunks
            }

        # Final summary
        print(f"\n\n{'='*60}")
        print(f"✅ PIPELINE COMPLETE")
        print(f"{'='*60}")
        print(f"Total files processed: {processed_files}/{len(pdf_files)}")
        print(f"Total chunks created: {total_chunks}")
        print(f"\n📚 Subject-wise Summary:")
        print(f"{'='*60}")
        
        for subject_key in sorted(subject_stats.keys()):
            stats = subject_stats[subject_key]
            class_num, subject_name = subject_key.split('-', 1)
            success_rate = (stats['processed'] / stats['total'] * 100) if stats['total'] > 0 else 0
            print(f"  Class {class_num} {subject_name:12} : {stats['processed']:3}/{stats['total']:3} files ({success_rate:.0f}%) → {stats['chunks']:5} chunks")
        
        print(f"{'='*60}\n")

    finally:
        client.close()
        gc.collect()


def main():
    """Main entry point"""
    print("=" * 60)
    print("NCERT PDF to Weaviate Embedding Pipeline")
    print("=" * 60)

    # Validate environment
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not found in environment variables")

    if not DATA_DIR.exists():
        raise ValueError(f"Data directory not found: {DATA_DIR}")

    # Step 1: Setup Weaviate schema
    setup_weaviate_schema()

    # Step 2: Process all PDFs
    process_pdfs()


if __name__ == "__main__":
    main()
