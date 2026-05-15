import asyncio
from ai_service import generate_clinical_report

async def test():
    data = {
        "patient": {"name": "Test Patient", "age": 30, "gender": "Male"},
        "selectedTooth": "46",
        "toothStatus": "Decay",
        "symptoms": ["Pain", "Sensitivity to cold"],
        "patientCondition": "Generally healthy",
        "doctorNotes": "Patient has deep cavity on 46.",
        "jawTeethStatus": {"46": {"status": "problem"}}
    }
    print("Generating report...")
    result = await generate_clinical_report(data)
    print("Result:")
    print(result)

if __name__ == "__main__":
    asyncio.run(test())
