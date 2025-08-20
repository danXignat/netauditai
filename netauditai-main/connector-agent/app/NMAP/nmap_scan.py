import subprocess
import json
import re

def run_nmap_scan(ip_range="192.168.86.*"):
    """Run an Nmap scan and return the output as a string."""
    print("[RUN] nmap -sV -O -T5 192.168.86.*")
    try:
        result = subprocess.run(
            ["nmap", "-sV", "-O", "-T5", ip_range],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error running Nmap: {e}")
        return ""

def parse_nmap_output(output):
    """Parse the Nmap text output and return a dictionary with the scan results."""
    scan_results = {
        "hosts": []
    }

    # Regular expressions to parse the Nmap output
    host_pattern = re.compile(r"Nmap scan report for (.*?)")
    port_pattern = re.compile(r"(\d+)/tcp\s+open\s+(\w+)(?:\s+(.+?))?\n")
    os_pattern = re.compile(r"Running: (.*)")

    output = output["Nmap scan report for".__len__():]  # Trim output to start from the first host report
    # Split the output by host sections, ignoring "host is up" lines
    hosts = host_pattern.split(output)[1:]

    print (f"[INFO] Found {len(hosts)} hosts in the scan output.")
    for i, host in enumerate(hosts):
        print(f"[INFO] Parsing host {i}: {host.strip()}")

    hosts = [hosts[i] for i in range(1, len(hosts), 2)]  # Get only the host names

    for host in hosts:
        host_info = {
            "address": None,
            "ports": [],
            "os": None
        }

        # Extract the host address, skipping lines with "the host is up for"
        lines = host.strip().split("\n")
        for line in lines:
            if host_info["address"] is None:
                host_info["address"] = line.strip()
            break

        # Extract OS information
        os_match = os_pattern.search(host)
        if os_match:
            host_info["os"] = os_match.group(1).strip() if os_match.group(1) != "null" else "Unknown"

        # Extract port information
        port_matches = port_pattern.finditer(host)
        for match in port_matches:
            port_info = {
                "portid": match.group(1),
                "state": "open",
                "service": match.group(2),
                "version": match.group(3).strip() if match.group(2) else ""
            }
            host_info["ports"].append(port_info)

        scan_results["hosts"].append(host_info)

    return scan_results

def save_to_json(data, json_file):
    """Save the scan results to a JSON file."""
    with open(json_file, "w") as f:
        return json.dump(data, f, indent=2)

def generate_serialized_network_report(ip_range="192.168.86.*"):
    output = run_nmap_scan(ip_range)
    if output:
        scan_results = parse_nmap_output(output)
        save_to_json(scan_results, "nmap_scan_results.json")
        print("Scan results saved to nmap_scan_results.json")
    else:
        print("No output to save.")

def generate_serialized_network_report_from_string(output: str):
    scan_results = parse_nmap_output(output)
    rez = save_to_json(scan_results, "nmap_scan_results.json")
    print("Scan results saved to nmap_scan_results.json")
    return rez

#Use the generate_serialized_network_report function to run the scan and get the results.
if __name__ == "__main__":
    generate_serialized_network_report()