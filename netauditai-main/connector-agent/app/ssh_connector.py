import paramiko
from io import StringIO
import time


class SSHConnector:
    def __init__(self, ip: str, username: str, private_key: str, sudo_password: str = None, timeout: int = 10):
        self.ip = ip
        self.username = username
        self.private_key = private_key
        self.sudo_password = sudo_password
        self.timeout = timeout
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.shell = None

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def connect(self):
        try:
            key_stream = StringIO(self.private_key)
            key = paramiko.RSAKey.from_private_key(key_stream)
        except paramiko.PasswordRequiredException:
            raise Exception("This SSH key requires a passphrase.")
        except paramiko.SSHException as e:
            raise Exception(f"Failed to load private key: {str(e)}")
        finally:
            del self.private_key

        try:
            self.client.connect(
                hostname=self.ip,
                username=self.username,
                pkey=key,
                timeout=self.timeout,
                look_for_keys=False,
                allow_agent=False
            )
        except Exception as e:
            raise Exception(f"Failed to connect to {self.ip}: {str(e)}")
        finally:
            del key_stream
            del key

    def execute(self, command: str, use_sudo: bool = False) -> str:
        if use_sudo and self.sudo_password:
            command = f"echo '{self.sudo_password}' | sudo -S {command}"
        elif use_sudo:
            command = f"sudo {command}"

        stdin, stdout, stderr = self.client.exec_command(command)
        output = stdout.read().decode()
        error = stderr.read().decode()

        if error and "sudo:" not in error:
            raise Exception(f"Command failed with error: {error}")

        return output

    def start_sudo_session(self):
        self.connect()

        if not self.sudo_password:
            raise Exception("Sudo password required for sudo session")

        self.shell = self.client.invoke_shell()
        self.shell.send("sudo -s\n")

        output = ""
        while True:
            if self.shell.recv_ready():
                chunk = self.shell.recv(1024).decode('utf-8')
                output += chunk
                if "password" in output.lower() or "[sudo]" in output:
                    break
            time.sleep(0.1)

        self.shell.send(f"{self.sudo_password}\n")
        time.sleep(1)

        while self.shell.recv_ready():
            self.shell.recv(1024)

        # del self.sudo_password

    def execute_in_sudo_session(self, command: str) -> str:
        if not self.shell or self.shell.closed:
            raise Exception("Sudo session not started. Call start_sudo_session() first.")

        self.shell.send(f"{command}\n")
        time.sleep(0.5)

        output = ""
        max_wait = 10
        waited = 0

        while waited < max_wait:
            if self.shell.recv_ready():
                chunk = self.shell.recv(4096).decode()
                output += chunk
                if output.endswith('# ') or output.endswith('$ '):
                    break
            time.sleep(0.1)
            waited += 0.1

        lines = output.split('\n')
        if len(lines) > 1:
            clean_output = '\n'.join(lines[1:-1])
        else:
            clean_output = output

        return clean_output.strip()

    def close_sudo_session(self):
        if self.shell and not self.shell.closed:
            self.shell.send("exit\n")
            time.sleep(0.5)
            self.shell.close()

    def execute_with_pty(self, command: str, use_sudo: bool = False) -> str:
        if use_sudo:
            command = f"sudo {command}"

        stdin, stdout, stderr = self.client.exec_command(command, get_pty=True)

        if use_sudo and self.sudo_password:
            stdin.write(f"{self.sudo_password}\n")
            stdin.flush()

        output = stdout.read().decode()
        return output

    def close(self):
        if self.shell and not self.shell.closed:
            self.close_sudo_session()
        if self.client:
            self.client.close()

    def run_commands(self, commands: list[str], use_sudo: bool = False) -> dict[str, str]:
        self.connect()
        results = {}
        try:
            for cmd in commands:
                try:
                    results[cmd] = self.execute(cmd, use_sudo=use_sudo)
                except Exception as e:
                    results[cmd] = f"Error: {str(e)}"
        finally:
            self.close()
        return results

    def run_sudo_commands(self, commands: list[str]) -> dict[str, str]:
        return self.run_commands(commands, use_sudo=True)

    def __del__(self):
        try:
            self.close()
        except Exception:
            pass
        for attr in ["private_key", "sudo_password", "shell", "client"]:
            if hasattr(self, attr):
                try:
                    delattr(self, attr)
                except Exception:
                    pass
