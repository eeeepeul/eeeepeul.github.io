# Text to Piano Visual Prototype Design

## Purpose

Create a new Text to Piano page reached from the black square button in the
existing EPEUL experience. This interface-only prototype validates the visual
composition and interaction without generating or playing audio.

## Approved Scope

The prototype includes:

- A dedicated page opened by the existing black square button.
- A white, full-screen composition with a centered horizontal visualization.
- A bottom text input and the submitted sentence displayed above it.
- Deterministic placeholder circle data generated from the submitted sentence.
- A transition from the previous visualization to the next submission.
- Responsive desktop and mobile layouts.
- Reduced-motion behavior.

The prototype does not include:

- TTS generation.
- Python or server-side spectrum analysis.
- Piano samples, synthesis, playback, or transport controls.
- Saving or sharing generated results.

## Entry Points

The existing black square remains visually unchanged.

- The standalone preview continues to navigate from `epeul-preview.html` to
  `epeul-space-preview.html`.
- The Next.js experience continues to navigate from the main EPEUL route to
  `/space`.
- Both destinations present the same Text to Piano visual behavior.

## Visual Design

The selected direction is the centered horizontal layout.

- The page uses a white background and generous empty space.
- The circle sequence occupies the horizontal center of the viewport.
- Circles vary in radius, stroke opacity, stroke width, and vertical offset.
- Circles are outlines without decorative fills.
- The submitted sentence is centered near the bottom of the page.
- The input is centered below the sentence and remains visually quiet.
- No card, toolbar, header, instructional panel, or persistent navigation is
  added.

On narrow screens, the same hierarchy is preserved. The visualization remains
centered, the sentence stays above the input, and all controls fit without
horizontal scrolling.

## Interaction States

### Initial

The page shows the empty white field and bottom input. No circles or submitted
sentence are visible.

### Generating

Pressing Enter with non-empty text clears the input focus state, displays the
submitted sentence, and starts the circle sequence. Circles appear from left to
right with small differences in timing and opacity.

### Complete

After the sequence finishes, the circles remain visible at a quiet final
opacity. The input remains available for another sentence.

### Replacing

A new valid submission fades the existing sequence, replaces the displayed
sentence, and starts the new sequence. Empty or whitespace-only submissions do
nothing and do not remove the current result.

## Placeholder Data Model

The visual generator converts the submitted string into a deterministic list of
events. The same sentence therefore produces the same circle pattern.

Each event contains:

- A normalized time from 0 to 1.
- A normalized frequency position used for vertical offset.
- An energy value used for radius and opacity.
- A duration used for the circle entrance and settling motion.

The event shape is isolated from rendering so the visual pattern generator can
be refined later without changing the page layout or animation component.

## Components

- `TextToPianoPage`: owns page state and submission flow.
- `SpectrumCanvas`: renders and animates circle events.
- `SentenceInput`: handles text entry and Enter submission.
- `createPlaceholderEvents`: converts text into deterministic visual events.

The standalone preview may package the same responsibilities in one HTML file,
while preserving these boundaries in its functions and DOM elements.

## Error and Accessibility Behavior

- Empty submissions are ignored without an intrusive error message.
- The input has an accessible label even when the visible design is minimal.
- Enter submits only when the input is focused.
- The page does not intercept unrelated arrow, space, or browser navigation
  keys.
- With `prefers-reduced-motion: reduce`, circles appear without traveling or
  elastic motion.
- Canvas output has an accessible text description of the current sentence and
  generated event count.

## Verification

- Clicking the black square opens the Text to Piano page in both entry points.
- The initial page contains no result before submission.
- Entering a sentence creates circles and displays exactly that sentence.
- Repeating a sentence creates the same pattern.
- Submitting a new sentence replaces the previous pattern cleanly.
- Empty input leaves the current result unchanged.
- Desktop and mobile screenshots show the visualization centered and the input
  fully visible.
- Reduced-motion mode removes nonessential movement.
