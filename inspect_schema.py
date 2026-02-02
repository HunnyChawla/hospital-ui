
import json
import sys

try:
    with open('api-spec/openapi.json', 'r') as f:
        spec = json.load(f)

    paths = spec.get('paths', {})
    print("--- Searching for user search endpoints ---")
    for path in paths.keys():
        if 'user' in path.lower() and ('search' in path.lower() or 'query' in path.lower() or 'filter' in path.lower()):
             print(f"Potential Match: {path}")
        
        # Also check parameters of ANY /users endpoint
        if '/users' in path.lower():
             get_op = paths[path].get('get')
             if get_op:
                 params = get_op.get('parameters', [])
                 param_names = [p.get('name') for p in params]
                 if 'q' in param_names or 'search' in param_names or 'query' in param_names or 'name' in param_names:
                     print(f"Endpoint {path} has search params: {param_names}")

except Exception as e:
    print(f"Error: {e}")
