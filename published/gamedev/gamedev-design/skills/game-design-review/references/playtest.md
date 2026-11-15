# Playtest design, observation, and analysis

## Define a testable question

Record scope/build, production stage, target profile, intended experience, and available tester access.
State: "We expect [behavior]; support it if [metric and threshold] under [conditions]."
Choose the threshold from the design target or a baseline, not from a generic claim about all players.
Keep a reviewer's own play separate from external tester evidence.

Define metrics that answer the hypothesis: time to meaningful action/understanding, success rate,
failure cause, recovery cost, discovery, help requests, route choice, repeated-action errors, or return intent.
Operationalize ambiguous metrics such as "understanding" with a behavior or interview question.

## Plan the session

- Brief testers without explaining the mechanic being tested; note any prior knowledge.
- Keep build, start state, input/settings, and hardware comparable or record differences.
- Observe unguided play with timestamps. Predetermine when help is offered and record every intervention.
- Use think-aloud only when its effect on timing and attention is acceptable; do not mix its timings silently
  with silent-play timings.
- End with open questions and, if needed, a focused replay of a confusing moment.
- Choose sample size according to the decision, profile diversity, and uncertainty. A small usability sample
  can reveal faults; it cannot establish population rates or settle balance statistically.

### Protocol quality /10

Score each 0-2: testable hypothesis, metrics tied to the hypothesis, justified sample/profile,
nonleading observation/interview, and planned analysis/retest.
Below 6, revise the protocol before relying on it. A higher total does not remedy a missing critical control.

## Observe without inventing emotion

Log `time | event | action | reaction/statement | intervention | outcome`.
Separate a pause, repeated input, sigh, help request, or quit from the interpretation assigned to it.
Record failures and nonfinishers, not only successful players.
Capture frame/timing evidence when a finding depends on responsiveness or fairness.

Ask afterward:

1. What were you trying to do at that moment?
2. What did you expect to happen, and what happened instead?
3. How did you decide what to try next?
4. Was there a point you wanted to stop? What was happening?
5. What would you do differently on another attempt?

Follow with "tell me more about that moment" rather than defending the design or suggesting an answer.
Preserve relevant statements accurately; do not convert paraphrases into quotations.

## Optional controlled disruption

Use a separate resilience test for changed resources, an extra threat, or a removed ability.
Record the injected condition, recovery strategy, recovery time, and consequence.
Do not mix a disrupted session into an unmodified-flow hypothesis without identifying the intervention.

## Analyze

- Triangulate observed behavior, measured events, and tester explanation. Agreement strengthens confidence;
  disagreement is a question to investigate rather than something to average away.
- A single reproducible softlock is actionable; do not require several testers to encounter it first.
- Report frequency as n/N with profile and conditions. Small samples are directional, not population estimates.
- Separate cross-profile patterns, segment-specific issues, and isolated events.
- Check confirmation bias, observer assistance, recency, and exclusion of players who stopped early.
- Rank severity, frequency, confidence, and cost of being wrong. Critical faults can outrank common minor friction.
- Reuse the same test conditions for a fix comparison; note learning effects and use fresh testers where necessary.

## Report

```text
Build/scope/profile: [identifiers and conditions]
Hypothesis: [metric, threshold, rationale]
Sample: [N, recruitment/profile, limitations]
Outcome: [supported / refuted / inconclusive, with evidence]
Scores: [relevant dimensions and deltas]
Finding: [severity, symptom, location, evidence sources, n/N, confidence]
Player consequence: [observed or explicitly hypothesized]
First change: [one concrete adjustment]
Verification: [observable result required on retest]
What works: [mechanism and evidence]
Blind spots: [untested states/profiles and uncertainties]
Next test: [smallest question that resolves the most important uncertainty]
Highest-value next change: [one choice and reason]
```
