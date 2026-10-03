# Year 9 Basic Technology — Photo Solver Implementation

## Student flow
1. Student selects **Year 9 → Basic Technology**.
2. Student selects **AI Tutor / Solve Worksheet**.
3. Student uploads or photographs a worksheet/question.
4. The client sends the image to `/api/analyze-drawing` with `year=9`, `subject=Basic Technology` and source context.
5. The AI must identify the question and map it to the Year 9 Basic Technology textbook/workbook before solving.
6. The response must separate:
   - `question_understanding`
   - `textbook_topic`
   - `source_reference`
   - `visible_dimensions`
   - `construction_steps`
   - `answer`
   - `cad_instruction`
   - `confidence`
   - `needs_retake`
7. If any required dimension, label, or diagram detail is unreadable, do not invent it. Set `needs_retake=true` and explain exactly what must be photographed again.
8. If the question is readable, provide the answer and a step-by-step construction method consistent with the source material.
9. Where the problem is a technical drawing construction that can be represented programmatically, pass the normalized geometry to the CAD renderer.
10. Save the solved activity metadata to the student's e-Portfolio only after the student confirms the solution.

## Source priority
For Year 9 Basic Technology questions, source priority is:
1. Uploaded/authorised Year 9 Basic Technology textbook.
2. Uploaded/authorised Year 9 Basic Technology workbook/worksheet.
3. Other authorised Fiji Industrial Arts curriculum resources.
4. External web research only when the student explicitly requests research or the local sources do not cover the question.

AI-generated explanations must be clearly distinguished from source-derived material.

## Example response contract
```json
{
  "status": "solved | needs_retake | cannot_determine",
  "question_understanding": "...",
  "textbook_topic": "Geometric Construction",
  "source_reference": "Year 9 Basic Technology textbook, relevant section/page",
  "visible_dimensions": [],
  "construction_steps": [],
  "answer": "...",
  "cad_instruction": "...",
  "confidence": 0.0,
  "needs_retake": false,
  "retake_reason": ""
}
```

## Safety against hallucinated drawings
- Never infer a missing dimension from visual scale.
- Never claim a line/angle is present if it cannot be read.
- Do not silently change the student's question.
- Preserve the terminology used in the Year 9 source material.
- If multiple interpretations are possible, show the ambiguity and ask for a clearer image.
