# Year 9 Basic Technology — Photo Solver Specification

## Purpose
When a student photographs or uploads a Year 9 Basic Technology worksheet/question, IA-Tutor must use the uploaded image together with the authorised Year 9 Basic Technology textbook/workbook knowledge base to analyse and teach the question.

## Student workflow
1. Student selects or photographs a JPG, JPEG, PNG, or supported camera image.
2. Show an immediate image preview and image quality check.
3. AI vision analysis extracts visible question text, dimensions, labels, symbols, diagrams, and instructions.
4. Identify the closest Year 9 textbook topic. Do not invent a topic when the source does not support it.
5. Retrieve the relevant source section/page from the Year 9 textbook/workbook knowledge base.
6. Explain the method in simple student-friendly steps.
7. Produce the answer. For drawing questions, generate a construction plan and CAD geometry when the dimensions and geometry are sufficiently clear.
8. Show the source/topic/page reference used for the explanation.
9. If the image is unclear, identify exactly what is unreadable and ask the student to retake the photograph rather than guessing.
10. Offer Save to e-Portfolio after the student completes/reviews the solution.

## Drawing-analysis requirements
The AI should detect, where visible:
- line types
- dimensions
- angles
- circles/arcs
- geometric construction
- lettering
- sheet/layout/title block
- orthographic views
- isometric/oblique/perspective drawings
- symbols and conventions
- tools/instruments referenced

For construction questions, provide:
- Given information
- Required result
- Construction steps
- Final answer/check
- CAD construction instructions where applicable

## Source-grounding rule
The Year 9 textbook and workbook supplied by the user are the primary instructional sources. Preserve their terminology and method. If a requested answer is not supported by those materials, clearly say that the source does not provide enough information and do not fabricate a page reference.

## Example
If a student uploads a question asking for construction of a 30-degree angle, recognise it as geometric construction and follow the textbook construction sequence: establish the first point on the line with an arc, use the same radius to construct the intersecting point, construct the required intersection, and draw the final ray through the intersection. The supplied textbook explicitly provides 30°, 90°, and 45° construction procedures.

## Safety and integrity
- Do not claim that an image was read successfully when OCR/vision confidence is poor.
- Do not silently change dimensions.
- Do not copy an entire copyrighted textbook into generated answers.
- Use concise excerpts only when necessary and provide the source reference.
- Distinguish textbook-derived instructions from AI-generated explanations.
- For uncertain cases, offer escalation to the human support option configured by the site owner.
