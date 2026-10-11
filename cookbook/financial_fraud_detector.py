"""Cookbook Recipe: Dialect-Aware Financial Fraud & Social Engineering Analyzer.

Inspects suspect SMS alerts, banking messages, WhatsApp scams, and phishing attempts
tailored to Nigerian social-engineering patterns (fake BVN block, fake credit alerts,
urgent family emergency impersonation, ponzi schemes).

N-ATLaS is an initiative of the Federal Ministry of Communications,
Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import json
from typing import Literal
from pydantic import BaseModel, Field

from natlas import Client


class FraudAnalysisResult(BaseModel):
    is_fraudulent: bool = Field(description="True if the message is suspected scam or phishing")
    threat_level: Literal["safe", "low", "medium", "critical"]
    scam_category: Literal[
        "fake_bvn_alert",
        "fake_credit_transfer",
        "impersonation_relative",
        "lottery_crypto_ponzi",
        "legitimate_message",
        "other",
    ]
    confidence_score: float = Field(ge=0.0, le=1.0, description="Confidence rating between 0 and 1")
    deceptive_tactics: list[str] = Field(description="Specific psychological triggers detected (e.g. artificial urgency, unverified phone number)")
    advisory_english: str = Field(description="Clear safety advice explaining how the recipient should respond")


def analyze_financial_message(client: Client, message_text: str) -> FraudAnalysisResult:
    """Analyze a suspicious message for Nigerian financial fraud patterns."""
    instruction = (
        "You are an elite cybercrime and banking fraud investigator specializing in Nigerian "
        "social engineering scams (fake bank SMS alerts, BVN blocking threats, urgent relatives, "
        "Ponzi schemes). Evaluate the incoming text with extreme scrutiny."
    )
    return client.extract(
        response_model=FraudAnalysisResult,
        prompt=f"Suspicious Message:\n{message_text}",
        system_instruction=instruction,
        temperature=0.0,
    )


def main() -> None:
    client = Client(mode="hosted")

    suspicious_messages = [
        "URGENT: Your BVN has been deactivated due to NIN mismatch. Call 08039998877 immediately within 2 hours or your account will be blocked.",
        "Credit Alert! Acct: 204***4910 Amt: NGN 250,000.00 Desc: Quick cash reward. Click bit.ly/claim-funds-now to approve.",
        "Your electricity token for meter 4519283749 is: 4819-2049-1830-4920-1849. Units: 42.1 kWh. Thank you for using Ikeja Electric.",
    ]

    print("=== N-ATLaS Sovereign Financial Fraud Defense Engine ===\n")
    for msg in suspicious_messages:
        print(f"Incoming SMS: \"{msg}\"")
        analysis = analyze_financial_message(client, msg)
        print("Analysis Report:")
        print(json.dumps(analysis.model_dump(), indent=2))
        print("-" * 60)


if __name__ == "__main__":
    main()
