import os
import requests
import ipaddress

FIREHOL_URL = "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level1.netset"
CACHE_FILE = "firehol_level1_cache.txt"
CACHE_TTL = 86400  # 1 day

_blacklist_cache = []

def _download_firehol_list(url=FIREHOL_URL):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return [line.strip() for line in response.text.splitlines()
                if line and not line.startswith("#")]
    except Exception as e:
        print(f"[!] Failed to download FireHOL list: {e}")
        return []

def _load_cache():
    if not os.path.exists(CACHE_FILE):
        return []
    with open(CACHE_FILE, "r") as f:
        return [line.strip() for line in f if line.strip()]

def _save_cache(cidr_list):
    with open(CACHE_FILE, "w") as f:
        for cidr in cidr_list:
            f.write(cidr + "\n")

def load_blacklist(use_cache=True, force_update=False):
    """
    Load the blacklist into memory (once). Use `force_update=True` to re-download.
    Converts CIDR strings to ip_network objects for fast comparison.
    """
    global _blacklist_cache
    if _blacklist_cache and not force_update:
        return

    if use_cache and os.path.exists(CACHE_FILE) and not force_update:
        cidrs = _load_cache()
    else:
        cidrs = _download_firehol_list()
        if use_cache:
            _save_cache(cidrs)

    # Convert to ip_network objects for comparison
    _blacklist_cache = []
    for cidr in cidrs:
        try:
            net = ipaddress.ip_network(cidr)
            _blacklist_cache.append(net)
        except ValueError:
            continue  # Skip malformed lines
    print(len(_blacklist_cache))


def is_ip_suspicious(ip):
    """
    Check if the given IP is in any CIDR range in the loaded blacklist.
    Skips private/reserved IPs.
    """
    if not _blacklist_cache:
        print("[!] Blacklist not loaded. Call load_blacklist() first.")
        return False

    try:
        ip_obj = ipaddress.ip_address(ip)
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved:
            return False  # Don't check private IPs
    except ValueError:
        print(f"[!] Invalid IP address: {ip}")
        return False

    return any(ip_obj in net for net in _blacklist_cache)

if __name__ == "__main__":
    _download_firehol_list()