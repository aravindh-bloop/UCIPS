import hashlib

# Verhoeff checksum tables -- the actual algorithm UIDAI uses to validate Aadhaar numbers.
_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]


def _verhoeff_valid(number: str) -> bool:
    checksum = 0
    for i, char in enumerate(reversed(number)):
        checksum = _D[checksum][_P[i % 8][int(char)]]
    return checksum == 0


def is_valid_aadhaar(number: str) -> bool:
    """Real UIDAI-format validation: 12 digits, doesn't start with 0 or 1, passes the
    Verhoeff checksum. This does NOT verify the number is a real, issued Aadhaar (that
    requires UIDAI's licensed e-KYC API, which is out of scope here) -- it only rejects
    obviously malformed/mistyped input the same way a real form would."""
    number = number.strip().replace(" ", "")
    if not number.isdigit() or len(number) != 12 or number[0] in ("0", "1"):
        return False
    return _verhoeff_valid(number)


def hash_aadhaar(number: str) -> str:
    normalized = number.strip().replace(" ", "")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def last4(number: str) -> str:
    return number.strip().replace(" ", "")[-4:]
