import os

import supabase

from flask import Flask, jsonify, request
from flask_cors import CORS

from ..UploadHandler.supabase_auth import SupabaseMiddleware
from ..UploadHandler.uploader import FileUploader

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.getenv("PUBLIC_SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("PUBLIC_SUPABASE_ANON_KEY")
supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_API_KEY)

app.wsgi_app = SupabaseMiddleware(app.wsgi_app, supabase_client=supabase_client)

@app.route('/api/rag/indexing', methods=['POST'])
def upload_file():
    file_uploader = FileUploader(supabase_client, "documents")
    print(supabase_client.auth.get_user().user.id)
    file_path = f'''{supabase_client.auth.get_user().user.id}/{request.form.get('name')}.pdf'''
    file_uploader.upload_file(request.files['file'].read(), file_path)
    return jsonify("supabase_auth.user_info"), 200


if __name__ == '__main__':
    app.run()