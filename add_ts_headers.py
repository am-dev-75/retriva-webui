import os

header = """/**
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

files = [
    "src/features/ingestion/components/IngestionLanding.tsx",
    "src/features/ingestion/components/SourceDetail.tsx",
    "src/features/ingestion/components/ConnectedSourcesList.tsx",
    "src/features/ingestion/components/AddSourceWizard.tsx",
    "src/features/ingestion/components/IngestionLanding.test.tsx",
    "src/features/ingestion/utils/status-mapper.test.ts",
    "src/features/ingestion/utils/status-mapper.ts"
]

for path in files:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        
        if "Copyright (C) 2026 Andrea Marson" not in content:
            with open(path, "w", encoding="utf-8") as f:
                f.write(header + content)
            print(f"Added header to {path}")

