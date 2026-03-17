import json
from urllib.parse import unquote_plus

from flask import Response, Request
from supabase import Client
import logging

logging.basicConfig(level=logging.INFO)


# Function to URL-decode the token and extract the JWT
def get_supabase_tokens_from_cookie(encoded_token):
    # URL-decode the token
    decoded_token = unquote_plus(encoded_token)
    # Parse the token assuming it's a JSON array and extract the JWT
    try:
        jwt_array = json.loads(decoded_token)
        if jwt_array and isinstance(jwt_array, list):
            # The JWT is typically the first element
            return jwt_array[0], jwt_array[1]
        return None, None

    except json.JSONDecodeError:
        return None, None


class SupabaseMiddleware:
    def __init__(self, app, supabase_client: Client):
        self.app = app
        self.supabase_client = supabase_client

    def __call__(self, environ, start_response):
        request = Request(environ)
        auth_token = request.cookies.get('sb-localhost-auth-token')
        if not auth_token:
            res = Response('Auth token cookie missing', status=401)
            return res(environ, start_response)
        access_token, refresh_token = get_supabase_tokens_from_cookie(
            auth_token)

        self.supabase_client.auth.set_session(access_token, refresh_token)

        return self.app(environ, start_response)
