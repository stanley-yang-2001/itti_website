"""
Promote (or demote) a user's access tier from the command line.

There is no API endpoint for this on purpose — role changes should be a
deliberate, out-of-band action by someone trusted (an admin running this
script, or later, an admin-only dashboard), never something the sign-in/
sign-up flow or the client can request for itself.

Usage:
    python promote_user.py someone@example.com publisher
    python promote_user.py someone@example.com basic

Works for both Google and email/password accounts — role is independent
of how the user authenticated. They must have signed up/in at least once
already (via either method) for a row to exist to promote.
"""
import sys

from models.user import VALID_ROLES, get_user_by_email, update_user


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    email, role = sys.argv[1].strip().lower(), sys.argv[2].strip().lower()
    if role not in VALID_ROLES:
        print(f"'{role}' is not a valid role. Choose from: {', '.join(sorted(VALID_ROLES))}")
        sys.exit(1)

    user = get_user_by_email(email)
    if not user:
        print(f"No user found with email '{email}'. They need to sign up/in at least once first.")
        sys.exit(1)

    old_role = user.role
    update_user(user.id, role=role)
    print(f"Updated {email}: {old_role} -> {role}")
    print("The change takes effect on their next request (roles_required checks the DB live).")


if __name__ == "__main__":
    main()