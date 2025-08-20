import re
import subprocess
import json
from .ip_blacklist_checker import load_blacklist, is_ip_suspicious

def extract_source_ips(packet_capture):
    ip_pattern = r'(\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}):\d{1,4}\s'

    source_ips = re.findall(ip_pattern, packet_capture)

    source_ips = [source_ips[i] for i in range(0, len(source_ips), 2)]

    source_ips = list(set(source_ips))

    source_ips.sort()

    return source_ips

def scan_packet_capture_from_string(interface_names, connector):
    load_blacklist(force_update=True)

    results = {}
    duration = 10

    for interface in interface_names:
        output = connector.execute_with_pty(
            f"tshark -i {interface} -q -z conv,tcp, -a duration:{duration}",
            use_sudo=True
        )
        captured_ips = extract_source_ips(output)

        print(captured_ips)

        for ip in captured_ips:
            if is_ip_suspicious(ip):
                results[ip] = "[!] IP is suspicious!"
            else:
                results[ip] = "[+] IP seems clean."

    return results
# Capturare IP-uri timp de X secunde
def capture_ips(interface, duration=10):
    print(f"[+] Sniffing {interface} for {duration} seconds...")

    subprocess_command = [
        "tshark",
        "-i", interface,
        "-f", "ip",
        "-a", f"duration:{duration}"
    ]

    output = subprocess.run(
        subprocess_command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True
    ).stdout

    ips = extract_source_ips(output)

    # def packet_handler(pkt):
    #     if IP in pkt:
    #         src_ip = pkt[IP].src
    #         try:
    #             ip_obj = ipaddress.ip_address(src_ip)
    #             if not ip_obj.is_private and not ip_obj.is_loopback:
    #                 ips.add(src_ip)
    #         except ValueError:
    #             pass

    # sniff(filter="ip", prn=packet_handler, store=0, timeout=duration)
    return sorted(ips)

def extract_interface_names(output):
    # Split the output into lines
    lines = output.split('\n')

    # Initialize a list to store interface names
    interface_names = []

    # Iterate over each line
    for line in lines:
        # Check if the line starts with a number followed by a colon
        if ':' in line:
            # Split the line at the colon and take the first part
            interface_name = line.split(':')[1].strip()
            # Check if the interface name is a number (to avoid incorrect parsing)
            if not interface_name.isdigit():
                interface_names.append(interface_name)

    return interface_names

def scan_packet_capture(interface, duration=10):
    load_blacklist(force_update=True)

    captured_ips = capture_ips(interface, duration=10)
    results = {}

    print("\nCaptured IPs:")
    for ip in captured_ips:
        print(ip)

    print("\nAnalysis:")
    for ip in captured_ips:
        if is_ip_suspicious(ip):
            results[ip] = "[!] IP is suspicious!"
            print(f"[!] {ip} is suspicious!")
        else:
            results[ip] = "[+] IP seems clean."
            print(f"[+] {ip} seems clean.")

    return results

def serialize_analysis_results(results_list):
    return json.dumps(results_list, indent=4)


def get_network_ip_traffic_report():
    subprocess_command = [
        "ip", "link", "show"
    ]

    print("[+] Available network interfaces:")

    result = ": Wi-Fi:"

    interface_names = extract_interface_names(result)

    rezults = []
    print("[+] Interfaces found:")
    for i, name in enumerate(interface_names):
        print(f" - {name}")
        rezults.append(scan_packet_capture(name, duration=20))

    print("\n[+] Packet capture and analysis completed.")
    print("[+] Results:")
    for result in rezults:
        for ip, status in result.items():
            print(f"  {ip}: {status}")

    serialized_results = serialize_analysis_results(rezults)
    print(serialized_results)

    return serialized_results


if __name__ == "__main__":
    get_network_ip_traffic_report()
