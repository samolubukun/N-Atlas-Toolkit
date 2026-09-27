"""
Recipe 2: Customer Support & Banking Dispute Classifier.

Demonstrates routing customer queries in Hausa, Igbo, Yoruba, and Nigerian Pidgin
for Nigerian banking, fintech, or telco support:
1. Categorizes dispute type (ATM dispensing error, POS decline, transfer delay).
2. Performs sentiment & urgency analysis.
3. Formulates empathetic response adhering to Central Bank of Nigeria (CBN) turnaround SLAs.
"""

import natlas

client = natlas.Client()

SUPPORT_PROMPT = """
You are a banking dispute resolver for a Nigerian fintech.
Classify the following customer complaint into JSON with keys:
- "issue_type": (POS_DECLINE, DISPENSE_ERROR, FAILED_TRANSFER, ACCOUNT_INQUIRY)
- "urgency": (HIGH, MEDIUM, LOW)
- "customer_language": (Hausa, Yoruba, Igbo, Nigerian_English, Pidgin)
- "suggested_reply": localized, empathetic reply in the customer's language.
"""

SAMPLE_TICKETS = [
    "Mo lo card mi lori POS loni, won deduct owo mi sugbon machine so pe transaction declined.",
    "Na so so debit alert una dey send me, my transfer never enter since yesterday morning.",
    "Ina son in san dalilin da ya sa aka toshe asusuna na banki tun makon jiya.",
]


def classify_ticket(ticket_text: str):
    print(f"\nIncoming Ticket: '{ticket_text}'")
    resp = client.chat([
        {"role": "system", "content": SUPPORT_PROMPT},
        {"role": "user", "content": ticket_text}
    ], temperature=0.1)

    print("Resolved Classification & Reply:")
    print(resp.message.content)


if __name__ == "__main__":
    print("--- Customer Support & Dispute Classifier Recipe ---")
    for t in SAMPLE_TICKETS:
        classify_ticket(t)
