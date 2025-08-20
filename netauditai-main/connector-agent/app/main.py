from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ssh_connector import SSHConnector
from pydantic import BaseModel

from NMAP.nmap_scan import *
from TCP.tcp_scan import *
from IP.check_ips import *

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    method: str
    ip: str
    username: str
    private_key: str
    sudo_pwd: str


class Response(BaseModel):
    network_details: str
    packet_tracer: str

@app.post("/scan")
async def scan_device(req: ScanRequest):
    if req.method != "ssh":
        raise HTTPException(status_code=400, detail=f"Unsupported method: {req.method}")

    try:
        combined_results = {
            "performance_assessment": {},
            "network_scan_result": {},
            "packet_tracer_result": {}
        }

        connector = SSHConnector(
            ip=req.ip,
            username=req.username,
            private_key=req.private_key,
            sudo_password=req.sudo_pwd
        )
        connector.start_sudo_session()
        interfaces = extract_interface_names(connector.execute_in_sudo_session("ip link show"))
        duration = 10
        assessments = []

        nmap_output = connector.execute_in_sudo_session(f"nmap -sV -O -T5 {req.ip}")
        if nmap_output:
            network_scan_result = parse_nmap_output(nmap_output)
            combined_results["network_scan_result"] = network_scan_result
            print("Network scan completed successfully")
        else:
            print("No nmap output received")
            combined_results["network_scan_result"] = {"error": "No nmap output received"}

        try:
            sub_net_ip = req.ip.rsplit('.', 1)[0] + ".*"
            output = connector.execute_in_sudo_session(f"nmap -sV -O -T5 {sub_net_ip}")
            generate_serialized_network_report_from_string(output)
            print("Local network report generated")
        except Exception as e:
            print(f"Error generating local network report: {e}")

        try:
            for interface in interfaces:
                output = connector.execute_with_pty(
                    f"tshark -i {interface} -q -z conv,tcp, -a duration:{duration}",
                    use_sudo=True
                )
                # print(output)

                conversations = parse_performance_data(output)
                assessment = assess_performance(conversations)
                assessments.append({
                    "interface": interface,
                    "assessment": assessment
                })

            if assessments:
                combined_results["performance_assessment"] = assessments
            else:
                combined_results["performance_assessment"] = {"error": "No TCP conversations captured"}
            print("TCP performance assessment completed")
        except Exception as e:
            print(f"Error in TCP performance assessment: {e}")
            combined_results["performance_assessment"] = {"error": str(e)}

        try:
            result = scan_packet_capture_from_string(interfaces, connector)
            print(result)

            serialized_results = serialize_analysis_results(result)
            print(serialized_results)

            combined_results["packet_tracer_result"] = serialized_results
            print("Packet tracer analysis completed")
        except Exception as e:
            print(f"Error in packet tracer analysis: {e}")
            combined_results["packet_tracer_result"] = {"error": str(e)}

        connector.close()

        return {
            "status": "OK",
            "results": combined_results
        }

    except Exception as e:
        print(f"Error during scan: {e}")
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")
