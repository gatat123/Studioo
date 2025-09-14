import json
import sys
from collections import defaultdict
from pathlib import Path

def process_sarif(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    issues = defaultdict(list)

    for result in data['runs'][0]['results']:
        rule_id = result.get('ruleId', 'Unknown')
        if rule_id in ['SpellCheckingInspection', 'GrazieInspection']:
            continue  # Skip spelling/grammar issues

        location = result['locations'][0]['physicalLocation']
        file_uri = location['artifactLocation']['uri']
        line = location['region']['startLine']
        message = result['message']['text']

        issues[rule_id].append({
            'file': file_uri,
            'line': line,
            'message': message
        })

    # Print summary
    print("=== SARIF Report Summary ===\n")
    for rule_id, issue_list in sorted(issues.items(), key=lambda x: -len(x[1])):
        print(f"{rule_id}: {len(issue_list)} issues")
        if len(issue_list) <= 5:
            for issue in issue_list[:5]:
                print(f"  - {issue['file']}:{issue['line']} - {issue['message'][:80]}")
        else:
            print(f"  - First 3 issues:")
            for issue in issue_list[:3]:
                print(f"    {issue['file']}:{issue['line']}")
        print()

    # Generate fix commands for ESLint
    print("\n=== Auto-fix Commands ===")
    eslint_files = set()
    for issue in issues.get('Eslint', []):
        file_path = issue['file'].replace('..\\ile://', '').replace('/', '\\')
        if file_path.endswith(('.js', '.jsx', '.ts', '.tsx')):
            eslint_files.add(file_path)

    if eslint_files:
        print("ESLint auto-fix:")
        print(f"npx eslint --fix {' '.join(list(eslint_files)[:10])}")

if __name__ == "__main__":
    process_sarif(r"C:\Users\a0109\studio\.idea\fix\report_2025-09-14_12-11-14.sarif.json")