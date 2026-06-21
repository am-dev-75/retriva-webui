# Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import re

def test_regex(query, text, case_sensitive):
    regex_query = re.escape(query).replace(r'\*', '.*').replace(r'\?', '.')
    if not regex_query.startswith('.*'): regex_query = '.*' + regex_query
    if not regex_query.endswith('.*'): regex_query = regex_query + '.*'
    
    flags = 0 if case_sensitive else re.IGNORECASE
    pattern = re.compile(regex_query, flags)
    
    match = pattern.search(text)
    print(f"Query: {query} -> Regex: {regex_query}")
    print(f"Text: {text}")
    print(f"Case Sensitive: {case_sensitive}")
    print(f"Match: {bool(match)}")
    print("-" * 20)

test_regex("*R*", "rust-for-beginners.pdf", True)
test_regex("*R*", "rust-for-beginners.pdf", False)
test_regex("*R*", "CRA Gids v2.0.pdf", True)
