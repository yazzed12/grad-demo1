"""
AI Service Layer — LangChain + Ollama Integration
Handles clinical report generation and humanization.
"""
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
import json, logging

logger = logging.getLogger(__name__)

MODEL_NAME = "mistral:latest"
BASE_URL = "http://localhost:11434"

def _get_llm(temperature=0.2):
    return ChatOllama(model=MODEL_NAME, base_url=BASE_URL, temperature=temperature, num_predict=1024)

async def generate_clinical_report(data: dict) -> str:
    """Generate a structured dental clinical report from consultation data."""
    try:
        llm = _get_llm(temperature=0.2)
        
        patient = data.get("patient", {})
        tooth_id = data.get("selectedTooth", "Unknown")
        tooth_status = data.get("toothStatus", "Unknown")
        symptoms = data.get("symptoms", [])
        condition = data.get("patientCondition", "")
        notes = data.get("doctorNotes", "")
        jaw_data = data.get("jawTeethStatus", {})
        
        # Count problem teeth for context
        problem_teeth = [k for k, v in jaw_data.items() if isinstance(v, dict) and v.get("status") == "problem"]
        treated_teeth = [k for k, v in jaw_data.items() if isinstance(v, dict) and v.get("status") == "treated"]
        missing_teeth = [k for k, v in jaw_data.items() if isinstance(v, dict) and v.get("status") == "missing"]
        
        system_prompt = """You are an experienced dental clinical report writer. Generate a professional, structured clinical dental report based on the provided examination data. 

The report must include these sections:
1. **Patient Information Summary**
2. **Clinical Examination Findings** — describe the tooth condition, observed symptoms
3. **Diagnosis** — provide clinical diagnosis with ICD/SNOMED codes where applicable
4. **Treatment Plan** — recommended procedures in order of priority
5. **Urgency Level** — Low / Medium / High
6. **Follow-up Recommendations**

Rules:
- Be precise and clinically accurate
- Use standard dental terminology
- Reference FDI tooth numbering
- Do not invent symptoms not provided
- Keep the report concise but complete"""

        human_prompt = f"""Generate a clinical dental report for this examination:

**Patient**: {patient.get('name', 'Unknown')}, Age: {patient.get('age', 'N/A')}, Gender: {patient.get('gender', 'N/A')}
**Condition**: {condition or 'Not specified'}

**Examined Tooth**: #{tooth_id} (FDI notation)
**Tooth Status**: {tooth_status}
**Reported Symptoms**: {', '.join(symptoms) if symptoms else 'None reported'}

**Doctor's Notes**: {notes or 'No additional notes'}

**Overall Dental Status**:
- Problem teeth: {', '.join(problem_teeth) if problem_teeth else 'None'}
- Previously treated: {', '.join(treated_teeth) if treated_teeth else 'None'}  
- Missing teeth: {', '.join(missing_teeth) if missing_teeth else 'None'}"""

        messages = [SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)]
        response = await llm.ainvoke(messages)
        return response.content
        
    except Exception as e:
        logger.error(f"AI Report Generation Error: {e}")
        raise Exception(f"Failed to generate report: {str(e)}")


async def humanize_report(medical_report: str, patient_name: str = "Patient") -> str:
    """Convert a medical dental report into patient-friendly language."""
    try:
        llm = _get_llm(temperature=0.4)
        
        system_prompt = """You are a kind, patient-friendly medical communicator. Convert the provided dental clinical report into simple, easy-to-understand language that a patient with no medical background can read.

Rules:
- Use simple everyday words, not medical jargon
- Explain what was found, what it means, and what happens next
- Be reassuring but honest
- Use short sentences and bullet points
- Do NOT add any new diagnoses, treatments, or medical information not present in the original report
- Do NOT contradict the original report
- Address the patient directly ("You have..." not "The patient has...")
- Include sections: What We Found, What This Means, What We Recommend, What You Should Do At Home"""

        human_prompt = f"""Please convert this dental clinical report into simple patient-friendly language for {patient_name}:

---
{medical_report}
---

Write the simplified version now:"""

        messages = [SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)]
        response = await llm.ainvoke(messages)
        return response.content
        
    except Exception as e:
        logger.error(f"Report Humanization Error: {e}")
        raise Exception(f"Failed to humanize report: {str(e)}")
