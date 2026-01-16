import json

def print_refs(path_obj, data):
    for method_name, method in path_obj.items():
        if not isinstance(method, dict): continue
        
        # Request Body
        if 'requestBody' in method:
            content = method.get('requestBody', {}).get('content', {}).get('application/json', {})
            schema = content.get('schema', {})
            if '$ref' in schema:
                ref = schema['$ref'].split('/')[-1]
                print(f"\nDefinition for {ref}:")
                if ref in data['components']['schemas']:
                    print(json.dumps(data['components']['schemas'][ref], indent=2))
        
        # Responses
        responses = method.get('responses', {})
        for code, resp in responses.items():
            content = resp.get('content', {}).get('application/json', {})
            schema = content.get('schema', {})
            if '$ref' in schema:
                ref = schema['$ref'].split('/')[-1]
                print(f"\nDefinition for {ref}:")
                if ref in data['components']['schemas']:
                    print(json.dumps(data['components']['schemas'][ref], indent=2))

try:
    with open('api-spec/openapi.json', 'r') as f:
        data = json.load(f)
        
    vision_path = data.get('paths', {}).get('/vision', {})
    if vision_path:
        print(json.dumps(vision_path, indent=2))
        print_refs(vision_path, data)
    else:
        print("Path /vision not found")
        
except Exception as e:
    print(f"Error: {e}")
