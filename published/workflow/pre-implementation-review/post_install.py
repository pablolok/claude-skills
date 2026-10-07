"""Post-installation hook for pre-implementation-review.
Integrates the skill into the project's Conductor workflow.
"""

from __future__ import annotations

import os
import sys


STEP_TITLE = "3. **Run Pre-Implementation Review:**"
INSERT_AFTER = "2. **Mark In Progress:**"
INSERT_BEFORE = "3. **Write Failing Tests (Red Phase):**"
NEW_STEP = """
3. **Run Pre-Implementation Review:**
   - Invoke the `pre-implementation-review` skill before writing tests, code, or scaffolding files for the selected task.
   - Use the review to decide the task's responsibilities, the pattern and owner of each, and its seams; reuse, extension points, shared styling primitives, validators, mappers and enum boundaries follow from that design.
   - If the review changes the implementation boundary or reveals reusable work that should be tracked explicitly, update the current phase tasks in `plan.md` before continuing.
   - The adjusted tasks must reflect the chosen abstraction, ownership boundary, and any additional tests or consumer updates implied by that decision.
"""


def integrate_into_workflow(target_project_path: str) -> None:
    """Detect conductor/workflow.md and insert the pre-implementation review step."""
    workflow_path = os.path.join(target_project_path, "conductor", "workflow.md")

    if not os.path.exists(workflow_path):
        print(f"No Conductor workflow found at {workflow_path}. Skipping integration.")
        return

    with open(workflow_path, "r", encoding="utf-8") as handle:
        content = handle.read()

    if "pre-implementation-review" in content or STEP_TITLE in content:
        print("Pre-implementation review already integrated into workflow.")
        return

    insertion_point = content.find(INSERT_BEFORE)
    if insertion_point == -1:
        marker_index = content.find(INSERT_AFTER)
        if marker_index == -1:
            print("Could not find the task workflow insertion point in workflow.md. Manual integration required.")
            return

        insertion_point = content.find("\n\n", marker_index)
        if insertion_point == -1:
            insertion_point = content.find("\n", marker_index)
        if insertion_point == -1:
            print("Could not determine the insertion boundary in workflow.md. Manual integration required.")
            return
        insertion_point += 1

    updated_content = content[:insertion_point] + NEW_STEP + "\n" + content[insertion_point:]
    replacements = [
        ("3. **Write Failing Tests (Red Phase):**", "4. **Write Failing Tests (Red Phase):**"),
        (
            "4. **Implement to Pass Tests (Green Phase):**",
            "5. **Implement to Pass Tests (Green Phase):**",
        ),
        (
            "5. **Refactor (Optional but Recommended):**",
            "6. **Refactor (Optional but Recommended):**",
        ),
        ("6. **Verify Coverage:**", "7. **Verify Coverage:**"),
        ("7. **Document Deviations:**", "8. **Document Deviations:**"),
        ("8. **Commit Code Changes:**", "9. **Commit Code Changes:**"),
        (
            "9. **Attach Task Summary with Git Notes:**",
            "10. **Attach Task Summary with Git Notes:**",
        ),
        (
            "10. **Get and Record Task Commit SHA:**",
            "11. **Get and Record Task Commit SHA:**",
        ),
        ("11. **Commit Plan Update:**", "12. **Commit Plan Update:**"),
        ("**Step 9.1:", "**Step 10.1:"),
        ("**Step 9.2:", "**Step 10.2:"),
        ("**Step 9.3:", "**Step 10.3:"),
        ("**Step 10.1: Update Plan:**", "**Step 11.1: Update Plan:**"),
        ("**Step 10.2: Write Plan:**", "**Step 11.2: Write Plan:**"),
    ]
    for old, new in replacements:
        updated_content = updated_content.replace(old, new)

    with open(workflow_path, "w", encoding="utf-8") as handle:
        handle.write(updated_content)

    print("Successfully updated workflow.md.")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        integrate_into_workflow(sys.argv[1])
    else:
        print("Usage: python post_install.py <target_project_path>")
