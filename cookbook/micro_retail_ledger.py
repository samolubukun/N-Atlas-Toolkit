"""Cookbook Recipe: Micro-Retail Voice-to-Ledger Bookkeeper for Nigerian Traders.

Converts spoken notes or audio transcripts from market traders,
kiosk owners, and POS operators into structured transaction and debt ledger records.

N-ATLaS is an initiative of the Federal Ministry of Communications,
Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import json
from typing import Literal
from pydantic import BaseModel, Field

from natlas import Client


class LedgerEntry(BaseModel):
    customer_name: str = Field(description="Name or nickname of the customer or counterparty")
    item_description: str = Field(description="Goods or services exchanged")
    total_amount_ngn: float = Field(description="Total monetary value in Naira")
    amount_paid_ngn: float = Field(description="Amount paid immediately in Naira")
    outstanding_debt_ngn: float = Field(description="Remaining balance or debt owed in Naira")
    transaction_type: Literal["cash_sale", "credit_sale", "debt_repayment", "expense"]
    due_date_hint: str | None = Field(default=None, description="Agreed date or period for debt payment")
    notes: str = Field(default="", description="Additional contextual details from the spoken note")


def parse_trader_voice_note(client: Client, spoken_text: str) -> LedgerEntry:
    """Extract a validated, structured ledger entry from Nigerian trader speech."""
    instruction = (
        "You are an expert bookkeeping assistant for Nigerian micro-retailers (market traders, "
        "kiosk shopkeepers, and POS agents). Parse Yoruba, Hausa, Igbo, or English notes "
        "and extract clean ledger records with exact Naira amounts and debt tracking."
    )
    return client.extract(
        response_model=LedgerEntry,
        prompt=spoken_text,
        system_instruction=instruction,
        temperature=0.0,
    )


def main() -> None:
    client = Client(mode="hosted")

    samples = [
        "Emeka bought two bags of rice for 140,000 naira. He paid 100,000 by transfer, and promised to bring the balance of 40,000 next week Friday.",
        "Mama Chinedu took three tins of milk and one roll of milo for 8,500 naira. She will pay the full balance tomorrow morning.",
        "I paid Alhaji Musa 25,000 naira for supply of yam tubers, complete payment.",
    ]

    print("=== N-ATLaS Sovereign Voice-to-Ledger Engine ===\n")
    for sample in samples:
        print(f"Spoken Note : \"{sample}\"")
        entry = parse_trader_voice_note(client, sample)
        print("Structured Ledger Entry:")
        print(json.dumps(entry.model_dump(), indent=2))
        print("-" * 60)


if __name__ == "__main__":
    main()
