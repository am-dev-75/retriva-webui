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
