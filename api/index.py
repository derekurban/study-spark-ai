from flask import Flask, request, Response
from urllib.parse import unquote_plus
import supabase
import json
import os
import importlib

app = Flask(__name__)

# Environment variables
DEV_MODE = os.getenv('NODE_ENV') != 'production'
SUPABASE_URL = os.getenv("PUBLIC_SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("PUBLIC_SUPABASE_ANON_KEY")

# Check if necessary environment variables are set
if SUPABASE_URL is None:
    raise Exception("Missing Supabase URL")
if SUPABASE_API_KEY is None:
    raise Exception("Missing Supabase Anon Key")

# Initialize Supabase client
supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_API_KEY)


def _extract_supabase_tokens(req):
    project_id = 'localhost' if DEV_MODE else SUPABASE_URL.split(
        '//')[1].split('.')[0]
    encoded_token = req.cookies.get(f'sb-{project_id}-auth-token')

    if encoded_token is None:
        raise PermissionError("Missing Authorization Token")

    decoded_token = unquote_plus(encoded_token)

    try:
        jwt_array = json.loads(decoded_token)
        if jwt_array and isinstance(jwt_array, list):
            return jwt_array[0], jwt_array[1]
    except json.JSONDecodeError:
        pass
    raise PermissionError("Invalid Authorization Token")


def _register_server_file(app, folder_path, folder, supabase_client):
    file_path = os.path.join(folder_path, "+server.py")
    route_path = folder_path.replace("api\\routes\\", "", 1).replace("\\", "/")
    spec = importlib.util.spec_from_file_location(folder, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if hasattr(module, 'POST'):
        app.add_url_rule(
            f"/api/{route_path}",
            endpoint=f"{route_path}_post",  # Unique endpoint name
            view_func=lambda: module.POST(request, supabase_client),
            methods=['POST']
        )
    if hasattr(module, 'GET'):
        app.add_url_rule(
            f"/api/{route_path}",
            endpoint=f"{route_path}_get",  # Unique endpoint name
            view_func=lambda: module.GET(request, supabase_client),
            methods=['GET']
        )


def _register_folder(app, root_path, root_folder, supabase_client):
    files = os.listdir(root_path)
    if "+server.py" in files:
        _register_server_file(app=app, folder_path=root_path,
                              folder=root_folder, supabase_client=supabase_client)

    for file in files:
        folder_path = os.path.join(root_path, file)

        if os.path.isdir(folder_path):
            _register_folder(app=app, root_path=folder_path,
                             root_folder=file, supabase_client=supabase_client)


@app.before_request
def before_request():
    try:
        access_token, refresh_token = _extract_supabase_tokens(request)
        supabase_client.auth.set_session(access_token, refresh_token)
        session = supabase_client.auth.get_session()
        if session is None:
            return Response('Invalid Authentication', status=401)
    except Exception as e:
        return Response(f'Authentication Error: {str(e)}', status=401)


_register_folder(app=app, root_path='api\\routes',
                 root_folder="", supabase_client=supabase_client)
