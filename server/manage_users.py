"""
Interactively list every user account and adjust one's access level.

Lists every visible account (name, email, current role), then repeatedly
prompts for an email and a new role until you choose to quit. See
promote_user.py for the quick one-shot equivalent if you already know
the exact email/role you want, and this docstring's note on why this
path doesn't log a UserEvent the way the in-app admin panel does.

Usage:
    python manage_users.py
"""
from models.user import VALID_ROLES, get_all_users, update_user
from pagination import MAX_PAGE_SIZE


def print_user_table(users):
    if not users:
        print("No user accounts found.")
        return

    name_width = max([len(u.name or "(no name)") for u in users] + [4])
    email_width = max([len(u.email) for u in users] + [5])

    header = f"{'Name':<{name_width}}  {'Email':<{email_width}}  Role"
    print(header)
    print("-" * len(header))
    for u in users:
        print(f"{(u.name or '(no name)'):<{name_width}}  {u.email:<{email_width}}  {u.role}")


def prompt_email(users):
    by_email = {u.email.lower(): u for u in users}
    while True:
        raw = input("\nEnter a user's email to adjust (or 'q' to quit, 'l' to relist): ").strip()
        if raw.lower() == "q":
            return None
        if raw.lower() == "l":
            print_user_table(users)
            continue
        user = by_email.get(raw.lower())
        if user is None:
            print(f"No visible account found with email '{raw}'. Try again, or 'l' to see the list again.")
            continue
        return user


def prompt_role(current_role):
    roles = sorted(VALID_ROLES)
    while True:
        raw = input(f"New access level for this account [{', '.join(roles)}] (current: {current_role}): ").strip().lower()
        if raw in VALID_ROLES:
            return raw
        print(f"'{raw}' isn't a valid role. Choose from: {', '.join(roles)}")


def main():
    print("Fetching all user accounts...\n")
    # get_all_users() is paginated (returns (users, total), defaults to
    # a 100-row page) since it's also the model function behind the
    # admin Control panel's paged Access Level list. This script wants
    # everything in one go, so ask for the max page size explicitly
    # rather than relying on the default - and say something if even
    # that isn't enough, rather than silently showing a partial list.
    users, total = get_all_users(limit=MAX_PAGE_SIZE)
    if total > len(users):
        print(f"Note: showing {len(users)} of {total} accounts (the first {MAX_PAGE_SIZE}). "
              f"This tool doesn't yet support paging further - use the in-app Manage Users panel "
              f"or promote_user.py for accounts not shown here.\n")
    print_user_table(users)

    while True:
        target = prompt_email(users)
        if target is None:
            print("Done.")
            return

        new_role = prompt_role(target.role)
        if new_role == target.role:
            print(f"{target.email} is already '{new_role}' - nothing to change.")
            continue

        confirm = input(f"Change {target.email} from '{target.role}' to '{new_role}'? [y/N]: ").strip().lower()
        if confirm != "y":
            print("Skipped.")
            continue

        old_role = target.role
        update_user(target.id, role=new_role)
        target.role = new_role  # keep the in-memory list in sync for this session
        print(f"Updated {target.email}: {old_role} -> {new_role}")
        print("The change takes effect on their next request (roles_required checks the DB live).")


if __name__ == "__main__":
    main()