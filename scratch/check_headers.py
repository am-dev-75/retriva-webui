import os

def main():
    exclude_dirs = {'node_modules', 'dist', 'build', '.git', 'scratch', 'public', 'assets'}
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.css')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    if "Copyright" not in content:
                        print(f"Missing header: {filepath}")
                except Exception as e:
                    pass

if __name__ == '__main__':
    main()
