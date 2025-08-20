import subprocess
import json
import re
from datetime import datetime

def capture_performance(interface, duration=10):
    print(f"[+] Capturing performance data on {interface} for {duration} seconds...")

    subprocess_command = [
        "tshark",
        "-i", interface,
        "-q",
        "-z", "conv,tcp",
        "-a", f"duration:{duration}"
    ]

    output = subprocess.run(
        subprocess_command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True
    ).stdout

    return output

def parse_performance_data(input_text):
    # Define the pattern to match each line of TCP conversation data
    pattern = re.compile(
        r"(\d+\.\d+\.\d+\.\d+:\d+)\s+<->\s+(\d+\.\d+\.\d+\.\d+:\d+)\s+(\d+)\s+(\d+)\s+bytes\s+(\d+)\s+(\d+)\s+bytes\s+(\d+)\s+(\d+)\s+bytes\s+(\d+\.\d+)\s+(\d+\.\d+)"
    )

    # Find all matches in the input text
    matches = pattern.finditer(input_text)

    # Initialize a list to store the serialized data
    conversations = []

    # Iterate over the matches and populate the list
    for match in matches:
        conversation = {
            "source": match.group(1),
            "destination": match.group(2),
            "source_to_dest_frames": int(match.group(3)),
            "source_to_dest_bytes": int(match.group(4)),
            "dest_to_source_frames": int(match.group(5)),
            "dest_to_source_bytes": int(match.group(6)),
            "total_frames": int(match.group(7)),
            "total_bytes": int(match.group(8)),
            "relative_start": float(match.group(9)),
            "duration": float(match.group(10))
        }
        conversations.append(conversation)

    return conversations

def assess_performance(conversations):
    assessment = {}

    for conv in conversations:
        src_ip = conv["source"]
        if src_ip not in assessment:
            assessment[src_ip] = {
                'total_packets': 0,
                'total_bytes': 0,
                'total_duration': 0,
                'conversations': []
            }

        assessment[src_ip]['total_packets'] += conv['total_frames']
        assessment[src_ip]['total_bytes'] += conv['total_bytes']
        assessment[src_ip]['total_duration'] += conv['duration']
        assessment[src_ip]['conversations'].append({
            'destination': conv['destination'],
            'total_frames': conv['total_frames'],
            'total_bytes': conv['total_bytes'],
            'duration': conv['duration']
        })

    # Calculate average throughput for each source IP
    for src_ip, data in assessment.items():
        data['average_throughput'] = (data['total_bytes'] * 8) / data['total_duration'] if data['total_duration'] > 0 else 0

    assessment_json = json.dumps(assessment, indent=4)

    # Generate a timestamp for the filename
    current_time = datetime.now().strftime("%Y%m%d_%H%M%S")

    with open(f'performance_assessment{current_time}.json', 'w') as f:
        f.write(assessment_json)

    print("[+] Performance Assessment:")
    print(assessment_json)

    return assessment_json

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

def extract_tcp_conversations(output):
    # interface = "Wi-Fi"  # Used for testing
    interfaces = extract_interface_names(subprocess.run(["ip", "link", "show"], stdout=subprocess.PIPE, text=True).stdout)
    print("[+] Available network interfaces:")
    for i, iface in enumerate(interfaces):
        print(f"{i + 1}: {iface}")

    duration = 10  # Duration in seconds

    assessments = []
    if not interfaces:
        print("[!] No network interfaces found.")
        return assessments

    try:
        for interface in interfaces:
            print(f"\n[+] Assessing performance for interface: {interface}")
            output = capture_performance(interface, duration)
            conversations = parse_performance_data(output)
            assessment = assess_performance(conversations)
            assessments.append({
                "interface": interface,
                "assessment": assessment
            })

            return assessments
    except subprocess.CalledProcessError as e:
        print(f"[!] Error capturing performance data: {e.stderr}")
    except Exception as e:
        print(f"[!] An unexpected error occurred: {str(e)}")

