import os

HEADER = """/**
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"""

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "Copyright" not in content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(HEADER + content)
        print(f"Added header to {filepath}")

def main():
    exclude_dirs = {'node_modules', 'dist', 'build', '.git', 'scratch'}
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.css')):
                filepath = os.path.join(root, file)
                process_file(filepath)
    print("Done!")

if __name__ == '__main__':
    main()
