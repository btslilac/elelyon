-- Client Documents System Migration

CREATE TABLE IF NOT EXISTS client_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- e.g., 'ID_COPY', 'SIGNED_CONTRACT', 'OTHER'
    document_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    file_url TEXT NOT NULL,  -- Public URL
    uploaded_by TEXT, -- Email or Name of the uploader
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
