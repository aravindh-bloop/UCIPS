import random
import string


def generate_reference_code() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"UCIPS-{suffix}"
