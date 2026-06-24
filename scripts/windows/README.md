# Windows Print Agent Service Scripts (13I.6D)

## NSSM prerequisite

Download NSSM 2.24 from https://nssm.cc/download

Extract `nssm.exe` (win64) to:

```text
scripts/windows/tools/nssm.exe
```

This path is gitignored; each POS host needs the binary once.

## Install (Administrator)

```powershell
.\scripts\windows\install-print-agent-service.ps1
```

## Verify

```powershell
.\scripts\windows\verify-print-agent-service.ps1
.\scripts\windows\verify-print-agent-service.ps1 -TestRecovery
```

## Uninstall

```powershell
.\scripts\windows\uninstall-print-agent-service.ps1
```

Full runbook: [docs/thermal-printing/AGENT-WINDOWS-SERVICE-13I.6D.md](../../docs/thermal-printing/AGENT-WINDOWS-SERVICE-13I.6D.md)
