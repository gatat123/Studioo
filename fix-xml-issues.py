import xml.etree.ElementTree as ET
import os
from collections import defaultdict
from pathlib import Path

def parse_xml_issues(directory):
    """Parse all XML files and extract issues"""
    issues_by_type = defaultdict(list)

    # Parse all XML files
    for xml_file in Path(directory).glob("*.xml"):
        if xml_file.name == ".descriptions.xml":
            continue

        tree = ET.parse(xml_file)
        root = tree.getroot()

        for problem in root.findall('problem'):
            file_elem = problem.find('file')
            if file_elem is None:
                continue

            file_path = file_elem.text.replace('file://$PROJECT_DIR$/', '')
            line = problem.find('line').text if problem.find('line') is not None else 'N/A'
            description = problem.find('description').text if problem.find('description') is not None else ''

            # Extract issue type from filename
            issue_type = xml_file.stem

            issues_by_type[issue_type].append({
                'file': file_path,
                'line': line,
                'description': description.replace('ESLint: ', '').strip()
            })

    return issues_by_type

def print_summary(issues_by_type):
    """Print summary of issues"""
    print("=== Issue Summary ===\n")

    # Sort by count
    sorted_issues = sorted(issues_by_type.items(), key=lambda x: -len(x[1]))

    for issue_type, issues in sorted_issues:
        print(f"{issue_type}: {len(issues)} issues")

        # Show first 3 examples
        for i, issue in enumerate(issues[:3]):
            if i == 0:
                print(f"  Examples:")
            print(f"    - {issue['file']}:{issue['line']}")
            if issue['description']:
                desc = issue['description'][:80]
                print(f"      {desc}")
        print()

def generate_fix_commands(issues_by_type):
    """Generate commands to fix issues"""
    print("\n=== Auto-fix Commands ===\n")

    # ESLint issues
    if 'Eslint' in issues_by_type:
        eslint_files = set()
        for issue in issues_by_type['Eslint']:
            file_path = issue['file']
            if file_path.endswith(('.ts', '.tsx', '.js', '.jsx')):
                eslint_files.add(file_path)

        if eslint_files:
            # Batch files for efficiency
            files_list = list(eslint_files)[:20]
            print("ESLint auto-fix (first 20 files):")
            print(f"npx eslint --fix {' '.join(files_list)}\n")

    # Unused imports
    if 'ES6UnusedImports' in issues_by_type:
        print("Files with unused imports:")
        for issue in issues_by_type['ES6UnusedImports'][:5]:
            print(f"  - {issue['file']}:{issue['line']}")

if __name__ == "__main__":
    fix_dir = r"C:\Users\a0109\studio\.idea\fix"

    print(f"Analyzing issues in {fix_dir}\n")
    issues = parse_xml_issues(fix_dir)

    print_summary(issues)
    generate_fix_commands(issues)