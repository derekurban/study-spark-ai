from supabase import Client


class FileUploader:
    def __init__(self, supabase_client: Client, bucket_name):
        self.bucket_name = bucket_name
        self.supabase_client = supabase_client

    def upload_file(self, fileToUpload, file_path):
        self.supabase_client.storage.from_(self.bucket_name).upload(file=fileToUpload, path=file_path)