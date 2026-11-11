# Ready to split implementation

The finalized plan is [implementation-plan.md](implementation-plan.md). The HTTP/model/service interfaces and file ownership are fixed in the linked contracts, so each partner can start A00/B00 independently without the teaching example. Confirmed assignment: Saint is A; Poom is B. Task IDs and interface ownership remain unchanged.

A builds the small common scaffold/error foundation while B writes pure date/money rules and tests. Merge G0, then follow task dependencies. A03a supplies guard infrastructure, B03a supplies real booking/cancellation operations, and A03b integrates suspension. Test-only adapters are allowed for isolated unit work but never count as integrated acceptance.

Backend code and live behavior are not already delivered by this plan. The gates in implementation-plan.md and acceptance IDs in acceptance-checklist.md define when implementation can be considered complete.
